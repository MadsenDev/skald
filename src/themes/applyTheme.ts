import { Theme } from './themes';
import type * as Monaco from 'monaco-editor';

// Store reference to current theme style element
let currentThemeStyleElement: HTMLStyleElement | null = null;

/**
 * Apply a theme to the document by setting CSS variables and custom styles
 */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  
  // Remove previous theme classes
  const previousThemeClasses = Array.from(root.classList).filter(cls => cls.startsWith('theme-'));
  root.classList.remove(...previousThemeClasses);
  
  // Remove previous theme style element
  if (currentThemeStyleElement) {
    currentThemeStyleElement.remove();
    currentThemeStyleElement = null;
  }
  
  // Set CSS variables for all theme colors
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
  
  // Apply custom styles if provided
  if (theme.styles) {
    // Apply root classes
    if (theme.styles.rootClasses) {
      root.classList.add(...theme.styles.rootClasses);
    }
    
    // Apply root inline styles
    if (theme.styles.rootStyles) {
      Object.entries(theme.styles.rootStyles).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    }
    
    // Apply font settings
    if (theme.styles.fonts) {
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
    
    // Apply spacing
    if (theme.styles.spacing) {
      if (theme.styles.spacing.base) {
        root.style.setProperty('--theme-spacing-base', theme.styles.spacing.base);
      }
      if (theme.styles.spacing.tight) {
        root.style.setProperty('--theme-spacing-tight', theme.styles.spacing.tight);
      }
      if (theme.styles.spacing.loose) {
        root.style.setProperty('--theme-spacing-loose', theme.styles.spacing.loose);
      }
    }
    
    // Apply border radius
    if (theme.styles.borderRadius) {
      if (theme.styles.borderRadius.small) {
        root.style.setProperty('--theme-radius-small', theme.styles.borderRadius.small);
      }
      if (theme.styles.borderRadius.medium) {
        root.style.setProperty('--theme-radius-medium', theme.styles.borderRadius.medium);
      }
      if (theme.styles.borderRadius.large) {
        root.style.setProperty('--theme-radius-large', theme.styles.borderRadius.large);
      }
    }
    
    // Apply shadows
    if (theme.styles.shadows) {
      if (theme.styles.shadows.small) {
        root.style.setProperty('--theme-shadow-small', theme.styles.shadows.small);
      }
      if (theme.styles.shadows.medium) {
        root.style.setProperty('--theme-shadow-medium', theme.styles.shadows.medium);
      }
      if (theme.styles.shadows.large) {
        root.style.setProperty('--theme-shadow-large', theme.styles.shadows.large);
      }
    }
    
    // Inject custom CSS
    if (theme.styles.css) {
      const styleElement = document.createElement('style');
      styleElement.id = `theme-${theme.id}-styles`;
      styleElement.textContent = theme.styles.css;
      document.head.appendChild(styleElement);
      currentThemeStyleElement = styleElement;
    }
  }
  
  // Add theme data attribute for CSS selectors
  root.setAttribute('data-theme', theme.id);
}

/**
 * Generate a Monaco editor theme configuration from our theme colors
 */
