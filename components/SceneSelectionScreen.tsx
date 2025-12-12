import React, { useState } from 'react';
import { WorldScene, Character, Mail } from '../types';
import { Button } from './Button';
import { SceneCard } from './SceneCard';
import { ChronoCompass, VoidListener, StarDriftBottle, SoulResonance } from './HeartWidgets';

interface SceneSelectionScreenProps {
    scenes: WorldScene[];
    customScenes: WorldScene[];
    mailbox: Mail[];
    onSelectScene: (id: string) => void;
    onOpenMailbox: () => void;
    onOpenEraMemory: (sceneId: string) => void;
    onEditScene: (scene: WorldScene) => void;
    onCreateScene: () => void;
    onBackToRealWorld: () => void;
    onEnterConnectionSpace: () => void;
    // Widget Props
    allCharacters: Character[];
    onNavigateToCharacter: (char: Character, sceneId: string) => void;
}

export const SceneSelectionScreen: React.FC<SceneSelectionScreenProps> = ({
    scenes,
    customScenes,
    mailbox,
    onSelectScene,
    onOpenMailbox,
    onOpenEraMemory,
    onEditScene,
    onCreateScene,
    onBackToRealWorld,
    onEnterConnectionSpace,
    allCharacters,
    onNavigateToCharacter
}) => {
    // Sidebar State
    const [showWidgets, setShowWidgets] = useState(true);

    const combinedScenes = [...scenes, ...customScenes];

    const handleCompassNavigate = (char: Character) => {
        // We need to find which scene this character belongs to
        let targetSceneId = '';
        for (const s of combinedScenes) {
            if (s.characters.some(c => c.id === char.id)) {
                targetSceneId = s.id; break;
            }
        }
        // If not found in built-in lists, check logic in parent or assume it's passed correctly
        // For simplicity, we bubble up the navigation request
        // We might need to look up custom characters map in parent, 
        // but here we just pass what we have.
        // NOTE: Ideally `allCharacters` should carry sceneId, or we search again.
        
        // Since `onNavigateToCharacter` expects a sceneId, we try to find it here or let parent handle
        // Let's iterate scenes to find the char ID.
        if (!targetSceneId) {
             // Try to find in custom lists if they were passed (not directly available here easily without map)
             // Simplified: Parent `onNavigateToCharacter` will handle the lookup if we pass empty sceneId?
             // Or we pass the sceneId if we can find it.
             // Actually, `allCharacters` passed from App.tsx can be augmented.
             // But for now, let's just pass the char and let App handle the scene lookup.
             onNavigateToCharacter(char, ''); // Empty string implies "Find this char"
        } else {
             onNavigateToCharacter(char, targetSceneId);
        }
    };

    return (
        <div className="h-full flex bg-slate-950 relative overflow-hidden">
            
            {/* Main Content Area */}
            <div className="flex-1 h-full flex flex-col overflow-hidden min-w-0 relative z-10">
                
                {/* Header (Absolute Overlay or Static) */}
                <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-20 pointer-events-none">
                    <div className="flex items-center gap-4 pointer-events-auto">
                        <Button variant="ghost" onClick={onBackToRealWorld} className="backdrop-blur-md bg-black/20 border border-white/10 hover:bg-white/10">&larr; 返回现实</Button>
                        <Button variant="ghost" onClick={onEnterConnectionSpace} className="backdrop-blur-md bg-indigo-900/30 border border-indigo-500/30 text-indigo-200 hover:text-white hover:bg-indigo-800/50">✨ 进入星海</Button>
                    </div>
                    <div className="flex gap-4 pointer-events-auto">
                        <button onClick={onOpenMailbox} className="relative p-2 text-slate-400 hover:text-white bg-black/20 backdrop-blur-md rounded-full border border-white/5 transition-all hover:bg-white/10">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            {mailbox.some(m => !m.isRead) && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                        </button>
                        <Button variant="secondary" onClick={onCreateScene} className="backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 text-sm shadow-lg">+ 创造新时代</Button>
                        
                        {/* Mobile Toggle for Widgets (Hidden on PC, handled by layout) */}
                        <button 
                            className="md:hidden p-2 text-slate-400 border border-slate-700 rounded-lg bg-slate-900"
                            onClick={() => setShowWidgets(!showWidgets)}
                        >
                            🔮
                        </button>
                    </div>
                </div>

                {/* Grid Content */}
                <div className="flex-1 overflow-y-auto p-8 pt-24 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto pb-20">
                        {combinedScenes.map(scene => (
                            <div key={scene.id} className="relative group">
                                <SceneCard 
                                    scene={scene} 
                                    onSelect={() => onSelectScene(scene.id)} 
                                />
                                {/* Edit/Memory Buttons for Scene */}
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onOpenEraMemory(scene.id); }}
                                        className="p-2 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-pink-600 transition-colors border border-white/10"
                                        title="时代记忆"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                    </button>
                                    {/* Only allow editing custom scenes visually here, though prop logic handles it */}
                                    {customScenes.find(s => s.id === scene.id) && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onEditScene(scene); }}
                                            className="p-2 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-indigo-600 transition-colors border border-white/10"
                                            title="编辑时代"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Sidebar (HeartWidgets) */}
            <div 
                className={`hidden md:flex flex-col gap-4 transition-all duration-500 ease-in-out border-l border-indigo-900/30 bg-black/40 backdrop-blur-xl relative shrink-0 overflow-hidden ${showWidgets ? 'w-[320px] p-4 opacity-100' : 'w-[40px] p-0 opacity-100 cursor-pointer hover:bg-white/5'}`}
                onClick={() => !showWidgets && setShowWidgets(true)}
            >
                {/* Collapsible Toggle Handle */}
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowWidgets(!showWidgets); }}
                    className={`absolute top-24 -left-3 w-6 h-6 bg-slate-800 border border-slate-600 rounded-full flex items-center justify-center text-slate-400 hover:text-white z-20 shadow-lg transition-transform ${showWidgets ? '' : 'rotate-180'}`}
                    title={showWidgets ? "收起" : "展开"}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7" /></svg>
                </button>

                {showWidgets ? (
                    <div className="flex flex-col gap-4 h-full overflow-y-auto scrollbar-hide pt-16 pb-4">
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 pl-1 sticky top-0 bg-black/20 backdrop-blur-sm py-2 z-10">Quantum Tools</h3>
                            <div className="flex flex-col gap-4">
                                <ChronoCompass characters={allCharacters} onNavigate={handleCompassNavigate} />
                                <VoidListener characters={allCharacters} />
                                <StarDriftBottle />
                                <SoulResonance />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center pt-24 gap-8">
                        <span className="text-[10px] text-slate-500 [writing-mode:vertical-rl] tracking-widest font-bold uppercase whitespace-nowrap animate-pulse">
                            HEART SPHERE // LINK
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};