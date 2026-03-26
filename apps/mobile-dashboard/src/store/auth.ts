import { create } from 'zustand';
import { getStoredTokens, clearTokens, saveTokens } from '../services/auth';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;

  bootstrap: () => Promise<void>;
  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isBootstrapping: true,

  bootstrap: async () => {
    try {
      const { accessToken, user } = await getStoredTokens();
      if (accessToken && user) {
        set({
          user: user as User,
          accessToken,
          isAuthenticated: true,
          isBootstrapping: false,
        });
      } else {
        set({ isBootstrapping: false });
      }
    } catch {
      set({ isBootstrapping: false });
    }
  },

  login: async (accessToken, refreshToken, user) => {
    await saveTokens(accessToken, refreshToken, user);
    set({ user, accessToken, isAuthenticated: true });
  },

  logout: async () => {
    await clearTokens();
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),
}));
