
import React from 'react';

interface EntryPointProps {
  onNavigate: (screen: 'realWorld' | 'sceneSelection' | 'admin') => void;
  onOpenSettings: () => void;
  nickname: string;
  onSwitchToMobile: () => void;
}

export const EntryPoint: React.FC<EntryPointProps> = ({ onNavigate, onOpenSettings, nickname, onSwitchToMobile }) => {
  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center p-4 bg-black">
      <div className="absolute inset-0 z-0">
        <img src="https://picsum.photos/seed/nexus_point/1920/1080" className="w-full h-full object-cover opacity-30" alt="Nexus Background" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
      </div>

      {/* Admin Access (Top Left - Hidden/Subtle) */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => onNavigate('admin')}
          className="p-3 text-slate-500 hover:text-red-400 bg-transparent hover:bg-black/40 rounded-full transition-all opacity-50 hover:opacity-100 group"
          title="系统管理"
        >
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
             <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
           </svg>
        </button>
      </div>

      {/* Switch to Mobile Button */}
      <div className="absolute top-6 right-24 z-20 mr-2">
        <button
          onClick={onSwitchToMobile}
          className="p-3 text-slate-300 hover:text-white bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full transition-all border border-white/10 hover:border-white/30 shadow-lg hover:scale-105 flex items-center gap-2 px-4"
          title="切换到手机版"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
          </svg>
          <span className="text-sm font-bold hidden sm:inline">Mobile</span>
        </button>
      </div>

      {/* Settings Button - Optimized for visibility */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={onOpenSettings}
          className="p-3 text-slate-300 hover:text-white bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full transition-all border border-white/10 hover:border-white/30 shadow-lg hover:scale-105"
          title="系统设置"
        >
          {/* Adjustments Horizontal Icon (Cleaner look than Cog) */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
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
          <h2 className="text-3xl font-bold text-white mb-2 z-10">我的心域 <span className="font-light text-xl">My HeartSphere</span></h2>
          <p className="text-slate-300 z-10">探索平行于现实的记忆与情感世界，寻找答案或体验不同的故事。</p>
        </div>
      </div>
    </div>
  );
};
