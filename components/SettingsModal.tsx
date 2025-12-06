
import React, { useRef, useState } from 'react';
import { AppSettings, GameState, AIProvider } from '../types';
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
  const [activeTab, setActiveTab] = useState<'general' | 'models' | 'backup'>('general');

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

  // Helper to update specific provider config
  const updateProviderConfig = (provider: AIProvider, key: string, value: string) => {
      const configKey = provider === 'gemini' ? 'geminiConfig' : provider === 'openai' ? 'openaiConfig' : provider === 'doubao' ? 'doubaoConfig' : 'qwenConfig';
      const currentConfig = settings[configKey];
      onSettingsChange({
          ...settings,
          [configKey]: { ...currentConfig, [key]: value }
      });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
            系统设置
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl">&times;</button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700 mb-6 shrink-0">
            <button 
                onClick={() => setActiveTab('general')}
                className={`flex-1 pb-3 text-sm font-bold transition-colors ${activeTab === 'general' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-gray-500 hover:text-white'}`}
            >
                通用设置
            </button>
            <button 
                onClick={() => setActiveTab('models')}
                className={`flex-1 pb-3 text-sm font-bold transition-colors ${activeTab === 'models' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-gray-500 hover:text-white'}`}
            >
                AI 模型
            </button>
            <button 
                onClick={() => setActiveTab('backup')}
                className={`flex-1 pb-3 text-sm font-bold transition-colors ${activeTab === 'backup' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-gray-500 hover:text-white'}`}
            >
                记忆备份
            </button>
        </div>
        
        <div className="overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {/* GENERAL TAB */}
            {activeTab === 'general' && (
                <div className="space-y-4">
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
                    <Toggle 
                        label="开发者调试模式"
                        description="在屏幕底部显示实时 AI 请求/响应日志。"
                        enabled={settings.debugMode}
                        onChange={(enabled) => onSettingsChange({ ...settings, debugMode: enabled })}
                    />
                </div>
            )}

            {/* MODELS TAB */}
            {activeTab === 'models' && (
                <div className="space-y-6">
                    {/* Provider Selection */}
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">当前 AI 提供商</label>
                        <div className="grid grid-cols-4 gap-2">
                             {(['gemini', 'openai', 'qwen', 'doubao'] as AIProvider[]).map(provider => (
                                 <button
                                    key={provider}
                                    onClick={() => onSettingsChange({ ...settings, activeProvider: provider })}
                                    className={`py-2 rounded-lg text-xs md:text-sm font-bold border transition-all ${
                                        settings.activeProvider === provider 
                                        ? 'bg-pink-600 border-pink-400 text-white' 
                                        : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                                    }`}
                                 >
                                     {provider === 'gemini' ? 'Gemini' : provider === 'openai' ? 'ChatGPT' : provider === 'qwen' ? '通义千问' : '豆包'}
                                 </button>
                             ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            * 注意：部分功能（如图片生成、语音）目前仅在 Gemini 下提供最佳支持。其他模型将仅用于文本对话。
                        </p>
                    </div>

                    {/* Gemini Config */}
                    {settings.activeProvider === 'gemini' && (
                        <div className="space-y-3 bg-gray-900/50 p-4 rounded-xl border border-gray-700 animate-fade-in">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">API Key (Google AI Studio)</label>
                                <input 
                                    type="password" 
                                    value={settings.geminiConfig.apiKey}
                                    onChange={(e) => updateProviderConfig('gemini', 'apiKey', e.target.value)}
                                    placeholder="默认使用环境变量，在此覆盖..."
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-pink-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Model Name</label>
                                <input 
                                    type="text" 
                                    value={settings.geminiConfig.modelName}
                                    onChange={(e) => updateProviderConfig('gemini', 'modelName', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-pink-500 outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* OpenAI Config */}
                    {settings.activeProvider === 'openai' && (
                        <div className="space-y-3 bg-gray-900/50 p-4 rounded-xl border border-gray-700 animate-fade-in">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">API Key</label>
                                <input 
                                    type="password" 
                                    value={settings.openaiConfig.apiKey}
                                    onChange={(e) => updateProviderConfig('openai', 'apiKey', e.target.value)}
                                    placeholder="sk-..."
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-pink-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Base URL (Optional)</label>
                                <input 
                                    type="text" 
                                    value={settings.openaiConfig.baseUrl}
                                    onChange={(e) => updateProviderConfig('openai', 'baseUrl', e.target.value)}
                                    placeholder="https://api.openai.com/v1"
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-pink-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Model Name</label>
                                <input 
                                    type="text" 
                                    value={settings.openaiConfig.modelName}
                                    onChange={(e) => updateProviderConfig('openai', 'modelName', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-pink-500 outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Qwen Config */}
                    {settings.activeProvider === 'qwen' && (
                        <div className="space-y-3 bg-gray-900/50 p-4 rounded-xl border border-gray-700 animate-fade-in">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">API Key (DashScope)</label>
                                <input 
                                    type="password" 
                                    value={settings.qwenConfig.apiKey}
                                    onChange={(e) => updateProviderConfig('qwen', 'apiKey', e.target.value)}
                                    placeholder="sk-..."
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-pink-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Base URL (OpenAI Compatible)</label>
                                <input 
                                    type="text" 
                                    value={settings.qwenConfig.baseUrl}
                                    onChange={(e) => updateProviderConfig('qwen', 'baseUrl', e.target.value)}
                                    placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-pink-500 outline-none"
                                />
                            </div>
                             <div>
                                <label className="block text-xs text-gray-500 mb-1">Model Name</label>
                                <input 
                                    type="text" 
                                    value={settings.qwenConfig.modelName}
                                    onChange={(e) => updateProviderConfig('qwen', 'modelName', e.target.value)}
                                    placeholder="qwen-plus, qwen-max..."
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-pink-500 outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Doubao Config */}
                    {settings.activeProvider === 'doubao' && (
                        <div className="space-y-3 bg-gray-900/50 p-4 rounded-xl border border-gray-700 animate-fade-in">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs text-gray-500">API Key (Volcengine)</label>
                                    <a 
                                        href="https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-pink-400 hover:text-pink-300 text-xs flex items-center gap-1"
                                        title="前往火山引擎控制台获取"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                                        </svg>
                                        获取 Key
                                    </a>
                                </div>
                                <input 
                                    type="password" 
                                    value={settings.doubaoConfig?.apiKey}
                                    onChange={(e) => updateProviderConfig('doubao', 'apiKey', e.target.value)}
                                    placeholder="sk-..."
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-pink-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Base URL</label>
                                <input 
                                    type="text" 
                                    value={settings.doubaoConfig?.baseUrl}
                                    onChange={(e) => updateProviderConfig('doubao', 'baseUrl', e.target.value)}
                                    placeholder="https://ark.cn-beijing.volces.com/api/v3"
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-pink-500 outline-none"
                                />
                            </div>
                             <div>
                                <label className="block text-xs text-gray-500 mb-1">Endpoint ID / Model Name</label>
                                <input 
                                    type="text" 
                                    value={settings.doubaoConfig?.modelName}
                                    onChange={(e) => updateProviderConfig('doubao', 'modelName', e.target.value)}
                                    placeholder="ep-202406... (接入点 ID)"
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-pink-500 outline-none"
                                />
                                <p className="text-[10px] text-gray-600 mt-1">请在火山引擎控制台创建推理接入点，填入 Endpoint ID。</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* BACKUP TAB */}
            {activeTab === 'backup' && (
                <div className="space-y-4">
                    <p className="text-sm text-gray-400">将您的角色、剧本和日记数据导出到本地，或从之前的备份中恢复。</p>
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
                </div>
            )}
        </div>

        <div className="mt-8 text-center pt-4 border-t border-gray-700 shrink-0">
            <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-500 w-full">
                关闭
            </Button>
        </div>
      </div>
    </div>
  );
};
