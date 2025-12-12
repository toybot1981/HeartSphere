import React, { useState, useEffect, useCallback } from 'react';
import { GameState, AppSettings, Character, UserProfile, JournalEntry, CustomScenario, WorldScene, Message, AIProvider, Mail, MemoryTicket } from './types';
import { WORLD_SCENES } from './constants';
import { geminiService } from './services/gemini';
import { storageService } from './services/storage';

// Desktop Components
import { EntryPoint } from './components/EntryPoint';
import { SettingsModal } from './components/SettingsModal';
import { RealWorldScreen } from './components/RealWorldScreen';
import { SceneSelectionScreen } from './components/SceneSelectionScreen'; // NEW
import { ChatWindow } from './components/ChatWindow';
import { DebugConsole } from './components/DebugConsole';
import { AdminScreen } from './components/AdminScreen';
import { LoginModal } from './components/LoginModal';
import { CharacterCard } from './components/CharacterCard';
import { ConnectionSpace } from './components/ConnectionSpace';
import { MailboxModal } from './components/MailboxModal';
import { EraMemoryModal } from './components/EraMemoryModal';
import { EraConstructorModal } from './components/EraConstructorModal';
import { CharacterConstructorModal } from './components/CharacterConstructorModal';
import { ScenarioBuilder } from './components/ScenarioBuilder';
import { ImmersiveMemoryView } from './components/ImmersiveMemoryView';
import { MemoryTicketModal } from './components/MemoryTicketModal';
import { Button } from './components/Button';

// Mobile Components Wrapper
import { MobileApp } from './mobile/MobileApp';

const DEFAULT_SETTINGS: AppSettings = {
    autoGenerateAvatars: true,
    autoGenerateStoryScenes: true,
    autoGenerateJournalImages: true,
    debugMode: false,
    textProvider: 'gemini',
    imageProvider: 'gemini',
    videoProvider: 'gemini',
    audioProvider: 'gemini',
    enableFallback: true,
    geminiConfig: { apiKey: '', modelName: 'gemini-2.5-flash' },
    openaiConfig: { apiKey: '', modelName: 'gpt-4o' },
    qwenConfig: { apiKey: '', modelName: 'qwen-max' },
    doubaoConfig: { apiKey: '', modelName: '' },
};

