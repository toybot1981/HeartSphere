import React, { useState, useEffect } from 'react';
import { CustomScenario, StoryNode, StoryOption } from '../types';
import { Button } from '../components/Button';
import { geminiService } from '../services/gemini';

interface MobileScenarioBuilderProps {
  initialScenario?: CustomScenario | null;
  onSave: (scenario: CustomScenario) => void;
  onCancel: () => void;
}

export const MobileScenarioBuilder: React.FC<MobileScenarioBuilderProps> = ({ initialScenario, onSave, onCancel }) => {
  // Scenario State
  const [title, setTitle] = useState('我的新剧本');
  const [description, setDescription] = useState('一段浪漫的冒险...');
  const [nodes, setNodes] = useState<Record<string, StoryNode>>({
    'start': { id: 'start', title: '开场', prompt: '描述开场场景...', options: [] }
  });
  
  // UI State
  const [activeTab, setActiveTab] = useState<'basic' | 'nodes'>('basic');
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [showMagicModal, setShowMagicModal] = useState(false);
  const [magicPrompt, setMagicPrompt] = useState('');
  const [isMagicLoading, setIsMagicLoading] = useState(false);

  useEffect(() => {
    if (initialScenario) {
      setTitle(initialScenario.title);
      setDescription(initialScenario.description);
      setNodes(initialScenario.nodes);
    }
  }, [initialScenario]);

  // --- Logic ---

  const addNode = () => {
    const id = `node_${Date.now()}`;
    setNodes({ ...nodes, [id]: { id, title: '新场景', prompt: '', options: [] } });
    setEditingNodeId(id);
  };

  const updateNode = (id: string, field: keyof StoryNode, value: any) => {
    setNodes(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const addOption = (nodeId: string) => {
    const node = nodes[nodeId];
    const newOption: StoryOption = { id: `opt_${Date.now()}`, text: '新选项', nextNodeId: 'start' };
    updateNode(nodeId, 'options', [...node.options, newOption]);
  };

  const updateOption = (nodeId: string, optIdx: number, field: keyof StoryOption, value: string) => {
    const node = nodes[nodeId];
    const newOpts = [...node.options];
    newOpts.splice(optIdx, 1);
    updateNode(nodeId, 'options', newOpts);
  };

  const deleteOption = (nodeId: string, optIdx: number) => {
    const node = nodes[nodeId];
    const newOpts = [...node.options];
    newOpts.splice(optIdx, 1);
    updateNode(nodeId, 'options', newOpts);
  };

  const deleteNode = (nodeId: string) => {
      if (nodeId === 'start') {
          alert("无法删除起始节点");
          return;
      }
      if (confirm("确定删除此节点吗？")) {
          const newNodes = { ...nodes };
          delete newNodes[nodeId];
          setNodes(newNodes);
          setEditingNodeId(null);
      }
  };

  const handleSave = () => {
    // Check if startNodeId exists in nodes
    let finalStartId = initialScenario?.startNodeId || 'start';
    if (!nodes[finalStartId]) {
        // Fallback to first available node if 'start' or saved ID is invalid
        finalStartId = Object.keys(nodes)[0] || 'start';
    }

    const scenario: CustomScenario = {
      id: initialScenario ? initialScenario.id : `scenario_${Date.now()}`,
      sceneId: initialScenario?.sceneId || '',
      title,
      description,
      nodes,
      startNodeId: finalStartId,
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
        setShowMagicModal(false);
        setActiveTab('nodes');
      }
    } catch (e) {
      alert("生成失败，请重试。");
    } finally {
      setIsMagicLoading(false);
    }
  };

  // --- Render Node Editor (Full Screen Overlay) ---
  const renderNodeEditor = () => {
      if (!editingNodeId) return null;
      const node = nodes[editingNodeId];
      if (!node) return null;

      return (
          <div className="absolute inset-0 z-20 bg-slate-900 flex flex-col animate-fade-in">
              <div className="p-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur-md">
                  <button onClick={() => setEditingNodeId(null)} className="text-slate-400 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                      返回
                  </button>
                  <h3 className="font-bold text-white truncate max-w-[150px]">{node.title}</h3>
                  <button onClick={() => deleteNode(node.id)} className="text-red-400 text-sm">删除</button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  <div>
                      <label className="text-xs text-slate-500 font-bold mb-1 block">节点标题 (内部标识)</label>
                      <input 
                        value={node.title} 
                        onChange={(e) => updateNode(node.id, 'title', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none"
                      />
                  </div>

                  <div>
                      <label className="text-xs text-indigo-400 font-bold mb-1 block">AI 剧情指令 (Prompt)</label>
                      <p className="text-[10px] text-slate-500 mb-2">描述这一幕发生的事情，AI将据此生成旁白。</p>
                      <textarea 
                        value={node.prompt} 
                        onChange={(e) => updateNode(node.id, 'prompt', e.target.value)}
                        className="w-full h-40 bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:border-indigo-500 outline-none resize-none leading-relaxed"
                        placeholder="例如：樱有些害羞地低下了头，递给你一封信..."
                      />
                  </div>

                  <div>
                      <div className="flex justify-between items-center mb-3">
                          <label className="text-xs text-green-400 font-bold">分支选项</label>
                          <button onClick={() => addOption(node.id)} className="text-[10px] bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-500/30">+ 添加选项</button>
                      </div>
                      
                      <div className="space-y-3">
                          {node.options.map((opt, idx) => (
                              <div key={opt.id} className="bg-slate-800 p-3 rounded-xl border border-slate-700 space-y-3">
                                  <div className="flex justify-between items-start">
                                      <span className="text-[10px] text-slate-500 rounded bg-slate-900 px-1">选项 {idx + 1}</span>
                                      <button onClick={() => deleteOption(node.id, idx)} className="text-slate-600 hover:text-red-400">×</button>
                                  </div>
                                  <input 
                                    value={opt.text} 
                                    onChange={(e) => updateOption(node.id, idx, 'text', e.target.value)}
                                    placeholder="按钮文字"
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-green-500 outline-none"
                                  />
                                  <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-slate-500 shrink-0">跳转至 &rarr;</span>
                                      <select 
                                        value={opt.nextNodeId}
                                        onChange={(e) => updateOption(node.id, idx, 'nextNodeId', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white outline-none"
                                      >
                                          {Object.values(nodes).map((n: StoryNode) => (
                                              <option key={n.id} value={n.id}>{n.title}</option>
                                          ))}
                                      </select>
                                  </div>
                              </div>
                          ))}
                          {node.options.length === 0 && (
                              <div className="text-center text-xs text-slate-600 py-2 border-2 border-dashed border-slate-800 rounded-xl">无分支（剧情结束）</div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="h-full bg-black text-white flex flex-col relative overflow-hidden">
      
      {/* Header */}
      <div className="p-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-white/10 flex justify-between items-center bg-black/80 backdrop-blur-md z-10">
          <button onClick={onCancel} className="text-slate-400">取消</button>
          <h2 className="font-bold text-lg">剧本编辑器</h2>
          <button onClick={handleSave} className="text-pink-500 font-bold">保存</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-black">
          <button 
            onClick={() => setActiveTab('basic')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'basic' ? 'text-white border-b-2 border-pink-500' : 'text-slate-500'}`}
          >
              基本设定
          </button>
          <button 
            onClick={() => setActiveTab('nodes')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'nodes' ? 'text-white border-b-2 border-indigo-500' : 'text-slate-500'}`}
          >
              剧情节点 ({Object.keys(nodes).length})
          </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
          
          {/* Basic Tab */}
          {activeTab === 'basic' && (
              <div className="space-y-6">
                  <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-white/10 p-4 rounded-2xl flex flex-col items-center text-center space-y-3">
                      <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-2xl">✨</div>
                      <div>
                          <h3 className="font-bold text-white">AI 灵感生成</h3>
                          <p className="text-xs text-slate-400 mt-1">输入你的想法，AI为你构建完整剧本</p>
                      </div>
                      <Button onClick={() => setShowMagicModal(true)} className="bg-white/10 hover:bg-white/20 border border-white/20 text-sm py-2 px-6 rounded-full w-full">
                          打开 AI 生成器
                      </Button>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className="text-xs text-slate-500 font-bold mb-1 block">剧本标题</label>
                          <input 
                            value={title} 
                            onChange={e => setTitle(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none font-bold"
                          />
                      </div>
                      <div>
                          <label className="text-xs text-slate-500 font-bold mb-1 block">简介</label>
                          <textarea 
                            value={description} 
                            onChange={e => setDescription(e.target.value)}
                            className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-pink-500 outline-none resize-none"
                          />
                      </div>
                  </div>
              </div>
          )}

          {/* Nodes Tab */}
          {activeTab === 'nodes' && (
              <div className="space-y-4 pb-20">
                  <div className="flex justify-between items-center mb-2">
                      <p className="text-xs text-slate-500">点击节点进行编辑</p>
                      <button onClick={addNode} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-full shadow-lg">+ 新增节点</button>
                  </div>
                  
                  {Object.values(nodes).map((node: StoryNode, index) => (
                      <div 
                        key={node.id} 
                        onClick={() => setEditingNodeId(node.id)}
                        className={`p-4 rounded-xl border cursor-pointer active:scale-95 transition-all ${
                            node.id === 'start' ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-slate-900 border-slate-800'
                        }`}
                      >
                          <div className="flex justify-between items-center mb-1">
                              <h4 className="font-bold text-white flex items-center gap-2">
                                  {node.id === 'start' && <span className="text-[10px] bg-indigo-500 text-white px-1.5 rounded">START</span>}
                                  {node.title}
                              </h4>
                              <span className="text-slate-600 text-lg">&rsaquo;</span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1">{node.prompt || '暂无内容...'}</p>
                          <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
                              {node.options.map(opt => (
                                  <span key={opt.id} className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded text-slate-300 whitespace-nowrap">
                                      {opt.text} &rarr;
                                  </span>
                              ))}
                              {node.options.length === 0 && <span className="text-[10px] text-slate-600">END</span>}
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* Editor Drawer */}
      {editingNodeId && renderNodeEditor()}

      {/* Magic Modal */}
      {showMagicModal && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
              <div className="w-full bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-2xl">
                  <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400 mb-4">AI 创意生成</h3>
                  <textarea 
                    value={magicPrompt}
                    onChange={e => setMagicPrompt(e.target.value)}
                    placeholder="输入一个故事想法，例如：“在深夜的便利店遇到了前女友，但她似乎不记得我了...”"
                    className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-4 text-white outline-none resize-none mb-6"
                  />
                  <div className="flex gap-3">
                      <Button variant="ghost" onClick={() => setShowMagicModal(false)} disabled={isMagicLoading} className="flex-1">取消</Button>
                      <Button onClick={handleMagicBuild} disabled={isMagicLoading || !magicPrompt.trim()} className="flex-1 bg-indigo-600">
                          {isMagicLoading ? '生成中...' : '开始生成'}
                      </Button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};