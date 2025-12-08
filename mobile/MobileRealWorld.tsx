
import React, { useState } from 'react';
import { JournalEntry } from '../types';
import { Button } from '../components/Button';
import { geminiService } from '../services/gemini';

interface MobileRealWorldProps {
  entries: JournalEntry[];
  onAddEntry: (title: string, content: string, imageUrl?: string, insight?: string) => void;
  onUpdateEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (id: string) => void;
  onExplore: (entry: JournalEntry) => void;
  onConsultMirror: (content: string, recentContext: string[]) => Promise<string | null>;
  autoGenerateImage: boolean;
  onSwitchToPC: () => void;
}

export const MobileRealWorld: React.FC<MobileRealWorldProps> = ({ 
    entries, onAddEntry, onUpdateEntry, onDeleteEntry, onExplore, onConsultMirror, autoGenerateImage, onSwitchToPC 
}) => {
  const [view, setView] = useState<'list' | 'detail' | 'edit'>('list');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  
  // Editor State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);

  const startNew = () => {
      setSelectedEntry(null);
      setTitle('');
      setContent('');
      setInsight(null);
      setView('edit');
  };

  const openEntry = (entry: JournalEntry) => {
      setSelectedEntry(entry);
      setTitle(entry.title);
      setContent(entry.content);
      setInsight(entry.insight || null);
      setView('detail');
  };

  const startEdit = () => {
      setView('edit');
  };

  const handleSave = async () => {
      if (!title.trim() || !content.trim()) return;

      if (selectedEntry && view === 'edit' && selectedEntry.id) {
          // Update
          const updated = { ...selectedEntry, title, content, insight: insight || undefined };
          onUpdateEntry(updated);
          setSelectedEntry(updated);
          setView('detail');
      } else {
          // Create
          let img = undefined;
          if (autoGenerateImage) {
              setIsGenerating(true);
              try {
                  img = await geminiService.generateMoodImage(content);
              } catch(e) {}
              setIsGenerating(false);
          }
          onAddEntry(title, content, img, insight || undefined);
          setView('list');
      }
  };

  const handleMirror = async () => {
    if (!content.trim()) return;
    const recent = entries.slice(0, 3).map(e => e.content);
    const res = await onConsultMirror(content, recent);
    if (res) setInsight(res);
  };

  // --- LIST VIEW ---
  if (view === 'list') {
      return (
          <div className="h-full bg-slate-950 p-4 pb-20 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                  <div>
                      <div className="flex items-center gap-3">
                          <h1 className="text-3xl font-bold text-white">日记</h1>
                          <button 
                            onClick={onSwitchToPC}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1 rounded-full text-xs border border-slate-700 transition-colors flex items-center gap-1"
                          >
                             <span>💻</span> PC端
                          </button>
                      </div>
                      <p className="text-slate-400 text-xs mt-1">记录你的现实瞬间</p>
                  </div>
                  <button onClick={startNew} className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 text-white flex items-center justify-center shadow-lg font-bold text-2xl active:scale-95 transition-transform">+</button>
              </div>

              <div className="space-y-4">
                  {entries.length === 0 && <p className="text-center text-slate-600 mt-10">还没有日记，写一篇吧。</p>}
                  {entries.sort((a,b) => b.timestamp - a.timestamp).map(entry => (
                      <div key={entry.id} onClick={() => openEntry(entry)} className="bg-slate-900 rounded-xl p-4 border border-slate-800 active:bg-slate-800">
                          <div className="flex justify-between items-start mb-2">
                              <h3 className="text-white font-bold truncate flex-1">{entry.title}</h3>
                              <span className="text-[10px] text-slate-500">{new Date(entry.timestamp).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-400 text-sm line-clamp-2">{entry.content}</p>
                          {entry.imageUrl && <div className="mt-3 h-24 w-full rounded-lg bg-cover bg-center opacity-80" style={{backgroundImage: `url(${entry.imageUrl})`}} />}
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  // --- DETAIL VIEW ---
  if (view === 'detail' && selectedEntry) {
      return (
          <div className="h-full bg-slate-950 flex flex-col pb-20">
              <div className="p-4 flex items-center gap-4 border-b border-slate-800">
                  <button onClick={() => setView('list')} className="text-slate-400">&larr;</button>
                  <h2 className="text-white font-bold truncate flex-1">{selectedEntry.title}</h2>
                  <button onClick={startEdit} className="text-indigo-400 text-sm">编辑</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                  {selectedEntry.imageUrl && (
                      <img src={selectedEntry.imageUrl} className="w-full rounded-xl mb-6 shadow-lg" alt="Mind Projection" />
                  )}
                  <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{selectedEntry.content}</p>
                  
                  {selectedEntry.insight && (
                      <div className="mt-6 p-4 bg-cyan-900/20 border-l-2 border-cyan-500 rounded-r-lg">
                          <p className="text-xs text-cyan-400 font-bold uppercase mb-1">Mirror of Truth</p>
                          <p className="text-cyan-100 text-sm italic">"{selectedEntry.insight}"</p>
                      </div>
                  )}

                  <div className="mt-8 pt-8 border-t border-slate-800">
                      <Button fullWidth onClick={() => onExplore(selectedEntry)} className="bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
                          带着问题进入心域
                      </Button>
                      <button onClick={() => { onDeleteEntry(selectedEntry.id); setView('list'); }} className="w-full text-center text-red-400 text-sm py-2">删除日记</button>
                  </div>
              </div>
          </div>
      );
  }

  // --- EDIT VIEW ---
  return (
      <div className="h-full bg-slate-950 flex flex-col pb-20">
           <div className="p-4 flex items-center justify-between border-b border-slate-800">
                <button onClick={() => setView(selectedEntry ? 'detail' : 'list')} className="text-slate-400">取消</button>
                <h2 className="text-white font-bold">{selectedEntry ? '编辑' : '新建'}</h2>
                <button onClick={handleSave} disabled={isGenerating} className="text-pink-500 font-bold disabled:opacity-50">
                    {isGenerating ? '...' : '保存'}
                </button>
           </div>
           <div className="flex-1 p-4 flex flex-col gap-4">
               <input 
                 value={title} 
                 onChange={e => setTitle(e.target.value)} 
                 placeholder="标题..." 
                 className="bg-transparent text-xl font-bold text-white placeholder-slate-600 outline-none" 
               />
               <textarea 
                 value={content} 
                 onChange={e => setContent(e.target.value)} 
                 placeholder="写下你的想法..." 
                 className="flex-1 bg-transparent text-slate-300 placeholder-slate-600 outline-none resize-none leading-relaxed" 
               />
               
               {insight && (
                   <div className="p-3 bg-cyan-900/20 rounded border border-cyan-900 text-cyan-200 text-xs">
                       {insight}
                   </div>
               )}

               <div className="flex justify-end">
                   <button onClick={handleMirror} className="text-xs flex items-center gap-1 text-cyan-400 border border-cyan-800 rounded-full px-3 py-1 bg-cyan-900/10">
                       <span>🔮</span> 本我镜像分析
                   </button>
               </div>
           </div>
      </div>
  );
};
