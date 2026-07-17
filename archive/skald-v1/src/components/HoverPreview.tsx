import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useVaultStore } from '../store/vaultStore';
import { usePinnedPreviewsStore } from '../store/pinnedPreviewsStore';
import { FiExternalLink, FiEye, FiBookmark } from 'react-icons/fi';

interface HoverPreviewProps {
  noteId: string;
  notePath: string;
  noteTitle: string;
  position: { x: number; y: number };
  onOpen: () => void;
  onClose: () => void;
  onMouseEnter?: () => void;
}

export function HoverPreview({ noteId, notePath, noteTitle, position, onOpen, onClose, onMouseEnter }: HoverPreviewProps) {
  const { notes } = useVaultStore();
  const { pinPreview } = usePinnedPreviewsStore();
  const [noteContent, setNoteContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [backlinkCount, setBacklinkCount] = useState<number>(0);
  const [lastEdited, setLastEdited] = useState<Date | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Load note content and metadata
  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      setLoading(true);
      try {
        // Load note content
        const content = await window.api.vault.readFile(notePath);
        if (!cancelled) {
          setNoteContent(content);
        }

        // Load backlinks count
        const backlinks = await window.api.backlinks.get(noteId);
        if (!cancelled) {
          setBacklinkCount(backlinks.length);
        }

        // Get last edited time from notes list
        const note = notes.find(n => n.id === noteId);
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

    // Load immediately (no debounce needed since we already debounce the hover)
    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [noteId, notePath, notes]);

  // Get preview text (first 5 lines, max 200 chars)
  const getPreviewText = (content: string | null): string => {
    if (!content) return '';
    
    // Remove frontmatter if present
    const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, '');
    
    // Get first 5 lines
    const lines = withoutFrontmatter.split('\n').slice(0, 5);
    let preview = lines.join('\n');
    
    // Limit to 200 chars
    if (preview.length > 200) {
      preview = preview.substring(0, 200) + '...';
    }
    
    return preview.trim() || '(Empty note)';
  };

  // Position the preview (avoid going off-screen)
  useEffect(() => {
    if (!previewRef.current) return;

    const preview = previewRef.current;
    const rect = preview.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust position if going off-screen
    let adjustedX = position.x + 10;
    let adjustedY = position.y + 10;

    // Check right edge
    if (adjustedX + rect.width > viewportWidth) {
      adjustedX = position.x - rect.width - 10;
    }

    // Check bottom edge
    if (adjustedY + rect.height > viewportHeight) {
      adjustedY = position.y - rect.height - 10;
    }

    // Check left edge
    if (adjustedX < 0) {
      adjustedX = 10;
    }

    // Check top edge
    if (adjustedY < 0) {
      adjustedY = 10;
    }

    preview.style.left = `${adjustedX}px`;
    preview.style.top = `${adjustedY}px`;
  }, [position]);

  console.log('[HoverPreview] Rendering preview for:', noteTitle, 'at position:', position);

  return (
    <motion.div
      ref={previewRef}
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed z-[9999] w-80 rounded-2xl max-h-96 overflow-hidden theme-glass-panel"
      style={{
        left: `${position.x + 10}px`,
        top: `${position.y + 10}px`,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={() => {
        // Close when mouse leaves the preview
        setTimeout(() => {
          onClose();
        }, 100);
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-app-default bg-app-panel">
        <h3 className="font-semibold text-primary truncate" title={noteTitle}>
          {noteTitle}
        </h3>
        <div className="flex items-center gap-4 mt-1 text-xs text-muted">
          {lastEdited && (
            <span>Edited {lastEdited.toLocaleDateString()}</span>
          )}
          {backlinkCount > 0 && (
            <span>{backlinkCount} backlink{backlinkCount !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto max-h-64">
        {loading ? (
          <div className="text-sm text-muted">Loading...</div>
        ) : noteContent ? (
          <div className="text-sm text-secondary whitespace-pre-wrap font-mono">
            {getPreviewText(noteContent)}
          </div>
        ) : (
          <div className="text-sm text-muted">Failed to load preview</div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-2 border-t border-app-default bg-app-panel flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
            onClose();
          }}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm text-secondary hover-surface rounded transition-colors"
          title="Open note"
        >
          <FiExternalLink className="w-4 h-4" />
          Open
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Dispatch peek event to open note in side panel
            const event = new CustomEvent('peek-note', {
              detail: { path: notePath },
              bubbles: true,
            });
            window.dispatchEvent(event);
            onClose();
          }}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm text-secondary hover-surface rounded transition-colors"
          title="Peek (open in side panel)"
        >
          <FiEye className="w-4 h-4" />
          Peek
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            pinPreview({
              noteId,
              notePath,
              noteTitle,
              position: { x: position.x, y: position.y },
            });
            onClose();
          }}
          className="px-3 py-1.5 text-sm text-secondary hover-surface rounded transition-colors"
          title="Pin preview (keep it open)"
        >
          <FiBookmark className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
