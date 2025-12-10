
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
  private ai?: GoogleGenAI;
  private chatSessions: Map<string, Chat> = new Map();
  
  // Configuration State
  private settings: AppSettings | null = null;
  
  // Debug Logging
  private logCallback: ((log: DebugLog) => void) | null = null;

  constructor() {
    // Default initialization with environment key if available
    // Prevent crash if API_KEY is missing during startup
    if (process.env.API_KEY) {
      try {
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      } catch (e) {
        console.warn("Failed to initialize GoogleGenAI with process.env.API_KEY", e);
      }
    }
  }

  // Hook for App.tsx to receive logs
  setLogCallback(callback: (log: DebugLog) => void) {
      this.logCallback = callback;
  }

  private log(method: string, type: string, data: any, specificModel?: string, provider?: string) {
      if (this.settings?.debugMode && this.logCallback) {
          let safeData = data;
          try { safeData = JSON.parse(JSON.stringify(data)); } catch(e) { /* ignore circular */ }

          this.logCallback({
              id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              timestamp: Date.now(),
              provider: provider || 'unknown',
              model: specificModel || 'unknown',
              method,
              type,
              data: safeData
          });
      }
      // Also log to console for immediate visibility during dev
      if (type === 'error' || type === 'fallback_error') {
          console.error(`[${provider}] ${method} Error:`, data);
      }
  }

  // Update internal configuration based on AppSettings
  updateConfig(settings: AppSettings) {
    this.settings = settings;

    // Re-initialize Gemini client if key changed in geminiConfig and is not empty
    // If empty, we keep the default constructor instance (which might have process.env.API_KEY)
    if (settings.geminiConfig.apiKey) {
        this.ai = new GoogleGenAI({ apiKey: settings.geminiConfig.apiKey });
    } else if (process.env.API_KEY) {
        // Fallback to env key if settings key is cleared/empty
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    } else {
        // No key available
        this.ai = undefined;
    }
    // Clear sessions on config change to avoid stale state
    this.chatSessions.clear();
  }

  // Helper to get configuration for a specific provider
  private getConfigForProvider(provider: AIProvider) {
      if (!this.settings) return null;
      switch (provider) {
          case 'openai': return this.settings.openaiConfig;
          case 'qwen': return this.settings.qwenConfig;
          case 'doubao': return this.settings.doubaoConfig;
          case 'gemini': default: return this.settings.geminiConfig;
      }
  }

  // --- FALLBACK STRATEGY LOGIC ---

  private getPrioritizedProviders(modality: 'text' | 'image' | 'video' | 'audio'): AIProvider[] {
      if (!this.settings) return ['gemini'];

      let primary: AIProvider = 'gemini';
      switch(modality) {
          case 'text': primary = this.settings.textProvider; break;
          case 'image': primary = this.settings.imageProvider; break;
          case 'video': primary = this.settings.videoProvider; break;
          case 'audio': primary = this.settings.audioProvider; break;
      }

      const order: AIProvider[] = [primary];

      if (this.settings.enableFallback) {
          // Define capabilities per provider
          const capabilities: Record<AIProvider, string[]> = {
              'gemini': ['text', 'image', 'video', 'audio'],
              'openai': ['text'], // Add 'image' if DALL-E logic implemented
              'qwen': ['text', 'image', 'video'], // Qwen supports text, image, video
              'doubao': ['text', 'image', 'video'] // Doubao supports text, image, video
          };
          
          const fallbacks: AIProvider[] = ['gemini', 'openai', 'qwen', 'doubao'];
          
          for (const p of fallbacks) {
              if (p !== primary && capabilities[p].includes(modality)) {
                  // Only add if API key is present OR if it's Gemini (which might fall back to env)
                  const config = this.getConfigForProvider(p);
                  if ((config && config.apiKey) || (p === 'gemini' && process.env.API_KEY)) {
                      order.push(p);
                  }
              }
          }
      }
      return order;
  }

  private async retry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
       // ... existing error checking logic ...
      let isRateLimit = error?.status === 429 || error?.code === 429 || error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED';
      // Handle nested error object from Google GenAI SDK
      if (error?.error?.code === 429 || error?.error?.status === 'RESOURCE_EXHAUSTED') {
          isRateLimit = true;
      }
      
      if (isRateLimit && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retry(fn, retries - 1, delay * 2); 
      }
      throw error;
    }
  }

  // --- EXECUTION STRATEGIES (Low Level) ---

  private async executeTextGeneration(provider: AIProvider, prompt: string, systemInstruction: string, jsonMode: boolean): Promise<string> {
      const config = this.getConfigForProvider(provider);
      // Gemini can use process.env.API_KEY if config.apiKey is missing
      const effectiveKey = config?.apiKey || (provider === 'gemini' ? process.env.API_KEY : '');

      if (provider !== 'gemini' && (!config || !effectiveKey)) {
         throw new Error(`Config/Key missing for ${provider}`);
      }
      
      const modelName = config?.modelName || 'gemini-2.5-flash';

      // 1. OpenAI / Qwen / Doubao
      if (provider === 'openai' || provider === 'qwen' || provider === 'doubao') {
            if (!config) throw new Error("Provider config missing");
            const baseUrl = config.baseUrl || (provider === 'openai' ? 'https://api.openai.com/v1' : provider === 'doubao' ? 'https://ark.cn-beijing.volces.com/api/v3' : 'https://dashscope.aliyuncs.com/compatible-mode/v1');
            const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

            const messages = [
                { role: 'system', content: systemInstruction + (jsonMode ? " Respond in valid JSON only." : "") },
                { role: 'user', content: prompt }
            ];
            
            const payload = {
                model: modelName,
                messages: messages,
                temperature: 0.7,
                response_format: jsonMode && provider === 'openai' ? { type: "json_object" } : undefined
            };

            // --- Enhanced Logging for Debugging ---
            console.group(`[GeminiService] ${provider} Request`);
            console.log(`URL: ${url}`);
            console.log(`Model: ${modelName}`);
            console.log("Payload:", payload);
            console.groupEnd();

            this.log('executeText', 'request', { 
                provider, 
                url, 
                modelName, 
                promptExcerpt: prompt.substring(0, 50) + "..." 
            }, modelName, provider);

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${effectiveKey}` },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errText = await response.text();
                    let errJson;
                    try { errJson = JSON.parse(errText); } catch (e) {}

                    console.error(`[GeminiService] ${provider} API Error ${response.status}`, errText);

                    // --- Doubao/Provider Specific Analysis ---
                    let analysis = `HTTP Error ${response.status}`;
                    
                    if (provider === 'doubao') {
                        if (response.status === 404) {
                            analysis = "Endpoint ID 错误 (404)。豆包 (Volcengine) 的 'Model Name' 通常需要填写推理接入点 ID (例如 'ep-20240604...')。请检查设置中的模型名称是否正确。";
                        } else if (response.status === 400) {
                             analysis = "请求参数错误 (400)。请检查模型名称是否符合该提供商要求。";
                        }
                    }

                    const debugInfo = {
                        status: response.status,
                        statusText: response.statusText,
                        errorBody: errJson || errText,
                        analysis: analysis
                    };

                    this.log('executeText', 'error', debugInfo, modelName, provider);
                    throw new Error(`Provider ${provider} (${modelName}) failed: ${analysis} \nRaw: ${errText.substring(0, 200)}`);
                }

                const data = await response.json();
                
                if (data.error) {
                     console.error(`[GeminiService] ${provider} Data Error`, data.error);
                     this.log('executeText', 'api_error', data.error, modelName, provider);
                     throw new Error(`API Error: ${data.error.message}`);
                }

                const result = data.choices?.[0]?.message?.content || '';
                this.log('executeText', 'response', { length: result.length, preview: result.substring(0, 20) }, modelName, provider);
                return result;

            } catch (error: any) {
                console.error(`[GeminiService] ${provider} Exception`, error);
                
                // Check for CORS or Network errors specifically
                if (error instanceof TypeError && error.message === 'Failed to fetch') {
                     const corsMsg = `网络请求失败 (CORS)。浏览器拦截了对 ${provider} 的跨域请求。请注意：豆包/通义千问等国内大模型 API 通常不支持直接在浏览器前端调用 (CORS 限制)。您可能需要配置代理服务器，或使用支持 CORS 的模型 (如 Gemini)。`;
                     this.log('executeText', 'network_error', corsMsg, modelName, provider);
                     throw new Error(corsMsg);
                }
                throw error;
            }
      } 
      // 2. Gemini
      else {
          this.log('executeText', 'request', { provider, modelName, prompt }, modelName, provider);
          const geminiConfig: any = { systemInstruction };
          if (jsonMode) geminiConfig.responseMimeType = "application/json";

          // Use specific key if configured, otherwise fallback to this.ai
          const client = (config && config.apiKey) ? new GoogleGenAI({ apiKey: config.apiKey }) : this.ai;
          
          if (!client) {
             throw new Error("Gemini API Key is not configured. Please set it in Settings.");
          }

          try {
            const response = await client.models.generateContent({
                model: modelName,
                contents: prompt,
                config: geminiConfig
            });
            const result = response.text || '';
            this.log('executeText', 'response', result, modelName, provider);
            return result;
          } catch (e: any) {
             this.log('executeText', 'error', e, modelName, provider);
             throw e;
          }
      }
  }

  private async executeImageGeneration(provider: AIProvider, prompt: string, aspectRatio: string): Promise<string | null> {
      if (provider === 'gemini') {
          const config = this.getConfigForProvider('gemini');
          const model = config?.imageModel || 'gemini-2.5-flash-image'; 
          
          this.log('executeImage', 'request', { prompt, aspectRatio }, model, provider);

          // Use specific key if configured
          const client = (config && config.apiKey) ? new GoogleGenAI({apiKey: config.apiKey}) : this.ai;
          
          if (!client) throw new Error("Gemini API Key missing");

          const response = await client.models.generateContent({
            model: model,
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: aspectRatio as any } }
          });

          for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                const url = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                this.log('executeImage', 'success', 'Image generated', model, provider);
                return url;
            }
          }
      }
      else if (provider === 'qwen') {
          const config = this.getConfigForProvider('qwen');
          const apiKey = config?.apiKey;
          const model = config?.imageModel || 'qwen-image-plus'; 
          
          if (!apiKey) throw new Error("Qwen API Key missing");
          
          let size = '1024*1024';
          if (aspectRatio === '16:9') size = '1280*720';
          else if (aspectRatio === '9:16') size = '720*1280';
          else if (aspectRatio === '3:4') size = '1024*1024'; 

          this.log('executeImage', 'request', { prompt, model, size }, model, 'qwen');

          try {
              const submitUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis';
              const submitResponse = await fetch(submitUrl, {
                  method: 'POST',
                  headers: {
                      'Authorization': `Bearer ${apiKey}`,
                      'Content-Type': 'application/json',
                      'X-DashScope-Async': 'enable'
                  },
                  body: JSON.stringify({
                      model: model,
                      input: { prompt: prompt },
                      parameters: { size: size, n: 1 }
                  })
              });

              if (!submitResponse.ok) {
                   const errText = await submitResponse.text();
                   throw new Error(`Qwen Submit Failed (${submitResponse.status}): ${errText}`);
              }

              const submitData = await submitResponse.json();
              if (submitData.code && submitData.code !== '200') {
                  const errMsg = submitData.message || submitData.code || 'Unknown Error';
                  this.log('executeImage', 'error', submitData, model, 'qwen');
                  throw new Error(`Qwen Submit Failed: ${errMsg}`);
              }

              const taskId = submitData.output.task_id;
              this.log('executeImage', 'info', `Task submitted: ${taskId}, polling...`, model, 'qwen');

              let attempts = 0;
              while (attempts < 30) { // Poll for ~60 seconds
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  const taskUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;
                  const checkResponse = await fetch(taskUrl, {
                      headers: { 'Authorization': `Bearer ${apiKey}` }
                  });
                  const checkData = await checkResponse.json();

                  if (checkData.output.task_status === 'SUCCEEDED') {
                      const imgUrl = checkData.output.results[0].url;
                      this.log('executeImage', 'success', imgUrl, model, 'qwen');
                      return imgUrl;
                  } else if (checkData.output.task_status === 'FAILED') {
                      this.log('executeImage', 'error', checkData, model, 'qwen');
                      throw new Error(`Qwen Task Failed: ${checkData.output.message}`);
                  }
                  attempts++;
              }
              throw new Error("Qwen Image Generation Timed Out");
          } catch (e: any) {
              if (e instanceof TypeError && e.message === 'Failed to fetch') {
                   const corsMsg = "Network Error (Likely CORS). Qwen/DashScope API does not support direct browser calls. Please use a backend proxy or a browser extension to bypass CORS for testing.";
                   this.log('executeImage', 'error', corsMsg, model, 'qwen');
                   throw new Error(corsMsg);
              }
              throw e;
          }
      }
      else if (provider === 'doubao') {
          this.log('executeImage', 'error', 'Doubao Image generation not implemented (requires backend proxy)', 'doubao-cv', 'doubao');
          throw new Error("Doubao Image Generation not implemented in frontend-only mode.");
      }
      return null;
  }

  private async executeVideoGeneration(provider: AIProvider, prompt: string): Promise<string | null> {
      if (provider === 'gemini') {
          const config = this.getConfigForProvider('gemini');
          const model = config?.videoModel || 'veo-3.1-fast-generate-preview'; 
          
          this.log('executeVideo', 'request', { prompt }, model, provider);
          
          const client = (config && config.apiKey) ? new GoogleGenAI({apiKey: config.apiKey}) : this.ai;
          const effectiveKey = config?.apiKey || process.env.API_KEY;

          if (!client) throw new Error("Gemini API Key missing");

          let operation = await client.models.generateVideos({
              model: model,
              prompt: prompt,
              config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
          });

          while (!operation.done) {
              await new Promise(resolve => setTimeout(resolve, 5000));
              operation = await client.operations.getVideosOperation({operation: operation});
          }

          const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
          if (uri && effectiveKey) {
               const videoUrl = `${uri}&key=${effectiveKey}`;
               this.log('executeVideo', 'success', videoUrl, model, provider);
               return videoUrl;
          }
      }
      else if (provider === 'qwen' || provider === 'doubao') {
          const config = this.getConfigForProvider(provider);
          if (!config || !config.apiKey) return null;
          const model = config.videoModel || 'default-video-model';
          this.log('executeVideo', 'request', { prompt }, model, provider);
          console.warn(`${provider} video generation not fully implemented yet.`);
          return null; 
      }
      return null;
  }

  // --- PUBLIC METHODS (With Routing & Fallback) ---

  private async generateText(prompt: string, systemInstruction: string = '', jsonMode: boolean = false): Promise<string> {
      const providers = this.getPrioritizedProviders('text');
      let lastError = null;

      for (const provider of providers) {
          try {
              return await this.executeTextGeneration(provider, prompt, systemInstruction, jsonMode);
          } catch (e) {
              console.warn(`Provider ${provider} failed, trying next...`, e);
              lastError = e;
              this.log('generateText', 'fallback_error', { provider, error: e });
              continue;
          }
      }
      throw lastError || new Error("All text providers failed");
  }

  // --- OpenAI / Qwen / Doubao Compatible Stream Handler ---
  
  private async initOpenAIStreamRequest(
    config: { apiKey: string, baseUrl?: string, modelName: string },
    messages: any[]
  ): Promise<Response> {
    const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const payload = {
        model: config.modelName,
        messages: messages,
        stream: true,
        temperature: 0.8
    };

    // Log the stream init request
    console.group(`[GeminiService] Stream Init (${config.modelName})`);
    console.log(`URL: ${url}`);
    console.log("Payload:", payload);
    console.groupEnd();

    this.log('sendMessageStream', 'init_request', { url, model: config.modelName }, config.modelName, 'generic_stream');

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            console.error(`[GeminiService] Stream Init Error ${response.status}`, err);

            let analysis = "Unknown Stream Error";
            if (response.status === 404) analysis = "Endpoint ID Invalid (404). Check Model Name.";
            
            const debugInfo = { status: response.status, body: err, analysis };
            this.log('sendMessageStream', 'init_error', debugInfo, config.modelName, 'generic_stream');
            
            throw new Error(`Stream API Error ${response.status}: ${err} (${analysis})`);
        }
        return response;
    } catch (error: any) {
        console.error(`[GeminiService] Stream Network Error`, error);
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
             throw new Error(`Network Error (CORS). Browser blocked call to ${url}.`);
        }
        throw error;
    }
  }

  private async *parseOpenAIStream(response: Response): AsyncIterable<GenerateContentResponse> {
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
      
      // --- DEEP CHARACTER INJECTION ---
      let deepCharacterPrompt = `YOUR CHARACTER INSTRUCTION:\n${character.systemInstruction}`;
      
      if (character.mbti || character.tags) {
          deepCharacterPrompt += `\n\n[PERSONALITY ANCHORS]\nMBTI: ${character.mbti || 'Unknown'}\nTags: ${character.tags?.join(', ') || 'None'}`;
      }
      if (character.speechStyle || character.catchphrases) {
          deepCharacterPrompt += `\n\n[LINGUISTIC STYLE]\nStyle: ${character.speechStyle || 'Natural'}\nCatchphrases: ${character.catchphrases?.join(', ') || 'None'}`;
      }
      if (character.secrets || character.motivations) {
          deepCharacterPrompt += `\n\n[PSYCHOLOGICAL DEPTH]\nCurrent Motivation: ${character.motivations || 'To interact with the user.'}\nHidden Secrets (Do not reveal immediately, let them influence your subtext): ${character.secrets || 'None'}`;
      }
      if (character.relationships) {
          deepCharacterPrompt += `\n\n[RELATIONSHIP WEB]\n${character.relationships}`;
      }
      // --------------------------------

      const combinedInstruction = `${scenarioContext}\n\n${deepCharacterPrompt}`;

      const config = this.getConfigForProvider('gemini');
      const modelName = config?.modelName || 'gemini-2.5-flash';
      const apiKey = config?.apiKey || process.env.API_KEY;

      if (!apiKey) {
          throw new Error("Gemini API Key is missing. Check your settings.");
      }
      
      const client = new GoogleGenAI({ apiKey });

      const chat = client.chats.create({
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

  // Send message and get stream
  async sendMessageStream(
    character: Character, 
    history: Message[], 
    userMessage: string,
    userProfile: UserProfile | null
  ): Promise<AsyncIterable<GenerateContentResponse>> {
    
    const providers = this.getPrioritizedProviders('text');
    let lastError = null;

    for (const provider of providers) {
        try {
            const config = this.getConfigForProvider(provider);
            const effectiveKey = config?.apiKey || (provider === 'gemini' ? process.env.API_KEY : '');
            
            if (!config || !effectiveKey) {
                 if (providers.length === 1) throw new Error(`${provider} API Key missing.`);
                 continue;
            }
            
            this.log('sendMessageStream', 'attempt', { provider }, config.modelName);

            // 1. OpenAI / Qwen / Doubao
            if (provider === 'openai' || provider === 'qwen' || provider === 'doubao') {
                const scenarioContext = createScenarioContext(userProfile);
                
                // --- DEEP CHARACTER INJECTION (Duplicate logic for generic providers) ---
                let deepCharacterPrompt = `YOUR CHARACTER INSTRUCTION:\n${character.systemInstruction}`;
                if (character.mbti) deepCharacterPrompt += `\nMBTI: ${character.mbti}`;
                if (character.speechStyle) deepCharacterPrompt += `\nSpeaking Style: ${character.speechStyle}`;
                if (character.catchphrases) deepCharacterPrompt += `\nCommon Phrases: ${character.catchphrases.join(', ')}`;
                if (character.secrets) deepCharacterPrompt += `\nSecrets: ${character.secrets}`;
                // -----------------------------------------------------------------------

                const combinedInstruction = `${scenarioContext}\n\n${deepCharacterPrompt}`;
                
                const messages = formatOpenAIHistory(history, combinedInstruction);
                messages.push({ role: 'user', content: userMessage });
                
                const response = await this.initOpenAIStreamRequest({ ...config, apiKey: effectiveKey }, messages);
                return this.parseOpenAIStream(response);
            }
            // 2. Gemini
            else {
                 let historyForInit = history;
                 if (history.length > 0) {
                    const lastMsg = history[history.length - 1];
                    if (lastMsg.role === 'user' && lastMsg.text === userMessage) {
                        historyForInit = history.slice(0, -1);
                    }
                 }
                 const chat = this.getSession(character, historyForInit, userProfile);
                 return await chat.sendMessageStream({ message: userMessage });
            }

        } catch (e) {
             console.warn(`sendMessageStream failed on ${provider}`, e);
             this.log('sendMessageStream', 'error_fallback', { provider, error: e });
             lastError = e;
             if (provider === 'gemini') this.chatSessions.delete(character.id);
             continue; // Try next provider
        }
    }
    throw lastError || new Error("All text providers failed for streaming");
  }

  // --- Era & Character Constructor ---
  async generateCharacterFromPrompt(prompt: string, eraName: string): Promise<Character | null> {
    return this.retry(async () => {
       try {
        const systemPrompt = `You are a creative writer. Create a complete character profile for a world/era named "${eraName}".
            Output JSON only with these properties: 
            - name, age (number), role, bio
            - systemInstruction (detailed roleplay instructions)
            - firstMessage (greeting)
            - themeColor (hex), colorAccent (hex)
            - mbti (e.g. INFJ)
            - tags (array of strings, personality keywords)
            - speechStyle (description of how they talk)
            - catchphrases (array of strings, 2-3 common phrases)
            - secrets (hidden depth/secret)
            - motivations (current goal)
            
            The content MUST be in Chinese.`;
        const userPrompt = `Character concept: "${prompt}".`;

        const responseText = await this.generateText(userPrompt, systemPrompt, true);
        
        const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const details = JSON.parse(jsonStr);

        // DO NOT Auto Generate Image to save cost. Use placeholder.
        let avatarUrl = 'https://picsum.photos/seed/default_avatar/400/600';
        let backgroundUrl = 'https://picsum.photos/seed/default_bg/1080/1920';

        const newCharacter: Character = {
            id: `custom_${Date.now()}`,
            voiceName: 'Kore', 
            ...details,
            avatarUrl,
            backgroundUrl
        };
        return newCharacter;
       } catch (e) {
         this.log('generateCharacterFromPrompt', 'error', e);
         throw e;
       }
    }, 2, 3000);
  }

  async generateScenarioFromPrompt(prompt: string): Promise<CustomScenario | null> {
      return this.retry(async () => {
        try {
            const systemPrompt = `You are a creative director for an interactive visual novel game.
            Based on the user's idea, generate a branching scenario structure in JSON format.
            JSON Structure: { "title": "...", "description": "...", "startNodeId": "node_1", "nodes": { "node_1": { "id": "node_1", "title": "...", "prompt": "...", "options": [...] } } }
            Create at least 3-4 nodes with choices. The content MUST be in Chinese.`;

            const responseText = await this.generateText(prompt, systemPrompt, true);
            const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const scenarioData = JSON.parse(jsonStr);

            const scenario: CustomScenario = {
                id: `scenario_${Date.now()}`,
                sceneId: '', 
                author: 'AI Architect',
                ...scenarioData
            };
            return scenario;
        } catch (e) {
            this.log('generateScenarioFromPrompt', 'error', e);
            throw e;
        }
      }, 2, 3000); 
  }

  // --- Image Generation ---
  async generateImageFromPrompt(prompt: string, aspectRatio: '1:1' | '16:9' | '9:16' | '3:4' | '4:3' = '1:1'): Promise<string | null> {
    const providers = this.getPrioritizedProviders('image');
    for (const provider of providers) {
        try {
            const result = await this.executeImageGeneration(provider, prompt, aspectRatio);
            if (result) return result;
        } catch (e: any) {
            console.warn(`Image gen failed on ${provider}`, e);
            this.log('generateImage', 'fallback_error', { provider, error: e?.message || e });
            continue;
        }
    }
    return null;
  }

  // --- Video Generation ---
  async generateVideoFromPrompt(prompt: string): Promise<string | null> {
      const providers = this.getPrioritizedProviders('video');
      for (const provider of providers) {
          try {
              const result = await this.executeVideoGeneration(provider, prompt);
              if (result) return result;
          } catch(e) {
              console.warn(`Video gen failed on ${provider}`, e);
              continue;
          }
      }
      return null;
  }

  // --- Prompt Constructors (Cost Saving) ---
  constructEraCoverPrompt(name: string, description: string): string {
      return `A beautiful, high-quality vertical anime world illustration for a world named "${name}". The theme is: "${description}". Style: Modern Chinese Anime (Manhua), cinematic lighting, vibrant, epic feel.`;
  }

  constructCharacterAvatarPrompt(name: string, role: string, bio: string, themeColor: string): string {
      return `High-quality vertical anime character portrait of ${name}. Role: ${role}. Description: ${bio}. Style: Modern Chinese Anime (Manhua), vibrant colors, detailed eyes. Centered character, abstract background matching theme color ${themeColor}.`;
  }

  constructCharacterBackgroundPrompt(name: string, bio: string, eraName: string): string {
      return `Atmospheric anime background scene for the world of "${eraName}". It should match the personality of a character named ${name}, described as: "${bio}". Style: Modern Chinese Anime (Manhua), high quality, cinematic lighting.`;
  }

  constructUserAvatarPrompt(nickname: string): string {
      return `Profile avatar for a user named "${nickname}". Style: Modern Anime, Cyberpunk, or Dreamy Digital Art. High quality, centered face or symbol.`;
  }

  constructMoodPrompt(content: string): string {
      return `Abstract, artistic, high-quality illustration representing this emotion/thought: "${content.substring(0, 100)}...". Style: Ethereal, Dreamlike, Digital Art, vibrant colors, expressive brushstrokes.`;
  }

  // --- Avatar Gen Wrapper (Legacy/Direct) ---
  async generateCharacterImage(character: Character): Promise<string | null> {
      const prompt = this.constructCharacterAvatarPrompt(character.name, character.role, character.bio, character.themeColor);
      return this.generateImageFromPrompt(prompt, '3:4');
  }

  // --- User Avatar Gen ---
  async generateUserAvatar(nickname: string): Promise<string | null> {
      const prompt = this.constructUserAvatarPrompt(nickname);
      return this.generateImageFromPrompt(prompt, '1:1');
  }

  // --- TTS ---
  async generateSpeech(text: string, voiceName: string): Promise<string | null> {
    if (this.settings?.audioProvider !== 'gemini' && !this.settings?.enableFallback) return null;
    
    const providers = this.getPrioritizedProviders('audio');
    if (!providers.includes('gemini')) return null;

    const config = this.getConfigForProvider('gemini');
    const model = 'gemini-2.5-flash-preview-tts';
    this.log('generateSpeech', 'request', { text, voiceName }, model, 'gemini');
    
    const effectiveKey = config?.apiKey || process.env.API_KEY;

    return this.retry(async () => {
        // Safe Client Creation
        const client = effectiveKey ? new GoogleGenAI({apiKey: effectiveKey}) : this.ai;
        if (!client) throw new Error("Gemini API Key missing for TTS");

        const response = await client.models.generateContent({
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
            this.log('generateSpeech', 'success', 'Audio generated', model, 'gemini');
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

  // --- NEW: Mirror Insight ---
  async generateMirrorInsight(journalContent: string, pastEntries: string[]): Promise<string | null> {
      const prompt = `You are the "Mirror of Truth" (本我镜像). Analyze the user's journal entry and their past patterns (if any).
      Your goal is to provide a sharp, psychological insight about their subconscious desires, fears, or hidden strengths.
      
      Style Guidelines:
      - Be objective but supportive.
      - Be slightly mysterious, like a tarot reading or a Jungian analysis.
      - Keep it under 50 words.
      - Speak in Chinese.
      `;
      const context = `CURRENT ENTRY: ${journalContent}\n\nPAST ENTRIES CONTEXT:\n${pastEntries.join('\n')}`;
      
      try {
          return await this.generateText(`${prompt}\n\nCONTEXT:\n${context}`);
      } catch (e) {
          console.error("Mirror insight failed", e);
          return null;
      }
  }

  async generateMoodImage(text: string): Promise<string | null> {
      const prompt = `Abstract, artistic, high-quality illustration representing this emotion/thought: "${text}". Style: Ethereal, Dreamlike, Digital Art, vibrant colors, expressive brushstrokes.`;
      return this.generateImageFromPrompt(prompt, '16:9');
  }

  async generateChronosLetter(sender: Character, userProfile: UserProfile, journalEntries: JournalEntry[]): Promise<{subject: string, content: string} | null> {
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
    const providers = this.getPrioritizedProviders('text');
    if (!providers.includes('gemini') && !this.settings?.enableFallback) return null;

    const config = this.getConfigForProvider('gemini');
    const effectiveKey = config?.apiKey || process.env.API_KEY;
    if (!effectiveKey) return null;
    
    const model = 'gemini-2.5-flash';
    this.log('analyzeImageForEra', 'request', 'Image analysis', model, 'gemini');
    
    return this.retry(async () => {
        const client = new GoogleGenAI({apiKey: effectiveKey});
        const response = await client.models.generateContent({
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
             return JSON.parse(jsonStr);
        }
        return null;
    });
  }
}

export const geminiService = new GeminiService();