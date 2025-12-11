
import React, { useState, useEffect, useRef } from 'react';
import { MemoryTicket } from '../types';
import { geminiService } from '../services/gemini';

// --- Audio Decoding Helpers (Raw PCM) ---

function decode(base64: string) {
  // Clean base64 string to avoid 'atob' errors
  const cleanBase64 = base64.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
  
  const binaryString = atob(cleanBase64);
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
  // Create a view of the data as Int16 (PCM 16-bit)
  // Ensure the byte length is even
  if (data.length % 2 !== 0) {
      const newData = new Uint8Array(data.length - 1);
      newData.set(data.subarray(0, data.length - 1));
      data = newData;
  }
  
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normalize Int16 to Float32 [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

interface ImmersiveMemoryViewProps {
  ticket: MemoryTicket;
  onClose: () => void;
}

export const ImmersiveMemoryView: React.FC<ImmersiveMemoryViewProps> = ({ ticket, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [showContent, setShowContent] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
      // Intro Animation
      setTimeout(() => setShowContent(true), 800);
      return () => {
          stopAudio();
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
              audioContextRef.current.close();
          }
      };
  }, []);

  const stopAudio = () => {
      if (sourceNodeRef.current) {
          try { sourceNodeRef.current.stop(); } catch(e) {}
          sourceNodeRef.current = null;
      }
      setIsPlaying(false);
  };

  const handlePlayNarrative = async () => {
      if (isPlaying) {
          stopAudio();
          return;
      }

      setIsLoadingAudio(true);
      try {
          if (!audioContextRef.current) {
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
          }
          const ctx = audioContextRef.current;
          if (ctx!.state === 'suspended') await ctx!.resume();

          // Generate TTS for the memory
          const textToSay = `来自 ${ticket.authorName} 的记忆: ${ticket.title}。${ticket.content}`;
          const base64Audio = await geminiService.generateSpeech(textToSay, 'Kore');
          
          if (base64Audio) {
              const audioBytes = decode(base64Audio);
              // Decode Raw PCM (Gemini API standard for this model)
              // Sample Rate 24000 is standard for gemini-2.5-flash-preview-tts
              const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
              
              const source = ctx!.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx!.destination);
              source.onended = () => setIsPlaying(false);
              sourceNodeRef.current = source;
              source.start(0);
              setIsPlaying(true);
          }
      } catch (e) {
          console.error("Audio playback failed", e);
          alert("语音播放失败 (Audio Playback Failed)");
      } finally {
          setIsLoadingAudio(false);
      }
  };

  return (
    <div className="relative h-screen w-screen bg-black overflow-hidden font-serif">
        {/* Background Layer */}
        <div className="absolute inset-0 z-0">
            {ticket.imageUrl ? (
                <div 
                    className="w-full h-full bg-cover bg-center animate-[pulse_10s_ease-in-out_infinite]" 
                    style={{backgroundImage: `url(${ticket.imageUrl})`}} 
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-black to-slate-900" />
            )}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80" />
        </div>

        {/* Content Layer */}
        <div className={`relative z-10 h-full flex flex-col items-center justify-center p-8 transition-opacity duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
            
            <div className="absolute top-8 left-8 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-white/30 overflow-hidden">
                    {ticket.authorAvatarUrl ? <img src={ticket.authorAvatarUrl} className="w-full h-full object-cover" /> : <div className="bg-white/10 w-full h-full" />}
                </div>
                <div>
                    <p className="text-white/50 text-[10px] tracking-[0.2em] uppercase">Memory Owner</p>
                    <p className="text-white text-sm font-bold tracking-widest">{ticket.authorName}</p>
                </div>
            </div>

            <button 
                onClick={onClose}
                className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="max-w-2xl text-center space-y-8">
                <div className="inline-block px-4 py-1 border border-white/20 rounded-full text-[10px] text-white/60 tracking-[0.3em] uppercase bg-black/20 backdrop-blur-sm">
                    {new Date(ticket.timestamp).toLocaleDateString()}
                </div>
                
                <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/30 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                    {ticket.title}
                </h1>

                <div className="relative">
                    <span className="absolute -top-4 -left-4 text-6xl text-white/10 font-serif">“</span>
                    <p className="text-lg md:text-2xl text-white/90 leading-loose font-light italic tracking-wide">
                        {ticket.content}
                    </p>
                    <span className="absolute -bottom-8 -right-4 text-6xl text-white/10 font-serif">”</span>
                </div>

                <div className="pt-12 flex justify-center gap-6">
                    <button 
                        onClick={handlePlayNarrative}
                        disabled={isLoadingAudio}
                        className="group flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:scale-105"
                    >
                        {isLoadingAudio ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : isPlaying ? (
                            <span className="w-5 h-5 flex items-center justify-center">
                                <span className="block w-2 h-2 bg-red-400 rounded-sm animate-pulse" />
                            </span>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/80 group-hover:text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                        )}
                        <span className="text-xs tracking-widest text-white/70 group-hover:text-white">
                            {isPlaying ? 'STOP NARRATION' : 'LISTEN TO MEMORY'}
                        </span>
                    </button>
                </div>
            </div>

            {ticket.allowInteraction && (
                <div className="absolute bottom-12 left-0 right-0 text-center">
                    <p className="text-[10px] text-white/30 tracking-[0.2em] uppercase animate-pulse">
                        You are leaving a faint trace in this space...
                    </p>
                </div>
            )}
        </div>
    </div>
  );
};
