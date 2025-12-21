import { useState } from 'react';
import { FiFileText, FiPlus } from 'react-icons/fi';
import { useVaultStore } from '../store/vaultStore';
import { CreateNoteDialog } from './CreateNoteDialog';
import { FolderTree } from './FolderTree';

interface Note {
  id: string;
  path: string;
  title: string;
  updatedAt: Date;
}

interface NoteListProps {
  notes: Note[];
  selectedNote: string | null;
  onSelectNote: (path: string) => void;
}

export function NoteList({ notes, selectedNote, onSelectNote }: NoteListProps) {
  const { vaultPath } = useVaultStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreateNote = async (name: string) => {
    if (!vaultPath) {
      alert('No vault selected. Please select a vault first.');
      return;
    }

    // Sanitize the name (remove invalid characters for filenames)
    const sanitizedName = name.replace(/[<>:"/\\|?*]/g, '_');

    try {
      const result = await window.api.vault.createNote(sanitizedName);
      onSelectNote(result.path);
      // Reload notes list
      await useVaultStore.getState().loadNotes();
    } catch (error) {
      console.error('Failed to create note:', error);
      alert(`Failed to create note: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <FolderTree
      notes={notes}
      selectedNote={selectedNote}
      onSelectNote={onSelectNote}
    />
  );
}

