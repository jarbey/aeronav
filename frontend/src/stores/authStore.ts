import { create } from 'zustand';
import type { User } from '../types';

const LS_USER = 'aeronav.user';
export const LS_TOKEN = 'aeronav.token';

interface AuthStore {
  currentUser: User | null;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  currentUser: (() => {
    try {
      const stored = localStorage.getItem(LS_USER);
      if (stored) return JSON.parse(stored) as User;
    } catch { /* empty */ }
    return null;
  })(),
  setUser: (user: User) => {
    try { localStorage.setItem(LS_USER, JSON.stringify(user)); } catch { /* empty */ }
    set({ currentUser: user });
  },
  logout: () => {
    try {
      localStorage.removeItem(LS_USER);
      localStorage.removeItem(LS_TOKEN);
    } catch { /* empty */ }
    set({ currentUser: null });
  },
}));
