import React, { useState } from 'react';
import { Button } from './Button';

interface RealWorldJournalProps {
  onQuestionSubmit: (question: string) => void;
}

export const RealWorldJournal: React.FC<RealWorldJournalProps> = ({ onQuestionSubmit }) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (!text.trim()) return;
    onQuestionSubmit(text.trim());
    setText('');
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-2xl font-bold text-white/90">现实世界</h3>
        <p className="text-slate-400 text-sm">记录你的问题、经历或当下的心情。</p>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="记下任何你想探索的事..."
        className="w-full flex-grow bg-slate-900/70 border-2 border-slate-700 rounded-lg py-3 px-4 text-white placeholder-slate-500 focus:border-pink-500 focus:ring-0 outline-none transition-colors resize-none text-base leading-relaxed scrollbar-hide"
      />
      <Button
        onClick={handleSubmit}
        disabled={!text.trim()}
        fullWidth
        className="mt-4 bg-gradient-to-r from-indigo-500 to-purple-600 !text-base"
      >
        带着这个问题进入心域
      </Button>
    </div>
  );
};