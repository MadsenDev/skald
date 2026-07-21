import type {
  NotePayload,
  NoteHistoryEntry,
  NoteHistoryVersion,
  SchemaName,
  VaultSettings,
  VaultSnapshot,
} from '../src-shared/types';
import type { TaskEdits } from '../src-shared/tasks';

interface Bridge {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  onVaultChanged: (cb: (snapshot: unknown) => void) => () => void;
  onWindowMaximized: (cb: (maximized: boolean) => void) => () => void;
}

declare global {
  interface Window {
    skald: Bridge;
  }
}

const bridge = () => window.skald;

export const api = {
  // vault lifecycle
  getLastVault: () => bridge().invoke('vault:getLast') as Promise<string | null>,
  selectVaultDialog: () => bridge().invoke('vault:selectDialog') as Promise<string | null>,
  openVault: (path: string) => bridge().invoke('vault:open', path) as Promise<VaultSnapshot>,
  createVault: (path: string) => bridge().invoke('vault:create', path) as Promise<VaultSnapshot>,
  snapshot: () => bridge().invoke('vault:snapshot') as Promise<VaultSnapshot>,
  revealInFolder: (sub?: string) => bridge().invoke('vault:revealInFolder', sub) as Promise<void>,

  // notes
  readNote: (path: string) => bridge().invoke('note:read', path) as Promise<NotePayload>,
  writeNote: (path: string, content: string) =>
    bridge().invoke('note:write', path, content) as Promise<void>,
  createNote: (folder: string, title: string, schema: SchemaName) =>
    bridge().invoke('note:create', folder, title, schema) as Promise<string>,
  createDailyNote: () => bridge().invoke('note:createDaily') as Promise<string>,
  renameNote: (path: string, newTitle: string) =>
    bridge().invoke('note:rename', path, newTitle) as Promise<string>,
  deleteNote: (path: string) => bridge().invoke('note:delete', path) as Promise<void>,
  listNoteHistory: (path: string) =>
    bridge().invoke('note:history:list', path) as Promise<NoteHistoryEntry[]>,
  readNoteHistoryVersion: (path: string, id: string) =>
    bridge().invoke('note:history:read', path, id) as Promise<NoteHistoryVersion>,
  restoreNoteHistoryVersion: (path: string, id: string) =>
    bridge().invoke('note:history:restore', path, id) as Promise<void>,
  createFolder: (path: string) => bridge().invoke('folder:create', path) as Promise<void>,

  // tasks
  updateTask: (id: string, edits: TaskEdits) =>
    bridge().invoke('task:update', id, edits) as Promise<void>,
  addTask: (
    notePath: string,
    content: string,
    opts?: { due?: string | null; priority?: 'low' | 'med' | 'high' }
  ) => bridge().invoke('task:add', notePath, content, opts) as Promise<void>,

  // settings / graph
  setSettings: (patch: Partial<VaultSettings>) =>
    bridge().invoke('settings:set', patch) as Promise<VaultSettings>,
  setGraphPosition: (path: string, x: number, y: number) =>
    bridge().invoke('graph:setPosition', path, x, y) as Promise<void>,
  resetGraphLayout: () => bridge().invoke('graph:resetLayout') as Promise<void>,

  // window
  minimize: () => bridge().invoke('window:minimize') as Promise<void>,
  toggleMaximize: () => bridge().invoke('window:toggleMaximize') as Promise<boolean>,
  closeWindow: () => bridge().invoke('window:close') as Promise<void>,

  onVaultChanged: (cb: (s: VaultSnapshot) => void) =>
    bridge().onVaultChanged(cb as (s: unknown) => void),
};
