import React, { useEffect, useRef } from 'react';

export type AmbienceType = 'sakura' | 'rain' | 'sparkle' | 'glitch' | 'none';

interface ChatAmbienceProps {
    type: AmbienceType;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    rotation: number;
    rotationSpeed: number;
    opacity: number;
    life: number;
    maxLife: number;
    type?: 'petal' | 'rain' | 'splash' | 'sparkle' | 'glitch_rect'; 
}

export const ChatAmbience: React.FC<ChatAmbienceProps> = ({ type }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animationRef = useRef<number>(0);

    // Overlay colors for global mood tint
    const getOverlayStyle = () => {
        switch (type) {
            case 'sakura': return 'bg-pink-500/5';
            case 'rain': return 'bg-blue-900/10';
            case 'sparkle': return 'bg-amber-500/5';
            case 'glitch': return 'bg-cyan-900/5';
            default: return 'bg-transparent';
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        // Reset particles on type change to prevent weird transitions
        particlesRef.current = [];

        const createParticle = (forceType?: string): Particle => {
            const w = canvas.width;
            const h = canvas.height;
            
            if (type === 'sakura') {
                return {
                    x: Math.random() * w,
                    y: -50,
                    vx: Math.random() * 2 - 1, // Sway
                    vy: Math.random() * 2 + 1.5,
                    size: Math.random() * 8 + 8, // Bigger
                    color: Math.random() > 0.5 ? '#fbcfe8' : '#f472b6', // Pink-200 / Pink-400
                    rotation: Math.random() * 360,
                    rotationSpeed: (Math.random() - 0.5) * 4,
                    opacity: Math.random() * 0.4 + 0.6,
                    life: 1000,
                    maxLife: 1000,
                    type: 'petal'
                };
            } else if (type === 'rain') {
                if (forceType === 'splash') {
                    return {
                        x: Math.random() * w,
                        y: h,
                        vx: (Math.random() - 0.5) * 4,
                        vy: -(Math.random() * 3 + 2),
                        size: Math.random() * 2 + 1,
                        color: 'rgba(147, 197, 253, 0.6)',
                        rotation: 0,
                        rotationSpeed: 0,
                        opacity: 0.8,
                        life: 20,
                        maxLife: 20,
                        type: 'splash'
                    };
                }
                return {
                    x: Math.random() * w,
                    y: -50,
                    vx: -1, // Slight wind
                    vy: Math.random() * 15 + 20, // Fast
                    size: Math.random() * 30 + 20, // Long trails
                    color: 'rgba(96, 165, 250, 0.5)',
                    rotation: 0,
                    rotationSpeed: 0,
                    opacity: Math.random() * 0.3 + 0.2,
                    life: 1000,
                    maxLife: 1000,
                    type: 'rain'
                };
            } else if (type === 'sparkle') {
                return {
                    x: Math.random() * w,
                    y: h + 20,
                    vx: (Math.random() - 0.5) * 1,
                    vy: -(Math.random() * 1 + 0.5), // Float Up
                    size: Math.random() * 4 + 2,
                    color: Math.random() > 0.5 ? '#fcd34d' : '#fffbeb', // Amber / White
                    rotation: 0,
                    rotationSpeed: 0,
                    opacity: 0, // Fade in
                    life: 0,
                    maxLife: Math.random() * 100 + 100,
                    type: 'sparkle'
                };
            } else if (type === 'glitch') {
                return {
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: 0,
                    vy: 0,
                    size: Math.random() * 200 + 50, // Width
                    color: Math.random() > 0.5 ? '#06b6d4' : '#d946ef', // Cyan or Magenta
                    rotation: 0,
                    rotationSpeed: 0,
                    opacity: Math.random() * 0.3,
                    life: Math.random() * 5 + 2, // Very short life
                    maxLife: 10,
                    type: 'glitch_rect'
                };
            }
            return { x:0, y:0, vx:0, vy:0, size:0, color:'', rotation:0, rotationSpeed:0, opacity:0, life:0, maxLife:0 };
        };

        const render = () => {
            if (type === 'none') {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // --- Spawning Logic ---
            if (type === 'sakura' && particlesRef.current.length < 60) {
                if (Math.random() < 0.1) particlesRef.current.push(createParticle());
            } else if (type === 'rain') {
                if (particlesRef.current.filter(p => p.type === 'rain').length < 150) {
                    // Spawn multiple rain drops for density
                    particlesRef.current.push(createParticle());
                    particlesRef.current.push(createParticle());
                }
            } else if (type === 'sparkle' && particlesRef.current.length < 50) {
                if (Math.random() < 0.05) particlesRef.current.push(createParticle());
            } else if (type === 'glitch' && Math.random() < 0.15) {
                particlesRef.current.push(createParticle());
            }

            // --- Update & Draw ---
            for (let i = particlesRef.current.length - 1; i >= 0; i--) {
                const p = particlesRef.current[i];
                
                if (type === 'sakura') {
                    // Sway motion
                    p.x += Math.sin(animationRef.current * 0.01 + p.rotation) * 0.5 + p.vx;
                    p.y += p.vy;
                    p.rotation += p.rotationSpeed;
                    
                    if (p.y > canvas.height + 50) {
                        particlesRef.current.splice(i, 1);
                    } else {
                        ctx.save();
                        ctx.translate(p.x, p.y);
                        ctx.rotate(p.rotation * Math.PI / 180);
                        ctx.globalAlpha = p.opacity;
                        ctx.fillStyle = p.color;
                        // Draw heart-ish petal shape
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.bezierCurveTo(p.size / 2, -p.size / 2, p.size, 0, 0, p.size);
                        ctx.bezierCurveTo(-p.size, 0, -p.size / 2, -p.size / 2, 0, 0);
                        ctx.fill();
                        ctx.restore();
                    }
                } 
                else if (type === 'rain') {
                    if (p.type === 'rain') {
                        p.x += p.vx;
                        p.y += p.vy;
                        if (p.y > canvas.height) {
                            // Splash chance
                            if (Math.random() > 0.7) {
                                for(let s=0; s<3; s++) particlesRef.current.push(createParticle('splash'));
                            }
                            particlesRef.current.splice(i, 1);
                        } else {
                            ctx.strokeStyle = p.color;
                            ctx.lineWidth = 2; // Thicker
                            ctx.globalAlpha = p.opacity;
                            ctx.beginPath();
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(p.x + p.vx * 2, p.y + p.size);
                            ctx.stroke();
                        }
                    } else if (p.type === 'splash') {
                        p.x += p.vx;
                        p.y += p.vy;
                        p.vy += 0.5; // Gravity
                        p.life--;
                        if (p.life <= 0) particlesRef.current.splice(i, 1);
                        else {
                            ctx.fillStyle = 'rgba(200, 230, 255, 0.8)';
                            ctx.beginPath();
                            ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                } 
                else if (type === 'sparkle') {
                    p.y += p.vy;
                    p.x += Math.sin(p.y * 0.05) * 0.5; // Gentle weave
                    p.life++;
                    // Sine wave opacity for twinkling fade in/out
                    p.opacity = Math.sin((p.life / p.maxLife) * Math.PI);
                    
                    if (p.life >= p.maxLife) particlesRef.current.splice(i, 1);
                    else {
                        ctx.save();
                        ctx.shadowBlur = 15;
                        ctx.shadowColor = p.color;
                        ctx.globalAlpha = p.opacity;
                        ctx.fillStyle = p.color;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                } 
                else if (type === 'glitch') {
                    p.life--;
                    if (p.life <= 0) particlesRef.current.splice(i, 1);
                    else {
                        ctx.fillStyle = p.color;
                        ctx.globalCompositeOperation = 'screen'; // Additive blending
                        ctx.globalAlpha = p.opacity;
                        // Draw random horizontal rect
                        ctx.fillRect(p.x, p.y, p.size, Math.random() * 20 + 2);
                        ctx.globalCompositeOperation = 'source-over';
                    }
                }
            }

            animationRef.current = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationRef.current);
        };
    }, [type]);

    return (
        <div className={`absolute inset-0 pointer-events-none z-10 transition-colors duration-1000 ${getOverlayStyle()}`}>
            <canvas ref={canvasRef} className="w-full h-full" />
        </div>
    );
};