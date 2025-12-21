import { getNoteById } from '../db/index.js';
import { updateTaskInContent } from './extractor.js';
import { VaultManager } from '../vault/manager.js';
import { join } from 'path';

/**
 * Sync task status changes back to the note file
 */
export async function syncTaskToNote(
  noteId: string,
  lineAnchor: string,
  updates: { status?: 'open' | 'in-progress' | 'done' | 'cancelled'; content?: string },
  vaultManager: VaultManager
): Promise<void> {
  try {
    const note = await getNoteById(noteId);
    if (!note) {
      throw new Error(`Note ${noteId} not found`);
    }

    // Read current content
    const currentContent = await vaultManager.readFile(note.path);

    // Update task in content
    const updatedContent = updateTaskInContent(currentContent, lineAnchor, updates);

    // Write back to file (this will trigger re-indexing automatically)
    await vaultManager.writeFile(note.path, updatedContent);
  } catch (error) {
    console.error(`Error syncing task to note ${noteId}:`, error);
    throw error;
  }
}

