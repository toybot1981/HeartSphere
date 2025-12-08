
import React from 'react';
import { WorldScene, Character, GameState } from '../types';
import { Button } from '../components/Button';

interface MobileSceneSelectionProps {
    scenes: WorldScene[];
    customCharacters: Record<string, Character[]>;
    onSelectCharacter: (char: Character, sceneId: string) => void;
}

export const MobileSceneSelection: React.FC<MobileSceneSelectionProps> = ({ scenes, customCharacters, onSelectCharacter }) => {
    return (
        <div className="h-full bg-black pb-20 overflow-y-auto">
            <div className="p-4 sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-white/10">
                <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">选择连接对象</h1>
            </div>

            <div className="flex flex-col gap-8 p-4">
                {scenes.map(scene => {
                    const chars = [...scene.characters, ...(customCharacters[scene.id] || [])];
                    return (
                        <div key={scene.id} className="space-y-4">
                            {/* Scene Header */}
                            <div className="relative h-32 rounded-xl overflow-hidden group">
                                <img src={scene.imageUrl} alt={scene.name} className="w-full h-full object-cover opacity-60" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                                <div className="absolute bottom-2 left-4">
                                    <h3 className="text-lg font-bold text-white">{scene.name}</h3>
                                    <p className="text-[10px] text-gray-300 line-clamp-1">{scene.description}</p>
                                </div>
                            </div>

                            {/* Horizontal Scroll Characters */}
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                {chars.map(char => (
                                    <div 
                                      key={char.id} 
                                      onClick={() => onSelectCharacter(char, scene.id)}
                                      className="flex-shrink-0 w-28 flex flex-col gap-2"
                                    >
                                        <div className="w-28 h-36 rounded-lg overflow-hidden border border-white/10 relative">
                                            <img src={char.avatarUrl} className="w-full h-full object-cover" alt={char.name} />
                                            <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                                                <p className="text-xs text-white font-bold">{char.name}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
