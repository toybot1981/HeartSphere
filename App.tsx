
import React, { useState, useEffect, useRef } from 'react';
import { WORLD_SCENES, APP_TITLE } from './constants';
import { ChatWindow } from './components/ChatWindow';
import { ScenarioBuilder } from './components/ScenarioBuilder';
import { SettingsModal } from './components/SettingsModal';
import { CharacterCard } from './components/CharacterCard';
import { SceneCard } from './components/SceneCard';
import { Character, GameState, Message, CustomScenario, AppSettings, WorldScene, JournalEntry, JournalEcho, Mail, EraMemory, DebugLog } from './types';
import { geminiService } from './services/gemini';
import { storageService } from './services/storage';
import { EraConstructorModal } from './components/EraConstructorModal';
import { CharacterConstructorModal } from './components/CharacterConstructorModal';
import { EntryPoint } from './components/EntryPoint';
import { RealWorldScreen } from './components/RealWorldScreen';
import { MailboxModal } from './components/MailboxModal';
import { EraMemoryModal } from './components/EraMemoryModal';
import { Button } from './components/Button';
import { DebugConsole } from './components/DebugConsole';
import { ConnectionSpace } from './components/ConnectionSpace';
import { AdminScreen } from './admin/AdminScreen';
import { LoginModal } from './components/LoginModal';
import { MobileApp } from './mobile/MobileApp';

