
import React, { useState, useEffect, useRef } from 'react';
import { GameState, Character, Message, WorldScene, JournalEntry, AppSettings } from '../types';
import { geminiService } from '../services/gemini';
import { storageService } from '../services/storage';
import { WORLD_SCENES } from '../constants';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileRealWorld } from './MobileRealWorld';
import { MobileSceneSelection } from './MobileSceneSelection';
import { MobileProfile } from './MobileProfile';
import { ChatWindow } from '../components/ChatWindow';
import { ConnectionSpace } from '../components/ConnectionSpace';
import { LoginModal } from '../components/LoginModal';
import { SettingsModal } from '../components/SettingsModal';
import { MailboxModal } from '../components/MailboxModal';

interface MobileAppProps {
    onSwitchToPC: () => void;
}

export const MobileApp: React.FC<MobileAppProps> = ({ onSwitchToPC }) => {
    // --- STATE REPLICATION FROM APP.TSX ---
    // (Simplified for mobile context)
    
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
        debugLogs: []
    };

    const [gameState, setGameState] = useState<GameState>(DEFAULT_STATE);
    const [isLoaded, setIsLoaded] = useState(false);
    const [profileNickname, setProfileNickname] = useState('');
    const [showLogin, setShowLogin] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showMailbox, setShowMailbox] = useState(false);

    // --- INIT & STORAGE ---
    useEffect(() => {
        const init = async () => {
            const loaded = await storageService.loadState();
            if (loaded) {
                // Merge Logic simplified
                setGameState(prev => ({ ...prev, ...loaded, currentScreen: loaded.userProfile ? 'realWorld' : 'profileSetup', debugLogs: [] }));
                if (loaded.settings) geminiService.updateConfig(loaded.settings as AppSettings);
            }
            setIsLoaded(true);
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
        // Ensure state is saved before notifying parent to switch context
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

    const handleSelectCharacter = (char: Character, sceneId: string) => {
        setGameState(prev => ({
            ...prev,
            selectedSceneId: sceneId,
            selectedCharacterId: char.id,
            currentScreen: 'chat'
        }));
    };

    // --- RENDER ---
    
    if (!isLoaded) return <div className="h-screen bg-black flex items-center justify-center text-white">Loading Mobile Core...</div>;

    // PROFILE SETUP (Mobile version)
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

    // MAIN APP SCREENS
    const allScenes = [...WORLD_SCENES, ...gameState.customScenes];
    const currentScene = allScenes.find(s => s.id === gameState.selectedSceneId);
    let currentCharacter = null;
    if (currentScene && gameState.selectedCharacterId) {
        const chars = [...currentScene.characters, ...(gameState.customCharacters[currentScene.id] || [])];
        currentCharacter = chars.find(c => c.id === gameState.selectedCharacterId);
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
                        customCharacters={gameState.customCharacters}
                        onSelectCharacter={handleSelectCharacter}
                    />
                )}

                {gameState.currentScreen === 'connectionSpace' && gameState.userProfile && (
                    <ConnectionSpace 
                        characters={allScenes.flatMap(s => [...s.characters, ...(gameState.customCharacters[s.id]||[])])}
                        userProfile={gameState.userProfile}
                        onConnect={(char) => {
                             // Find scene for char
                             const s = allScenes.find(sc => [...sc.characters, ...(gameState.customCharacters[sc.id]||[])].some(c => c.id === char.id));
                             if (s) handleSelectCharacter(char, s.id);
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
                        onLogout={() => {
                            if(confirm("确定退出登录吗？")) {
                                setGameState(prev => ({...DEFAULT_STATE}));
                            }
                        }}
                    />
                )}

                {gameState.currentScreen === 'chat' && currentCharacter && (
                    <div className="h-full pb-0 relative z-20"> 
                        <ChatWindow 
                            character={currentCharacter}
                            history={gameState.history[currentCharacter.id] || []}
                            settings={gameState.settings}
                            userProfile={gameState.userProfile!}
                            activeJournalEntryId={gameState.activeJournalEntryId}
                            onUpdateHistory={(msgs) => setGameState(prev => ({...prev, history: {...prev.history, [currentCharacter!.id]: msgs}}))}
                            onBack={() => setGameState(prev => ({...prev, currentScreen: 'sceneSelection', selectedCharacterId: null}))}
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
                    onClose={() => setShowSettings(false)}
                    onLogout={() => { if(confirm("退出?")) setGameState({...DEFAULT_STATE}); }}
                />
            )}
            
            {showMailbox && (
                <MailboxModal 
                    mails={gameState.mailbox}
                    onClose={() => setShowMailbox(false)}
                    onMarkAsRead={id => setGameState(prev => ({...prev, mailbox: prev.mailbox.map(m => m.id === id ? {...m, isRead: true} : m)}))}
                />
            )}

            {/* NAV BAR (Hide in Chat and Connection Space) */}
            {gameState.currentScreen !== 'chat' && gameState.currentScreen !== 'connectionSpace' && (
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
