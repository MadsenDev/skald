import { contextBridge, ipcRenderer } from 'electron';

// Type-safe IPC channels
type Channels = {
  'vault:select': () => Promise<string | null>;
  'vault:getPath': () => Promise<string | null>;
  'vault:getLastPath': () => Promise<string | null>;
  'vault:openPath': (path: string) => Promise<string | null>;
  'vault:listNotes': () => Promise<Array<{ id: string; path: string; title: string; updatedAt: Date }>>;
  'vault:readFile': (path: string) => Promise<string>;
  'vault:writeFile': (path: string, content: string) => Promise<void>;
  'vault:createNote': (path: string) => Promise<{ id: string; path: string }>;
  'vault:createFolder': (folderPath: string) => Promise<void>;
  'vault:listFolders': () => Promise<string[]>;
  'vault:moveNote': (oldPath: string, newPath: string) => Promise<void>;
  'vault:moveFolder': (oldPath: string, newPath: string) => Promise<void>;
  'vault:deleteNote': (path: string) => Promise<void>;
  'vault:deleteFolder': (folderPath: string) => Promise<void>;
  'refactor:renameNote': (oldPath: string, newName: string) => Promise<void>;
  'refactor:moveNote': (oldPath: string, newPath: string) => Promise<void>;
  'refactor:extractSelection': (sourcePath: string, selection: string, newNoteName: string, startOffset: number, endOffset: number) => Promise<{ newNotePath: string; updatedSourceContent: string }>;
  'schema:list': () => Promise<Array<{ id: string; name: string; zodJson: string; createdAt: number; updatedAt: number }>>;
  'schema:get': (id: string) => Promise<{ id: string; name: string; zodJson: string; createdAt: number; updatedAt: number } | null>;
  'schema:create': (name: string, zodJson: string) => Promise<string>;
  'schema:update': (id: string, updates: { name?: string; zodJson?: string }) => Promise<void>;
  'schema:delete': (id: string) => Promise<void>;
  'task:list': (filters?: { status?: string; noteId?: string; assignedTo?: string; labels?: string[] }) => Promise<Array<any>>;
  'task:getByNote': (noteId: string) => Promise<Array<any>>;
  'task:update': (id: string, updates: any) => Promise<void>;
  'task:delete': (id: string) => Promise<void>;
  'search:query': (query: string) => Promise<Array<any>>;
  'search:getAll': () => Promise<Array<any>>;
  'task:reorder': (status: 'open' | 'in-progress' | 'done' | 'cancelled', orderedIds: string[]) => Promise<void>;
  'kanban:getSettings': () => Promise<any>;
  'kanban:setSettings': (kanban: any) => Promise<void>;
  'settings:getAll': () => Promise<any>;
  'settings:get': (key: string) => Promise<any>;
  'settings:set': (key: string, value: any) => Promise<void>;
  'settings:update': (updates: any) => Promise<void>;
  'window:minimize': () => Promise<void>;
  'window:maximize': () => Promise<boolean>;
  'window:unmaximize': () => Promise<boolean>;
  'window:isMaximized': () => Promise<boolean>;
  'window:close': () => Promise<void>;
  'backlinks:get': (noteId: string) => Promise<string[]>;
};

// Helper to create typed IPC handlers
function createIpcHandler<K extends keyof Channels>(
  channel: K
): Channels[K] extends (args: infer Args) => Promise<infer Ret>
  ? Args extends any[]
    ? (...args: Args) => Promise<Ret>
    : () => Promise<Ret>
  : () => Promise<ReturnType<Channels[K]>> {
  return ((...args: any[]) => {
    return ipcRenderer.invoke(channel, ...args);
  }) as any;
}

