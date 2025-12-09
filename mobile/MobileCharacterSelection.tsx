import React from 'react';
import { WorldScene, Character, CustomScenario } from '../types';

interface MobileCharacterSelectionProps {
    scene: WorldScene;
    characters: Character[];
    scenarios: CustomScenario[];
    onBack: () => void;
    onSelectCharacter: (char: Character) => void;
    onPlayScenario: (scenario: CustomScenario) => void;
    onAddCharacter: () => void;
    onAddScenario: () => void;
}

export const MobileCharacterSelection: React.FC<MobileCharacterSelectionProps> = ({ 
    scene, characters, scenarios, onBack, onSelectCharacter, onPlayScenario, onAddCharacter, onAddScenario 
}) => {
    return (
        <div className="h-full bg-black flex flex-col">
            {/* Header / Hero */}
            <div className="relative h-64 shrink-0">
                <img src={scene.imageUrl} className="w-full h-full object-cover opacity-80" alt="Scene Cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black" />
                
                <button 
                    onClick={onBack}
                    className="absolute top-[calc(1rem+env(safe-area-inset-top))] left-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 z-20 active:scale-95 transition-transform"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>

                <div className="absolute bottom-0 left-0 w-full p-6">
                    <h1 className="text-3xl font-bold text-white mb-2 shadow-black drop-shadow-md">{scene.name}</h1>
                    <p className="text-sm text-gray-300 line-clamp-2">{scene.description}</p>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pb-24 p-4 space-y-8">
                
                {/* Characters Section */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                         <h3 className="text-lg font-bold text-white border-l-4 border-pink-500 pl-3">登场人物</h3>
                         <button onClick={onAddCharacter} className="text-xs bg-pink-600/20 text-pink-400 px-3 py-1 rounded-full border border-pink-600/30">
                            + 新增角色
                         </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        {characters.map(char => (
                            <div 
                                key={char.id}
                                onClick={() => onSelectCharacter(char)}
                                className="relative rounded-xl overflow-hidden aspect-[3/4] border border-white/10 shadow-lg active:scale-95 transition-transform"
                            >
                                <img src={char.avatarUrl} className="w-full h-full object-cover" alt={char.name} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                                <div className="absolute bottom-3 left-3">
                                    <p className="text-white font-bold text-sm">{char.name}</p>
                                    <p className="text-[10px] text-gray-400">{char.role}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scenarios Section */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                         <h3 className="text-lg font-bold text-white border-l-4 border-indigo-500 pl-3">剧情剧本</h3>
                         <button onClick={onAddScenario} className="text-xs bg-indigo-600/20 text-indigo-400 px-3 py-1 rounded-full border border-indigo-600/30">
                            + 创建剧本
                         </button>
                    </div>

                    <div className="space-y-3">
                        {scene.mainStory && (
                            <div 
                                onClick={() => onSelectCharacter(scene.mainStory!)}
                                className="bg-gradient-to-r from-gray-800 to-gray-900 border border-pink-500/30 rounded-xl p-4 active:scale-[0.98] transition-transform"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-[10px] bg-pink-500 text-white px-2 py-0.5 rounded-full font-bold">Main Story</span>
                                        <h4 className="text-white font-bold mt-2">{scene.mainStory.name}</h4>
                                    </div>
                                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10">
                                        <img src={scene.mainStory.avatarUrl} className="w-full h-full object-cover" />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 mt-2 line-clamp-2">{scene.mainStory.bio}</p>
                            </div>
                        )}

                        {scenarios.map(scen => (
                             <div 
                                key={scen.id}
                                onClick={() => onPlayScenario(scen)}
                                className="bg-gray-900 border border-gray-800 rounded-xl p-4 active:scale-[0.98] transition-transform"
                            >
                                <h4 className="text-indigo-200 font-bold mb-1">{scen.title}</h4>
                                <p className="text-xs text-gray-500 line-clamp-2">{scen.description}</p>
                                <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-800">
                                    <span className="text-[10px] text-gray-600">By {scen.author}</span>
                                    <span className="text-[10px] text-indigo-400">开始剧情 &rarr;</span>
                                </div>
                            </div>
                        ))}

                        {scenarios.length === 0 && !scene.mainStory && (
                            <p className="text-center text-xs text-gray-600 py-4">暂无剧情，点击右上角创建。</p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};