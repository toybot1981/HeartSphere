
import React, { useRef, useState } from 'react';
import { AppSettings, GameState, AIProvider, UserProfile } from '../types';
import { Button } from './Button';
import { storageService } from '../services/storage';
import { geminiService } from '../services/gemini';

interface SettingsModalProps {
  settings: AppSettings;
  gameState: GameState; // Pass full state for backup
  onSettingsChange: (newSettings: AppSettings) => void;
  onUpdateProfile?: (profile: UserProfile) => void; // New prop for profile updates
  onClose: () => void;
  onLogout: () => void;
  onBindAccount: () => void;
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

const ConfigInput: React.FC<{ label: string; value: string; onChange: (val: string) => void; placeholder: string; type?: string }> = ({ label, value, onChange, placeholder, type = 'text' }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">{label}</label>
        <input 
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-xs text-white focus:border-pink-500 outline-none transition-colors"
        />
    </div>
);

const ConfigSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-4 last:mb-0">
        <h6 className="text-[10px] font-bold text-gray-400 border-b border-gray-700/50 pb-1 mb-2 uppercase tracking-widest">{title}</h6>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, gameState, onSettingsChange, onUpdateProfile, onClose, onLogout, onBindAccount }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
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

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!gameState.userProfile || !onUpdateProfile) return;
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              onUpdateProfile({ ...gameState.userProfile!, avatarUrl: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
  };

  const handleGetAvatarPrompt = async () => {
      if (!gameState.userProfile) return;
      const prompt = geminiService.constructUserAvatarPrompt(gameState.userProfile.nickname);
      try {
          await navigator.clipboard.writeText(prompt);
          alert("头像提示词已复制！");
      } catch (e) {
          alert("复制失败: " + prompt);
      }
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

  const PROVIDERS: {id: AIProvider, name: string}[] = [
      { id: 'gemini', name: 'Gemini (Google)' },
      { id: 'openai', name: 'ChatGPT (OpenAI)' },
      { id: 'qwen', name: '通义千问 (Qwen)' },
      { id: 'doubao', name: '豆包 (Volcengine)' }
  ];

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
                AI 模型配置
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
                     {/* Account Section */}
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4">
                            <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                                <input type="file" ref={avatarInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
                                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl overflow-hidden shadow-lg border-2 border-white/20">
                                    {gameState.userProfile?.avatarUrl ? (
                                        <img src={gameState.userProfile.avatarUrl} className="w-full h-full object-cover" alt="User Avatar" />
                                    ) : (
                                        gameState.userProfile?.nickname?.[0] || 'G'
                                    )}
                                </div>
                                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs">上传</span>
                                </div>
                            </div>
                            
                            <div>
                                <p className="text-white font-bold text-lg">{gameState.userProfile?.nickname || '访客'}</p>
                                <p className="text-xs text-gray-400">
                                    {gameState.userProfile?.isGuest ? '访客身份 (未绑定)' : `已登录 (${gameState.userProfile?.phoneNumber || 'WeChat'})`}
                                </p>
                                <button onClick={handleGetAvatarPrompt} className="text-[10px] text-pink-400 hover:underline mt-1 mr-2">
                                    📋 复制 AI 头像提示词
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                             {gameState.userProfile?.isGuest && (
                                <Button variant="ghost" onClick={onBindAccount} className="text-xs text-pink-400 hover:bg-pink-900/20 hover:text-pink-300 border border-pink-500/30">
                                    绑定账号
                                </Button>
                             )}
                             <Button variant="ghost" onClick={onLogout} className="text-xs text-red-400 hover:bg-red-900/20 hover:text-red-300">
                                退出登录
                             </Button>
                        </div>
                    </div>

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
                        label="自动生成日记配图"
                        description="开启后，保存日记时会自动分析情绪并生成抽象配图。关闭可节省Token。"
                        enabled={settings.autoGenerateJournalImages}
                        onChange={(enabled) => onSettingsChange({ ...settings, autoGenerateJournalImages: enabled })}
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
                <div className="space-y-8">
                    
                    {/* 1. API KEY CONFIGURATION */}
                    <div className="space-y-6">
                        <h4 className="text-sm font-bold text-gray-300 border-b border-gray-700 pb-2">API 密钥 & 模型参数</h4>
                        
                        {/* Gemini Config */}
                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                             <h5 className="text-sm font-bold text-pink-400 mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                                Gemini (Google)
                             </h5>
                             <ConfigSection title="Authentication">
                                <ConfigInput 
                                    label="API Key" 
                                    value={settings.geminiConfig.apiKey} 
                                    onChange={(v) => updateProviderConfig('gemini', 'apiKey', v)} 
                                    placeholder="sk-..." type="password" 
                                />
                             </ConfigSection>
                             <ConfigSection title="Text Generation">
                                <ConfigInput 
                                    label="Text Model Name" 
                                    value={settings.geminiConfig.modelName} 
                                    onChange={(v) => updateProviderConfig('gemini', 'modelName', v)} 
                                    placeholder="gemini-2.5-flash" 
                                />
                             </ConfigSection>
                             <ConfigSection title="Visual Generation">
                                <div className="grid grid-cols-2 gap-3">
                                    <ConfigInput 
                                        label="Image Model" 
                                        value={settings.geminiConfig.imageModel || ''} 
                                        onChange={(v) => updateProviderConfig('gemini', 'imageModel', v)} 
                                        placeholder="gemini-2.5-flash-image" 
                                    />
                                    <ConfigInput 
                                        label="Video Model" 
                                        value={settings.geminiConfig.videoModel || ''} 
                                        onChange={(v) => updateProviderConfig('gemini', 'videoModel', v)} 
                                        placeholder="veo-3.1-fast-generate-preview" 
                                    />
                                </div>
                             </ConfigSection>
                        </div>

                        {/* OpenAI Config */}
                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                             <h5 className="text-sm font-bold text-green-400 mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                ChatGPT (OpenAI)
                             </h5>
                             <ConfigSection title="Authentication">
                                <ConfigInput 
                                    label="API Key" 
                                    value={settings.openaiConfig.apiKey} 
                                    onChange={(v) => updateProviderConfig('openai', 'apiKey', v)} 
                                    placeholder="sk-..." type="password" 
                                />
                                <ConfigInput 
                                    label="Base URL (Optional)" 
                                    value={settings.openaiConfig.baseUrl || ''} 
                                    onChange={(v) => updateProviderConfig('openai', 'baseUrl', v)} 
                                    placeholder="https://api.openai.com/v1" 
                                />
                             </ConfigSection>
                             <ConfigSection title="Text Generation">
                                <ConfigInput 
                                    label="Text Model Name" 
                                    value={settings.openaiConfig.modelName} 
                                    onChange={(v) => updateProviderConfig('openai', 'modelName', v)} 
                                    placeholder="gpt-4o" 
                                />
                             </ConfigSection>
                        </div>

                        {/* Qwen Config */}
                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                             <h5 className="text-sm font-bold text-purple-400 mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                                通义千问 (Qwen)
                             </h5>
                             <ConfigSection title="Authentication">
                                <ConfigInput 
                                    label="DashScope API Key" 
                                    value={settings.qwenConfig.apiKey} 
                                    onChange={(v) => updateProviderConfig('qwen', 'apiKey', v)} 
                                    placeholder="sk-..." type="password" 
                                />
                             </ConfigSection>
                             <ConfigSection title="Text Generation">
                                <ConfigInput 
                                    label="Text Model Name" 
                                    value={settings.qwenConfig.modelName} 
                                    onChange={(v) => updateProviderConfig('qwen', 'modelName', v)} 
                                    placeholder="qwen-max" 
                                />
                             </ConfigSection>
                             <ConfigSection title="Visual Generation">
                                <div className="grid grid-cols-2 gap-3">
                                    <ConfigInput 
                                        label="Image Model" 
                                        value={settings.qwenConfig.imageModel || ''} 
                                        onChange={(v) => updateProviderConfig('qwen', 'imageModel', v)} 
                                        placeholder="qwen-image-plus" 
                                    />
                                    <ConfigInput 
                                        label="Video Model" 
                                        value={settings.qwenConfig.videoModel || ''} 
                                        onChange={(v) => updateProviderConfig('qwen', 'videoModel', v)} 
                                        placeholder="wanx-video" 
                                    />
                                </div>
                             </ConfigSection>
                        </div>

                         {/* Doubao Config */}
                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                             <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                                 <h5 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                    豆包 (Doubao)
                                 </h5>
                                 <a href="https://console.volcengine.com/ark/region:ark+cn-beijing/endpoint" target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-500 hover:text-blue-300 flex items-center gap-1">
                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                                       <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                                     </svg>
                                     Get API Key
                                 </a>
                             </div>
                             <ConfigSection title="Authentication">
                                <ConfigInput 
                                    label="API Key" 
                                    value={settings.doubaoConfig.apiKey} 
                                    onChange={(v) => updateProviderConfig('doubao', 'apiKey', v)} 
                                    placeholder="xxxxxxxx-xxxx-..." type="password" 
                                />
                                <ConfigInput 
                                    label="Base URL" 
                                    value={settings.doubaoConfig.baseUrl || ''} 
                                    onChange={(v) => updateProviderConfig('doubao', 'baseUrl', v)} 
                                    placeholder="https://ark.cn-beijing.volces.com/api/v3" 
                                />
                             </ConfigSection>
                             <ConfigSection title="Text Generation">
                                <ConfigInput 
                                    label="Text Model (Endpoint ID)" 
                                    value={settings.doubaoConfig.modelName} 
                                    onChange={(v) => updateProviderConfig('doubao', 'modelName', v)} 
                                    placeholder="ep-2024..." 
                                />
                             </ConfigSection>
                             <ConfigSection title="Visual Generation">
                                <div className="grid grid-cols-2 gap-3">
                                    <ConfigInput 
                                        label="Image Model" 
                                        value={settings.doubaoConfig.imageModel || ''} 
                                        onChange={(v) => updateProviderConfig('doubao', 'imageModel', v)} 
                                        placeholder="doubao-image-v1" 
                                    />
                                    <ConfigInput 
                                        label="Video Model" 
                                        value={settings.doubaoConfig.videoModel || ''} 
                                        onChange={(v) => updateProviderConfig('doubao', 'videoModel', v)} 
                                        placeholder="doubao-video-v1" 
                                    />
                                </div>
                             </ConfigSection>
                        </div>
                    </div>
                    
                    {/* 2. ROUTING STRATEGY & FALLBACK */}
                    <div className="bg-gray-800/80 p-5 rounded-xl border border-indigo-500/30 shadow-lg">
                        <h4 className="text-sm font-bold text-indigo-300 mb-4 uppercase tracking-widest border-b border-indigo-500/20 pb-2">
                           策略路由与容灾 (Strategy & Backup)
                        </h4>
                        
                        <div className="space-y-4 mb-6">
                            <p className="text-xs text-gray-400">选择不同任务类型的首选模型提供商。</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Text Chat (对话)</label>
                                    <select 
                                        value={settings.textProvider} 
                                        onChange={(e) => onSettingsChange({...settings, textProvider: e.target.value as AIProvider})}
                                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                                    >
                                        {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Image Gen (绘图)</label>
                                    <select 
                                        value={settings.imageProvider} 
                                        onChange={(e) => onSettingsChange({...settings, imageProvider: e.target.value as AIProvider})}
                                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                                    >
                                        {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Video Gen (视频)</label>
                                    <select 
                                        value={settings.videoProvider} 
                                        onChange={(e) => onSettingsChange({...settings, videoProvider: e.target.value as AIProvider})}
                                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                                    >
                                        {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Speech/TTS (语音)</label>
                                    <select 
                                        value={settings.audioProvider} 
                                        onChange={(e) => onSettingsChange({...settings, audioProvider: e.target.value as AIProvider})}
                                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                                    >
                                        {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <Toggle 
                            label="自动降级 (Auto Fallback)" 
                            description="如果首选模型调用失败（如配额耗尽），自动尝试其他已配置的提供商。"
                            enabled={settings.enableFallback}
                            onChange={(enabled) => onSettingsChange({ ...settings, enableFallback: enabled })}
                        />
                    </div>
                </div>
            )}

            {/* BACKUP TAB */}
            {activeTab === 'backup' && (
                <div className="space-y-6 text-center py-8">
                    <div className="p-6 bg-gray-900/50 rounded-2xl border border-gray-700">
                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">💾</span>
                        </div>
                        <h4 className="text-lg font-bold text-white mb-2">导出记忆核心</h4>
                        <p className="text-sm text-gray-400 mb-6">将您的所有角色、日记和进度保存为本地文件。</p>
                        <Button onClick={handleExportBackup} fullWidth className="bg-gradient-to-r from-pink-600 to-purple-600">
                            下载备份文件 (.json)
                        </Button>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-gray-700"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-gray-800 px-2 text-xs text-gray-500 uppercase">OR</span>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-900/50 rounded-2xl border border-gray-700">
                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">♻️</span>
                        </div>
                        <h4 className="text-lg font-bold text-white mb-2">恢复记忆核心</h4>
                        <p className="text-sm text-gray-400 mb-6">从备份文件恢复数据。警告：这将覆盖当前进度。</p>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept=".json" 
                            className="hidden" 
                        />
                        <Button onClick={handleImportClick} variant="secondary" fullWidth className="border-gray-600">
                            选择备份文件...
                        </Button>
                    </div>
                    
                    {backupMsg && <p className="text-green-400 text-sm font-bold animate-pulse">{backupMsg}</p>}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};