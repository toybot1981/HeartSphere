
import React, { useState, useEffect, useRef } from 'react';
import { Character, Message, CustomScenario, AppSettings, StoryNode, UserProfile, JournalEcho } from '../types';
import { geminiService } from '../services/gemini';
import { GenerateContentResponse } from '@google/genai';
import { Button } from './Button';

// --- Audio Decoding Helpers (Raw PCM) ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Rich Text Parser ---
// Parses *actions* and (thoughts) for styled rendering
const RichTextRenderer: React.FC<{ text: string, colorAccent: string }> = ({ text, colorAccent }) => {
    const parts = text.split(/(\*[^*]+\*|\([^)]+\))/g);

    return (
        <span className="whitespace-pre-wrap">
            {parts.map((part, index) => {
                if (part.startsWith('*') && part.endsWith('*')) {
                    // Action: Italic, slightly faded
                    return (
                        <span key={index} className="italic opacity-70 text-sm mx-1 block my-1" style={{ color: '#e5e7eb' }}>
                            {part.slice(1, -1)}
                        </span>
                    );
                } else if (part.startsWith('(') && part.endsWith(')')) {
                    // Thought/Inner Monologue: Smaller, distinct color
                    return (
                        <span key={index} className="block text-xs my-1 font-serif opacity-80 tracking-wide" style={{ color: `${colorAccent}cc` }}>
                            {part}
                        </span>
                    );
                } else if (part.trim() === '') {
                    return null;
                } else {
                    // Standard dialogue
                    return <span key={index}>{part}</span>;
                }
            })}
        </span>
    );
};