export function generateMonacoTheme(theme: Theme): Monaco.editor.IStandaloneThemeData {
  // Determine if this is a dark theme based on background color
  const isDark = isColorDark(theme.colors.bgPrimary);
  
  return {
    base: isDark ? 'vs-dark' : 'vs', // Use base theme for fallback
    inherit: true,
    rules: [
      // General text
      { token: '', foreground: ensureHex(theme.colors.textPrimary) },
      
      // Comments
      { token: 'comment', foreground: ensureHex(theme.colors.textTertiary), fontStyle: 'italic' },
      
      // Strings
      { token: 'string', foreground: ensureHex(theme.colors.success) },
      
      // Keywords
      { token: 'keyword', foreground: ensureHex(theme.colors.accent), fontStyle: 'bold' },
      
      // Numbers
      { token: 'number', foreground: ensureHex(theme.colors.info) },
      
      // Markdown specific
      { token: 'heading', foreground: ensureHex(theme.colors.textPrimary), fontStyle: 'bold' },
      { token: 'strong', foreground: ensureHex(theme.colors.textPrimary), fontStyle: 'bold' },
      { token: 'emphasis', foreground: ensureHex(theme.colors.textPrimary), fontStyle: 'italic' },
      { token: 'link', foreground: ensureHex(theme.colors.accent) },
      // Wikilinks - use same color as links
      { token: 'string.link', foreground: ensureHex(theme.colors.accent) },
      { token: 'quote', foreground: ensureHex(theme.colors.textSecondary), fontStyle: 'italic' },
      { token: 'list', foreground: ensureHex(theme.colors.accent) },
      { token: 'code', foreground: ensureHex(theme.colors.codeText), background: ensureHex(theme.colors.codeBg) },
    ],
    colors: {
      'editor.background': theme.colors.bgPrimary,
      'editor.foreground': theme.colors.textPrimary,
      'editorLineNumber.foreground': theme.colors.textTertiary,
      'editorLineNumber.activeForeground': theme.colors.textSecondary,
      'editor.selectionBackground': hexToRgba(theme.colors.accent, 0.25),
      'editor.selectionHighlightBackground': hexToRgba(theme.colors.accent, 0.12),
      'editor.lineHighlightBackground': hexToRgba(theme.colors.hover, 0.5),
      'editorCursor.foreground': theme.colors.accent,
      'editorWhitespace.foreground': hexToRgba(theme.colors.borderPrimary, 0.25),
      'editorIndentGuide.background': theme.colors.borderPrimary,
      'editorIndentGuide.activeBackground': theme.colors.borderSecondary,
      'editor.findMatchBackground': hexToRgba(theme.colors.warning, 0.25),
      'editor.findMatchHighlightBackground': hexToRgba(theme.colors.warning, 0.12),
      'editorBracketMatch.background': hexToRgba(theme.colors.accent, 0.2),
      'editorBracketMatch.border': theme.colors.accent,
      'editorWidget.background': theme.colors.bgSecondary,
      'editorWidget.border': theme.colors.borderPrimary,
      'editorSuggestWidget.background': theme.colors.bgSecondary,
      'editorSuggestWidget.border': theme.colors.borderPrimary,
      'editorSuggestWidget.foreground': theme.colors.textPrimary,
      'editorSuggestWidget.selectedBackground': theme.colors.hover,
      'editorSuggestWidget.highlightForeground': theme.colors.accent,
      'editorHoverWidget.background': theme.colors.bgSecondary,
      'editorHoverWidget.border': theme.colors.borderPrimary,
      'editorHoverWidget.foreground': theme.colors.textPrimary,
      'input.background': theme.colors.bgPrimary,
      'input.border': theme.colors.borderPrimary,
      'input.foreground': theme.colors.textPrimary,
      'inputOption.activeBorder': theme.colors.accent,
      'scrollbarSlider.background': hexToRgba(theme.colors.borderPrimary, 0.5),
      'scrollbarSlider.hoverBackground': hexToRgba(theme.colors.borderSecondary, 0.5),
      'scrollbarSlider.activeBackground': theme.colors.borderSecondary,
    },
  };
}

/**
 * Register a Monaco theme for the given theme
 */
export function registerMonacoTheme(monaco: typeof Monaco, theme: Theme): void {
  const themeName = `skald-${theme.id}`;
  const monacoTheme = generateMonacoTheme(theme);
  monaco.editor.defineTheme(themeName, monacoTheme);
}

/**
 * Get Monaco editor theme name for a given theme
 */
export function getMonacoTheme(theme: Theme): string {
  return `skald-${theme.id}`;
}

/**
 * Helper: Ensure color is in hex format (#RRGGBB)
 * Monaco expects hex format for token colors
 */
function ensureHex(color: string): string {
  // If already in hex format, return as is
  if (color.startsWith('#')) {
    return color;
  }
  
  // If it's an RGB/RGBA string, convert to hex
  // This shouldn't happen with our theme colors, but just in case
  return color;
}

/**
 * Helper: Convert hex color to RGBA format for Monaco
 */
function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  // Monaco expects hex with alpha channel (8 digits)
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `#${cleanHex}${a}`;
}

/**
 * Helper: Determine if a color is dark
 */
function isColorDark(hex: string): boolean {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}
