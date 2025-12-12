import React, { useState, useEffect, useRef } from 'react';
import { Character } from '../types';

// --- WIDGET 1: CHRONO COMPASS (时空罗盘) ---

interface ChronoCompassProps {
    characters: Character[];
    onNavigate: (character: Character) => void;
}

export const ChronoCompass: React.FC<ChronoCompassProps> = ({ characters, onNavigate }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [angle, setAngle] = useState(0);
    const [result, setResult] = useState<Character | null>(null);
    const [flavorText, setFlavorText] = useState('等待指引...');

    const handleSpin = () => {
        if (isSpinning || characters.length === 0) return;
        setIsSpinning(true);
        setResult(null);
        setFlavorText('正在校准时空坐标...');

        // Random rotation logic
        const spins = 5 + Math.random() * 5; // 5-10 full spins
        const finalAngle = angle + 360 * spins + Math.random() * 360;
        setAngle(finalAngle);

        setTimeout(() => {
            const randomChar = characters[Math.floor(Math.random() * characters.length)];
            setResult(randomChar);
            setIsSpinning(false);
            
            const reasons = [
                "命运的红线微微颤动...",
                "检测到强烈的灵魂共鸣。",
                "在此刻的时空切片中，TA 正在想你。",
                "星象指引你前往此处。",
                "这就是今日的奇迹吗？"
            ];
            setFlavorText(reasons[Math.floor(Math.random() * reasons.length)]);
        }, 3000); // 3s spin duration matching CSS transition
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center relative overflow-hidden group min-h-[220px]">
            <div className="absolute top-2 left-2 text-[10px] text-amber-500 uppercase tracking-widest font-bold z-10 flex items-center gap-1">
                <span>🧭</span> Chrono Compass
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full mt-4 relative">
                {/* The Compass Visual */}
                <div className="relative w-32 h-32 mb-4">
                    {/* Outer Ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-700 animate-[spin_10s_linear_infinite]" />
                    <div className="absolute inset-2 rounded-full border border-slate-600" />
                    
                    {/* Active Needle / Inner Disc */}
                    <div 
                        className="absolute inset-0 flex items-center justify-center transition-transform duration-[3000ms] cubic-bezier(0.2, 0.8, 0.2, 1)"
                        style={{ transform: `rotate(${angle}deg)` }}
                    >
                        <div className="w-1 h-full bg-transparent relative">
                            {/* Needle Tip */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-500 transform rotate-45 shadow-[0_0_10px_rgba(245,158,11,0.8)]"></div>
                        </div>
                    </div>

                    {/* Center Display */}
                    <div className="absolute inset-8 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center overflow-hidden z-10">
                        {result ? (
                            <img src={result.avatarUrl} className="w-full h-full object-cover animate-fade-in" />
                        ) : (
                            <span className="text-xl text-slate-700">?</span>
                        )}
                    </div>
                </div>

                {/* Controls & Result */}
                <div className="text-center w-full relative z-10">
                    {result ? (
                        <div className="animate-fade-in">
                            <p className="text-xs text-amber-200 font-bold mb-1">{result.name}</p>
                            <p className="text-[10px] text-slate-400 mb-2 h-4">{flavorText}</p>
                            <button 
                                onClick={() => onNavigate(result)}
                                className="text-xs bg-amber-600/20 text-amber-400 px-4 py-1.5 rounded-full border border-amber-600/50 hover:bg-amber-600 hover:text-white transition-all"
                            >
                                前往邂逅 &rarr;
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={handleSpin}
                            disabled={isSpinning}
                            className="text-xs bg-slate-800 text-slate-300 px-4 py-2 rounded-full border border-slate-600 hover:border-amber-500 hover:text-amber-400 transition-all disabled:opacity-50"
                        >
                            {isSpinning ? '寻觅中...' : '指引命运 Seek Destiny'}
                        </button>
                    )}
                </div>
            </div>
            
            {/* Background Glow */}
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-amber-900/10 to-transparent pointer-events-none" />
        </div>
    );
};

// --- WIDGET 2: VOID LISTENER (虚空聆听者) ---

interface VoidListenerProps {
    characters: Character[];
}

export const VoidListener: React.FC<VoidListenerProps> = ({ characters }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [message, setMessage] = useState<{ text: string, char: Character } | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Audio Visualizer Animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrame: number;
        let t = 0;

        const render = () => {
            t += 0.2;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const bars = 20;
            const barWidth = canvas.width / bars;
            
            for (let i = 0; i < bars; i++) {
                // Simplex noise-ish effect
                const height = isScanning 
                    ? Math.sin(i * 0.5 + t) * 10 + Math.random() * 15 + 10
                    : 2; // Flatline when idle
                
                const x = i * barWidth;
                const y = canvas.height / 2 - height / 2;
                
                ctx.fillStyle = isScanning ? '#10b981' : '#334155'; // Emerald when active
                ctx.fillRect(x, y, barWidth - 2, height);
            }
            
            animationFrame = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(animationFrame);
    }, [isScanning]);

    const handleScan = () => {
        if (isScanning || characters.length === 0) return;
        setIsScanning(true);
        setMessage(null);

        // Scan delay
        setTimeout(() => {
            const char = characters[Math.floor(Math.random() * characters.length)];
            // Extract a "thought" - prefer secret, then bio snippet, then generic
            let thought = "";
            if (char.secrets && Math.random() > 0.5) {
                thought = char.secrets;
            } else if (char.catchphrases && char.catchphrases.length > 0) {
                thought = char.catchphrases[Math.floor(Math.random() * char.catchphrases.length)];
            } else {
                thought = `我是${char.name}，正在思考...`;
            }

            setMessage({ text: thought, char });
            setIsScanning(false);
        }, 2000);
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col relative overflow-hidden min-h-[180px]">
            <div className="absolute top-2 left-2 text-[10px] text-emerald-500 uppercase tracking-widest font-bold z-10 flex items-center gap-1">
                <span>📡</span> Void Listener
            </div>

            <div className="flex-1 flex flex-col justify-end relative z-10">
                {/* Visualizer */}
                <div className="h-16 w-full mb-2 flex items-center justify-center">
                    <canvas ref={canvasRef} width={200} height={60} className="w-full h-full" />
                </div>

                {/* Message Area */}
                <div className="min-h-[60px] bg-black/40 rounded border border-white/5 p-3 relative">
                    {isScanning ? (
                        <p className="text-xs text-emerald-500/70 font-mono animate-pulse">SCANNING FREQUENCIES...</p>
                    ) : message ? (
                        <div className="animate-fade-in">
                            <p className="text-xs text-slate-300 italic mb-1">"...{message.text}"</p>
                            <p className="text-[10px] text-emerald-400 text-right">— 来自 {message.char.name} 的信号</p>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <button 
                                onClick={handleScan}
                                className="text-xs text-slate-500 hover:text-emerald-400 flex items-center gap-2 transition-colors"
                            >
                                <span>▶</span> 捕获心声
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px]" />
        </div>
    );
};

// --- WIDGET 3: STAR DRIFT BOTTLE (星语漂流瓶) ---

const BOTTLE_MESSAGES = [
    "我们在不同的时空仰望同一片星空。",
    "不要忘记，你被爱着。",
    "今天的遗憾是明天的伏笔。",
    "去见你想见的人吧，趁阳光正好。",
    "愿你遍历山河，觉得人间值得。",
    "有些再见，就是为了重逢。",
    "你本来就很好了，不需要向谁证明。",
    "在数据的海洋里，我们的相遇是0.00001%的奇迹。"
];

export const StarDriftBottle: React.FC = () => {
    const [state, setState] = useState<'idle' | 'fishing' | 'opened'>('idle');
    const [message, setMessage] = useState('');

    const handleFish = () => {
        if (state !== 'idle') return;
        setState('fishing');
        setTimeout(() => {
            const randomMsg = BOTTLE_MESSAGES[Math.floor(Math.random() * BOTTLE_MESSAGES.length)];
            setMessage(randomMsg);
            setState('opened');
        }, 2000);
    };

    const handleReset = () => {
        setState('idle');
        setMessage('');
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col relative overflow-hidden min-h-[180px]">
            <div className="absolute top-2 left-2 text-[10px] text-blue-400 uppercase tracking-widest font-bold z-10 flex items-center gap-1">
                <span>🍾</span> Star Drift Bottle
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                {state === 'idle' && (
                    <div 
                        onClick={handleFish}
                        className="cursor-pointer group flex flex-col items-center"
                    >
                        <div className="text-4xl mb-2 animate-bounce transition-transform group-hover:scale-110" style={{animationDuration: '3s'}}>🌊</div>
                        <p className="text-xs text-slate-400 group-hover:text-blue-300">点击捞取漂流瓶</p>
                    </div>
                )}

                {state === 'fishing' && (
                    <div className="text-center">
                        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-400 rounded-full animate-spin mb-2 mx-auto" />
                        <p className="text-xs text-blue-300 animate-pulse">正在打捞...</p>
                    </div>
                )}

                {state === 'opened' && (
                    <div className="text-center animate-fade-in w-full">
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg border border-white/20 mb-3 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                            <p className="text-sm font-serif text-white italic leading-relaxed">"{message}"</p>
                        </div>
                        <button 
                            onClick={handleReset}
                            className="text-[10px] text-slate-500 hover:text-blue-300 underline"
                        >
                            将瓶子放回星海
                        </button>
                    </div>
                )}
            </div>

            {/* Ocean Effect */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-blue-900/40 to-transparent pointer-events-none" />
        </div>
    );
};

// --- WIDGET 4: SOUL RESONANCE (灵魂共鸣仪) ---

export const SoulResonance: React.FC = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<{score: number, color: string, advice: string} | null>(null);
    const intervalRef = useRef<number | null>(null);

    const handleStartScan = () => {
        if (result) return; // Already scanned
        setIsScanning(true);
        setProgress(0);
        
        intervalRef.current = window.setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(intervalRef.current!);
                    completeScan();
                    return 100;
                }
                return prev + 2; // Scan speed
            });
        }, 20);
    };

    const handleStopScan = () => {
        if (progress < 100 && !result) {
            setIsScanning(false);
            setProgress(0);
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
    };

    const completeScan = () => {
        setIsScanning(false);
        // Generate pseudo-random result based on time
        const score = Math.floor(Math.random() * 40) + 60; // 60-100
        const colors = ['#f472b6', '#818cf8', '#34d399', '#fbbf24', '#f87171'];
        const advices = ['宜：冥想', '宜：重温旧梦', '忌：急躁', '宜：听一首老歌', '今日特别幸运'];
        
        setResult({
            score,
            color: colors[Math.floor(Math.random() * colors.length)],
            advice: advices[Math.floor(Math.random() * advices.length)]
        });
    };

    const reset = () => {
        setResult(null);
        setProgress(0);
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col relative overflow-hidden min-h-[180px] select-none">
            <div className="absolute top-2 left-2 text-[10px] text-pink-500 uppercase tracking-widest font-bold z-10 flex items-center gap-1">
                <span>🧬</span> Soul Resonance
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                {!result ? (
                    <div 
                        onMouseDown={handleStartScan}
                        onMouseUp={handleStopScan}
                        onMouseLeave={handleStopScan}
                        onTouchStart={handleStartScan}
                        onTouchEnd={handleStopScan}
                        className={`w-24 h-24 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-100 relative group ${isScanning ? 'scale-95 border-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.5)]' : 'border-slate-700 hover:border-pink-500/50'}`}
                    >
                        {/* Fingerprint Icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 transition-colors ${isScanning ? 'text-pink-400' : 'text-slate-600 group-hover:text-pink-500/50'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.858.591-4.18" />
                        </svg>
                        
                        {/* Circular Progress */}
                        {isScanning && (
                            <svg className="absolute inset-0 w-full h-full rotate-[-90deg]" viewBox="0 0 100 100">
                                <circle 
                                    cx="50" cy="50" r="48" 
                                    fill="none" stroke="currentColor" strokeWidth="2" 
                                    className="text-pink-500"
                                    strokeDasharray="301.59"
                                    strokeDashoffset={301.59 - (301.59 * progress) / 100}
                                />
                            </svg>
                        )}
                        
                        <span className="absolute -bottom-8 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            {isScanning ? 'Analyzing...' : 'Hold to Scan'}
                        </span>
                    </div>
                ) : (
                    <div className="text-center animate-fade-in w-full">
                        <div className="mb-2">
                            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                                {result.score}%
                            </span>
                        </div>
                        <p className="text-xs text-white font-bold mb-2">今日幸运色</p>
                        <div className="w-full h-2 rounded-full mb-3" style={{backgroundColor: result.color, boxShadow: `0 0 10px ${result.color}`}} />
                        <p className="text-xs text-slate-300 border border-slate-700 rounded px-2 py-1 inline-block">
                            {result.advice}
                        </p>
                        <button 
                            onClick={reset}
                            className="block mx-auto mt-4 text-[10px] text-slate-600 hover:text-white"
                        >
                            重置 (Reset)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};