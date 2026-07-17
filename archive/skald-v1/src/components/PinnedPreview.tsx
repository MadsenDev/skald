import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useVaultStore } from '../store/vaultStore';
import { usePinnedPreviewsStore, PinnedPreview } from '../store/pinnedPreviewsStore';
import { FiExternalLink, FiEye, FiX } from 'react-icons/fi';

interface PinnedPreviewProps {
  preview: PinnedPreview;
}

export function PinnedPreviewComponent({ preview }: PinnedPreviewProps) {
  const { notes } = useVaultStore();
  const { unpinPreview, updatePreviewPosition } = usePinnedPreviewsStore();
  const [noteContent, setNoteContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [backlinkCount, setBacklinkCount] = useState<number>(0);
  const [lastEdited, setLastEdited] = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

  // Load note content and metadata
  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      setLoading(true);
      try {
        const content = await window.api.vault.readFile(preview.notePath);
        if (!cancelled) {
          setNoteContent(content);
        }

        const backlinks = await window.api.backlinks.get(preview.noteId);
        if (!cancelled) {
          setBacklinkCount(backlinks.length);
        }

        const note = notes.find((n) => n.id === preview.noteId);
        if (note && !cancelled) {
          setLastEdited(new Date(note.updatedAt));
        }
      } catch (error) {
        console.error('Failed to load preview:', error);
        if (!cancelled) {
          setNoteContent(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [preview.noteId, preview.notePath, notes]);

  // Get preview text (first 5 lines, max 200 chars)
  const getPreviewText = (content: string | null): string => {
    if (!content) return '';

    const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, '');
    const lines = withoutFrontmatter.split('\n').slice(0, 5);
    let preview = lines.join('\n');

    if (preview.length > 200) {
      preview = preview.substring(0, 200) + '...';
    }

    return preview.trim() || '(Empty note)';
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement) {
      // Don't start drag if clicking on buttons or links
      if (
        e.target.closest('button') ||
        e.target.closest('a') ||
        e.target.closest('input') ||
        e.target.closest('textarea')
      ) {
        return;
      }
    }

    e.preventDefault(); // Prevent text selection
    setIsDragging(true);
    // Disable text selection globally while dragging
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    const rect = previewRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault(); // Prevent text selection
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Constrain to viewport
      const constrainedX = Math.max(0, Math.min(newX, window.innerWidth - 320));
      const constrainedY = Math.max(0, Math.min(newY, window.innerHeight - 100));

      updatePreviewPosition(preview.id, {
        x: constrainedX,
        y: constrainedY,
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      setIsDragging(false);
      // Re-enable text selection after drag
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, preview.id, updatePreviewPosition]);

  const handleOpen = () => {
    const event = new CustomEvent('navigate-to-note', {
      detail: { path: preview.notePath },
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  const handlePeek = () => {
    const event = new CustomEvent('peek-note', {
      detail: { path: preview.notePath },
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  return (
    <motion.div
      ref={previewRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="fixed z-[9998] w-80 bg-white border-2 border-gray-300 rounded-lg shadow-2xl max-h-96 overflow-hidden select-none"
      style={{
        left: `${preview.position.x}px`,
        top: `${preview.position.y}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header - draggable area */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate" title={preview.noteTitle}>
            {preview.noteTitle}
          </h3>
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
            {lastEdited && <span>Edited {lastEdited.toLocaleDateString()}</span>}
            {backlinkCount > 0 && (
              <span>
                {backlinkCount} backlink{backlinkCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            unpinPreview(preview.id);
          }}
          className="ml-2 p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
          title="Unpin"
        >
          <FiX className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto max-h-64">
        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : noteContent ? (
          <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
            {getPreviewText(noteContent)}
          </div>
        ) : (
          <div className="text-sm text-gray-500">Failed to load preview</div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpen();
          }}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
          title="Open note"
        >
          <FiExternalLink className="w-4 h-4" />
          Open
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePeek();
          }}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
          title="Peek (open in side panel)"
        >
          <FiEye className="w-4 h-4" />
          Peek
        </button>
      </div>
    </motion.div>
  );
}

