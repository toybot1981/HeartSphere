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

export interface WorldScene {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  characters: Character[];
  mainStory?: Character;
}

export interface AppSettings {
  autoGenerateAvatars: boolean;
  autoGenerateStoryScenes: boolean;
}

export interface UserProfile {
  nickname: string;
  avatarUrl: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  timestamp: number;
}

export interface GameState {
  currentScreen: 'profileSetup' | 'entryPoint' | 'realWorld' | 'sceneSelection' | 'characterSelection' | 'chat' | 'builder';
  userProfile: UserProfile | null;
  selectedSceneId: string | null;
  selectedCharacterId: string | null;
  selectedScenarioId: string | null;
  editingScenarioId: string | null;
  history: Record<string, Message[]>; 
  customAvatars: Record<string, string>; 
  generatingAvatarId: string | null; 
  customScenarios: CustomScenario[];
  customScenes: WorldScene[];
  journalEntries: JournalEntry[];
  currentQuestion: string | null;
  currentScenarioState?: {
    scenarioId: string;
    currentNodeId: string;
  };
  settings: AppSettings;
}