import { readdir, readFile, writeFile, mkdir, stat, rename, rm } from 'fs/promises';
import { join, dirname, basename, extname } from 'path';
import { watch, FSWatcher } from 'chokidar';
import { randomUUID } from 'crypto';
import {
  getNoteByPath,
  insertNote,
  updateNote,
  getAllNotes,
  deleteNoteByPath,
  updateBacklinks,
  findNoteByTitle,
} from '../db/index.js';
import { extractTasks } from '../tasks/extractor.js';
import { insertTask, deleteTasksByNote, getTasksByNote } from '../db/tasks.js';
import { indexNote as indexNoteForSearch, indexTasks as indexTasksForSearch, removeNoteDocuments } from '../search/indexer.js';
import { extractWikilinks } from '../utils/wikilinks.js';
import * as Y from 'yjs';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const YDOC_CACHE_MAX = 100;

export class VaultManager {
  private vaultPath: string;
  private watcher: FSWatcher | null = null;
  private ydocs: Map<string, Y.Doc> = new Map();

  private setYdoc(ydocId: string, ydoc: Y.Doc): void {
    if (this.ydocs.size >= YDOC_CACHE_MAX) {
      const firstKey = this.ydocs.keys().next().value;
      if (firstKey !== undefined) this.ydocs.delete(firstKey);
    }
    this.ydocs.set(ydocId, ydoc);
  }

  constructor(vaultPath: string) {
    this.vaultPath = vaultPath;
  }

  async initialize() {
    // Ensure vault directory exists
    await mkdir(this.vaultPath, { recursive: true });
    await mkdir(join(this.vaultPath, 'notes'), { recursive: true });
    await mkdir(join(this.vaultPath, '.forgenote'), { recursive: true });

    // Start watching for file changes
    this.watcher = watch(join(this.vaultPath, 'notes'), {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: false,
    });

    this.watcher.on('add', (path) => this.handleFileAdded(path));
    this.watcher.on('change', (path) => this.handleFileChanged(path));
    this.watcher.on('unlink', (path) => this.handleFileRemoved(path));

    // Load existing notes
    await this.scanExistingNotes();
  }

  getPath(): string {
    return this.vaultPath;
  }

  private async scanExistingNotes() {
    const notesDir = join(this.vaultPath, 'notes');
    try {
      const files = await readdir(notesDir, { recursive: true });
      for (const file of files) {
        const fullPath = join(notesDir, file);
        const stats = await stat(fullPath);
        if (stats.isFile() && extname(file) === '.md') {
          await this.indexNote(fullPath);
        }
      }
    } catch (err) {
      // Directory might not exist yet
      console.error('Error scanning notes:', err);
    }
  }

  private async indexNote(filePath: string) {
    // Calculate relative path - ensure it's relative to vault root
    let relativePath = filePath;
    if (filePath.startsWith(this.vaultPath)) {
      relativePath = filePath.slice(this.vaultPath.length);
      // Remove leading slash if present
      if (relativePath.startsWith('/')) {
        relativePath = relativePath.slice(1);
      }
    }
    
    try {
      const content = await readFile(filePath, 'utf-8');
      const title = this.extractTitle(content, basename(filePath, '.md'));
      
      // Check if note already exists
      const existing = await getNoteByPath(relativePath);
      
      if (!existing) {
        const noteId = randomUUID();
        const ydocId = randomUUID();
        
        // Create Yjs document
        const ydoc = new Y.Doc();
        const ytext = ydoc.getText('content');
        ytext.insert(0, content);
        this.setYdoc(ydocId, ydoc);
        
        // Save Yjs doc to disk
        await this.saveYdoc(ydocId, ydoc);
        
        await insertNote({
          id: noteId,
          path: relativePath,
          title,
          ydocId,
          schemaId: null,
        });
        
        // Extract and store tasks
        await this.extractAndStoreTasks(noteId, content);
        
        // Extract and update backlinks
        await this.extractAndUpdateBacklinks(noteId, content);
        
        // Index for search
        indexNoteForSearch(noteId, relativePath, title, content, undefined, undefined, Date.now());
        indexTasksForSearch(noteId, content, relativePath);
      } else {
        // Update existing note
        const ydocId = existing.ydocId;
        let ydoc = this.ydocs.get(ydocId);
        if (!ydoc) {
          ydoc = await this.loadYdoc(ydocId);
          this.setYdoc(ydocId, ydoc);
        }
        
        const ytext = ydoc.getText('content');
        const currentContent = ytext.toString();
        if (currentContent !== content) {
          ytext.delete(0, currentContent.length);
          ytext.insert(0, content);
          await this.saveYdoc(ydocId, ydoc);
        }
        
        await updateNote(existing.id, { title });
        
            // Extract and update tasks
            await this.extractAndStoreTasks(existing.id, content);

            // Extract and update backlinks
            await this.extractAndUpdateBacklinks(existing.id, content);

            // Update search index
            indexNoteForSearch(existing.id, relativePath, title, content, undefined, existing.schemaId ?? undefined, Date.now());
            indexTasksForSearch(existing.id, content, relativePath);
      }
    } catch (err) {
      console.error(`Error indexing note ${filePath}:`, err);
    }
  }

