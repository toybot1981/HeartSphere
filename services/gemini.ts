
import { GoogleGenAI, Chat, GenerateContentResponse, Modality, Type } from "@google/genai";
import { Message, Character, StoryNode, CustomScenario, UserProfile, WorldScene, JournalEcho, JournalEntry } from "../types";
import { createScenarioContext } from "../constants";

// Helper to sanitize history for the API
const formatHistory = (history: Message[]) => {
  return history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));
};

export class GeminiService {
  private ai: GoogleGenAI;
  private chatSessions: Map<string, Chat> = new Map();

  constructor() {
    // Assuming API KEY is available via process.env.API_KEY as per instructions
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
        error?.message?.includes('429') || 
        error?.message?.includes('RESOURCE_EXHAUSTED') ||
        error?.message?.includes('quota') ||
        error?.status === 500; // Also retry on generic server errors

      if (isRateLimit && retries > 0) {
        console.warn(`Gemini API Error. Retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retry(fn, retries - 1, delay * 2); // Exponential backoff
      }
      throw error;
    }
  }

  // Initialize or retrieve a chat session for a specific character
  private getSession(character: Character, history: Message[], userProfile: UserProfile | null): Chat {
    if (!this.chatSessions.has(character.id)) {
      const historyForApi = formatHistory(history.filter(m => m.text)); 
      
      const scenarioContext = createScenarioContext(userProfile);
      const combinedInstruction = `${scenarioContext}\n\nYOUR CHARACTER INSTRUCTION:\n${character.systemInstruction}`;

      const chat = this.ai.chats.create({
        model: 'gemini-2.5-flash',
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

  // Send message and get stream
  async sendMessageStream(
    character: Character, 
    history: Message[], 
    userMessage: string,
    userProfile: UserProfile | null
  ): Promise<AsyncIterable<GenerateContentResponse>> {
    return this.retry(async () => {
      try {
        // Prepare history for session initialization.
        // If the session needs to be created, we must NOT include the message we are about to send
        // in the 'history' passed to chats.create(), otherwise the API sees two consecutive User messages.
        let historyForInit = history;
        if (history.length > 0) {
            const lastMsg = history[history.length - 1];
            // If the last message in history matches the one we are about to send, exclude it from init history
            if (lastMsg.role === 'user' && lastMsg.text === userMessage) {
                historyForInit = history.slice(0, -1);
            }
        }

        const chat = this.getSession(character, historyForInit, userProfile);
        return await chat.sendMessageStream({ message: userMessage });
      } catch (e) {
        // If an error occurs (e.g. history desync), invalidate the session so the next retry creates a fresh one.
        console.warn(`Error in sendMessageStream for ${character.name}, resetting session.`, e);
        this.chatSessions.delete(character.id);
        throw e;
      }
    });
  }

  // --- Era & Character Constructor ---
  async generateCharacterFromPrompt(prompt: string, eraName: string): Promise<Character | null> {
    return this.retry(async () => {
       try {
        // Step 1: Generate Character Details
        const detailsResponse = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Based on the prompt "${prompt}" for a character in the world/era named "${eraName}", create a complete character profile.
            - The character's name, bio, role, systemInstruction, and firstMessage MUST be in Chinese.
            - The themeColor and colorAccent MUST be valid hex color codes (e.g., '#ff5733').
            - The age should be a reasonable number.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        age: { type: Type.NUMBER },
                        role: { type: Type.STRING },
                        bio: { type: Type.STRING },
                        systemInstruction: { type: Type.STRING },
                        firstMessage: { type: Type.STRING },
                        themeColor: { type: Type.STRING },
                        colorAccent: { type: Type.STRING },
                    },
                    required: ["name", "age", "role", "bio", "systemInstruction", "firstMessage", "themeColor", "colorAccent"]
                }
            }
        });
        
        if (!detailsResponse.text) throw new Error("Failed to generate character details.");
        const details = JSON.parse(detailsResponse.text);

        // Step 2: Generate Avatar
        const avatarPrompt = `High-quality vertical anime character portrait of ${details.name}. Description: ${details.bio}. Role: ${details.role}. Style: Modern Chinese Anime (Manhua), vibrant colors, detailed eyes. Centered character, abstract background matching theme color ${details.themeColor}.`;
        const avatarUrl = await this.generateImageFromPrompt(avatarPrompt, '3:4');
        if (!avatarUrl) throw new Error("Failed to generate character avatar.");

        // Step 3: Generate Background
        const backgroundPrompt = `Atmospheric anime background scene for the world of "${eraName}". It should match the personality of a character described as: "${details.bio}". Style: Modern Chinese Anime (Manhua), high quality, cinematic lighting.`;
        const backgroundUrl = await this.generateImageFromPrompt(backgroundPrompt, '9:16');
        if (!backgroundUrl) throw new Error("Failed to generate character background.");

        // Step 4: Assemble Character
        const newCharacter: Character = {
            id: `custom_${Date.now()}`,
            voiceName: 'Kore', // Default voice
            ...details,
            avatarUrl,
            backgroundUrl
        };
        return newCharacter;

      } catch (e) {
        console.error("Full character generation from prompt failed", e);
        throw e;
      }
    });
  }


  // --- Custom Scenario Generation ---
  
  // Generate the narrative for a specific node in a custom scenario
  async generateStoryBeatStream(
    node: StoryNode,
    previousHistory: Message[],
    userChoiceText: string | null,
    userProfile: UserProfile | null
  ): Promise<AsyncIterable<GenerateContentResponse>> {
    return this.retry(async () => {
      // Logic fix: If userChoiceText is provided, it was likely just added to previousHistory.
      // We must exclude it from the API initialization history because the 'triggerMsg' below 
      // ("我选择了: ...") acts as the User turn for this interaction.
      let historyForApiSource = previousHistory;
      if (userChoiceText && previousHistory.length > 0) {
          const lastMsg = previousHistory[previousHistory.length - 1];
          if (lastMsg.role === 'user' && lastMsg.text === userChoiceText) {
              historyForApiSource = previousHistory.slice(0, -1);
          }
      }

      const historyForApi = formatHistory(historyForApiSource.filter(m => m.text));
      const scenarioContext = createScenarioContext(userProfile);

      const specificInstruction = `
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

      const chat = this.ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: specificInstruction,
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

  // AI Magic Build: Generate a full scenario structure from a prompt
  async generateScenarioFromPrompt(userPrompt: string): Promise<CustomScenario | null> {
    return this.retry(async () => {
      try {
        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Create a branching interactive fiction scenario based on this idea: "${userPrompt}".
          
          Requirements:
          1. Create a logical flow with at least 4-6 nodes.
          2. "nodes" must be an array of node objects.
          3. Ensure "startNodeId" matches one of the node IDs.
          4. "options" in a node should point to valid "id"s of other nodes.
          5. Content Language: Chinese (Simplified).
          
          Output JSON matching the schema.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                startNodeId: { type: Type.STRING },
                nodes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      prompt: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            id: { type: Type.STRING },
                            text: { type: Type.STRING },
                            nextNodeId: { type: Type.STRING }
                          },
                          required: ["id", "text", "nextNodeId"]
                        }
                      }
                    },
                    required: ["id", "title", "prompt", "options"]
                  }
                }
              },
              required: ["title", "description", "startNodeId", "nodes"]
            }
          }
        });

        if (response.text) {
          const rawData = JSON.parse(response.text);
          const nodesRecord: Record<string, StoryNode> = {};
          if (Array.isArray(rawData.nodes)) {
              rawData.nodes.forEach((n: any) => {
                nodesRecord[n.id] = n;
              });
          }

          return {
            id: `gen_${Date.now()}`,
            sceneId: '', // Will be assigned in App.tsx
            author: 'AI Magic',
            title: rawData.title,
            description: rawData.description,
            startNodeId: rawData.startNodeId,
            nodes: nodesRecord,
          };
        }
        return null;
      } catch (e) {
        console.error("Magic build attempt failed", e);
        throw e;
      }
    });
  }

  // Generate an image of the character
  async generateCharacterImage(character: Character): Promise<string | null> {
      const prompt = `Create a high-quality vertical anime character portrait of ${character.name}.
        Description: ${character.bio}
        Role: ${character.role}
        Style: Modern Chinese Anime (Manhua) style, Vibrant Colors, High Resolution, detailed eyes, clean lines.
        The character should be facing forward, centered in the frame.
        Background: Abstract or simple, matching the theme ${character.themeColor}.`;
      return await this.generateImageFromPrompt(prompt, '3:4');
  }

  // Helper to generate image from a raw prompt
  async generateImageFromPrompt(prompt: string, aspectRatio: string = '1:1'): Promise<string | null> {
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
          console.warn("Generic image generation failed, will retry:", e);
          throw e; 
      }
    });
  }

  // Analyzes the story history and generates a prompt for the scene image
  async generateSceneDescription(history: Message[]): Promise<string | null> {
      const recentContext = history.slice(-3).map(m => `${m.role}: ${m.text}`).join('\n');
      const prompt = `
        Based on the following story interaction in a modern Chinese university setting, describe the visual scene for an anime illustration in English.
        Include:
        1. The characters present (Sakura, Kaito, Elara, or Rina) and their visible actions/emotions.
        2. The setting/background (e.g., classroom, library, campus path).
        Keep it concise (under 50 words). Format: "Anime scene: [Description]"
        Interaction:
        ${recentContext}
      `;

      return this.retry(async () => {
        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });
            return response.text;
        } catch (e) {
            console.warn("Scene description generation failed, will retry:", e);
            throw e;
        }
      });
  }

  // Generate Speech from text
  async generateSpeech(text: string, voiceName: string): Promise<string | null> {
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
        console.warn("Speech generation failed silently, will retry:", error);
        throw error;
      }
    });
  }

  // --- Mind Projection: Generate abstract mood image from text ---
  async generateMoodImage(text: string): Promise<string | null> {
    return this.retry(async () => {
      try {
        // 1. Analyze mood
        const analysisResponse = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Analyze the mood, emotions, and key imagery in this journal entry: "${text}". 
          Create a prompt for an abstract, artistic anime-style illustration that represents these feelings. 
          The prompt should describe colors, lighting, and abstract shapes. 
          Format: Just the prompt text in English.`,
        });
        
        const imagePrompt = analysisResponse.text;
        if (!imagePrompt) return null;

        // 2. Generate Image
        const finalPrompt = `${imagePrompt}. Style: Abstract, Ethereal, Digital Art, Makoto Shinkai style clouds/lighting, Emotional, High Quality. No text.`;
        return await this.generateImageFromPrompt(finalPrompt, '16:9');
      } catch (e) {
        console.error("Mood image generation failed", e);
        return null;
      }
    });
  }

  // --- Echoes of Wisdom: Generate summary/insight from chat history ---
  async generateWisdomEcho(history: Message[], characterName: string): Promise<string | null> {
    return this.retry(async () => {
      try {
        const historyForApi = formatHistory(history.filter(m => m.text));
        
        const chat = this.ai.chats.create({
            model: 'gemini-2.5-flash',
            history: historyForApi
        });

        const result = await chat.sendMessage({
            message: `(System Command) Please summarize your advice and feelings towards me in this conversation into one single, profound, and healing sentence. Keep it under 50 words. Do not use "User:" or "Model:" prefixes. Just the sentence.`
        });

        return result.text;
      } catch (e) {
        console.error("Echo generation failed", e);
        return null;
      }
    });
  }

  // --- Mirror of Truth: Analyze subconscious patterns ---
  async generateMirrorInsight(currentEntry: string, previousEntries: string[]): Promise<string | null> {
    return this.retry(async () => {
      try {
        // Construct context from previous entries (last 5) to find patterns
        const historyContext = previousEntries.length > 0 
          ? `Recent Journal History:\n${previousEntries.join('\n---\n')}\n\n`
          : '';

        const prompt = `
          ${historyContext}
          Current Journal Entry: "${currentEntry}"

          ROLE: You are the "Mirror of Truth" (本我镜像). You are NOT a roleplay character. You are a rational, objective, psychological reflector.
          
          TASK: 
          1. Analyze the user's input (and history if provided) for subconscious patterns, recurring themes, cognitive distortions, or logical inconsistencies.
          2. Do NOT comfort the user. Do NOT be emotional. Be cool and mirror-like.
          3. Output a single, piercing insight or question that helps the user realize something about themselves.
          4. Example: "You mentioned 'escape' 3 times this week. What are you avoiding?" or "You equate 'busy' with 'worth'. Is this logical?"
          
          CONSTRAINT:
          - Output ONLY the insight text.
          - Keep it under 50 words.
          - Language: Chinese.
        `;

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        return response.text;
      } catch (e) {
        console.error("Mirror insight generation failed", e);
        return null;
      }
    });
  }

  // --- Chronos Mailbox: Generate offline letter ---
  async generateChronosLetter(
    character: Character, 
    userProfile: UserProfile, 
    recentJournalEntries: JournalEntry[]
  ): Promise<{ subject: string; content: string } | null> {
    return this.retry(async () => {
      try {
        const lastEntry = recentJournalEntries.length > 0 
          ? recentJournalEntries.sort((a,b) => b.timestamp - a.timestamp)[0]
          : null;
        
        const moodContext = lastEntry 
          ? `User's latest journal mood: ${lastEntry.content.substring(0, 100)}...`
          : `User hasn't written in the journal recently.`;

        const prompt = `
          ROLE: You are "${character.name}" from the era/role "${character.role}".
          User Name: ${userProfile.nickname}
          
          CONTEXT:
          The user has been "offline" (away from the HeartSphere) for a while. You are continuing your life in your world, but you missed them or wanted to share something.
          ${moodContext}

          TASK:
          Write a short, warm, "handwritten" style letter to the user.
          - If the user was sad in their journal, be comforting.
          - If happy, share the joy.
          - If neutral, share a slice of your daily life in your specific Era (e.g., if Cyberpunk, talk about neon rain; if University, talk about exams or cherry blossoms).
          - Be IN CHARACTER. Use their tone.

          OUTPUT FORMAT: JSON
          {
            "subject": "Short title for the letter (e.g., 'About yesterday...', 'It's raining here')",
            "content": "The body of the letter. Keep it under 150 words. Emotional and immersive."
          }
        `;

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    subject: { type: Type.STRING },
                    content: { type: Type.STRING }
                },
                required: ["subject", "content"]
            }
          }
        });

        if (response.text) {
             return JSON.parse(response.text);
        }
        return null;
      } catch (e) {
        console.error("Chronos letter generation failed", e);
        return null;
      }
    });
  }

  // --- Era Analysis: Analyze image for era context ---
  async analyzeImageForEra(base64Image: string): Promise<{ name: string; description: string } | null> {
    return this.retry(async () => {
      try {
        const prompt = `
          You are analyzing a user-uploaded image to create a "World Era" in a metaverse application.
          This image might be:
          1. A historical photo (e.g., 90s street, old event).
          2. A personal memory (e.g., a specific room, a landscape).
          3. A fictional artwork.

          TASK:
          Identify the probable era, year, atmosphere, or key event in the image.
          Generate a concise, poetic title and description for this "Era".
          
          OUTPUT JSON:
          {
            "name": "Suggest a name (e.g. '1998世界杯之夏', '千禧年的老街', '赛博废墟')",
            "description": "A 1-2 sentence description of the vibe, suitable for a world setting. (Chinese)"
          }
        `;
        
        // Strip the data:image/png;base64, prefix if present
        const cleanBase64 = base64Image.split(',')[1];

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: {
            parts: [
               { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
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
        console.error("Era image analysis failed", e);
        return null;
      }
    });
  }

  // Reset a session (e.g. if user restarts)
  resetSession(characterId: string) {
    this.chatSessions.delete(characterId);
  }
}

export const geminiService = new GeminiService();
