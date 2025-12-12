import React, { useState, useRef, useEffect, useMemo } from 'react';
import { JournalEntry } from '../types';
import { Button } from './Button';
import { geminiService } from '../services/gemini';
import { ResonanceOrb, DigitalOracle } from './SoulWidgets';

interface RealWorldScreenProps {
  entries: JournalEntry[];
  onAddEntry: (title: string, content: string, imageUrl?: string, insight?: string, tags?: string[]) => void;
  onUpdateEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (id: string) => void;
  onExplore: (entry: JournalEntry) => void;
  onChatWithCharacter: (characterName: string) => void;
  onBack: () => void;
  onConsultMirror: (content: string, recentContext: string[]) => Promise<string | null>;
  onShare: (entry: JournalEntry) => void; 
  autoGenerateImage: boolean;
}

const TEMPLATES = [
    { label: '🌞 晨间意图', icon: '☀️', title: '晨间意图', content: '今天，我想要专注于...\n我期待...' },
    { label: '🌙 晚间回顾', icon: '🛌', title: '晚间回顾', content: '今天发生的最美好的事是...\n我学到了...' },
    { label: '💡 灵感闪念', icon: '⚡', title: '灵感碎片', content: '核心想法：\n可能的延伸：' },
    { label: '😶 情绪宣泄', icon: '🌧️', title: '情绪记录', content: '我现在感觉...\n因为...' },
];