  private async extractAndStoreTasks(noteId: string, content: string) {
    try {
      // Get existing tasks to preserve their IDs if they still exist
      const existingTasks = await getTasksByNote(noteId);
      const existingTasksByLine = new Map<string, typeof existingTasks[0]>();
      for (const task of existingTasks) {
        existingTasksByLine.set(task.lineAnchor, task);
      }
      
      // Extract new tasks
      const extractedTasks = extractTasks(content, noteId);
      
      // Track which line anchors we've processed
      const processedLineAnchors = new Set<string>();
      
      // Update or insert tasks
      for (const task of extractedTasks) {
        // Skip if we've already processed this line anchor (duplicate in extraction)
        if (processedLineAnchors.has(task.lineAnchor)) {
          continue;
        }
        processedLineAnchors.add(task.lineAnchor);
        
        const existingTask = existingTasksByLine.get(task.lineAnchor);
        
        if (existingTask) {
          // Update existing task instead of deleting and re-inserting
          const { updateTask } = await import('../db/tasks.js');
          await updateTask(existingTask.id, {
            content: task.content,
            status: task.status,
            priority: task.priority ?? 0,
            dueDate: task.dueDate ? new Date(task.dueDate).getTime() : null,
            assignedTo: task.assignedTo ?? null,
            labels: task.labels,
          });
        } else {
          // Insert new task
          await insertTask({
            noteId: task.noteId,
            lineAnchor: task.lineAnchor,
            content: task.content,
            status: task.status,
            priority: task.priority ?? 0,
            dueDate: task.dueDate ? new Date(task.dueDate).getTime() : null,
            assignedTo: task.assignedTo ?? null,
            labels: task.labels,
          });
        }
      }
      
      // Delete tasks that no longer exist in the note
      const extractedLineAnchors = new Set(extractedTasks.map(t => t.lineAnchor));
      for (const existingTask of existingTasks) {
        if (!extractedLineAnchors.has(existingTask.lineAnchor)) {
          const { deleteTask } = await import('../db/tasks.js');
          await deleteTask(existingTask.id);
        }
      }
    } catch (err) {
      console.error(`Error extracting tasks for note ${noteId}:`, err);
    }
  }

  private async extractAndUpdateBacklinks(noteId: string, content: string) {
    try {
      // Extract wikilink names from the note's content
      const wikilinkNames = extractWikilinks(content);
      const linkedNoteIds: string[] = [];

      // Resolve each wikilink name to a note ID
      for (const name of wikilinkNames) {
        const linkedNote = await findNoteByTitle(name);
        if (linkedNote) {
          linkedNoteIds.push(linkedNote.id);
        }
      }

      // Update backlinks in the database
      await updateBacklinks(noteId, linkedNoteIds);
    } catch (err) {
      console.error(`Error updating backlinks for note ${noteId}:`, err);
    }
  }

  private extractTitle(content: string, fallback: string): string {
    // Try to extract title from frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const titleMatch = frontmatter.match(/^title:\s*(.+)$/m);
      if (titleMatch) {
        return titleMatch[1].trim().replace(/^["']|["']$/g, '');
      }
    }
    
    // Try first heading
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      return headingMatch[1].trim();
    }
    
    return fallback;
  }

