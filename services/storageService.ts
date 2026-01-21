import { UserData } from '../types';

const STORAGE_PREFIX = 'deep_ledger_data_';

export const storageService = {
  save: (userId: string, data: Omit<UserData, 'lastSaved'>): number => {
    try {
      const timestamp = Date.now();
      const payload: UserData = { ...data, lastSaved: timestamp };
      localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(payload));
      return timestamp;
    } catch (e) {
      console.error("Failed to save data", e);
      // Fallback or handle quota exceeded
      return 0;
    }
  },

  load: (userId: string): UserData | null => {
    try {
      const str = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
      if (!str) return null;
      return JSON.parse(str);
    } catch (e) {
      console.error("Failed to load data", e);
      return null;
    }
  },

  clear: (userId: string) => {
    localStorage.removeItem(`${STORAGE_PREFIX}${userId}`);
  }
};