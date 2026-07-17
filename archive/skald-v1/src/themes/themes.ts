import { builtInThemes, getDefaultThemeDefinition, ThemeDefinition } from './themeSystem';

export interface Theme {
  id: string;
  name: string;
  description?: string;
  category?: 'standard' | 'drastic';
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
  monacoTheme: 'vs' | 'vs-dark';
  styles?: {
    fonts?: {
      primary?: string;
      mono?: string;
      sizes?: {
        base?: string;
      };
    };
  };
}

function toLegacyTheme(theme: ThemeDefinition): Theme {
  return {
    id: theme.id,
    name: theme.name,
    description: theme.description,
    category: theme.mode === 'light' ? 'standard' : 'drastic',
    colors: {
      bgPrimary: theme.surfaces.shell,
      bgSecondary: theme.surfaces.panel,
      bgTertiary: theme.surfaces.sunken,
      textPrimary: theme.text.primary,
      textSecondary: theme.text.secondary,
      textTertiary: theme.text.muted,
      borderPrimary: theme.border.default,
      borderSecondary: theme.border.strong,
      accent: theme.accent.primary,
      accentHover: theme.accent.hover,
      accentText: theme.accent.foreground,
      success: theme.states.success,
      warning: theme.states.warning,
      error: theme.states.danger,
      info: theme.states.info,
      hover: theme.mode === 'dark' ? 'rgba(244,247,251,0.06)' : 'rgba(46,38,30,0.045)',
      active: theme.mode === 'dark' ? 'rgba(244,247,251,0.1)' : 'rgba(46,38,30,0.08)',
      codeBg: theme.editor.codeBackground,
      codeText: theme.editor.codeForeground,
      blockquoteBorder: theme.border.strong,
      tableHeaderBg: theme.surfaces.sunken,
    },
    monacoTheme: theme.mode === 'dark' ? 'vs-dark' : 'vs',
    styles: {
      fonts: {
        primary: theme.typography.fontFamily,
        mono: theme.typography.monoFontFamily,
        sizes: {
          base: `${theme.typography.baseFontSize}px`,
        },
      },
    },
  };
}

export const themeRegistry = builtInThemes.map((theme) => ({
  id: theme.id,
  name: theme.name,
  description: theme.description,
  category: theme.mode === 'light' ? 'standard' : 'drastic',
}));

export function getThemeRegistry() {
  return themeRegistry;
}

export function getThemeById(id: string) {
  return themeRegistry.find((theme) => theme.id === id);
}

export function getThemesByCategory(category?: 'standard' | 'drastic') {
  if (!category) return themeRegistry;
  return themeRegistry.filter((theme) => theme.category === category);
}

export function getDefaultTheme() {
  return toLegacyTheme(getDefaultThemeDefinition());
}

export function toLegacyThemeShape(theme: ThemeDefinition): Theme {
  return toLegacyTheme(theme);
}
