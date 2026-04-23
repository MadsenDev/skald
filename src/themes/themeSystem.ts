import { z } from 'zod';

export type ThemeMode = 'light' | 'dark';
export type ThemeDensity = 'comfortable' | 'compact';
export type ThemeAtmosphere = 'none' | 'grid' | 'glow' | 'waves';

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  kind: 'builtin' | 'custom';
  mode: ThemeMode;
  density: ThemeDensity;
  typography: {
    fontFamily: string;
    monoFontFamily: string;
    baseFontSize: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  surfaces: {
    canvas: string;
    shell: string;
    panel: string;
    elevated: string;
    sunken: string;
    overlay: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };
  border: {
    subtle: string;
    default: string;
    strong: string;
  };
  accent: {
    primary: string;
    hover: string;
    active: string;
    foreground: string;
    soft: string;
  };
  states: {
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
  overlays: {
    scrim: string;
    glass: string;
    border: string;
    blur: number;
  };
  effects: {
    atmosphere: ThemeAtmosphere;
    motionScale: number;
    noiseOpacity: number;
    vignetteOpacity: number;
    glowIntensity: number;
    gradients: string[];
  };
  editor: {
    background: string;
    gutter: string;
    selection: string;
    cursor: string;
    lineHighlight: string;
    codeBackground: string;
    codeForeground: string;
  };
}

export interface ThemeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ResolvedTheme {
  definition: ThemeDefinition;
  vars: Record<string, string>;
}

const hexColor = z.string().regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Expected #RRGGBB or #RRGGBBAA');

export const themeSchema: z.ZodType<ThemeDefinition> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  kind: z.enum(['builtin', 'custom']),
  mode: z.enum(['light', 'dark']),
  density: z.enum(['comfortable', 'compact']),
  typography: z.object({
    fontFamily: z.string().min(1),
    monoFontFamily: z.string().min(1),
    baseFontSize: z.number().min(12).max(20),
  }),
  radius: z.object({
    sm: z.number().min(0).max(24),
    md: z.number().min(0).max(32),
    lg: z.number().min(0).max(40),
    xl: z.number().min(0).max(48),
  }),
  surfaces: z.object({
    canvas: hexColor,
    shell: hexColor,
    panel: hexColor,
    elevated: hexColor,
    sunken: hexColor,
    overlay: hexColor,
  }),
  text: z.object({
    primary: hexColor,
    secondary: hexColor,
    muted: hexColor,
    inverse: hexColor,
  }),
  border: z.object({
    subtle: hexColor,
    default: hexColor,
    strong: hexColor,
  }),
  accent: z.object({
    primary: hexColor,
    hover: hexColor,
    active: hexColor,
    foreground: hexColor,
    soft: hexColor,
  }),
  states: z.object({
    success: hexColor,
    warning: hexColor,
    danger: hexColor,
    info: hexColor,
  }),
  overlays: z.object({
    scrim: hexColor,
    glass: hexColor,
    border: hexColor,
    blur: z.number().min(0).max(40),
  }),
  effects: z.object({
    atmosphere: z.enum(['none', 'grid', 'glow', 'waves']),
    motionScale: z.number().min(0).max(1),
    noiseOpacity: z.number().min(0).max(0.2),
    vignetteOpacity: z.number().min(0).max(0.5),
    glowIntensity: z.number().min(0).max(1),
    gradients: z.array(z.string().min(1)).min(1).max(3),
  }),
  editor: z.object({
    background: hexColor,
    gutter: hexColor,
    selection: hexColor,
    cursor: hexColor,
    lineHighlight: hexColor,
    codeBackground: hexColor,
    codeForeground: hexColor,
  }),
});

function createPreset(theme: Omit<ThemeDefinition, 'kind'>): ThemeDefinition {
  return {
    ...theme,
    kind: 'builtin',
  };
}

