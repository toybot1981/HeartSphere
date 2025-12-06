

import React, { useState, useEffect, useRef } from 'react';
import { WORLD_SCENES } from './constants';
import { ChatWindow } from './components/ChatWindow';
import { ScenarioBuilder } from './components/ScenarioBuilder';
import { SettingsModal } from './components/SettingsModal';
import { CharacterCard } from './components/CharacterCard';
import { SceneCard } from './components/SceneCard';
import { Character, GameState, Message, CustomScenario, AppSettings, WorldScene, JournalEntry, JournalEcho, Mail, EraMemory } from './types';
import { geminiService } from './services/gemini';
import { storageService } from './services/storage';
import { EraConstructorModal } from './components/EraConstructorModal';
import { CharacterConstructorModal } from './components/CharacterConstructorModal';
import { EntryPoint } from './components/EntryPoint';
import { RealWorldScreen } from './components/RealWorldScreen';
import { MailboxModal } from './components/MailboxModal';
import { EraMemoryModal } from './components/EraMemoryModal';
import { Button } from './components/Button';

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

  // Initial default state
  const DEFAULT_STATE: GameState = {
    currentScreen: 'profileSetup',
    userProfile: null,
    selectedSceneId: null,
    selectedCharacterId: null,
    selectedScenarioId: null,
    tempStoryCharacter: null,
    editingScenarioId: null,
    history: {},
    customAvatars: {},
    generatingAvatarId: null,
    customScenarios: [EXAMPLE_SCENARIO],
    customScenes: [],
    journalEntries: [],
    activeJournalEntryId: null,
    settings: { autoGenerateAvatars: false, autoGenerateStoryScenes: false },
    mailbox: [],
    lastLoginTime: Date.now(),
    sceneMemories: {}, 
  };

  const [gameState, setGameState] = useState<GameState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false); 
  
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEraCreator, setShowEraCreator] = useState(false);
  const [editingScene, setEditingScene] = useState<WorldScene | null>(null); 
  const [showCharacterCreator, setShowCharacterCreator] = useState(false);
  const [showMailbox, setShowMailbox] = useState(false);
  
  // Era Memory Modal State
  const [showEraMemory, setShowEraMemory] = useState(false);
  const [memoryScene, setMemoryScene] = useState<WorldScene | null>(null);

  // Profile Setup Input State
  const [profileNickname, setProfileNickname] = useState('');

  const attemptedGenerations = useRef<Set<string>>(new Set());
  const hasCheckedMail = useRef(false);

  // --- PERSISTENCE LOGIC ---

  // 1. Load on mount (Async for IndexedDB)
  useEffect(() => {
    const init = async () => {
        const loadedState = await storageService.loadState();
        if (loadedState) {
          setGameState(prev => ({
            ...prev,
            ...loadedState,
            currentScreen: loadedState.userProfile ? 'entryPoint' : 'profileSetup',
            generatingAvatarId: null,
            activeJournalEntryId: null,
            editingScenarioId: null,
            tempStoryCharacter: null, // Reset transient character
            mailbox: loadedState.mailbox || [],
            lastLoginTime: loadedState.lastLoginTime || Date.now(),
            sceneMemories: loadedState.sceneMemories || {},
          }));
        }
        setIsLoaded(true);
    };
    init();
  }, []);

  // 2. Save on change (Debounced)
  useEffect(() => {
    if (!isLoaded) return; 

    const timer = setTimeout(() => {
      // Update lastLoginTime on every save to track activity
      const stateToSave = { ...gameState, lastLoginTime: Date.now() };
      storageService.saveState(stateToSave);
    }, 1000);

    return () => clearTimeout(timer);
  }, [gameState, isLoaded]);

  // --- CHRONOS MAILBOX CHECK ---
  useEffect(() => {
    if (!isLoaded || !gameState.userProfile || hasCheckedMail.current) return;

    const checkMail = async () => {
        hasCheckedMail.current = true;
        // Check if offline for more than 1 minute (Test Mode). Real app would be hours.
        const now = Date.now();
        const offlineDuration = now - gameState.lastLoginTime;
        const THRESHOLD = 60 * 1000; // 1 minute

        if (offlineDuration > THRESHOLD) {
            console.log("Offline for long enough, checking for mail...");
            // Pick a sender: Random character from history or default scenes
            // 1. Get recent chat character IDs
            const chattedCharIds = Object.keys(gameState.history);
            let candidate: Character | null = null;
            
            if (chattedCharIds.length > 0) {
                 // Try to find a full character object for the ID
                 const allScenes = [...WORLD_SCENES, ...gameState.customScenes];
                 for (const scene of allScenes) {
                     const found = scene.characters.find(c => c.id === chattedCharIds[0]); // Just pick the first one for simplicity
                     if (found) { candidate = found; break; }
                 }
            }
            
            // Fallback if no history or character not found
            if (!candidate) {
                candidate = WORLD_SCENES[0].characters[0]; // Sakura
            }

            if (candidate) {
                 const letter = await geminiService.generateChronosLetter(candidate, gameState.userProfile!, gameState.journalEntries);
                 if (letter) {
                     const newMail: Mail = {
                         id: `mail_${Date.now()}`,
                         senderId: candidate.id,
                         senderName: candidate.name,
                         senderAvatarUrl: candidate.avatarUrl,
                         subject: letter.subject,
                         content: letter.content,
                         timestamp: Date.now(),
                         isRead: false,
                         themeColor: candidate.themeColor
                     };
                     setGameState(prev => ({
                         ...prev,
                         mailbox: [newMail, ...prev.mailbox]
                     }));
                 }
            }
        }
    };
    checkMail();
  }, [isLoaded, gameState.userProfile]);


  // --- HANDLERS ---

  const handleProfileSubmit = () => {
    if(!profileNickname.trim()) return;
    const profile = { nickname: profileNickname, avatarUrl: '' }; // Avatar generation can be added later
    setGameState(prev => ({
        ...prev,
        userProfile: profile,
        currentScreen: 'entryPoint'
    }));
  };

  const handleEnterNexus = () => {
     setGameState(prev => ({ ...prev, currentScreen: 'entryPoint' }));
  };

  const handleEnterRealWorld = () => {
    setGameState(prev => ({ ...prev, currentScreen: 'realWorld' }));
  };

  const handleEnterHeartSphere = () => {
    setGameState(prev => ({ ...prev, currentScreen: 'sceneSelection' }));
  };

  const handleSceneSelect = (sceneId: string) => {
    setGameState(prev => ({ ...prev, selectedSceneId: sceneId, currentScreen: 'characterSelection' }));
  };

  const handleCharacterSelect = (character: Character) => {
    if (gameState.activeJournalEntryId) {
        // We are carrying a question!
        const entry = gameState.journalEntries.find(e => e.id === gameState.activeJournalEntryId);
        if (entry) {
             const contextMsg: Message = {
                 id: `ctx_${Date.now()}`,
                 role: 'user',
                 text: `【系统提示：用户带着一个日记中的问题进入了心域】\n日记标题：${entry.title}\n日记内容：${entry.content}\n\n我的问题是：${entry.content} (请结合你的角色身份给我一些建议或安慰)`,
                 timestamp: Date.now()
             };
             // Pre-inject this message into history if history is empty
             setGameState(prev => ({
                ...prev,
                history: {
                    ...prev.history,
                    [character.id]: [contextMsg]
                },
                selectedCharacterId: character.id,
                tempStoryCharacter: null, // Clear story char
                currentScreen: 'chat'
             }));
             return;
        }
    }

    setGameState(prev => ({ 
        ...prev, 
        selectedCharacterId: character.id, 
        tempStoryCharacter: null, // Clear story char
        selectedScenarioId: null, // Ensure not in scenario mode
        currentScreen: 'chat' 
    }));
  };

  // Chat with character from Journal (Echoes)
  const handleChatWithCharacterByName = (characterName: string) => {
    // Find the character and scene
    const allScenes = [...WORLD_SCENES, ...gameState.customScenes];
    let foundChar: Character | null = null;
    let foundSceneId: string | null = null;

    for (const scene of allScenes) {
        const char = scene.characters.find(c => c.name === characterName);
        if (char) {
            foundChar = char;
            foundSceneId = scene.id;
            break;
        }
    }

    if (foundChar && foundSceneId) {
        setGameState(prev => ({
            ...prev,
            selectedSceneId: foundSceneId,
            selectedCharacterId: foundChar!.id,
            tempStoryCharacter: null,
            currentScreen: 'chat'
        }));
    } else {
        alert(`无法找到名为 "${characterName}" 的角色。可能该角色所在的时代已被删除。`);
    }
  };

  const handleChatBack = (echo?: JournalEcho) => {
    // If we have a generated echo and an active journal entry, save it
    if (echo && gameState.activeJournalEntryId) {
        setGameState(prev => ({
            ...prev,
            journalEntries: prev.journalEntries.map(entry => 
                entry.id === prev.activeJournalEntryId 
                ? { ...entry, echo: echo } 
                : entry
            ),
            activeJournalEntryId: null // Clear active entry
        }));
        // Go back to Real World to see the echo
        setGameState(prev => ({ ...prev, selectedCharacterId: null, tempStoryCharacter: null, currentScreen: 'realWorld' }));
    } else {
        // Normal back
        setGameState(prev => ({ ...prev, selectedCharacterId: null, tempStoryCharacter: null, currentScreen: 'characterSelection' }));
    }
  };

  const handleUpdateHistory = (msgs: Message[]) => {
    if (!gameState.selectedCharacterId) return;
    setGameState(prev => ({
      ...prev,
      history: { ...prev.history, [prev.selectedCharacterId!]: msgs }
    }));
  };

  const handleGenerateAvatar = async (character: Character) => {
    if (gameState.generatingAvatarId) return;
    
    // Check local custom avatars first
    if (gameState.customAvatars[character.id]) {
       // Already have one, maybe user wants to regenerate? For now let's just use it or regen.
    }

    setGameState(prev => ({ ...prev, generatingAvatarId: character.id }));
    try {
      const newAvatarUrl = await geminiService.generateCharacterImage(character);
      if (newAvatarUrl) {
        setGameState(prev => ({
          ...prev,
          customAvatars: { ...prev.customAvatars, [character.id]: newAvatarUrl }
        }));
      }
    } catch (e) {
      console.error("Avatar gen failed", e);
    } finally {
      setGameState(prev => ({ ...prev, generatingAvatarId: null }));
    }
  };

  // Era Constructor Handlers
  const handleSaveEra = (newScene: WorldScene) => {
    setGameState(prev => {
        const exists = prev.customScenes.some(s => s.id === newScene.id);
        if (exists) {
            // Update existing
            return {
                ...prev,
                customScenes: prev.customScenes.map(s => s.id === newScene.id ? newScene : s)
            };
        } else {
            // Add new
            return {
                ...prev,
                customScenes: [...prev.customScenes, newScene]
            };
        }
    });
    setShowEraCreator(false);
    setEditingScene(null);
  };

  const handleDeleteEra = (sceneId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if(window.confirm("确定要删除这个时代吗？里面的所有角色和记忆都将消失。")) {
          setGameState(prev => ({
              ...prev,
              customScenes: prev.customScenes.filter(s => s.id !== sceneId)
          }));
      }
  };

  // Character Constructor Handlers
  const handleSaveCharacter = (newCharacter: Character) => {
    if (!gameState.selectedSceneId) return;
    setGameState(prev => ({
        ...prev,
        customScenes: prev.customScenes.map(scene => {
            if (scene.id === prev.selectedSceneId) {
                return { ...scene, characters: [...scene.characters, newCharacter] };
            }
            return scene;
        })
    }));
    setShowCharacterCreator(false);
  };

  // Scenario Builder Handlers
  const handleSaveScenario = (scenario: CustomScenario) => {
    if (!gameState.selectedSceneId) return;
    
    // Ensure scenario belongs to current scene
    const completeScenario = { ...scenario, sceneId: gameState.selectedSceneId };
    
    setGameState(prev => {
        const exists = prev.customScenarios.some(s => s.id === scenario.id);
        let newScenarios = [...prev.customScenarios];
        if (exists) {
            newScenarios = newScenarios.map(s => s.id === scenario.id ? completeScenario : s);
        } else {
            newScenarios.push(completeScenario);
        }
        return {
            ...prev,
            customScenarios: newScenarios,
            currentScreen: 'characterSelection', // Back to list
            editingScenarioId: null
        };
    });
  };

  const handleDeleteScenario = (scenarioId: string, e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent card click
      if (window.confirm("确定要删除这个剧本吗？")) {
          setGameState(prev => ({
              ...prev,
              customScenarios: prev.customScenarios.filter(s => s.id !== scenarioId)
          }));
      }
  };

  const handleEditScenario = (scenario: CustomScenario, e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent card click
      setGameState(prev => ({
          ...prev,
          editingScenarioId: scenario.id,
          currentScreen: 'builder'
      }));
  };

  const handlePlayScenario = (scenario: CustomScenario) => {
      const startNode = scenario.nodes[scenario.startNodeId];
      
      // FIX: Find the current scene to get its background image
      const allScenes = [...WORLD_SCENES, ...gameState.customScenes];
      const scene = allScenes.find(s => s.id === gameState.selectedSceneId);
      const sceneImage = scene?.imageUrl || 'https://picsum.photos/seed/default_bg/1080/1920';

      // Create a dummy character for the scenario narrator
      const narrator: Character = {
          id: `narrator_${scenario.id}`,
          name: '旁白',
          age: 0,
          role: 'Narrator',
          bio: 'AI Narrator',
          avatarUrl: sceneImage, // Use scene image to prevent black screen
          backgroundUrl: sceneImage, // Use scene image
          systemInstruction: 'You are the narrator.',
          themeColor: 'gray-500',
          colorAccent: '#6b7280',
          firstMessage: startNode.prompt, // Initial state
          voiceName: 'Kore'
      };

      // Reset session to avoid pollution
      geminiService.resetSession(narrator.id);

      setGameState(prev => ({
          ...prev,
          selectedCharacterId: narrator.id,
          tempStoryCharacter: narrator, // Store transient character
          selectedScenarioId: scenario.id,
          currentScenarioState: { scenarioId: scenario.id, currentNodeId: scenario.startNodeId },
          // Reset history for this scenario run
          history: { ...prev.history, [narrator.id]: [] }, 
          currentScreen: 'chat'
      }));
  };

  // Journal Handlers
  const handleAddJournalEntry = (title: string, content: string, imageUrl?: string, insight?: string) => {
      const newEntry: JournalEntry = {
          id: `entry_${Date.now()}`,
          title,
          content,
          timestamp: Date.now(),
          imageUrl,
          insight
      };
      setGameState(prev => ({
          ...prev,
          journalEntries: [...prev.journalEntries, newEntry]
      }));
  };

  const handleUpdateJournalEntry = (updatedEntry: JournalEntry) => {
      setGameState(prev => ({
          ...prev,
          journalEntries: prev.journalEntries.map(e => e.id === updatedEntry.id ? updatedEntry : e)
      }));
  };

  const handleDeleteJournalEntry = (id: string) => {
      setGameState(prev => ({
          ...prev,
          journalEntries: prev.journalEntries.filter(e => e.id !== id)
      }));
  };

  const handleExploreWithEntry = (entry: JournalEntry) => {
      // Set the active entry and navigate to HeartSphere
      setGameState(prev => ({
          ...prev,
          activeJournalEntryId: entry.id,
          currentScreen: 'sceneSelection'
      }));
  };

  // Mailbox Handlers
  const handleMarkMailRead = (mailId: string) => {
      setGameState(prev => ({
          ...prev,
          mailbox: prev.mailbox.map(m => m.id === mailId ? { ...m, isRead: true } : m)
      }));
  };

  // Era Memory Handlers
  const handleAddMemory = (content: string, imageUrl?: string) => {
    if (!memoryScene) return;
    const newMemory: EraMemory = {
        id: `mem_${Date.now()}`,
        content,
        imageUrl,
        timestamp: Date.now()
    };
    
    setGameState(prev => {
        const existingMemories = prev.sceneMemories[memoryScene.id] || [];
        return {
            ...prev,
            sceneMemories: {
                ...prev.sceneMemories,
                [memoryScene.id]: [...existingMemories, newMemory]
            }
        };
    });
  };

  const handleDeleteMemory = (memoryId: string) => {
     if (!memoryScene) return;
     setGameState(prev => {
         const existingMemories = prev.sceneMemories[memoryScene.id] || [];
         return {
             ...prev,
             sceneMemories: {
                 ...prev.sceneMemories,
                 [memoryScene.id]: existingMemories.filter(m => m.id !== memoryId)
             }
         };
     });
  };

  // Helper to open memory modal
  const openMemoryModal = (e: React.MouseEvent, scene: WorldScene) => {
      e.stopPropagation();
      setMemoryScene(scene);
      setShowEraMemory(true);
  };


  if (!isLoaded) return <div className="h-screen w-screen bg-black flex items-center justify-center text-white">Loading HeartSphere Core...</div>;

  const currentScene = [...WORLD_SCENES, ...gameState.customScenes].find(s => s.id === gameState.selectedSceneId);
  
  // Logic to determine the active character. 
  // If we are in story mode (tempStoryCharacter exists), use that. Otherwise find in scene.
  const currentCharacter = gameState.tempStoryCharacter || currentScene?.characters.find(c => c.id === gameState.selectedCharacterId);

  const editingScenario = gameState.editingScenarioId 
    ? gameState.customScenarios.find(s => s.id === gameState.editingScenarioId) 
    : null;
  const currentScenario = gameState.selectedScenarioId
    ? gameState.customScenarios.find(s => s.id === gameState.selectedScenarioId)
    : null;

  return (
    <div className="relative h-screen w-screen bg-black overflow-hidden font-sans text-white">
      
      {/* 1. Profile Setup Screen */}
      {gameState.currentScreen === 'profileSetup' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-6">
           <div className="max-w-md w-full text-center space-y-8">
               <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">Welcome to HeartSphere</h1>
               <p className="text-gray-400">首先，请告诉我们该如何称呼你。</p>
               <input 
                 type="text" 
                 value={profileNickname} 
                 onChange={(e) => setProfileNickname(e.target.value)} 
                 placeholder="输入你的昵称"
                 className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-center text-lg focus:border-pink-500 outline-none"
               />
               <Button fullWidth onClick={handleProfileSubmit} disabled={!profileNickname.trim()}>进入世界</Button>
           </div>
        </div>
      )}

      {/* 2. Nexus Entry Point */}
      {gameState.currentScreen === 'entryPoint' && gameState.userProfile && (
          <EntryPoint 
            onNavigate={(screen) => setGameState(prev => ({ ...prev, currentScreen: screen }))} 
            nickname={gameState.userProfile.nickname} 
            onOpenSettings={() => setShowSettingsModal(true)}
          />
      )}

      {/* 3. Real World Journal Screen */}
      {gameState.currentScreen === 'realWorld' && (
          <RealWorldScreen 
             entries={gameState.journalEntries}
             onAddEntry={handleAddJournalEntry}
             onUpdateEntry={handleUpdateJournalEntry}
             onDeleteEntry={handleDeleteJournalEntry}
             onExplore={handleExploreWithEntry}
             onChatWithCharacter={handleChatWithCharacterByName}
             onBack={handleEnterNexus}
          />
      )}

      {/* 4. HeartSphere Scene Selection */}
      {gameState.currentScreen === 'sceneSelection' && (
        <div className="h-full flex flex-col p-8 bg-gradient-to-br from-gray-900 to-black">
           <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                  <Button variant="ghost" onClick={handleEnterNexus} className="!p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </Button>
                  <div>
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">心域 HeartSphere</h2>
                    <p className="text-gray-400 text-sm">选择一个时代切片进行连接</p>
                  </div>
              </div>
              
              <div className="flex items-center gap-3">
                  {/* Mailbox Button */}
                  <button 
                    onClick={() => setShowMailbox(true)}
                    className="relative p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all"
                  >
                      <span className="text-xl">📬</span>
                      {gameState.mailbox.some(m => !m.isRead) && (
                          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-bounce" />
                      )}
                  </button>
                  {/* Create Era Button */}
                  <Button onClick={() => { setEditingScene(null); setShowEraCreator(true); }} className="text-sm bg-pink-600 hover:bg-pink-500">
                     + 创造新时代
                  </Button>
              </div>
           </div>

           {/* Active Question Banner */}
           {gameState.activeJournalEntryId && (
               <div className="mb-6 p-4 bg-indigo-900/40 border border-indigo-500/50 rounded-xl flex items-center justify-between">
                   <div className="flex items-center gap-3">
                       <span className="text-2xl">🎒</span>
                       <div>
                           <p className="text-indigo-200 font-bold text-sm">你正在带着问题旅行</p>
                           <p className="text-white text-xs opacity-80 truncate max-w-md">
                               {gameState.journalEntries.find(e => e.id === gameState.activeJournalEntryId)?.title}
                           </p>
                       </div>
                   </div>
                   <button onClick={() => setGameState(prev => ({...prev, activeJournalEntryId: null}))} className="text-xs text-indigo-300 hover:text-white underline">
                       放下问题
                   </button>
               </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10 scrollbar-hide">
              {/* Combine Standard and Custom Scenes for rendering */}
              {[...WORLD_SCENES, ...gameState.customScenes].map(scene => {
                 const isCustom = gameState.customScenes.some(s => s.id === scene.id);
                 return (
                    <div key={scene.id} className="relative group">
                        <SceneCard scene={scene} onSelect={() => handleSceneSelect(scene.id)} />
                        
                        {/* Custom Era Actions (Edit/Delete) - Only for custom scenes */}
                        {isCustom && (
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                onClick={(e) => { e.stopPropagation(); setEditingScene(scene); setShowEraCreator(true); }}
                                className="p-2 bg-black/60 rounded-full hover:bg-white/20 border border-white/20 text-white"
                                title="编辑时代"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>
                                </button>
                                <button 
                                onClick={(e) => handleDeleteEra(scene.id, e)}
                                className="p-2 bg-black/60 rounded-full hover:bg-red-500/50 border border-white/20 text-white"
                                title="删除时代"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                </button>
                            </div>
                        )}
                        
                        {/* Era Memories Button - For ALL scenes */}
                        <button
                            onClick={(e) => openMemoryModal(e, scene)}
                            className="absolute bottom-4 right-4 z-20 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-xs font-bold text-white hover:bg-pink-600 hover:border-pink-400 transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1"
                        >
                            <span>📷</span> 我的回忆
                        </button>
                    </div>
                 );
              })}
           </div>
        </div>
      )}

      {/* 5. Character Selection & Stories */}
      {gameState.currentScreen === 'characterSelection' && currentScene && (
         <div className="h-full flex flex-col p-8 bg-gray-900">
             <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-4">
                     <Button variant="ghost" onClick={() => setGameState(prev => ({...prev, currentScreen: 'sceneSelection'}))} className="!p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                     </Button>
                     <div>
                         <h2 className="text-3xl font-bold text-white">{currentScene.name}</h2>
                         <p className="text-gray-400 text-sm">选择你的连接对象</p>
                     </div>
                 </div>
                 {/* Show Create Character Button only for Custom Scenes */}
                 {gameState.customScenes.some(s => s.id === currentScene.id) && (
                     <Button onClick={() => setShowCharacterCreator(true)} className="bg-indigo-600 hover:bg-indigo-500">
                         + 添加新角色
                     </Button>
                 )}
             </div>

             {/* Custom Storylines Section - MOVED TO TOP */}
             <div className="mb-8 pb-8 border-b border-gray-800">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="text-xl font-bold text-gray-400">剧本 / 故事线</h3>
                     <Button onClick={() => setGameState(prev => ({ ...prev, currentScreen: 'builder', editingScenarioId: null }))} className="text-sm bg-purple-600 hover:bg-purple-500">
                         + 创作新剧本
                     </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {gameState.customScenarios.filter(s => s.sceneId === currentScene.id).map(scenario => (
                        <div key={scenario.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center">
                            <div className="cursor-pointer flex-1" onClick={() => handlePlayScenario(scenario)}>
                                <h4 className="font-bold text-white hover:text-purple-400 transition-colors">{scenario.title}</h4>
                                <p className="text-xs text-gray-500 line-clamp-1">{scenario.description}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={(e) => handleEditScenario(scenario, e)} className="text-gray-500 hover:text-white" title="编辑">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={(e) => handleDeleteScenario(scenario.id, e)} className="text-gray-500 hover:text-red-400" title="删除">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                    {gameState.customScenarios.filter(s => s.sceneId === currentScene.id).length === 0 && (
                        <p className="text-sm text-gray-600 col-span-3 text-center py-4">暂无自定义剧本。</p>
                    )}
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-10 scrollbar-hide">
                 {currentScene.characters.map(char => (
                     <CharacterCard 
                       key={char.id} 
                       character={char} 
                       customAvatarUrl={gameState.customAvatars[char.id]}
                       isGenerating={gameState.generatingAvatarId === char.id}
                       onSelect={handleCharacterSelect}
                       onGenerate={handleGenerateAvatar}
                     />
                 ))}
                 
                 {/* Main Story Card (Only for University Era currently) */}
                 {currentScene.mainStory && (
                     <div 
                       onClick={() => handleCharacterSelect(currentScene.mainStory!)}
                       className="group relative h-96 w-full cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed border-indigo-500/50 hover:border-indigo-400 bg-indigo-900/10 flex flex-col items-center justify-center transition-all hover:scale-[1.02]"
                     >
                         <div className="text-4xl mb-4">📖</div>
                         <h3 className="text-2xl font-bold text-indigo-300">主线故事</h3>
                         <p className="text-indigo-400/60 text-sm mt-2">{currentScene.mainStory.name}</p>
                     </div>
                 )}
             </div>
         </div>
      )}

      {/* 6. Scenario Builder Screen */}
      {gameState.currentScreen === 'builder' && (
          <ScenarioBuilder 
             initialScenario={editingScenario}
             onSave={handleSaveScenario}
             onCancel={() => setGameState(prev => ({ ...prev, currentScreen: 'characterSelection', editingScenarioId: null }))}
          />
      )}

      {/* 7. Chat Window */}
      {gameState.currentScreen === 'chat' && currentCharacter && gameState.userProfile && (
        <ChatWindow 
          // IMPORTANT: Key forces remount when switching characters, cleaning up all internal state and hooks
          key={currentCharacter.id}
          character={currentCharacter}
          customScenario={currentScenario || undefined}
          history={gameState.history[currentCharacter.id] || []}
          scenarioState={gameState.currentScenarioState}
          userProfile={gameState.userProfile}
          settings={gameState.settings}
          activeJournalEntryId={gameState.activeJournalEntryId} // Pass the context
          onUpdateHistory={handleUpdateHistory}
          onBack={handleChatBack}
          onUpdateScenarioState={currentScenario ? (nodeId) => setGameState(prev => ({
              ...prev, currentScenarioState: { scenarioId: currentScenario.id, currentNodeId: nodeId }
          })) : undefined}
        />
      )}

      {/* MODALS */}
      {showSettingsModal && (
        <SettingsModal 
          settings={gameState.settings} 
          gameState={gameState}
          onSettingsChange={(s) => setGameState(prev => ({ ...prev, settings: s }))} 
          onClose={() => setShowSettingsModal(false)} 
        />
      )}

      {showEraCreator && (
        <EraConstructorModal 
          initialScene={editingScene}
          onSave={handleSaveEra} 
          onClose={() => { setShowEraCreator(false); setEditingScene(null); }} 
        />
      )}

      {showCharacterCreator && currentScene && (
          <CharacterConstructorModal
            scene={currentScene}
            onSave={handleSaveCharacter}
            onClose={() => setShowCharacterCreator(false)}
          />
      )}
      
      {showMailbox && (
          <MailboxModal
            mails={gameState.mailbox}
            onClose={() => setShowMailbox(false)}
            onMarkAsRead={handleMarkMailRead}
          />
      )}

      {showEraMemory && memoryScene && (
          <EraMemoryModal
             scene={memoryScene}
             memories={gameState.sceneMemories[memoryScene.id] || []}
             onAddMemory={handleAddMemory}
             onDeleteMemory={handleDeleteMemory}
             onClose={() => { setShowEraMemory(false); setMemoryScene(null); }}
          />
      )}

    </div>
  );
};

export default App;
