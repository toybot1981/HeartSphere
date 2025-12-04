import React, { useState } from 'react';
import { WorldScene } from '../types';
import { geminiService } from '../services/gemini';
import { Button } from './Button';

interface EraConstructorModalProps {
  onSave: (scene: WorldScene) => void;
  onClose: () => void;
}

export const EraConstructorModal: React.FC<EraConstructorModalProps> = ({ onSave, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleSave = () => {
    if (!name || !description || !imageUrl) {
        setError('请填写所有字段并生成封面图片。');
        return;
    }
    const newScene: WorldScene = {
        id: `custom_era_${Date.now()}`,
        name,
        description,
        imageUrl,
        characters: [],
    };
    onSave(newScene);
  };

  const isSaveDisabled = !name || !description || !imageUrl || isLoading;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-6">
        <div>
            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
            时代构造器
            </h3>
            <p className="text-sm text-gray-400">创建你心驰神往的任何世界。</p>
        </div>
        
        <div className="space-y-4">
             <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="时代名称 (例如：我的高中时代)"
                className="w-full text-lg font-bold bg-white/5 border-2 border-white/10 rounded-lg py-2 px-4 text-white placeholder-white/40 focus:border-pink-400 focus:ring-0 outline-none transition-colors"
              />
               <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简单描述这个时代 (例如：一个充满了夏日、蝉鸣和做不完的试卷的年代)"
                className="w-full bg-white/5 border-2 border-white/10 rounded-lg py-2 px-4 text-white placeholder-white/40 focus:border-pink-400 focus:ring-0 outline-none transition-colors resize-none h-24"
              />
        </div>

        <div className="flex items-start gap-4">
            <div className="w-1/3 h-48 rounded-lg bg-black/30 border border-dashed border-gray-600 flex items-center justify-center overflow-hidden">
               {isLoading && !imageUrl && <div className="w-8 h-8 border-4 border-t-transparent border-pink-400 rounded-full animate-spin" />}
               {imageUrl && <img src={imageUrl} alt="Generated Cover" className="w-full h-full object-cover" />}
               {!isLoading && !imageUrl && <span className="text-xs text-gray-500 text-center">封面预览</span>}
            </div>
            <div className="flex-1 space-y-3">
                <p className="text-sm text-gray-300">然后，让AI为你的时代绘制一幅独特的封面吧！</p>
                <Button onClick={handleGenerateImage} disabled={isLoading} fullWidth className="bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center">
                    {isLoading ? (<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />正在绘制...</>) : (<>✨ AI 生成封面</>)}
                </Button>
            </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700/50">
            <Button variant="ghost" onClick={onClose}>取消</Button>
            <Button onClick={handleSave} disabled={isSaveDisabled}>
                创建时代
            </Button>
        </div>
      </div>
    </div>
  );
};