contextBridge.exposeInMainWorld('api', {
  vault: {
    select: createIpcHandler('vault:select'),
    getPath: createIpcHandler('vault:getPath'),
    getLastPath: createIpcHandler('vault:getLastPath'),
    openPath: createIpcHandler('vault:openPath'),
    listNotes: createIpcHandler('vault:listNotes'),
    readFile: createIpcHandler('vault:readFile'),
    writeFile: createIpcHandler('vault:writeFile'),
    createNote: createIpcHandler('vault:createNote'),
    createFolder: createIpcHandler('vault:createFolder'),
    listFolders: createIpcHandler('vault:listFolders'),
    moveNote: createIpcHandler('vault:moveNote'),
    moveFolder: createIpcHandler('vault:moveFolder'),
    deleteNote: createIpcHandler('vault:deleteNote'),
    deleteFolder: createIpcHandler('vault:deleteFolder'),
  },
  refactor: {
    renameNote: createIpcHandler('refactor:renameNote'),
    moveNote: createIpcHandler('refactor:moveNote'),
    extractSelection: createIpcHandler('refactor:extractSelection'),
  },
  schema: {
    list: createIpcHandler('schema:list'),
    get: createIpcHandler('schema:get'),
    create: createIpcHandler('schema:create'),
    update: createIpcHandler('schema:update'),
    delete: createIpcHandler('schema:delete'),
  },
  task: {
    list: createIpcHandler('task:list'),
    getByNote: createIpcHandler('task:getByNote'),
    update: createIpcHandler('task:update'),
    delete: createIpcHandler('task:delete'),
    reorder: createIpcHandler('task:reorder'),
  },
  search: {
    query: createIpcHandler('search:query'),
    getAll: createIpcHandler('search:getAll'),
  },
  kanban: {
    getSettings: createIpcHandler('kanban:getSettings'),
    setSettings: createIpcHandler('kanban:setSettings'),
  },
  settings: {
    getAll: createIpcHandler('settings:getAll'),
    get: createIpcHandler('settings:get'),
    set: createIpcHandler('settings:set'),
    update: createIpcHandler('settings:update'),
  },
  window: {
    minimize: createIpcHandler('window:minimize'),
    maximize: createIpcHandler('window:maximize'),
    unmaximize: createIpcHandler('window:unmaximize'),
    isMaximized: createIpcHandler('window:isMaximized'),
    close: createIpcHandler('window:close'),
  },
  backlinks: {
    get: createIpcHandler('backlinks:get'),
  },
} satisfies Record<string, any>);

// Listen for window maximize/unmaximize events
ipcRenderer.on('window-maximized', () => {
  window.dispatchEvent(new Event('maximize'));
});

ipcRenderer.on('window-unmaximized', () => {
  window.dispatchEvent(new Event('unmaximize'));
});

// Type declaration for window.api
declare global {
  interface Window {
    api: {
      vault: {
        select: () => Promise<string | null>;
        getPath: () => Promise<string | null>;
        getLastPath: () => Promise<string | null>;
        openPath: (path: string) => Promise<string | null>;
        listNotes: () => Promise<Array<{ id: string; path: string; title: string; updatedAt: Date }>>;
        readFile: (path: string) => Promise<string>;
        writeFile: (path: string, content: string) => Promise<void>;
        createNote: (path: string) => Promise<{ id: string; path: string }>;
        createFolder: (folderPath: string) => Promise<void>;
        listFolders: () => Promise<string[]>;
        moveNote: (oldPath: string, newPath: string) => Promise<void>;
        moveFolder: (oldPath: string, newPath: string) => Promise<void>;
        deleteNote: (path: string) => Promise<void>;
        deleteFolder: (folderPath: string) => Promise<void>;
      };
      schema: {
        list: () => Promise<Array<{ id: string; name: string; zodJson: string; createdAt: number; updatedAt: number }>>;
        get: (id: string) => Promise<{ id: string; name: string; zodJson: string; createdAt: number; updatedAt: number } | null>;
        create: (name: string, zodJson: string) => Promise<string>;
        update: (id: string, updates: { name?: string; zodJson?: string }) => Promise<void>;
        delete: (id: string) => Promise<void>;
      };
      task: {
        list: (filters?: { status?: string; noteId?: string; assignedTo?: string; labels?: string[] }) => Promise<Array<any>>;
        getByNote: (noteId: string) => Promise<Array<any>>;
        update: (id: string, updates: any) => Promise<void>;
        delete: (id: string) => Promise<void>;
        reorder: (status: 'open' | 'in-progress' | 'done' | 'cancelled', orderedIds: string[]) => Promise<void>;
      };
      search: {
        query: (query: string) => Promise<Array<any>>;
        getAll: () => Promise<Array<any>>;
      };
      kanban: {
        getSettings: () => Promise<any>;
        setSettings: (kanban: any) => Promise<void>;
      };
      settings: {
        getAll: () => Promise<any>;
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<void>;
        update: (updates: any) => Promise<void>;
      };
      window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<boolean>;
        unmaximize: () => Promise<boolean>;
        isMaximized: () => Promise<boolean>;
        close: () => Promise<void>;
      };
      backlinks: {
        get: (noteId: string) => Promise<string[]>;
      };
      refactor: {
        renameNote: (oldPath: string, newName: string) => Promise<void>;
        moveNote: (oldPath: string, newPath: string) => Promise<void>;
        extractSelection: (sourcePath: string, selection: string, newNoteName: string, startOffset: number, endOffset: number) => Promise<{ newNotePath: string; updatedSourceContent: string }>;
      };
    };
  }
}

