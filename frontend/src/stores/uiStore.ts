import { create } from 'zustand';
import type { AppTab, VoyageSubTab, EditorState, FormEditorState } from '../types';

const LS_VOYAGE = 'aeronav.activeVoyageId';

interface UIStore {
  tab: AppTab;
  voyageSubTab: VoyageSubTab;
  activeVoyageId: string | null;
  selectedLegIdx: number;
  editor: EditorState | null;
  formEditor: FormEditorState | null;
  shareDialogId: string | null;
  settingsDialogId: string | null;
  newVoyageOpen: boolean;
  vacIcao: string | null;
  userMenuOpen: boolean;

  setTab: (tab: AppTab) => void;
  setVoyageSubTab: (sub: VoyageSubTab) => void;
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
  tab: 'voyages',
  voyageSubTab: 'map',
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

  setTab: (tab) => set({ tab }),
  setVoyageSubTab: (voyageSubTab) => set({ voyageSubTab }),
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
