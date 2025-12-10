
import React from 'react';
import { WorldScene } from '../types';

interface SceneCardProps {
  scene: WorldScene;
  onSelect: () => void;
}

export const SceneCard: React.FC<SceneCardProps> = ({ scene, onSelect }) => {
  return (
    <div 
      onClick={onSelect}
      className="group relative h-96 w-full cursor-pointer overflow-hidden rounded-3xl border border-white/10 shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:border-purple-400/50"
    >
      <div className="absolute inset-0 bg-gray-900">
        <img 
          src={scene.imageUrl} 
          alt={scene.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-90 transition-opacity group-hover:opacity-75" />
      </div>

      <div className="absolute bottom-0 left-0 w-full p-6 text-center">
        <h3 className="mb-2 text-3xl font-black text-white" style={{ textShadow: '0 2px 15px rgba(0,0,0,0.5)' }}>
          {scene.name}
        </h3>
        <p className="text-sm text-white/80 line-clamp-2">
          {scene.description}
        </p>
      </div>
      
      <div className="absolute inset-0 rounded-3xl border-2 border-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:border-purple-400 pointer-events-none" />
    </div>
  );
};