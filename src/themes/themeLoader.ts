import { applyResolvedTheme, findThemeById, getDefaultThemeDefinition, resolveTheme } from './themeSystem';
import { toLegacyThemeShape, Theme } from './themes';

export async function loadTheme(themeId: string, customThemes: any[] = []): Promise<Theme | null> {
  const definition = findThemeById(themeId, customThemes) ?? getDefaultThemeDefinition();
  return toLegacyThemeShape(definition);
}

export async function applyThemeFromFile(themeId: string, customThemes: any[] = [], reducedMotion = false): Promise<void> {
  const definition = findThemeById(themeId, customThemes) ?? getDefaultThemeDefinition();
  const resolved = resolveTheme(definition, reducedMotion);
  applyResolvedTheme(resolved);
}

export function getAvailableThemes(): string[] {
  return [];
}
