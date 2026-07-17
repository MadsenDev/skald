import { app } from 'electron';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// App-level (not vault-level) config: which vault was last open, window size.

interface AppConfig {
  lastVault: string | null;
  windowBounds?: { width: number; height: number };
}

const DEFAULTS: AppConfig = { lastVault: null };

function configPath(): string {
  return join(app.getPath('userData'), 'skald-config.json');
}

export function loadAppConfig(): AppConfig {
  try {
    const raw = readFileSync(configPath(), 'utf-8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAppConfig(patch: Partial<AppConfig>): AppConfig {
  const next = { ...loadAppConfig(), ...patch };
  const dir = app.getPath('userData');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(configPath(), JSON.stringify(next, null, 2), 'utf-8');
  return next;
}
