import { app } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

export interface Note {
  id: string;
  path: string;
  title: string;
  ydocId: string;
  schemaId: string | null;
  updatedAt: number;
  createdAt: number;
}

export interface Settings {
  lastVaultPath?: string;
  recentVaults?: string[];
  kanban?: {
    wipLimits?: {
      open?: number;
      'in-progress'?: number;
      done?: number;
      cancelled?: number;
    };
    groupBy?: 'assignee' | 'label' | 'none';
  };
  editor?: {
    fontSize?: number;
    fontFamily?: string;
    wordWrap?: boolean;
    lineNumbers?: boolean;
    minimap?: boolean;
  };
  appearance?: {
    theme?: string;
    activeThemeId?: string;
    reducedMotion?: boolean;
    customThemes?: any[];
    themeStudioDraft?: any | null;
  };
  preview?: {
    codeBlockTheme?: string; // highlight.js theme (e.g., 'github', 'github-dark', 'monokai', etc.)
    codeBlockLineNumbers?: boolean;
    codeBlockFontSize?: number;
    codeBlockFontFamily?: string;
  };
  calendar?: {
    firstDayOfWeek?: number; // 0 = Sunday, 1 = Monday, etc.
  };
  // Extensible for future settings
  [key: string]: any;
}

interface Database {
  notes: Map<string, Note>;
  schemas: Map<string, any>;
  tasks: Map<string, any>;
  backlinks: Map<string, string[]>;
  settings: Settings;
}

let db: Database | null = null;
let dbPath: string;

function getDbPath(): string {
  if (!dbPath) {
    const userDataPath = app.getPath('userData');
    const dbDir = join(userDataPath, 'forgenote');
    mkdirSync(dbDir, { recursive: true });
    dbPath = join(dbDir, 'database.json');
  }
  return dbPath;
}

function loadDatabase(): Database {
  const path = getDbPath();
  
  if (existsSync(path)) {
    try {
      const data = readFileSync(path, 'utf-8');
      const json = JSON.parse(data);
      return {
        notes: new Map(json.notes || []),
        schemas: new Map(json.schemas || []),
        tasks: new Map(json.tasks || []),
        backlinks: new Map(json.backlinks || []),
        settings: json.settings || {},
      };
    } catch (err) {
      console.error('Error loading database:', err);
      // Return empty database on error
    }
  }
  
  return {
    notes: new Map(),
    schemas: new Map(),
    tasks: new Map(),
    backlinks: new Map(),
    settings: {},
  };
}

export function saveDatabase() {
  if (!db) return;
  
  const path = getDbPath();
  const data = {
    notes: Array.from(db.notes.entries()),
    schemas: Array.from(db.schemas.entries()),
    tasks: Array.from(db.tasks.entries()),
    backlinks: Array.from(db.backlinks.entries()),
    settings: db.settings,
  };
  
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
}

