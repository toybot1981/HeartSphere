
import React from 'react';
import { Persona, Character } from '../types';

interface EraSelectionModalProps {
  persona: Persona;
  onSelect: (character: Character) => void;
  onClose: () => void;
}

export const EraSelectionModal: React.FC<EraSelectionModalProps> = ({ persona, onSelect, onClose }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white">
              选择时代: <span className="text-purple-400">{persona.name}</span>
            </h3>
            <p className="text-sm text-gray-400">你想与哪个时期的TA相遇？</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-3xl">&times;</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {persona.eras.map(character => (
            <div 
              key={character.id}
              onClick={() => onSelect(character)}
              className="group relative cursor-pointer overflow-hidden rounded-xl border border-gray-700 hover:border-purple-500/50 transition-all"
            >
              <img src={character.avatarUrl} alt={character.name} className="h-48 w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-0 left-0 p-3 text-white">
                <div 
                  className="px-2 py-0.5 text-xs font-bold rounded-full mb-1 inline-block"
                  style={{ backgroundColor: `${character.colorAccent}40`, color: character.colorAccent }}
                >
                  {character.era}
                </div>
                <h4 className="font-bold">{character.name}</h4>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};