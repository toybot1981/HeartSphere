
import React, { useState, useEffect, useMemo } from 'react';
import { JournalEntry, UserProfile, MemoryTicket } from '../types';
import { Button } from './Button';

interface MemoryTicketModalProps {
  entry: JournalEntry;
  user: UserProfile;
  onClose: () => void;
}

export const MemoryTicketModal: React.FC<MemoryTicketModalProps> = ({ entry, user, onClose }) => {
  const [allowInteraction, setAllowInteraction] = useState(false);
  const [ticketKey, setTicketKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [isMinted, setIsMinted] = useState(false); // State for the "Stamping" animation
  
  // Keep ID stable across re-renders
  const [ticketId] = useState(`TKT-${Date.now().toString(36).toUpperCase()}`);

  // Generate the ticket data object
  const ticket: MemoryTicket = useMemo(() => ({
        id: ticketId,
        authorName: user.nickname,
        authorAvatarUrl: user.avatarUrl,
        title: entry.title,
        content: entry.content,
        imageUrl: entry.imageUrl,
        timestamp: entry.timestamp,
        allowInteraction: allowInteraction,
        musicMood: 'Reflective'
  }), [entry, user, allowInteraction, ticketId]);

  useEffect(() => {
    try {
        const json = JSON.stringify(ticket);
        // Use btoa with unicode handling hack
        const base64 = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (match, p1) => {
            return String.fromCharCode(parseInt(p1, 16));
        }));
        setTicketKey(base64);
    } catch (e) {
        console.error("Failed to generate ticket key", e);
    }
  }, [ticket]);

  const handleCopy = async () => {
      try {
          await navigator.clipboard.writeText(ticketKey);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      } catch (e) {
          alert("复制失败，请手动复制");
      }
  };

  const handleMint = () => {
      setIsMinted(true);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-fade-in font-serif">
        <div className="relative w-full max-w-md perspective-1000">
            
            {/* Close Button (Outside the ticket) */}
            <button 
                onClick={onClose} 
                className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors flex items-center gap-2 text-sm"
            >
                <span className="uppercase tracking-widest text-[10px]">Close</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {/* THE TICKET */}
            <div className={`
                bg-[#f4f1ea] text-[#2c2c2c] rounded-lg overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] 
                transition-all duration-700 transform relative
                ${isMinted ? 'rotate-0 scale-100' : 'rotate-1 scale-95'}
            `}>
                {/* Decorative Paper Texture */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`}}></div>

                {/* Left Notch */}
                <div className="absolute top-[70%] -left-3 w-6 h-6 bg-black rounded-full z-20"></div>
                {/* Right Notch */}
                <div className="absolute top-[70%] -right-3 w-6 h-6 bg-black rounded-full z-20"></div>
                {/* Perforation Line */}
                <div className="absolute top-[70%] left-4 right-4 border-t-2 border-dashed border-[#2c2c2c]/20 z-10"></div>

                {/* --- MAIN TICKET BODY --- */}
                <div className="p-6 pb-8 relative">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6 border-b-2 border-black/10 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full border border-black/20 p-0.5">
                                <img src={user.avatarUrl || 'https://picsum.photos/seed/default/100/100'} className="w-full h-full rounded-full object-cover grayscale" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold tracking-[0.2em] uppercase text-black/60">From the memory of</h4>
                                <p className="text-lg font-bold leading-none">{user.nickname}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold tracking-widest uppercase text-black/40">Date Recorded</p>
                            <p className="text-sm font-mono">{new Date(entry.timestamp).toLocaleDateString().replace(/\//g, '.')}</p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-4 mb-4">
                        <h2 className="text-3xl font-bold leading-tight line-clamp-2">{entry.title}</h2>
                        
                        {entry.imageUrl ? (
                            <div className="h-32 w-full bg-black rounded overflow-hidden relative grayscale hover:grayscale-0 transition-all duration-1000 group">
                                <img src={entry.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                <div className="absolute bottom-2 right-2 text-white/80 text-[10px] tracking-widest border border-white/30 px-2 py-0.5 rounded-full">VISUAL RECORD</div>
                            </div>
                        ) : (
                            <div className="h-32 w-full flex items-center justify-center border border-black/10 rounded bg-black/5 p-4 relative overflow-hidden">
                                <p className="text-sm italic text-center text-black/60 line-clamp-4 relative z-10">"{entry.content}"</p>
                                <div className="absolute -bottom-4 -right-4 text-9xl text-black/5 font-serif">”</div>
                            </div>
                        )}
                        
                        <div className="flex justify-center pt-2">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className={`w-4 h-4 border border-black/30 rounded-sm flex items-center justify-center transition-colors ${allowInteraction ? 'bg-black text-white' : 'bg-transparent'}`} onClick={() => !isMinted && setAllowInteraction(!allowInteraction)}>
                                    {allowInteraction && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <span className={`text-xs uppercase tracking-wider font-bold transition-colors ${isMinted ? 'opacity-50' : 'text-black/60 group-hover:text-black'}`}>
                                    Allow Guest Interaction
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* --- TICKET STUB (TEAR-OFF) --- */}
                <div className="bg-[#e8e4da] p-6 pt-8 relative">
                    {!isMinted ? (
                        <div className="flex flex-col items-center gap-3">
                            <p className="text-xs text-black/50 text-center max-w-[200px] leading-relaxed">
                                Once minted, the memory coordinates will be fixed in the timeline.
                            </p>
                            <button 
                                onClick={handleMint}
                                className="w-full bg-[#2c2c2c] text-[#f4f1ea] py-3 rounded text-sm font-bold uppercase tracking-[0.2em] hover:bg-black transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                Mint Ticket
                            </button>
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            <div className="flex justify-between items-end mb-3">
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-black/40 tracking-widest">Boarding Pass</p>
                                    <p className="text-lg font-mono font-bold tracking-tighter text-black/80">{ticketId.split('-')[1]}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase text-black/40 tracking-widest">Class</p>
                                    <p className="text-sm font-bold">{allowInteraction ? 'INTERACTIVE' : 'OBSERVER'}</p>
                                </div>
                            </div>

                            <div className="relative group cursor-pointer" onClick={handleCopy}>
                                <div className="absolute -inset-1 bg-gradient-to-r from-pink-500/20 to-indigo-500/20 rounded blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="bg-white border-2 border-black/10 rounded p-3 relative flex items-center justify-between">
                                    <div className="flex-1 overflow-hidden mr-2">
                                        <p className="text-[10px] text-black/30 font-mono mb-1 uppercase">Space-Time Coordinate</p>
                                        <p className="font-mono text-xs truncate text-black/70 select-all">{ticketKey}</p>
                                    </div>
                                    <div className={`p-2 rounded-full transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-black text-white'}`}>
                                        {copied ? (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                        )}
                                    </div>
                                </div>
                                <p className="text-[10px] text-center text-black/40 mt-2 font-sans">
                                    {copied ? "COORDINATE COPIED TO CLIPBOARD" : "CLICK TO COPY COORDINATE"}
                                </p>
                            </div>
                            
                            {/* Animated Stamp */}
                            <div className="absolute top-2 right-6 pointer-events-none animate-[ping_0.5s_ease-out_reverse_both]">
                                <div className="border-4 border-red-800/30 text-red-800/30 rounded-full w-24 h-24 flex items-center justify-center transform -rotate-12">
                                    <span className="text-xs font-black uppercase tracking-widest">Verified</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
