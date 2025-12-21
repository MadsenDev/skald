import { create } from 'zustand';

export interface SearchDocument {
  id: string;
  type: 'note' | 'task';
  noteId?: string;
  title: string;
  content: string;
  path: string;
  frontmatter?: Record<string, any>;
  tags: string[];
  schema?: string;
  status?: string;
  priority?: number;
  dueDate?: number;
  assignedTo?: string;
  headings: string[];
  codeBlocks: string[];
  updatedAt: number;
}

interface SearchState {
  results: SearchDocument[];
  query: string;
  loading: boolean;
  search: (query: string) => Promise<void>;
  clearResults: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  results: [],
  query: '',
  loading: false,

  search: async (query: string) => {
    if (!query.trim()) {
      set({ results: [], query: '' });
      return;
    }

    set({ loading: true, query });
    try {
      const results = await window.api.search.query(query);
      set({ results, loading: false });
    } catch (error) {
      console.error('Search failed:', error);
      set({ results: [], loading: false });
    }
  },

  clearResults: () => {
    set({ results: [], query: '' });
  },
}));