  private async handleFileAdded(path: string) {
    if (path.endsWith('.md')) {
      await this.indexNote(path);
    }
  }

  private async handleFileChanged(path: string) {
    if (path.endsWith('.md')) {
      await this.indexNote(path);
    }
  }

  private async handleFileRemoved(path: string) {
    const relativePath = path.replace(this.vaultPath + '/', '');
    const note = await getNoteByPath(relativePath);
    if (note) {
      await deleteTasksByNote(note.id);
      removeNoteDocuments(note.id);
    }
    await deleteNoteByPath(relativePath);
  }

  async listNotes() {
    const allNotes = await getAllNotes();
    return allNotes.map(note => ({
      id: note.id,
      path: note.path,
      title: note.title,
      updatedAt: new Date(note.updatedAt),
    }));
  }

  private assertWithinVault(fullPath: string): void {
    const normalized = fullPath.replace(/\\/g, '/');
    const vaultNormalized = this.vaultPath.replace(/\\/g, '/');
    if (!normalized.startsWith(vaultNormalized + '/') && normalized !== vaultNormalized) {
      throw new Error(`Path escapes vault: ${fullPath}`);
    }
  }

  async readFile(path: string): Promise<string> {
    const fullPath = join(this.vaultPath, path);
    this.assertWithinVault(fullPath);
    return await readFile(fullPath, 'utf-8');
  }

  async writeFile(path: string, content: string): Promise<void> {
    const fullPath = join(this.vaultPath, path);
    this.assertWithinVault(fullPath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, 'utf-8');

    // Re-index the note to update tasks
    await this.indexNote(fullPath);
  }

  async createNote(path: string) {
    // Ensure the path doesn't already have .md extension
    const cleanPath = path.endsWith('.md') ? path.slice(0, -3) : path;
    const fileName = `${basename(cleanPath)}.md`;
    const folderPath = dirname(cleanPath);

    // Build full path - if folderPath is '.', it's in root notes folder
    const fullPath = folderPath === '.' || folderPath === ''
      ? join(this.vaultPath, 'notes', fileName)
      : join(this.vaultPath, 'notes', folderPath, fileName);

    this.assertWithinVault(fullPath);
    
    // Calculate relative path properly
    const relativePath = folderPath === '.' || folderPath === ''
      ? `notes/${fileName}`
      : `notes/${folderPath}/${fileName}`;
    
    // Create the file if it doesn't exist
    if (!existsSync(fullPath)) {
      const title = basename(cleanPath);
      await writeFile(fullPath, `# ${title}\n\n`, 'utf-8');
    }
    
    // Index the note (this will add it to the database)
    await this.indexNote(fullPath);
    
    // Get the note from database
    const note = await getNoteByPath(relativePath);
    
    if (note) {
      return { id: note.id, path: relativePath };
    }
    
    throw new Error(`Failed to create note: note was created but not found in database at path ${relativePath}`);
  }

  async createFolder(folderPath: string): Promise<void> {
    const cleanPath = folderPath.replace(/[<>:"|?*]/g, '_');
    const fullPath = join(this.vaultPath, 'notes', cleanPath);
    this.assertWithinVault(fullPath);
    await mkdir(fullPath, { recursive: true });
  }

  async listFolders(): Promise<string[]> {
    const notesDir = join(this.vaultPath, 'notes');
    const folderSet = new Set<string>();
    
    // Scan filesystem for all directories
    async function scanDirectory(dirPath: string, relativePath: string = '') {
      try {
        const entries = await readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const folderRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
            folderSet.add(folderRelativePath);
            
            // Recursively scan subdirectories
            await scanDirectory(join(dirPath, entry.name), folderRelativePath);
          }
        }
      } catch (err) {
        // Directory might not exist or be inaccessible
        console.error(`Error scanning directory ${dirPath}:`, err);
      }
    }
    
    await scanDirectory(notesDir);
    
    return Array.from(folderSet).sort();
  }

