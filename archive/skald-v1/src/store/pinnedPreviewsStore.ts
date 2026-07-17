import { create } from 'zustand';

export interface PinnedPreview {
  id: string;
  noteId: string;
  notePath: string;
  noteTitle: string;
  position: { x: number; y: number };
}

interface PinnedPreviewsState {
  pinnedPreviews: PinnedPreview[];
  pinPreview: (preview: Omit<PinnedPreview, 'id'>) => void;
  unpinPreview: (id: string) => void;
  updatePreviewPosition: (id: string, position: { x: number; y: number }) => void;
  clearAll: () => void;
}

export const usePinnedPreviewsStore = create<PinnedPreviewsState>((set) => ({
  pinnedPreviews: [],
  pinPreview: (preview) => {
    const id = `pinned-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set((state) => ({
      pinnedPreviews: [...state.pinnedPreviews, { ...preview, id }],
    }));
  },
  unpinPreview: (id) => {
    set((state) => ({
      pinnedPreviews: state.pinnedPreviews.filter((p) => p.id !== id),
    }));
  },
  updatePreviewPosition: (id, position) => {
    set((state) => ({
      pinnedPreviews: state.pinnedPreviews.map((p) =>
        p.id === id ? { ...p, position } : p
      ),
    }));
  },
  clearAll: () => {
    set({ pinnedPreviews: [] });
  },
}));

