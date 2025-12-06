
import React, { useState, useEffect, useRef } from 'react';
import { DebugLog } from '../types';

interface DebugConsoleProps {
  logs: DebugLog[];
  onClear: () => void;
  onClose: () => void;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({ logs, onClear, onClose }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (autoScroll && !isMinimized && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll, isMinimized]);

  return (
    <div 
      className={`fixed bottom-0 left-0 w-full z-[100] flex flex-col font-mono text-xs shadow-[0_-5px_20px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all duration-300 ease-in-out border-t border-green-500/30 ${
        isMinimized ? 'h-9 bg-black/80' : 'h-1/3 min-h-[300px] bg-black/90'
      }`}
    >
      {/* Header - Click to Toggle */}
      <div 
        className="flex justify-between items-center px-4 h-9 bg-gray-900/90 border-b border-gray-700 cursor-pointer hover:bg-gray-800 transition-colors select-none"
        onClick={() => setIsMinimized(!isMinimized)}
        title={isMinimized ? "点击展开日志" : "点击折叠日志"}
      >
        <div className="flex items-center gap-3">
          <button className="text-gray-400 hover:text-white focus:outline-none">
            {isMinimized ? '▲' : '▼'}
          </button>
          <div className="flex items-center gap-2">
            <span className={`font-bold animate-pulse ${logs.some(l => l.type === 'error') ? 'text-red-500' : 'text-green-500'}`}>
              ● MATRIX DEBUGGER
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400">{logs.length} events</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
           {!isMinimized && (
              <label className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-white select-none hidden sm:flex">
                <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} className="rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-0" />
                Auto-scroll
              </label>
           )}
           <div className="flex items-center gap-2">
              <button onClick={onClear} className="text-yellow-500 hover:text-yellow-400 font-bold px-2 py-0.5 hover:bg-white/5 rounded text-[10px] border border-yellow-500/30">CLEAR</button>
              <button onClick={onClose} className="text-red-500 hover:text-red-400 font-bold ml-2 px-2 py-0.5 hover:bg-white/5 rounded text-[10px] border border-red-500/30">CLOSE</button>
           </div>
        </div>
      </div>

      {/* Logs Area */}
      {!isMinimized && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide bg-black/50">
          {logs.length === 0 && (
            <div className="text-gray-600 text-center mt-10 italic flex flex-col items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                Waiting for neural signals...
            </div>
          )}
          {logs.map((log) => (
            <div key={log.id} className="border-l-2 pl-3 py-1 font-mono text-xs break-all hover:bg-white/5 transition-colors rounded-r group" 
                 style={{ 
                   borderColor: log.type === 'error' ? '#ef4444' : log.type === 'request' ? '#3b82f6' : '#22c55e' 
                 }}>
               <div className="flex gap-2 text-[10px] opacity-70 mb-0.5 items-center flex-wrap">
                  <span className="text-gray-500 font-light">[{new Date(log.timestamp).toLocaleTimeString([], {hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit', fractionalSecondDigits: 3} as any)}]</span>
                  <span className="font-bold uppercase tracking-wider" style={{ color: log.type === 'error' ? '#ef4444' : log.type === 'request' ? '#60a5fa' : '#4ade80' }}>
                    {log.type}
                  </span>
                  
                  {/* Provider & Model Badge */}
                  <span className="text-purple-400 bg-purple-900/20 px-1.5 py-0.5 rounded border border-purple-500/20 flex items-center gap-1">
                      <span>@{log.provider}</span>
                      {log.model && <span className="text-purple-300 opacity-70">/ {log.model}</span>}
                  </span>

                  <span className="text-yellow-200/80 font-semibold">::{log.method}</span>
               </div>
               
               <div className="text-gray-300 whitespace-pre-wrap pl-1 mt-1">
                  {typeof log.data === 'string' ? log.data : (
                      <details>
                          <summary className="cursor-pointer text-gray-500 hover:text-gray-300 select-none outline-none text-[10px] flex items-center gap-1 group-hover:text-gray-200 transition-colors">
                             <span className="opacity-50">▶</span> {log.type === 'request' ? 'View Payload' : 'View Response Data'}
                          </summary>
                          <pre className="mt-2 text-[10px] bg-gray-950 p-3 rounded-lg border border-gray-800 overflow-x-auto text-green-400/90 max-h-60 custom-scrollbar shadow-inner">
                              {JSON.stringify(log.data, null, 2)}
                          </pre>
                      </details>
                  )}
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