const App: React.FC = () => {
  
  // Simple Client-Side Routing Check
  const [isMobileMode, setIsMobileMode] = useState(false);

  const EXAMPLE_SCENARIO: CustomScenario = {
      id: 'example_scenario_01',
      sceneId: 'university_era',
      title: '示例剧本：深夜网咖的邂逅',
      description: '在这座城市的霓虹灯下，你走进了一家名为“Binary Beans”的网咖...',
      author: 'System', startNodeId: 'start',
      nodes: {
          'start': { id: 'start', title: '初入网咖', prompt: 'User enters a cyberpunk internet cafe at rainy night. Introduce a mysterious hacker girl (Yuki style) sitting in the corner, looking nervous. The barista asks for the user\'s order.', options: [ { id: 'opt_1', text: '走向那个黑客少女', nextNodeId: 'node_hacker' }, { id: 'opt_2', text: '点一杯咖啡，坐在吧台', nextNodeId: 'node_coffee' } ] },
          'node_hacker': { id: 'node_hacker', title: '黑客的求助', prompt: 'The girl hands over a data chip. "They are watching," she whispers. Suddenly, the cafe lights turn red. Action scene begins.', options: [ { id: 'opt_help', text: '答应帮助她', nextNodeId: 'node_mission_start' }, { id: 'opt_leave', text: '表示对此不感兴趣，离开', nextNodeId: 'start' } ] },
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
    customCharacters: {},
    customScenarios: [EXAMPLE_SCENARIO],
    customScenes: [],
    journalEntries: [],
    activeJournalEntryId: null,
    settings: { 
      autoGenerateAvatars: false, 
      autoGenerateStoryScenes: false,
      autoGenerateJournalImages: false,
      debugMode: false,
      textProvider: 'gemini',
      imageProvider: 'gemini',
      videoProvider: 'gemini',
      audioProvider: 'gemini',
      enableFallback: true,
      geminiConfig: { apiKey: '', modelName: 'gemini-2.5-flash', imageModel: 'gemini-2.5-flash-image', videoModel: 'veo-3.1-fast-generate-preview' },
      openaiConfig: { apiKey: '', baseUrl: 'https://api.openai.com/v1', modelName: 'gpt-4o', imageModel: 'dall-e-3' },
      qwenConfig: { apiKey: 'sk-a486b81e29484fcea112b2c010b7bd95', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', modelName: 'qwen-max', imageModel: 'qwen-image-plus', videoModel: 'wanx-video' },
      doubaoConfig: { apiKey: '', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', modelName: 'ep-20240604052345-xxxxx', imageModel: 'doubao-image-v1', videoModel: 'doubao-video-v1' }
    },
    mailbox: [],
    lastLoginTime: Date.now(),
    sceneMemories: {}, 
    debugLogs: [],
  };

  const [gameState, setGameState] = useState<GameState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false); 
  
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEraCreator, setShowEraCreator] = useState(false);
  const [editingScene, setEditingScene] = useState<WorldScene | null>(null); 
  
  const [showCharacterCreator, setShowCharacterCreator] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [editingCharacterSceneId, setEditingCharacterSceneId] = useState<string | null>(null);

  const [showMailbox, setShowMailbox] = useState(false);
  
  const [showEraMemory, setShowEraMemory] = useState(false);
  const [memoryScene, setMemoryScene] = useState<WorldScene | null>(null);

  const [profileNickname, setProfileNickname] = useState('');

  const [showLoginModal, setShowLoginModal] = useState(false);
  const pendingActionRef = useRef<() => void>(() => {});

  const hasCheckedMail = useRef(false);

  // --- PERSISTENCE LOGIC ---
  
  const loadGameData = async () => {
      setIsLoaded(false);
      const loadedState = await storageService.loadState();
      if (loadedState) {
          const savedSettings = (loadedState.settings || {}) as Partial<AppSettings>;
          
          const mergedSettings: AppSettings = {
              ...DEFAULT_STATE.settings,
              ...savedSettings,
              geminiConfig: { ...DEFAULT_STATE.settings.geminiConfig, ...(savedSettings.geminiConfig || {}) },
              openaiConfig: { ...DEFAULT_STATE.settings.openaiConfig, ...(savedSettings.openaiConfig || {}) },
              qwenConfig: { ...DEFAULT_STATE.settings.qwenConfig, ...(savedSettings.qwenConfig || {}) },
              doubaoConfig: { ...DEFAULT_STATE.settings.doubaoConfig, ...(savedSettings.doubaoConfig || {}) },
              autoGenerateAvatars: savedSettings.autoGenerateAvatars ?? DEFAULT_STATE.settings.autoGenerateAvatars,
              autoGenerateStoryScenes: savedSettings.autoGenerateStoryScenes ?? DEFAULT_STATE.settings.autoGenerateStoryScenes,
              autoGenerateJournalImages: savedSettings.autoGenerateJournalImages ?? DEFAULT_STATE.settings.autoGenerateJournalImages,
              textProvider: savedSettings.textProvider || DEFAULT_STATE.settings.textProvider,
              imageProvider: savedSettings.imageProvider || DEFAULT_STATE.settings.imageProvider,
              videoProvider: savedSettings.videoProvider || DEFAULT_STATE.settings.videoProvider,
              audioProvider: savedSettings.audioProvider || DEFAULT_STATE.settings.audioProvider,
              enableFallback: savedSettings.enableFallback ?? DEFAULT_STATE.settings.enableFallback,
          };

          setGameState(prev => ({
            ...prev,
            ...loadedState,
            currentScreen: loadedState.userProfile ? 'entryPoint' : 'profileSetup',
            generatingAvatarId: null,
            activeJournalEntryId: null,
            editingScenarioId: null,
            tempStoryCharacter: null, 
            mailbox: loadedState.mailbox || [],
            lastLoginTime: loadedState.lastLoginTime || Date.now(),
            sceneMemories: loadedState.sceneMemories || {},
            customCharacters: loadedState.customCharacters || {},
            debugLogs: [], 
            settings: mergedSettings
          }));
          
          geminiService.updateConfig(mergedSettings);
      } else {
          geminiService.updateConfig(DEFAULT_STATE.settings);
      }
      setIsLoaded(true);
  };

  useEffect(() => {
    loadGameData();
  }, []);

  useEffect(() => {
    if (!isLoaded) return; 

    geminiService.updateConfig(gameState.settings);

    const timer = setTimeout(() => {
      const stateToSave = { ...gameState, lastLoginTime: Date.now() };
      storageService.saveState(stateToSave);
    }, 1000);

    return () => clearTimeout(timer);
  }, [gameState, isLoaded]);

  // Logging hook
  useEffect(() => {
      geminiService.setLogCallback((log: DebugLog) => {
          setGameState(prev => ({
              ...prev,
              debugLogs: [...prev.debugLogs, log]
          }));
      });
  }, []);

  // Mail check
  useEffect(() => {
    if (!isLoaded || !gameState.userProfile || hasCheckedMail.current) return;
    const checkMail = async () => {
        hasCheckedMail.current = true;
        const now = Date.now();
        const offlineDuration = now - gameState.lastLoginTime;
        const THRESHOLD = 60 * 1000; 

        if (offlineDuration > THRESHOLD) {
            const chattedCharIds = Object.keys(gameState.history);
            let candidate: Character | null = null;
            if (chattedCharIds.length > 0) {
                 const allScenes = [...WORLD_SCENES, ...gameState.customScenes];
                 for (const scene of allScenes) {
                     const sceneChars = [...scene.characters, ...(gameState.customCharacters[scene.id] || [])];
                     const found = sceneChars.find(c => c.id === chattedCharIds[0]);
                     if (found) { candidate = found; break; }
                 }
            }
            if (!candidate) candidate = WORLD_SCENES[0].characters[0]; 

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
                     setGameState(prev => ({ ...prev, mailbox: [newMail, ...prev.mailbox] }));
                 }
            }
        }
    };
    checkMail();
  }, [isLoaded, gameState.userProfile]);


  // --- AUTH HELPER ---
  
  const requireAuth = (action: () => void) => {
    if (gameState.userProfile?.isGuest) {
      pendingActionRef.current = action;
      setShowLoginModal(true);
    } else {
      action();
    }
  };

  const handleLoginSuccess = (method: 'phone' | 'wechat', identifier: string) => {
    setGameState(prev => ({
      ...prev,
      userProfile: prev.userProfile ? {
        ...prev.userProfile,
        isGuest: false,
        id: identifier, 
        phoneNumber: method === 'phone' ? identifier : undefined,
      } : null
    }));
    setShowLoginModal(false);
    
    if (pendingActionRef.current) {
      pendingActionRef.current();
      pendingActionRef.current = () => {};
    }
  };

  const handleLogout = () => {
    if (window.confirm("确定要退出登录吗？")) {
        setGameState(prev => ({
            ...prev,
            userProfile: null,
            currentScreen: 'profileSetup'
        }));
        setShowSettingsModal(false);
    }
  };


  // --- HANDLERS ---

  const handleSwitchToMobile = async () => {
    // Save PC state before switching
    await storageService.saveState({ ...gameState, lastLoginTime: Date.now() });
    setIsMobileMode(true);
  };

  const handleSwitchToPC = () => {
    setIsMobileMode(false);
    // Reload data to pick up changes from mobile
    loadGameData();
  };

  const handleProfileSubmit = () => {
    if(!profileNickname.trim()) return;
    const profile = { 
        nickname: profileNickname, 
        avatarUrl: '',
        isGuest: true, 
        id: `guest_${Date.now()}`
    }; 
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

  const handleSceneSelect = (sceneId: string) => {
    setGameState(prev => ({ 
        ...prev, 
        selectedSceneId: sceneId, 
        selectedCharacterId: null,
        tempStoryCharacter: null,
        selectedScenarioId: null,
        currentScreen: 'characterSelection' 
    }));
  };

  const handleCharacterSelect = (character: Character) => {
    if (gameState.activeJournalEntryId) {
        const entry = gameState.journalEntries.find(e => e.id === gameState.activeJournalEntryId);
        if (entry) {
             const contextMsg: Message = {
                 id: `ctx_${Date.now()}`,
                 role: 'user',
                 text: `【系统提示：用户带着一个日记中的问题进入了心域】\n日记标题：${entry.title}\n日记内容：${entry.content}\n\n我的问题是：${entry.content} (请结合你的角色身份给我一些建议或安慰)`,
                 timestamp: Date.now()
             };
             setGameState(prev => ({
                ...prev,
                history: {
                    ...prev.history,
                    [character.id]: [contextMsg]
                },
                selectedCharacterId: character.id,
                tempStoryCharacter: null,
                selectedScenarioId: null, 
                currentScreen: 'chat'
             }));
             return;
        }
    }

    setGameState(prev => ({ 
        ...prev, 
        selectedCharacterId: character.id, 
        tempStoryCharacter: null, 
        selectedScenarioId: null, 
        currentScenarioState: undefined,
        currentScreen: 'chat' 
    }));
  };

  const handleChatWithCharacterByName = (characterName: string) => {
    const allScenes = [...WORLD_SCENES, ...gameState.customScenes];
    let foundChar: Character | null = null;
    let foundSceneId: string | null = null;

    for (const scene of allScenes) {
        const sceneChars = [...scene.characters, ...(gameState.customCharacters[scene.id] || [])];
        const char = sceneChars.find(c => c.name === characterName);
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
            selectedScenarioId: null,
            currentScreen: 'chat'
        }));
    } else {
        alert(`无法找到名为 "${characterName}" 的角色。可能该角色所在的时代已被删除。`);
    }
  };

  const handleChatBack = (echo?: JournalEcho) => {
    if (echo && gameState.activeJournalEntryId) {
        setGameState(prev => ({
            ...prev,
            journalEntries: prev.journalEntries.map(entry => 
                entry.id === prev.activeJournalEntryId 
                ? { ...entry, echo: echo } 
                : entry
            ),
            activeJournalEntryId: null 
        }));
        setGameState(prev => ({ ...prev, selectedCharacterId: null, tempStoryCharacter: null, selectedScenarioId: null, currentScreen: 'realWorld' }));
    } else {
        setGameState(prev => ({ 
            ...prev, 
            selectedCharacterId: null, 
            tempStoryCharacter: null, 
            selectedScenarioId: null, 
            currentScenarioState: undefined,
            currentScreen: 'characterSelection' 
        }));
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

  const handleSaveEra = (newScene: WorldScene) => {
    setGameState(prev => {
        const exists = prev.customScenes.some(s => s.id === newScene.id);
        if (exists) {
            return {
                ...prev,
                customScenes: prev.customScenes.map(s => s.id === newScene.id ? newScene : s)
            };
        } else {
            return {
                ...prev,
                customScenes: [...prev.customScenes, newScene]
            };
        }
    });
    setShowEraCreator(false);
    setEditingScene(null);
  };

  const handleDeleteEra = (sceneId: string, e?: React.MouseEvent) => {
      if (e) {
          e.stopPropagation();
          e.preventDefault();
      }
      if(window.confirm("确定要删除这个时代吗？里面的所有角色和记忆都将消失。")) {
          setGameState(prev => ({
              ...prev,
              customScenes: prev.customScenes.filter(s => s.id !== sceneId),
              customCharacters: Object.fromEntries(
                 Object.entries(prev.customCharacters).filter(([id]) => id !== sceneId)
              )
          }));
          setShowEraCreator(false);
          setEditingScene(null);
      }
  };

  const handleSaveCharacter = (newCharacter: Character) => {
    const sceneId = gameState.selectedSceneId || editingCharacterSceneId;
    
    if (!sceneId) {
        console.error("No scene context for saving character");
        return;
    }
    
    setGameState(prev => {
        const existingCustomChars = prev.customCharacters[sceneId] || [];
        const isEditing = existingCustomChars.some(c => c.id === newCharacter.id);
        
        let newChars = [];
        if (isEditing) {
            newChars = existingCustomChars.map(c => c.id === newCharacter.id ? newCharacter : c);
        } else {
            newChars = [...existingCustomChars, newCharacter];
        }

        return {
            ...prev,
            customCharacters: {
                ...prev.customCharacters,
                [sceneId]: newChars
            }
        };
    });
    
    setShowCharacterCreator(false);
    setEditingCharacter(null);
    setEditingCharacterSceneId(null);
  };

  const handleSaveScenario = (scenario: CustomScenario) => {
    if (!gameState.selectedSceneId && !gameState.editingScenarioId) return;
    
    const sceneId = gameState.selectedSceneId || gameState.customScenarios.find(s => s.id === scenario.id)?.sceneId;
    if (!sceneId) return;

    const completeScenario = { ...scenario, sceneId };
    
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
            currentScreen: prev.currentScreen === 'builder' ? 'characterSelection' : prev.currentScreen, 
            editingScenarioId: null
        };
    });
  };

  const handleDeleteScenario = (scenarioId: string, e: React.MouseEvent) => {
      e.stopPropagation(); 
      e.preventDefault();
      if (window.confirm("确定要删除这个剧本吗？")) {
          setGameState(prev => ({
              ...prev,
              customScenarios: prev.customScenarios.filter(s => s.id !== scenarioId),
              editingScenarioId: prev.editingScenarioId === scenarioId ? null : prev.editingScenarioId,
              selectedScenarioId: prev.selectedScenarioId === scenarioId ? null : prev.selectedScenarioId
          }));
      }
  };

  const handleEditScenario = (scenario: CustomScenario, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setGameState(prev => ({
          ...prev,
          editingScenarioId: scenario.id,
          currentScreen: 'builder'
      }));
  };

  const handlePlayScenario = (scenario: CustomScenario) => {
      const startNode = scenario.nodes[scenario.startNodeId];
      
      const allScenes = [...WORLD_SCENES, ...gameState.customScenes];
      const scene = allScenes.find(s => s.id === gameState.selectedSceneId);
      const sceneImage = scene?.imageUrl || 'https://picsum.photos/seed/default_bg/1080/1920';

      const narrator: Character = {
          id: `narrator_${scenario.id}`,
          name: '旁白',
          age: 0,
          role: 'Narrator',
          bio: 'AI Narrator',
          avatarUrl: sceneImage, 
          backgroundUrl: sceneImage, 
          systemInstruction: 'You are the narrator.',
          themeColor: 'gray-500',
          colorAccent: '#6b7280',
          firstMessage: startNode.prompt, 
          voiceName: 'Kore'
      };

      geminiService.resetSession(narrator.id);

      setGameState(prev => ({
          ...prev,
          selectedCharacterId: narrator.id,
          tempStoryCharacter: narrator, 
          selectedScenarioId: scenario.id,
          currentScenarioState: { scenarioId: scenario.id, currentNodeId: scenario.startNodeId },
          history: { ...prev.history, [narrator.id]: [] }, 
          currentScreen: 'chat'
      }));
  };

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
      setGameState(prev => ({
          ...prev,
          activeJournalEntryId: entry.id,
          currentScreen: 'sceneSelection'
      }));
  };

  const handleConsultMirror = async (content: string, recentContext: string[]): Promise<string | null> => {
      if (gameState.userProfile?.isGuest) {
          requireAuth(() => {
              alert("登录成功！请再次点击“本我镜像”以开始分析。");
          });
          return null;
      }
      
      return geminiService.generateMirrorInsight(content, recentContext);
  };

  const handleMarkMailRead = (mailId: string) => {
      setGameState(prev => ({
          ...prev,
          mailbox: prev.mailbox.map(m => m.id === mailId ? { ...m, isRead: true } : m)
      }));
  };

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

  const openMemoryModal = (e: React.MouseEvent, scene: WorldScene) => {
      e.stopPropagation();
      setMemoryScene(scene);
      setShowEraMemory(true);
  };
  
  const launchEditCharacter = (char: Character, sceneId: string) => {
      setEditingCharacter(char);
      setEditingCharacterSceneId(sceneId);
      setShowCharacterCreator(true);
  };

  const getEditingCharacterScene = () => {
      if (gameState.selectedSceneId) {
          return [...WORLD_SCENES, ...gameState.customScenes].find(s => s.id === gameState.selectedSceneId) || WORLD_SCENES[0];
      }
      if (editingCharacterSceneId) {
          return [...WORLD_SCENES, ...gameState.customScenes].find(s => s.id === editingCharacterSceneId) || WORLD_SCENES[0];
      }
      return WORLD_SCENES[0];
  };

  if (isMobileMode) {
      return <MobileApp onSwitchToPC={handleSwitchToPC} />;
  }

  if (!isLoaded) return <div className="h-screen w-screen bg-black flex items-center justify-center text-white">Loading HeartSphere Core...</div>;

  const currentSceneLocal = [...WORLD_SCENES, ...gameState.customScenes].find(s => s.id === gameState.selectedSceneId);
  
  let sceneCharacters: Character[] = [];
  if (currentSceneLocal) {
      const customCharsForScene = gameState.customCharacters[currentSceneLocal.id] || [];
      sceneCharacters = [...currentSceneLocal.characters, ...customCharsForScene];
  }

  const allCharacters = [...WORLD_SCENES, ...gameState.customScenes].reduce((acc, scene) => {
      const sceneChars = [...scene.characters, ...(gameState.customCharacters[scene.id] || [])];
      return [...acc, ...sceneChars];
  }, [] as Character[]);

  let currentCharacterLocal = gameState.tempStoryCharacter || sceneCharacters.find(c => c.id === gameState.selectedCharacterId);
  if (!currentCharacterLocal && currentSceneLocal?.mainStory?.id === gameState.selectedCharacterId) {
      currentCharacterLocal = currentSceneLocal.mainStory;
  }

  const editingScenarioLocal = gameState.editingScenarioId 
    ? gameState.customScenarios.find(s => s.id === gameState.editingScenarioId) 
    : null;
  const currentScenarioLocal = gameState.selectedScenarioId
    ? gameState.customScenarios.find(s => s.id === gameState.selectedScenarioId)
    : null;

  return (
    <div className="relative h-screen w-screen bg-black overflow-hidden font-sans text-white">
      
      {showLoginModal && (
          <LoginModal 
             onLoginSuccess={handleLoginSuccess}
             onCancel={() => { setShowLoginModal(false); pendingActionRef.current = () => {}; }}
          />
      )}

      {gameState.currentScreen === 'profileSetup' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-6">
           <div className="max-w-md w-full text-center space-y-8">
               <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">Welcome to {APP_TITLE}</h1>
               <p className="text-gray-400">首先，请告诉我们该如何称呼你。</p>
               <input 
                 type="text" 
                 value={profileNickname} 
                 onChange={(e) => setProfileNickname(e.target.value)} 
                 placeholder="输入你的昵称"
                 className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-center text-lg focus:border-pink-500 outline-none"
               />
               <Button fullWidth onClick={handleProfileSubmit} disabled={!profileNickname.trim()}>以访客身份进入</Button>
               <p className="text-xs text-gray-600 mt-4">你可以在之后绑定手机或微信以保存数据。</p>
           </div>
        </div>
      )}

      {gameState.currentScreen === 'entryPoint' && gameState.userProfile && (
          <EntryPoint 
            onNavigate={(screen) => setGameState(prev => ({ ...prev, currentScreen: screen }))} 
            nickname={gameState.userProfile.nickname} 
            onOpenSettings={() => setShowSettingsModal(true)}
            onSwitchToMobile={handleSwitchToMobile}
          />
      )}

      {gameState.currentScreen === 'realWorld' && (
          <RealWorldScreen 
             entries={gameState.journalEntries}
             onAddEntry={handleAddJournalEntry}
             onUpdateEntry={handleUpdateJournalEntry}
             onDeleteEntry={handleDeleteJournalEntry}
             onExplore={handleExploreWithEntry}
             onChatWithCharacter={handleChatWithCharacterByName}
             onBack={handleEnterNexus}
             onConsultMirror={handleConsultMirror} 
             autoGenerateImage={gameState.settings.autoGenerateJournalImages}
          />
      )}

      {gameState.currentScreen === 'connectionSpace' && gameState.userProfile && (
          <ConnectionSpace 
             characters={allCharacters}
             userProfile={gameState.userProfile}
             onBack={() => setGameState(prev => ({ ...prev, currentScreen: 'sceneSelection' }))}
             onConnect={(character) => {
                 requireAuth(() => {
                     const allScenes = [...WORLD_SCENES, ...gameState.customScenes];
                     let sceneId: string | null = null;
                     for (const s of allScenes) {
                         const chars = [...s.characters, ...(gameState.customCharacters[s.id] || [])];
                         if (chars.find(c => c.id === character.id)) {
                             sceneId = s.id;
                             break;
                         }
                     }
                     if (sceneId) {
                         setGameState(prev => ({
                             ...prev,
                             selectedSceneId: sceneId,
                             selectedCharacterId: character.id,
                             currentScreen: 'chat'
                         }));
                     }
                 });
             }}
          />
      )}

      {gameState.currentScreen === 'admin' && (
          <AdminScreen 
             gameState={gameState}
             onUpdateGameState={(newState) => setGameState(newState)}
             onResetWorld={() => storageService.clearMemory()}
             onBack={handleEnterNexus}
          />
      )}

      {gameState.currentScreen === 'sceneSelection' && (
        <div className="h-full flex flex-col p-8 bg-gradient-to-br from-gray-900 to-black">
           <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                  <Button variant="ghost" onClick={handleEnterNexus} className="!p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </Button>
                  <div>
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">{APP_TITLE}</h2>
                    <p className="text-gray-400 text-sm flex items-center gap-2">
                        选择一个时代切片进行连接
                        {gameState.userProfile?.isGuest && <span className="text-[10px] bg-gray-700 px-1 rounded text-gray-300">GUEST MODE</span>}
                    </p>
                  </div>
              </div>
              
              <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGameState(prev => ({ ...prev, currentScreen: 'connectionSpace' }))}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-900 to-indigo-900 border border-blue-500/30 text-blue-200 hover:text-white hover:border-blue-400 transition-all shadow-lg hover:shadow-blue-500/20"
                  >
                      <span className="animate-pulse">✨</span> 心域连接
                  </button>

                  <button 
                    onClick={() => setShowMailbox(true)}
                    className="relative p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all"
                  >
                      <span className="text-xl">📬</span>
                      {gameState.mailbox.some(m => !m.isRead) && (
                          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-bounce" />
                      )}
                  </button>
                  <Button onClick={() => { 
                      requireAuth(() => {
                        setEditingScene(null); 
                        setShowEraCreator(true); 
                      });
                  }} className="text-sm bg-pink-600 hover:bg-pink-500">
                     + 创造新时代
                  </Button>
              </div>
           </div>

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
              {[...WORLD_SCENES, ...gameState.customScenes].map(scene => {
                 const isCustom = gameState.customScenes.some(s => s.id === scene.id);
                 return (
                    <div key={scene.id} className="relative group">
                        <SceneCard scene={scene} onSelect={() => handleSceneSelect(scene.id)} />
                        
                        {isCustom && (
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none group-hover:pointer-events-auto">
                                <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    requireAuth(() => {
                                        setEditingScene(scene); 
                                        setShowEraCreator(true);
                                    });
                                }}
                                className="relative p-2 bg-black/60 rounded-full hover:bg-white/20 border border-white/20 text-white z-40 pointer-events-auto"
                                title="编辑时代"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 pointer-events-none"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>
                                </button>
                                <button 
                                onClick={(e) => handleDeleteEra(scene.id, e)}
                                className="relative p-2 bg-black/60 rounded-full hover:bg-red-500/50 border border-white/20 text-white z-40 pointer-events-auto"
                                title="删除时代"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 pointer-events-none"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                </button>
                            </div>
                        )}
                        
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

      {gameState.currentScreen === 'characterSelection' && currentSceneLocal && (
         <div className="h-full flex flex-col p-8 bg-gray-900">
             <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-4">
                     <Button variant="ghost" onClick={() => setGameState(prev => ({...prev, currentScreen: 'sceneSelection'}))} className="!p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                     </Button>
                     <h2 className="text-3xl font-bold text-white">{currentSceneLocal.name}</h2>
                 </div>
                 <div className="flex gap-2">
                     <Button onClick={() => { 
                         requireAuth(() => {
                            setEditingCharacter(null); 
                            setEditingCharacterSceneId(currentSceneLocal.id); 
                            setShowCharacterCreator(true);
                         });
                     }} className="text-sm">
                        + 新增角色
                     </Button>
                 </div>
             </div>
             
             <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                {currentSceneLocal.mainStory && (
                    <div className="mb-10 p-1 rounded-3xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                        <div className="bg-gray-900 rounded-[22px] overflow-hidden relative group">
                             <div className="absolute inset-0 bg-cover bg-center opacity-40 transition-transform duration-1000 group-hover:scale-105" style={{backgroundImage: `url(${currentSceneLocal.mainStory.backgroundUrl})`}} />
                             <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
                                 <div className="flex-1 space-y-4">
                                     <div className="inline-block px-3 py-1 bg-pink-500 text-white text-xs font-bold rounded-full">主线剧情</div>
                                     <h3 className="text-3xl font-bold text-white">{currentSceneLocal.mainStory.name}</h3>
                                     <p className="text-gray-300 leading-relaxed">{currentSceneLocal.mainStory.bio}</p>
                                     <Button 
                                       onClick={() => handleCharacterSelect(currentSceneLocal.mainStory!)}
                                       className="bg-white text-black hover:bg-gray-200 mt-4 px-8"
                                     >
                                         开始故事
                                     </Button>
                                 </div>
                                 <div className="w-48 h-64 shrink-0 rounded-xl overflow-hidden shadow-2xl border-4 border-white/10 rotate-3 transition-transform group-hover:rotate-0">
                                     <img src={currentSceneLocal.mainStory.avatarUrl} className="w-full h-full object-cover" alt="Story Cover" />
                                 </div>
                             </div>
                        </div>
                    </div>
                )}
                
                <h3 className="text-xl font-bold text-gray-400 mb-4">登场人物</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {sceneCharacters.map(char => (
                        <CharacterCard 
                          key={char.id} 
                          character={char} 
                          customAvatarUrl={gameState.customAvatars[char.id]}
                          isGenerating={gameState.generatingAvatarId === char.id}
                          onSelect={handleCharacterSelect}
                          onGenerate={(c) => requireAuth(() => handleGenerateAvatar(c))}
                        />
                    ))}
                </div>

                 <div className="mt-12 mb-20">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-400">剧本分支</h3>
                        <Button onClick={() => { 
                             requireAuth(() => {
                                setEditingScene(null); 
                                setGameState(prev => ({...prev, currentScreen: 'builder'})); 
                             });
                        }} variant="secondary" className="text-xs">
                            + 创建剧本
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {gameState.customScenarios.filter(s => s.sceneId === currentSceneLocal.id).map(scenario => (
                            <div key={scenario.id} className="group relative bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-indigo-500 transition-all cursor-pointer hover:-translate-y-1" onClick={() => handlePlayScenario(scenario)}>
                                <h4 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400">{scenario.title}</h4>
                                <p className="text-sm text-gray-400 line-clamp-3 mb-4">{scenario.description}</p>
                                <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-700 pt-3">
                                    <span>By {scenario.author}</span>
                                    <span>{Object.keys(scenario.nodes).length} 个节点</span>
                                </div>
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                                     <button onClick={(e) => { requireAuth(() => handleEditScenario(scenario, e)) }} className="p-1.5 hover:bg-white/10 rounded text-gray-300 pointer-events-auto" title="编辑">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>
                                     </button>
                                     <button onClick={(e) => handleDeleteScenario(scenario.id, e)} className="p-1.5 hover:bg-red-900/50 rounded text-gray-300 hover:text-red-400 pointer-events-auto" title="删除">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                     </button>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
             </div>
         </div>
      )}

      {gameState.currentScreen === 'chat' && currentCharacterLocal && (
        <ChatWindow 
          character={currentCharacterLocal} 
          customScenario={currentScenarioLocal || undefined}
          history={gameState.history[currentCharacterLocal.id] || []}
          scenarioState={gameState.currentScenarioState}
          settings={gameState.settings}
          userProfile={gameState.userProfile!}
          activeJournalEntryId={gameState.activeJournalEntryId}
          onUpdateHistory={handleUpdateHistory}
          onUpdateScenarioState={(nodeId) => setGameState(prev => ({ ...prev, currentScenarioState: { ...prev.currentScenarioState!, currentNodeId: nodeId } }))}
          onBack={handleChatBack}
        />
      )}

      {gameState.currentScreen === 'builder' && (
          <ScenarioBuilder 
            initialScenario={editingScenarioLocal}
            onSave={handleSaveScenario}
            onCancel={() => setGameState(prev => ({...prev, currentScreen: 'characterSelection', editingScenarioId: null}))}
          />
      )}

      {showSettingsModal && (
        <SettingsModal 
          settings={gameState.settings} 
          gameState={gameState}
          onSettingsChange={(newSettings) => setGameState(prev => ({ ...prev, settings: newSettings }))}
          onClose={() => setShowSettingsModal(false)} 
          onLogout={handleLogout}
        />
      )}

      {showEraCreator && (
          <EraConstructorModal 
             initialScene={editingScene}
             onSave={handleSaveEra}
             onDelete={editingScene ? () => handleDeleteEra(editingScene.id) : undefined}
             onClose={() => { setShowEraCreator(false); setEditingScene(null); }}
          />
      )}

      {showCharacterCreator && (
          <CharacterConstructorModal 
             scene={getEditingCharacterScene()}
             initialCharacter={editingCharacter}
             onSave={handleSaveCharacter}
             onClose={() => {
                 setShowCharacterCreator(false);
                 setEditingCharacter(null);
                 setEditingCharacterSceneId(null);
             }}
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
              onClose={() => setShowEraMemory(false)}
          />
      )}
      
      {gameState.settings.debugMode && (
          <DebugConsole 
             logs={gameState.debugLogs} 
             onClear={() => setGameState(prev => ({...prev, debugLogs: []}))}
             onClose={() => setGameState(prev => ({...prev, settings: {...prev.settings, debugMode: false}}))}
          />
      )}

    </div>
  );
};

export default App;
