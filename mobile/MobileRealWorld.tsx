
import React, { useState, useMemo } from 'react';
import { JournalEntry } from '../types';
import { Button } from '../components/Button';
import { geminiService } from '../services/gemini';

interface MobileRealWorldProps {
  entries: JournalEntry[];
  onAddEntry: (title: string, content: string, imageUrl?: string, insight?: string, tags?: string[]) => void;
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
  const [searchQuery, setSearchQuery] = useState('');
  
  // Editor State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);

  // Derived State
  const allUniqueTags = useMemo(() => {
      const allTags = new Set<string>();
      entries.forEach(e => e.tags?.forEach(t => allTags.add(t)));
      return Array.from(allTags).sort();
  }, [entries]);

  const startNew = () => {
      setSelectedEntry(null);
      setTitle('');
      setContent('');
      setTags([]);
      setInsight(null);
      setView('edit');
  };

  const openEntry = (entry: JournalEntry) => {
      setSelectedEntry(entry);
      setTitle(entry.title);
      setContent(entry.content);
      setTags(entry.tags || []);
      setInsight(entry.insight || null);
      setView('detail');
  };

  const startEdit = () => {
      setView('edit');
  };

  const handleSave = async () => {
      if (!title.trim() && !content.trim()) return;
      const finalTitle = title.trim() || new Date().toLocaleDateString();

      if (selectedEntry && view === 'edit' && selectedEntry.id) {
          // Update
          const updated = { ...selectedEntry, title: finalTitle, content, tags, insight: insight || undefined };
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
          onAddEntry(finalTitle, content, img, insight || undefined, tags);
          setView('list');
      }
  };

  const handleMirror = async () => {
    if (!content.trim()) return;
    const recent = entries.slice(0, 3).map(e => e.content);
    const res = await onConsultMirror(content, recent);
    if (res) setInsight(res);
  };

  const handleAddTag = (e?: React.KeyboardEvent) => {
      if (e) e.preventDefault(); // Stop unwanted newlines/submits
      if (tagInput.trim() && !tags.includes(tagInput.trim())) {
          setTags([...tags, tagInput.trim()]);
          setTagInput('');
      }
  };

  const handleTagClick = (tag: string) => {
      if (!tags.includes(tag)) {
          setTags([...tags, tag]);
      }
  };

  const handleRemoveTag = (t: string) => {
      setTags(tags.filter(tag => tag !== t));
  };

  const handleListTagClick = (tag: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSearchQuery(tag);
  };