export async function initializeDatabase() {
  db = loadDatabase();
  return db;
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export function saveDatabaseToDisk() {
  saveDatabase();
}

// Helper functions for common operations
export async function insertNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string> {
  const database = getDatabase();
  const id = note.id || crypto.randomUUID();
  const now = Date.now();
  
  const noteRecord: Note = {
    id,
    path: note.path,
    title: note.title,
    ydocId: note.ydocId,
    schemaId: note.schemaId || null,
    updatedAt: now,
    createdAt: now,
  };
  
  database.notes.set(id, noteRecord);
  saveDatabase();
  return id;
}

export async function updateNote(id: string, updates: Partial<Pick<Note, 'title' | 'schemaId'>>) {
  const database = getDatabase();
  const note = database.notes.get(id);
  
  if (!note) {
    throw new Error(`Note ${id} not found`);
  }
  
  const updated: Note = {
    ...note,
    ...updates,
    updatedAt: Date.now(),
  };
  
  database.notes.set(id, updated);
  saveDatabase();
}

export async function getNoteByPath(path: string): Promise<Note | null> {
  const database = getDatabase();
  
  for (const note of database.notes.values()) {
    if (note.path === path) {
      return note;
    }
  }
  
  return null;
}

export async function getNoteById(id: string): Promise<Note | null> {
  const database = getDatabase();
  return database.notes.get(id) || null;
}

export async function getAllNotes(): Promise<Note[]> {
  const database = getDatabase();
  return Array.from(database.notes.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteNoteByPath(path: string) {
  const database = getDatabase();
  const note = Array.from(database.notes.values()).find(n => n.path === path);
  if (note) {
    // Remove backlinks pointing to this note
    database.backlinks.delete(note.id);
    // Remove this note from other notes' backlinks
    for (const [noteId, backlinkIds] of database.backlinks.entries()) {
      const filtered = backlinkIds.filter(id => id !== note.id);
      if (filtered.length !== backlinkIds.length) {
        database.backlinks.set(noteId, filtered);
      }
    }
  }
  // Delete by finding the note with matching path
  for (const [id, note] of database.notes.entries()) {
    if (note.path === path) {
      database.notes.delete(id);
      break;
    }
  }
  
  saveDatabase();
}

/**
 * Get backlinks for a note (notes that link to this note)
 */
export async function getBacklinks(noteId: string): Promise<string[]> {
  const database = getDatabase();
  return database.backlinks.get(noteId) || [];
}

/**
 * Update backlinks for a note
 */
export async function updateBacklinks(noteId: string, linkedNoteIds: string[]): Promise<void> {
  const database = getDatabase();
  
  // Remove old backlinks - find all notes that previously linked to this note
  for (const [targetNoteId, backlinkIds] of database.backlinks.entries()) {
    const filtered = backlinkIds.filter(id => id !== noteId);
    if (filtered.length !== backlinkIds.length) {
      database.backlinks.set(targetNoteId, filtered);
    }
  }
  
  // Add new backlinks - for each note this note links to, add this note as a backlink
  for (const linkedNoteId of linkedNoteIds) {
    if (linkedNoteId === noteId) continue; // Don't self-link
    const existing = database.backlinks.get(linkedNoteId) || [];
    if (!existing.includes(noteId)) {
      database.backlinks.set(linkedNoteId, [...existing, noteId]);
    }
  }
  
  saveDatabase();
}

/**
 * Find a note by title (for wikilink resolution)
 * Returns the first exact match, or null if no match found
 * Note: If multiple notes have the same title, returns the first one found (non-deterministic)
 */
export async function findNoteByTitle(title: string): Promise<Note | null> {
  const database = getDatabase();
  const titleLower = title.toLowerCase();
  
  // Collect all exact matches first
  const exactMatches: Note[] = [];
  for (const note of database.notes.values()) {
    if (note.title.toLowerCase() === titleLower) {
      exactMatches.push(note);
    }
  }
  
  // If we have exact matches, return the first one
  if (exactMatches.length > 0) {
    if (exactMatches.length > 1) {
      console.warn(`Multiple notes found with title "${title}". Using: ${exactMatches[0].path}`);
    }
    return exactMatches[0];
  }
  
  // Try partial match (filename without extension)
  for (const note of database.notes.values()) {
    const pathParts = note.path.split('/');
    const fileName = pathParts[pathParts.length - 1].replace(/\.md$/, '').toLowerCase();
    if (fileName === titleLower) {
      return note;
    }
  }
  
  return null;
}

// Re-export schema functions
export * from './schemas.js';
// Re-export task functions
export * from './tasks.js';

// Settings helpers
export function getLastVaultPath(): string | undefined {
  const database = getDatabase();
  return database.settings.lastVaultPath;
}

export function setLastVaultPath(path: string): void {
  const database = getDatabase();
  database.settings.lastVaultPath = path;
  // maintain simple recent list with de-dup and cap
  const recent = database.settings.recentVaults || [];
  const without = recent.filter(p => p !== path);
  database.settings.recentVaults = [path, ...without].slice(0, 5);
  saveDatabase();
}

export function getRecentVaults(): string[] {
  const database = getDatabase();
  return database.settings.recentVaults || [];
}

export function getKanbanSettings(): Settings['kanban'] {
  const database = getDatabase();
  return database.settings.kanban || {};
}

export function setKanbanSettings(kanban: Settings['kanban']): void {
  const database = getDatabase();
  database.settings.kanban = {
    ...(database.settings.kanban || {}),
    ...(kanban || {}),
  };
  saveDatabase();
}

const PROTO_BANNED = new Set(['__proto__', 'constructor', 'prototype']);

// Generic settings functions
export function getAllSettings(): Settings {
  const database = getDatabase();
  return { ...database.settings };
}

export function getSettings<T = any>(key: string): T | undefined {
  const database = getDatabase();
  const keys = key.split('.');

  if (keys.some(k => PROTO_BANNED.has(k))) {
    return undefined;
  }

  let value: any = database.settings;
  for (const k of keys) {
    if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, k)) {
      value = value[k];
    } else {
      return undefined;
    }
  }
  return value as T;
}

export function setSettings(key: string, value: any): void {
  const database = getDatabase();
  const keys = key.split('.');

  if (keys.some(k => PROTO_BANNED.has(k))) {
    throw new Error(`Illegal settings key: ${key}`);
  }

  let current: any = database.settings;

  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!(k in current) || typeof current[k] !== 'object' || current[k] === null) {
      current[k] = {};
    }
    current = current[k];
  }

  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;
  saveDatabase();
}

export function updateSettings(updates: Partial<Settings>): void {
  const database = getDatabase();
  database.settings = {
    ...database.settings,
    ...updates,
  };
  saveDatabase();
}