export const builtInThemes: ThemeDefinition[] = [
  createPreset({
    id: 'atelier-light',
    name: 'Atelier Light',
    description: 'Warm paper surfaces with restrained contrast and editorial accents.',
    mode: 'light',
    density: 'comfortable',
    typography: {
      fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
      monoFontFamily: '"IBM Plex Mono", "SFMono-Regular", monospace',
      baseFontSize: 15,
    },
    radius: { sm: 8, md: 14, lg: 20, xl: 28 },
    surfaces: {
      canvas: '#F4EFE6',
      shell: '#FBF7F2',
      panel: '#FFFDFC',
      elevated: '#FFFFFF',
      sunken: '#ECE3D5',
      overlay: '#FFF8F0F2',
    },
    text: {
      primary: '#2E261E',
      secondary: '#5C5248',
      muted: '#8A7C6C',
      inverse: '#FFF8F0',
    },
    border: {
      subtle: '#E7DDD0',
      default: '#D8CAB8',
      strong: '#B7A48F',
    },
    accent: {
      primary: '#A04E2D',
      hover: '#8C4224',
      active: '#71341A',
      foreground: '#FFF7F2',
      soft: '#F3DDCF',
    },
    states: {
      success: '#2F7D61',
      warning: '#B36A18',
      danger: '#B54545',
      info: '#3C6E99',
    },
    overlays: {
      scrim: '#2A1C1040',
      glass: '#FFF9F0D9',
      border: '#E7D8C5',
      blur: 18,
    },
    effects: {
      atmosphere: 'none',
      motionScale: 1,
      noiseOpacity: 0.03,
      vignetteOpacity: 0.08,
      glowIntensity: 0,
      gradients: ['linear-gradient(135deg, #F4EFE6 0%, #F8F1E8 45%, #EDE2D3 100%)'],
    },
    editor: {
      background: '#FFFDFC',
      gutter: '#ECE3D5',
      selection: '#A04E2D33',
      cursor: '#A04E2D',
      lineHighlight: '#F7EFE4',
      codeBackground: '#F5EEE4',
      codeForeground: '#2E261E',
    },
  }),
  createPreset({
    id: 'graphite-night',
    name: 'Graphite Night',
    description: 'Dense charcoal shell with crisp panels and a cool electric accent.',
    mode: 'dark',
    density: 'comfortable',
    typography: {
      fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif',
      monoFontFamily: '"JetBrains Mono", "SFMono-Regular", monospace',
      baseFontSize: 15,
    },
    radius: { sm: 8, md: 16, lg: 22, xl: 30 },
    surfaces: {
      canvas: '#0D1117',
      shell: '#111827',
      panel: '#161F2B',
      elevated: '#1A2433',
      sunken: '#0A0F17',
      overlay: '#131B26F2',
    },
    text: {
      primary: '#F4F7FB',
      secondary: '#B2BECE',
      muted: '#7E8A9B',
      inverse: '#0D1117',
    },
    border: {
      subtle: '#273244',
      default: '#334155',
      strong: '#52637A',
    },
    accent: {
      primary: '#63B3FF',
      hover: '#8DC6FF',
      active: '#3C94EA',
      foreground: '#07121E',
      soft: '#152A3D',
    },
    states: {
      success: '#2DC08D',
      warning: '#F3AE4E',
      danger: '#FF6B6B',
      info: '#63B3FF',
    },
    overlays: {
      scrim: '#02050AC7',
      glass: '#152131CC',
      border: '#334155',
      blur: 20,
    },
    effects: {
      atmosphere: 'glow',
      motionScale: 0.9,
      noiseOpacity: 0.04,
      vignetteOpacity: 0.16,
      glowIntensity: 0.35,
      gradients: ['radial-gradient(circle at top left, #16304A 0%, transparent 38%)', 'linear-gradient(135deg, #0D1117 0%, #101926 100%)'],
    },
    editor: {
      background: '#111827',
      gutter: '#0D1117',
      selection: '#63B3FF40',
      cursor: '#8DC6FF',
      lineHighlight: '#172233',
      codeBackground: '#0A0F17',
      codeForeground: '#E8EEF7',
    },
  }),
  createPreset({
    id: 'ember-dusk',
    name: 'Ember Dusk',
    description: 'Smoky reds, ember highlights, and cinematic overlay depth.',
    mode: 'dark',
    density: 'compact',
    typography: {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      monoFontFamily: '"JetBrains Mono", "SFMono-Regular", monospace',
      baseFontSize: 14,
    },
    radius: { sm: 6, md: 12, lg: 18, xl: 24 },
    surfaces: {
      canvas: '#160E10',
      shell: '#1D1114',
      panel: '#26161A',
      elevated: '#301B20',
      sunken: '#12090B',
      overlay: '#241417F2',
    },
    text: {
      primary: '#FFF3EE',
      secondary: '#E6B9AA',
      muted: '#B9897E',
      inverse: '#1D1114',
    },
    border: {
      subtle: '#4B2B31',
      default: '#6A3940',
      strong: '#8F504E',
    },
    accent: {
      primary: '#F77E52',
      hover: '#FF9C73',
      active: '#D55E37',
      foreground: '#2A120B',
      soft: '#44231A',
    },
    states: {
      success: '#50C878',
      warning: '#F6BD60',
      danger: '#FF6F61',
      info: '#76B7FF',
    },
    overlays: {
      scrim: '#090405CC',
      glass: '#301B20CC',
      border: '#7A403D',
      blur: 16,
    },
    effects: {
      atmosphere: 'glow',
      motionScale: 0.8,
      noiseOpacity: 0.05,
      vignetteOpacity: 0.22,
      glowIntensity: 0.45,
      gradients: ['radial-gradient(circle at bottom center, #6D2F1D 0%, transparent 35%)', 'linear-gradient(180deg, #160E10 0%, #221214 60%, #12090B 100%)'],
    },
    editor: {
      background: '#1D1114',
      gutter: '#160E10',
      selection: '#F77E5240',
      cursor: '#FF9C73',
      lineHighlight: '#2B181C',
      codeBackground: '#140B0D',
      codeForeground: '#FFF3EE',
    },
  }),
  createPreset({
    id: 'tidal-glass',
    name: 'Tidal Glass',
    description: 'Icy surfaces, soft aqua accents, and layered glass overlays.',
    mode: 'light',
    density: 'comfortable',
    typography: {
      fontFamily: '"Manrope", "Segoe UI", sans-serif',
      monoFontFamily: '"IBM Plex Mono", "SFMono-Regular", monospace',
      baseFontSize: 15,
    },
    radius: { sm: 10, md: 18, lg: 26, xl: 34 },
    surfaces: {
      canvas: '#E7F4F4',
      shell: '#F3FBFA',
      panel: '#F7FEFD',
      elevated: '#FFFFFF',
      sunken: '#D9ECEB',
      overlay: '#F9FFFEDE',
    },
    text: {
      primary: '#13363C',
      secondary: '#4B6A70',
      muted: '#708E94',
      inverse: '#F3FBFA',
    },
    border: {
      subtle: '#CFE3E1',
      default: '#BAD4D1',
      strong: '#8FB5B1',
    },
    accent: {
      primary: '#0F9D94',
      hover: '#127F79',
      active: '#0C6862',
      foreground: '#F7FFFE',
      soft: '#D6F3F0',
    },
    states: {
      success: '#2B8A70',
      warning: '#BE8A31',
      danger: '#CC5F5F',
      info: '#3A7EA6',
    },
    overlays: {
      scrim: '#0C2A2F2E',
      glass: '#F7FFFEE0',
      border: '#B5D8D4',
      blur: 22,
    },
    effects: {
      atmosphere: 'waves',
      motionScale: 0.65,
      noiseOpacity: 0.02,
      vignetteOpacity: 0.06,
      glowIntensity: 0.12,
      gradients: ['radial-gradient(circle at top right, #BEEAE6 0%, transparent 35%)', 'linear-gradient(135deg, #E7F4F4 0%, #F6FCFB 50%, #DCEFED 100%)'],
    },
    editor: {
      background: '#FFFFFF',
      gutter: '#E2F1EF',
      selection: '#0F9D9430',
      cursor: '#0F9D94',
      lineHighlight: '#F1FBFA',
      codeBackground: '#E8F6F5',
      codeForeground: '#13363C',
    },
  }),
];

