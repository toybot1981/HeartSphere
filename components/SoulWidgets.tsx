import React, { useState, useEffect, useMemo } from 'react';
import { JournalEntry } from '../types';
import { geminiService } from '../services/gemini';

// --- WIDGET 1: RESONANCE ORB (SOUL PRISM) ---

interface ResonanceOrbProps {
    entries: JournalEntry[];
}

export const ResonanceOrb: React.FC<ResonanceOrbProps> = ({ entries }) => {
    const [color, setColor] = useState({ r: 100, g: 100, b: 255 }); // Default Blue
    const [label, setLabel] = useState('静谧 Blue');

    // Simple client-side sentiment heuristic (to save tokens)
    // In a real app, this could use a lightweight local model or cached API results
    useEffect(() => {
        if (entries.length === 0) return;
        
        const recentText = entries.slice(0, 5).map(e => e.content + " " + e.title).join(" ").toLowerCase();
        
        // Keyword dictionaries
        const angry = ['怒', '烦', 'hate', 'angry', 'fire', '燥'];
        const happy = ['喜', '乐', 'happy', 'joy', 'love', '笑', '顺'];
        const sad = ['悲', '哭', 'sad', 'cry', '泪', '痛', '累'];
        const calm = ['静', '安', 'calm', 'peace', 'sleep', '淡'];
        const chaos = ['乱', '忙', 'chaos', 'busy', 'rush', '慌'];

        let scores = { angry: 0, happy: 0, sad: 0, calm: 0, chaos: 0 };

        angry.forEach(k => { if (recentText.includes(k)) scores.angry++; });
        happy.forEach(k => { if (recentText.includes(k)) scores.happy++; });
        sad.forEach(k => { if (recentText.includes(k)) scores.sad++; });
        calm.forEach(k => { if (recentText.includes(k)) scores.calm++; });
        chaos.forEach(k => { if (recentText.includes(k)) scores.chaos++; });

        // Determine dominant
        let max = 0;
        let dominant = 'calm';
        Object.entries(scores).forEach(([key, val]) => {
            if (val > max) { max = val; dominant = key; }
        });

        // Map to Colors
        switch(dominant) {
            case 'angry': setColor({ r: 255, g: 80, b: 80 }); setLabel('炽烈 Red'); break;
            case 'happy': setColor({ r: 255, g: 220, b: 100 }); setLabel('明晰 Gold'); break;
            case 'sad': setColor({ r: 80, g: 120, b: 255 }); setLabel('深沉 Blue'); break;
            case 'chaos': setColor({ r: 180, g: 80, b: 255 }); setLabel('混沌 Purple'); break;
            case 'calm': default: setColor({ r: 100, g: 255, b: 200 }); setLabel('平和 Cyan'); break;
        }

    }, [entries]);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute top-2 left-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold z-10">Soul Prism</div>
            
            {/* The Orb */}
            <div className="relative w-24 h-24 flex items-center justify-center my-2">
                <div 
                    className="absolute inset-0 rounded-full blur-xl opacity-60 animate-pulse transition-colors duration-1000"
                    style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }}
                />
                <div 
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-white/20 to-transparent backdrop-blur-md border border-white/20 shadow-inner relative z-10 animate-[spin_10s_linear_infinite]"
                    style={{ 
                        boxShadow: `0 0 30px rgba(${color.r},${color.g},${color.b},0.5)`,
                    }}
                />
            </div>
            
            <div className="text-center z-10">
                <p className="text-xs text-slate-400">Current Resonance</p>
                <p className="text-sm font-bold text-white transition-colors duration-1000" style={{ textShadow: `0 0 10px rgba(${color.r},${color.g},${color.b},0.8)` }}>
                    {label}
                </p>
            </div>
        </div>
    );
};

// --- WIDGET 2: DIGITAL ORACLE ---

