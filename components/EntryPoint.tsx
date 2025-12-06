
import React from 'react';

interface EntryPointProps {
  onNavigate: (screen: 'realWorld' | 'sceneSelection') => void;
  onOpenSettings: () => void;
  nickname: string;
}

export const EntryPoint: React.FC<EntryPointProps> = ({ onNavigate, onOpenSettings, nickname }) => {
  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center p-4 bg-black">
      <div className="absolute inset-0 z-0">
        <img src="https://picsum.photos/seed/nexus_point/1920/1080" className="w-full h-full object-cover opacity-30" alt="Nexus Background" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
      </div>

      {/* Settings Button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={onOpenSettings}
          className="p-3 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full transition-all border border-white/10 hover:border-white/20"
          title="系统设置"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a6.759 6.759 0 0 1 0 1.004c-.008.379.137.752.43.992l1.003.827c.424.35.534.954.26 1.431l-1.296 2.247a1.125 1.125 0 0 1-1.37.49l-1.217-.456c-.355-.133-.75-.072-1.075.124a6.47 6.47 0 0 1-.22.127c-.331.183-.581.495-.644.87l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 0 1 1.37-.49l-1.296-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-1.004c.008-.379-.137-.752-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.431l1.296-2.247a1.125 1.125 0 0 1 1.37.49l1.217.456c.355.133.75.072 1.075-.124.072-.044.146-.087.22-.127.332-.183.582-.495.645-.87l.212-1.281Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </button>
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
