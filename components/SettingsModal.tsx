
import React, { useRef, useState } from 'react';
import { AppSettings, GameState } from '../types';
import { Button } from './Button';
import { storageService } from '../services/storage';

interface SettingsModalProps {
  settings: AppSettings;
  gameState: GameState; // Pass full state for backup
  onSettingsChange: (newSettings: AppSettings) => void;
  onClose: () => void;
}

const Toggle: React.FC<{ label: string; description: string; enabled: boolean; onChange: (enabled: boolean) => void; }> = ({ label, description, enabled, onChange }) => (
  <div className="flex justify-between items-center p-4 rounded-lg bg-gray-800/50 border border-gray-700">
    <div>
      <h4 className="font-bold text-white">{label}</h4>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
    <button onClick={() => onChange(!enabled)} className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${enabled ? 'bg-indigo-600' : 'bg-gray-600'}`}>
      <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${enabled ? 'transform translate-x-6' : ''}`} />
    </button>
  </div>
);


export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, gameState, onSettingsChange, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupMsg, setBackupMsg] = useState('');

  const handleExportBackup = () => {
    // We use the current in-memory state for export, which is the most up-to-date
    const data = storageService.exportBackup(gameState);
    if (!data) {
        alert("没有可备份的数据！");
        return;
    }
    
    // Create a Blob and trigger download
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const date = new Date().toISOString().split('T')[0];
    link.download = `HeartSphere_Backup_${date}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setBackupMsg('备份已下载到您的设备。');
    setTimeout(() => setBackupMsg(''), 3000);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Confirm before overwriting
    if (!window.confirm("警告：恢复备份将覆盖当前的日记、角色和进度。确定要继续吗？")) {
        // Reset input so change event can fire again if they choose same file later
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        const content = event.target?.result as string;
        if (content) {
            setBackupMsg('正在恢复...');
            const success = await storageService.restoreBackup(content);
            if (success) {
                alert("记忆核心恢复成功！系统将重新启动。");
                window.location.reload();
            } else {
                alert("恢复失败：文件格式错误或已损坏。");
                setBackupMsg('');
            }
        }
    };
    reader.readAsText(file);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
            系统设置
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl">&times;</button>
        </div>
        
        <div className="space-y-4 mb-8">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">通用设置</h4>
            <Toggle 
                label="自动生成首页形象"
                description="开启后，进入选择页会自动为角色生成新的AI形象。关闭可节省Token。"
                enabled={settings.autoGenerateAvatars}
                onChange={(enabled) => onSettingsChange({ ...settings, autoGenerateAvatars: enabled })}
            />
            <Toggle 
                label="自动生成故事场景"
                description="开启后，在故事模式中会自动生成与情节匹配的背景图片。关闭可节省Token。"
                enabled={settings.autoGenerateStoryScenes}
                onChange={(enabled) => onSettingsChange({ ...settings, autoGenerateStoryScenes: enabled })}
            />
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-700">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">记忆归档 (本地备份)</h4>
            <div className="grid grid-cols-2 gap-4">
                <Button variant="secondary" onClick={handleExportBackup} className="border-green-500/30 text-green-300 hover:bg-green-500/10">
                    <span className="flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        导出备份
                    </span>
                </Button>
                <Button variant="secondary" onClick={handleImportClick} className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10">
                     <span className="flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        读取备份
                    </span>
                </Button>
                {/* Hidden File Input */}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="application/json" 
                    className="hidden" 
                />
            </div>
            {backupMsg && <p className="text-center text-xs text-green-400 animate-fade-in">{backupMsg}</p>}
            <p className="text-xs text-gray-500 text-center">备份文件 (.json) 将存储在您的本地设备上。</p>
        </div>

        <div className="mt-8 text-center pt-4 border-t border-gray-700">
            <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-500 w-full">
                关闭
            </Button>
        </div>
      </div>
    </div>
  );
};
