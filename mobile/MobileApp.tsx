import React from 'react';
import { GameState, JournalEntry, WorldScene, Character, CustomScenario, UserProfile } from '../types';
import { MobileRealWorld } from './MobileRealWorld';
import { MobileSceneSelection } from './MobileSceneSelection';
import { MobileCharacterSelection } from './MobileCharacterSelection';
import { MobileScenarioBuilder } from './MobileScenarioBuilder';
import { MobileProfile } from './MobileProfile';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ChatWindow } from '../components/ChatWindow';
import { ConnectionSpace } from '../components/ConnectionSpace';
import { geminiService } from '../services/gemini';
import { WORLD_SCENES } from '../constants';

interface MobileAppProps {
    gameState: GameState;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
    handleSwitchToPC: () => void;
}

export const MobileApp: React.FC<MobileAppProps> = ({ gameState, setGameState, handleSwitchToPC }) => {
    
    const handleNavigate = (screen: GameState['currentScreen']) => {
        setGameState(prev => ({ ...prev, currentScreen: screen }));
    };

    const renderScreen = () => {
        switch (gameState.currentScreen) {
            case 'realWorld':
                return (
                    <MobileRealWorld 
                        entries={gameState.journalEntries}
                        onAddEntry={(t, c, i, in_, tags) => setGameState(prev => ({...prev, journalEntries: [...prev.journalEntries, {id: `e_${Date.now()}`, title: t, content: c, tags: tags || [], timestamp: Date.now(), imageUrl: i, insight: in_}]}))}
                        onUpdateEntry={(e) => setGameState(prev => ({...prev, journalEntries: prev.journalEntries.map(x => x.id === e.id ? e : x)}))}
                        onDeleteEntry={(id) => setGameState(prev => ({...prev, journalEntries: prev.journalEntries.filter(x => x.id !== id)}))}
                        onExplore={(entry) => {
                            setGameState(prev => ({ ...prev, activeJournalEntryId: entry.id, currentScreen: 'sceneSelection' }));
                        }}
                        onConsultMirror={(c, r) => geminiService.generateMirrorInsight(c, r)}
                        autoGenerateImage={gameState.settings.autoGenerateJournalImages}
                        onSwitchToPC={handleSwitchToPC}
                    />
                );
            case 'sceneSelection':
                return (
                    <MobileSceneSelection 
                        scenes={[...WORLD_SCENES, ...gameState.customScenes]}
                        onSelectScene={(id) => setGameState(prev => ({ ...prev, selectedSceneId: id, currentScreen: 'characterSelection' }))}
                        onCreateScene={() => { /* Need mobile era builder or alert */ alert("请使用PC端创建新时代"); }}
                    />
                );
            case 'characterSelection':
                if (!gameState.selectedSceneId) return null;
                const scene = [...WORLD_SCENES, ...gameState.customScenes].find(s => s.id === gameState.selectedSceneId);
                const customChars = gameState.customCharacters[gameState.selectedSceneId] || [];
                const allChars = [...(scene?.characters || []), ...customChars];
                const scenarios = gameState.customScenarios.filter(s => s.sceneId === gameState.selectedSceneId);

                return (
                    <MobileCharacterSelection 
                        scene={scene!}
                        characters={allChars}
                        scenarios={scenarios}
                        onBack={() => handleNavigate('sceneSelection')}
                        onSelectCharacter={(char) => setGameState(prev => ({ ...prev, selectedCharacterId: char.id, currentScreen: 'chat' }))}
                        onPlayScenario={(scen) => setGameState(prev => ({ ...prev, selectedScenarioId: scen.id, currentScreen: 'chat', scenarioState: { scenarioId: scen.id, currentNodeId: scen.startNodeId } }))}
                        onAddCharacter={() => { /* Mobile Char Builder */ alert("请使用PC端创建角色"); }}
                        onAddScenario={() => setGameState(prev => ({ ...prev, currentScreen: 'builder' }))}
                    />
                );
            case 'chat':
                const chatScene = [...WORLD_SCENES, ...gameState.customScenes].find(s => s.id === gameState.selectedSceneId);
                let chatChar: Character | undefined;
                if (gameState.selectedScenarioId) {
                    const scen = gameState.customScenarios.find(s => s.id === gameState.selectedScenarioId);
                    chatChar = {
                        id: `narrator_${scen?.id}`, name: '旁白', role: 'Narrator', bio: 'Story Narrator', 
                        avatarUrl: '', backgroundUrl: '', themeColor: 'gray', colorAccent: '#ffffff', 
                        firstMessage: '故事开始...', voiceName: 'Charon', age: 0, systemInstruction: 'Narrator'
                    };
                } else {
                    const allC = [...(chatScene?.characters || []), ...(gameState.customCharacters[gameState.selectedSceneId!] || [])];
                    if (gameState.selectedCharacterId === chatScene?.mainStory?.id) chatChar = chatScene!.mainStory;
                    else chatChar = allC.find(c => c.id === gameState.selectedCharacterId);
                }

                if (!chatChar) return <div>Error loading character</div>;

                return (
                     <ChatWindow 
                        character={chatChar}
                        customScenario={gameState.customScenarios.find(s => s.id === gameState.selectedScenarioId)}
                        scenarioState={gameState.currentScenarioState}
                        history={gameState.history[gameState.selectedCharacterId || gameState.selectedScenarioId || ''] || []}
                        userProfile={gameState.userProfile!}
                        settings={gameState.settings}
                        activeJournalEntryId={gameState.activeJournalEntryId}
                        onUpdateHistory={(msgs) => setGameState(prev => ({
                            ...prev,
                            history: { ...prev.history, [gameState.selectedCharacterId || gameState.selectedScenarioId || '']: msgs }
                        }))}
                        onUpdateScenarioState={(nodeId) => setGameState(prev => ({
                            ...prev,
                            currentScenarioState: { ...prev.currentScenarioState!, currentNodeId: nodeId }
                        }))}
                        onBack={(echo) => {
                             if (echo && gameState.activeJournalEntryId) {
                                  setGameState(prev => ({
                                      ...prev,
                                      journalEntries: prev.journalEntries.map(e => e.id === prev.activeJournalEntryId ? { ...e, echo } : e),
                                      activeJournalEntryId: null
                                  }));
                             }
                             handleNavigate('characterSelection');
                        }}
                    />
                );
            case 'builder':
                return (
                     <MobileScenarioBuilder 
                        onSave={(scenario) => {
                             setGameState(prev => ({
                                 ...prev,
                                 customScenarios: [...prev.customScenarios, scenario],
                                 currentScreen: 'characterSelection'
                             }));
                        }}
                        onCancel={() => handleNavigate('characterSelection')}
                        initialScenario={null}
                    />
                );
            case 'connectionSpace':
                return (
                     <ConnectionSpace 
                        userProfile={gameState.userProfile!}
                        characters={(() => {
                             let chars: Character[] = [];
                             [...WORLD_SCENES, ...gameState.customScenes].forEach(s => {
                                 chars = [...chars, ...s.characters, ...(gameState.customCharacters[s.id] || [])];
                             });
                             return chars;
                        })()}
                        onConnect={(char) => {
                             let sceneId: string | null = null;
                             [...WORLD_SCENES, ...gameState.customScenes].forEach(s => {
                                 if (s.characters.find(c => c.id === char.id) || gameState.customCharacters[s.id]?.find(c => c.id === char.id)) {
                                     sceneId = s.id;
                                 }
                             });
                             if (sceneId) {
                                 setGameState(prev => ({
                                     ...prev,
                                     selectedSceneId: sceneId,
                                     selectedCharacterId: char.id,
                                     currentScreen: 'chat'
                                 }));
                             }
                        }}
                        onBack={() => handleNavigate('sceneSelection')}
                     />
                );
            case 'mobileProfile':
                return (
                    <MobileProfile 
                        userProfile={gameState.userProfile || { nickname: 'Guest', avatarUrl: '', isGuest: true }}
                        journalEntries={gameState.journalEntries}
                        mailbox={gameState.mailbox}
                        history={gameState.history}
                        onOpenSettings={() => { /* Need separate mobile settings or reuse modal */ alert("设置暂只支持PC或通过底部 '我的' -> 设置"); }}
                        onLogout={() => { /* Handled in parent mostly, or invoke callback */ alert("请在PC端退出或清除缓存"); }}
                        onUpdateProfile={(p) => setGameState(prev => ({ ...prev, userProfile: p }))}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="h-full w-full bg-black text-white flex flex-col relative">
            <div className="flex-1 overflow-hidden relative">
                 {renderScreen()}
            </div>
            
            {/* Show Nav unless in chat/builder/connection which handle their own back/exit */}
            {['realWorld', 'sceneSelection', 'mobileProfile'].includes(gameState.currentScreen) && (
                <MobileBottomNav 
                    currentScreen={gameState.currentScreen}
                    onNavigate={handleNavigate}
                    hasUnreadMail={gameState.mailbox.some(m => !m.isRead)}
                    onOpenMail={() => alert("信箱功能移动端暂未完全适配")}
                />
            )}
        </div>
    );
};