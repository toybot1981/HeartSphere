
import React, { useState, useEffect, useRef } from 'react';
import { Character, WorldScene } from '../types';
import { geminiService } from '../services/gemini';
import { Button } from './Button';

interface CharacterConstructorModalProps {
  scene: WorldScene;
  initialCharacter?: Character | null; // Support editing
  onSave: (character: Character) => void;
  onClose: () => void;
}

export const CharacterConstructorModal: React.FC<CharacterConstructorModalProps> = ({ scene, initialCharacter, onSave, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedCharacter, setGeneratedCharacter] = useState<Character | null>(null);
  
  // Edit Mode State
  const [activeTab, setActiveTab] = useState<'basic' | 'personality' | 'depth' | 'visuals'>('basic');
  
  // Refs for uploads
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialCharacter) {
      setGeneratedCharacter(initialCharacter);
    }
  }, [initialCharacter]);

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
            setActiveTab('visuals'); // Focus on visuals after generation
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

  const updateCharacter = (field: keyof Character, value: any) => {
      if (!generatedCharacter) return;
      setGeneratedCharacter({ ...generatedCharacter, [field]: value });
  };
  
  const updateArrayField = (field: 'tags' | 'catchphrases', value: string) => {
      if (!generatedCharacter) return;
      // Split comma-separated string back to array
      const arr = value.split(/,|，/).map(s => s.trim()).filter(s => s);
      setGeneratedCharacter({ ...generatedCharacter, [field]: arr });
  };

  const handleSave = () => {
    if (generatedCharacter) {
        onSave(generatedCharacter);
    }
  };

  const handleFileUpload = (type: 'avatar' | 'background', e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && generatedCharacter) {
          const reader = new FileReader();
          reader.onloadend = () => {
              if (type === 'avatar') {
                  updateCharacter('avatarUrl', reader.result as string);
              } else {
                  updateCharacter('backgroundUrl', reader.result as string);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handleGetPrompt = async (type: 'avatar' | 'background') => {
      if (!generatedCharacter) return;
      let p = '';
      if (type === 'avatar') {
          p = geminiService.constructCharacterAvatarPrompt(generatedCharacter.name, generatedCharacter.role, generatedCharacter.bio, generatedCharacter.themeColor);
      } else {
          p = geminiService.constructCharacterBackgroundPrompt(generatedCharacter.name, generatedCharacter.bio, scene.name);
      }
      try {
          await navigator.clipboard.writeText(p);
          alert('提示词已复制！');
      } catch(e) { alert('复制失败'); }
  };

  const renderEditor = () => {
      if (!generatedCharacter) return null;

      return (
          <div className="flex-1 overflow-y-auto scrollbar-hide pr-2">
             <div className="flex justify-center mb-6">
                 <div className="relative group">
                     <img src={generatedCharacter.avatarUrl} alt={generatedCharacter.name} className="w-24 h-32 object-cover rounded-xl border-4 border-white/10 shadow-lg" />
                     <button onClick={() => setActiveTab('visuals')} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition-opacity rounded-xl">
                         修改图片
                     </button>
                 </div>
             </div>

             {/* Tabs */}
             <div className="flex border-b border-gray-700 mb-4 overflow-x-auto">
                 <button onClick={() => setActiveTab('basic')} className={`flex-1 min-w-[70px] pb-2 text-xs font-bold whitespace-nowrap ${activeTab === 'basic' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-gray-500'}`}>基本信息</button>
                 <button onClick={() => setActiveTab('personality')} className={`flex-1 min-w-[70px] pb-2 text-xs font-bold whitespace-nowrap ${activeTab === 'personality' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-gray-500'}`}>性格锚点</button>
                 <button onClick={() => setActiveTab('depth')} className={`flex-1 min-w-[70px] pb-2 text-xs font-bold whitespace-nowrap ${activeTab === 'depth' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-gray-500'}`}>深度</button>
                 <button onClick={() => setActiveTab('visuals')} className={`flex-1 min-w-[70px] pb-2 text-xs font-bold whitespace-nowrap ${activeTab === 'visuals' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-gray-500'}`}>视觉</button>
             </div>

             <div className="space-y-4">
                 {activeTab === 'basic' && (
                     <>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">姓名</label>
                            <input value={generatedCharacter.name} onChange={e => updateCharacter('name', e.target.value)} className="w-full bg-gray-900 rounded px-2 py-1.5 border border-gray-700 text-sm focus:border-pink-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">角色定位</label>
                            <input value={generatedCharacter.role} onChange={e => updateCharacter('role', e.target.value)} className="w-full bg-gray-900 rounded px-2 py-1.5 border border-gray-700 text-sm focus:border-pink-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">人物简介 (Bio)</label>
                            <textarea value={generatedCharacter.bio} onChange={e => updateCharacter('bio', e.target.value)} className="w-full bg-gray-900 rounded px-2 py-1.5 border border-gray-700 text-sm focus:border-pink-500 outline-none h-20 resize-none" />
                        </div>
                     </>
                 )}

                 {activeTab === 'personality' && (
                     <>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">MBTI 人格</label>
                                <input value={generatedCharacter.mbti || ''} onChange={e => updateCharacter('mbti', e.target.value)} placeholder="如: INFJ" className="w-full bg-gray-900 rounded px-2 py-1.5 border border-gray-700 text-sm focus:border-pink-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">标签 (逗号分隔)</label>
                                <input value={generatedCharacter.tags?.join(', ') || ''} onChange={e => updateArrayField('tags', e.target.value)} placeholder="如: 傲娇, 治愈" className="w-full bg-gray-900 rounded px-2 py-1.5 border border-gray-700 text-sm focus:border-pink-500 outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">说话风格</label>
                            <input value={generatedCharacter.speechStyle || ''} onChange={e => updateCharacter('speechStyle', e.target.value)} placeholder="如: 语气轻快，喜欢用波浪号" className="w-full bg-gray-900 rounded px-2 py-1.5 border border-gray-700 text-sm focus:border-pink-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">口癖/惯用语 (逗号分隔)</label>
                            <input value={generatedCharacter.catchphrases?.join(', ') || ''} onChange={e => updateArrayField('catchphrases', e.target.value)} placeholder="如: 真是的, 笨蛋" className="w-full bg-gray-900 rounded px-2 py-1.5 border border-gray-700 text-sm focus:border-pink-500 outline-none" />
                        </div>
                     </>
                 )}

                 {activeTab === 'depth' && (
                     <>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">内心秘密 (Secrets)</label>
                            <textarea value={generatedCharacter.secrets || ''} onChange={e => updateCharacter('secrets', e.target.value)} placeholder="不为人知的过去或弱点..." className="w-full bg-gray-900 rounded px-2 py-1.5 border border-gray-700 text-sm focus:border-pink-500 outline-none h-16 resize-none" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">当前动机 (Motivations)</label>
                            <input value={generatedCharacter.motivations || ''} onChange={e => updateCharacter('motivations', e.target.value)} placeholder="TA现在的目标是什么？" className="w-full bg-gray-900 rounded px-2 py-1.5 border border-gray-700 text-sm focus:border-pink-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">System Instruction (高阶设定)</label>
                            <textarea value={generatedCharacter.systemInstruction} onChange={e => updateCharacter('systemInstruction', e.target.value)} className="w-full bg-gray-900 rounded px-2 py-1.5 border border-gray-700 text-xs font-mono focus:border-pink-500 outline-none h-24 resize-none" />
                        </div>
                     </>
                 )}

                 {activeTab === 'visuals' && (
                     <div className="space-y-6">
                         {/* Avatar Upload */}
                         <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                             <div className="flex justify-between items-center mb-2">
                                 <span className="text-xs font-bold text-gray-400">角色头像</span>
                                 <div className="flex gap-2">
                                     <button onClick={() => handleGetPrompt('avatar')} className="text-[10px] text-pink-400 hover:text-pink-300">复制 Prompt</button>
                                     <button onClick={() => avatarInputRef.current?.click()} className="text-[10px] bg-gray-700 px-2 py-1 rounded hover:bg-gray-600">上传</button>
                                 </div>
                             </div>
                             <input type="file" ref={avatarInputRef} onChange={e => handleFileUpload('avatar', e)} accept="image/*" className="hidden" />
                             <div className="flex justify-center">
                                 <img src={generatedCharacter.avatarUrl} className="h-32 object-contain rounded" />
                             </div>
                         </div>

                         {/* Background Upload */}
                         <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                             <div className="flex justify-between items-center mb-2">
                                 <span className="text-xs font-bold text-gray-400">背景场景</span>
                                 <div className="flex gap-2">
                                     <button onClick={() => handleGetPrompt('background')} className="text-[10px] text-pink-400 hover:text-pink-300">复制 Prompt</button>
                                     <button onClick={() => bgInputRef.current?.click()} className="text-[10px] bg-gray-700 px-2 py-1 rounded hover:bg-gray-600">上传</button>
                                 </div>
                             </div>
                             <input type="file" ref={bgInputRef} onChange={e => handleFileUpload('background', e)} accept="image/*" className="hidden" />
                             <div className="flex justify-center">
                                 <img src={generatedCharacter.backgroundUrl} className="h-32 w-full object-cover rounded" />
                             </div>
                         </div>
                     </div>
                 )}
             </div>
          </div>
      );
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="mb-4">
            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
            {initialCharacter ? '角色编辑器' : '角色构造器'}
            </h3>
            <p className="text-sm text-gray-400">
                {initialCharacter ? '微调TA的灵魂设定。' : `为时代 “${scene.name}” 注入新的灵魂。`}
            </p>
        </div>
        
        {!generatedCharacter && (
            <div className="flex-1 space-y-4">
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
                    {isLoading ? (<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />正在构思中...</>) : (<>✨ AI 生成设定 (不含图)</>)}
                </Button>
                {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            </div>
        )}

        {generatedCharacter && !isLoading && renderEditor()}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700/50 mt-4 shrink-0">
            <Button variant="ghost" onClick={onClose} disabled={isLoading}>取消</Button>
            <Button onClick={handleSave} disabled={isLoading || !generatedCharacter}>
                {initialCharacter ? '保存修改' : '添加到时代'}
            </Button>
        </div>
      </div>
    </div>
  );
};