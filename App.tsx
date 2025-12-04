import React, { useState, useEffect, useRef } from 'react';
import { WORLD_SCENES } from './constants';
import { ChatWindow } from './components/ChatWindow';
import { ScenarioBuilder } from './components/ScenarioBuilder';
import { SettingsModal } from './components/SettingsModal';
import { CharacterCard } from './components/CharacterCard';
import { SceneCard } from './components/SceneCard';
import { Character, GameState, Message, CustomScenario, AppSettings, WorldScene, JournalEntry } from './types';
import { geminiService } from './services/gemini';
import { EraConstructorModal } from './components/EraConstructorModal';
import { CharacterConstructorModal } from './components/CharacterConstructorModal';
import { EntryPoint } from './components/EntryPoint';
import { RealWorldScreen } from './components/RealWorldScreen';

const App: React.FC = () => {
  
  const EXAMPLE_SCENARIO: CustomScenario = {
      id: 'example_scenario_01',
      sceneId: 'university_era',
      title: '示例剧本：深夜网咖的邂逅',
      description: '在这座城市的霓虹灯下，你走进了一家名为“Binary Beans”的网咖...',
      author: 'System', startNodeId: 'start',
      nodes: {
          'start': { id: 'start', title: '初入网咖', prompt: 'User enters a cyberpunk internet cafe at rainy night. Introduce a mysterious hacker girl (Yuki style) sitting in the corner, looking nervous. The barista asks for the user\'s order.', options: [ { id: 'opt_1', text: '走向那个黑客少女', nextNodeId: 'node_hacker' }, { id: 'opt_2', text: '点一杯咖啡，坐在吧台', nextNodeId: 'node_coffee' } ] },
          'node_hacker': { id: 'node_hacker', title: '黑客的求助', prompt: 'The user approaches the hacker girl. She is startled but then asks for help decrypting a drive. The mood is tense and secretive.', options: [ { id: 'opt_help', text: '答应帮助她', nextNodeId: 'node_mission_start' }, { id: 'opt_leave', text: '表示对此不感兴趣，离开', nextNodeId: 'start' } ] },
          'node_coffee': { id: 'node_coffee', title: '平静的夜晚', prompt: 'The user sits at the bar. The barista serves a glowing neon coffee. The atmosphere is chill and lo-fi. Nothing dangerous happens, just a conversation.', options: [ { id: 'opt_chat', text: '和咖啡师聊天', nextNodeId: 'node_coffee' }, { id: 'opt_look_around', text: '观察四周', nextNodeId: 'start' } ] },
          'node_mission_start': { id: 'node_mission_start', title: '任务开始', prompt: 'The girl hands over a data chip. "They are watching," she whispers. Suddenly, the cafe lights turn red. Action scene begins.', options: [] }
      }
  };

  const [gameState, setGameState] = useState<GameState>({
    currentScreen: 'profileSetup',
    userProfile: null,
    selectedSceneId: null,
    selectedCharacterId: null,
    selectedScenarioId: null,
    editingScenarioId: null,
    history: {},
    customAvatars: {},
    generatingAvatarId: null,
    customScenarios: [EXAMPLE_SCENARIO],
    customScenes: [],
    journalEntries: [],
    currentQuestion: null,
    settings: { autoGenerateAvatars: false, autoGenerateStoryScenes: false }
  });
  
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEraCreator, setShowEraCreator] = useState(false);
  const [showCharacterCreator, setShowCharacterCreator] = useState(false);

  const attemptedGenerations = useRef<Set<string>>(new Set());

  // States for profile setup screen
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('https://picsum.photos/seed/default_avatar/512/512');
  const [isGeneratingUserAvatar, setIsGeneratingUserAvatar] = useState(false);
  
  const handleGenerateAvatar = async (character: Character) => {
    if (gameState.generatingAvatarId) return;
    setGameState(prev => ({ ...prev, generatingAvatarId: character.id }));
    try {
        const imageUrl = await geminiService.generateCharacterImage(character);
        if (imageUrl) {
            setGameState(prev => ({ ...prev, customAvatars: { ...prev.customAvatars, [character.id]: imageUrl }, generatingAvatarId: null }));
        } else {
             setGameState(prev => ({ ...prev, generatingAvatarId: null }));
        }
    } catch (e) {
        console.error("Failed to generate avatar", e);
        setGameState(prev => ({ ...prev, generatingAvatarId: null }));
    }
  };

  const handleGenerateUserAvatar = async () => {
    if (isGeneratingUserAvatar) return;
    setIsGeneratingUserAvatar(true);
    const prompt = `A digital, vibrant, modern Chinese anime (Manhua) style avatar for a user named "${nickname || '探索者'}". Clean lines, high resolution, suitable for a profile picture.`;
    try {
        const newAvatar = await geminiService.generateImageFromPrompt(prompt, '1:1');
        if (newAvatar) setAvatarUrl(newAvatar);
    } catch(e) {
        console.error("User avatar generation failed", e);
    } finally {
        setIsGeneratingUserAvatar(false);
    }
  };

  const handleConfirmProfile = () => {
    if (!nickname.trim()) {
        alert("请输入一个昵称！");
        return;
    }
    setGameState(prev => ({
        ...prev,
        userProfile: { nickname: nickname.trim(), avatarUrl },
        currentScreen: 'entryPoint'
    }));
  };

  useEffect(() => {
    if (!gameState.settings.autoGenerateAvatars || gameState.generatingAvatarId || gameState.currentScreen !== 'characterSelection') return;
    const scene = WORLD_SCENES.find(s => s.id === gameState.selectedSceneId);
    if (!scene) return;
    const nextCharToGen = scene.characters.find(c => !gameState.customAvatars[c.id] && !attemptedGenerations.current.has(c.id));
    if (nextCharToGen) {
      attemptedGenerations.current.add(nextCharToGen.id);
      handleGenerateAvatar(nextCharToGen);
    }
  }, [gameState.customAvatars, gameState.generatingAvatarId, gameState.settings.autoGenerateAvatars, gameState.currentScreen, gameState.selectedSceneId]);

  const handleNavigate = (screen: GameState['currentScreen']) => setGameState(prev => ({ ...prev, currentScreen: screen }));
  const handleBackToEntryPoint = () => setGameState(prev => ({ ...prev, currentScreen: 'entryPoint' }));
  const handleBackToSceneSelection = () => setGameState(prev => ({ ...prev, currentScreen: 'sceneSelection', selectedSceneId: null }));
  const handleBackToCharacterSelection = () => setGameState(prev => ({ ...prev, currentScreen: 'characterSelection', selectedCharacterId: null, selectedScenarioId: null, currentScenarioState: undefined }));
  
  const handleSelectScene = (sceneId: string) => setGameState(prev => ({...prev, selectedSceneId: sceneId, currentScreen: 'characterSelection'}));
  
  const handleSelectCharacter = (character: Character) => {
    const historyKey = character.id;
    const newHistory = gameState.currentQuestion
        ? [{
            id: `user_q_${Date.now()}`,
            role: 'user' as const,
            text: gameState.currentQuestion,
            timestamp: Date.now()
          }]
        : gameState.history[historyKey] || [];

    setGameState(prev => ({
        ...prev,
        currentScreen: 'chat',
        selectedCharacterId: character.id,
        selectedScenarioId: null,
        history: {
            ...prev.history,
            [historyKey]: newHistory,
        },
        currentQuestion: null
    }));
  };

  const handleSelectScenario = (scenario: CustomScenario) => setGameState(prev => ({ ...prev, currentScreen: 'chat', selectedScenarioId: scenario.id, selectedCharacterId: null, history: { ...prev.history, [scenario.id]: [] }, currentScenarioState: { scenarioId: scenario.id, currentNodeId: scenario.startNodeId } }));
  
  const handleCreateScenario = () => setGameState(prev => ({...prev, editingScenarioId: null, currentScreen: 'builder' }));
  const handleEditScenario = (scenario: CustomScenario) => setGameState(prev => ({...prev, editingScenarioId: scenario.id, currentScreen: 'builder'}));

  const handleSaveEra = (newScene: WorldScene) => {
    setGameState(prev => ({ ...prev, customScenes: [...prev.customScenes, newScene]}));
    setShowEraCreator(false);
  }

  const handleSaveCharacter = (newCharacter: Character) => {
    if (!gameState.selectedSceneId) return;
    setGameState(prev => {
      const updatedCustomScenes = prev.customScenes.map(scene => {
        if (scene.id === prev.selectedSceneId) {
          return { ...scene, characters: [...scene.characters, newCharacter] };
        }
        return scene;
      });
      return { ...prev, customScenes: updatedCustomScenes };
    });
    setShowCharacterCreator(false);
  }

  const handleUpdateHistory = (id: string, messages: Message[]) => {
    if (typeof id === 'string') {
        setGameState(prev => ({ ...prev, history: { ...prev.history, [id]: messages } }));
    }
  };
  const handleUpdateScenarioState = (nodeId: string) => setGameState(prev => ({ ...prev, currentScenarioState: prev.currentScenarioState ? { ...prev.currentScenarioState, currentNodeId: nodeId } : undefined }));
  const handleSettingsChange = (newSettings: AppSettings) => setGameState(prev => ({ ...prev, settings: newSettings }));

  const handleSaveScenario = (scenario: CustomScenario) => {
    setGameState(prev => {
        const scenarioWithSceneId = { ...scenario, sceneId: scenario.sceneId || prev.selectedSceneId! };
        const newScenarios = [...prev.customScenarios];
        const existingIndex = newScenarios.findIndex(s => s.id === scenarioWithSceneId.id);
        if (existingIndex > -1) newScenarios[existingIndex] = scenarioWithSceneId;
        else newScenarios.push(scenarioWithSceneId);
        return { ...prev, customScenarios: newScenarios, currentScreen: 'characterSelection', editingScenarioId: null };
    });
  };

  const handleAddJournalEntry = (title: string, content: string) => {
    const newEntry: JournalEntry = {
      id: `journal_${Date.now()}`,
      title,
      content,
      timestamp: Date.now()
    };
    setGameState(prev => ({
      ...prev,
      journalEntries: [...prev.journalEntries, newEntry]
    }));
  };

  const handleExploreWithJournalEntry = (content: string) => {
    setGameState(prev => ({
      ...prev,
      currentQuestion: content,
      currentScreen: 'sceneSelection'
    }));
  };

  const allScenes = [...WORLD_SCENES, ...gameState.customScenes];
  const selectedScene = allScenes.find(s => s.id === gameState.selectedSceneId);
  const isCustomScene = gameState.customScenes.some(s => s.id === gameState.selectedSceneId);

  const getChatTarget = () => {
    if (!selectedScene) return { character: null, scenario: null };

    if (gameState.selectedScenarioId) {
      const scenario = gameState.customScenarios.find(s => s.id === gameState.selectedScenarioId);
      return { character: selectedScene.mainStory || selectedScene.characters[0], scenario: scenario };
    }
    
    let character = selectedScene.characters.find(c => c.id === gameState.selectedCharacterId);
    if (!character && selectedScene.mainStory?.id === gameState.selectedCharacterId) {
      character = selectedScene.mainStory;
    }
    return { character: character, scenario: undefined };
  };

  const { character: activeCharacter, scenario: activeScenario } = getChatTarget();
  const editingScenario = gameState.customScenarios.find(s => s.id === gameState.editingScenarioId);

  return (
    <div className="h-screen w-full bg-black text-white selection:bg-pink-500 selection:text-white overflow-hidden font-sans">
      {showSettingsModal && <SettingsModal settings={gameState.settings} onSettingsChange={handleSettingsChange} onClose={() => setShowSettingsModal(false)} />}
      {showEraCreator && <EraConstructorModal onSave={handleSaveEra} onClose={() => setShowEraCreator(false)} />}
      {showCharacterCreator && selectedScene && <CharacterConstructorModal scene={selectedScene} onSave={handleSaveCharacter} onClose={() => setShowCharacterCreator(false)} />}
      
      {gameState.currentScreen === 'profileSetup' && (
        <div className="relative h-full w-full flex flex-col items-center justify-center p-4">
          <div className="absolute inset-0 z-0"><img src="https://picsum.photos/seed/anime_sky/1920/1080" className="w-full h-full object-cover opacity-40 blur-sm scale-110 animate-[pulse_10s_ease-in-out_infinite]" /><div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" /></div>
          <div className="z-10 text-center animate-fade-in space-y-8 w-full max-w-md">
            <div className="space-y-2">
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 drop-shadow-[0_0_20px_rgba(236,72,153,0.5)]">创建你的档案</h1>
              <p className="text-lg text-pink-100/80 font-light">你是这个世界的主角，一切故事因你而生。</p>
            </div>

            <div className="space-y-6">
              <div className="relative w-40 h-40 mx-auto rounded-full border-4 border-white/20 shadow-2xl overflow-hidden group bg-black/30">
                <img src={avatarUrl} alt="User Avatar" className={`w-full h-full object-cover transition-all duration-300 ${isGeneratingUserAvatar ? 'blur-sm scale-110 opacity-60' : ''}`} />
                 {isGeneratingUserAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-t-transparent border-pink-400 rounded-full animate-spin" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={handleGenerateUserAvatar} disabled={isGeneratingUserAvatar} className="text-white text-sm backdrop-blur-sm bg-black/30 px-3 py-1 rounded-full border border-white/20">
                    {isGeneratingUserAvatar ? '生成中...' : 'AI 生成头像'}
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="输入你的昵称..."
                className="w-full text-center text-xl font-bold bg-white/5 border-2 border-white/10 rounded-full py-3 px-6 text-white placeholder-white/40 focus:border-pink-400 focus:ring-0 outline-none transition-colors"
              />
            </div>

            <button onClick={handleConfirmProfile} disabled={!nickname.trim()} className="group relative px-8 py-4 bg-white text-black font-bold text-lg tracking-widest uppercase overflow-hidden rounded-full transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
              <div className="absolute inset-0 w-0 bg-pink-500 transition-all duration-[250ms] ease-out group-hover:w-full opacity-20" />
              <span className="relative z-10 group-hover:text-pink-600 transition-colors">开启旅程</span>
            </button>
          </div>
        </div>
      )}

      {gameState.currentScreen === 'entryPoint' && gameState.userProfile && (
        <EntryPoint 
          nickname={gameState.userProfile.nickname}
          onNavigate={(screen) => handleNavigate(screen)} 
        />
      )}
      
      {gameState.currentScreen === 'realWorld' && (
        <RealWorldScreen 
          entries={gameState.journalEntries}
          onAddEntry={handleAddJournalEntry}
          onExplore={handleExploreWithJournalEntry}
          onBack={handleBackToEntryPoint}
        />
      )}

      {gameState.currentScreen === 'sceneSelection' && (
          <div className="h-full w-full flex flex-col bg-slate-900 overflow-y-auto scrollbar-hide">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black z-0 pointer-events-none" />
            <div className="relative z-10 max-w-[1600px] mx-auto p-6 md:p-8 w-full">
              <header className="mb-8 flex justify-between items-start">
                  <div>
                    <h3 className="text-3xl font-bold text-white/90 mb-2">心域 <span className="font-light text-2xl text-purple-400/80">HeartSphere</span></h3>
                    <p className="text-slate-400">你想进入哪个时代，体验怎样的故事？</p>
                  </div>
                   <button onClick={handleBackToEntryPoint} className="px-4 py-2 bg-white/10 rounded-lg text-sm font-bold hover:bg-white/20 transition-colors">返回 Nexus</button>
              </header>

              {gameState.currentQuestion && (
                 <div className="mb-6 bg-indigo-900/50 border border-indigo-700 text-indigo-200 px-4 py-3 rounded-lg flex justify-between items-center animate-fade-in">
                  <div>
                    <p className="text-xs font-bold uppercase">携带的问题</p>
                    <p className="font-medium truncate">"{gameState.currentQuestion}"</p>
                  </div>
                  <button onClick={() => setGameState(p => ({...p, currentQuestion: null}))} className="text-indigo-300 hover:text-white text-2xl">&times;</button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-12">
                {allScenes.map(scene => <SceneCard key={scene.id} scene={scene} onSelect={() => handleSelectScene(scene.id)} />)}
                <div 
                  onClick={() => setShowEraCreator(true)}
                  className="group relative h-96 w-full cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed border-slate-700 bg-slate-800/20 hover:border-purple-500 hover:bg-slate-800/50 transition-all flex flex-col items-center justify-center text-slate-500 hover:text-purple-400"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 transition-transform group-hover:scale-110">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <h3 className="text-2xl font-bold">创建新时代</h3>
                  <p className="text-sm">构建属于你的世界</p>
                </div>
              </div>
            </div>
          </div>
      )}
      
      {gameState.currentScreen === 'characterSelection' && selectedScene && (
        <div className="h-full w-full flex flex-col relative bg-slate-900">
           <div className="relative z-10 w-full h-full overflow-y-auto scrollbar-hide">
             <div className="max-w-[1600px] mx-auto p-6 md:p-12">
                <header className="mb-8 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
                  <div><h2 className="text-4xl font-bold text-white mb-2">{selectedScene.name}</h2><p className="text-slate-400">{selectedScene.description}</p></div>
                  <div className="flex items-center gap-4 mt-4 md:mt-0">
                    <button onClick={handleBackToSceneSelection} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="返回世界选择"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14-7-7 7-7" /></svg></button>
                    <button onClick={() => setShowSettingsModal(true)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="系统设置"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a6.759 6.759 0 0 1 0 1.004c-.008.379.137.752.43.992l1.003.827c.424.35.534.954.26 1.431l-1.296 2.247a1.125 1.125 0 0 1-1.37.49l-1.217-.456c-.355-.133-.75-.072-1.075.124a6.47 6.47 0 0 1-.22.127c-.331.183-.581.495-.644.87l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 0 1-1.37-.49l-1.296-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-1.004c.008-.379-.137-.752-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.431l1.296-2.247a1.125 1.125 0 0 1 1.37.49l1.217.456c.355.133.75.072 1.075-.124.072-.044.146-.087.22-.127.332-.183.582-.495.645-.87l.212-1.281Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg></button>
                  </div>
                </header>

                {selectedScene.mainStory && (
                  <div onClick={() => handleSelectCharacter(selectedScene.mainStory!)} className="mb-12 relative w-full h-80 rounded-3xl overflow-hidden cursor-pointer group border-2 border-indigo-500/30 hover:border-indigo-400 shadow-2xl transition-all hover:scale-[1.01]">
                     <img src={selectedScene.mainStory.backgroundUrl} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Main Story" />
                     <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
                     <div className="absolute inset-0 flex flex-col justify-center p-8 md:p-12">
                        <div className="bg-indigo-600/20 backdrop-blur-md border border-indigo-500/50 w-fit px-3 py-1 rounded-full text-indigo-300 text-xs font-bold mb-4 uppercase tracking-wider">主线故事</div>
                        <h3 className="text-4xl md:text-5xl font-black text-white mb-2 drop-shadow-lg max-w-2xl">{selectedScene.mainStory.name.replace('主线故事：', '')}</h3>
                        <p className="text-indigo-200/80 max-w-xl text-lg mb-6 line-clamp-2">{selectedScene.mainStory.bio}</p>
                        <div className="flex items-center text-indigo-300 group-hover:text-white transition-colors font-bold uppercase tracking-widest text-sm"><span>开始第一章</span></div>
                     </div>
                  </div>
                )}
                
                <div className="mb-12">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 inline-block">原创剧本</h3>
                        <button onClick={handleCreateScenario} className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg text-white font-bold hover:shadow-lg hover:scale-105 transition-all">+ 创造你的故事</button>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {gameState.customScenarios.filter(sc => sc.sceneId === selectedScene.id).length > 0 ? (
                            gameState.customScenarios.filter(sc => sc.sceneId === selectedScene.id).map(scen => (
                                <div key={scen.id} className="bg-gray-800/50 backdrop-blur-sm border border-white/10 p-6 rounded-2xl flex flex-col justify-between">
                                    <div>
                                        <h4 className="text-xl font-bold text-white mb-2 truncate">{scen.title}</h4>
                                        <p className="text-sm text-gray-400 line-clamp-3 mb-4">{scen.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-4">
                                        <button onClick={() => handleSelectScenario(scen)} className="flex-1 text-center bg-pink-600/80 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all">开始游玩</button>
                                        <button onClick={() => handleEditScenario(scen)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg" title="编辑剧本"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 border border-dashed border-gray-700 rounded-xl text-center text-gray-500 text-sm md:col-span-2 lg:col-span-3">
                                这个时代还没有原创剧本。点击右上角的“创造你的故事”来开启第一段传奇吧！
                            </div>
                        )}
                    </div>
                </div>

                <h3 className="text-2xl font-bold text-white/80 mb-6 border-b border-white/10 pb-2 inline-block">自由互动</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                  {selectedScene.characters.map(c => <CharacterCard key={c.id} character={c} customAvatarUrl={gameState.customAvatars[c.id]} onSelect={handleSelectCharacter} isGenerating={gameState.generatingAvatarId === c.id} onGenerate={handleGenerateAvatar} />)}
                  {isCustomScene && (
                     <div 
                      onClick={() => setShowCharacterCreator(true)}
                      className="group relative h-96 w-full cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed border-slate-700 bg-slate-800/20 hover:border-pink-500 hover:bg-slate-800/50 transition-all flex flex-col items-center justify-center text-slate-500 hover:text-pink-400"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 transition-transform group-hover:scale-110">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      <h3 className="text-2xl font-bold">创建新角色</h3>
                      <p className="text-sm">为这个时代注入灵魂</p>
                    </div>
                  )}
                </div>
             </div>
           </div>
        </div>
      )}

      {gameState.currentScreen === 'builder' && (<ScenarioBuilder initialScenario={editingScenario} onSave={handleSaveScenario} onCancel={handleBackToCharacterSelection} />)}

      {gameState.currentScreen === 'chat' && activeCharacter && gameState.userProfile && (
        <ChatWindow 
          character={activeCharacter}
          customScenario={activeScenario}
          history={gameState.history[activeScenario ? activeScenario.id : (activeCharacter.id || "")] || []}
          scenarioState={gameState.currentScenarioState}
          settings={gameState.settings}
          userProfile={gameState.userProfile}
          onUpdateHistory={(msgs) => handleUpdateHistory(activeScenario ? activeScenario.id : (activeCharacter.id || ""), msgs)}
          onUpdateScenarioState={handleUpdateScenarioState}
          onBack={handleBackToCharacterSelection}
        />
      )}
    </div>
  );
};

export default App;