
import React, { useState, useEffect } from 'react';
import { CustomScenario, StoryNode, StoryOption } from '../types';
import { Button } from './Button';
import { geminiService } from '../services/gemini';

interface ScenarioBuilderProps {
  initialScenario?: CustomScenario | null;
  onSave: (scenario: CustomScenario) => void;
  onCancel: () => void;
}

export const ScenarioBuilder: React.FC<ScenarioBuilderProps> = ({ initialScenario, onSave, onCancel }) => {
  const [title, setTitle] = useState('我的新剧本');
  const [description, setDescription] = useState('一段浪漫的冒险...');
  
  const [nodes, setNodes] = useState<Record<string, StoryNode>>({
    'start': { id: 'start', title: '开场场景', prompt: '描述一个阳光明媚的大学早晨。介绍樱向用户跑来的场景。', options: [] }
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string>('start');
  
  const [showMagicModal, setShowMagicModal] = useState(false);
  const [magicPrompt, setMagicPrompt] = useState('');
  const [isMagicLoading, setIsMagicLoading] = useState(false);

  useEffect(() => {
    if (initialScenario) {
      setTitle(initialScenario.title);
      setDescription(initialScenario.description);
      setNodes(initialScenario.nodes);
      setSelectedNodeId(initialScenario.startNodeId);
    }
  }, [initialScenario]);

  const currentNode = nodes[selectedNodeId];

  const addNode = () => {
    const id = `node_${Date.now()}`;
    setNodes({ ...nodes, [id]: { id, title: '新场景', prompt: '描述接下来发生了什么...', options: [] } });
    setSelectedNodeId(id);
  };

  const updateNode = (field: keyof StoryNode, value: any) => {
    setNodes({ ...nodes, [selectedNodeId]: { ...nodes[selectedNodeId], [field]: value } });
  };

  const addOption = () => {
    const newOption: StoryOption = { id: `opt_${Date.now()}`, text: '新选项', nextNodeId: 'start' };
    updateNode('options', [...currentNode.options, newOption]);
  };

  const updateOption = (idx: number, field: keyof StoryOption, value: string) => {
    const newOpts = [...currentNode.options];
    newOpts[idx] = { ...newOpts[idx], [field]: value };
    updateNode('options', newOpts);
  };

  const deleteOption = (idx: number) => {
    const newOpts = [...currentNode.options];
    newOpts.splice(idx, 1);
    updateNode('options', newOpts);
  };

  const handleSave = () => {
    const scenario: CustomScenario = {
      id: initialScenario ? initialScenario.id : `scenario_${Date.now()}`,
      sceneId: initialScenario?.sceneId || '',
      title,
      description,
      nodes,
      startNodeId: Object.keys(nodes).includes(initialScenario?.startNodeId || 'start') ? (initialScenario?.startNodeId || 'start') : Object.keys(nodes)[0],
      author: initialScenario ? initialScenario.author : 'User',
    };
    onSave(scenario);
  };

  const handleMagicBuild = async () => {
    if (!magicPrompt.trim()) return;
    setIsMagicLoading(true);
    try {
      const scenario = await geminiService.generateScenarioFromPrompt(magicPrompt);
      if (scenario) {
        setTitle(scenario.title);
        setDescription(scenario.description);
        setNodes(scenario.nodes);
        setSelectedNodeId(scenario.startNodeId);
        setShowMagicModal(false);
      }
    } catch (e: any) {
      console.error(e);
      let errorMsg = "生成失败，请稍后重试。";
      if (e?.status === 429 || e?.message?.includes('429') || e?.message?.includes('quota') || e?.message?.includes('RESOURCE_EXHAUSTED')) {
          errorMsg = "API 配额已耗尽或请求过于频繁 (429)。请在设置中检查您的 API Key，或稍作休息后重试。";
      } else if (e?.message?.includes('API config missing')) {
          errorMsg = "未配置 API Key。请前往设置 > AI 模型，输入您选择的模型的 API Key。";
      }
      alert(errorMsg);
    } finally {
      setIsMagicLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white relative">
      {showMagicModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-fade-in">
            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400 mb-4">AI 一键生成剧本</h3>
            <p className="text-sm text-gray-400 mb-4">输入一个简单的想法（例如：“一个关于在闹鬼的图书馆里寻找丢失书籍的恐怖故事”），AI 将为您构建完整的剧情分支。</p>
            <textarea value={magicPrompt} onChange={e => setMagicPrompt(e.target.value)} placeholder="在这里输入你的创意..." className="w-full h-32 bg-gray-900 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-600 focus:border-indigo-500 outline-none resize-none mb-6" disabled={isMagicLoading} />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowMagicModal(false)} disabled={isMagicLoading}>取消</Button>
              <Button onClick={handleMagicBuild} disabled={isMagicLoading || !magicPrompt.trim()} className="bg-indigo-600 hover:bg-indigo-500 flex items-center">
                {isMagicLoading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />正在构思中...</>) : (<>✨ 开始生成</>)}
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="p-4 border-b border-gray-800 bg-gray-900 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">剧本编辑器</h2>
          <p className="text-xs text-gray-500">{initialScenario ? `正在编辑: ${initialScenario.title}` : '设计属于你的命运流程。'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowMagicModal(true)} className="border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/10">✨ AI 一键生成</Button>
          <div className="w-px h-8 bg-gray-800 mx-1"></div>
          <Button variant="ghost" onClick={onCancel}>取消</Button>
          <Button onClick={handleSave} className="bg-pink-600 hover:bg-pink-500">保存剧本</Button>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/4 min-w-[250px] border-r border-gray-800 p-4 overflow-y-auto bg-gray-900/50">
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-xs text-gray-400 mb-1">剧本标题</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-gray-800 rounded px-3 py-2 border border-gray-700 text-sm focus:border-pink-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">简介</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-gray-800 rounded px-3 py-2 border border-gray-700 text-sm focus:border-pink-500 outline-none h-20 resize-none" />
            </div>
          </div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-300">剧情节点</h3>
            <button onClick={addNode} className="text-xs bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded">+ 添加</button>
          </div>
          <div className="space-y-2">
            {Object.values(nodes).map((node: StoryNode) => (
              <div key={node.id} onClick={() => setSelectedNodeId(node.id)} className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedNodeId === node.id ? 'bg-pink-500/20 border-pink-500' : 'bg-gray-800 border-transparent hover:border-gray-600'}`}>
                <div className="font-medium text-sm truncate">{node.title}</div>
                <div className="text-xs text-gray-500">{node.options.length} 个分支</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 p-8 overflow-y-auto bg-gray-900">
          {currentNode ? (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center font-bold text-lg">{Object.keys(nodes).indexOf(selectedNodeId) + 1}</div>
               <div className="flex-1">
                 <label className="block text-xs text-gray-400 mb-1">节点标题 (内部标识)</label>
                 <input value={currentNode.title} onChange={e => updateNode('title', e.target.value)} className="w-full bg-gray-800 rounded px-3 py-2 border border-gray-700 focus:border-pink-500 outline-none font-bold text-lg" />
               </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-indigo-400 mb-2">AI 旁白提示词 (Prompt)</label>
              <p className="text-xs text-gray-500 mb-2">描述这一幕会发生什么。AI 将根据此生成对话和旁白。</p>
              <textarea value={currentNode.prompt} onChange={e => updateNode('prompt', e.target.value)} className="w-full bg-gray-800 rounded-xl p-4 border border-gray-700 focus:border-indigo-500 outline-none h-40 resize-none leading-relaxed" placeholder="例如：用户在咖啡馆遇到了樱。她正在喝拿铁，看起来对考试很担心……" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-bold text-green-400">玩家选项 (分支)</label>
                <button onClick={addOption} className="text-xs bg-green-900/50 text-green-400 px-3 py-1 rounded hover:bg-green-900">+ 添加选项</button>
              </div>
              {currentNode.options.length === 0 ? (
                <div className="p-4 border border-dashed border-gray-700 rounded-xl text-center text-gray-500 text-sm">未定义选项。故事将在此结束。</div>
              ) : (
                <div className="space-y-3">
                  {currentNode.options.map((opt, idx) => (
                    <div key={opt.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex gap-4 items-start">
                      <div className="flex-1 space-y-2">
                        <div>
                          <label className="text-xs text-gray-500">按钮文本</label>
                          <input value={opt.text} onChange={e => updateOption(idx, 'text', e.target.value)} className="w-full bg-gray-900 rounded px-2 py-1 border border-gray-700 text-sm" placeholder="例如：询问她考试的事" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">跳转至节点</label>
                          <select value={opt.nextNodeId} onChange={e => updateOption(idx, 'nextNodeId', e.target.value)} className="w-full bg-gray-900 rounded px-2 py-1 border border-gray-700 text-sm">
                            {Object.values(nodes).map((n: StoryNode) => (<option key={n.id} value={n.id}>{n.title}</option>))}
                          </select>
                        </div>
                      </div>
                      <button onClick={() => deleteOption(idx)} className="text-gray-500 hover:text-red-500 mt-6"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          ) : ( <div className="text-center text-gray-500 mt-20">请在左侧选择或创建一个节点</div> )}
        </div>
      </div>
    </div>
  );
};