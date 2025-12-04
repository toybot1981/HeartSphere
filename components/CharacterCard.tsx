import React from 'react';
import { Character } from '../types';

interface CharacterCardProps {
  character: Character;
  customAvatarUrl?: string;
  isGenerating: boolean;
  onSelect: (char: Character) => void;
  onGenerate: (char: Character) => void;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({ 
  character, 
  customAvatarUrl,
  isGenerating,
  onSelect,
  onGenerate
}) => {
  const displayImage = customAvatarUrl || character.avatarUrl;

  const handleGenerateClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card selection
    onGenerate(character);
  };

  return (
    <div 
      onClick={() => onSelect(character)}
      className="group relative h-96 w-full cursor-pointer overflow-hidden rounded-3xl border border-white/10 shadow-2xl transition-all duration-500 hover:scale-[1.02]"
      style={{
        '--card-accent': character.colorAccent
      } as React.CSSProperties}
    >
      {/* Background Image with Gradient Overlay */}
      <div className="absolute inset-0 bg-gray-900">
        <img 
          src={displayImage} 
          alt={character.name}
          className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 ${isGenerating ? 'opacity-50 blur-sm scale-105' : ''}`}
        />
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center">
             <div 
               className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
               style={{ borderColor: `${character.colorAccent} transparent transparent transparent` }}
             />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 transition-opacity group-hover:opacity-70" />
      </div>

      {/* Action Buttons (Top Right) */}
      <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
        <button
          onClick={handleGenerateClick}
          disabled={isGenerating}
          className="bg-black/50 backdrop-blur-md text-white p-3 rounded-full border border-white/20 transition-all duration-300 shadow-lg hover:rotate-180 hover:bg-white/20"
          style={{ borderColor: character.colorAccent }}
          title="生成新形象"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
             <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 w-full p-6 translate-y-2 transition-transform duration-300 group-hover:translate-y-0">
        <div 
          className="mb-2 inline-block rounded-full px-3 py-1 text-xs font-bold backdrop-blur-md border"
          style={{ 
            backgroundColor: `${character.colorAccent}33`, // 20% opacity
            color: character.colorAccent,
            borderColor: `${character.colorAccent}4D` // 30% opacity
          }}
        >
          {character.role}
        </div>
        <h3 className="mb-1 text-2xl font-bold text-white transition-colors"
            style={{ textShadow: `0 0 20px ${character.colorAccent}40` }}>
          {character.name}
        </h3>
        <p className="text-sm text-white/70 line-clamp-2 mb-4 group-hover:text-white/90">
          {character.bio}
        </p>
      </div>
      
      {/* Selection Ring effect */}
      <div 
        className="absolute inset-0 rounded-3xl border-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" 
        style={{ borderColor: character.colorAccent }}
      />
    </div>
  );
};
