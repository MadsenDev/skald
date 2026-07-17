import { useMemo } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import {
  applyResolvedTheme,
  findThemeById,
  getActiveThemeId,
  getDefaultThemeDefinition,
  resolveTheme,
  ThemeDefinition,
} from './themeSystem';

export function useActiveTheme(): { definition: ThemeDefinition; resolved: ReturnType<typeof resolveTheme> } {
  const settings = useSettingsStore((state) => state.settings);
  const activeThemeId = getActiveThemeId(settings.appearance);
  const customThemes = settings.appearance?.customThemes ?? [];
  const reducedMotion = settings.appearance?.reducedMotion ?? false;

  return useMemo(() => {
    const definition = findThemeById(activeThemeId, customThemes) ?? getDefaultThemeDefinition();
    const resolved = resolveTheme(definition, reducedMotion);
    return { definition, resolved };
  }, [activeThemeId, customThemes, reducedMotion]);
}

export function applyActiveThemeFromSettings(settings: { appearance?: { activeThemeId?: string; theme?: string; reducedMotion?: boolean; customThemes?: ThemeDefinition[] } }) {
  const themeId = getActiveThemeId(settings.appearance);
  const definition = findThemeById(themeId, settings.appearance?.customThemes ?? []) ?? getDefaultThemeDefinition();
  const resolved = resolveTheme(definition, settings.appearance?.reducedMotion ?? false);
  applyResolvedTheme(resolved);
  return resolved;
}
