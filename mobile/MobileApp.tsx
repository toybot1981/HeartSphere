
import React, { useState, useEffect, useRef } from 'react';
import { GameState, Character, Message, WorldScene, JournalEntry, AppSettings, CustomScenario } from '../types';
import { geminiService } from '../services/gemini';
import { storageService } from '../services/storage';
import { WORLD_SCENES } from '../constants';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileRealWorld } from './MobileRealWorld';
import { MobileSceneSelection } from './MobileSceneSelection';
import { MobileCharacterSelection } from './MobileCharacterSelection';
import { MobileProfile } from './MobileProfile';
import { MobileScenarioBuilder } from './MobileScenarioBuilder'; // Imported Mobile Builder
import { ChatWindow } from '../components/ChatWindow';
import { ConnectionSpace } from '../components/ConnectionSpace';
import { LoginModal } from '../components/LoginModal';
import { SettingsModal } from '../components/SettingsModal';
import { MailboxModal } from '../components/MailboxModal';

// Modals reuse
import { EraConstructorModal } from '../components/EraConstructorModal';
import { CharacterConstructorModal } from '../components/CharacterConstructorModal';

interface MobileAppProps {
    onSwitchToPC: () => void;
}

export const MobileApp: React.FC<MobileAppProps> = ({ onSwitchToPC }) => {
    
    // --- STATE ---
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
        customScenarios: [],
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
          qwenConfig: { apiKey: '', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', modelName: 'qwen-max', imageModel: 'qwen-image-plus', videoModel: 'wanx-video' },
          doubaoConfig: { apiKey: '', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', modelName: 'ep-...', imageModel: 'doubao-image-v1', videoModel: 'doubao-video-v1' }
        },
        mailbox: [],
        lastLoginTime: Date.now(),
        sceneMemories: {},
        debugLogs: [],
        currentTicket: null
    };

    const [gameState, setGameState] = useState<GameState>(DEFAULT_STATE);
    const [isLoaded, setIsLoaded] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);
    const [profileNickname, setProfileNickname] = useState('');
    
    // UI States
    const [showSettings, setShowSettings] = useState(false);
    const [showMailbox, setShowMailbox] = useState(false);
    const [showEraCreator, setShowEraCreator] = useState(false);
    const [showCharacterCreator, setShowCharacterCreator] = useState(false);
    const [showScenarioBuilder, setShowScenarioBuilder] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    // --- INIT & STORAGE ---
    useEffect(() => {
        const init = async () => {
            try {
                const loaded = await storageService.loadState();
                if (loaded) {
                    setGameState(prev => ({ ...prev, ...loaded, currentScreen: loaded.userProfile ? 'realWorld' : 'profileSetup', debugLogs: [] }));
                    if (loaded.settings) geminiService.updateConfig(loaded.settings as AppSettings);
                }
            } catch (e: any) {
                console.error("Mobile load error:", e);
                setInitError("无法加载数据，请重试。");
            } finally {
                setIsLoaded(true);
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (!isLoaded) return;
        geminiService.updateConfig(gameState.settings);
        const t = setTimeout(() => storageService.saveState({ ...gameState, lastLoginTime: Date.now() }), 1000);
        return () => clearTimeout(t);
    }, [gameState, isLoaded]);

    // --- ACTIONS ---

    const handleSwitchToPCWrapper = async () => {
        await storageService.saveState({ ...gameState, lastLoginTime: Date.now() });
        onSwitchToPC();
    };

    const handleProfileSubmit = () => {
        if (!profileNickname.trim()) return;
        setGameState(prev => ({
            ...prev,
            userProfile: { nickname: profileNickname, avatarUrl: '', isGuest: true, id: `guest_${Date.now()}` },
            currentScreen: 'realWorld'
        }));
    };

    const handleLogout = () => {
        // Construct a clean state but preserve settings (API keys etc)
        const cleanState: GameState = {
            ...DEFAULT_STATE,
            settings: gameState.settings, 
            currentScreen: 'profileSetup',
            userProfile: null
        };

        // 1. Update React State immediately to show login screen
        setShowSettings(false);
        setGameState(cleanState);

        // 2. Persist the clean state asynchronously (Fire and forget)
        storageService.saveState(cleanState).then(() => {
            console.log("Logged out and state saved.");
        }).catch(err => {
            console.error("Logout save failed", err);
        });
    };

    const handleLoginSuccess = (method: 'phone' | 'wechat', identifier: string) => {
        setGameState(prev => {
            // Use existing profile if available (binding), or create new if somehow null
            const baseProfile = prev.userProfile || { nickname: 'User', avatarUrl: '', isGuest: true, id: '' };
            
            return {
                ...prev,
                userProfile: {
                    ...baseProfile,
                    isGuest: false,
                    id: identifier,
                    phoneNumber: method === 'phone' ? identifier : undefined
                }
            };
        });
        setShowLoginModal(false);
    };

    // --- SCENE & CHAR LOGIC ---

    const allScenes = [...WORLD_SCENES, ...gameState.customScenes];
    const currentScene = allScenes.find(s => s.id === gameState.selectedSceneId);
    
    // Get Characters for current scene
    const currentSceneChars = currentScene 
        ? [...currentScene.characters, ...(gameState.customCharacters[currentScene.id] || [])]
        : [];
        
    // Get Scenarios for current scene
    const currentSceneScenarios = currentScene
        ? gameState.customScenarios.filter(s => s.sceneId === currentScene.id)
        : [];

    let activeCharacter = null;
    if (currentScene && gameState.selectedCharacterId) {
        // Also check if it's the narrator for a scenario
        if (gameState.tempStoryCharacter && gameState.tempStoryCharacter.id === gameState.selectedCharacterId) {
             activeCharacter = gameState.tempStoryCharacter;
        } else {
             activeCharacter = currentSceneChars.find(c => c.id === gameState.selectedCharacterId);
             // Fallback to main story if id matches
             if (!activeCharacter && currentScene.mainStory?.id === gameState.selectedCharacterId) {
                 activeCharacter = currentScene.mainStory;
             }
        }
    }

    const handleSelectScene = (sceneId: string) => {
        setGameState(prev => ({
            ...prev,
            selectedSceneId: sceneId,
            selectedCharacterId: null,
            currentScreen: 'characterSelection' // Go to detail view
        }));
    };

    const handleSelectCharacter = (char: Character) => {
        setGameState(prev => ({
            ...prev,
            selectedCharacterId: char.id,
            tempStoryCharacter: null,
            selectedScenarioId: null,
            currentScenarioState: undefined,
            currentScreen: 'chat'
        }));
    };

    const handlePlayScenario = (scenario: CustomScenario) => {
        let startNode = scenario.nodes[scenario.startNodeId];
        
        // Safety: If startNode is missing, try to find the first node available
        if (!startNode) {
            const firstKey = Object.keys(scenario.nodes)[0];
            if (firstKey) {
                startNode = scenario.nodes[firstKey];
            } else {
                alert("错误：该剧本没有有效节点。");
                return;
            }
        }

        const scene = allScenes.find(s => s.id === gameState.selectedSceneId);
        const sceneImage = scene?.imageUrl || '';

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
            firstMessage: startNode.prompt || '...', 
            voiceName: 'Kore'
        };

        geminiService.resetSession(narrator.id);

        setGameState(prev => ({
            ...prev,
            selectedCharacterId: narrator.id,
            tempStoryCharacter: narrator, 
            selectedScenarioId: scenario.id,
            currentScenarioState: { scenarioId: scenario.id, currentNodeId: startNode.id },
            history: { ...prev.history, [narrator.id]: [] }, 
            currentScreen: 'chat'
        }));
    };

    // --- CREATION HANDLERS ---

    const handleSaveEra = (newScene: WorldScene) => {
        setGameState(prev => ({
            ...prev,
            customScenes: [...prev.customScenes, newScene]
        }));
        setShowEraCreator(false);
    };

    const handleSaveCharacter = (newCharacter: Character) => {
        if (!gameState.selectedSceneId) return;
        setGameState(prev => ({
            ...prev,
            customCharacters: {
                ...prev.customCharacters,
                [prev.selectedSceneId!]: [...(prev.customCharacters[prev.selectedSceneId!] || []), newCharacter]
            }
        }));
        setShowCharacterCreator(false);
    };

    const handleSaveScenario = (scenario: CustomScenario) => {
        if (!gameState.selectedSceneId) return;
        const completeScenario = { ...scenario, sceneId: gameState.selectedSceneId };
        setGameState(prev => ({
            ...prev,
            customScenarios: [...prev.customScenarios, completeScenario]
        }));
        setShowScenarioBuilder(false);
    };


    // --- RENDER ---
    
    if (!isLoaded) return <div className="h-screen bg-black flex items-center justify-center text-white">Loading Mobile Core...</div>;
    
    if (initError) return (
        <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white p-6 text-center">
            <h2 className="text-red-500 font-bold text-xl mb-2">Initialization Error</h2>
            <p className="text-gray-400 mb-4">{initError}</p>
            <button onClick={() => window.location.reload()} className="bg-indigo-600 px-4 py-2 rounded">Retry</button>
        </div>
    );

    if (gameState.currentScreen === 'profileSetup') {
        return (
            <div className="h-screen w-full bg-black flex flex-col items-center justify-center p-6 space-y-6">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">HeartSphere Mobile</h1>
                <input 
                    className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-center w-full"
                    placeholder="你的昵称"
                    value={profileNickname}
                    onChange={e => setProfileNickname(e.target.value)}
                />
                <button onClick={handleProfileSubmit} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">进入心域</button>
            </div>
        );
    }

    return (
        <div className="h-screen w-full bg-black text-white relative overflow-hidden">
            
            {/* CONTENT AREA */}
            <div className="h-full w-full">
                {gameState.currentScreen === 'realWorld' && (
                    <MobileRealWorld 
                        entries={gameState.journalEntries}
                        onAddEntry={(t, c, i, in_) => setGameState(prev => ({...prev, journalEntries: [...prev.journalEntries, {id: `e_${Date.now()}`, title: t, content: c, timestamp: Date.now(), imageUrl: i, insight: in_}]}))}
                        onUpdateEntry={(e) => setGameState(prev => ({...prev, journalEntries: prev.journalEntries.map(x => x.id === e.id ? e : x)}))}
                        onDeleteEntry={(id) => setGameState(prev => ({...prev, journalEntries: prev.journalEntries.filter(x => x.id !== id)}))}
                        onExplore={(entry) => {
                            setGameState(prev => ({ ...prev, activeJournalEntryId: entry.id, currentScreen: 'sceneSelection' }));
                        }}
                        onConsultMirror={(c, r) => geminiService.generateMirrorInsight(c, r)}
                        autoGenerateImage={gameState.settings.autoGenerateJournalImages}
                        onSwitchToPC={handleSwitchToPCWrapper}
                    />
                )}

                {gameState.currentScreen === 'sceneSelection' && (
                    <MobileSceneSelection 
                        scenes={allScenes}
                        onSelectScene={handleSelectScene}
                        onCreateScene={() => setShowEraCreator(true)}
                    />
                )}

                {gameState.currentScreen === 'characterSelection' && currentScene && (
                    <MobileCharacterSelection 
                        scene={currentScene}
                        characters={currentSceneChars}
                        scenarios={currentSceneScenarios}
                        onBack={() => setGameState(prev => ({ ...prev, currentScreen: 'sceneSelection', selectedSceneId: null }))}
                        onSelectCharacter={handleSelectCharacter}
                        onPlayScenario={handlePlayScenario}
                        onAddCharacter={() => setShowCharacterCreator(true)}
                        onAddScenario={() => setShowScenarioBuilder(true)}
                    />
                )}

                {gameState.currentScreen === 'connectionSpace' && gameState.userProfile && (
                    <ConnectionSpace 
                        characters={allScenes.flatMap(s => [...s.characters, ...(gameState.customCharacters[s.id]||[])])}
                        userProfile={gameState.userProfile}
                        onConnect={(char) => {
                             // Find scene for char to set context
                             const s = allScenes.find(sc => [...sc.characters, ...(gameState.customCharacters[sc.id]||[])].some(c => c.id === char.id));
                             if (s) {
                                 setGameState(prev => ({
                                     ...prev,
                                     selectedSceneId: s.id,
                                     selectedCharacterId: char.id,
                                     currentScreen: 'chat'
                                 }));
                             }
                        }}
                        onBack={() => setGameState(prev => ({...prev, currentScreen: 'sceneSelection'}))}
                    />
                )}

                {gameState.currentScreen === 'mobileProfile' && gameState.userProfile && (
                    <MobileProfile 
                        userProfile={gameState.userProfile}
                        journalEntries={gameState.journalEntries}
                        mailbox={gameState.mailbox}
                        history={gameState.history}
                        onOpenSettings={() => setShowSettings(true)}
                        onLogout={handleLogout}
                        onUpdateProfile={(profile) => setGameState(prev => ({ ...prev, userProfile: profile }))}
                    />
                )}

                {gameState.currentScreen === 'chat' && activeCharacter && (
                    <div className="h-full pb-0 relative z-20"> 
                        <ChatWindow 
                            character={activeCharacter}
                            customScenario={gameState.selectedScenarioId ? gameState.customScenarios.find(s => s.id === gameState.selectedScenarioId) : undefined}
                            history={gameState.history[activeCharacter.id] || []}
                            scenarioState={gameState.currentScenarioState}
                            settings={gameState.settings}
                            userProfile={gameState.userProfile!}
                            activeJournalEntryId={gameState.activeJournalEntryId}
                            onUpdateHistory={(msgs) => setGameState(prev => ({...prev, history: {...prev.history, [activeCharacter!.id]: msgs}}))}
                            onUpdateScenarioState={(nodeId) => setGameState(prev => ({ ...prev, currentScenarioState: { ...prev.currentScenarioState!, currentNodeId: nodeId } }))}
                            onBack={() => setGameState(prev => ({...prev, currentScreen: 'characterSelection', selectedCharacterId: null, tempStoryCharacter: null, selectedScenarioId: null }))}
                        />
                    </div>
                )}
            </div>

            {/* MODALS */}
            {showSettings && (
                <SettingsModal 
                    settings={gameState.settings}
                    gameState={gameState}
                    onSettingsChange={s => setGameState(prev => ({...prev, settings: s}))}
                    onUpdateProfile={(profile) => setGameState(prev => ({ ...prev, userProfile: profile }))}
                    onClose={() => setShowSettings(false)}
                    onLogout={handleLogout}
                    onBindAccount={() => { setShowSettings(false); setShowLoginModal(true); }}
                />
            )}
            
            {showLoginModal && (
                <LoginModal
                    onLoginSuccess={handleLoginSuccess}
                    onCancel={() => setShowLoginModal(false)}
                />
            )}
            
            {showMailbox && (
                <MailboxModal 
                    mails={gameState.mailbox}
                    onClose={() => setShowMailbox(false)}
                    onMarkAsRead={id => setGameState(prev => ({...prev, mailbox: prev.mailbox.map(m => m.id === id ? {...m, isRead: true} : m)}))}
                />
            )}

            {/* CREATOR MODALS */}
            {showEraCreator && (
                <EraConstructorModal 
                    onSave={handleSaveEra}
                    onClose={() => setShowEraCreator(false)}
                />
            )}
            
            {showCharacterCreator && currentScene && (
                <CharacterConstructorModal
                    scene={currentScene}
                    onSave={handleSaveCharacter}
                    onClose={() => setShowCharacterCreator(false)}
                />
            )}
            
            {showScenarioBuilder && (
                 <div className="absolute inset-0 z-50 bg-black">
                     <MobileScenarioBuilder 
                         onSave={handleSaveScenario}
                         onCancel={() => setShowScenarioBuilder(false)}
                     />
                 </div>
            )}

            {/* NAV BAR */}
            {gameState.currentScreen !== 'chat' && gameState.currentScreen !== 'connectionSpace' && !showScenarioBuilder && (
                <MobileBottomNav 
                    currentScreen={gameState.currentScreen}
                    onNavigate={(s) => setGameState(prev => ({...prev, currentScreen: s}))}
                    hasUnreadMail={gameState.mailbox.some(m => !m.isRead)}
                    onOpenMail={() => setShowMailbox(true)}
                />
            )}
        </div>
    );
};
