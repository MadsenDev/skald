import { useEffect, useState } from 'react';
import { useVaultStore } from '../store/vaultStore';
import { FiLink, FiExternalLink, FiEye, FiCopy } from 'react-icons/fi';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { useContextMenu } from '../hooks/useContextMenu';

interface BacklinksPanelProps {
  noteId: string | null;
  onNoteClick: (path: string) => void;
}

export function BacklinksPanel({ noteId, onNoteClick }: BacklinksPanelProps) {
  const { notes } = useVaultStore();
  const [backlinkIds, setBacklinkIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const [contextMenuNote, setContextMenuNote] = useState<{ id: string; path: string; title: string } | null>(null);

  useEffect(() => {
    if (!noteId) {
      setBacklinkIds([]);
      return;
    }

    const loadBacklinks = async () => {
      setLoading(true);
      try {
        const ids = await window.api.backlinks.get(noteId);
        setBacklinkIds(ids);
      } catch (error) {
        console.error('Failed to load backlinks:', error);
        setBacklinkIds([]);
      } finally {
        setLoading(false);
      }
    };

    loadBacklinks();
  }, [noteId]);

  if (!noteId) {
    return null;
  }

  const backlinkNotes = notes.filter(n => backlinkIds.includes(n.id));

  if (loading) {
    return (
      <div className="border-t border-gray-200 bg-gray-50 p-4">
        <div className="text-sm text-gray-500">Loading backlinks...</div>
      </div>
    );
  }

  if (backlinkNotes.length === 0) {
    return (
      <div className="border-t border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <FiLink className="w-4 h-4" />
          <span>No backlinks</span>
        </div>
      </div>
    );
  }

  const getContextMenuItems = (): ContextMenuItem[] => {
    if (!contextMenuNote) return [];

    return [
      {
        id: 'open',
        label: 'Open',
        icon: <FiExternalLink className="w-4 h-4" />,
        onClick: () => onNoteClick(contextMenuNote.path),
      },
      {
        id: 'peek',
        label: 'Peek',
        icon: <FiEye className="w-4 h-4" />,
        onClick: () => {
          window.dispatchEvent(new CustomEvent('peek-note', { detail: { path: contextMenuNote.path } }));
        },
      },
      { id: 'sep1', label: '', separator: true },
      {
        id: 'copy-path',
        label: 'Copy Path',
        icon: <FiCopy className="w-4 h-4" />,
        onClick: async () => {
          await navigator.clipboard.writeText(contextMenuNote.path);
        },
      },
    ];
  };

  return (
    <div className="border-t border-gray-200 bg-gray-50">
      <ContextMenu
        items={getContextMenuItems()}
        position={contextMenu}
        onClose={() => {
          hideContextMenu();
          setContextMenuNote(null);
        }}
      />
      <div className="px-4 py-2 border-b border-gray-200 flex items-center gap-2">
        <FiLink className="w-4 h-4 text-gray-600" />
        <h3 className="text-sm font-semibold text-gray-900">
          Backlinks ({backlinkNotes.length})
        </h3>
      </div>
      <div className="p-2">
        {backlinkNotes.map((note) => (
          <button
            key={note.id}
            onClick={() => onNoteClick(note.path)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenuNote({ id: note.id, path: note.path, title: note.title });
              showContextMenu(e);
            }}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {note.title}
          </button>
        ))}
      </div>
    </div>
  );
}

