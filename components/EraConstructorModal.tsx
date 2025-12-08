
import React, { useState, useRef, useEffect } from 'react';
import { WorldScene } from '../types';
import { geminiService } from '../services/gemini';
import { Button } from './Button';

interface EraConstructorModalProps {
  initialScene?: WorldScene | null; // Optional: If provided, we are editing
  onSave: (scene: WorldScene) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export const EraConstructorModal: React.FC<EraConstructorModalProps> = ({ initialScene, onSave, onDelete, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Image Source Mode: 'generate' | 'upload'
  const [imageMode, setImageMode] = useState<'generate' | 'upload'>('generate');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill data if editing
  useEffect(() => {
    if (initialScene) {
        setName(initialScene.name);
        setDescription(initialScene.description);
        setImageUrl(initialScene.imageUrl);
        // If it looks like a base64 upload (long string), default to upload mode, otherwise generate mode
        if (initialScene.imageUrl.startsWith('data:')) {
            setImageMode('upload');
        }
    }
  }, [initialScene]);

  const handleGenerateImage = async () => {
    if (!name || !description) {
        setError('请先填写时代名称和简介，以便AI更好地创作封面。');
        return;
    }
    setError('');
    setIsLoading(true);
    try {
        const prompt = `A beautiful, high-quality vertical anime world illustration for a world named "${name}". The theme is: "${description}". Style: Modern Chinese Anime (Manhua), cinematic lighting, vibrant, epic feel.`;
        const generatedImage = await geminiService.generateImageFromPrompt(prompt, '3:4');
        if (generatedImage) {
            setImageUrl(generatedImage);
        } else {
            setError('图片生成失败，请重试。');
        }
    } catch (e) {
        console.error(e);
        setError('图片生成时发生网络错误，请稍后重试。');
    } finally {
        setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            setImageUrl(result);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!imageUrl || imageMode !== 'upload') return;
    
    setIsLoading(true);
    try {
        const analysis = await geminiService.analyzeImageForEra(imageUrl);
        if (analysis) {
            setName(analysis.name);
            setDescription(analysis.description);
        } else {
            setError("无法解析图片，请手动填写。");
        }
    } catch(e) {
        setError("AI 解析失败，请重试。");
    } finally {
        setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!name || !description || !imageUrl) {
        setError('请填写所有字段并设置封面图片。');
        return;
    }
    
    // If editing, keep the original ID. If new, generate ID.
    const newScene: WorldScene = {
        id: initialScene ? initialScene.id : `custom_era_${Date.now()}`,
        name,
        description,
        imageUrl,
        characters: initialScene ? initialScene.characters : [], // Preserve characters if editing
        mainStory: initialScene ? initialScene.mainStory : undefined
    };
    onSave(newScene);
  };

  const isSaveDisabled = !name || !description || !imageUrl || isLoading;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-6">
        <div>
            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
            {initialScene ? '编辑时代' : '时代构造器'}
            </h3>
            <p className="text-sm text-gray-400">{initialScene ? '修改这个世界的设定。' : '创造、回忆或重返任何一个时空。'}</p>
        </div>

        {/* Image Section First (To drive the context) */}
        <div className="space-y-3">
             <div className="flex gap-4 border-b border-gray-700 pb-2">
                <button 
                  onClick={() => setImageMode('generate')}
                  className={`text-sm font-bold pb-2 transition-colors ${imageMode === 'generate' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-gray-500 hover:text-white'}`}
                >
                    AI 绘制封面
                </button>
                <button 
                  onClick={() => setImageMode('upload')}
                  className={`text-sm font-bold pb-2 transition-colors ${imageMode === 'upload' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-gray-500 hover:text-white'}`}
                >
                    上传影像记忆
                </button>
             </div>

             <div className="flex items-start gap-4">
                <div 
                    onClick={() => imageMode === 'upload' && fileInputRef.current?.click()}
                    className={`w-1/3 h-48 rounded-lg bg-black/30 border border-dashed flex items-center justify-center overflow-hidden transition-all ${imageMode === 'upload' ? 'cursor-pointer hover:border-pink-500 border-gray-600' : 'border-gray-700'}`}
                >
                   {isLoading && !imageUrl && imageMode === 'generate' && <div className="w-8 h-8 border-4 border-t-transparent border-pink-400 rounded-full animate-spin" />}
                   
                   {imageUrl ? (
                       <img src={imageUrl} alt="Cover" className="w-full h-full object-cover" />
                   ) : (
                       <div className="text-center p-2">
                           {imageMode === 'generate' ? (
                               <span className="text-xs text-gray-500">等待生成...</span>
                           ) : (
                               <div className="flex flex-col items-center text-gray-400">
                                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                   </svg>
                                   <span className="text-xs">点击上传</span>
                               </div>
                           )}
                       </div>
                   )}
                </div>
                
                <div className="flex-1 space-y-3 flex flex-col justify-center h-48">
                    {imageMode === 'generate' ? (
                        <>
                           <p className="text-xs text-gray-400">先填写下方描述，然后让AI为你绘制想象中的世界。</p>
                           <Button onClick={handleGenerateImage} disabled={isLoading || !name || !description} className="bg-indigo-600 hover:bg-indigo-500 text-sm">
                                {isLoading ? '绘制中...' : '✨ AI 生成封面'}
                           </Button>
                        </>
                    ) : (
                        <>
                           <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                           <p className="text-xs text-gray-400">上传一张老照片、海报或风景照。AI 可以帮你解析其中的记忆。</p>
                           {imageUrl && (
                               <Button onClick={handleAnalyzeImage} disabled={isLoading} className="bg-gradient-to-r from-pink-600 to-purple-600 text-sm">
                                   {isLoading ? '解析中...' : '🧠 解析影像记忆'}
                               </Button>
                           )}
                           {!imageUrl && <p className="text-xs text-gray-600">请先上传图片...</p>}
                        </>
                    )}
                </div>
            </div>
        </div>
        
        <div className="space-y-4">
             <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={imageMode === 'upload' ? "时代/事件名称 (例如：98年法兰西之夏)" : "时代名称 (例如：我的赛博梦境)"}
                className="w-full text-lg font-bold bg-white/5 border-2 border-white/10 rounded-lg py-2 px-4 text-white placeholder-white/40 focus:border-pink-400 focus:ring-0 outline-none transition-colors"
              />
               <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={imageMode === 'upload' ? "描述这个瞬间给你的感觉，或让AI帮你解析..." : "描述这个世界的设定..."}
                className="w-full bg-white/5 border-2 border-white/10 rounded-lg py-2 px-4 text-white placeholder-white/40 focus:border-pink-400 focus:ring-0 outline-none transition-colors resize-none h-24 scrollbar-hide"
              />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700/50">
            {initialScene && onDelete && (
                <Button variant="ghost" onClick={onDelete} className="mr-auto text-red-400 hover:text-red-300 hover:bg-red-900/20">
                    删除时代
                </Button>
            )}
            <Button variant="ghost" onClick={onClose}>取消</Button>
            <Button onClick={handleSave} disabled={isSaveDisabled}>
                {imageMode === 'upload' ? '封存记忆' : initialScene ? '保存修改' : '创建时代'}
            </Button>
        </div>
      </div>
    </div>
  );
};