const INITIAL_STATE: GameState = {
    currentScreen: 'entryPoint',
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
    settings: DEFAULT_SETTINGS,
    mailbox: [],
    lastLoginTime: Date.now(),
    sceneMemories: {},
    currentTicket: null,
    debugLogs: []
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showMailbox, setShowMailbox] = useState(false);
  const [showEraMemory, setShowEraMemory] = useState(false);
  const [showEraConstructor, setShowEraConstructor] = useState(false);
  const [editingScene, setEditingScene] = useState<WorldScene | null>(null);
  const [showCharacterConstructor, setShowCharacterConstructor] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [isMobileMode, setIsMobileMode] = useState(false);

  // Initialize
  useEffect(() => {
    const init = async () => {
        const loaded = await storageService.loadState();
        if (loaded) {
            setGameState(prev => ({ ...prev, ...loaded, currentScreen: 'entryPoint' }));
            if (loaded.settings) geminiService.updateConfig(loaded.settings);
        }
        
        // Debug Logger Hook
        geminiService.setLogCallback((log) => {
             setGameState(prev => ({ ...prev, debugLogs: [...prev.debugLogs, log].slice(-50) }));
        });
    };
    init();

    // Check for mobile user agent initially (can be overridden)
    if (/Mobi|Android/i.test(navigator.userAgent)) {
        setIsMobileMode(true);
    }
  }, []);

  // Auto-Save
  useEffect(() => {
    storageService.saveState(gameState);
  }, [gameState]);

  // Update Service Config when settings change
  useEffect(() => {
      geminiService.updateConfig(gameState.settings);
  }, [gameState.settings]);

  // --- Helpers ---
  const getAllCharacters = useCallback(() => {
      let chars: Character[] = [];
      [...WORLD_SCENES, ...gameState.customScenes].forEach(s => {
          chars = [...chars, ...s.characters, ...(gameState.customCharacters[s.id] || [])];
      });
      return chars;
  }, [gameState.customScenes, gameState.customCharacters]);

  // --- Handlers ---

  const handleUpdateProfile = (profile: UserProfile) => {
      setGameState(prev => ({ ...prev, userProfile: profile }));
  };

  const handleLoginSuccess = (method: 'phone' | 'wechat', identifier: string) => {
      const newProfile: UserProfile = {
          nickname: method === 'phone' ? `User_${identifier.slice(-4)}` : 'WeChat User',
          avatarUrl: '',
          phoneNumber: method === 'phone' ? identifier : undefined,
          isGuest: false
      };
      // Merge with existing guest profile if any
      setGameState(prev => ({
          ...prev,
          userProfile: { ...(prev.userProfile || newProfile), ...newProfile, isGuest: false }
      }));
      setShowLogin(false);
  };

  const handleEnterWorld = (screen: GameState['currentScreen']) => {
      if (!gameState.userProfile) {
          // Auto create guest profile if none
          const guest: UserProfile = { nickname: '访客', avatarUrl: '', isGuest: true };
          setGameState(prev => ({ ...prev, userProfile: guest, currentScreen: screen }));
      } else {
          setGameState(prev => ({ ...prev, currentScreen: screen }));
      }
  };

  const handleSwitchToMobile = () => {
      setIsMobileMode(true);
      // If currently on a desktop-specific screen, reset to entry or appropriate mobile screen
      if (gameState.currentScreen === 'admin') {
          setGameState(prev => ({ ...prev, currentScreen: 'entryPoint' }));
      }
  };

  const handleSwitchToPC = () => {
      setIsMobileMode(false);
  };

  const handleRedeemTicket = (key: string) => {
      try {
          // Decode Base64 (handle unicode)
          const json = decodeURIComponent(atob(key).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          const ticket: MemoryTicket = JSON.parse(json);
          setGameState(prev => ({ ...prev, currentTicket: ticket, currentScreen: 'immersiveMemory' }));
      } catch (e) {
          alert("无效的漫游票 (Invalid Ticket Key)");
      }
  };

  // --- Render Mobile App ---
  if (isMobileMode && gameState.currentScreen !== 'entryPoint') {
      return (
          <div className="h-screen w-screen overflow-hidden">
              <MobileApp 
                 gameState={gameState} 
                 setGameState={setGameState} 
                 handleSwitchToPC={handleSwitchToPC}
              />
              {/* Overlays that might still be needed in mobile, or MobileApp handles them */}
              {showSettings && (
                <SettingsModal 
                    settings={gameState.settings} 
                    gameState={gameState}
                    onSettingsChange={(s) => setGameState(prev => ({...prev, settings: s}))}
                    onUpdateProfile={handleUpdateProfile}
                    onClose={() => setShowSettings(false)}
                    onLogout={() => {
                        storageService.clearMemory();
                        setGameState(INITIAL_STATE);
                        setShowSettings(false);
                    }}
                    onBindAccount={() => { setShowSettings(false); setShowLogin(true); }}
                />
              )}
          </div>
      );
  }

  // --- Render Desktop App ---

  return (
    <div className="h-screen w-screen bg-black text-white font-sans overflow-hidden relative">
      
      {/* 1. ENTRY POINT */}
      {gameState.currentScreen === 'entryPoint' && (
          <EntryPoint 
              onNavigate={handleEnterWorld} 
              onOpenSettings={() => setShowSettings(true)}
              nickname={gameState.userProfile?.nickname || ''}
              onSwitchToMobile={handleSwitchToMobile}
              onRedeemTicket={handleRedeemTicket}
          />
      )}

      {/* 2. REAL WORLD (JOURNAL) */}
      {gameState.currentScreen === 'realWorld' && (
          <RealWorldScreen 
             entries={gameState.journalEntries}
             onAddEntry={(t, c, i, in_, tags) => setGameState(prev => ({...prev, journalEntries: [...prev.journalEntries, {id: `e_${Date.now()}`, title: t, content: c, tags: tags || [], timestamp: Date.now(), imageUrl: i, insight: in_}]}))}
             onUpdateEntry={(e) => setGameState(prev => ({...prev, journalEntries: prev.journalEntries.map(x => x.id === e.id ? e : x)}))}
             onDeleteEntry={(id) => setGameState(prev => ({...prev, journalEntries: prev.journalEntries.filter(x => x.id !== id)}))}
             onExplore={(entry) => {
                 setGameState(prev => ({ ...prev, activeJournalEntryId: entry.id, currentScreen: 'sceneSelection' }));
             }}
             onChatWithCharacter={() => {}} // Not used in new flow
             onBack={() => setGameState(prev => ({...prev, currentScreen: 'entryPoint'}))}
             onConsultMirror={(c, r) => geminiService.generateMirrorInsight(c, r)}
             onShare={(entry) => {
                 // Create a temporary ticket for sharing
                 const user = gameState.userProfile || { nickname: 'Guest', avatarUrl: '', isGuest: true };
                 const ticket: MemoryTicket = {
                     id: `TKT-${Date.now()}`, authorName: user.nickname, authorAvatarUrl: user.avatarUrl,
                     title: entry.title, content: entry.content, imageUrl: entry.imageUrl, timestamp: entry.timestamp, allowInteraction: false
                 };
                 setGameState(prev => ({...prev, currentTicket: ticket}));
             }}
             autoGenerateImage={gameState.settings.autoGenerateJournalImages}
          />
      )}

      {/* 3. SCENE SELECTION (HeartSphere Hub) */}
      {gameState.currentScreen === 'sceneSelection' && (
          <SceneSelectionScreen 
              scenes={WORLD_SCENES}
              customScenes={gameState.customScenes}
              mailbox={gameState.mailbox}
              onSelectScene={(id) => setGameState(prev => ({...prev, selectedSceneId: id, currentScreen: 'characterSelection'}))}
              onOpenMailbox={() => setShowMailbox(true)}
              onOpenEraMemory={(id) => { setGameState(prev => ({...prev, selectedSceneId: id})); setShowEraMemory(true); }}
              onEditScene={(scene) => { setEditingScene(scene); setShowEraConstructor(true); }}
              onCreateScene={() => { setEditingScene(null); setShowEraConstructor(true); }}
              onBackToRealWorld={() => setGameState(prev => ({...prev, currentScreen: 'realWorld'}))}
              onEnterConnectionSpace={() => setGameState(prev => ({...prev, currentScreen: 'connectionSpace'}))}
              
              // Widget Props
              allCharacters={getAllCharacters()}
              onNavigateToCharacter={(char, sceneId) => {
                  let finalSceneId = sceneId;
                  // If sceneId not provided, verify finding it
                  if (!finalSceneId) {
                      const all = [...WORLD_SCENES, ...gameState.customScenes];
                      const s = all.find(s => s.characters.some(c => c.id === char.id) || gameState.customCharacters[s.id]?.some(c => c.id === char.id));
                      if (s) finalSceneId = s.id;
                  }
                  
                  if (finalSceneId) {
                      setGameState(prev => ({
                          ...prev,
                          selectedSceneId: finalSceneId,
                          selectedCharacterId: char.id,
                          currentScreen: 'chat'
                      }));
                  }
              }}
          />
      )}

      {/* 4. CHARACTER SELECTION */}
      {gameState.currentScreen === 'characterSelection' && gameState.selectedSceneId && (
          <div className="h-full bg-slate-950 p-8 pt-20 overflow-y-auto">
              <Button variant="ghost" onClick={() => setGameState(prev => ({...prev, currentScreen: 'sceneSelection'}))} className="absolute top-6 left-8">&larr; 返回时代</Button>
              <div className="absolute top-6 right-8 flex gap-3">
                  <Button variant="secondary" onClick={() => { setGameState(prev => ({...prev, currentScreen: 'builder'})); }}>📜 编写剧本</Button>
                  <Button variant="secondary" onClick={() => { setEditingCharacter(null); setShowCharacterConstructor(true); }}>+ 新增角色</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                  {/* Combine Built-in and Custom Characters for this Scene */}
                  {(() => {
                      const scene = [...WORLD_SCENES, ...gameState.customScenes].find(s => s.id === gameState.selectedSceneId);
                      const builtInChars = scene?.characters || [];
                      const customChars = gameState.customCharacters[gameState.selectedSceneId] || [];
                      const allChars = [...builtInChars, ...customChars];
                      const scenarios = gameState.customScenarios.filter(s => s.sceneId === gameState.selectedSceneId);

                      return (
                          <>
                            {/* Main Story Card (If exists) */}
                            {scene?.mainStory && (
                                <div 
                                    onClick={() => setGameState(prev => ({...prev, selectedCharacterId: scene.mainStory!.id, currentScreen: 'chat'}))}
                                    className="col-span-1 md:col-span-2 bg-gradient-to-r from-gray-800 to-gray-900 rounded-3xl p-6 border border-pink-500/30 cursor-pointer hover:scale-[1.01] transition-transform relative overflow-hidden group"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-50 font-black text-6xl text-white/5 z-0">STORY</div>
                                    <div className="relative z-10 flex gap-6 h-full items-center">
                                        <img src={scene.mainStory.avatarUrl} className="w-32 h-48 object-cover rounded-xl shadow-lg transform group-hover:rotate-2 transition-transform" />
                                        <div>
                                            <span className="text-xs bg-pink-500 text-white px-2 py-1 rounded font-bold uppercase tracking-wider">Main Story</span>
                                            <h3 className="text-2xl font-bold text-white mt-2">{scene.mainStory.name}</h3>
                                            <p className="text-slate-400 mt-2 line-clamp-3">{scene.mainStory.bio}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Custom Scenarios */}
                            {scenarios.map(scen => (
                                <div 
                                    key={scen.id}
                                    onClick={() => setGameState(prev => ({...prev, selectedScenarioId: scen.id, currentScreen: 'chat', scenarioState: { scenarioId: scen.id, currentNodeId: scen.startNodeId }}))}
                                    className="bg-slate-900 border border-slate-800 rounded-3xl p-6 cursor-pointer hover:border-indigo-500 transition-colors flex flex-col justify-between"
                                >
                                    <div>
                                        <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-1 rounded font-bold uppercase tracking-wider">Scenario</span>
                                        <h3 className="text-xl font-bold text-white mt-2">{scen.title}</h3>
                                        <p className="text-slate-500 mt-2 text-sm line-clamp-3">{scen.description}</p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                                        <span className="text-xs text-slate-600">By {scen.author}</span>
                                        <span className="text-xs text-indigo-400 font-bold">START &rarr;</span>
                                    </div>
                                </div>
                            ))}

                            {/* Characters */}
                            {allChars.map(char => (
                                <CharacterCard 
                                    key={char.id}
                                    character={char}
                                    customAvatarUrl={gameState.customAvatars[char.id]}
                                    isGenerating={gameState.generatingAvatarId === char.id}
                                    onSelect={() => setGameState(prev => ({...prev, selectedCharacterId: char.id, currentScreen: 'chat'}))}
                                    onGenerate={async () => {
                                        if (gameState.generatingAvatarId) return;
                                        setGameState(prev => ({...prev, generatingAvatarId: char.id}));
                                        try {
                                            const newUrl = await geminiService.generateCharacterImage(char);
                                            if (newUrl) {
                                                setGameState(prev => ({
                                                    ...prev,
                                                    customAvatars: { ...prev.customAvatars, [char.id]: newUrl },
                                                    generatingAvatarId: null
                                                }));
                                            }
                                        } catch (e) {
                                            setGameState(prev => ({...prev, generatingAvatarId: null}));
                                        }
                                    }}
                                />
                            ))}
                          </>
                      );
                  })()}
              </div>
          </div>
      )}

      {/* 5. CHAT WINDOW */}
      {gameState.currentScreen === 'chat' && (
          <ChatWindow 
              character={(() => {
                  if (gameState.selectedScenarioId) {
                       // If scenario, we might use a temp narrator char or the mainStory char if defined
                       // For simplicity, create a narrator char on the fly
                       const scen = gameState.customScenarios.find(s => s.id === gameState.selectedScenarioId);
                       return {
                           id: `narrator_${scen?.id}`, name: '旁白', role: 'Narrator', bio: 'Story Narrator', 
                           avatarUrl: '', backgroundUrl: '', themeColor: 'gray', colorAccent: '#ffffff', 
                           firstMessage: '故事开始...', voiceName: 'Charon', age: 0, systemInstruction: 'Narrator'
                       };
                  }
                  const scene = [...WORLD_SCENES, ...gameState.customScenes].find(s => s.id === gameState.selectedSceneId);
                  if (gameState.selectedCharacterId === scene?.mainStory?.id) return scene!.mainStory!;
                  
                  const builtIn = scene?.characters.find(c => c.id === gameState.selectedCharacterId);
                  if (builtIn) return builtIn;
                  
                  const custom = gameState.customCharacters[gameState.selectedSceneId!]?.find(c => c.id === gameState.selectedCharacterId);
                  return custom!;
              })()}
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
                  if (echo) {
                      // Save echo to journal
                      const entryId = gameState.activeJournalEntryId;
                      if (entryId) {
                          setGameState(prev => ({
                              ...prev,
                              journalEntries: prev.journalEntries.map(e => e.id === entryId ? { ...e, echo } : e),
                              activeJournalEntryId: null // Clear active exploration
                          }));
                      }
                  }
                  setGameState(prev => ({...prev, currentScreen: 'characterSelection', selectedCharacterId: null, selectedScenarioId: null, currentScenarioState: undefined}));
              }}
          />
      )}

      {/* 6. BUILDER */}
      {gameState.currentScreen === 'builder' && (
          <ScenarioBuilder 
             onSave={(scenario) => {
                 setGameState(prev => ({
                     ...prev,
                     customScenarios: [...prev.customScenarios, scenario],
                     currentScreen: 'characterSelection'
                 }));
             }}
             onCancel={() => setGameState(prev => ({...prev, currentScreen: 'characterSelection'}))}
             initialScenario={null}
          />
      )}

      {/* 7. CONNECTION SPACE */}
      {gameState.currentScreen === 'connectionSpace' && (
          <ConnectionSpace 
             userProfile={gameState.userProfile!}
             characters={getAllCharacters()}
             onConnect={(char) => {
                 // Find which scene this char belongs to
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
             onBack={() => setGameState(prev => ({...prev, currentScreen: 'sceneSelection'}))}
          />
      )}
      
      {/* 8. ADMIN SCREEN */}
      {gameState.currentScreen === 'admin' && (
          <AdminScreen 
             gameState={gameState}
             onUpdateGameState={setGameState}
             onResetWorld={() => { storageService.clearMemory(); setGameState(INITIAL_STATE); }}
             onBack={() => setGameState(prev => ({...prev, currentScreen: 'entryPoint'}))}
          />
      )}
      
      {/* 9. IMMERSIVE MEMORY VIEW */}
      {gameState.currentScreen === 'immersiveMemory' && gameState.currentTicket && (
          <ImmersiveMemoryView 
              ticket={gameState.currentTicket}
              onClose={() => setGameState(prev => ({...prev, currentScreen: 'entryPoint', currentTicket: null}))}
          />
      )}

      {/* --- MODALS --- */}
      
      {showSettings && (
          <SettingsModal 
             settings={gameState.settings} 
             gameState={gameState}
             onSettingsChange={(s) => setGameState(prev => ({...prev, settings: s}))}
             onUpdateProfile={handleUpdateProfile}
             onClose={() => setShowSettings(false)}
             onLogout={() => {
                 storageService.clearMemory();
                 setGameState(INITIAL_STATE);
                 setShowSettings(false);
             }}
             onBindAccount={() => { setShowSettings(false); setShowLogin(true); }}
          />
      )}

      {showLogin && (
          <LoginModal 
             onLoginSuccess={handleLoginSuccess}
             onCancel={() => setShowLogin(false)}
          />
      )}

      {showMailbox && (
          <MailboxModal 
             mails={gameState.mailbox}
             onClose={() => setShowMailbox(false)}
             onMarkAsRead={(id) => setGameState(prev => ({
                 ...prev,
                 mailbox: prev.mailbox.map(m => m.id === id ? { ...m, isRead: true } : m)
             }))}
          />
      )}

      {showEraMemory && gameState.selectedSceneId && (
          <EraMemoryModal 
              scene={[...WORLD_SCENES, ...gameState.customScenes].find(s => s.id === gameState.selectedSceneId)!}
              memories={gameState.sceneMemories[gameState.selectedSceneId] || []}
              onAddMemory={(content, img) => setGameState(prev => ({
                  ...prev,
                  sceneMemories: {
                      ...prev.sceneMemories,
                      [gameState.selectedSceneId!]: [...(prev.sceneMemories[gameState.selectedSceneId!] || []), {
                          id: `mem_${Date.now()}`, content, imageUrl: img, timestamp: Date.now()
                      }]
                  }
              }))}
              onDeleteMemory={(id) => setGameState(prev => ({
                  ...prev,
                  sceneMemories: {
                      ...prev.sceneMemories,
                      [gameState.selectedSceneId!]: prev.sceneMemories[gameState.selectedSceneId!].filter(m => m.id !== id)
                  }
              }))}
              onClose={() => setShowEraMemory(false)}
          />
      )}

      {showEraConstructor && (
          <EraConstructorModal 
              initialScene={editingScene}
              onSave={(scene) => {
                  setGameState(prev => {
                      const exists = prev.customScenes.find(s => s.id === scene.id);
                      return {
                          ...prev,
                          customScenes: exists ? prev.customScenes.map(s => s.id === scene.id ? scene : s) : [...prev.customScenes, scene]
                      };
                  });
                  setShowEraConstructor(false);
                  setEditingScene(null);
              }}
              onDelete={editingScene ? () => {
                   setGameState(prev => ({...prev, customScenes: prev.customScenes.filter(s => s.id !== editingScene.id)}));
                   setShowEraConstructor(false);
                   setEditingScene(null);
              } : undefined}
              onClose={() => { setShowEraConstructor(false); setEditingScene(null); }}
          />
      )}

      {showCharacterConstructor && gameState.selectedSceneId && (
          <CharacterConstructorModal 
              scene={[...WORLD_SCENES, ...gameState.customScenes].find(s => s.id === gameState.selectedSceneId)!}
              initialCharacter={editingCharacter}
              onSave={(char) => {
                  setGameState(prev => {
                      const sceneId = gameState.selectedSceneId!;
                      const currentChars = prev.customCharacters[sceneId] || [];
                      const exists = currentChars.find(c => c.id === char.id);
                      return {
                          ...prev,
                          customCharacters: {
                              ...prev.customCharacters,
                              [sceneId]: exists ? currentChars.map(c => c.id === char.id ? char : c) : [...currentChars, char]
                          }
                      };
                  });
                  setShowCharacterConstructor(false);
                  setEditingCharacter(null);
              }}
              onClose={() => { setShowCharacterConstructor(false); setEditingCharacter(null); }}
          />
      )}

       {gameState.currentTicket && gameState.currentScreen !== 'immersiveMemory' && gameState.userProfile && (
           <MemoryTicketModal 
              entry={{ title: gameState.currentTicket.title, content: gameState.currentTicket.content, timestamp: gameState.currentTicket.timestamp, imageUrl: gameState.currentTicket.imageUrl } as JournalEntry}
              user={gameState.userProfile}
              onClose={() => setGameState(prev => ({...prev, currentTicket: null}))}
           />
       )}

      {/* DEBUG CONSOLE */}
      {gameState.settings.debugMode && gameState.debugLogs.length > 0 && (
          <DebugConsole 
              logs={gameState.debugLogs} 
              onClear={() => setGameState(prev => ({...prev, debugLogs: []}))}
              onClose={() => setGameState(prev => ({...prev, settings: {...prev.settings, debugMode: false}}))}
          />
      )}

    </div>
  );
}