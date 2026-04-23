import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  builtInThemes,
  createThemeId,
  duplicateTheme,
  findThemeById,
  getActiveThemeId,
  getDefaultThemeDefinition,
  resolveTheme,
  sanitizeImportedTheme,
  ThemeDefinition,
  validateThemeDefinition,
} from '../themes/themeSystem';
import { applyResolvedTheme } from '../themes/themeSystem';
import { applyActiveThemeFromSettings } from '../themes/useTheme';

interface ThemeStudioProps {
  settings: any;
  setSetting: (key: string, value: any) => Promise<void>;
}

function cloneTheme(theme: ThemeDefinition): ThemeDefinition {
  return JSON.parse(JSON.stringify(theme)) as ThemeDefinition;
}

function cardStyle(selected: boolean) {
  return {
    borderColor: selected ? 'var(--theme-accent)' : 'var(--theme-border-primary)',
    backgroundColor: selected ? 'var(--theme-accent-soft)' : 'var(--theme-bg-panel)',
    boxShadow: selected ? '0 0 0 1px var(--theme-accent), var(--theme-shadow-small)' : 'none',
  };
}

export function ThemeStudio({ settings, setSetting }: ThemeStudioProps) {
  const appearance = settings.appearance || {};
  const customThemes: ThemeDefinition[] = appearance.customThemes || [];
  const activeThemeId = getActiveThemeId(appearance);
  const activeTheme = findThemeById(activeThemeId, customThemes) ?? getDefaultThemeDefinition();
  const [draft, setDraft] = useState<ThemeDefinition>(cloneTheme(activeTheme));
  const [importValue, setImportValue] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const allThemes = useMemo(() => [...builtInThemes, ...customThemes], [customThemes]);
  const validation = useMemo(() => validateThemeDefinition(draft), [draft]);

  useEffect(() => {
    setDraft(cloneTheme(activeTheme));
  }, [activeThemeId, activeTheme]);

  useEffect(() => {
    applyResolvedTheme(resolveTheme(draft, appearance.reducedMotion ?? false));
  }, [draft, appearance.reducedMotion]);

  useEffect(() => {
    return () => {
      applyActiveThemeFromSettings(settings);
    };
  }, [settings]);

  const updateDraft = <K extends keyof ThemeDefinition>(section: K, value: ThemeDefinition[K]) => {
    setDraft((current) => ({ ...current, [section]: value }));
  };

  const saveTheme = async () => {
    if (!validation.isValid) {
      return;
    }
    const nextTheme = {
      ...draft,
      kind: 'custom' as const,
      id: draft.kind === 'builtin' ? createThemeId(draft.name) : draft.id,
    };
    const existingIndex = customThemes.findIndex((theme) => theme.id === nextTheme.id);
    const nextCustomThemes = [...customThemes];

    if (existingIndex >= 0) {
      nextCustomThemes[existingIndex] = nextTheme;
    } else {
      nextCustomThemes.push(nextTheme);
    }

    await setSetting('appearance.customThemes', nextCustomThemes);
    await setSetting('appearance.activeThemeId', nextTheme.id);
    await setSetting('appearance.theme', nextTheme.id);
    setDraft(cloneTheme(nextTheme));
  };

  const deleteCurrentTheme = async () => {
    if (draft.kind !== 'custom') return;
    const nextCustomThemes = customThemes.filter((theme) => theme.id !== draft.id);
    const fallback = builtInThemes[0];
    await setSetting('appearance.customThemes', nextCustomThemes);
    await setSetting('appearance.activeThemeId', fallback.id);
    await setSetting('appearance.theme', fallback.id);
  };

  const exportCurrentTheme = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${draft.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importTheme = async () => {
    try {
      const imported = sanitizeImportedTheme(JSON.parse(importValue));
      const withId = {
        ...imported,
        id: createThemeId(imported.name || imported.id),
        kind: 'custom' as const,
      };
      const nextCustomThemes = [...customThemes.filter((theme) => theme.id !== withId.id), withId];
      await setSetting('appearance.customThemes', nextCustomThemes);
      await setSetting('appearance.activeThemeId', withId.id);
      await setSetting('appearance.theme', withId.id);
      setImportValue('');
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import theme JSON.');
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
          Theme Studio
        </h3>
        <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
          Build layered themes with live preview across shell surfaces, overlays, editor colors, and background effects.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              Presets and custom themes
            </h4>
            <p className="text-xs" style={{ color: 'var(--theme-text-tertiary)' }}>
              Select a preset to apply it instantly, then duplicate or edit it into a custom theme.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--theme-accent-soft)', color: 'var(--theme-accent)' }}
              onClick={() => setDraft(duplicateTheme(draft))}
            >
              Duplicate Draft
            </button>
            <button
              className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--theme-bg-sunken)', color: 'var(--theme-text-primary)' }}
              onClick={() => setDraft(duplicateTheme(getDefaultThemeDefinition()))}
            >
              New Theme
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {allThemes.map((theme) => {
            const selected = theme.id === activeThemeId;
            return (
              <motion.button
                key={theme.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                className="rounded-2xl border p-4 text-left"
                style={cardStyle(selected)}
                onClick={async () => {
                  await setSetting('appearance.activeThemeId', theme.id);
                  await setSetting('appearance.theme', theme.id);
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                      {theme.name}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--theme-text-tertiary)' }}>
                      {theme.kind === 'builtin' ? 'Preset' : 'Custom'}
                    </div>
                  </div>
                  <div
                    className="w-10 h-10 rounded-xl border"
                    style={{
                      background: `${theme.surfaces.panel}`,
                      borderColor: theme.border.default,
                      boxShadow: `inset 0 0 0 10px ${theme.accent.soft}`,
                    }}
                  />
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
                  {theme.description}
                </p>
              </motion.button>
            );
          })}
        </div>
      </section>

      <section
        className="rounded-2xl border p-5 space-y-5"
        style={{ backgroundColor: 'var(--theme-bg-panel)', borderColor: 'var(--theme-border-primary)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              Editing Draft
            </h4>
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-tertiary)' }}>
              Live preview is active. Save to persist as a reusable custom theme.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--theme-bg-sunken)', color: 'var(--theme-text-primary)' }}
              onClick={() => setDraft(cloneTheme(activeTheme))}
            >
              Reset Draft
            </button>
            <button
              className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--theme-bg-sunken)', color: 'var(--theme-text-primary)' }}
              onClick={exportCurrentTheme}
            >
              Export JSON
            </button>
            {draft.kind === 'custom' && (
              <button
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'color-mix(in srgb, var(--theme-error) 18%, var(--theme-bg-panel))', color: 'var(--theme-error)' }}
                onClick={deleteCurrentTheme}
              >
                Delete Theme
              </button>
            )}
            <button
              className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
              onClick={saveTheme}
              disabled={!validation.isValid}
            >
              Save Custom Theme
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <TextInput label="Name" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} />
          <TextInput
            label="Description"
            value={draft.description}
            onChange={(value) => setDraft((current) => ({ ...current, description: value }))}
          />
          <SelectInput
            label="Mode"
            value={draft.mode}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            onChange={(value) => setDraft((current) => ({ ...current, mode: value as ThemeDefinition['mode'] }))}
          />
          <SelectInput
            label="Atmosphere"
            value={draft.effects.atmosphere}
            options={[
              { value: 'none', label: 'None' },
              { value: 'glow', label: 'Glow' },
              { value: 'grid', label: 'Grid' },
              { value: 'waves', label: 'Waves' },
            ]}
            onChange={(value) => updateDraft('effects', { ...draft.effects, atmosphere: value as ThemeDefinition['effects']['atmosphere'] })}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ColorGroup
            title="Surfaces"
            fields={[
              ['Canvas', draft.surfaces.canvas, (value) => updateDraft('surfaces', { ...draft.surfaces, canvas: value })],
              ['Shell', draft.surfaces.shell, (value) => updateDraft('surfaces', { ...draft.surfaces, shell: value })],
              ['Panel', draft.surfaces.panel, (value) => updateDraft('surfaces', { ...draft.surfaces, panel: value })],
              ['Elevated', draft.surfaces.elevated, (value) => updateDraft('surfaces', { ...draft.surfaces, elevated: value })],
            ]}
          />
          <ColorGroup
            title="Text and Accent"
            fields={[
              ['Primary Text', draft.text.primary, (value) => updateDraft('text', { ...draft.text, primary: value })],
              ['Secondary Text', draft.text.secondary, (value) => updateDraft('text', { ...draft.text, secondary: value })],
              ['Accent', draft.accent.primary, (value) => updateDraft('accent', { ...draft.accent, primary: value })],
              ['Accent Foreground', draft.accent.foreground, (value) => updateDraft('accent', { ...draft.accent, foreground: value })],
            ]}
          />
          <ColorGroup
            title="Overlays and Editor"
            fields={[
              ['Scrim', draft.overlays.scrim.slice(0, 7), (value) => updateDraft('overlays', { ...draft.overlays, scrim: `${value}${draft.overlays.scrim.slice(7) || ''}` })],
              ['Glass', draft.overlays.glass.slice(0, 7), (value) => updateDraft('overlays', { ...draft.overlays, glass: `${value}${draft.overlays.glass.slice(7) || ''}` })],
              ['Editor Background', draft.editor.background, (value) => updateDraft('editor', { ...draft.editor, background: value })],
              ['Selection', draft.editor.selection.slice(0, 7), (value) => updateDraft('editor', { ...draft.editor, selection: `${value}${draft.editor.selection.slice(7) || ''}` })],
            ]}
          />
          <RangeGroup
            title="Motion, Blur, and Glow"
            ranges={[
              ['Base Font Size', draft.typography.baseFontSize, 12, 20, 1, (value) => updateDraft('typography', { ...draft.typography, baseFontSize: value })],
              ['Overlay Blur', draft.overlays.blur, 0, 32, 1, (value) => updateDraft('overlays', { ...draft.overlays, blur: value })],
              ['Motion Scale', draft.effects.motionScale, 0, 1, 0.05, (value) => updateDraft('effects', { ...draft.effects, motionScale: value })],
              ['Glow Intensity', draft.effects.glowIntensity, 0, 1, 0.05, (value) => updateDraft('effects', { ...draft.effects, glowIntensity: value })],
            ]}
          />
        </div>

        <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: 'var(--theme-border-primary)', backgroundColor: 'var(--theme-bg-elevated)' }}>
          <div className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
            Validation
          </div>
          {validation.errors.length === 0 && validation.warnings.length === 0 && (
            <div className="text-sm" style={{ color: 'var(--theme-success)' }}>
              Theme passes current guardrails.
            </div>
          )}
          {validation.errors.map((error) => (
            <div key={error} className="text-sm" style={{ color: 'var(--theme-error)' }}>
              {error}
            </div>
          ))}
          {validation.warnings.map((warning) => (
            <div key={warning} className="text-sm" style={{ color: 'var(--theme-warning)' }}>
              {warning}
            </div>
          ))}
        </div>
      </section>

      <section
        className="rounded-2xl border p-5 space-y-3"
        style={{ backgroundColor: 'var(--theme-bg-panel)', borderColor: 'var(--theme-border-primary)' }}
      >
        <div>
          <h4 className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
            Import theme JSON
          </h4>
          <p className="text-xs mt-1" style={{ color: 'var(--theme-text-tertiary)' }}>
            Paste a portable theme definition. Imported themes are normalized into custom themes.
          </p>
        </div>
        <textarea
          value={importValue}
          onChange={(event) => setImportValue(event.target.value)}
          className="w-full min-h-40 rounded-xl border p-3 font-mono text-xs"
          style={{
            backgroundColor: 'var(--theme-bg-sunken)',
            borderColor: 'var(--theme-border-primary)',
            color: 'var(--theme-text-primary)',
          }}
        />
        {importError && (
          <div className="text-sm" style={{ color: 'var(--theme-error)' }}>
            {importError}
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            className="px-3 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
            onClick={importTheme}
          >
            Import Theme
          </button>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
            <input
              type="checkbox"
              checked={appearance.reducedMotion ?? false}
              onChange={(event) => setSetting('appearance.reducedMotion', event.target.checked)}
            />
            Reduce motion and atmospheric effects
          </label>
        </div>
      </section>
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-tertiary)' }}>
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 rounded-xl border"
        style={{ backgroundColor: 'var(--theme-bg-elevated)', borderColor: 'var(--theme-border-primary)', color: 'var(--theme-text-primary)' }}
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-tertiary)' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 rounded-xl border"
        style={{ backgroundColor: 'var(--theme-bg-elevated)', borderColor: 'var(--theme-border-primary)', color: 'var(--theme-text-primary)' }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ColorGroup({
  title,
  fields,
}: {
  title: string;
  fields: Array<[string, string, (value: string) => void]>;
}) {
  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--theme-border-primary)', backgroundColor: 'var(--theme-bg-elevated)' }}>
      <div className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
        {title}
      </div>
      {fields.map(([label, value, onChange]) => (
        <label key={label} className="flex items-center justify-between gap-3">
          <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
            {label}
          </span>
          <div className="flex items-center gap-2">
            <input type="color" value={value.slice(0, 7)} onChange={(event) => onChange(event.target.value)} className="w-10 h-10 rounded-lg border" />
            <input
              value={value}
              onChange={(event) => onChange(event.target.value)}
              className="w-28 px-2 py-1.5 rounded-lg border font-mono text-xs"
              style={{ backgroundColor: 'var(--theme-bg-panel)', borderColor: 'var(--theme-border-primary)', color: 'var(--theme-text-primary)' }}
            />
          </div>
        </label>
      ))}
    </div>
  );
}

function RangeGroup({
  title,
  ranges,
}: {
  title: string;
  ranges: Array<[string, number, number, number, number, (value: number) => void]>;
}) {
  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--theme-border-primary)', backgroundColor: 'var(--theme-bg-elevated)' }}>
      <div className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
        {title}
      </div>
      {ranges.map(([label, value, min, max, step, onChange]) => (
        <label key={label} className="space-y-2 block">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
              {label}
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--theme-text-tertiary)' }}>
              {value}
            </span>
          </div>
          <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full" />
        </label>
      ))}
    </div>
  );
}
