
import React, { useState } from 'react';
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
  onConsultMirror: (content: string, recentContext: string[]) => Promise<string | null>; // Updated prop
  autoGenerateImage: boolean;
}

export const RealWorldScreen: React.FC<RealWorldScreenProps> = ({ entries, onAddEntry, onUpdateEntry, onDeleteEntry, onExplore, onChatWithCharacter, onBack, onConsultMirror, autoGenerateImage }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  // Mirror of Truth State
  const [mirrorInsight, setMirrorInsight] = useState<string | null>(null);
  const [isConsultingMirror, setIsConsultingMirror] = useState(false);

  const handleCreateClick = () => {
    setSelectedEntry(null);
    setNewTitle('');
    setNewContent('');
    setMirrorInsight(null);
    setIsEditing(false);
    setIsCreating(true);
  };

  const handleEditClick = () => {
    if (!selectedEntry) return;
    setNewTitle(selectedEntry.title);
    setNewContent(selectedEntry.content);
    setMirrorInsight(selectedEntry.insight || null);
    setIsEditing(true);
    setIsCreating(true);
  };

  const handleDeleteClick = () => {
    if (!selectedEntry) return;
    if (window.confirm("确定要删除这篇日记吗？此操作无法撤销。")) {
        onDeleteEntry(selectedEntry.id);
        setSelectedEntry(null);
        setIsCreating(false);
    }
  };

  const handleConsultMirrorClick = async () => {
    if (!newContent.trim() || isConsultingMirror) return;
    setIsConsultingMirror(true);
    try {
        // Gather recent entry contents for context (limit to last 5)
        const recentEntries = entries
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 5)
            .map(e => `[${new Date(e.timestamp).toLocaleDateString()}] ${e.content}`);
        
        const insight = await onConsultMirror(newContent, recentEntries);
        if (insight) {
            setMirrorInsight(insight);
        }
    } catch (e) {
        console.error("Mirror consultation failed", e);
    } finally {
        setIsConsultingMirror(false);
    }
  };

  const handleSaveEntry = async () => {
    if (newTitle.trim() && newContent.trim()) {
      if (isEditing && selectedEntry) {
          // Update existing
          const updatedEntry: JournalEntry = {
              ...selectedEntry,
              title: newTitle.trim(),
              content: newContent.trim(),
              insight: mirrorInsight || undefined, // Save the mirror insight
              // We preserve the existing image and echo when editing text
          };
          onUpdateEntry(updatedEntry);
          // Exit edit mode, return to viewer with updated data
          setSelectedEntry(updatedEntry);
          setIsCreating(false);
          setIsEditing(false);
      } else {
          // Create new
          let generatedImageUrl = undefined;
          
          if (autoGenerateImage) {
              setIsGeneratingImage(true);
              try {
                // Mind Projection: Generate Image
                const img = await geminiService.generateMoodImage(newContent);
                if (img) generatedImageUrl = img;
              } catch (e) {
                console.error("Failed to generate mind projection", e);
              }
              setIsGeneratingImage(false);
          }

          onAddEntry(newTitle.trim(), newContent.trim(), generatedImageUrl, mirrorInsight || undefined);
          setNewTitle('');
          setNewContent('');
          setMirrorInsight(null);
          setIsCreating(false);
      }
    }
  };

  const renderEntryCreator = () => (
    <div className="w-full lg:w-2/3 xl:w-1/2 p-6 md:p-8 bg-slate-900 rounded-2xl border border-slate-700 space-y-6 animate-fade-in relative overflow-hidden flex flex-col h-full md:h-auto">
      {isGeneratingImage && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white">
             <div className="w-16 h-16 border-4 border-t-transparent border-pink-500 rounded-full animate-spin mb-4" />
             <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 animate-pulse">心像投影中...</h3>
             <p className="text-slate-400 text-sm mt-2">AI 正在将你的情绪转化为画作</p>
        </div>
      )}
      
      <div className="flex justify-between items-center">
         <h2 className="text-xl font-bold text-white">{isEditing ? '编辑日记' : '写下此刻'}</h2>
         {!isEditing && (
             <span className={`text-xs px-2 py-1 rounded border ${autoGenerateImage ? 'text-pink-400 border-pink-500/30 bg-pink-500/10' : 'text-gray-500 border-gray-600 bg-gray-800'}`}>
                 {autoGenerateImage ? 'Mind Projection 开启' : '配图生成已关闭'}
             </span>
         )}
      </div>

      <input
        type="text"
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        placeholder="日记标题"
        className="w-full text-2xl font-bold bg-transparent border-b-2 border-slate-700 py-2 text-white placeholder-slate-500 focus:border-pink-500 focus:ring-0 outline-none transition-colors"
        disabled={isGeneratingImage}
      />
      
      <div className="relative flex-grow">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="记下任何你想探索的事..."
            className="w-full h-full min-h-[200px] bg-slate-800/50 border-2 border-slate-700 rounded-lg py-3 px-4 text-white placeholder-slate-500 focus:border-pink-500 focus:ring-0 outline-none transition-colors resize-none text-base leading-relaxed scrollbar-hide"
            disabled={isGeneratingImage}
          />
          {/* Mirror Button (Floating or Integrated) */}
          <button 
            onClick={handleConsultMirrorClick}
            disabled={isConsultingMirror || !newContent.trim()}
            className="absolute bottom-4 right-4 bg-cyan-900/80 backdrop-blur-md border border-cyan-500/50 text-cyan-200 px-3 py-1.5 rounded-full text-sm font-bold shadow-lg hover:bg-cyan-800 hover:text-white transition-all flex items-center gap-2"
            title="唤醒本我镜像：分析潜意识模式"
          >
            {isConsultingMirror ? (
                <div className="w-4 h-4 border-2 border-t-transparent border-cyan-200 rounded-full animate-spin" />
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
            )}
            本我镜像
          </button>
      </div>

      {/* Mirror Insight Display (Preview) */}
      {mirrorInsight && (
         <div className="p-4 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 border-l-4 border-cyan-500 shadow-lg animate-fade-in">
             <div className="flex items-center gap-2 mb-2">
                 <span className="text-cyan-400 font-bold text-xs uppercase tracking-widest">Mirror of Truth</span>
             </div>
             <p className="text-cyan-100/90 text-sm italic">"{mirrorInsight}"</p>
         </div>
      )}

      <div className="flex justify-end gap-4 mt-auto">
        <Button variant="ghost" onClick={() => { setIsCreating(false); setIsEditing(false); }} disabled={isGeneratingImage}>取消</Button>
        <Button onClick={handleSaveEntry} disabled={!newTitle.trim() || !newContent.trim() || isGeneratingImage} className="bg-gradient-to-r from-pink-500 to-purple-600">
            {isEditing ? '保存修改' : (autoGenerateImage ? '保存并生成投影' : '仅保存文字')}
        </Button>
      </div>
    </div>
  );

  const renderEntryViewer = () => {
    if (!selectedEntry) return null;
    return (
      <div className="w-full lg:w-2/3 xl:w-1/2 flex flex-col gap-6 animate-fade-in h-full overflow-y-auto scrollbar-hide">
        {/* Mind Projection Image */}
        {selectedEntry.imageUrl && (
            <div className="w-full h-48 md:h-64 rounded-2xl overflow-hidden shadow-2xl relative group shrink-0">
                <img src={selectedEntry.imageUrl} alt="Mind Projection" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-6">
                    <span className="text-xs font-bold text-pink-300 uppercase tracking-widest border border-pink-500/50 px-2 py-1 rounded-full bg-black/50 backdrop-blur-md">心像投影 Mind Projection</span>
                </div>
            </div>
        )}

        <div className="p-6 md:p-8 bg-slate-900 rounded-2xl border border-slate-700 space-y-6 shrink-0 shadow-xl">
            <div className="border-b border-slate-700 pb-4">
                <h2 className="text-3xl font-bold text-white leading-tight">{selectedEntry.title}</h2>
                <div className="flex items-center gap-2 mt-2 text-slate-400 text-sm">
                   <span>{new Date(selectedEntry.timestamp).toLocaleDateString()}</span>
                   <span>•</span>
                   <span>{new Date(selectedEntry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
            </div>
            
            {/* Content Body */}
            <p className="text-slate-300 whitespace-pre-wrap text-base leading-relaxed">{selectedEntry.content}</p>
            
            {/* Mirror of Truth Section - Rendered if insight exists */}
            {selectedEntry.insight && (
                <div className="mt-6 p-5 rounded-xl bg-cyan-900/20 border border-cyan-500/30 backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-cyan-400">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        </svg>
                    </div>
                    <h3 className="text-cyan-400 font-bold uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"/> 本我镜像 Mirror of Truth
                    </h3>
                    <p className="text-cyan-100 font-medium italic relative z-10">
                        "{selectedEntry.insight}"
                    </p>
                    <p className="text-[10px] text-cyan-500/60 mt-2 text-right">来自潜意识的客观映射</p>
                </div>
            )}
            
            {/* Echoes of Wisdom Section */}
            {selectedEntry.echo && (
                <div 
                  onClick={() => onChatWithCharacter(selectedEntry.echo!.characterName)}
                  className="mt-8 p-6 rounded-xl bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 relative overflow-hidden group cursor-pointer hover:border-indigo-400 transition-all hover:shadow-lg hover:shadow-indigo-500/20"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="w-24 h-24 text-white" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 13.1216 16 12.017 16H9L9.91688 19.0146C8.11899 18.2618 6.55138 17.1517 5.31802 15.772C3.12022 13.3142 2.37893 9.77128 3.52845 6.64333C4.67798 3.51538 7.50202 1.5 10.8333 1.5C14.1646 1.5 16.9887 3.51538 18.1382 6.64333C19.2877 9.77128 18.5464 13.3142 16.3486 15.772C16.126 16.0211 15.8913 16.2587 15.6455 16.4842C15.2891 16.8115 15.2536 17.368 15.5684 17.7388C15.8832 18.1096 16.4329 18.1568 16.8048 17.8427C17.1472 17.5535 17.4704 17.2384 17.7718 16.8988C20.4431 13.9103 21.3444 9.60333 19.9472 5.80126C18.55 1.99918 15.1171 -0.449997 11.0667 -0.449997C7.01622 -0.449997 3.58334 1.99918 2.18612 5.80126C0.788907 9.60333 1.69018 13.9103 4.36146 16.8988C5.77119 18.4752 7.54687 19.7237 9.57524 20.5317C9.92989 20.6732 10.1667 21.0177 10.1667 21.3995V24.5C10.1667 24.7761 10.3905 25 10.6667 25H13.517C13.7931 25 14.017 24.7761 14.017 24.5V21ZM12.017 23H11.6667V21.6718L11.1963 21.4883C11.5313 21.3986 11.8385 21.2829 12.1152 21.1441L12.517 22.3486V23H12.017Z" /></svg>
                    </div>
                    <h3 className="text-indigo-300 font-bold uppercase tracking-wider text-sm mb-2 flex items-center gap-2">
                        <span>✦</span> 心之回响 Echoes of Wisdom
                    </h3>
                    <p className="text-xl font-serif text-white italic leading-relaxed mb-4">
                        “{selectedEntry.echo.text}”
                    </p>
                    <div className="flex justify-between items-end">
                      <button className="text-xs bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white px-3 py-1.5 rounded-full border border-indigo-500/30 transition-all flex items-center gap-1 group-hover:scale-105">
                        与 {selectedEntry.echo.characterName} 继续对话 &rarr;
                      </button>
                      <div className="text-right">
                          <span className="block text-sm font-bold text-indigo-400">— {selectedEntry.echo.characterName}</span>
                          <span className="text-xs text-indigo-500/60">{new Date(selectedEntry.echo.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                </div>
            )}

            {/* Action Bar Footer */}
            <div className="mt-8 pt-6 border-t border-slate-700/50 space-y-4">
                <Button onClick={() => onExplore(selectedEntry)} className="w-full bg-gradient-to-r from-indigo-500 to-pink-500 hover:shadow-lg hover:shadow-pink-500/20 transition-all transform hover:-translate-y-0.5 py-4 text-lg font-bold">
                    🚀 带着这个问题进入心域 (Explore)
                </Button>
                
                <div className="flex justify-between items-center pt-2">
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={handleEditClick} className="border-slate-600 hover:bg-slate-700 text-sm">
                            ✏️ 编辑
                        </Button>
                        <Button variant="ghost" onClick={handleDeleteClick} className="text-red-400 hover:bg-red-900/20 hover:text-red-300 text-sm border border-transparent hover:border-red-900/30">
                            🗑️ 删除
                        </Button>
                    </div>
                    <Button variant="ghost" onClick={() => setSelectedEntry(null)} className="text-slate-500 hover:text-slate-300 text-sm">
                        关闭
                    </Button>
                </div>
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-full bg-black flex flex-col p-4 md:p-8">
      <header className="flex justify-between items-center mb-8 px-4">
        <div>
          <h1 className="text-4xl font-bold text-white">现实世界</h1>
          <p className="text-slate-400">你的私人日记本</p>
        </div>
        <Button variant="secondary" onClick={onBack}>返回 Nexus</Button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Entry List */}
        <div className="w-1/3 max-w-sm p-4 border-r border-slate-800 overflow-y-auto scrollbar-hide">
          <Button fullWidth onClick={handleCreateClick} className="mb-6">+ 新建日记</Button>
          <div className="space-y-3">
            {entries.length === 0 && !isCreating && (
              <p className="text-center text-slate-500 p-4">还没有日记。点击上方按钮创建第一篇吧。</p>
            )}
            {entries.sort((a,b) => b.timestamp - a.timestamp).map(entry => (
              <div
                key={entry.id}
                onClick={() => { setSelectedEntry(entry); setIsCreating(false); setIsEditing(false); }}
                className={`p-4 rounded-lg cursor-pointer border transition-all duration-300 relative overflow-hidden group hover:scale-[1.02] ${
                    selectedEntry?.id === entry.id 
                    ? 'bg-slate-800 border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.1)]' 
                    : 'bg-slate-900 border-transparent hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                {entry.imageUrl && (
                    <div className="absolute inset-0 opacity-20">
                        <img src={entry.imageUrl} className="w-full h-full object-cover" alt="bg" />
                    </div>
                )}
                <div className="relative z-10">
                    <h3 className={`font-bold truncate transition-colors ${selectedEntry?.id === entry.id ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{entry.title}</h3>
                    <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-slate-400">{new Date(entry.timestamp).toLocaleDateString()}</p>
                        <div className="flex gap-1">
                             {entry.insight && <span className="w-2 h-2 rounded-full bg-cyan-400" title="包含本我镜像" />}
                             {entry.echo && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">已回响</span>}
                        </div>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Viewer/Creator */}
        <div className="flex-1 flex items-center justify-center p-4">
          {isCreating && renderEntryCreator()}
          {selectedEntry && !isCreating && renderEntryViewer()}
          {!selectedEntry && !isCreating && (
             <div className="text-center text-slate-600">
                <p>选择一篇日记查看</p>
                <p>或</p>
                <p>新建一篇日记</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
