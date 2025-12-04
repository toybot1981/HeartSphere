import React, { useState, useEffect, useRef } from 'react';
import { Character, Message, CustomScenario, AppSettings, StoryNode } from '../types';
import { geminiService } from '../services/gemini';
import { GenerateContentResponse } from '@google/genai';
import { Button } from './Button';

interface ChatWindowProps {
  character: Character;
  customScenario?: CustomScenario;
  history: Message[];
  scenarioState?: { currentNodeId: string };
  settings: AppSettings;
  onUpdateHistory: (msgs: Message[]) => void;
  onUpdateScenarioState?: (nodeId: string) => void;
  onBack: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  character, customScenario, history, scenarioState, settings, onUpdateHistory, onUpdateScenarioState, onBack 
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sceneImageUrl, setSceneImageUrl] = useState<string | null>(character.backgroundUrl);
  const [isGeneratingScene, setIsGeneratingScene] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [talkingIntensity, setTalkingIntensity] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const isStoryMode = !!customScenario || character.id.startsWith('story_');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [history]);

  useEffect(() => {
    if (history.length === 0) {
      if (customScenario && onUpdateScenarioState && scenarioState) {
          const startNode = customScenario.nodes[scenarioState.currentNodeId];
          handleScenarioTransition(startNode, null);
      } else if (!isStoryMode) {
        onUpdateHistory([{ id: 'init', role: 'model', text: character.firstMessage, timestamp: Date.now() }]);
      } else if (isStoryMode && !customScenario) {
        onUpdateHistory([{ id: 'init_story', role: 'model', text: character.firstMessage, timestamp: Date.now() }]);
      }
    }
  }, [character.id, customScenario?.id]);

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
    if (sourceNodeRef.current) { try { sourceNodeRef.current.stop(); } catch(e) {/* already stopped */} sourceNodeRef.current = null; }
    if (animationFrameRef.current) { cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
    setIsPlayingAudio(false);
    setTalkingIntensity(0);
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
       const stream = await geminiService.generateStoryBeatStream(node, currentHistory, choiceText);
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
      const stream = await geminiService.sendMessageStream(character, currentHistory, userText);
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
  
  const renderChoices = () => {
    if (!customScenario || !scenarioState || isLoading) return null;
    const currentNode = customScenario.nodes[scenarioState.currentNodeId];
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

      <div className="absolute top-0 left-0 right-0 p-4 z-20 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" onClick={onBack} className="!p-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></Button>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold tracking-wider">{customScenario ? customScenario.title : character.name}</h2>
            <div className="text-xs uppercase tracking-widest opacity-80" style={{ color: character.colorAccent }}>{customScenario ? '原创剧本' : '连接中'}</div>
          </div>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm">
           {isGeneratingScene && <span className="text-xs text-orange-400 animate-pulse mr-2">正在生成场景...</span>}
           <span className="text-xs font-mono">{isPlayingAudio ? "正在播放" : "待机"}</span>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col justify-end pb-4 h-[65vh] bg-gradient-to-t from-black via-black/80 to-transparent">
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 space-y-4 scrollbar-hide" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 15%)' }}>
          {history.map((msg) => (
              <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl overflow-hidden backdrop-blur-md shadow-lg text-sm sm:text-base leading-relaxed ${msg.role === 'user' ? 'bg-white/10 text-white border border-white/20 rounded-br-none' : 'text-white rounded-bl-none'}`} style={msg.role !== 'user' ? { backgroundColor: `${character.colorAccent}33`, borderColor: `${character.colorAccent}4D`, borderWidth: '1px' } : {}}>
                  {msg.image ? <div className="p-1"><img src={msg.image} alt="Generated" className="w-full h-auto rounded-xl shadow-inner" /></div> : <div className="px-5 py-3"><p className="whitespace-pre-wrap">{msg.text}</p></div>}
                </div>
              </div>
          ))}
          {isLoading && (<div className="flex justify-start w-full"><div className="rounded-2xl rounded-bl-none px-4 py-3 backdrop-blur-md border border-white/10 flex items-center space-x-2" style={{ backgroundColor: `${character.colorAccent}1A` }}><div className="w-2 h-2 bg-white/70 rounded-full typing-dot" /><div className="w-2 h-2 bg-white/70 rounded-full typing-dot" /><div className="w-2 h-2 bg-white/70 rounded-full typing-dot" /></div></div>)}
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
