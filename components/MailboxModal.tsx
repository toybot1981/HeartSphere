
import React, { useState } from 'react';
import { Mail } from '../types';
import { Button } from './Button';

interface MailboxModalProps {
  mails: Mail[];
  onClose: () => void;
  onMarkAsRead: (mailId: string) => void;
}

export const MailboxModal: React.FC<MailboxModalProps> = ({ mails, onClose, onMarkAsRead }) => {
  const [selectedMail, setSelectedMail] = useState<Mail | null>(null);

  const handleOpenMail = (mail: Mail) => {
    setSelectedMail(mail);
    if (!mail.isRead) {
        onMarkAsRead(mail.id);
    }
  };

  const handleBackToList = () => {
    setSelectedMail(null);
  };

  // Sort mails: Unread first, then by timestamp descending
  const sortedMails = [...mails].sort((a, b) => {
    if (a.isRead === b.isRead) {
        return b.timestamp - a.timestamp;
    }
    return a.isRead ? 1 : -1;
  });

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl h-[80vh] shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
        <button onClick={onClose} className="absolute top-4 right-4 z-20 text-slate-500 hover:text-white bg-black/50 rounded-full p-2 backdrop-blur-sm transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* Sidebar / List View */}
        <div className={`w-full md:w-1/3 border-r border-slate-700 flex flex-col ${selectedMail ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-6 bg-slate-950/50">
                <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 flex items-center gap-2">
                    <span>📬</span> 跨时空信箱
                </h3>
                <p className="text-xs text-slate-500 mt-1">来自各个时代切片的问候</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                {sortedMails.length === 0 ? (
                    <div className="text-center text-slate-600 mt-10">
                        <p>信箱是空的。</p>
                        <p className="text-xs">去和大家聊聊天吧，也许下次会有惊喜。</p>
                    </div>
                ) : (
                    sortedMails.map(mail => (
                        <div 
                            key={mail.id}
                            onClick={() => handleOpenMail(mail)}
                            className={`p-4 rounded-xl cursor-pointer transition-all border relative overflow-hidden group ${
                                selectedMail?.id === mail.id 
                                ? 'bg-slate-800 border-pink-500/50' 
                                : mail.isRead 
                                    ? 'bg-slate-900/50 border-transparent hover:bg-slate-800' 
                                    : 'bg-gradient-to-r from-slate-800 to-indigo-900/30 border-indigo-500/30 hover:border-indigo-400'
                            }`}
                        >
                            {!mail.isRead && <div className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full animate-pulse" />}
                            <div className="flex items-center gap-3">
                                <img src={mail.senderAvatarUrl} alt={mail.senderName} className="w-10 h-10 rounded-full object-cover border border-slate-600" />
                                <div className="flex-1 min-w-0">
                                    <h4 className={`font-bold truncate ${mail.isRead ? 'text-slate-400' : 'text-white'}`}>{mail.senderName}</h4>
                                    <p className="text-sm text-slate-500 truncate">{mail.subject}</p>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-600 mt-2 text-right">{new Date(mail.timestamp).toLocaleDateString()}</p>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Reading View */}
        <div className={`flex-1 bg-[#fdfbf7] text-slate-800 flex flex-col relative ${selectedMail ? 'flex' : 'hidden md:flex'}`}>
            {!selectedMail ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-900/80">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <p>选择一封信件阅读</p>
                </div>
            ) : (
                <>
                    <div className="md:hidden absolute top-4 left-4 z-10">
                         <button onClick={handleBackToList} className="text-slate-500 hover:text-black">
                            &larr; 返回列表
                         </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 md:p-12 relative font-serif">
                        {/* Paper Texture Effect */}
                        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`}}></div>
                        
                        <div className="max-w-2xl mx-auto relative z-10">
                            <div className="flex items-center gap-4 mb-8 border-b-2 border-gray-200 pb-4">
                                <img src={selectedMail.senderAvatarUrl} alt="" className="w-16 h-16 rounded-full border-4 border-white shadow-md object-cover" />
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 leading-tight">{selectedMail.subject}</h2>
                                    <p className="text-sm text-gray-500">来自：<span className="font-bold" style={{color: selectedMail.themeColor}}>{selectedMail.senderName}</span></p>
                                    <p className="text-xs text-gray-400">{new Date(selectedMail.timestamp).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="prose prose-lg prose-slate leading-loose text-gray-800 whitespace-pre-wrap">
                                {selectedMail.content}
                            </div>

                            <div className="mt-12 pt-8 text-right font-handwriting text-xl text-gray-600">
                                — {selectedMail.senderName}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  );
};