export const RealWorldScreen: React.FC<RealWorldScreenProps> = ({ 
    entries, onAddEntry, onUpdateEntry, onDeleteEntry, onExplore, onChatWithCharacter, onBack, onConsultMirror, onShare, autoGenerateImage 
}) => {
  // State for View Mode
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  
  // Widget Toggle State
  const [showWidgets, setShowWidgets] = useState(true);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | undefined>(undefined);
  const [mirrorInsight, setMirrorInsight] = useState<string | null>(null);
  const [isConsultingMirror, setIsConsultingMirror] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  
  // Daily Prompt State
  const [dailyGreeting, setDailyGreeting] = useState<{greeting: string, prompt: string} | null>(null);
  const [isLoadingGreeting, setIsLoadingGreeting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived State: All unique tags from existing entries
  const allUniqueTags = useMemo(() => {
      const tags = new Set<string>();
      entries.forEach(e => e.tags?.forEach(t => tags.add(t)));
      return Array.from(tags).sort();
  }, [entries]);

  // Load Daily Prompt on Mount
  useEffect(() => {
      const loadGreeting = async () => {
          setIsLoadingGreeting(true);
          try {
              const promptData = await geminiService.generateDailyGreeting('旅人', entries);
              if (promptData) setDailyGreeting(promptData);
          } catch(e) {
              console.error(e);
          } finally {
              setIsLoadingGreeting(false);
          }
      };
      if (!dailyGreeting) loadGreeting();
  }, [entries.length]);

  // --- Handlers ---

  const handleCreateClick = (initialContent?: string, initialTitle?: string) => {
    setSelectedEntry(null);
    setNewTitle(initialTitle || '');
    setNewContent(initialContent || '');
    setNewTags([]);
    setUploadedImageUrl(undefined);
    setMirrorInsight(null);
    setIsEditing(false);
    setIsCreating(true);
  };

  const handleEditClick = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setNewTitle(entry.title);
    setNewContent(entry.content);
    setNewTags(entry.tags || []);
    setUploadedImageUrl(entry.imageUrl);
    setMirrorInsight(entry.insight || null);
    setIsEditing(true);
    setIsCreating(true);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm('确定要删除这篇日记吗？')) {
          onDeleteEntry(id);
          if (selectedEntry?.id === id) {
              setIsCreating(false);
              setSelectedEntry(null);
          }
      }
  };

  const handleSave = async () => {
    if (!newTitle.trim() && !newContent.trim()) {
        alert("标题或内容不能为空");
        return;
    }
    
    // Auto-fill title if empty
    const finalTitle = newTitle.trim() || new Date().toLocaleDateString();
    
    let finalImageUrl = uploadedImageUrl;

    // Auto-generate image
    if (!finalImageUrl && autoGenerateImage && newContent.length > 20) {
        setIsGeneratingImage(true);
        try {
            const generated = await geminiService.generateMoodImage(newContent);
            if (generated) finalImageUrl = generated;
        } catch (e) {
            console.error("Auto image generation failed", e);
        } finally {
            setIsGeneratingImage(false);
        }
    }

    if (isEditing && selectedEntry) {
        onUpdateEntry({
            ...selectedEntry,
            title: finalTitle,
            content: newContent,
            tags: newTags,
            imageUrl: finalImageUrl,
            insight: mirrorInsight || undefined
        });
    } else {
        onAddEntry(finalTitle, newContent, finalImageUrl, mirrorInsight || undefined, newTags);
    }
    setIsCreating(false);
    setIsEditing(false);
    setSelectedEntry(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setUploadedImageUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleConsultMirrorClick = async () => {
      if (!newContent.trim()) return;
      setIsConsultingMirror(true);
      const recentContext = entries.slice(-3).map(e => e.content);
      try {
          const insight = await onConsultMirror(newContent, recentContext);
          if (insight) setMirrorInsight(insight);
      } catch (e) {
          alert("本我镜像连接失败，请稍后重试。");
      } finally {
          setIsConsultingMirror(false);
      }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          e.preventDefault(); // Stop form submission or line break
          if (tagInput.trim()) {
              if (!newTags.includes(tagInput.trim())) {
                  setNewTags([...newTags, tagInput.trim()]);
              }
              setTagInput('');
          }
      }
  };

  const handleTagClick = (tag: string) => {
      if (!newTags.includes(tag)) {
          setNewTags([...newTags, tag]);
      }
  };

  const handleRemoveTag = (tagToRemove: string) => {
      setNewTags(newTags.filter(t => t !== tagToRemove));
  };

  const handleSearchTagClick = (tag: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSearchQuery(tag);
  };

  // --- Filtering ---
  const sortedEntries = entries
    .filter(e => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return e.title.toLowerCase().includes(q) || 
               e.content.toLowerCase().includes(q) || 
               e.tags?.some(t => t.toLowerCase().includes(q));
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="h-full flex flex-col p-8 bg-slate-950 text-white relative">
      
      {/* Header Area */}
      <div className="flex justify-between items-center mb-6 shrink-0">
          <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div>
                  <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">记忆中枢</h1>
                  <p className="text-slate-500 text-xs font-mono tracking-widest">REALITY DATABASE</p>
              </div>
          </div>
          
          <div className="flex gap-3">
              {/* Search Bar */}
              <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 group-focus-within:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <input 
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="检索记忆 / #标签"
                      className="bg-slate-900/50 border border-slate-800 rounded-full py-2 pl-9 pr-4 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none w-48 focus:w-64 transition-all"
                  />
                  {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-white">
                          &times;
                      </button>
                  )}
              </div>
              <Button onClick={() => handleCreateClick()} className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-purple-900/20 text-sm py-2">
                  + 新记录
              </Button>
          </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
          
          {/* Left: Entries Grid */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                  {/* Daily Resonance Card (Only show if no search) */}
                  {!searchQuery && (
                      <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/30 border border-indigo-500/20 relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
                          <div className="relative z-10 flex justify-between items-start">
                              <div>
                                  <div className="flex items-center gap-2 mb-2 text-indigo-400 text-[10px] font-bold uppercase tracking-widest">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                                      Daily Resonance
                                  </div>
                                  {isLoadingGreeting ? (
                                      <div className="h-4 bg-white/10 rounded w-48 animate-pulse"></div>
                                  ) : (
                                      <>
                                          <h2 className="text-lg font-bold text-white/90 mb-1">{dailyGreeting?.greeting || "你好，旅人。"}</h2>
                                          <p className="text-indigo-200/70 text-sm italic">"{dailyGreeting?.prompt || "今天的风带给你什么感觉？"}"</p>
                                      </>
                                  )}
                              </div>
                              <button 
                                onClick={() => handleCreateClick(dailyGreeting?.prompt)}
                                className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white p-2 rounded-lg transition-all"
                                title="回应"
                              >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                          </div>
                      </div>
                  )}

                  {sortedEntries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl p-10 h-64">
                          <div className="text-4xl mb-4 opacity-50">📓</div>
                          <p>{searchQuery ? '未找到相关记忆' : '暂无记录'}</p>
                      </div>
                  ) : (
                      <div className={`grid gap-4 pb-20 ${showWidgets && !isCreating ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                          {sortedEntries.map(entry => (
                              <div 
                                key={entry.id} 
                                onClick={() => handleEditClick(entry)}
                                className={`group bg-slate-900 border border-slate-800 hover:border-cyan-500/30 rounded-xl overflow-hidden cursor-pointer flex flex-col transition-all hover:bg-slate-800/80 ${selectedEntry?.id === entry.id ? 'ring-2 ring-cyan-500/50 bg-slate-800' : ''}`}
                              >
                                  {entry.imageUrl && (
                                      <div className="h-32 w-full overflow-hidden relative border-b border-slate-800">
                                          <img src={entry.imageUrl} alt="Visual" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                  )}
                                  <div className="p-4 flex-1 flex flex-col">
                                      <div className="flex justify-between items-start mb-2">
                                          <h3 className="font-bold text-slate-200 line-clamp-1 group-hover:text-cyan-400 transition-colors text-sm">{entry.title}</h3>
                                          {entry.insight && <span className="text-[8px] bg-cyan-900/30 text-cyan-400 px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">INSIGHT</span>}
                                      </div>
                                      <p className="text-slate-500 text-xs line-clamp-3 mb-3 flex-1 leading-relaxed">
                                          {entry.content}
                                      </p>
                                      
                                      {/* Tags Row */}
                                      {entry.tags && entry.tags.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mb-3">
                                              {entry.tags.slice(0, 3).map(t => (
                                                  <span 
                                                    key={t} 
                                                    onClick={(e) => handleSearchTagClick(t, e)}
                                                    className="text-[9px] bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white px-1.5 py-0.5 rounded border border-slate-700 transition-colors"
                                                  >
                                                      #{t}
                                                  </span>
                                              ))}
                                              {entry.tags.length > 3 && <span className="text-[9px] text-slate-600">+{entry.tags.length - 3}</span>}
                                          </div>
                                      )}

                                      <div className="flex items-center justify-between pt-3 border-t border-slate-800 mt-auto">
                                          <span className="text-[10px] text-slate-600 font-mono">{new Date(entry.timestamp).toLocaleDateString()}</span>
                                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button onClick={(e) => { e.stopPropagation(); onShare(entry); }} className="p-1.5 text-pink-400 hover:bg-pink-900/30 rounded"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg></button>
                                              <button onClick={(e) => { e.stopPropagation(); onExplore(entry); }} className="p-1.5 text-indigo-400 hover:bg-indigo-900/30 rounded"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                                              <button onClick={(e) => handleDeleteClick(entry.id, e)} className="p-1.5 text-red-400 hover:bg-red-900/30 rounded"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>

          {/* Right: Collapsible Widgets Sidebar OR Editor Panel */}
          
          {/* Sidebar Area */}
          {!isCreating && (
              <div 
                  className={`hidden md:flex flex-col gap-4 transition-all duration-500 ease-in-out border-l border-slate-800/50 bg-slate-900/30 backdrop-blur-sm relative shrink-0 ${showWidgets ? 'w-[320px] p-4 opacity-100' : 'w-[40px] p-0 opacity-100 cursor-pointer hover:bg-slate-800/50'}`}
                  onClick={() => !showWidgets && setShowWidgets(true)}
              >
                  {/* Collapsible Toggle Handle */}
                  <button 
                      onClick={(e) => { e.stopPropagation(); setShowWidgets(!showWidgets); }}
                      className={`absolute top-4 -left-3 w-6 h-6 bg-slate-800 border border-slate-600 rounded-full flex items-center justify-center text-slate-400 hover:text-white z-20 shadow-lg transition-transform ${showWidgets ? '' : 'rotate-180'}`}
                      title={showWidgets ? "收起小工具" : "展开小工具"}
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 