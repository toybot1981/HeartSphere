


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

interface ChatWindowProps {
  character: Character;
  customScenario?: CustomScenario;
  history: Message[];
  scenarioState?: { currentNodeId: string };
  settings: AppSettings;
  userProfile: UserProfile;
  activeJournalEntryId: string | null; // Pass in the active entry ID
  onUpdateHistory: (msgs: Message[]) => void;
  onUpdateScenarioState?: (nodeId: string) => void;
  onBack: (echo?: JournalEcho) => void; // Allow returning an echo
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  character, customScenario, history, scenarioState, settings, userProfile, activeJournalEntryId, onUpdateHistory, onUpdateScenarioState, onBack 
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sceneImageUrl, setSceneImageUrl] = useState<string | null>(character?.backgroundUrl || null);
  const [isGeneratingScene, setIsGeneratingScene] = useState(false);
  
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

  const isStoryMode = !!customScenario || character?.id.startsWith('story_');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [history]);

  useEffect(() => {
    // If character is somehow null (shouldn't happen with parent checks), do nothing
    if (!character) return;

    if (history.length === 0) {
      if (customScenario && onUpdateScenarioState && scenarioState) {
          // Scenario Mode: Trigger first node
          const startNode = customScenario.nodes[scenarioState.currentNodeId];
          handleScenarioTransition(startNode, null);
      } else if (!isStoryMode) {
        // Normal Mode: Show first message
        onUpdateHistory([{ id: 'init', role: 'model', text: character.firstMessage, timestamp: Date.now() }]);
      } else if (isStoryMode && !customScenario) {
        // Main Story Mode: Show first message
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
    // If clicking the currently playing message, stop it
    if (playingMessageId === msgId) {
      stopAudio();
      return;
    }
    
    stopAudio(); // Stop any other audio
    setAudioLoadingId(msgId);

    try {
      // Initialize Audio Context on user gesture
      if (!audioContextRef.current) {
         audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const base64Audio = await geminiService.generateSpeech(text, character.voiceName || 'Kore');
      if (!base64Audio) throw new Error("No audio data generated");

      // Decode Raw PCM
      const audioBytes = decode(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);

      // Play
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
          else console.error(`Next node with ID ${option.nextNodeId} not found!`);
      }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || customScenario) return;
    const userText = input.trim();
    setInput('');
    setIsLoading(true);
    
    const userMsg: Message = { id: `user_${Date.now()}`, role: 'user', text: userText, timestamp: Date.now() };
    let currentHistory = [...history, userMsg];
    onUpdateHistory(currentHistory);
    
    let fullResponseText = '';
    const tempBotId = `bot_${Date.now()}`;
    
    try {
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

  // Trigger manual memory crystallization
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
    // Just pass whatever echo we have generated (if any)
    onBack(generatedEcho);
  };
  
  const renderChoices = () => {
    if (!customScenario || !scenarioState || isLoading) return null;
    const currentNode = customScenario.nodes[scenarioState.currentNodeId];
    // Don't show choices if the last message is from user (waiting for bot response)
    if (history.length > 0 && history[history.length-1].role === 'user') return null;
    if (!currentNode || currentNode.options.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-3 justify-center mt-4 animate-fade-in">
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
      <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000" style={{ backgroundImage: `url(${backgroundImage})`, filter: isStoryMode ? 'blur(0px) brightness(0.6)' : 'blur(4px) opacity(0.6)' }} />
      
      {!isStoryMode && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <div className="relative h-[85vh] w-[85vh] max-w-full flex items-end justify-center pb-10">
              <div className="absolute inset-0 opacity-40 rounded-full blur-3xl" style={{ background: `radial-gradient(circle, ${character.colorAccent}66 0%, transparent 70%)` }} />
            <img src={character.avatarUrl} alt={character.name} className="h-full w-full object-contain drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] animate-fade-in transition-transform duration-75 will-change-transform" />
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 z-20 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" onClick={handleBackClick} className="!p-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></Button>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold tracking-wider">{customScenario ? customScenario.title : character.name}</h2>
            <div className="text-xs uppercase tracking-widest opacity-80" style={{ color: character.colorAccent }}>{customScenario ? '原创剧本' : '连接中'}</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
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
                   {isCrystalizing ? (
                       <>
                         <div className="w-3 h-3 border-2 border-t-transparent border-white rounded-full animate-spin" />
                         凝结中...
                       </>
                   ) : generatedEcho ? (
                       <>
                         <span>✓</span> 记忆已凝结
                       </>
                   ) : (
                       <>
                         <span>✦</span> 凝结记忆
                       </>
                   )}
                </button>
            )}

           <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm">
             {isGeneratingScene && <span className="text-xs text-orange-400 animate-pulse mr-2">正在生成场景...</span>}
             {isPlayingAudio && <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1" />}
             <span className="text-xs font-mono">{isPlayingAudio ? "正在播放" : "待机"}</span>
           </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col justify-end pb-4 h-[65vh] bg-gradient-to-t from-black via-black/80 to-transparent">
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 space-y-4 scrollbar-hide" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 15%)' }}>
          {history.length === 0 && isLoading && isStoryMode && (
              <div className="h-full flex flex-col items-center justify-center space-y-4 animate-fade-in">
                  <div className="w-16 h-16 border-4 border-t-indigo-500 border-white/20 rounded-full animate-spin" />
                  <p className="text-indigo-300 font-bold text-lg animate-pulse">正在生成故事...</p>
              </div>
          )}
          {history.map((msg) => (
              <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl overflow-hidden backdrop-blur-md shadow-lg text-sm sm:text-base leading-relaxed ${msg.role === 'user' ? 'bg-white/10 text-white border border-white/20 rounded-br-none' : 'text-white rounded-bl-none'}`} style={msg.role !== 'user' ? { backgroundColor: `${character.colorAccent}33`, borderColor: `${character.colorAccent}4D`, borderWidth: '1px' } : {}}>
                  {msg.image ? (
                     <div className="p-1"><img src={msg.image} alt="Generated" className="w-full h-auto rounded-xl shadow-inner" /></div>
                  ) : (
                     <div className="px-5 py-3 flex flex-col items-start">
                         <p className="whitespace-pre-wrap">{msg.text}</p>
                         {/* TTS Button */}
                         {msg.role === 'model' && (
                             <div className="mt-2 w-full flex justify-end">
                                 <button 
                                   onClick={() => handlePlayAudio(msg.id, msg.text)}
                                   disabled={audioLoadingId === msg.id}
                                   className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white/70 hover:text-white hover:scale-110 active:scale-95"
                                   title="播放语音"
                                 >
                                   {audioLoadingId === msg.id ? (
                                     <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                   ) : playingMessageId === msg.id ? (
                                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-pink-300 animate-pulse">
                                        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM17.78 9.22a.75.75 0 1 0-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 1 0 1.06-1.06L20.56 12l1.72-1.72a.75.75 0 1 0-1.06-1.06l-1.72 1.72-1.72-1.72Z" />
                                     </svg>
                                   ) : (
                                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                       <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0 2.25 2.25 0 0 1 0 3.182.75.75 0 0 0 0-3.182.75.75 0 0 1 0-1.06Z" />
                                       <path d="M16.463 8.288a.75.75 0 0 1 1.06 0 2.25 2.25 0 0 1 0 3.182.75.75 0 0 1-1.06-1.06.75.75 0 0 0 0-1.06.75.75 0 0 1 0-1.06Z" />
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

        <div className="px-4 sm:px-8 mt-2 max-w-4xl mx-auto w-full pb-6">
            {isStoryMode ? (
                renderChoices()
            ) : (
                <div className="relative flex items-center bg-black/90 rounded-2xl p-2 border border-white/10">
                   <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="输入你的消息..." className="flex-1 bg-transparent border-none text-white placeholder-white/40 focus:ring-0 resize-none max-h-24 py-3 px-3 scrollbar-hide text-base" rows={1} disabled={isLoading} />
                   <Button onClick={handleSend} disabled={isLoading || !input.trim()} className="ml-2 !rounded-xl !px-6 !py-2 shadow-lg" style={{ backgroundColor: character.colorAccent }}>发送</Button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
