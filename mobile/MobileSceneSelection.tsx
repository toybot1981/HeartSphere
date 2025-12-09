import React from 'react';
import { WorldScene } from '../types';

interface MobileSceneSelectionProps {
    scenes: WorldScene[];
    onSelectScene: (sceneId: string) => void;
    onCreateScene: () => void;
}

export const MobileSceneSelection: React.FC<MobileSceneSelectionProps> = ({ scenes, onSelectScene, onCreateScene }) => {
    return (
        <div className="h-full bg-black pb-20 overflow-y-auto">
            <div className="p-4 pt-[calc(1rem+env(safe-area-inset-top))] sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-white/10 flex justify-between items-center">
                <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">选择时代</h1>
                <span className="text-xs text-gray-500">共 {scenes.length} 个世界</span>
            </div>

            <div className="flex flex-col gap-6 p-4">
                {scenes.map(scene => (
                    <div 
                        key={scene.id} 
                        onClick={() => onSelectScene(scene.id)}
                        className="relative h-48 w-full rounded-2xl overflow-hidden group border border-white/10 shadow-lg active:scale-[0.98] transition-transform"
                    >
                        <img src={scene.imageUrl} alt={scene.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                        
                        <div className="absolute bottom-0 left-0 w-full p-5">
                            <h3 className="text-2xl font-bold text-white mb-1 shadow-black drop-shadow-md">{scene.name}</h3>
                            <p className="text-xs text-gray-300 line-clamp-2 opacity-90">{scene.description}</p>
                        </div>
                        
                        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 text-[10px] text-white">
                            进入 &rarr;
                        </div>
                    </div>
                ))}

                {/* Create New Scene Card */}
                <button 
                    onClick={onCreateScene}
                    className="h-24 w-full rounded-2xl border-2 border-dashed border-gray-700 hover:border-pink-500/50 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-pink-400 transition-colors bg-white/5"
                >
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xl font-bold">+</div>
                    <span className="text-sm font-bold">创造新时代</span>
                </button>
            </div>
        </div>
    );
};