const CARDS = [
    { id: 'glitch', name: '故障 The Glitch', desc: '意外的启示，打破常规', icon: '⚡' },
    { id: 'neon', name: '霓虹 The Neon', desc: '虚幻的繁荣，表象之下', icon: '🌃' },
    { id: 'void', name: '虚空 The Void', desc: '无限的潜能，或是归零', icon: '⚫' },
    { id: 'echo', name: '回声 The Echo', desc: '过去的重演，历史的循环', icon: '🔊' },
    { id: 'link', name: '链接 The Link', desc: '意想不到的羁绊', icon: '🔗' },
    { id: 'firewall', name: '防火墙 The Firewall', desc: '保护与隔绝，内心的防御', icon: '🛡️' },
    { id: 'data', name: '数据流 The Stream', desc: '信息的洪流，随波逐流', icon: '🌊' },
    { id: 'key', name: '密钥 The Key', desc: '解开谜题的核心', icon: '🔑' }
];

interface DigitalOracleProps {
    entries: JournalEntry[];
}

export const DigitalOracle: React.FC<DigitalOracleProps> = ({ entries }) => {
    const [status, setStatus] = useState<'idle' | 'shuffling' | 'revealed'>('idle');
    const [card, setCard] = useState(CARDS[0]);
    const [interpretation, setInterpretation] = useState('');

    const drawCard = async () => {
        if (status === 'shuffling') return;
        setStatus('shuffling');
        setInterpretation('');

        // Shuffle animation
        let i = 0;
        const interval = setInterval(() => {
            setCard(CARDS[Math.floor(Math.random() * CARDS.length)]);
            i++;
            if (i > 15) {
                clearInterval(interval);
                const finalCard = CARDS[Math.floor(Math.random() * CARDS.length)];
                setCard(finalCard);
                setStatus('revealed');
                
                // Fetch AI Interpretation
                const context = entries.slice(0, 3).map(e => e.content);
                geminiService.generateOracleReading(finalCard.name, context).then(setInterpretation);
            }
        }, 100);
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col relative overflow-hidden min-h-[200px]">
            <div className="absolute top-2 left-2 text-[10px] text-indigo-400 uppercase tracking-widest font-bold z-10 flex items-center gap-1">
                <span>🔮</span> Digital Oracle
            </div>

            <div className="flex-1 flex flex-col items-center justify-center z-10 mt-4">
                {status === 'idle' ? (
                    <button 
                        onClick={drawCard}
                        className="group relative w-32 h-44 bg-slate-800 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-slate-800/80 transition-all"
                    >
                        <span className="text-4xl opacity-50 group-hover:scale-110 transition-transform">🎴</span>
                        <span className="text-xs text-slate-500 mt-2">Draw Daily Card</span>
                    </button>
                ) : (
                    <div className="text-center animate-fade-in w-full">
                        <div className="text-6xl mb-2 filter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{card.icon}</div>
                        <h3 className="text-lg font-bold text-white mb-1">{card.name}</h3>
                        <p className="text-xs text-slate-400 mb-3">{card.desc}</p>
                        
                        <div className="min-h-[60px] bg-black/30 rounded p-2 border border-white/5 text-xs text-indigo-200 italic leading-relaxed">
                            {status === 'shuffling' ? (
                                <span className="animate-pulse">Accessing Fate Protocol...</span>
                            ) : (
                                interpretation ? (
                                    <span className="animate-fade-in">{interpretation}</span>
                                ) : (
                                    <div className="flex justify-center gap-1">
                                        <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay:'0s'}}/>
                                        <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay:'0.1s'}}/>
                                        <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay:'0.2s'}}/>
                                    </div>
                                )
                            )}
                        </div>
                        
                        {status === 'revealed' && interpretation && (
                            <button onClick={() => setStatus('idle')} className="mt-3 text-[10px] text-slate-500 hover:text-white underline">
                                Reset
                            </button>
                        )}
                    </div>
                )}
            </div>
            
            {/* Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/10 to-transparent pointer-events-none" />
        </div>
    );
};