import React from 'react';
import { AppSettings } from '../types';
import { Button } from './Button';

interface SettingsModalProps {
  settings: AppSettings;
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


export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSettingsChange, onClose }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
            系统设置
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl">&times;</button>
        </div>
        
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
        </div>

        <div className="mt-8 text-center">
            <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-500">
                关闭
            </Button>
        </div>
      </div>
    </div>
  );
};