  const filteredEntries = entries.filter(e => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q) || e.tags?.some(t => t.toLowerCase().includes(q));
  });

  // --- LIST VIEW ---
  if (view === 'list') {
      return (
          <div className="h-full bg-slate-950 p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-24 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
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

              {/* Search */}
              <div className="mb-4 relative">
                  <input 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="搜索日记 / #标签..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors"
                  />
                  {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-3 text-slate-500 hover:text-white"
                      >
                          &times;
                      </button>
                  )}
              </div>

              <div className="space-y-4">
                  {filteredEntries.length === 0 && <p className="text-center text-slate-600 mt-10">
                      {searchQuery ? '未找到相关日记' : '还没有日记，写一篇吧。'}
                  </p>}
                  {filteredEntries.sort((a,b) => b.timestamp - a.timestamp).map(entry => (
                      <div key={entry.id} onClick={() => openEntry(entry)} className="bg-slate-900 rounded-xl p-4 border border-slate-800 active:bg-slate-800 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                              <h3 className="text-white font-bold truncate flex-1">{entry.title}</h3>
                              <span className="text-[10px] text-slate-500">{new Date(entry.timestamp).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-400 text-sm line-clamp-2">{entry.content}</p>
                          {entry.tags && entry.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                  {entry.tags.map(t => (
                                      <span 
                                        key={t} 
                                        onClick={(e) => handleListTagClick(t, e)}
                                        className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 active:bg-slate-700 active:text-white transition-colors"
                                      >
                                          #{t}
                                      </span>
                                  ))}
                              </div>
                          )}
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
          <div className="h-full bg-slate-950 flex flex-col pb-24">
              <div className="p-4 pt-[calc(1rem+env(safe-area-inset-top))] flex items-center gap-4 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-10">
                  <button onClick={() => setView('list')} className="text-slate-400 text-lg">&larr;</button>
                  <h2 className="text-white font-bold truncate flex-1">{selectedEntry.title}</h2>
                  <button onClick={startEdit} className="text-indigo-400 text-sm">编辑</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                  {selectedEntry.imageUrl && (
                      <img src={selectedEntry.imageUrl} className="w-full rounded-xl mb-6 shadow-lg" alt="Mind Projection" />
                  )}
                  
                  {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                          {selectedEntry.tags.map(t => (
                              <span key={t} className="text-xs bg-indigo-900/30 text-indigo-300 px-2 py-1 rounded-full border border-indigo-500/30">#{t}</span>
                          ))}
                      </div>
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
           <div className="p-4 pt-[calc(1rem+env(safe-area-inset-top))] flex items-center justify-between border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-10">
                <button onClick={() => setView(selectedEntry ? 'detail' : 'list')} className="text-slate-400">取消</button>
                <h2 className="text-white font-bold">{selectedEntry ? '编辑' : '新建'}</h2>
                <button onClick={handleSave} disabled={isGenerating} className="text-pink-500 font-bold disabled:opacity-50">
                    {isGenerating ? '...' : '保存'}
                </button>
           </div>
           <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
               <input 
                 value={title} 
                 onChange={e => setTitle(e.target.value)} 
                 placeholder="标题..." 
                 className="bg-transparent text-xl font-bold text-white placeholder-slate-600 outline-none" 
               />
               
               {/* Tags Input */}
               <div>
                   <div className="flex flex-wrap gap-2 mb-2">
                       {tags.map(t => (
                           <span key={t} className="text-xs bg-indigo-900/30 text-indigo-300 px-2 py-1 rounded-full border border-indigo-500/30 flex items-center gap-1">
                               #{t}
                               <button onClick={() => handleRemoveTag(t)} className="text-indigo-400 font-bold">&times;</button>
                           </span>
                       ))}
                   </div>
                   <div className="flex gap-2">
                       <input 
                           value={tagInput}
                           onChange={e => setTagInput(e.target.value)}
                           onKeyDown={e => e.key === 'Enter' && handleAddTag(e)}
                           placeholder="添加标签..."
                           className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none flex-1"
                       />
                       <button onClick={() => handleAddTag()} disabled={!tagInput.trim()} className="text-xs bg-slate-800 px-3 py-1 rounded text-slate-300">+</button>
                   </div>
                   {/* Suggested Tags (Mobile) */}
                   {allUniqueTags.length > 0 && (
                       <div className="flex flex-wrap gap-2 mt-2">
                           {allUniqueTags.filter(t => !tags.includes(t)).slice(0, 5).map(t => (
                               <button 
                                 key={t} 
                                 onClick={() => handleTagClick(t)}
                                 className="text-[10px] text-slate-500 bg-slate-800/50 px-2 py-1 rounded border border-slate-700/50 hover:bg-slate-800 hover:text-indigo-300"
                               >
                                   #{t}
                               </button>
                           ))}
                       </div>
                   )}
               </div>

               <textarea 
                 value={content} 
                 onChange={e => setContent(e.target.value)} 
                 placeholder="写下你的想法..." 
                 className="flex-1 bg-transparent text-slate-300 placeholder-slate-600 outline-none resize-none leading-relaxed text-base min-h-[200px]" 
               />
               
               {insight && (
                   <div className="p-3 bg-cyan-900/20 rounded border border-cyan-900 text-cyan-200 text-xs">
                       {insight}
                   </div>
               )}

               <div className="flex justify-end pt-4">
                   <button onClick={handleMirror} className="text-xs flex items-center gap-1 text-cyan-400 border border-cyan-800 rounded-full px-3 py-2 bg-cyan-900/10">
                       <span>🔮</span> 本我镜像分析
                   </button>
               </div>
           </div>
      </div>
  );
};
