import { readFile, writeFile } from 'fs/promises';
import { join, dirname, basename, extname } from 'path';
import { getAllNotes, getNoteByPath, findNoteByTitle, updateNote } from '../db/index.js';
import { extractWikilinks, parseWikilink } from '../utils/wikilinks.js';
import { VaultManager } from './manager.js';

/**
 * Replace wikilinks in content that reference oldName with newName
 */
function replaceWikilinks(content: string, oldName: string, newName: string): string {
  const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
  
  return content.replace(wikilinkRegex, (match, linkText) => {
    const parsed = parseWikilink(match);
    // Only replace if the note name matches (case-insensitive)
    if (parsed.noteName.toLowerCase() === oldName.toLowerCase()) {
      // Preserve display text and heading if they exist
      let newLink = `[[${newName}`;
      if (parsed.heading) {
        newLink += `#${parsed.heading}`;
      }
      if (parsed.displayText) {
        newLink += `|${parsed.displayText}`;
      }
      newLink += ']]';
      return newLink;
    }
    return match;
  });
}

/**
 * Rename a note and update all wikilinks that reference it
 */
export async function renameNote(
  vaultManager: VaultManager,
  oldPath: string,
  newName: string
): Promise<void> {
  const vaultPath = vaultManager.getPath();
  const oldNote = await getNoteByPath(oldPath);
  if (!oldNote) {
    throw new Error(`Note not found: ${oldPath}`);
  }

  // Get the old note title (used for wikilink matching)
  const oldTitle = oldNote.title;
  
  // Calculate new path
  const oldDir = dirname(oldPath);
  const newPath = oldDir === '.' 
    ? `${newName}.md`
    : `${oldDir}/${newName}.md`;

  // Check if new path already exists
  const existing = await getNoteByPath(newPath);
  if (existing) {
    throw new Error(`A note already exists at: ${newPath}`);
  }

  // Read all notes to find ones that link to this note
  const allNotes = await getAllNotes();
  const notesToUpdate: Array<{ id: string; path: string; content: string }> = [];

  for (const note of allNotes) {
    if (note.id === oldNote.id) continue; // Skip the note being renamed
    
    // Note paths are relative to vault root, but files are in notes/ subdirectory
    const filePath = note.path.startsWith('notes/') 
      ? join(vaultPath, note.path)
      : join(vaultPath, 'notes', note.path);
    try {
      const content = await readFile(filePath, 'utf-8');
      // Check if this note contains wikilinks to the old note
      const wikilinks = extractWikilinks(content);
      const hasLink = wikilinks.some(link => 
        link.toLowerCase() === oldTitle.toLowerCase()
      );
      
      if (hasLink) {
        notesToUpdate.push({ id: note.id, path: note.path, content });
      }
    } catch (error) {
      console.error(`Error reading note ${note.path}:`, error);
    }
  }

  // Update all notes that link to this one
  for (const noteData of notesToUpdate) {
    const updatedContent = replaceWikilinks(noteData.content, oldTitle, newName);
    if (updatedContent !== noteData.content) {
      const filePath = noteData.path.startsWith('notes/')
        ? join(vaultPath, noteData.path)
        : join(vaultPath, 'notes', noteData.path);
      await writeFile(filePath, updatedContent, 'utf-8');
    }
  }

  // Move the file
  await vaultManager.moveNote(oldPath, newPath);
  
  // Update the note's title in the database
  const newNote = await getNoteByPath(newPath);
  if (newNote) {
    await updateNote(newNote.id, { title: newName });
  }
}

/**
 * Move a note and update all wikilinks that reference it by path
 */
export async function moveNoteWithWikilinkUpdate(
  vaultManager: VaultManager,
  oldPath: string,
  newPath: string
): Promise<void> {
  const oldNote = await getNoteByPath(oldPath);
  if (!oldNote) {
    throw new Error(`Note not found: ${oldPath}`);
  }

  const oldTitle = oldNote.title;
  const newTitle = basename(newPath, '.md');

  // Get all notes to check for wikilinks
  const allNotes = await getAllNotes();
  const notesToUpdate: Array<{ id: string; path: string; content: string }> = [];

  for (const note of allNotes) {
    if (note.id === oldNote.id) continue;
    
    const vaultPath = vaultManager.getPath();
    const filePath = note.path.startsWith('notes/')
      ? join(vaultPath, note.path)
      : join(vaultPath, 'notes', note.path);
    try {
      const content = await readFile(filePath, 'utf-8');
      const wikilinks = extractWikilinks(content);
      const hasLink = wikilinks.some(link => 
        link.toLowerCase() === oldTitle.toLowerCase()
      );
      
      if (hasLink) {
        notesToUpdate.push({ id: note.id, path: note.path, content });
      }
    } catch (error) {
      console.error(`Error reading note ${note.path}:`, error);
    }
  }

  // Update wikilinks in all affected notes
  for (const noteData of notesToUpdate) {
    const updatedContent = replaceWikilinks(noteData.content, oldTitle, newTitle);
    if (updatedContent !== noteData.content) {
      const vaultPath = vaultManager.getPath();
      const filePath = noteData.path.startsWith('notes/')
        ? join(vaultPath, noteData.path)
        : join(vaultPath, 'notes', noteData.path);
      await writeFile(filePath, updatedContent, 'utf-8');
    }
  }

  // Move the note
  await vaultManager.moveNote(oldPath, newPath);
}

/**
 * Extract selected text to a new note and replace with wikilink
 */
export async function extractSelectionToNote(
  vaultManager: VaultManager,
  sourcePath: string,
  selection: string,
  newNoteName: string,
  startOffset: number,
  endOffset: number
): Promise<{ newNotePath: string; updatedSourceContent: string }> {
  const vaultPath = vaultManager.getPath();
  const sourceNote = await getNoteByPath(sourcePath);
  if (!sourceNote) {
    throw new Error(`Source note not found: ${sourcePath}`);
  }

  // Read source note content
  const sourceFilePath = sourcePath.startsWith('notes/')
    ? join(vaultPath, sourcePath)
    : join(vaultPath, 'notes', sourcePath);
  const sourceContent = await readFile(sourceFilePath, 'utf-8');

  // Calculate new note path (same directory as source)
  const sourceDir = dirname(sourcePath);
  const newNotePath = sourceDir === '.'
    ? `${newNoteName}.md`
    : `${sourceDir}/${newNoteName}.md`;

  // Check if note already exists
  const existing = await getNoteByPath(newNotePath);
  if (existing) {
    throw new Error(`A note already exists at: ${newNotePath}`);
  }

  // Create new note with the extracted content
  const newNoteResult = await vaultManager.createNote(newNotePath);
  
  // Write the extracted content to the new note (use vaultManager.writeFile to trigger indexing)
  await vaultManager.writeFile(newNotePath, selection);

  // Replace selection in source with wikilink
  const beforeSelection = sourceContent.substring(0, startOffset);
  const afterSelection = sourceContent.substring(endOffset);
  const wikilink = `[[${newNoteName}]]`;
  const updatedSourceContent = beforeSelection + wikilink + afterSelection;

  // Write updated source content (use vaultManager.writeFile to trigger re-indexing)
  await vaultManager.writeFile(sourcePath, updatedSourceContent);

  return {
    newNotePath,
    updatedSourceContent,
  };
}

