
import React, { useState, useRef } from 'react';
import { WorldScene, EraMemory } from '../types';
import { Button } from './Button';

interface EraMemoryModalProps {
  scene: WorldScene;
  memories: EraMemory[];
  onAddMemory: (content: string, imageUrl?: string) => void;
  onDeleteMemory: (memoryId: string) => void;
  onClose: () => void;
}

export const EraMemoryModal: React.FC<EraMemoryModalProps> = ({ scene, memories, onAddMemory, onDeleteMemory, onClose }) => {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!content.trim() && !imageUrl) return;
    onAddMemory(content, imageUrl || undefined);
    setContent('');
    setImageUrl(null);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col md:flex-row overflow-hidden shadow-2xl">
        
        {/* Left Side: Memory Creator */}
        <div className="w-full md:w-1/3 bg-slate-950/50 p-6 flex flex-col border-r border-slate-800">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-1">时代记忆</h3>
            <p className="text-sm text-slate-400">在 <span className="text-pink-400 font-bold">{scene.name}</span> 留下的印记</p>
          </div>

          <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="写下关于这个时代的回忆、故事，或者对它的印象..."
              className="w-full h-32 bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:border-pink-500 outline-none resize-none text-sm"
            />
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-all overflow-hidden ${imageUrl ? 'border-pink-500' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'}`}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 6v12a2.25 2.25 0 002.25 2.25zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <span className="text-xs">上传老照片 / 纪念物</span>
                </div>
              )}
            </div>
            
            <Button onClick={handleSubmit} disabled={!content.trim() && !imageUrl} className="bg-pink-600 hover:bg-pink-500 mt-2">
              封存记忆
            </Button>
          </div>
          
          <button onClick={onClose} className="mt-6 text-slate-500 hover:text-white text-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            返回时代
          </button>
        </div>

        {/* Right Side: Memory Gallery */}
        <div className="flex-1 bg-black/20 p-6 overflow-y-auto">
          {memories.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-24 h-24 mb-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>这里还没有回忆。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...memories].sort((a,b) => b.timestamp - a.timestamp).map(memory => (
                <div key={memory.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden group hover:border-pink-500/30 transition-all">
                  {memory.imageUrl && (
                    <div className="h-48 w-full overflow-hidden relative">
                      <img src={memory.imageUrl} alt="Memory" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60" />
                    </div>
                  )}
                  <div className="p-4 relative">
                    <button 
                      onClick={() => onDeleteMemory(memory.id)}
                      className="absolute top-2 right-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="删除"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <p className="text-slate-200 text-sm whitespace-pre-wrap font-serif leading-relaxed">
                      {memory.content}
                    </p>
                    <p className="text-xs text-slate-500 mt-3 border-t border-white/5 pt-2">
                      {new Date(memory.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