  async moveNote(oldPath: string, newPath: string): Promise<void> {
    if (oldPath.endsWith('.md') && !newPath.endsWith('.md')) {
      newPath = newPath + '.md';
    }

    const oldFullPath = join(this.vaultPath, oldPath);
    const newFullPath = join(this.vaultPath, newPath);
    this.assertWithinVault(oldFullPath);
    this.assertWithinVault(newFullPath);

    await mkdir(dirname(newFullPath), { recursive: true });
    
    // Move the file
    await rename(oldFullPath, newFullPath);
    
    // Update the note in the database
    const note = await getNoteByPath(oldPath);
    if (note) {
      // Delete old note entry
      await deleteNoteByPath(oldPath);
      
      // Re-index the note at the new path
      await this.indexNote(newFullPath);
    }
  }

  async moveFolder(oldPath: string, newPath: string): Promise<void> {
    const oldFullPath = join(this.vaultPath, 'notes', oldPath);
    const newFullPath = join(this.vaultPath, 'notes', newPath);
    this.assertWithinVault(oldFullPath);
    this.assertWithinVault(newFullPath);

    await mkdir(dirname(newFullPath), { recursive: true });
    
    // Get all notes in the folder BEFORE moving (so we can update their database entries)
    const allNotes = await getAllNotes();
    const notesToUpdate = allNotes.filter(note => 
      note.path.startsWith(`notes/${oldPath}/`) || note.path === `notes/${oldPath}`
    );
    
    // Move the folder (this moves all files inside it automatically)
    await rename(oldFullPath, newFullPath);
    
    // Update database entries for all notes in the moved folder
    for (const note of notesToUpdate) {
      const newNotePath = note.path.replace(`notes/${oldPath}`, `notes/${newPath}`);
      
      // Delete old database entry
      await deleteNoteByPath(note.path);
      
      // Re-index the note at its new path (file is already moved, just need to update DB)
      const newFullNotePath = join(this.vaultPath, newNotePath);
      await this.indexNote(newFullNotePath);
    }
  }

  private async saveYdoc(ydocId: string, ydoc: Y.Doc): Promise<void> {
    const ydocPath = join(this.vaultPath, '.forgenote', `${ydocId}.ydoc`);
    const state = Y.encodeStateAsUpdate(ydoc);
    writeFileSync(ydocPath, Buffer.from(state));
  }

  private async loadYdoc(ydocId: string): Promise<Y.Doc> {
    const ydocPath = join(this.vaultPath, '.forgenote', `${ydocId}.ydoc`);
    const ydoc = new Y.Doc();
    
    if (existsSync(ydocPath)) {
      const state = readFileSync(ydocPath);
      Y.applyUpdate(ydoc, state);
    }
    
    return ydoc;
  }

  async deleteNote(path: string): Promise<void> {
    const fullPath = join(this.vaultPath, path);
    this.assertWithinVault(fullPath);
    const note = await getNoteByPath(path);
    
    if (note) {
      // Delete tasks associated with this note
      await deleteTasksByNote(note.id);
      // Remove from search index
      removeNoteDocuments(note.id);
      // Delete from database
      await deleteNoteByPath(path);
    }
    
    // Delete the file
    try {
      await rm(fullPath);
    } catch (error) {
      // File might already be deleted, that's okay
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async deleteFolder(folderPath: string): Promise<void> {
    const fullPath = join(this.vaultPath, 'notes', folderPath);
    this.assertWithinVault(fullPath);
    
    // Get all notes in this folder and subfolders
    const allNotes = await getAllNotes();
    const notesToDelete = allNotes.filter(note => {
      const notePathWithoutNotes = note.path.replace(/^notes\//, '');
      return notePathWithoutNotes.startsWith(folderPath + '/') || notePathWithoutNotes === folderPath;
    });
    
    // Delete all notes in the folder
    for (const note of notesToDelete) {
      await deleteTasksByNote(note.id);
      removeNoteDocuments(note.id);
      await deleteNoteByPath(note.path);
    }
    
    // Delete the folder and all its contents
    try {
      await rm(fullPath, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  getYdoc(ydocId: string): Y.Doc | null {
    return this.ydocs.get(ydocId) || null;
  }
}
