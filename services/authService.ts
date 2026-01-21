import { User } from '../types';

// Mock Auth Service for demonstration without Firebase
const MOCK_AUTH_KEY = 'arcovel_auth_user';

export const authService = {
  // Simulate login
  login: async (email: string): Promise<User> => {
    // Deterministic mock ID based on email for consistent persistence
    const id = btoa(email).substring(0, 12); 
    const user: User = {
      id,
      email,
      name: email.split('@')[0]
    };
    
    localStorage.setItem(MOCK_AUTH_KEY, JSON.stringify(user));
    return user;
  },

  logout: async () => {
    localStorage.removeItem(MOCK_AUTH_KEY);
  },

  // Mock subscription to match previous interface
  onAuthStateChanged: (callback: (user: User | null) => void) => {
    const stored = localStorage.getItem(MOCK_AUTH_KEY);
    if (stored) {
      try {
        const user = JSON.parse(stored);
        callback(user);
      } catch (e) {
        callback(null);
      }
    } else {
      callback(null);
    }
    // Return a dummy unsubscribe function
    return () => {};
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(MOCK_AUTH_KEY);
    return stored ? JSON.parse(stored) : null;
  }
};