interface ChatWindowProps {
  character: Character;
  customScenario?: CustomScenario;
  history: Message[];
  scenarioState?: { currentNodeId: string };
  settings: AppSettings;
  userProfile: UserProfile;
  activeJournalEntryId: string | null; 
  onUpdateHistory: (msgs: Message[]) => void;
  onUpdateScenarioState?: (nodeId: string) => void;
  onBack: (echo?: JournalEcho) => void; 
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  character, customScenario, history, scenarioState, settings, userProfile, activeJournalEntryId, onUpdateHistory, onUpdateScenarioState, onBack 
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sceneImageUrl, setSceneImageUrl] = useState<string | null>(character?.backgroundUrl || null);
  const [isGeneratingScene, setIsGeneratingScene] = useState(false);
  
  // Cinematic Mode State
  const [isCinematic, setIsCinematic] = useState(false);

  // Audio State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);
  
  // Manual Memory Crystallization State
  const [isCrystalizing, setIsCrystalizing] = useState(false);
  const [generatedEcho, setGeneratedEcho] = useState<JournalEcho | undefined>(undefined);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Determine mode
  const isStoryMode = !!customScenario || character?.id.startsWith('story_');
  const isScenarioMode = !!customScenario; // Specifically for Node-based scenarios

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [history, isCinematic]); 

  // --- CRITICAL FIX: Reset Session on Mount ---
  // This ensures that when we enter a chat, the Gemini Service clears any stale cache 
  // and rebuilds the context from the passed 'history' prop.
  useEffect(() => {
    if (character) {
        geminiService.resetSession(character.id);
    }
  }, [character.id]);

  useEffect(() => {
    if (!character) return;

    if (history.length === 0) {
      if (customScenario && onUpdateScenarioState && scenarioState) {
          // Scenario Mode: Trigger first node
          const startNode = customScenario.nodes[scenarioState.currentNodeId];
          handleScenarioTransition(startNode, null);
      } else if (!isStoryMode) {
        // Normal Mode
        onUpdateHistory([{ id: 'init', role: 'model', text: character.firstMessage, timestamp: Date.now() }]);
      } else if (isStoryMode && !customScenario) {
        // Main Story Mode
        onUpdateHistory([{ id: 'init_story', role: 'model', text: character.firstMessage, timestamp: Date.now() }]);
      }
    }
  }, [character?.id, customScenario?.id]);

  useEffect(() => {
    if (!isStoryMode || !settings.autoGenerateStoryScenes) return;
    
    const lastMsg = history[history.length - 1];
    if (lastMsg && lastMsg.role === 'model' && !isGeneratingScene) {
        const generate = async () => {
            setIsGeneratingScene(true);
            try {
                const desc = await geminiService.generateSceneDescription(history);
                if (desc) {
                    const prompt = `${desc}. Style: Modern Chinese Anime (Manhua), High Quality, Cinematic Lighting, Vibrant Colors. Aspect Ratio: 16:9.`;
                    const img = await geminiService.generateImageFromPrompt(prompt, '16:9');
                    if (img) setSceneImageUrl(img);
                }
            } catch (e) {
                console.error("Scene generation error (UI handled):", e);
            } finally {
                setIsGeneratingScene(false);
            }
        };
        const timeoutId = setTimeout(generate, 500);
        return () => clearTimeout(timeoutId);
    }
  }, [history, isStoryMode, settings.autoGenerateStoryScenes]);

  const stopAudio = () => {
    if (sourceNodeRef.current) { 
        try { sourceNodeRef.current.stop(); } catch(e) {/* already stopped */} 
        sourceNodeRef.current = null; 
    }
    setPlayingMessageId(null);
    setIsPlayingAudio(false);
  };
  
  const handlePlayAudio = async (msgId: string, text: string) => {
    if (playingMessageId === msgId) {
      stopAudio();
      return;
    }
    stopAudio(); 
    setAudioLoadingId(msgId);

    try {
      if (!audioContextRef.current) {
         audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const base64Audio = await geminiService.generateSpeech(text, character.voiceName || 'Kore');
      if (!base64Audio) throw new Error("No audio data generated");

      const audioBytes = decode(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setPlayingMessageId(null);
        setIsPlayingAudio(false);
      };
      
      sourceNodeRef.current = source;
      source.start();
      
      setPlayingMessageId(msgId);
      setIsPlayingAudio(true);
    } catch (e) {
      console.error("Audio playback failed", e);
      alert("语音播放失败，请检查网络或稍后重试");
    } finally {
      setAudioLoadingId(null);
    }
  };

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleScenarioTransition = async (node: StoryNode, choiceText: string | null) => {
    setIsLoading(true);
    const tempBotId = `bot_${Date.now()}`;
    
    let currentHistory = [...history];
    if (choiceText) {
       const userMsg: Message = { id: `user_${Date.now()}`, role: 'user', text: choiceText, timestamp: Date.now() };
       currentHistory.push(userMsg);
       onUpdateHistory(currentHistory);
    }

    try {
       const stream = await geminiService.generateStoryBeatStream(node, currentHistory, choiceText, userProfile);
       let fullResponseText = '';
       let firstChunk = true;
       for await (const chunk of stream) {
         const chunkText = (chunk as GenerateContentResponse).text;
         if (chunkText) {
           fullResponseText += chunkText;
           const newMsg = { id: tempBotId, role: 'model' as const, text: fullResponseText, timestamp: Date.now() };
           if (firstChunk) {
               currentHistory = [...currentHistory, newMsg];
               firstChunk = false;
           } else {
               currentHistory = [...currentHistory.slice(0, -1), newMsg];
           }
           onUpdateHistory(currentHistory);
         }
       }
       if (onUpdateScenarioState) onUpdateScenarioState(node.id);
    } catch (e) {
        console.error("Scenario generation failed", e);
        onUpdateHistory([...currentHistory, {id: tempBotId, role: 'model', text: "【系统错误：剧本生成失败，请稍后重试】", timestamp: Date.now()}]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleOptionClick = (optionId: string) => {
      if (!customScenario || !scenarioState) return;
      const currentNode = customScenario.nodes[scenarioState.currentNodeId];
      const option = currentNode.options.find(o => o.id === optionId);
      if (option && option.nextNodeId) {
          const nextNode = customScenario.nodes[option.nextNodeId];
          if (nextNode) handleScenarioTransition(nextNode, option.text);
      }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || isScenarioMode) return;
    const userText = input.trim();
    setInput('');
    setIsLoading(true);
    
    const userMsg: Message = { id: `user_${Date.now()}`, role: 'user', text: userText, timestamp: Date.now() };
    let currentHistory = [...history, userMsg];
    onUpdateHistory(currentHistory);
    
    let fullResponseText = '';
    const tempBotId = `bot_${Date.now()}`;
    
    try {
      // Pass userProfile correctly
      const stream = await geminiService.sendMessageStream(character, currentHistory, userText, userProfile);
      let firstChunk = true;
      for await (const chunk of stream) {
        const chunkText = (chunk as GenerateContentResponse).text;
        if (chunkText) {
          fullResponseText += chunkText;
          const msg = { id: tempBotId, role: 'model' as const, text: fullResponseText, timestamp: Date.now() };
          if (firstChunk) {
            currentHistory = [...currentHistory, msg];
            firstChunk = false;
          } else {
            currentHistory = [...currentHistory.slice(0, -1), msg];
          }
          onUpdateHistory(currentHistory);
        }
      }
    } catch (error) { 
        console.error("Gemini Error:", error);
        onUpdateHistory([...currentHistory, {id: tempBotId, role: 'model', text: "【系统错误：连接失败，请稍后重试】", timestamp: Date.now()}]);
    } finally { 
        setIsLoading(false); 
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleCrystalizeMemory = async () => {
    if (!activeJournalEntryId || history.length < 2 || isCrystalizing) return;
    setIsCrystalizing(true);
    try {
        const wisdom = await geminiService.generateWisdomEcho(history, character.name);
        if (wisdom) {
            setGeneratedEcho({
                characterName: character.name,
                text: wisdom,
                timestamp: Date.now()
            });
        }
    } catch (e) {
        console.error("Failed to crystalize memory", e);
    } finally {
        setIsCrystalizing(false);
    }
  };

  const handleBackClick = () => {
    onBack(generatedEcho);
  };
  
  const renderChoices = () => {
    if (!customScenario || !scenarioState || isLoading) return null;
    const currentNode = customScenario.nodes[scenarioState.currentNodeId];
    if (history.length > 0 && history[history.length-1].role === 'user') return null;
    if (!currentNode || currentNode.options.length === 0) return null;

    return (
        <div className={`flex flex-wrap gap-3 justify-center mt-4 animate-fade-in ${isCinematic ? 'mb-10' : ''}`}>
            {currentNode.options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleOptionClick(opt.id)}
                  className="bg-indigo-600/80 backdrop-blur-md hover:bg-indigo-500 text-white px-6 py-3 rounded-xl shadow-lg border border-indigo-400/50 transition-all active:scale-95"
                >
                    {opt.text}
                </button>
            ))}
        </div>
    );
  };
  
  if (!character) return null;

  const backgroundImage = isStoryMode && sceneImageUrl ? sceneImageUrl : character.backgroundUrl;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black text-white font-sans">
      <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000" style={{ backgroundImage: `url(${backgroundImage})`, filter: isCinematic ? 'brightness(0.9)' : (isStoryMode ? 'blur(0px) brightness(0.6)' : 'blur(4px) opacity(0.6)') }} />
      
      {!isStoryMode && !isCinematic && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <div className="relative h-[85vh] w-[85vh] max-w-full flex items-end justify-center pb-10">
              <div className="absolute inset-0 opacity-40 rounded-full blur-3xl" style={{ background: `radial-gradient(circle, ${character.colorAccent}66 0%, transparent 70%)` }} />
            <img src={character.avatarUrl} alt={character.name} className="h-full w-full object-contain drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] animate-fade-in transition-transform duration-75 will-change-transform" />
          </div>
        </div>
      )}

      {/* Header Bar */}
      {!isCinematic && (
        <div className="absolute top-0 left-0 right-0 p-4 z-20 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center transition-opacity duration-500">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" onClick={handleBackClick} className="!p-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></Button>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-wider">{customScenario ? customScenario.title : character.name}</h2>
              <span className="text-xs uppercase tracking-widest opacity-80" style={{ color: character.colorAccent }}>{customScenario ? '原创剧本' : '已连接'}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
               <button 
                  onClick={() => setIsCinematic(true)} 
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all border border-white/10"
                  title="进入沉浸模式"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
               </button>

              {activeJournalEntryId && (
                  <button 
                    onClick={handleCrystalizeMemory} 
                    disabled={isCrystalizing}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm transition-all text-xs font-bold ${
                        generatedEcho 
                        ? 'bg-indigo-500/80 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' 
                        : 'bg-white/10 border-white/20 text-indigo-300 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                     {isCrystalizing ? '凝结中...' : generatedEcho ? '记忆已凝结' : '凝结记忆'}
                  </button>
              )}

             <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm">
               {isGeneratingScene && <span className="text-xs text-orange-400 animate-pulse mr-2">正在生成场景...</span>}
               {isPlayingAudio && <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1" />}
               <span className="text-xs font-mono">{isPlayingAudio ? "正在播放" : "待机"}</span>
             </div>
          </div>
        </div>
      )}

      {isCinematic && (
        <button 
          onClick={() => setIsCinematic(false)}
          className="absolute top-4 right-4 z-50 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white/50 hover:text-white transition-all backdrop-blur-md"
        >
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
             <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-3.65-3.65m3.65 3.65F5.183 2.16 20.632 17.608M14.25 12a2.25 2.25 0 0 1-2.25 2.25" />
           </svg>
        </button>
      )}

      {/* Main Chat Area */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 flex flex-col justify-end pb-4 bg-gradient-to-t from-black via-black/80 to-transparent transition-all duration-500 ${isCinematic ? 'h-[40vh] bg-gradient-to-t from-black via-black/50 to-transparent' : 'h-[65vh]'}`}>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 space-y-4 scrollbar-hide" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 15%)' }}>
          {history.length === 0 && isLoading && isStoryMode && (
              <div className="h-full flex flex-col items-center justify-center space-y-4 animate-fade-in">
                  <div className="w-16 h-16 border-4 border-t-indigo-500 border-white/20 rounded-full animate-spin" />
                  <p className="text-indigo-300 font-bold text-lg animate-pulse">正在生成故事...</p>
              </div>
          )}
          {history.map((msg) => (
              <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${isCinematic && msg.role === 'user' ? 'opacity-0 h-0 overflow-hidden' : ''}`}> 
                <div 
                  className={`
                    max-w-[85%] sm:max-w-[70%] rounded-2xl overflow-hidden backdrop-blur-md shadow-lg text-sm sm:text-base leading-relaxed 
                    ${msg.role === 'user' ? 'bg-white/10 text-white border border-white/20 rounded-br-none' : 'text-white rounded-bl-none'}
                    ${isCinematic ? '!bg-black/60 !border-none !text-lg !font-medium !text-center !w-full !max-w-2xl !mx-auto !rounded-xl' : ''} 
                  `} 
                  style={!isCinematic && msg.role !== 'user' ? { backgroundColor: `${character.colorAccent}33`, borderColor: `${character.colorAccent}4D`, borderWidth: '1px' } : {}}
                >
                  {msg.image ? (
                     <div className="p-1"><img src={msg.image} alt="Generated" className="w-full h-auto rounded-xl shadow-inner" /></div>
                  ) : (
                     <div className={`px-5 py-3 flex flex-col ${isCinematic ? 'items-center' : 'items-start'}`}>
                         <RichTextRenderer text={msg.text} colorAccent={character.colorAccent} />
                         {msg.role === 'model' && !isCinematic && (
                             <div className="mt-2 w-full flex justify-end">
                                 <button 
                                   onClick={() => handlePlayAudio(msg.id, msg.text)}
                                   disabled={audioLoadingId === msg.id}
                                   className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white/70 hover:text-white hover:scale-110 active:scale-95"
                                 >
                                   {audioLoadingId === msg.id ? (
                                     <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                   ) : (
                                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-4 h-4 ${playingMessageId === msg.id ? 'text-pink-300 animate-pulse' : ''}`}>
                                        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0 2.25 2.25 0 0 1 0 3.182.75.75 0 0 0 0-3.182.75.75 0 0 1 0-1.06Z" />
                                     </svg>
                                   )}
                                 </button>
                             </div>
                         )}
                     </div>
                  )}
                </div>
              </div>
          ))}
          {isLoading && history.length > 0 && (<div className="flex justify-start w-full"><div className="rounded-2xl rounded-bl-none px-4 py-3 backdrop-blur-md border border-white/10 flex items-center space-x-2" style={{ backgroundColor: `${character.colorAccent}1A` }}><div className="w-2 h-2 bg-white/70 rounded-full typing-dot" /><div className="w-2 h-2 bg-white/70 rounded-full typing-dot" /><div className="w-2 h-2 bg-white/70 rounded-full typing-dot" /></div></div>)}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-4 sm:px-8 mt-2 max-w-4xl mx-auto w-full pb-6 min-h-[80px]">
            {isScenarioMode ? (
                renderChoices()
            ) : (
                /* Input Area - Hidden in Cinematic Mode */
                !isCinematic && (
                <div className="relative flex items-center bg-black/90 rounded-2xl p-2 border border-white/10 animate-fade-in w-full">
                   <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="输入你的消息..." className="flex-1 bg-transparent border-none text-white placeholder-white/40 focus:ring-0 resize-none max-h-24 py-3 px-3 scrollbar-hide text-base" rows={1} disabled={isLoading} />
                   <Button onClick={handleSend} disabled={isLoading || !input.trim()} className="ml-2 !rounded-xl !px-6 !py-2 shadow-lg" style={{ backgroundColor: character.colorAccent }}>发送</Button>
                </div>
                )
            )}
        </div>
      </div>
    </div>
  );
};