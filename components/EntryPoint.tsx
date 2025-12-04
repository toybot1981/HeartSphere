import React from 'react';

interface EntryPointProps {
  onNavigate: (screen: 'realWorld' | 'sceneSelection') => void;
  nickname: string;
}

export const EntryPoint: React.FC<EntryPointProps> = ({ onNavigate, nickname }) => {
  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center p-4 bg-black">
      <div className="absolute inset-0 z-0">
        <img src="https://picsum.photos/seed/nexus_point/1920/1080" className="w-full h-full object-cover opacity-30" alt="Nexus Background" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
      </div>
      <div className="z-10 text-center animate-fade-in space-y-4 mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-200">你好, <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">{nickname}</span></h1>
        <p className="text-lg text-slate-400">选择你的目的地</p>
      </div>
      <div className="z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
        {/* Real World Card */}
        <div 
          onClick={() => onNavigate('realWorld')}
          className="group relative p-8 h-80 flex flex-col justify-end rounded-3xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm cursor-pointer overflow-hidden transition-all hover:border-blue-400 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10"
        >
          <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-500" style={{backgroundImage: `radial-gradient(circle at top left, #3b82f6, transparent 50%)`}}></div>
          <h2 className="text-3xl font-bold text-white mb-2 z-10">现实世界</h2>
          <p className="text-slate-300 z-10">记录你的想法、问题和经历。这是一个完全属于你的私人空间。</p>
        </div>

        {/* HeartSphere Card */}
        <div 
          onClick={() => onNavigate('sceneSelection')}
          className="group relative p-8 h-80 flex flex-col justify-end rounded-3xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm cursor-pointer overflow-hidden transition-all hover:border-purple-400 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10"
        >
          <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-500" style={{backgroundImage: `radial-gradient(circle at top right, #a855f7, transparent 50%)`}}></div>
          <h2 className="text-3xl font-bold text-white mb-2 z-10">心域 <span className="font-light">HeartSphere</span></h2>
          <p className="text-slate-300 z-10">探索平行于现实的记忆与情感世界，寻找答案或体验不同的故事。</p>
        </div>
      </div>
    </div>
  );
};
