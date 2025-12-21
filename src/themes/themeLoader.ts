import { Theme } from './themes';

export interface ThemeConfig {
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
  effects?: {
    [key: string]: any;
  };
}

let currentThemeStyleElement: HTMLStyleElement | null = null;
let currentThemeLinkElement: HTMLLinkElement | null = null;

/**
 * Load a theme from its folder (JSON + CSS)
 */
export async function loadTheme(themeId: string): Promise<Theme | null> {
  try {
    // Load theme config
    const configResponse = await fetch(`/src/themes/themes/${themeId}/theme.json`);
    if (!configResponse.ok) {
      console.error(`Failed to load theme config for ${themeId}`);
      return null;
    }
    
    const config: ThemeConfig = await configResponse.json();
    
    // Convert config to Theme format
    const theme: Theme = {
      id: config.id,
      name: config.name,
      description: config.description,
      category: config.category || 'standard',
      colors: config.colors,
      monacoTheme: config.monacoTheme,
      styles: {
        fonts: config.fonts,
        animations: config.animations,
        componentOverrides: config.effects,
      },
    };
    
    return theme;
  } catch (error) {
    console.error(`Error loading theme ${themeId}:`, error);
    return null;
  }
}

/**
 * Apply a theme by loading its CSS and applying config
 */
export async function applyThemeFromFile(themeId: string): Promise<void> {
  const root = document.documentElement;
  
  // Remove previous theme classes
  const previousThemeClasses = Array.from(root.classList).filter(cls => cls.startsWith('theme-'));
  root.classList.remove(...previousThemeClasses);
  
  // Remove previous theme style/link elements
  if (currentThemeStyleElement) {
    currentThemeStyleElement.remove();
    currentThemeStyleElement = null;
  }
  if (currentThemeLinkElement) {
    currentThemeLinkElement.remove();
    currentThemeLinkElement = null;
  }
  
  // Load theme config
  const theme = await loadTheme(themeId);
  if (!theme) {
    console.error(`Failed to load theme: ${themeId}`);
    return;
  }
  
  // Set CSS variables for colors
  root.style.setProperty('--theme-bg-primary', theme.colors.bgPrimary);
  root.style.setProperty('--theme-bg-secondary', theme.colors.bgSecondary);
  root.style.setProperty('--theme-bg-tertiary', theme.colors.bgTertiary);
  root.style.setProperty('--theme-text-primary', theme.colors.textPrimary);
  root.style.setProperty('--theme-text-secondary', theme.colors.textSecondary);
  root.style.setProperty('--theme-text-tertiary', theme.colors.textTertiary);
  root.style.setProperty('--theme-border-primary', theme.colors.borderPrimary);
  root.style.setProperty('--theme-border-secondary', theme.colors.borderSecondary);
  root.style.setProperty('--theme-accent', theme.colors.accent);
  root.style.setProperty('--theme-accent-hover', theme.colors.accentHover);
  root.style.setProperty('--theme-accent-text', theme.colors.accentText);
  root.style.setProperty('--theme-success', theme.colors.success);
  root.style.setProperty('--theme-warning', theme.colors.warning);
  root.style.setProperty('--theme-error', theme.colors.error);
  root.style.setProperty('--theme-info', theme.colors.info);
  root.style.setProperty('--theme-hover', theme.colors.hover);
  root.style.setProperty('--theme-active', theme.colors.active);
  root.style.setProperty('--theme-code-bg', theme.colors.codeBg);
  root.style.setProperty('--theme-code-text', theme.colors.codeText);
  root.style.setProperty('--theme-blockquote-border', theme.colors.blockquoteBorder);
  root.style.setProperty('--theme-table-header-bg', theme.colors.tableHeaderBg);
  
  // Apply font settings
  if (theme.styles?.fonts) {
    if (theme.styles.fonts.primary) {
      root.style.setProperty('--theme-font-primary', theme.styles.fonts.primary);
      root.style.fontFamily = theme.styles.fonts.primary;
    }
    if (theme.styles.fonts.mono) {
      root.style.setProperty('--theme-font-mono', theme.styles.fonts.mono);
    }
    if (theme.styles.fonts.sizes) {
      if (theme.styles.fonts.sizes.base) {
        root.style.setProperty('--theme-font-size-base', theme.styles.fonts.sizes.base);
        root.style.fontSize = theme.styles.fonts.sizes.base;
      }
      if (theme.styles.fonts.sizes.small) {
        root.style.setProperty('--theme-font-size-small', theme.styles.fonts.sizes.small);
      }
      if (theme.styles.fonts.sizes.large) {
        root.style.setProperty('--theme-font-size-large', theme.styles.fonts.sizes.large);
      }
    }
  }
  
  // Load and inject theme CSS
  // Fetch the CSS file and inject it as a style tag
  try {
    // Try to fetch the CSS file
    const cssResponse = await fetch(`/src/themes/themes/${themeId}/theme.css`);
    if (cssResponse.ok) {
      const cssText = await cssResponse.text();
      const styleElement = document.createElement('style');
      styleElement.id = `theme-${themeId}-css`;
      styleElement.textContent = cssText;
      document.head.appendChild(styleElement);
      currentThemeStyleElement = styleElement;
    } else {
      console.warn(`Failed to fetch CSS for theme ${themeId}, status: ${cssResponse.status}`);
      // Try fallback with link element
      const linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.href = `/src/themes/themes/${themeId}/theme.css`;
      linkElement.id = `theme-${themeId}-css`;
      document.head.appendChild(linkElement);
      currentThemeLinkElement = linkElement;
    }
  } catch (error) {
    console.error(`Error loading CSS for theme ${themeId}:`, error);
    // Fallback: try loading as a regular stylesheet link
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = `/src/themes/themes/${themeId}/theme.css`;
    linkElement.id = `theme-${themeId}-css`;
    document.head.appendChild(linkElement);
    currentThemeLinkElement = linkElement;
  }
  
  // Add theme class
  root.classList.add(`theme-${themeId}`);
  
  // Add theme data attribute
  root.setAttribute('data-theme', themeId);
}

/**
 * Get list of available themes by scanning the themes directory
 * For now, we'll use a static list, but this could be dynamic
 */
export function getAvailableThemes(): string[] {
  return [
    'light',
    'dark',
    'matrix',
    'retro',
    'minimal',
    'fire',
    'ocean',
    'neon',
    'glitch',
  ];
}

