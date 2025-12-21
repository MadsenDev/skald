import { create } from 'zustand';

export interface AppSettings {
  editor?: {
    fontSize?: number;
    fontFamily?: string;
    wordWrap?: boolean;
    lineNumbers?: boolean;
    minimap?: boolean;
    autoLinkSuggestions?: boolean; // Automatic link suggestions while typing
  };
  appearance?: {
    theme?: string; // Theme ID (e.g., 'light', 'dark', 'blue', etc.)
    sidebarNoteDisplay?: 'filename' | 'title'; // How to display notes in sidebar
  };
  kanban?: {
    wipLimits?: {
      open?: number;
      'in-progress'?: number;
      done?: number;
      cancelled?: number;
    };
    groupBy?: 'assignee' | 'label' | 'none';
  };
  preview?: {
    codeBlockTheme?: string; // highlight.js theme (e.g., 'github', 'github-dark', 'monokai', etc.)
    codeBlockLineNumbers?: boolean;
    codeBlockFontSize?: number;
    codeBlockFontFamily?: string;
  };
  calendar?: {
    firstDayOfWeek?: number; // 0 = Sunday, 1 = Monday, etc.
  };
  [key: string]: any;
}

interface SettingsState {
  settings: AppSettings;
  loading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  setSetting: (key: string, value: any) => Promise<void>;
  getSetting: <T = any>(key: string) => T | undefined;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  loading: false,

  loadSettings: async () => {
    set({ loading: true });
    try {
      const settings = await window.api.settings.getAll();
      set({ settings: settings || {}, loading: false });
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ loading: false });
    }
  },

  updateSettings: async (updates: Partial<AppSettings>) => {
    try {
      await window.api.settings.update(updates);
      const currentSettings = get().settings;
      set({ settings: { ...currentSettings, ...updates } });
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  },

  setSetting: async (key: string, value: any) => {
    try {
      // Update local state immediately for instant UI updates
      const currentSettings = get().settings;
      const keys = key.split('.');
      const newSettings = { ...currentSettings };
      let current: any = newSettings;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!(k in current) || typeof current[k] !== 'object' || current[k] === null) {
          current[k] = {};
        } else {
          current[k] = { ...current[k] };
        }
        current = current[k];
      }
      current[keys[keys.length - 1]] = value;
      set({ settings: newSettings });
      
      // Then persist to database
      await window.api.settings.set(key, value);
    } catch (error) {
      console.error('Failed to set setting:', error);
    }
  },

  getSetting: <T = any>(key: string): T | undefined => {
    const settings = get().settings;
    const keys = key.split('.');
    let value: any = settings;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }
    return value as T;
  },
}));

