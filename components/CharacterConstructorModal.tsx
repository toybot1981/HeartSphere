import React, { useState } from 'react';
import { Character, WorldScene } from '../types';
import { geminiService } from '../services/gemini';
import { Button } from './Button';

interface CharacterConstructorModalProps {
  scene: WorldScene;
  onSave: (character: Character) => void;
  onClose: () => void;
}

export const CharacterConstructorModal: React.FC<CharacterConstructorModalProps> = ({ scene, onSave, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedCharacter, setGeneratedCharacter] = useState<Character | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
        setError('请输入一个关于角色的想法。');
        return;
    }
    setError('');
    setIsLoading(true);
    setGeneratedCharacter(null);
    try {
        const newCharacter = await geminiService.generateCharacterFromPrompt(prompt, scene.name);
        if (newCharacter) {
            setGeneratedCharacter(newCharacter);
        } else {
            setError('角色生成失败，请调整你的想法或稍后重试。');
        }
    } catch (e) {
        console.error(e);
        setError('角色生成时发生网络错误，请稍后重试。');
    } finally {
        setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (generatedCharacter) {
        onSave(generatedCharacter);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-6">
        <div>
            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
            角色构造器
            </h3>
            <p className="text-sm text-gray-400">为时代 <span className="font-bold text-pink-300">“{scene.name}”</span> 注入新的灵魂。</p>
        </div>
        
        <div className="space-y-2">
            <label className="text-sm font-bold text-white/80">你的想法</label>
             <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="输入一个简单的角色概念，例如：&#10;“秦朝的第一个皇帝，秦始皇”&#10;“我的高中同桌，一个很幽默的女孩”"
                className="w-full bg-white/5 border-2 border-white/10 rounded-lg py-2 px-4 text-white placeholder-white/40 focus:border-pink-400 focus:ring-0 outline-none transition-colors resize-none h-28"
                disabled={isLoading}
              />
        </div>
        <Button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} fullWidth className="bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center">
            {isLoading ? (<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />正在生成中...</>) : (<>✨ AI 生成角色</>)}
        </Button>

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        
        {generatedCharacter && !isLoading && (
            <div className="p-4 bg-black/20 rounded-xl border border-gray-700 animate-fade-in">
                <h4 className="text-lg font-bold text-center mb-4">生成完毕！</h4>
                <div className="flex items-center gap-4">
                    <img src={generatedCharacter.avatarUrl} alt={generatedCharacter.name} className="w-24 h-32 object-cover rounded-lg border-2 border-white/20" />
                    <div className="text-sm space-y-1">
                        <p><span className="font-bold text-white/60">姓名:</span> {generatedCharacter.name}</p>
                        <p><span className="font-bold text-white/60">角色:</span> {generatedCharacter.role}</p>
                        <p className="text-white/80 line-clamp-3"><span className="font-bold text-white/60">简介:</span> {generatedCharacter.bio}</p>
                    </div>
                </div>
            </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700/50">
            <Button variant="ghost" onClick={onClose} disabled={isLoading}>取消</Button>
            <Button onClick={handleSave} disabled={isLoading || !generatedCharacter}>
                添加到时代
            </Button>
        </div>
      </div>
    </div>
  );
};