import React from 'react';
import { GameState } from '../../types';

interface MobileBottomNavProps {
    currentScreen: GameState['currentScreen'];
    onNavigate: (screen: GameState['currentScreen']) => void;
    hasUnreadMail: boolean;
    onOpenMail: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentScreen, onNavigate, hasUnreadMail, onOpenMail }) => {
    
    // Check which "tab" is active based on screen state
    const isHome = currentScreen === 'realWorld';
    const isWorld = currentScreen === 'sceneSelection' || currentScreen === 'characterSelection' || currentScreen === 'chat';
    const isConnect = currentScreen === 'connectionSpace';
    const isProfile = currentScreen === 'mobileProfile';

    return (
        <div className="fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-md border-t border-white/10 flex justify-around items-center z-50 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
            <button 
                onClick={() => onNavigate('realWorld')}
                className={`flex flex-col items-center justify-center w-16 h-12 transition-colors ${isHome ? 'text-pink-400' : 'text-gray-500 hover:text-white'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={isHome ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isHome ? 0 : 2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="text-[10px] mt-1">现实</span>
            </button>

            <button 
                onClick={() => onNavigate('sceneSelection')}
                className={`flex flex-col items-center justify-center w-16 h-12 transition-colors ${isWorld ? 'text-purple-400' : 'text-gray-500 hover:text-white'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={isWorld ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isWorld ? 0 : 2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[10px] mt-1">心域</span>
            </button>

            {/* Connection Center Button */}
            <button 
                onClick={() => onNavigate('connectionSpace')}
                className={`relative -top-6 bg-gradient-to-tr from-indigo-600 to-purple-600 w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30 border-2 border-black transition-transform active:scale-95 ${isConnect ? 'ring-2 ring-purple-400' : ''}`}
            >
                <span className="text-xl">✨</span>
            </button>

            <button 
                onClick={onOpenMail}
                className={`flex flex-col items-center justify-center w-16 h-12 transition-colors relative text-gray-500 hover:text-white`}
            >
                {hasUnreadMail && <span className="absolute top-1 right-3 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-[10px] mt-1">信箱</span>
            </button>

            <button 
                onClick={() => onNavigate('mobileProfile')} 
                className={`flex flex-col items-center justify-center w-16 h-12 transition-colors ${isProfile ? 'text-indigo-400' : 'text-gray-500 hover:text-white'}`}
            >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={isProfile ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isProfile ? 0 : 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-[10px] mt-1">我的</span>
            </button>
        </div>
    );
};