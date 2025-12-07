

import { GameState } from '../types';

const DB_NAME = 'HeartSphereDB';
const STORE_NAME = 'gameState';
const DB_VERSION = 1;
const LEGACY_STORAGE_KEY = 'HEARTSPHERE_MEMORY_CORE_V1';

// Definte a partial type for saving to avoid saving unnecessary UI state
type PersistedState = Omit<GameState, 'currentScreen' | 'currentScenarioState' | 'generatingAvatarId' | 'activeJournalEntryId' | 'tempStoryCharacter' | 'debugLogs'>;

export const storageService = {
  
  /**
   * Open the IndexedDB database
   */
  initDB: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error("IndexedDB error:", request.error);
        reject("Database error");
      };

      request.onsuccess = (event) => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  },

  /**
   * Save the current game state to IndexedDB.
   */
  saveState: async (state: GameState): Promise<void> => {
    try {
      const stateToSave: PersistedState = {
        userProfile: state.userProfile,
        selectedSceneId: state.selectedSceneId, 
        selectedCharacterId: state.selectedCharacterId,
        selectedScenarioId: state.selectedScenarioId,
        editingScenarioId: null, 
        history: state.history,
        customAvatars: state.customAvatars,
        customScenarios: state.customScenarios,
        customScenes: state.customScenes,
        customCharacters: state.customCharacters, // Ensure user-created characters for default scenes are saved
        journalEntries: state.journalEntries,
        settings: state.settings,
        mailbox: state.mailbox,
        lastLoginTime: state.lastLoginTime,
        sceneMemories: state.sceneMemories || {}, 
      };

      const db = await storageService.initDB();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      
      // We store the whole state under a single key 'latest'
      const request = store.put(stateToSave, 'latest');

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

    } catch (e) {
      console.error("Memory Core Write Error:", e);
    }
  },

  /**
   * Load the game state from IndexedDB.
   * Includes migration logic from LocalStorage.
   */
  loadState: async (): Promise<Partial<GameState> | null> => {
    try {
      const db = await storageService.initDB();
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('latest');

      const result = await new Promise<PersistedState | undefined>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (result) {
        return result;
      }

      // Fallback / Migration: Check LocalStorage
      const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyData) {
        console.log("Migrating data from LocalStorage to IndexedDB...");
        const parsedData = JSON.parse(legacyData);
        // Save to IDB
        await storageService.saveState(parsedData as GameState);
        // Clear Legacy
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return parsedData;
      }

      return null;
    } catch (e) {
      console.error("Memory Core Read Error:", e);
      return null;
    }
  },

  /**
   * Clear all data (Factory Reset)
   */
  clearMemory: async () => {
    try {
      const db = await storageService.initDB();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      window.location.reload();
    } catch (e) {
      console.error("Failed to clear memory", e);
    }
  },

  /**
   * Generate backup string from current state (Synchronous helper for the UI)
   */
  exportBackup: (currentState: GameState): string => {
     const stateToSave: PersistedState = {
        userProfile: currentState.userProfile,
        selectedSceneId: currentState.selectedSceneId, 
        selectedCharacterId: currentState.selectedCharacterId,
        selectedScenarioId: currentState.selectedScenarioId,
        editingScenarioId: null, 
        history: currentState.history,
        customAvatars: currentState.customAvatars,
        customScenarios: currentState.customScenarios,
        customScenes: currentState.customScenes,
        customCharacters: currentState.customCharacters,
        journalEntries: currentState.journalEntries,
        settings: currentState.settings,
        mailbox: currentState.mailbox,
        lastLoginTime: currentState.lastLoginTime,
        sceneMemories: currentState.sceneMemories || {},
      };
      return JSON.stringify(stateToSave);
  },

  /**
   * Validate and Restore data from a JSON string to IndexedDB
   */
  restoreBackup: async (jsonString: string): Promise<boolean> => {
    try {
      const data = JSON.parse(jsonString);
      // Basic validation: check if it looks like our state
      if (!data || typeof data !== 'object') {
        throw new Error("Invalid backup format");
      }
      // Check for a few key fields to ensure it's a HeartSphere backup
      if (!data.history && !data.userProfile && !data.settings) {
        throw new Error("Data does not contain HeartSphere memory structures");
      }

      // Save to IndexedDB
      await storageService.saveState(data as GameState);
      return true;
    } catch (e) {
      console.error("Restore failed:", e);
      return false;
    }
  }
};
