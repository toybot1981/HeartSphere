
// This file includes legacy types like 'Persona' to prevent errors in unused components,
// but the main application logic relies on the 'WorldScene' architecture.
export interface Persona {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  eras: Character[];
}

export interface Character {
  id: string;
  name: string;
  age: number;
  era?: string; // Legacy support
  role: string;
  bio: string;
  avatarUrl: string;
  backgroundUrl: string;
  systemInstruction: string;
  themeColor: string;
  colorAccent: string;
  firstMessage: string;
  voiceName: string;

  // --- New Deep Personality Fields ---
  mbti?: string;             // e.g., "INFJ"
  tags?: string[];           // e.g., "Tsundere", "Hacker", "Cat Lover"
  speechStyle?: string;      // e.g., "Short, coded, uses slang"
  catchphrases?: string[];   // e.g., "Interesting.", "Baka!"
  secrets?: string;          // Hidden depth not known to user initially
  motivations?: string;      // Current goal driving the character
  relationships?: string;    // Text description of connections with others
}

export interface Message {
  id:string;
  role: 'user' | 'model';
  text: string;
  image?: string;
  timestamp: number;
}

export interface StoryOption {
  id: string;
  text: string;
  nextNodeId: string;
}

export interface StoryNode {
  id: string;
  title: string;
  prompt: string;
  backgroundHint?: string;
  options: StoryOption[];
}

export interface CustomScenario {
  id: string;
  sceneId: string; // Belongs to a specific scene
  title: string;
  description: string;
  nodes: Record<string, StoryNode>;
  startNodeId: string;
  author: string;
}

export interface EraMemory {
  id: string;
  content: string; // Text memory
  imageUrl?: string; // Optional photo
  timestamp: number;
}

export interface WorldScene {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  characters: Character[];
  mainStory?: Character;
  memories?: EraMemory[]; // Personal memories specific to this era
}

export type AIProvider = 'gemini' | 'openai' | 'qwen' | 'doubao';

export interface ModelConfig {
  apiKey: string;
  baseUrl?: string; // Optional for custom endpoints
  modelName: string;      // Text Model
  imageModel?: string;    // Image Generation Model
  videoModel?: string;    // Video Generation Model
}

export interface AppSettings {
  autoGenerateAvatars: boolean;
  autoGenerateStoryScenes: boolean;
  autoGenerateJournalImages: boolean; // New setting for journal
  debugMode: boolean; 
  
  // Modality Routing Settings
  textProvider: AIProvider;
  imageProvider: AIProvider;
  videoProvider: AIProvider; // New Video Support
  audioProvider: AIProvider;
  enableFallback: boolean; // If true, try other providers on error

  // Provider Configurations
  geminiConfig: ModelConfig;
  openaiConfig: ModelConfig;
  qwenConfig: ModelConfig;
  doubaoConfig: ModelConfig;
}

export interface UserProfile {
  id?: string;
  nickname: string;
  avatarUrl: string;
  phoneNumber?: string;
  isGuest: boolean; // True if not logged in/registered
}

export interface JournalEcho {
  characterName: string;
  text: string;
  timestamp: number;
  imageUrl?: string; 
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  imageUrl?: string; // Mind Projection
  echo?: JournalEcho; // Echoes of Wisdom
  insight?: string; // Mirror of Truth (本我镜像)
}

export interface Mail {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string;
  subject: string;
  content: string;
  timestamp: number;
  isRead: boolean;
  themeColor: string;
}

// Debug Logging Structure
export interface DebugLog {
  id: string;
  timestamp: number;
  provider: string;
  model?: string; // Specific model name used
  method: string;
  type: string;
  data: any;
}

export interface GameState {
  currentScreen: 'profileSetup' | 'entryPoint' | 'realWorld' | 'sceneSelection' | 'characterSelection' | 'chat' | 'builder' | 'connectionSpace' | 'admin' | 'mobileProfile';
  userProfile: UserProfile | null;
  selectedSceneId: string | null;
  selectedCharacterId: string | null;
  selectedScenarioId: string | null;
  
  // New field to hold the temporary narrator character for scenarios
  tempStoryCharacter: Character | null;

  editingScenarioId: string | null;
  history: Record<string, Message[]>; 
  customAvatars: Record<string, string>; 
  generatingAvatarId: string | null; 
  
  // Custom characters added to scenes (Map: sceneId -> Character[])
  customCharacters: Record<string, Character[]>;

  customScenarios: CustomScenario[];
  customScenes: WorldScene[];
  journalEntries: JournalEntry[];
  activeJournalEntryId: string | null; // Track which entry is currently being "explored"
  currentScenarioState?: {
    scenarioId: string;
    currentNodeId: string;
  };
  settings: AppSettings;
  mailbox: Mail[]; // Chronos Mailbox
  lastLoginTime: number; // For tracking offline duration
  sceneMemories: Record<string, EraMemory[]>; // Map sceneId -> memories
  
  debugLogs: DebugLog[]; // Store runtime logs
}
