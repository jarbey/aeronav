import { create } from 'zustand';
import type { User } from '../types';

const LS_USER = 'aeronav.user';
export const LS_TOKEN = 'aeronav.token';

interface AuthStore {
  currentUser: User | null;
  /** True when the session ended because the API rejected the token (expired/invalid). */
  sessionExpired: boolean;
  setUser: (user: User) => void;
  logout: () => void;
  /** Force-logout triggered by a 401 from the API (expired API key / token). */
  expireSession: () => void;
}

function clearStorage() {
  try {
    localStorage.removeItem(LS_USER);
    localStorage.removeItem(LS_TOKEN);
  } catch { /* empty */ }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  currentUser: (() => {
    try {
      const stored = localStorage.getItem(LS_USER);
      if (stored) return JSON.parse(stored) as User;
    } catch { /* empty */ }
    return null;
  })(),
  sessionExpired: false,
  setUser: (user: User) => {
    try { localStorage.setItem(LS_USER, JSON.stringify(user)); } catch { /* empty */ }
    set({ currentUser: user, sessionExpired: false });
  },
  logout: () => {
    clearStorage();
    set({ currentUser: null, sessionExpired: false });
  },
  expireSession: () => {
    // Idempotent: a burst of concurrent 401s should only trigger one transition.
    if (get().currentUser === null && get().sessionExpired) return;
    clearStorage();
    set({ currentUser: null, sessionExpired: true });
  },
}));
