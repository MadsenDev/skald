// Theme system - now file-based
// Each theme has its own folder with theme.json and theme.css

export interface Theme {
  id: string;
  name: string;
  description?: string;
  category?: 'standard' | 'drastic' | 'animated';
  colors: {
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    borderPrimary: string;
    borderSecondary: string;
    accent: string;
    accentHover: string;
    accentText: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    hover: string;
    active: string;
    codeBg: string;
    codeText: string;
    blockquoteBorder: string;
    tableHeaderBg: string;
  };
  monacoTheme: 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';
  styles?: {
    fonts?: {
      primary?: string;
      mono?: string;
      sizes?: {
        base?: string;
        small?: string;
        large?: string;
      };
    };
    animations?: {
      enabled?: boolean;
      [key: string]: any;
    };
    componentOverrides?: {
      [key: string]: any;
    };
  };
}

// Static theme registry - maps to theme folders
export const themeRegistry: Array<{ id: string; name: string; description?: string; category?: Theme['category'] }> = [
  { id: 'light', name: 'Light', description: 'Clean and bright', category: 'standard' },
  { id: 'dark', name: 'Dark', description: 'Easy on the eyes', category: 'standard' },
  { id: 'matrix', name: 'Matrix', description: 'Digital rain effect', category: 'drastic' },
  { id: 'retro', name: 'Retro Terminal', description: '80s computer aesthetic', category: 'drastic' },
  { id: 'minimal', name: 'Minimal', description: 'Ultra clean, borderless design', category: 'drastic' },
  { id: 'fire', name: 'Fire', description: 'Burning flames from below', category: 'drastic' },
  { id: 'ocean', name: 'Ocean', description: 'Calm waves and deep blue', category: 'drastic' },
  { id: 'neon', name: 'Neon Cyberpunk', description: 'Vibrant neon cityscape with electric grid', category: 'drastic' },
  { id: 'glitch', name: 'Glitch', description: 'Experimental glitch effects - for fun!', category: 'drastic' },
];

export function getThemeRegistry() {
  return themeRegistry;
}

export function getThemeById(id: string) {
  return themeRegistry.find(t => t.id === id);
}

export function getThemesByCategory(category?: Theme['category']) {
  if (!category) return themeRegistry;
  return themeRegistry.filter(t => t.category === category);
}

export function getDefaultTheme() {
  return themeRegistry[0];
}
