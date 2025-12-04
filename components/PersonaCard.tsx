import React from 'react';
import { Persona } from '../types';

interface PersonaCardProps {
  persona: Persona;
  onSelect: () => void;
}

export const PersonaCard: React.FC<PersonaCardProps> = ({ persona, onSelect }) => {
  return (
    <div 
      onClick={onSelect}
      className="group relative h-96 w-full cursor-pointer overflow-hidden rounded-3xl border border-white/10 shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:border-purple-400/50"
    >
      <div className="absolute inset-0 bg-gray-900">
        <img 
          src={persona.avatarUrl} 
          alt={persona.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 transition-opacity group-hover:opacity-70" />
      </div>

      <div className="absolute bottom-0 left-0 w-full p-6">
        <div 
          className="mb-2 inline-block rounded-full px-3 py-1 text-xs font-bold backdrop-blur-md border bg-purple-500/20 text-purple-300 border-purple-400/30"
        >
          人格
        </div>
        <h3 className="mb-1 text-2xl font-bold text-white">
          {persona.name}
        </h3>
        <p className="text-sm text-white/70 line-clamp-2">
          {persona.description}
        </p>
      </div>
      
      <div className="absolute inset-0 rounded-3xl border-2 border-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:border-purple-400 pointer-events-none" />
    </div>
  );
};
