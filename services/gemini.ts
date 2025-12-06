
import { GoogleGenAI, Chat, GenerateContentResponse, Modality, Type } from "@google/genai";
import { Message, Character, StoryNode, CustomScenario, UserProfile, WorldScene, JournalEcho, JournalEntry, AppSettings, AIProvider } from "../types";
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

  constructor() {
    // Default initialization with environment key, can be overridden by settings
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
          case 'gemini': default: return this.settings.geminiConfig;
      }
  }

  // Retry wrapper with exponential backoff
  private async retry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      // Check for 429 status or "RESOURCE_EXHAUSTED" or "quota" in message
      const isRateLimit = 
        error?.status === 429 || 
        error?.code === 429 || 
        error?.error?.code === 429 ||
        error?.error?.status === 'RESOURCE_EXHAUSTED' ||
        error?.message?.includes('429') || 
        error?.message?.includes('RESOURCE_EXHAUSTED') ||
        error?.message?.includes('quota') ||
        error?.status === 503 || 
        error?.status === 500; 

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
    
    // 1. OpenAI / Qwen
    if (this.currentProvider === 'openai' || this.currentProvider === 'qwen') {
        const config = this.getActiveConfig();
        if (!config || !config.apiKey) throw new Error(`API config missing for ${this.currentProvider}`);
        
        const baseUrl = config.baseUrl || (this.currentProvider === 'openai' ? 'https://api.openai.com/v1' : 'https://dashscope.aliyuncs.com/compatible-mode/v1');
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
        return data.choices?.[0]?.message?.content || '';
    }

    // 2. Gemini (Default)
    const geminiConfig: any = {
        systemInstruction: systemInstruction,
    };
    
    if (jsonMode) {
        geminiConfig.responseMimeType = "application/json";
    }

    const response = await this.ai.models.generateContent({
        model: this.settings?.geminiConfig.modelName || 'gemini-2.5-flash',
        contents: prompt,
        config: geminiConfig
    });

    return response.text || '';
  }

  // --- OpenAI / Qwen Compatible Stream Handler ---
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

      const chat = this.ai.chats.create({
        model: this.settings?.geminiConfig.modelName || 'gemini-2.5-flash',
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
    return this.retry(async () => {
        
        // 1. Check Provider
        if (this.currentProvider === 'openai' || this.currentProvider === 'qwen') {
            const config = this.getActiveConfig();
            if (!config || !config.apiKey) throw new Error("API configuration missing for " + this.currentProvider);

            const scenarioContext = createScenarioContext(userProfile);
            const combinedInstruction = `${scenarioContext}\n\nYOUR CHARACTER INSTRUCTION:\n${character.systemInstruction}`;
            
            // Construct full history + new message for stateless API
            const messages = formatOpenAIHistory(history, combinedInstruction);
            messages.push({ role: 'user', content: userMessage });

            return this.sendOpenAICompatibleMessageStream(config, messages);
        }

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
            return await chat.sendMessageStream({ message: userMessage });
        } catch (e) {
            console.warn(`Error in sendMessageStream for ${character.name}, resetting session.`, e);
            this.chatSessions.delete(character.id);
            throw e;
        }
    });
  }

  // --- Era & Character Constructor (Multi-Model Supported) ---
  async generateCharacterFromPrompt(prompt: string, eraName: string): Promise<Character | null> {
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

        // Only attempt high-quality generation if Gemini is active (cheapest/easiest image model integration here)
        // Or if we implemented a DALL-E integration. For now, we fallback if not Gemini to avoid errors.
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
        return newCharacter;

      } catch (e) {
        console.error("Full character generation from prompt failed", e);
        throw e;
      }
    }, 5, 3000); 
  }


  // --- Custom Scenario Generation ---
  async generateStoryBeatStream(
    node: StoryNode,
    previousHistory: Message[],
    userChoiceText: string | null,
    userProfile: UserProfile | null
  ): Promise<AsyncIterable<GenerateContentResponse>> {
    return this.retry(async () => {
      
      const scenarioContext = createScenarioContext(userProfile);
      const combinedInstruction = `
        ${scenarioContext}
        
        ROLE: You are the narrator for a specific interactive story node.
        CURRENT PLOT POINT INSTRUCTIONS:
        ${node.prompt}
        
        TASK:
        1. Narrate the outcome of the user's choice: "${userChoiceText || 'Start of story'}"
        2. Advance the plot according to the instructions above.
        3. Set the scene vividly.
        4. End by subtly leading into the available options (if any).
        
        LANGUAGE: Chinese (Simplified).
      `;

      // 1. OpenAI/Qwen Routing
      if (this.currentProvider === 'openai' || this.currentProvider === 'qwen') {
          const config = this.getActiveConfig();
          if (!config || !config.apiKey) throw new Error("API config missing");
          
          const messages = formatOpenAIHistory(previousHistory, combinedInstruction);
          const triggerMsg = userChoiceText 
            ? `我选择了: ${userChoiceText}。请继续故事。` 
            : "故事开始。请描述当前场景。";
          messages.push({ role: 'user', content: triggerMsg });
          
          return this.sendOpenAICompatibleMessageStream(config, messages);
      }

      // 2. Gemini Default
      let historyForApiSource = previousHistory;
      if (userChoiceText && previousHistory.length > 0) {
          const lastMsg = previousHistory[previousHistory.length - 1];
          if (lastMsg.role === 'user' && lastMsg.text === userChoiceText) {
              historyForApiSource = previousHistory.slice(0, -1);
          }
      }

      const historyForApi = formatHistory(historyForApiSource.filter(m => m.text));
      const chat = this.ai.chats.create({
        model: this.settings?.geminiConfig.modelName || 'gemini-2.5-flash',
        config: {
          systemInstruction: combinedInstruction,
          temperature: 0.8,
        },
        history: historyForApi
      });

      const triggerMsg = userChoiceText 
        ? `我选择了: ${userChoiceText}。请继续故事。` 
        : "故事开始。请描述当前场景。";

      return chat.sendMessageStream({ message: triggerMsg });
    });
  }

  // AI Magic Build: Generate a full scenario structure (Multi-Model Supported)
  async generateScenarioFromPrompt(userPrompt: string): Promise<CustomScenario | null> {
    return this.retry(async () => {
      try {
        const systemPrompt = `You are a game designer. Create a branching interactive fiction scenario based on the user's idea.
          Requirements:
          1. Create a logical flow with at least 4-6 nodes.
          2. "nodes" must be an object where keys are IDs.
          3. Ensure "startNodeId" matches one of the node IDs.
          4. "options" in a node should point to valid "id"s of other nodes.
          5. Content Language: Chinese (Simplified).
          
          Output strictly VALID JSON matching this schema:
          {
            "title": "string",
            "description": "string",
            "startNodeId": "string",
            "nodes": [
              { "id": "string", "title": "string", "prompt": "string", "options": [ { "id": "string", "text": "string", "nextNodeId": "string" } ] }
            ]
          }`;

        const responseText = await this.generateText(userPrompt, systemPrompt, true);
        
        // Robust JSON parsing
        const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const rawData = JSON.parse(jsonStr);

        // Normalize nodes from Array to Record if necessary
        const nodesRecord: Record<string, StoryNode> = {};
        if (Array.isArray(rawData.nodes)) {
            rawData.nodes.forEach((n: any) => {
              nodesRecord[n.id] = n;
            });
        } else if (typeof rawData.nodes === 'object') {
             Object.assign(nodesRecord, rawData.nodes);
        }

        return {
          id: `gen_${Date.now()}`,
          sceneId: '', 
          author: 'AI Magic',
          title: rawData.title,
          description: rawData.description,
          startNodeId: rawData.startNodeId,
          nodes: nodesRecord,
        };
      } catch (e) {
        console.error("Magic build attempt failed", e);
        throw e;
      }
    }, 5, 3000); 
  }

  // Generate an image of the character (Use Gemini Image Model or Fail)
  async generateCharacterImage(character: Character): Promise<string | null> {
      // Image generation is currently Gemini only.
      if (this.currentProvider !== 'gemini') return null;

      const prompt = `Create a high-quality vertical anime character portrait of ${character.name}.
        Description: ${character.bio}
        Role: ${character.role}
        Style: Modern Chinese Anime (Manhua) style, Vibrant Colors, High Resolution, detailed eyes, clean lines.
        The character should be facing forward, centered in the frame.
        Background: Abstract or simple, matching the theme ${character.themeColor}.`;
      return await this.generateImageFromPrompt(prompt, '3:4');
  }

  // Helper to generate image (Gemini Only for now)
  async generateImageFromPrompt(prompt: string, aspectRatio: string = '1:1'): Promise<string | null> {
    // If current provider is NOT Gemini, return null to avoid 429/Auth errors on wrong keys
    if (this.currentProvider !== 'gemini') return null;

    return this.retry(async () => {
      try {
          const response = await this.ai.models.generateContent({
              model: 'gemini-2.5-flash-image', 
              contents: { parts: [{ text: prompt }] },
              config: { imageConfig: { aspectRatio: aspectRatio } }
            });
      
            if (response.candidates && response.candidates[0]?.content?.parts) {
              for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
              }
            }
            return null;
      } catch (e) {
          console.warn("Generic image generation failed:", e);
          return null; 
      }
    });
  }
  
  // Analyzes an image (Multi-model support via generateText fallback for pure text, but vision is specific)
  async analyzeImageForEra(imageUrl: string): Promise<{ name: string; description: string } | null> {
    // Vision is tricky with generic provider without specific format. 
    // If not Gemini, we can't easily upload base64 to OpenAI Chat completion standardly without knowing the model version (gpt-4-vision).
    // For now, restrict to Gemini to avoid errors.
    if (this.currentProvider !== 'gemini') {
        // Fallback: Just return a generic name based on timestamp if we can't analyze
        return { name: "新时代", description: "一个未知的世界（请切换至 Gemini 模型以使用图片分析功能）" };
    }

    return this.retry(async () => {
      try {
        const base64Data = imageUrl.split(',')[1]; 
        if (!base64Data) return null;

        const prompt = `Analyze this image. It is a cover image for a "World Era" or "Memory" in a game.
        Create a creative Title (name) and a poetic, atmospheric Description (description) for it.
        Language: Chinese (Simplified).
        Output JSON: { "name": "...", "description": "..." }`;

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: {
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: base64Data } }, 
              { text: prompt }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
               type: Type.OBJECT,
               properties: {
                 name: { type: Type.STRING },
                 description: { type: Type.STRING }
               },
               required: ["name", "description"]
            }
          }
        });

        if (response.text) {
           return JSON.parse(response.text);
        }
        return null;
      } catch (e) {
        console.error("Image analysis failed", e);
        return null;
      }
    });
  }

  // Scene Description (Routeable)
  async generateSceneDescription(history: Message[]): Promise<string | null> {
      const recentContext = history.slice(-3).map(m => `${m.role}: ${m.text}`).join('\n');
      const prompt = `
        Based on the following story interaction in a modern Chinese university setting, describe the visual scene for an anime illustration in English.
        Include:
        1. The characters present and their visible actions/emotions.
        2. The setting/background (e.g., classroom, library, campus path).
        Keep it concise (under 50 words). Format: "Anime scene: [Description]"
        Interaction:
        ${recentContext}
      `;

      return this.generateText(prompt);
  }

  // Speech (Gemini Only)
  async generateSpeech(text: string, voiceName: string): Promise<string | null> {
    if (this.currentProvider !== 'gemini') return null;

    return this.retry(async () => {
      try {
        const response = await this.ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: text }] }],
          config: {
            responseModalities: [Modality.AUDIO], 
            speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voiceName },
                },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
      } catch (error) {
        console.warn("Speech generation failed", error);
        throw error;
      }
    });
  }

  async generateMoodImage(text: string): Promise<string | null> {
    if (this.currentProvider !== 'gemini') return null;
    return this.retry(async () => {
      try {
        const imagePrompt = await this.generateText(`Analyze mood of: "${text}". Create English abstract anime art prompt.`);
        if (!imagePrompt) return null;
        const finalPrompt = `${imagePrompt}. Style: Abstract, Ethereal, Makoto Shinkai style.`;
        return await this.generateImageFromPrompt(finalPrompt, '16:9');
      } catch (e) { return null; }
    });
  }

  async generateWisdomEcho(history: Message[], characterName: string): Promise<string | null> {
    return this.generateText(`Summarize your advice in one healing sentence (Chinese).`, `You are ${characterName}.`, false);
  }

  async generateMirrorInsight(currentEntry: string, previousEntries: string[]): Promise<string | null> {
    const prompt = `Analyze journal: "${currentEntry}". Context: ${previousEntries.join(' | ')}. Output one piercing psychological insight (Chinese).`;
    return this.generateText(prompt);
  }

  async generateChronosLetter(character: Character, userProfile: UserProfile, recentJournalEntries: JournalEntry[]): Promise<{ subject: string; content: string } | null> {
    return this.retry(async () => {
      try {
        const prompt = `Write a letter from ${character.name} to ${userProfile.nickname}. Output JSON {subject, content}.`;
        const responseText = await this.generateText(prompt, `You are ${character.name}.`, true);
        const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
      } catch (e) { return null; }
    });
  }
}

export const geminiService = new GeminiService();
