import type * as Monaco from 'monaco-editor';
import { Theme } from './themes';

function rgbaToHex(color: string): string {
  if (color.startsWith('#')) {
    return color;
  }
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (!match) {
    return color;
  }
  const [, r, g, b, alpha] = match;
  const rgb = [r, g, b].map((value) => Number(value).toString(16).padStart(2, '0')).join('');
  if (alpha === undefined) {
    return `#${rgb}`;
  }
  const normalizedAlpha = Math.max(0, Math.min(1, Number(alpha)));
  const alphaHex = Math.round(normalizedAlpha * 255).toString(16).padStart(2, '0');
  return `#${rgb}${alphaHex}`;
}

export function generateMonacoTheme(theme: Theme): Monaco.editor.IStandaloneThemeData {
  const isDark = theme.monacoTheme === 'vs-dark';
  return {
    base: isDark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [
      { token: '', foreground: rgbaToHex(theme.colors.textPrimary) },
      { token: 'comment', foreground: rgbaToHex(theme.colors.textTertiary), fontStyle: 'italic' },
      { token: 'string', foreground: rgbaToHex(theme.colors.success) },
      { token: 'keyword', foreground: rgbaToHex(theme.colors.accent), fontStyle: 'bold' },
      { token: 'number', foreground: rgbaToHex(theme.colors.info) },
      { token: 'heading', foreground: rgbaToHex(theme.colors.textPrimary), fontStyle: 'bold' },
      { token: 'link', foreground: rgbaToHex(theme.colors.accent) },
      { token: 'quote', foreground: rgbaToHex(theme.colors.textSecondary), fontStyle: 'italic' },
      { token: 'list', foreground: rgbaToHex(theme.colors.accent) },
      { token: 'code', foreground: rgbaToHex(theme.colors.codeText), background: rgbaToHex(theme.colors.codeBg) },
    ],
    colors: {
      'editor.background': theme.colors.bgPrimary,
      'editor.foreground': theme.colors.textPrimary,
      'editorLineNumber.foreground': theme.colors.textTertiary,
      'editorLineNumber.activeForeground': theme.colors.textSecondary,
      'editor.selectionBackground': rgbaToHex(theme.colors.active),
      'editor.lineHighlightBackground': rgbaToHex(theme.colors.hover),
      'editorCursor.foreground': rgbaToHex(theme.colors.accent),
      'editorWidget.background': theme.colors.bgSecondary,
      'editorWidget.border': theme.colors.borderPrimary,
      'editorSuggestWidget.background': theme.colors.bgSecondary,
      'editorSuggestWidget.border': theme.colors.borderPrimary,
      'editorSuggestWidget.foreground': theme.colors.textPrimary,
      'editorSuggestWidget.selectedBackground': rgbaToHex(theme.colors.hover),
      'editorSuggestWidget.highlightForeground': rgbaToHex(theme.colors.accent),
      'editorHoverWidget.background': theme.colors.bgSecondary,
      'editorHoverWidget.border': theme.colors.borderPrimary,
      'editorHoverWidget.foreground': theme.colors.textPrimary,
      'input.background': theme.colors.bgPrimary,
      'input.border': theme.colors.borderPrimary,
      'input.foreground': theme.colors.textPrimary,
      'scrollbarSlider.background': rgbaToHex(theme.colors.borderPrimary),
      'scrollbarSlider.hoverBackground': rgbaToHex(theme.colors.borderSecondary),
      'scrollbarSlider.activeBackground': rgbaToHex(theme.colors.borderSecondary),
    },
  };
}

export function registerMonacoTheme(monaco: typeof Monaco, theme: Theme): void {
  monaco.editor.defineTheme(getMonacoTheme(theme), generateMonacoTheme(theme));
}

export function getMonacoTheme(theme: Theme): string {
  return `skald-${theme.id}`;
}
