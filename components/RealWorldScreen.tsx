import React, { useState } from 'react';
import { JournalEntry } from '../types';
import { Button } from './Button';

interface RealWorldScreenProps {
  entries: JournalEntry[];
  onAddEntry: (title: string, content: string) => void;
  onExplore: (content: string) => void;
  onBack: () => void;
}

export const RealWorldScreen: React.FC<RealWorldScreenProps> = ({ entries, onAddEntry, onExplore, onBack }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  const handleSaveEntry = () => {
    if (newTitle.trim() && newContent.trim()) {
      onAddEntry(newTitle.trim(), newContent.trim());
      setNewTitle('');
      setNewContent('');
      setIsCreating(false);
    }
  };

  const renderEntryCreator = () => (
    <div className="w-full lg:w-2/3 xl:w-1/2 p-6 md:p-8 bg-slate-900 rounded-2xl border border-slate-700 space-y-6 animate-fade-in">
      <input
        type="text"
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        placeholder="日记标题"
        className="w-full text-2xl font-bold bg-transparent border-b-2 border-slate-700 py-2 text-white placeholder-slate-500 focus:border-pink-500 focus:ring-0 outline-none transition-colors"
      />
      <textarea
        value={newContent}
        onChange={(e) => setNewContent(e.target.value)}
        placeholder="记下任何你想探索的事..."
        className="w-full h-64 bg-slate-800/50 border-2 border-slate-700 rounded-lg py-3 px-4 text-white placeholder-slate-500 focus:border-pink-500 focus:ring-0 outline-none transition-colors resize-none text-base leading-relaxed scrollbar-hide"
      />
      <div className="flex justify-end gap-4">
        <Button variant="ghost" onClick={() => setIsCreating(false)}>取消</Button>
        <Button onClick={handleSaveEntry} disabled={!newTitle.trim() || !newContent.trim()}>保存日记</Button>
      </div>
    </div>
  );

  const renderEntryViewer = () => {
    if (!selectedEntry) return null;
    return (
      <div className="w-full lg:w-2/3 xl:w-1/2 p-6 md:p-8 bg-slate-900 rounded-2xl border border-slate-700 space-y-6 animate-fade-in">
        <h2 className="text-3xl font-bold text-white border-b border-slate-700 pb-4">{selectedEntry.title}</h2>
        <p className="text-slate-300 whitespace-pre-wrap text-base leading-relaxed max-h-80 overflow-y-auto scrollbar-hide">{selectedEntry.content}</p>
        <div className="flex justify-between items-center pt-4 border-t border-slate-700">
          <Button variant="ghost" onClick={() => setSelectedEntry(null)}>返回列表</Button>
          <Button onClick={() => onExplore(selectedEntry.content)} className="bg-gradient-to-r from-indigo-500 to-purple-600">
            带着这个问题进入心域
          </Button>
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
          <Button fullWidth onClick={() => { setIsCreating(true); setSelectedEntry(null); }} className="mb-6">+ 新建日记</Button>
          <div className="space-y-3">
            {entries.length === 0 && !isCreating && (
              <p className="text-center text-slate-500 p-4">还没有日记。点击上方按钮创建第一篇吧。</p>
            )}
            {entries.sort((a,b) => b.timestamp - a.timestamp).map(entry => (
              <div
                key={entry.id}
                onClick={() => { setSelectedEntry(entry); setIsCreating(false); }}
                className={`p-4 rounded-lg cursor-pointer border-2 transition-all ${selectedEntry?.id === entry.id ? 'bg-slate-700 border-pink-500' : 'bg-slate-800 border-transparent hover:border-slate-600'}`}
              >
                <h3 className="font-bold text-white truncate">{entry.title}</h3>
                <p className="text-xs text-slate-400">{new Date(entry.timestamp).toLocaleString()}</p>
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
