
import { GoogleGenAI, Chat, GenerateContentResponse, Modality, Type } from "@google/genai";
import { Message, Character, StoryNode, CustomScenario, UserProfile, WorldScene, JournalEcho, JournalEntry, AppSettings, AIProvider, DebugLog } from "../types";
import { createScenarioContext } from "../constants";

// Helper to sanitize history for the API
const formatHistory = (history: Message[]) => {
  return history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));
};

// Helper to format history for OpenAI Compatible APIs
const formatOpenAIHistory = (history: Message[], systemInstruction: string) => {
  const msgs = history.map(msg => ({
    role: msg.role === 'model' ? 'assistant' : 'user',
    content: msg.text
  }));
  // Prepend system instruction
  return [
    { role: 'system', content: systemInstruction },
    ...msgs
  ];
};

export class GeminiService {
  private ai: GoogleGenAI;
  private chatSessions: Map<string, Chat> = new Map();
  
  // Configuration State
  private settings: AppSettings | null = null;
  private currentProvider: AIProvider = 'gemini';
  
  // Debug Logging
  private logCallback: ((log: DebugLog) => void) | null = null;

  constructor() {
    // Default initialization with environment key, can be overridden by settings
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  // Hook for App.tsx to receive logs
  setLogCallback(callback: (log: DebugLog) => void) {
      this.logCallback = callback;
  }

  private log(method: string, type: string, data: any, specificModel?: string) {
      if (this.settings?.debugMode && this.logCallback) {
          // Clone data to avoid reference mutations in log
          let safeData = data;
          try {
             safeData = JSON.parse(JSON.stringify(data));
          } catch(e) { /* ignore circular */ }

          // Determine model name: explicit > current config > unknown
          let model = specificModel;
          if (!model) {
              const config = this.getActiveConfig();
              model = config?.modelName;
          }

          this.logCallback({
              id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              timestamp: Date.now(),
              provider: this.currentProvider,
              model: model,
              method,
              type,
              data: safeData
          });
      }
  }

  // Update internal configuration based on AppSettings
  updateConfig(settings: AppSettings) {
    this.settings = settings;
    this.currentProvider = settings.activeProvider;

    // Re-initialize Gemini client if key changed
    if (this.currentProvider === 'gemini' && settings.geminiConfig.apiKey) {
        this.ai = new GoogleGenAI({ apiKey: settings.geminiConfig.apiKey });
    }
    // Clear sessions on config change to avoid stale state
    this.chatSessions.clear();
  }

  private getActiveConfig() {
      if (!this.settings) return null;
      switch (this.currentProvider) {
          case 'openai': return this.settings.openaiConfig;
          case 'qwen': return this.settings.qwenConfig;
          case 'doubao': return this.settings.doubaoConfig;
          case 'gemini': default: return this.settings.geminiConfig;
      }
  }

  // Retry wrapper with exponential backoff
  private async retry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      // Robust error parsing
      let isRateLimit = 
        error?.status === 429 || 
        error?.code === 429 || 
        error?.error?.code === 429 ||
        error?.error?.status === 'RESOURCE_EXHAUSTED' ||
        error?.message?.includes('429') || 
        error?.message?.includes('RESOURCE_EXHAUSTED') ||
        error?.message?.includes('quota') ||
        error?.status === 503 || 
        error?.status === 500;
        
      // Try to parse message as JSON if it's a string (common in some SDK error wraps)
      if (!isRateLimit && error?.message && typeof error.message === 'string') {
        try {
            // Extract JSON part if mixed with text
            const jsonMatch = error.message.match(/\{.*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : error.message;
            const parsed = JSON.parse(jsonStr);
            if (parsed.error?.code === 429 || parsed.error?.status === 'RESOURCE_EXHAUSTED') {
                isRateLimit = true;
            }
        } catch (e) {
            // Ignore parse errors
        }
      }

      // Check for raw error object structure
      if (!isRateLimit && error?.error && typeof error.error === 'object') {
          if (error.error.code === 429 || error.error.status === 'RESOURCE_EXHAUSTED') {
              isRateLimit = true;
          }
      }

      if (isRateLimit && retries > 0) {
        console.warn(`API Error (Quota/Rate Limit). Retrying in ${delay}ms... (${retries} retries left)`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retry(fn, retries - 1, delay * 2); 
      }
      throw error;
    }
  }

  // --- Core Text Generation Helper (Routing Enabled) ---
  private async generateText(prompt: string, systemInstruction: string = '', jsonMode: boolean = false): Promise<string> {
    
    // Get config first to log the correct model
    const config = this.getActiveConfig();
    const modelName = config?.modelName || 'gemini-2.5-flash';

    this.log('generateText', 'request', { prompt, systemInstruction, jsonMode }, modelName);

    try {
        let result = '';

        // 1. OpenAI / Qwen / Doubao
        if (this.currentProvider === 'openai' || this.currentProvider === 'qwen' || this.currentProvider === 'doubao') {
            if (!config || !config.apiKey) throw new Error(`API config missing for ${this.currentProvider}`);
            
            // Volcengine uses slightly different base path usually (api/v3), but the structure is the same as openai.
            const baseUrl = config.baseUrl || (this.currentProvider === 'openai' ? 'https://api.openai.com/v1' : this.currentProvider === 'doubao' ? 'https://ark.cn-beijing.volces.com/api/v3' : 'https://dashscope.aliyuncs.com/compatible-mode/v1');
            const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

            const messages = [
                { role: 'system', content: systemInstruction + (jsonMode ? " Respond in valid JSON only." : "") },
                { role: 'user', content: prompt }
            ];

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.modelName,
                    messages: messages,
                    temperature: 0.7,
                    response_format: jsonMode && this.currentProvider === 'openai' ? { type: "json_object" } : undefined
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Provider API Error ${response.status}: ${errText}`);
            }

            const data = await response.json();
            result = data.choices?.[0]?.message?.content || '';
        } 
        else {
            // 2. Gemini (Default)
            const geminiConfig: any = {
                systemInstruction: systemInstruction,
            };
            
            if (jsonMode) {
                geminiConfig.responseMimeType = "application/json";
            }

            const response = await this.ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: geminiConfig
            });

            result = response.text || '';
        }

        this.log('generateText', 'response', result, modelName);
        return result;

    } catch (e) {
        this.log('generateText', 'error', e, modelName);
        throw e;
    }
  }

  // --- OpenAI / Qwen / Doubao Compatible Stream Handler ---
  private async *sendOpenAICompatibleMessageStream(
    config: { apiKey: string, baseUrl?: string, modelName: string },
    messages: any[]
  ): AsyncIterable<GenerateContentResponse> {
    
    const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
            model: config.modelName,
            messages: messages,
            stream: true,
            temperature: 0.8
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`API Error ${response.status}: ${err}`);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            
            const dataStr = trimmed.replace('data: ', '');
            if (dataStr === '[DONE]') return;

            try {
                const json = JSON.parse(dataStr);
                const content = json.choices[0]?.delta?.content || '';
                if (content) {
                    // Adapt to Google SDK format for compatibility
                    yield {
                        text: content,
                        candidates: [],
                        functionCalls: undefined
                    } as unknown as GenerateContentResponse;
                }
            } catch (e) {
                // Ignore parse errors for partial chunks
            }
        }
    }
  }

  // Initialize or retrieve a chat session for a specific character (GEMINI ONLY)
  private getSession(character: Character, history: Message[], userProfile: UserProfile | null): Chat {
    if (!this.chatSessions.has(character.id)) {
      const historyForApi = formatHistory(history.filter(m => m.text)); 
      
      const scenarioContext = createScenarioContext(userProfile);
      const combinedInstruction = `${scenarioContext}\n\nYOUR CHARACTER INSTRUCTION:\n${character.systemInstruction}`;

      const modelName = this.settings?.geminiConfig.modelName || 'gemini-2.5-flash';

      const chat = this.ai.chats.create({
        model: modelName,
        config: {
          systemInstruction: combinedInstruction,
          temperature: 0.8,
          topK: 40,
        },
        history: historyForApi,
      });
      
      this.chatSessions.set(character.id, chat);
    }
    return this.chatSessions.get(character.id)!;
  }
  
  // Public method to reset a session
  resetSession(characterId: string) {
    this.chatSessions.delete(characterId);
  }

  // Send message and get stream (ROUTING LOGIC ADDED)
  async sendMessageStream(
    character: Character, 
    history: Message[], 
    userMessage: string,
    userProfile: UserProfile | null
  ): Promise<AsyncIterable<GenerateContentResponse>> {
    
    const config = this.getActiveConfig();
    const modelName = config?.modelName || 'gemini-2.5-flash';

    this.log('sendMessageStream', 'request', { 
        character: character.name, 
        userMessage, 
        historyLength: history.length 
    }, modelName);

    return this.retry(async () => {
        
        let streamIterator: AsyncIterable<GenerateContentResponse>;

        // 1. Check Provider
        if (this.currentProvider === 'openai' || this.currentProvider === 'qwen' || this.currentProvider === 'doubao') {
            if (!config || !config.apiKey) throw new Error("API configuration missing for " + this.currentProvider);

            const scenarioContext = createScenarioContext(userProfile);
            const combinedInstruction = `${scenarioContext}\n\nYOUR CHARACTER INSTRUCTION:\n${character.systemInstruction}`;
            
            // Construct full history + new message for stateless API
            const messages = formatOpenAIHistory(history, combinedInstruction);
            messages.push({ role: 'user', content: userMessage });
            
            streamIterator = this.sendOpenAICompatibleMessageStream(config, messages);
        }
        else {
            // 2. Default to Gemini
            try {
                let historyForInit = history;
                if (history.length > 0) {
                    const lastMsg = history[history.length - 1];
                    if (lastMsg.role === 'user' && lastMsg.text === userMessage) {
                        historyForInit = history.slice(0, -1);
                    }
                }

                const chat = this.getSession(character, historyForInit, userProfile);
                streamIterator = await chat.sendMessageStream({ message: userMessage });
            } catch (e) {
                console.warn(`Error in sendMessageStream for ${character.name}, resetting session.`, e);
                this.chatSessions.delete(character.id);
                this.log('sendMessageStream', 'error', e, modelName);
                throw e;
            }
        }
        
        // Wrap stream to log accumulated response
        const self = this;
        return (async function* () {
            let fullText = '';
            try {
                for await (const chunk of streamIterator) {
                    if (chunk.text) fullText += chunk.text;
                    yield chunk;
                }
                self.log('sendMessageStream', 'response_full', fullText, modelName);
            } catch (e) {
                self.log('sendMessageStream', 'error_stream', e, modelName);
                throw e;
            }
        })();
    });
  }

  // --- Era & Character Constructor (Multi-Model Supported) ---
  async generateCharacterFromPrompt(prompt: string, eraName: string): Promise<Character | null> {
    this.log('generateCharacterFromPrompt', 'request', { prompt, eraName });
    return this.retry(async () => {
       try {
        const systemPrompt = `You are a creative writer. Create a complete character profile for a world/era named "${eraName}".
            Output JSON only with these properties: name, age (number), role, bio, systemInstruction, firstMessage, themeColor (hex), colorAccent (hex).
            The content MUST be in Chinese.`;

        const userPrompt = `Character concept: "${prompt}".`;

        const responseText = await this.generateText(userPrompt, systemPrompt, true);
        
        // Sanitize JSON
        const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const details = JSON.parse(jsonStr);

        // Avatar Generation (Fallback logic)
        let avatarUrl = 'https://picsum.photos/seed/default_avatar/400/600';
        let backgroundUrl = 'https://picsum.photos/seed/default_bg/1080/1920';

        // Only attempt high-quality generation if Gemini is active
        if (this.currentProvider === 'gemini') {
            try {
                const avatarPrompt = `High-quality vertical anime character portrait of ${details.name}. Description: ${details.bio}. Role: ${details.role}. Style: Modern Chinese Anime (Manhua), vibrant colors, detailed eyes. Centered character, abstract background matching theme color ${details.themeColor}.`;
                const genAvatar = await this.generateImageFromPrompt(avatarPrompt, '3:4');
                if (genAvatar) avatarUrl = genAvatar;

                const bgPrompt = `Atmospheric anime background scene for the world of "${eraName}". It should match the personality of a character described as: "${details.bio}". Style: Modern Chinese Anime (Manhua), high quality, cinematic lighting.`;
                const genBg = await this.generateImageFromPrompt(bgPrompt, '9:16');
                if (genBg) backgroundUrl = genBg;
            } catch (imgError) {
                console.warn("Image generation failed, using defaults", imgError);
            }
        }

        const newCharacter: Character = {
            id: `custom_${Date.now()}`,
            voiceName: 'Kore', 
            ...details,
            avatarUrl,
            backgroundUrl
        };
        
        this.log('generateCharacterFromPrompt', 'response_obj', newCharacter);
        return newCharacter;

       } catch (e) {
         this.log('generateCharacterFromPrompt', 'error', e);
         throw e;
       }
    }, 3, 3000); // 3 retries, start with 3s delay
  }

  async generateScenarioFromPrompt(prompt: string): Promise<CustomScenario | null> {
      this.log('generateScenarioFromPrompt', 'request', { prompt });
      return this.retry(async () => {
        try {
            const systemPrompt = `You are a creative director for an interactive visual novel game.
            Based on the user's idea, generate a branching scenario structure in JSON format.
            
            JSON Structure:
            {
                "title": "Scenario Title",
                "description": "Short description",
                "startNodeId": "node_1",
                "nodes": {
                    "node_1": {
                        "id": "node_1",
                        "title": "Scene Title",
                        "prompt": "Instruction for the AI Narrator describing the scene and situation.",
                        "options": [
                            { "id": "opt_1", "text": "Player Choice Text", "nextNodeId": "node_2" },
                            { "id": "opt_2", "text": "Player Choice Text", "nextNodeId": "node_3" }
                        ]
                    },
                    "node_2": { ... },
                    "node_3": { ... }
                }
            }
            Create at least 3-4 nodes with choices. The content MUST be in Chinese.
            `;

            const responseText = await this.generateText(prompt, systemPrompt, true);
            
            const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const scenarioData = JSON.parse(jsonStr);

            const scenario: CustomScenario = {
                id: `scenario_${Date.now()}`,
                sceneId: '', // Assigned by UI
                author: 'AI Architect',
                ...scenarioData
            };
            
            this.log('generateScenarioFromPrompt', 'response_obj', scenario);
            return scenario;

        } catch (e) {
            this.log('generateScenarioFromPrompt', 'error', e);
            throw e;
        }
      }, 5, 3000); // Higher retry count for complex JSON generation
  }

  // --- Image Generation (Gemini Only) ---
  async generateImageFromPrompt(prompt: string, aspectRatio: '1:1' | '16:9' | '9:16' | '3:4' | '4:3' = '1:1'): Promise<string | null> {
    if (this.currentProvider !== 'gemini') return null; // Only supported on Gemini for now
    
    const model = 'gemini-2.5-flash-image';
    this.log('generateImageFromPrompt', 'request', { prompt, aspectRatio }, model);
    
    return this.retry(async () => {
        const response = await this.ai.models.generateContent({
            model: model, // Optimized for image gen
            contents: { parts: [{ text: prompt }] },
            config: {
                imageConfig: { aspectRatio: aspectRatio, numberOfImages: 1 }
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                const url = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                this.log('generateImageFromPrompt', 'success', 'Image generated', model);
                return url;
            }
        }
        return null;
    });
  }

  // --- Avatar Gen Wrapper ---
  async generateCharacterImage(character: Character): Promise<string | null> {
      const prompt = `High-quality vertical anime character portrait of ${character.name}. 
      Role: ${character.role}. 
      Description: ${character.bio}. 
      Style: Modern Chinese Anime (Manhua), detailed, cinematic lighting, ${character.themeColor} theme.`;
      return this.generateImageFromPrompt(prompt, '3:4');
  }

  // --- TTS (Gemini Only) ---
  async generateSpeech(text: string, voiceName: string): Promise<string | null> {
    if (this.currentProvider !== 'gemini') return null;
    
    const model = 'gemini-2.5-flash-preview-tts';
    this.log('generateSpeech', 'request', { text, voiceName }, model);

    return this.retry(async () => {
        const response = await this.ai.models.generateContent({
            model: model,
            contents: { parts: [{ text }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' } }
                }
            }
        });

        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (audioData) {
            this.log('generateSpeech', 'success', 'Audio generated', model);
            return audioData;
        }
        throw new Error("No audio data returned");
    });
  }

  // --- Story & Logic Helpers ---

  async generateStoryBeatStream(
    node: StoryNode, 
    history: Message[], 
    choiceText: string | null,
    userProfile: UserProfile | null
  ): Promise<AsyncIterable<GenerateContentResponse>> {
      
      const scenarioContext = createScenarioContext(userProfile);
      const prompt = `
      CURRENT SCENE: "${node.title}"
      SCENE PROMPT: "${node.prompt}"
      USER CHOICE: "${choiceText || 'Scene Start'}"
      
      Narrate the story outcome based on the prompt and user choice. 
      Be immersive and descriptive.
      `;

      const narratorChar: Character = {
          id: 'narrator_temp',
          name: 'Narrator',
          role: 'Narrator',
          age: 0,
          bio: 'System Narrator',
          avatarUrl: '', backgroundUrl: '', themeColor: '', colorAccent: '', firstMessage: '', voiceName: '',
          systemInstruction: `You are the interactive story narrator. ${scenarioContext}`
      };

      // Filter history to avoid duplicating the trigger choice
      let historyForGen = history;
      if (choiceText && history.length > 0) {
          const lastMsg = history[history.length - 1];
          if (lastMsg.role === 'user' && lastMsg.text === choiceText) {
              historyForGen = history.slice(0, -1);
          }
      }

      return this.sendMessageStream(narratorChar, historyForGen, prompt, userProfile);
  }

  async generateSceneDescription(history: Message[]): Promise<string | null> {
      const prompt = "Summarize the current visual setting and atmosphere of the story based on the last few messages. Keep it concise (1-2 sentences), focusing on visual elements for image generation.";
      const context = history.slice(-6).map(m => `${m.role}: ${m.text}`).join('\n');
      return this.generateText(`${prompt}\n\nSTORY CONTEXT:\n${context}`);
  }

  async generateWisdomEcho(history: Message[], characterName: string): Promise<string | null> {
      const prompt = `Analyze the conversation history. Extract a single, profound, and memorable quote (max 30 words) that represents the core wisdom or emotional comfort provided by ${characterName}. Output ONLY the quote.`;
      const context = history.map(m => `${m.role}: ${m.text}`).join('\n');
      return this.generateText(`${prompt}\n\nCONVERSATION:\n${context}`);
  }

  async generateMirrorInsight(journalContent: string, pastEntries: string[]): Promise<string | null> {
      const prompt = `You are the "Mirror of Truth" (本我镜像). Analyze the user's journal entry and past patterns. 
      Provide a sharp, psychological insight about their subconscious desires, fears, or hidden strengths. 
      Be objective, slightly mysterious, but supportive. Max 50 words.
      `;
      const context = `CURRENT ENTRY: ${journalContent}\n\nPAST ENTRIES:\n${pastEntries.join('\n')}`;
      return this.generateText(`${prompt}\n\nCONTEXT:\n${context}`);
  }

  async generateMoodImage(text: string): Promise<string | null> {
      // Mood image generation - Use Gemini if available
      if (this.currentProvider === 'gemini') {
         const prompt = `Abstract, artistic, high-quality illustration representing this emotion/thought: "${text}". Style: Ethereal, Dreamlike, Digital Art.`;
         return this.generateImageFromPrompt(prompt, '16:9');
      }
      return null;
  }

  async generateChronosLetter(sender: Character, userProfile: UserProfile, journalEntries: JournalEntry[]): Promise<{subject: string, content: string} | null> {
      // Select a random journal entry for context if available
      const randomEntry = journalEntries.length > 0 ? journalEntries[Math.floor(Math.random() * journalEntries.length)] : null;
      const memoryContext = randomEntry ? `I remember you wrote about "${randomEntry.title}"...` : '';

      const prompt = `Write a warm, personal letter to ${userProfile.nickname}.
      You haven't seen them in a while. 
      Mention something specific about their journey or the "memory" provided below to show you care.
      
      MEMORY CONTEXT: ${memoryContext}
      
      Output JSON with "subject" and "content".`;

      const system = `You are ${sender.name} (${sender.role}). ${sender.systemInstruction}`;
      
      try {
          const text = await this.generateText(prompt, system, true);
          const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
          return JSON.parse(jsonStr);
      } catch (e) {
          console.error("Letter generation failed", e);
          return null;
      }
  }

  async analyzeImageForEra(base64Image: string): Promise<{name: string, description: string} | null> {
    if (this.currentProvider !== 'gemini') return null; // Multimodal only on Gemini

    const model = 'gemini-2.5-flash';
    this.log('analyzeImageForEra', 'request', 'Image analysis', model);
    
    return this.retry(async () => {
        const response = await this.ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } },
                    { text: "Analyze this image. Suggest a creative title (name) and a short atmospheric description for a fictional world or era based on it. Output JSON with 'name' and 'description' keys. The content MUST be in Chinese." }
                ]
            },
            config: { responseMimeType: "application/json" }
        });

        if (response.text) {
             const jsonStr = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
             this.log('analyzeImageForEra', 'response', jsonStr, model);
             return JSON.parse(jsonStr);
        }
        return null;
    });
  }
}

export const geminiService = new GeminiService();
