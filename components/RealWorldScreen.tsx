
import React, { useState, useRef } from 'react';
import { JournalEntry } from '../types';
import { Button } from './Button';
import { geminiService } from '../services/gemini';

interface RealWorldScreenProps {
  entries: JournalEntry[];
  onAddEntry: (title: string, content: string, imageUrl?: string, insight?: string) => void;
  onUpdateEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (id: string) => void;
  onExplore: (entry: JournalEntry) => void;
  onChatWithCharacter: (characterName: string) => void;
  onBack: () => void;
  onConsultMirror: (content: string, recentContext: string[]) => Promise<string | null>;
  autoGenerateImage: boolean;
}

export const RealWorldScreen: React.FC<RealWorldScreenProps> = ({ 
    entries, onAddEntry, onUpdateEntry, onDeleteEntry, onExplore, onChatWithCharacter, onBack, onConsultMirror, autoGenerateImage 
}) => {
  // State for View Mode
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | undefined>(undefined);
  const [mirrorInsight, setMirrorInsight] = useState<string | null>(null);
  const [isConsultingMirror, setIsConsultingMirror] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleCreateClick = () => {
    setSelectedEntry(null);
    setNewTitle('');
    setNewContent('');
    setUploadedImageUrl(undefined);
    setMirrorInsight(null);
    setIsEditing(false);
    setIsCreating(true);
  };

  const handleEditClick = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setNewTitle(entry.title);
    setNewContent(entry.content);
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
    if (!newTitle.trim() || !newContent.trim()) {
        alert("标题和内容不能为空");
        return;
    }
    
    let finalImageUrl = uploadedImageUrl;

    // Auto-generate image if enabled, no upload, and creating new or content changed significantly
    if (!finalImageUrl && autoGenerateImage) {
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
            title: newTitle,
            content: newContent,
            imageUrl: finalImageUrl,
            insight: mirrorInsight || undefined
        });
    } else {
        onAddEntry(newTitle, newContent, finalImageUrl, mirrorInsight || undefined);
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
      
      // Get recent context (last 3 entries) to provide continuity
      const recentContext = entries.slice(-3).map(e => e.content);
      
      try {
          const insight = await onConsultMirror(newContent, recentContext);
          if (insight) {
              setMirrorInsight(insight);
          }
      } catch (e) {
          alert("本我镜像连接失败，请稍后重试。");
      } finally {
          setIsConsultingMirror(false);
      }
  };

  // Sort entries by timestamp descending
  const sortedEntries = [...entries].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="h-full flex flex-col p-8 bg-slate-900 text-white relative">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8 shrink-0">
          <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div>
                  <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">现实记录</h1>
                  <p className="text-slate-400 text-sm">观测自我，凝视深渊。</p>
              </div>
          </div>
          <Button onClick={handleCreateClick} className="bg-gradient-to-r from-pink-600 to-purple-600 shadow-lg shadow-purple-900/20">
              + 记录当下
          </Button>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex gap-8 overflow-hidden">
          
          {/* Left: Entries Grid */}
          <div className={`flex-1 overflow-y-auto pr-2 custom-scrollbar transition-all duration-300 ${isCreating ? 'w-1/2 hidden md:block' : 'w-full'}`}>
              {sortedEntries.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl">
                      <div className="text-4xl mb-4">📓</div>
                      <p>暂无记录</p>
                      <p className="text-sm">记录下这一刻的想法，开启心域探索。</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                      {sortedEntries.map(entry => (
                          <div 
                            key={entry.id} 
                            onClick={() => handleEditClick(entry)}
                            className="group bg-slate-800 rounded-2xl border border-slate-700 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-900/10 transition-all cursor-pointer overflow-hidden flex flex-col"
                          >
                              {entry.imageUrl && (
                                  <div className="h-40 w-full overflow-hidden relative">
                                      <img src={entry.imageUrl} alt="Visual" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-60" />
                                  </div>
                              )}
                              <div className="p-5 flex-1 flex flex-col">
                                  <div className="flex justify-between items-start mb-2">
                                      <h3 className="font-bold text-lg text-slate-100 line-clamp-1">{entry.title}</h3>
                                      {entry.insight && <span className="text-[10px] bg-cyan-900/30 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800">已解析</span>}
                                  </div>
                                  <p className="text-slate-400 text-sm line-clamp-3 mb-4 flex-1 leading-relaxed">
                                      {entry.content}
                                  </p>
                                  
                                  <div className="flex items-center justify-between pt-4 border-t border-slate-700/50 mt-auto">
                                      <span className="text-xs text-slate-600">{new Date(entry.timestamp).toLocaleDateString()}</span>
                                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); onExplore(entry); }} 
                                            className="p-2 bg-indigo-600 rounded-full hover:bg-indigo-500 text-white shadow-lg"
                                            title="带着问题进入心域"
                                          >
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                          </button>
                                          <button 
                                            onClick={(e) => handleDeleteClick(entry.id, e)} 
                                            className="p-2 bg-slate-700 rounded-full hover:bg-red-900/50 hover:text-red-400 text-slate-400"
                                          >
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          {/* Right: Editor Panel (Slide in) */}
          {isCreating && (
              <div className="w-full md:w-[450px] bg-slate-800 rounded-3xl border border-slate-700 p-6 flex flex-col shadow-2xl animate-fade-in shrink-0">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-white">{isEditing ? '编辑日记' : '新日记'}</h2>
                      <button onClick={() => setIsCreating(false)} className="text-slate-500 hover:text-white">&times;</button>
                  </div>

                  <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                      <input 
                          value={newTitle} 
                          onChange={(e) => setNewTitle(e.target.value)} 
                          placeholder="标题 (例如: 深夜的思考)" 
                          className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 outline-none font-bold"
                      />
                      
                      <textarea 
                          value={newContent} 
                          onChange={(e) => setNewContent(e.target.value)} 
                          placeholder="在这里写下你的想法、困惑或梦境..." 
                          className="w-full flex-1 min-h-[200px] bg-slate-900/50 border border-slate-600 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:border-cyan-500 outline-none resize-none leading-relaxed"
                      />

                      {/* Mirror Insight Section */}
                      {mirrorInsight && (
                          <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-800/50 rounded-xl p-4 relative overflow-hidden group">
                              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
                              <div className="flex items-center gap-2 mb-2">
                                  <span className="text-lg">🔮</span>
                                  <h4 className="text-cyan-400 font-bold text-xs uppercase tracking-wider">Mirror of Truth</h4>
                              </div>
                              <p className="text-cyan-100 text-sm italic leading-relaxed">"{mirrorInsight}"</p>
                          </div>
                      )}

                      {/* Tools Bar */}
                      <div className="flex gap-2">
                          <button 
                            onClick={handleConsultMirrorClick}
                            disabled={isConsultingMirror || !newContent.trim()}
                            className="flex-1 bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-700 text-cyan-300 text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                              {isConsultingMirror ? (
                                  <span className="animate-pulse">Analyzing...</span>
                              ) : (
                                  <><span>🔮</span> 咨询本我镜像</>
                              )}
                          </button>
                          
                          <div className="relative flex-1">
                              <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                              >
                                  <span>🖼️</span> {uploadedImageUrl ? '更换图片' : '上传/生成配图'}
                              </button>
                              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                          </div>
                      </div>

                      {uploadedImageUrl && (
                          <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-600">
                              <img src={uploadedImageUrl} className="w-full h-full object-cover" alt="Preview" />
                              <button onClick={() => setUploadedImageUrl(undefined)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-red-500 transition-colors">&times;</button>
                          </div>
                      )}
                  </div>

                  <div className="pt-4 mt-2 border-t border-slate-700 flex justify-end gap-3">
                      {isEditing && (
                          <button 
                            onClick={(e) => { if(selectedEntry) handleDeleteClick(selectedEntry.id, e); }}
                            className="mr-auto text-red-400 text-sm hover:underline"
                          >
                              删除
                          </button>
                      )}
                      <Button variant="ghost" onClick={() => setIsCreating(false)}>取消</Button>
                      <Button onClick={handleSave} disabled={isGeneratingImage}>
                          {isGeneratingImage ? '生成配图中...' : '保存日记'}
                      </Button>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};
