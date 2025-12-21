import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase, getAllSchemas, insertSchema, getSchema, updateSchema, deleteSchema, getLastVaultPath, setLastVaultPath, getKanbanSettings, setKanbanSettings, getAllSettings, getSettings, setSettings, updateSettings, Settings, getBacklinks } from './db/index.js';
import { getAllTasks, getTasksByNote, updateTask, deleteTask, getTask, reorderTasksByStatus } from './db/tasks.js';
import { VaultManager } from './vault/manager.js';
import { defaultSchemas } from './schemas/defaultSchemas.js';
import { serializeZodSchema } from './db/schemas.js';
import { syncTaskToNote } from './tasks/sync.js';
import { getAllDocuments } from './search/indexer.js';
import { parseQuery, searchDocuments } from './search/query.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let vaultManager: VaultManager | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Check if we're in development mode (app.isPackaged is false when running from source)
  if (!app.isPackaged) {
    // Development: load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // Production: load from built files
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  await initializeDatabase();
  await initializeDefaultSchemas();
  createWindow();
  
  // Set up window event listeners after window is created
  if (mainWindow) {
    mainWindow.on('maximize', () => {
      mainWindow?.webContents.send('window-maximized');
    });
    mainWindow.on('unmaximize', () => {
      mainWindow?.webContents.send('window-unmaximized');
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('vault:select', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    vaultManager = new VaultManager(result.filePaths[0]);
    await vaultManager.initialize();
    setLastVaultPath(result.filePaths[0]);
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('vault:getLastPath', () => {
  return getLastVaultPath() || null;
});

ipcMain.handle('vault:openPath', async (_event, path: string) => {
  if (!path) return null;
  vaultManager = new VaultManager(path);
  await vaultManager.initialize();
  setLastVaultPath(path);
  return path;
});
ipcMain.handle('vault:getPath', () => {
  return vaultManager?.getPath() || null;
});

ipcMain.handle('vault:listNotes', async () => {
  if (!vaultManager) return [];
  return await vaultManager.listNotes();
});

ipcMain.handle('vault:readFile', async (_event, path: string) => {
  if (!vaultManager) throw new Error('No vault open');
  return await vaultManager.readFile(path);
});

ipcMain.handle('vault:writeFile', async (_event, path: string, content: string) => {
  if (!vaultManager) throw new Error('No vault open');
  return await vaultManager.writeFile(path, content);
});

ipcMain.handle('vault:createNote', async (_event, path: string) => {
  if (!vaultManager) throw new Error('No vault open');
  return await vaultManager.createNote(path);
});

ipcMain.handle('vault:createFolder', async (_event, folderPath: string) => {
  if (!vaultManager) throw new Error('No vault open');
  return await vaultManager.createFolder(folderPath);
});

ipcMain.handle('vault:listFolders', async () => {
  if (!vaultManager) return [];
  return await vaultManager.listFolders();
});

ipcMain.handle('vault:moveNote', async (_event, oldPath: string, newPath: string) => {
  if (!vaultManager) throw new Error('No vault open');
  return await vaultManager.moveNote(oldPath, newPath);
});

// Refactoring IPC handlers
ipcMain.handle('refactor:renameNote', async (_event, oldPath: string, newName: string) => {
  if (!vaultManager) throw new Error('No vault open');
  const { renameNote } = await import('./vault/refactor.js');
  return await renameNote(vaultManager, oldPath, newName);
});

ipcMain.handle('refactor:moveNote', async (_event, oldPath: string, newPath: string) => {
  if (!vaultManager) throw new Error('No vault open');
  const { moveNoteWithWikilinkUpdate } = await import('./vault/refactor.js');
  return await moveNoteWithWikilinkUpdate(vaultManager, oldPath, newPath);
});

ipcMain.handle('refactor:extractSelection', async (_event, sourcePath: string, selection: string, newNoteName: string, startOffset: number, endOffset: number) => {
  if (!vaultManager) throw new Error('No vault open');
  const { extractSelectionToNote } = await import('./vault/refactor.js');
  return await extractSelectionToNote(vaultManager, sourcePath, selection, newNoteName, startOffset, endOffset);
});

ipcMain.handle('vault:moveFolder', async (_event, oldPath: string, newPath: string) => {
  if (!vaultManager) throw new Error('No vault open');
  return await vaultManager.moveFolder(oldPath, newPath);
});

ipcMain.handle('vault:deleteNote', async (_event, path: string) => {
  if (!vaultManager) throw new Error('No vault open');
  return await vaultManager.deleteNote(path);
});

ipcMain.handle('vault:deleteFolder', async (_event, folderPath: string) => {
  if (!vaultManager) throw new Error('No vault open');
  return await vaultManager.deleteFolder(folderPath);
});

// Schema IPC handlers
ipcMain.handle('schema:list', async () => {
  return await getAllSchemas();
});

ipcMain.handle('schema:get', async (_event, id: string) => {
  return await getSchema(id);
});

ipcMain.handle('schema:create', async (_event, name: string, zodJson: string) => {
  return await insertSchema({ name, zodJson });
});

ipcMain.handle('schema:update', async (_event, id: string, updates: { name?: string; zodJson?: string }) => {
  return await updateSchema(id, updates);
});

ipcMain.handle('schema:delete', async (_event, id: string) => {
  return await deleteSchema(id);
});

// Task IPC handlers
ipcMain.handle('task:list', async (_event, filters?: { status?: string; noteId?: string; assignedTo?: string; labels?: string[] }) => {
  const typedFilters = filters ? {
    ...filters,
    status: filters.status as 'open' | 'in-progress' | 'done' | 'cancelled' | undefined,
  } : undefined;
  return await getAllTasks(typedFilters);
});

ipcMain.handle('task:getByNote', async (_event, noteId: string) => {
  return await getTasksByNote(noteId);
});

ipcMain.handle('task:update', async (_event, id: string, updates: any) => {
  // Get the task to find the note ID and line anchor
  const task = await getTask(id);
  if (!task) {
    throw new Error(`Task ${id} not found`);
  }

  // Update in database
  await updateTask(id, updates);

  // If status or content changed, sync back to note file
  if (updates.status || updates.content) {
    if (vaultManager) {
      await syncTaskToNote(
        task.noteId,
        task.lineAnchor,
        {
          status: updates.status,
          content: updates.content,
        },
        vaultManager
      );
    }
  }
});

ipcMain.handle('task:delete', async (_event, id: string) => {
  return await deleteTask(id);
});

ipcMain.handle('task:reorder', async (_event, status: 'open' | 'in-progress' | 'done' | 'cancelled', orderedIds: string[]) => {
  await reorderTasksByStatus(status, orderedIds);
});
// Search IPC handlers
ipcMain.handle('search:query', async (_event, queryString: string) => {
  const documents = getAllDocuments();
  const parsedQuery = parseQuery(queryString);
  const results = searchDocuments(documents, parsedQuery);
  return results;
});

ipcMain.handle('search:getAll', async () => {
  return getAllDocuments();
});

// Kanban settings
ipcMain.handle('kanban:getSettings', async () => {
  return getKanbanSettings();
});
ipcMain.handle('kanban:setSettings', async (_event, kanban: any) => {
  setKanbanSettings(kanban);
});

// General settings
ipcMain.handle('settings:getAll', async () => {
  return getAllSettings();
});

ipcMain.handle('settings:get', async (_event, key: string) => {
  return getSettings(key);
});

ipcMain.handle('settings:set', async (_event, key: string, value: any) => {
  setSettings(key, value);
});

ipcMain.handle('settings:update', async (_event, updates: Partial<Settings>) => {
  updateSettings(updates);
});

// Window control IPC handlers
ipcMain.handle('window:minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    mainWindow.maximize();
    return true;
  }
  return false;
});

ipcMain.handle('window:unmaximize', () => {
  if (mainWindow) {
    mainWindow.unmaximize();
    return false;
  }
  return false;
});

ipcMain.handle('window:isMaximized', () => {
  if (mainWindow) {
    return mainWindow.isMaximized();
  }
  return false;
});

ipcMain.handle('window:close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// Backlinks IPC handlers
ipcMain.handle('backlinks:get', async (_event, noteId: string) => {
  return await getBacklinks(noteId);
});

// Initialize default schemas if they don't exist
async function initializeDefaultSchemas() {
  const existingSchemas = await getAllSchemas();
  const existingNames = new Set(existingSchemas.map(s => s.name));
  
  for (const schemaDef of Object.values(defaultSchemas)) {
    if (!existingNames.has(schemaDef.name)) {
      const zodJson = serializeZodSchema(schemaDef.schema);
      await insertSchema({
        name: schemaDef.name,
        zodJson,
      });
      console.log(`Initialized default schema: ${schemaDef.name}`);
    }
  }
}

