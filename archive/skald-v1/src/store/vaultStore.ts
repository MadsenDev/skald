import { create } from 'zustand';

interface Note {
  id: string;
  path: string;
  title: string;
  updatedAt: Date;
}

interface VaultState {
  vaultPath: string | null;
  notes: Note[];
  loadVault: (path: string) => Promise<void>;
  loadNotes: () => Promise<void>;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  vaultPath: null,
  notes: [],

  loadVault: async (path: string) => {
    set({ vaultPath: path });
    await get().loadNotes();
  },

  loadNotes: async () => {
    try {
      const notes = await window.api.vault.listNotes();
      set({ notes });
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  },
}));

