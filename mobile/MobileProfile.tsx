
import React from 'react';
import { UserProfile, JournalEntry, Character, Mail } from '../types';

interface MobileProfileProps {
  userProfile: UserProfile;
  journalEntries: JournalEntry[];
  mailbox: Mail[];
  history: Record<string, any[]>;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export const MobileProfile: React.FC<MobileProfileProps> = ({ 
  userProfile, 
  journalEntries, 
  mailbox,
  history,
  onOpenSettings,
  onLogout 
}) => {
  const charactersMetCount = Object.keys(history).length;
  const unreadMailCount = mailbox.filter(m => !m.isRead).length;

  return (
    <div className="h-full bg-black pb-20 overflow-y-auto">
      {/* Header Profile Card */}
      <div className="p-6 bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-900/40 rounded-b-3xl shadow-2xl border-b border-white/5">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 p-[2px]">
             <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
               {userProfile.avatarUrl ? (
                 <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
               ) : (
                 <span className="text-2xl font-bold text-white">{userProfile.nickname[0]}</span>
               )}
             </div>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{userProfile.nickname}</h2>
            <p className="text-sm text-gray-400">
               {userProfile.isGuest ? '访客身份 (未绑定)' : '已连接至心域网络'}
            </p>
            {userProfile.isGuest && (
              <button onClick={onOpenSettings} className="mt-2 text-xs bg-pink-600/20 text-pink-400 px-3 py-1 rounded-full border border-pink-600/30">
                绑定账号
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
           <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
              <div className="text-xl font-bold text-pink-400">{journalEntries.length}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">日记碎片</div>
           </div>
           <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
              <div className="text-xl font-bold text-indigo-400">{charactersMetCount}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">遇见灵魂</div>
           </div>
           <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5 relative">
              {unreadMailCount > 0 && <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
              <div className="text-xl font-bold text-emerald-400">{mailbox.length}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">时光信件</div>
           </div>
        </div>
      </div>

      {/* Menu Options */}
      <div className="p-6 space-y-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">系统选项</h3>
        
        <div className="space-y-2">
            <button onClick={onOpenSettings} className="w-full bg-gray-900 border border-gray-800 p-4 rounded-xl flex items-center justify-between group active:scale-95 transition-all">
                <div className="flex items-center gap-3">
                    <span className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">⚙️</span>
                    <span className="text-gray-200 font-medium">设置与模型配置</span>
                </div>
                <span className="text-gray-600">→</span>
            </button>
            
            <button className="w-full bg-gray-900 border border-gray-800 p-4 rounded-xl flex items-center justify-between group active:scale-95 transition-all opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3">
                    <span className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">📊</span>
                    <span className="text-gray-200 font-medium">心域数据分析 (WIP)</span>
                </div>
                <span className="text-gray-600">→</span>
            </button>
            
             <button className="w-full bg-gray-900 border border-gray-800 p-4 rounded-xl flex items-center justify-between group active:scale-95 transition-all opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3">
                    <span className="p-2 bg-amber-500/10 rounded-lg text-amber-400">🧡</span>
                    <span className="text-gray-200 font-medium">关于我们</span>
                </div>
                <span className="text-gray-600">→</span>
            </button>
        </div>

        <div className="pt-6">
            <button onClick={onLogout} className="w-full py-4 text-red-500/80 font-bold text-sm bg-red-900/10 rounded-xl border border-red-900/20 hover:bg-red-900/20 hover:text-red-400 active:scale-95 transition-all">
                退出登录
            </button>
            <p className="text-center text-[10px] text-gray-700 mt-4">
                HeartSphere Mobile v1.0.0
            </p>
        </div>
      </div>
    </div>
  );
};
