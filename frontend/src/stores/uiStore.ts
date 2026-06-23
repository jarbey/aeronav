import { create } from 'zustand';
import type { EditorState, FormEditorState } from '../types';

const LS_VOYAGE = 'aeronav.activeVoyageId';

// Page-level navigation (tab / voyageSubTab / which voyage is open) now lives in
// the URL via react-router. This store keeps only the transient UI overlays, the
// selected leg, and a memory of the last opened voyage (so the "Voyage" tab and
// reloads can return to it).
interface UIStore {
  activeVoyageId: string | null;
  selectedLegIdx: number;
  editor: EditorState | null;
  formEditor: FormEditorState | null;
  shareDialogId: string | null;
  settingsDialogId: string | null;
  newVoyageOpen: boolean;
  vacIcao: string | null;
  userMenuOpen: boolean;

  setActiveVoyageId: (id: string | null) => void;
  setSelectedLegIdx: (idx: number) => void;
  setEditor: (e: EditorState | null) => void;
  setFormEditor: (e: FormEditorState | null) => void;
  setShareDialogId: (id: string | null) => void;
  setSettingsDialogId: (id: string | null) => void;
  setNewVoyageOpen: (open: boolean) => void;
  setVacIcao: (icao: string | null) => void;
  setUserMenuOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeVoyageId: (() => {
    try { return localStorage.getItem(LS_VOYAGE); } catch { return null; }
  })(),
  selectedLegIdx: 0,
  editor: null,
  formEditor: null,
  shareDialogId: null,
  settingsDialogId: null,
  newVoyageOpen: false,
  vacIcao: null,
  userMenuOpen: false,

  setActiveVoyageId: (id) => {
    try { if (id) localStorage.setItem(LS_VOYAGE, id); else localStorage.removeItem(LS_VOYAGE); } catch { /* empty */ }
    set({ activeVoyageId: id });
  },
  setSelectedLegIdx: (selectedLegIdx) => set({ selectedLegIdx }),
  setEditor: (editor) => set({ editor }),
  setFormEditor: (formEditor) => set({ formEditor }),
  setShareDialogId: (shareDialogId) => set({ shareDialogId }),
  setSettingsDialogId: (settingsDialogId) => set({ settingsDialogId }),
  setNewVoyageOpen: (newVoyageOpen) => set({ newVoyageOpen }),
  setVacIcao: (vacIcao) => set({ vacIcao }),
  setUserMenuOpen: (userMenuOpen) => set({ userMenuOpen }),
}));
