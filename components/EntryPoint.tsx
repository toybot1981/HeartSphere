
import React from 'react';
import { Button } from './Button';

interface EntryPointProps {
  onNavigate: (screen: 'realWorld' | 'sceneSelection' | 'admin') => void;
  onOpenSettings: () => void;
  nickname: string;
  onSwitchToMobile: () => void;
}

export const EntryPoint: React.FC<EntryPointProps> = ({ onNavigate, onOpenSettings, nickname, onSwitchToMobile }) => {
  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center p-4 bg-black overflow-hidden font-sans">
      {/* Background Effect */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img 
            src="https://picsum.photos/seed/nexus_point/1920/1080" 
            className="w-full h-full object-cover opacity-40 scale-105 animate-[pulse_10s_ease-in-out_infinite]" 
            alt="Nexus Background" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black/40 to-black" />
      </div>

      {/* Admin Access (Top Left) */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => onNavigate('admin')}
          className="p-3 text-slate-600 hover:text-red-400 bg-transparent hover:bg-black/40 rounded-full transition-all opacity-30 hover:opacity-100 group"
          title="系统管理 System Admin"
        >
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
             <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
           </svg>
        </button>
      </div>

      {/* Mobile Switch (Top Right - Left of Settings) */}
      <div className="absolute top-6 right-20 z-20 mr-2">
        <button
          onClick={onSwitchToMobile}
          className="p-3 text-slate-300 hover:text-white bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full transition-all border border-white/10 hover:border-white/30 shadow-lg hover:scale-105 flex items-center gap-2 px-4"
          title="切换手机版 Switch to Mobile"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
          </svg>
          <span className="text-sm font-bold hidden sm:inline">手机版 Mobile</span>
        </button>
      </div>

      {/* Settings Button (Top Right) */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={onOpenSettings}
          className="p-3 text-slate-300 hover:text-white bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full transition-all border border-white/10 hover:border-white/30 shadow-lg hover:rotate-90"
          title="设置 Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072" />
          </svg>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-col items-center space-y-10 animate-fade-in max-w-4xl mx-auto text-center">
          
          {/* Logo / Title Block */}
          <div className="space-y-2">
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/50 drop-shadow-[0_0_30px_rgba(255,255,255,0.5)] select-none">
                  HEARTSPHERE
              </h1>
              <div className="flex items-center justify-center gap-4 text-indigo-300 font-mono text-xs md:text-sm tracking-[0.5em] uppercase opacity-80">
                  <span className="w-8 md:w-16 h-[1px] bg-indigo-500/50"></span>
                  <span>心域链接接口 // DIGITAL SOUL INTERFACE</span>
                  <span className="w-8 md:w-16 h-[1px] bg-indigo-500/50"></span>
              </div>
          </div>

          {/* User Status */}
          <div className="flex flex-col items-center gap-4 py-4">
              <div className="relative group">
                   <div className="absolute inset-0 rounded-full border border-white/30 border-t-transparent animate-[spin_3s_linear_infinite]"></div>
                   <div className="absolute -inset-2 rounded-full border border-white/10 border-b-transparent animate-[spin_5s_linear_infinite_reverse]"></div>
                   <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-4xl font-bold text-white overflow-hidden backdrop-blur-md border border-white/20 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                      {nickname ? nickname[0].toUpperCase() : '?'}
                   </div>
                   <div className="absolute -bottom-2 bg-green-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                       Online
                   </div>
              </div>
              <div className="text-center">
                  <p className="text-gray-400 text-xs tracking-widest uppercase mb-1">Welcome back</p>
                  <p className="text-white text-xl font-bold tracking-wide">{nickname}</p>
              </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row gap-6 w-full max-w-md md:max-w-none justify-center">
              <button 
                  onClick={() => onNavigate('sceneSelection')}
                  className="group relative px-8 py-4 bg-white text-black min-w-[200px] font-bold tracking-widest text-sm rounded-sm hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] overflow-hidden"
              >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
                  <span className="relative z-10 flex flex-col">
                      <span>进入心域</span>
                      <span className="text-[10px] font-normal opacity-70">ENTER NEXUS</span>
                  </span>
              </button>

              <button 
                  onClick={() => onNavigate('realWorld')}
                  className="group relative px-8 py-4 bg-transparent border border-white/30 text-white min-w-[200px] font-bold tracking-widest text-sm rounded-sm hover:bg-white/10 hover:border-white/60 transition-all duration-300"
              >
                  <span className="relative z-10 flex flex-col">
                      <span>现实记录</span>
                      <span className="text-[10px] font-normal opacity-70">REAL WORLD</span>
                  </span>
              </button>
          </div>
      </div>
      
      {/* Footer Decoration */}
      <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none opacity-30">
          <p className="text-[10px] font-mono text-gray-500">SYSTEM READY // WAITING FOR INPUT</p>
      </div>
    </div>
  );
};
