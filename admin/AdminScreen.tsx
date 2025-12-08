
import React, { useState, useEffect } from 'react';
import { AppSettings, GameState, AIProvider, WorldScene, Character, CustomScenario } from '../types';
import { Button } from '../components/Button';
import { WORLD_SCENES } from '../constants';

interface AdminScreenProps {
    gameState: GameState;
    onUpdateGameState: (newState: GameState) => void;
    onResetWorld: () => void;
    onBack: () => void;
}

// --- UI Components for Admin Panel ---

const AdminSidebarItem: React.FC<{ label: string; icon: string; active: boolean; onClick: () => void }> = ({ label, icon, active, onClick }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${
            active 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 border-r-4 border-white' 
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
        }`}
    >
        <span className="text-lg">{icon}</span>
        {label}
    </button>
);

const AdminHeader: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
    <div className="h-16 bg-slate-900 border-b border-slate-700 flex justify-between items-center px-6 shrink-0">
        <h2 className="text-lg font-bold text-slate-100">{title}</h2>
        <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded border border-slate-700">Admin Mode</span>
            <button onClick={onBack} className="text-slate-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                退出后台
            </button>
        </div>
    </div>
);

const InputGroup: React.FC<{ label: string; subLabel?: string; children: React.ReactNode }> = ({ label, subLabel, children }) => (
    <div className="mb-4">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
        {subLabel && <p className="text-[10px] text-slate-500 mb-2">{subLabel}</p>}
        {children}
    </div>
);

const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input 
        {...props} 
        className={`w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all ${props.className}`}
    />
);

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
    <textarea 
        {...props} 
        className={`w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none ${props.className}`}
    />
);

const ConfigSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-6 bg-slate-900/50 p-4 rounded-lg border border-slate-700">
        <h4 className="text-sm font-bold text-indigo-300 border-b border-indigo-500/20 pb-2 mb-4 uppercase tracking-widest">{title}</h4>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

// --- MAIN COMPONENT ---

export const AdminScreen: React.FC<AdminScreenProps> = ({ gameState, onUpdateGameState, onResetWorld, onBack }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    
    // Navigation
    const [activeSection, setActiveSection] = useState<'dashboard' | 'eras' | 'characters' | 'scenarios' | 'settings'>('dashboard');
    const [settingsTab, setSettingsTab] = useState<'general' | 'models'>('models');
    
    // CRUD State
    const [viewMode, setViewMode] = useState<'list' | 'edit' | 'create'>('list');
    const [editingId, setEditingId] = useState<string | null>(null);
    
    // Form Data Holders
    const [formData, setFormData] = useState<any>({});

    const handleLogin = () => {
        if (password === 'admin' || password === 'heartsphere') setIsAuthenticated(true);
    };

    // --- CRUD Logic Wrappers ---

    const switchToCreate = () => {
        setFormData({});
        setEditingId(null);
        setViewMode('create');
    };

    const switchToEdit = (item: any) => {
        // Create a deep copy to avoid mutating the original object directly
        setFormData(JSON.parse(JSON.stringify(item)));
        setEditingId(item.id);
        setViewMode('edit');
    };

    const switchToList = () => {
        setViewMode('list');
        setEditingId(null);
        setFormData({});
    };

    // --- Era (Scene) Management ---
    
    const saveEra = () => {
        // If editing a built-in scene (checked by ID presence in WORLD_SCENES), we must generate a new ID
        // unless the user explicitly wants to "shadow" it (which can be complex).
        // For simplicity: saving a built-in creates a custom copy.
        const isBuiltIn = WORLD_SCENES.some(s => s.id === editingId);
        const finalId = isBuiltIn ? `custom_${editingId}_${Date.now()}` : (editingId || `scene_${Date.now()}`);

        const newScene: WorldScene = {
            id: finalId,
            name: formData.name || '未命名时代',
            description: formData.description || '',
            imageUrl: formData.imageUrl || 'https://picsum.photos/seed/default/800/1200',
            characters: formData.characters || [],
            mainStory: formData.mainStory
        };

        let updatedScenes = [...gameState.customScenes];
        
        // If we are editing an existing custom scene
        if (editingId && !isBuiltIn) {
            updatedScenes = updatedScenes.map(s => s.id === editingId ? newScene : s);
        } else {
            // New creation or cloning built-in
            updatedScenes.push(newScene);
        }

        onUpdateGameState({ ...gameState, customScenes: updatedScenes });
        switchToList();
    };

    const deleteEra = (id: string) => {
        if (window.confirm('删除此时代将同时删除其下属的所有自定义角色。确定继续吗？')) {
            const updatedScenes = gameState.customScenes.filter(s => s.id !== id);
            const updatedChars = { ...gameState.customCharacters };
            delete updatedChars[id];
            onUpdateGameState({ ...gameState, customScenes: updatedScenes, customCharacters: updatedChars });
        }
    };

    // --- Character Management ---

    const saveCharacter = () => {
        const targetSceneId = formData.targetSceneId || WORLD_SCENES[0].id;
        
        // Check if source was built-in
        let isBuiltIn = false;
        for (const s of WORLD_SCENES) {
            if (s.characters.some(c => c.id === editingId)) {
                isBuiltIn = true; 
                break;
            }
        }

        const finalId = isBuiltIn ? `custom_${editingId}_${Date.now()}` : (editingId || `char_${Date.now()}`);

        const newChar: Character = {
            id: finalId,
            name: formData.name || '新角色',
            age: parseInt(formData.age) || 20,
            role: formData.role || '未定义',
            bio: formData.bio || '',
            avatarUrl: formData.avatarUrl || 'https://picsum.photos/seed/avatar/400/600',
            backgroundUrl: formData.backgroundUrl || 'https://picsum.photos/seed/bg/1080/1920',
            systemInstruction: formData.systemInstruction || 'You are a helpful assistant.',
            themeColor: formData.themeColor || 'indigo-500',
            colorAccent: formData.colorAccent || '#6366f1',
            firstMessage: formData.firstMessage || '你好。',
            voiceName: formData.voiceName || 'Kore',
            // Deep Personality
            mbti: formData.mbti,
            tags: formData.tags ? (typeof formData.tags === 'string' ? formData.tags.split(',') : formData.tags) : [],
            speechStyle: formData.speechStyle,
            catchphrases: formData.catchphrases ? (typeof formData.catchphrases === 'string' ? formData.catchphrases.split(',') : formData.catchphrases) : [],
            secrets: formData.secrets,
            motivations: formData.motivations,
            relationships: formData.relationships
        };

        // Logic: Add to customCharacters map. 
        let updatedCustomChars = { ...gameState.customCharacters };
        
        // Remove from old location if we are strictly editing a custom character
        // (If it was built-in, we don't delete the built-in, we just add a new custom one)
        if (editingId && !isBuiltIn) {
            Object.keys(updatedCustomChars).forEach(sId => {
                updatedCustomChars[sId] = updatedCustomChars[sId].filter(c => c.id !== editingId);
            });
        }

        // Add to target scene
        const targetList = updatedCustomChars[targetSceneId] || [];
        updatedCustomChars[targetSceneId] = [...targetList, newChar];

        onUpdateGameState({ ...gameState, customCharacters: updatedCustomChars });
        switchToList();
    };

    const deleteCharacter = (charId: string) => {
        if (!window.confirm('确定删除此角色吗？(内置角色无法被物理删除，只能删除其自定义副本)')) return;
        let updatedCustomChars = { ...gameState.customCharacters };
        Object.keys(updatedCustomChars).forEach(sId => {
            updatedCustomChars[sId] = updatedCustomChars[sId].filter(c => c.id !== charId);
        });
        onUpdateGameState({ ...gameState, customCharacters: updatedCustomChars });
    };

    // --- Scenario Management ---

    const saveScenario = () => {
        const newScenario: CustomScenario = {
            id: editingId || `scen_${Date.now()}`,
            sceneId: formData.sceneId || WORLD_SCENES[0].id,
            title: formData.title || '新剧本',
            description: formData.description || '',
            author: formData.author || 'Admin',
            startNodeId: formData.startNodeId || 'start',
            nodes: typeof formData.nodes === 'string' ? JSON.parse(formData.nodes) : formData.nodes
        };

        let updatedScenarios = [...gameState.customScenarios];
        if (editingId) {
            updatedScenarios = updatedScenarios.map(s => s.id === editingId ? newScenario : s);
        } else {
            updatedScenarios.push(newScenario);
        }
        onUpdateGameState({ ...gameState, customScenarios: updatedScenarios });
        switchToList();
    };

    const deleteScenario = (id: string) => {
        if (!window.confirm('确定删除此剧本吗？')) return;
        const updatedScenarios = gameState.customScenarios.filter(s => s.id !== id);
        onUpdateGameState({ ...gameState, customScenarios: updatedScenarios });
    };


    // --- View Helpers ---
    
    const allScenes = [...WORLD_SCENES, ...gameState.customScenes];
    
    const getAllCharacters = () => {
        const list: (Character & { sceneId: string, sceneName: string, isSystem: boolean })[] = [];
        allScenes.forEach(scene => {
            // Built-in
            scene.characters.forEach(c => list.push({ ...c, sceneId: scene.id, sceneName: scene.name, isSystem: true }));
            // Custom
            const customs = gameState.customCharacters[scene.id] || [];
            customs.forEach(c => list.push({ ...c, sceneId: scene.id, sceneName: scene.name, isSystem: false }));
        });
        return list;
    };
    
    // --- Settings Helper ---
    const updateProviderConfig = (provider: AIProvider, key: string, value: string) => {
        const configKey = provider === 'gemini' ? 'geminiConfig' : provider === 'openai' ? 'openaiConfig' : provider === 'doubao' ? 'doubaoConfig' : 'qwenConfig';
        const currentConfig = gameState.settings[configKey];
        onUpdateGameState({
            ...gameState,
            settings: {
                ...gameState.settings,
                [configKey]: { ...currentConfig, [key]: value }
            }
        });
    };

    const PROVIDERS: {id: AIProvider, name: string}[] = [
        { id: 'gemini', name: 'Gemini (Google)' },
        { id: 'openai', name: 'ChatGPT (OpenAI)' },
        { id: 'qwen', name: '通义千问 (Qwen)' },
        { id: 'doubao', name: '豆包 (Volcengine)' }
    ];


    // --- LOGIN SCREEN ---
    if (!isAuthenticated) {
        return (
            <div className="h-screen w-full bg-slate-950 flex items-center justify-center p-4 font-sans">
                <div className="max-w-md w-full bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-indigo-600 rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white">管理后台登录</h1>
                        <p className="text-slate-500 text-sm mt-2">HeartSphere Admin Console</p>
                    </div>
                    <div className="space-y-4">
                        <input 
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-center tracking-widest"
                            placeholder="输入密码 (admin)"
                            autoFocus
                        />
                        <Button onClick={handleLogin} fullWidth className="bg-indigo-600 hover:bg-indigo-500 py-3">进入系统</Button>
                        <button onClick={onBack} className="w-full text-xs text-slate-600 hover:text-slate-400 mt-4">返回应用首页</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
            
            {/* SIDEBAR */}
            <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
                <div className="h-16 flex items-center px-6 border-b border-slate-800">
                    <h1 className="text-xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">HEARTSPHERE</h1>
                </div>

                <div className="flex-1 py-6 space-y-1">
                    <p className="px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Main</p>
                    <AdminSidebarItem label="概览 Dashboard" icon="📊" active={activeSection === 'dashboard'} onClick={() => {setActiveSection('dashboard'); switchToList();}} />
                    
                    <p className="px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-6">Content</p>
                    <AdminSidebarItem label="时代管理 Scenes" icon="🌍" active={activeSection === 'eras'} onClick={() => {setActiveSection('eras'); switchToList();}} />
                    <AdminSidebarItem label="角色管理 E-Souls" icon="👥" active={activeSection === 'characters'} onClick={() => {setActiveSection('characters'); switchToList();}} />
                    <AdminSidebarItem label="互动剧本 Stories" icon="📜" active={activeSection === 'scenarios'} onClick={() => {setActiveSection('scenarios'); switchToList();}} />
                    
                    <p className="px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-6">System</p>
                    <AdminSidebarItem label="全局配置 Config" icon="⚙️" active={activeSection === 'settings'} onClick={() => {setActiveSection('settings'); switchToList();}} />
                </div>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">Administrator</p>
                            <p className="text-xs text-slate-500 truncate">System Root</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col min-w-0">
                <AdminHeader title={
                    activeSection === 'dashboard' ? '系统概览' :
                    activeSection === 'eras' ? '时代与场景管理' :
                    activeSection === 'characters' ? 'E-Soul 角色数据库' :
                    activeSection === 'scenarios' ? '互动剧本库' : '系统全局设置'
                } onBack={onBack} />

                <div className="flex-1 overflow-y-auto p-8 bg-slate-950">
                    
                    {/* --- DASHBOARD VIEW --- */}
                    {activeSection === 'dashboard' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
                                <h3 className="text-slate-500 text-xs font-bold uppercase mb-2">Total Users</h3>
                                <p className="text-3xl font-bold text-white">1</p>
                            </div>
                             <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
                                <h3 className="text-slate-500 text-xs font-bold uppercase mb-2">Active Scenes</h3>
                                <p className="text-3xl font-bold text-indigo-400">{allScenes.length}</p>
                            </div>
                             <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
                                <h3 className="text-slate-500 text-xs font-bold uppercase mb-2">Total Characters</h3>
                                <p className="text-3xl font-bold text-pink-400">{getAllCharacters().length}</p>
                            </div>
                             <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
                                <h3 className="text-slate-500 text-xs font-bold uppercase mb-2">Scenarios</h3>
                                <p className="text-3xl font-bold text-emerald-400">{gameState.customScenarios.length}</p>
                            </div>
                            
                            <div className="col-span-full mt-8 p-6 bg-red-900/10 border border-red-900/50 rounded-xl flex justify-between items-center">
                                <div>
                                    <h3 className="text-red-400 font-bold">危险操作区</h3>
                                    <p className="text-red-400/60 text-sm">重置所有数据将无法恢复。</p>
                                </div>
                                <Button onClick={onResetWorld} className="bg-red-600 hover:bg-red-500 border-none">恢复出厂设置</Button>
                            </div>
                        </div>
                    )}

                    {/* --- ERAS MANAGEMENT --- */}
                    {activeSection === 'eras' && (
                        <>
                            {viewMode === 'list' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <p className="text-slate-400 text-sm">管理世界观和场景。编辑内置场景会自动创建自定义副本。</p>
                                        <Button onClick={switchToCreate} className="bg-indigo-600 hover:bg-indigo-500 text-sm">+ 新增时代</Button>
                                    </div>
                                    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-950 text-slate-500 text-xs uppercase font-bold">
                                                <tr>
                                                    <th className="p-4">预览</th>
                                                    <th className="p-4">名称</th>
                                                    <th className="p-4">简介</th>
                                                    <th className="p-4 text-right">操作</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {allScenes.map(scene => {
                                                    const isSystem = WORLD_SCENES.some(s => s.id === scene.id);
                                                    return (
                                                        <tr key={scene.id} className="hover:bg-slate-800/50 transition-colors">
                                                            <td className="p-4"><img src={scene.imageUrl} className="w-12 h-16 object-cover rounded" alt="" /></td>
                                                            <td className="p-4 font-bold text-white">
                                                                {scene.name}
                                                                {isSystem && <span className="ml-2 text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">SYSTEM</span>}
                                                            </td>
                                                            <td className="p-4 text-sm text-slate-400 max-w-xs truncate">{scene.description}</td>
                                                            <td className="p-4 text-right space-x-2">
                                                                <button onClick={() => switchToEdit(scene)} className="text-indigo-400 hover:text-white text-sm font-medium">
                                                                    {isSystem ? '复刻/编辑' : '编辑'}
                                                                </button>
                                                                {!isSystem && <button onClick={() => deleteEra(scene.id)} className="text-red-400 hover:text-white text-sm font-medium">删除</button>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            {(viewMode === 'create' || viewMode === 'edit') && (
                                <div className="max-w-2xl mx-auto bg-slate-900 p-8 rounded-xl border border-slate-800">
                                    <h3 className="text-xl font-bold text-white mb-6">{viewMode === 'create' ? '新建时代' : '编辑时代'}</h3>
                                    <InputGroup label="时代名称">
                                        <TextInput value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                                    </InputGroup>
                                    <InputGroup label="背景简介">
                                        <TextArea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} rows={4} />
                                    </InputGroup>
                                    <InputGroup label="封面图片 URL (建议 3:4 比例)">
                                        <TextInput value={formData.imageUrl || ''} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
                                    </InputGroup>
                                    <div className="flex justify-end gap-3 mt-8">
                                        <Button variant="ghost" onClick={switchToList}>取消</Button>
                                        <Button onClick={saveEra} className="bg-indigo-600">保存时代</Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* --- CHARACTERS MANAGEMENT --- */}
                    {activeSection === 'characters' && (
                        <>
                            {viewMode === 'list' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <p className="text-slate-400 text-sm">管理所有时代的登场角色。</p>
                                        <Button onClick={switchToCreate} className="bg-indigo-600 hover:bg-indigo-500 text-sm">+ 新增角色</Button>
                                    </div>
                                    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-950 text-slate-500 text-xs uppercase font-bold">
                                                <tr>
                                                    <th className="p-4">头像</th>
                                                    <th className="p-4">姓名</th>
                                                    <th className="p-4">角色定位</th>
                                                    <th className="p-4">所属时代</th>
                                                    <th className="p-4 text-right">操作</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {getAllCharacters().map((char, idx) => (
                                                    <tr key={`${char.id}_${idx}`} className="hover:bg-slate-800/50 transition-colors">
                                                        <td className="p-4"><img src={char.avatarUrl} className="w-10 h-10 object-cover rounded-full border border-slate-700" alt="" /></td>
                                                        <td className="p-4 font-bold text-white">
                                                            {char.name}
                                                            {char.isSystem && <span className="ml-2 text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">SYSTEM</span>}
                                                        </td>
                                                        <td className="p-4 text-sm text-slate-400">{char.role}</td>
                                                        <td className="p-4 text-sm text-slate-400">{char.sceneName}</td>
                                                        <td className="p-4 text-right space-x-2">
                                                            <button onClick={() => {
                                                                const editData = { ...char, targetSceneId: char.sceneId }; 
                                                                switchToEdit(editData);
                                                            }} className="text-indigo-400 hover:text-white text-sm font-medium">编辑</button>
                                                            {!char.isSystem && <button onClick={() => deleteCharacter(char.id)} className="text-red-400 hover:text-white text-sm font-medium">删除</button>}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            {(viewMode === 'create' || viewMode === 'edit') && (
                                <div className="max-w-4xl mx-auto bg-slate-900 p-8 rounded-xl border border-slate-800">
                                    <h3 className="text-xl font-bold text-white mb-6">{viewMode === 'create' ? '新建角色' : '编辑角色'}</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-bold text-indigo-400 border-b border-indigo-900/30 pb-2">基础信息</h4>
                                            <InputGroup label="姓名">
                                                <TextInput value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                                            </InputGroup>
                                            <InputGroup label="角色定位 (Role)">
                                                <TextInput value={formData.role || ''} onChange={e => setFormData({...formData, role: e.target.value})} />
                                            </InputGroup>
                                            <InputGroup label="所属时代 (Scene)">
                                                <select 
                                                    value={formData.targetSceneId || ''} 
                                                    onChange={e => setFormData({...formData, targetSceneId: e.target.value})}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                                                >
                                                    {allScenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </InputGroup>
                                            <InputGroup label="简介 (Bio)">
                                                <TextArea value={formData.bio || ''} onChange={e => setFormData({...formData, bio: e.target.value})} rows={3} />
                                            </InputGroup>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-sm font-bold text-pink-400 border-b border-pink-900/30 pb-2">视觉与人设</h4>
                                            <InputGroup label="头像 URL">
                                                <TextInput value={formData.avatarUrl || ''} onChange={e => setFormData({...formData, avatarUrl: e.target.value})} />
                                            </InputGroup>
                                            <InputGroup label="背景图 URL">
                                                <TextInput value={formData.backgroundUrl || ''} onChange={e => setFormData({...formData, backgroundUrl: e.target.value})} />
                                            </InputGroup>
                                            <InputGroup label="第一句问候">
                                                <TextArea value={formData.firstMessage || ''} onChange={e => setFormData({...formData, firstMessage: e.target.value})} rows={2} />
                                            </InputGroup>
                                        </div>
                                    </div>

                                    <div className="mt-8">
                                        <h4 className="text-sm font-bold text-green-400 border-b border-green-900/30 pb-2 mb-4">系统指令 (System Prompt)</h4>
                                        <InputGroup label="完整角色扮演指令 (Prompt)">
                                            <TextArea value={formData.systemInstruction || ''} onChange={e => setFormData({...formData, systemInstruction: e.target.value})} rows={6} className="font-mono text-xs" />
                                        </InputGroup>
                                    </div>

                                    <div className="flex justify-end gap-3 mt-8">
                                        <Button variant="ghost" onClick={switchToList}>取消</Button>
                                        <Button onClick={saveCharacter} className="bg-indigo-600">保存角色</Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* --- SCENARIOS MANAGEMENT --- */}
                    {activeSection === 'scenarios' && (
                        <>
                            {viewMode === 'list' && (
                                <div className="space-y-4">
                                     <div className="flex justify-between items-center">
                                        <p className="text-slate-400 text-sm">管理互动分支剧本。</p>
                                        <Button onClick={switchToCreate} className="bg-indigo-600 hover:bg-indigo-500 text-sm">+ 新增剧本</Button>
                                    </div>
                                    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-950 text-slate-500 text-xs uppercase font-bold">
                                                <tr>
                                                    <th className="p-4">标题</th>
                                                    <th className="p-4">对应时代</th>
                                                    <th className="p-4">作者</th>
                                                    <th className="p-4">节点数</th>
                                                    <th className="p-4 text-right">操作</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {gameState.customScenarios.map(scen => {
                                                    const sceneName = allScenes.find(s => s.id === scen.sceneId)?.name || '未知';
                                                    return (
                                                        <tr key={scen.id} className="hover:bg-slate-800/50 transition-colors">
                                                            <td className="p-4 font-bold text-white">{scen.title}</td>
                                                            <td className="p-4 text-sm text-slate-400">{sceneName}</td>
                                                            <td className="p-4 text-sm text-slate-400">{scen.author}</td>
                                                            <td className="p-4 text-sm text-slate-400">{Object.keys(scen.nodes).length}</td>
                                                            <td className="p-4 text-right space-x-2">
                                                                <button onClick={() => {
                                                                    // Convert nodes object to formatted JSON string for editing
                                                                    const editData = { ...scen, nodes: JSON.stringify(scen.nodes, null, 2) };
                                                                    switchToEdit(editData);
                                                                }} className="text-indigo-400 hover:text-white text-sm font-medium">编辑</button>
                                                                <button onClick={() => deleteScenario(scen.id)} className="text-red-400 hover:text-white text-sm font-medium">删除</button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {gameState.customScenarios.length === 0 && (
                                                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">暂无自定义剧本</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            {(viewMode === 'create' || viewMode === 'edit') && (
                                <div className="max-w-4xl mx-auto bg-slate-900 p-8 rounded-xl border border-slate-800">
                                    <h3 className="text-xl font-bold text-white mb-6">{viewMode === 'create' ? '新建剧本' : '编辑剧本'}</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <InputGroup label="剧本标题">
                                            <TextInput value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
                                        </InputGroup>
                                        <InputGroup label="所属时代 (Scene)">
                                            <select 
                                                value={formData.sceneId || ''} 
                                                onChange={e => setFormData({...formData, sceneId: e.target.value})}
                                                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                                            >
                                                {allScenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </InputGroup>
                                    </div>
                                    <InputGroup label="简介">
                                        <TextArea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} />
                                    </InputGroup>

                                    <div className="mt-6">
                                        <h4 className="text-sm font-bold text-emerald-400 border-b border-emerald-900/30 pb-2 mb-4">节点编辑器 (JSON Mode)</h4>
                                        <p className="text-xs text-slate-500 mb-2">此处直接编辑剧情节点的 JSON 结构。适合高级用户或复制粘贴。</p>
                                        <TextArea 
                                            value={formData.nodes || ''} 
                                            onChange={e => setFormData({...formData, nodes: e.target.value})} 
                                            rows={15} 
                                            className="font-mono text-xs bg-slate-950 border-slate-800 text-emerald-300"
                                            placeholder='{ "start": { "id": "start", "title": "...", "prompt": "...", "options": [] } }'
                                        />
                                    </div>
                                    <InputGroup label="起始节点 ID">
                                         <TextInput value={formData.startNodeId || 'start'} onChange={e => setFormData({...formData, startNodeId: e.target.value})} className="font-mono text-xs" />
                                    </InputGroup>

                                    <div className="flex justify-end gap-3 mt-8">
                                        <Button variant="ghost" onClick={switchToList}>取消</Button>
                                        <Button onClick={saveScenario} className="bg-indigo-600">保存剧本</Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* --- SETTINGS --- */}
                    {activeSection === 'settings' && (
                        <div className="max-w-4xl mx-auto">
                            <div className="flex border-b border-slate-700 mb-6">
                                <button onClick={() => setSettingsTab('models')} className={`pb-3 px-4 text-sm font-bold ${settingsTab === 'models' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-white'}`}>AI 模型接入</button>
                                <button onClick={() => setSettingsTab('general')} className={`pb-3 px-4 text-sm font-bold ${settingsTab === 'general' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-white'}`}>通用与策略</button>
                            </div>

                            {settingsTab === 'models' && (
                                <div className="space-y-8">
                                    {/* GEMINI */}
                                    <ConfigSection title="Google Gemini">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputGroup label="API Key">
                                                <TextInput type="password" value={gameState.settings.geminiConfig.apiKey} onChange={e => updateProviderConfig('gemini', 'apiKey', e.target.value)} />
                                            </InputGroup>
                                            <InputGroup label="Text Model">
                                                <TextInput value={gameState.settings.geminiConfig.modelName} onChange={e => updateProviderConfig('gemini', 'modelName', e.target.value)} placeholder="gemini-2.5-flash" />
                                            </InputGroup>
                                            <InputGroup label="Image Model">
                                                <TextInput value={gameState.settings.geminiConfig.imageModel || ''} onChange={e => updateProviderConfig('gemini', 'imageModel', e.target.value)} placeholder="gemini-2.5-flash-image" />
                                            </InputGroup>
                                            <InputGroup label="Video Model">
                                                <TextInput value={gameState.settings.geminiConfig.videoModel || ''} onChange={e => updateProviderConfig('gemini', 'videoModel', e.target.value)} placeholder="veo-3.1-fast-generate-preview" />
                                            </InputGroup>
                                        </div>
                                    </ConfigSection>

                                    {/* OPENAI */}
                                    <ConfigSection title="OpenAI / ChatGPT">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputGroup label="API Key">
                                                <TextInput type="password" value={gameState.settings.openaiConfig.apiKey} onChange={e => updateProviderConfig('openai', 'apiKey', e.target.value)} />
                                            </InputGroup>
                                            <InputGroup label="Base URL (Optional)">
                                                <TextInput value={gameState.settings.openaiConfig.baseUrl || ''} onChange={e => updateProviderConfig('openai', 'baseUrl', e.target.value)} placeholder="https://api.openai.com/v1" />
                                            </InputGroup>
                                            <InputGroup label="Text Model">
                                                <TextInput value={gameState.settings.openaiConfig.modelName} onChange={e => updateProviderConfig('openai', 'modelName', e.target.value)} placeholder="gpt-4o" />
                                            </InputGroup>
                                        </div>
                                    </ConfigSection>

                                    {/* QWEN */}
                                    <ConfigSection title="Alibaba Qwen (通义千问)">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputGroup label="DashScope API Key">
                                                <TextInput type="password" value={gameState.settings.qwenConfig.apiKey} onChange={e => updateProviderConfig('qwen', 'apiKey', e.target.value)} />
                                            </InputGroup>
                                            <InputGroup label="Text Model">
                                                <TextInput value={gameState.settings.qwenConfig.modelName} onChange={e => updateProviderConfig('qwen', 'modelName', e.target.value)} placeholder="qwen-max" />
                                            </InputGroup>
                                            <InputGroup label="Image Model">
                                                <TextInput value={gameState.settings.qwenConfig.imageModel || ''} onChange={e => updateProviderConfig('qwen', 'imageModel', e.target.value)} placeholder="qwen-image-plus" />
                                            </InputGroup>
                                            <InputGroup label="Video Model">
                                                <TextInput value={gameState.settings.qwenConfig.videoModel || ''} onChange={e => updateProviderConfig('qwen', 'videoModel', e.target.value)} placeholder="wanx-video" />
                                            </InputGroup>
                                        </div>
                                    </ConfigSection>

                                    {/* DOUBAO */}
                                    <ConfigSection title="Volcengine Doubao (豆包)">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputGroup label="API Key">
                                                <TextInput type="password" value={gameState.settings.doubaoConfig.apiKey} onChange={e => updateProviderConfig('doubao', 'apiKey', e.target.value)} />
                                            </InputGroup>
                                            <InputGroup label="Text Model Endpoint ID (ep-...)">
                                                <TextInput value={gameState.settings.doubaoConfig.modelName} onChange={e => updateProviderConfig('doubao', 'modelName', e.target.value)} placeholder="ep-2024..." />
                                            </InputGroup>
                                            <InputGroup label="Base URL">
                                                <TextInput value={gameState.settings.doubaoConfig.baseUrl || ''} onChange={e => updateProviderConfig('doubao', 'baseUrl', e.target.value)} placeholder="https://ark.cn-beijing.volces.com/api/v3" />
                                            </InputGroup>
                                        </div>
                                    </ConfigSection>
                                </div>
                            )}

                            {settingsTab === 'general' && (
                                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-6">
                                    <div>
                                        <h4 className="text-white font-bold mb-4">功能开关</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 bg-slate-800 rounded">
                                                <span className="text-sm text-slate-300">调试模式 (Debug Mode)</span>
                                                <input type="checkbox" checked={gameState.settings.debugMode} onChange={e => onUpdateGameState({...gameState, settings: {...gameState.settings, debugMode: e.target.checked}})} className="rounded bg-slate-700 h-5 w-5 accent-indigo-500" />
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-slate-800 rounded">
                                                <span className="text-sm text-slate-300">自动生成角色头像 (Auto Avatar)</span>
                                                <input type="checkbox" checked={gameState.settings.autoGenerateAvatars} onChange={e => onUpdateGameState({...gameState, settings: {...gameState.settings, autoGenerateAvatars: e.target.checked}})} className="rounded bg-slate-700 h-5 w-5 accent-indigo-500" />
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-slate-800 rounded">
                                                <span className="text-sm text-slate-300">故障自动降级 (Auto Fallback)</span>
                                                <input type="checkbox" checked={gameState.settings.enableFallback} onChange={e => onUpdateGameState({...gameState, settings: {...gameState.settings, enableFallback: e.target.checked}})} className="rounded bg-slate-700 h-5 w-5 accent-indigo-500" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-white font-bold mb-4">AI 路由策略 (Routing Strategy)</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <InputGroup label="Text Chat Provider">
                                                <select 
                                                    value={gameState.settings.textProvider} 
                                                    onChange={(e) => onUpdateGameState({...gameState, settings: {...gameState.settings, textProvider: e.target.value as AIProvider}})}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                                                >
                                                    {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </InputGroup>
                                            <InputGroup label="Image Gen Provider">
                                                <select 
                                                    value={gameState.settings.imageProvider} 
                                                    onChange={(e) => onUpdateGameState({...gameState, settings: {...gameState.settings, imageProvider: e.target.value as AIProvider}})}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                                                >
                                                    {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </InputGroup>
                                            <InputGroup label="Video Gen Provider">
                                                <select 
                                                    value={gameState.settings.videoProvider} 
                                                    onChange={(e) => onUpdateGameState({...gameState, settings: {...gameState.settings, videoProvider: e.target.value as AIProvider}})}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                                                >
                                                    {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </InputGroup>
                                            <InputGroup label="Audio/TTS Provider">
                                                <select 
                                                    value={gameState.settings.audioProvider} 
                                                    onChange={(e) => onUpdateGameState({...gameState, settings: {...gameState.settings, audioProvider: e.target.value as AIProvider}})}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                                                >
                                                    {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </InputGroup>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