export function getDefaultThemeDefinition(): ThemeDefinition {
  return builtInThemes[0];
}

export function listBuiltInThemes(): ThemeDefinition[] {
  return builtInThemes;
}

export function getActiveThemeId(appearance?: { activeThemeId?: string; theme?: string }): string {
  return appearance?.activeThemeId ?? appearance?.theme ?? getDefaultThemeDefinition().id;
}

export function validateThemeDefinition(theme: ThemeDefinition): ThemeValidationResult {
  const parsed = themeSchema.safeParse(theme);
  if (!parsed.success) {
    return {
      isValid: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      warnings: [],
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  const primaryContrast = getContrastRatio(theme.text.primary, theme.surfaces.panel);
  if (primaryContrast < 4.5) {
    errors.push(`Primary text contrast is too low (${primaryContrast.toFixed(2)}:1).`);
  }

  const secondaryContrast = getContrastRatio(theme.text.secondary, theme.surfaces.panel);
  if (secondaryContrast < 3) {
    warnings.push(`Secondary text contrast is weak (${secondaryContrast.toFixed(2)}:1).`);
  }

  const accentContrast = getContrastRatio(theme.accent.foreground, theme.accent.primary);
  if (accentContrast < 4.5) {
    errors.push(`Accent foreground contrast is too low (${accentContrast.toFixed(2)}:1).`);
  }

  const overlayContrast = getContrastRatio(theme.text.primary, theme.overlays.glass.slice(0, 7));
  if (overlayContrast < 3.5) {
    warnings.push(`Overlay glass may reduce readability (${overlayContrast.toFixed(2)}:1).`);
  }

  if (theme.effects.glowIntensity > 0.65) {
    warnings.push('Glow intensity is high and may reduce legibility.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function resolveTheme(theme: ThemeDefinition, reducedMotion = false): ResolvedTheme {
  const motionScale = reducedMotion ? 0 : theme.effects.motionScale;
  const densityScale = theme.density === 'compact' ? '0.875' : '1';
  const shadowColor = alpha(theme.mode === 'dark' ? '#000000' : '#1D242B', theme.mode === 'dark' ? 0.45 : 0.12);

  const vars: Record<string, string> = {
    '--theme-font-primary': theme.typography.fontFamily,
    '--theme-font-mono': theme.typography.monoFontFamily,
    '--theme-font-size-base': `${theme.typography.baseFontSize}px`,
    '--theme-density-scale': densityScale,

    '--theme-radius-small': `${theme.radius.sm}px`,
    '--theme-radius-medium': `${theme.radius.md}px`,
    '--theme-radius-large': `${theme.radius.lg}px`,
    '--theme-radius-xl': `${theme.radius.xl}px`,

    '--theme-bg-canvas': theme.surfaces.canvas,
    '--theme-bg-shell': theme.surfaces.shell,
    '--theme-bg-panel': theme.surfaces.panel,
    '--theme-bg-elevated': theme.surfaces.elevated,
    '--theme-bg-sunken': theme.surfaces.sunken,
    '--theme-bg-overlay': theme.surfaces.overlay,

    '--theme-text-primary': theme.text.primary,
    '--theme-text-secondary': theme.text.secondary,
    '--theme-text-tertiary': theme.text.muted,
    '--theme-text-inverse': theme.text.inverse,

    '--theme-border-subtle': theme.border.subtle,
    '--theme-border-primary': theme.border.default,
    '--theme-border-secondary': theme.border.strong,

    '--theme-accent': theme.accent.primary,
    '--theme-accent-hover': theme.accent.hover,
    '--theme-accent-active': theme.accent.active,
    '--theme-accent-text': theme.accent.foreground,
    '--theme-accent-soft': theme.accent.soft,

    '--theme-success': theme.states.success,
    '--theme-warning': theme.states.warning,
    '--theme-error': theme.states.danger,
    '--theme-info': theme.states.info,

    '--theme-overlay-scrim': theme.overlays.scrim,
    '--theme-overlay-glass': theme.overlays.glass,
    '--theme-overlay-border': theme.overlays.border,
    '--theme-overlay-blur': `${theme.overlays.blur}px`,

    '--theme-shadow-small': `0 8px 24px ${alpha(shadowColor, 0.6)}`,
    '--theme-shadow-medium': `0 18px 48px ${shadowColor}`,
    '--theme-shadow-large': `0 28px 80px ${alpha(shadowColor, 1)}`,

    '--theme-editor-bg': theme.editor.background,
    '--theme-editor-gutter': theme.editor.gutter,
    '--theme-editor-selection': theme.editor.selection,
    '--theme-editor-cursor': theme.editor.cursor,
    '--theme-editor-line-highlight': theme.editor.lineHighlight,
    '--theme-code-bg': theme.editor.codeBackground,
    '--theme-code-text': theme.editor.codeForeground,

    '--theme-hover': theme.mode === 'dark' ? alpha(theme.text.primary, 0.06) : alpha(theme.text.primary, 0.045),
    '--theme-active': theme.mode === 'dark' ? alpha(theme.text.primary, 0.1) : alpha(theme.text.primary, 0.08),
    '--theme-blockquote-border': theme.border.strong,
    '--theme-table-header-bg': theme.surfaces.sunken,

    '--theme-motion-scale': String(motionScale),
    '--theme-glow-intensity': String(theme.effects.glowIntensity),
    '--theme-noise-opacity': String(theme.effects.noiseOpacity),
    '--theme-vignette-opacity': String(theme.effects.vignetteOpacity),
    '--theme-gradient-1': theme.effects.gradients[0] ?? 'none',
    '--theme-gradient-2': theme.effects.gradients[1] ?? 'none',
    '--theme-gradient-3': theme.effects.gradients[2] ?? 'none',

    '--theme-bg-primary': theme.surfaces.shell,
    '--theme-bg-secondary': theme.surfaces.panel,
    '--theme-bg-tertiary': theme.surfaces.sunken,
  };

  return { definition: theme, vars };
}

export function applyResolvedTheme(theme: ResolvedTheme): void {
  const root = document.documentElement;

  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  root.dataset.themeId = theme.definition.id;
  root.dataset.themeMode = theme.definition.mode;
  root.dataset.themeDensity = theme.definition.density;
  root.dataset.themeAtmosphere = theme.definition.effects.atmosphere;
}

export function findThemeById(themeId: string, customThemes: ThemeDefinition[] = []): ThemeDefinition | undefined {
  return [...builtInThemes, ...customThemes].find((theme) => theme.id === themeId);
}

export function sanitizeImportedTheme(raw: unknown): ThemeDefinition {
  const parsed = themeSchema.parse(raw);
  return {
    ...parsed,
    kind: 'custom',
  };
}

export function createThemeId(seed: string): string {
  return seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || `theme-${Date.now()}`;
}

export function duplicateTheme(theme: ThemeDefinition): ThemeDefinition {
  return {
    ...theme,
    id: createThemeId(`${theme.id}-copy-${Date.now()}`),
    name: `${theme.name} Copy`,
    kind: 'custom',
  };
}

function parseHexColor(hex: string) {
  const normalized = hex.replace('#', '');
  const base = normalized.length === 8 ? normalized.slice(0, 6) : normalized;
  const value = Number.parseInt(base, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function toLuminance(hex: string) {
  const { r, g, b } = parseHexColor(hex);
  const channels = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function getContrastRatio(foreground: string, background: string) {
  const light = Math.max(toLuminance(foreground), toLuminance(background));
  const dark = Math.min(toLuminance(foreground), toLuminance(background));
  return (light + 0.05) / (dark + 0.05);
}

function alpha(hex: string, opacity: number): string {
  const { r, g, b } = parseHexColor(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, opacity))})`;
}
