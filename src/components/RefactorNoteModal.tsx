import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiEdit3, FiFolder, FiScissors, FiAlertCircle } from 'react-icons/fi';
import { useVaultStore } from '../store/vaultStore';

interface RefactorNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  notePath: string;
  noteTitle: string;
  onRename?: (newPath: string) => void;
  onMove?: (newPath: string) => void;
  onExtract?: (newNotePath: string) => void;
  selection?: { text: string; startOffset: number; endOffset: number } | null;
  mode?: 'rename' | 'move' | 'extract'; // Optional initial mode
}

type RefactorMode = 'rename' | 'move' | 'extract' | null;

export function RefactorNoteModal({
  isOpen,
  onClose,
  notePath,
  noteTitle,
  onRename,
  onMove,
  onExtract,
  selection,
  mode: initialMode,
}: RefactorNoteModalProps) {
  const [mode, setMode] = useState<RefactorMode>(null);
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');
  const [targetFolder, setTargetFolder] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { notes, loadNotes } = useVaultStore();
  const [folders, setFolders] = useState<string[]>([]);
  const initializedRef = useRef<string | null>(null); // Track which mode we've initialized

  useEffect(() => {
    if (isOpen) {
      // Reset initialization tracking when modal opens
      initializedRef.current = null;
      
      // If initialMode prop is provided, set it directly (for context menu)
      if (initialMode) {
        setMode(initialMode);
        // Set initial values based on mode
        if (initialMode === 'rename') {
          const currentName = notePath.split('/').pop()?.replace('.md', '') || noteTitle;
          setNewName(currentName);
          setNewPath('');
          initializedRef.current = 'rename';
        } else if (initialMode === 'move') {
          setNewPath(notePath);
          const pathParts = notePath.split('/');
          const fileName = pathParts.pop() || '';
          const currentFolder = pathParts.join('/') || '';
          setTargetFolder(currentFolder);
          setNewName('');
          initializedRef.current = 'move';
        } else if (initialMode === 'extract') {
          setNewName('');
          setNewPath('');
          initializedRef.current = 'extract';
        }
      } else {
        setMode(null);
        setNewName('');
        setNewPath('');
        setTargetFolder('');
      }
      setError(null);
      // Load folders
      window.api.vault.listFolders().then(setFolders);
    } else {
      // Reset everything when modal closes
      setMode(null);
      setNewName('');
      setNewPath('');
      setTargetFolder('');
      setError(null);
      initializedRef.current = null;
    }
  }, [isOpen, initialMode, notePath, noteTitle]);

  useEffect(() => {
    // Only set initial values when mode changes (not from initialMode), and only once per mode
    if (mode && initializedRef.current !== mode) {
      if (mode === 'rename') {
        // Extract current name from path
        const currentName = notePath.split('/').pop()?.replace('.md', '') || noteTitle;
        setNewName(currentName);
        initializedRef.current = 'rename';
      } else if (mode === 'move') {
        // Extract current folder and name
        const pathParts = notePath.split('/');
        const fileName = pathParts.pop() || '';
        const currentFolder = pathParts.join('/') || '';
        setTargetFolder(currentFolder);
        setNewPath(notePath);
        initializedRef.current = 'move';
      } else if (mode === 'extract') {
        setNewName('');
        initializedRef.current = 'extract';
      }
    }
  }, [mode, notePath, noteTitle]); // Only run when mode changes

  const handleRename = async () => {
    if (!newName.trim()) {
      setError('Note name cannot be empty');
      return;
    }

    // Sanitize name
    const sanitizedName = newName.trim().replace(/[<>:"/\\|?*]/g, '_');
    if (sanitizedName !== newName.trim()) {
      setError('Note name contains invalid characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await window.api.refactor.renameNote(notePath, sanitizedName);
      await loadNotes();
      
      // Calculate new path
      const pathParts = notePath.split('/');
      pathParts.pop();
      const newPath = pathParts.length > 0 
        ? `${pathParts.join('/')}/${sanitizedName}.md`
        : `${sanitizedName}.md`;
      
      if (onRename) {
        onRename(newPath);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename note');
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async () => {
    if (!newPath.trim()) {
      setError('Path cannot be empty');
      return;
    }

    // Ensure .md extension
    let finalPath = newPath.trim();
    if (!finalPath.endsWith('.md')) {
      finalPath += '.md';
    }

    setLoading(true);
    setError(null);

    try {
      await window.api.refactor.moveNote(notePath, finalPath);
      
      await loadNotes();
      
      if (onMove) {
        onMove(finalPath);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move note');
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = async () => {
    if (!selection) {
      setError('No selection provided');
      return;
    }

    if (!newName.trim()) {
      setError('Note name cannot be empty');
      return;
    }

    // Sanitize name
    const sanitizedName = newName.trim().replace(/[<>:"/\\|?*]/g, '_');
    if (sanitizedName !== newName.trim()) {
      setError('Note name contains invalid characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await window.api.refactor.extractSelection(
        notePath,
        selection.text,
        sanitizedName,
        selection.startOffset,
        selection.endOffset
      );
      
      await loadNotes();
      
      if (onExtract) {
        onExtract(result.newNotePath);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract selection');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={onClose}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'var(--theme-bg-primary)',
            borderRadius: '0.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--theme-border-primary)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              Refactor Note
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-opacity-20 transition-colors"
              style={{ color: 'var(--theme-text-secondary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {!mode ? (
              // Mode selection
              <div className="space-y-3">
                <p className="text-sm mb-4" style={{ color: 'var(--theme-text-secondary)' }}>
                  Current note: <span className="font-medium" style={{ color: 'var(--theme-text-primary)' }}>{notePath}</span>
                </p>
                
                <button
                  onClick={() => setMode('rename')}
                  className="w-full p-4 rounded-lg text-left transition-colors flex items-center gap-3"
                  style={{
                    backgroundColor: 'var(--theme-bg-secondary)',
                    border: '1px solid var(--theme-border-primary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--theme-bg-secondary)';
                  }}
                >
                  <div className="p-2 rounded" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-accent) 20%, var(--theme-bg-primary))' }}>
                    <FiEdit3 size={20} style={{ color: 'var(--theme-accent)' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-1" style={{ color: 'var(--theme-text-primary)' }}>Rename Note</h3>
                    <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>Change the note name and update all wikilinks</p>
                  </div>
                </button>

                <button
                  onClick={() => setMode('move')}
                  className="w-full p-4 rounded-lg text-left transition-colors flex items-center gap-3"
                  style={{
                    backgroundColor: 'var(--theme-bg-secondary)',
                    border: '1px solid var(--theme-border-primary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--theme-bg-secondary)';
                  }}
                >
                  <div className="p-2 rounded" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-accent) 20%, var(--theme-bg-primary))' }}>
                    <FiFolder size={20} style={{ color: 'var(--theme-accent)' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-1" style={{ color: 'var(--theme-text-primary)' }}>Move Note</h3>
                    <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>Move to a different folder and update wikilinks</p>
                  </div>
                </button>

                {selection && (
                  <button
                    onClick={() => setMode('extract')}
                    className="w-full p-4 rounded-lg text-left transition-colors flex items-center gap-3"
                    style={{
                      backgroundColor: 'var(--theme-bg-secondary)',
                      border: '1px solid var(--theme-border-primary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--theme-bg-secondary)';
                    }}
                  >
                    <div className="p-2 rounded" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-accent) 20%, var(--theme-bg-primary))' }}>
                      <FiScissors size={20} style={{ color: 'var(--theme-accent)' }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium mb-1" style={{ color: 'var(--theme-text-primary)' }}>Extract Selection</h3>
                      <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>Create a new note from selected text</p>
                    </div>
                  </button>
                )}
              </div>
            ) : (
              // Form for selected mode
              <div className="space-y-4">
                <button
                  onClick={() => setMode(null)}
                  className="text-sm flex items-center gap-1"
                  style={{ color: 'var(--theme-text-secondary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--theme-text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--theme-text-secondary)';
                  }}
                >
                  ← Back
                </button>

                {mode === 'rename' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text-primary)' }}>
                        New Note Name
                      </label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename();
                          if (e.key === 'Escape') onClose();
                        }}
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{
                          backgroundColor: 'var(--theme-bg-secondary)',
                          borderColor: 'var(--theme-border-primary)',
                          color: 'var(--theme-text-primary)',
                        }}
                        autoFocus
                      />
                      <p className="text-xs mt-1" style={{ color: 'var(--theme-text-tertiary)' }}>
                        This will update all wikilinks that reference this note
                      </p>
                    </div>
                    {error && (
                      <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-error) 10%, var(--theme-bg-primary))', color: 'var(--theme-error)' }}>
                        <FiAlertCircle size={16} />
                        <span>{error}</span>
                      </div>
                    )}
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                          backgroundColor: 'var(--theme-bg-secondary)',
                          color: 'var(--theme-text-primary)',
                          border: '1px solid var(--theme-border-primary)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--theme-bg-secondary)';
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRename}
                        disabled={loading || !newName.trim()}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        style={{
                          backgroundColor: 'var(--theme-accent)',
                          color: 'var(--theme-accent-text)',
                        }}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.backgroundColor = 'var(--theme-accent-hover)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--theme-accent)';
                        }}
                      >
                        {loading ? 'Renaming...' : 'Rename'}
                      </button>
                    </div>
                  </>
                )}

                {mode === 'move' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text-primary)' }}>
                        New Path
                      </label>
                      <input
                        type="text"
                        value={newPath}
                        onChange={(e) => setNewPath(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleMove();
                          if (e.key === 'Escape') onClose();
                        }}
                        placeholder="folder/subfolder/note-name.md"
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{
                          backgroundColor: 'var(--theme-bg-secondary)',
                          borderColor: 'var(--theme-border-primary)',
                          color: 'var(--theme-text-primary)',
                        }}
                        autoFocus
                      />
                      <p className="text-xs mt-1" style={{ color: 'var(--theme-text-tertiary)' }}>
                        Include folder path if moving to a different folder
                      </p>
                    </div>
                    {error && (
                      <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-error) 10%, var(--theme-bg-primary))', color: 'var(--theme-error)' }}>
                        <FiAlertCircle size={16} />
                        <span>{error}</span>
                      </div>
                    )}
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                          backgroundColor: 'var(--theme-bg-secondary)',
                          color: 'var(--theme-text-primary)',
                          border: '1px solid var(--theme-border-primary)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--theme-bg-secondary)';
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleMove}
                        disabled={loading || !newPath.trim()}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        style={{
                          backgroundColor: 'var(--theme-accent)',
                          color: 'var(--theme-accent-text)',
                        }}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.backgroundColor = 'var(--theme-accent-hover)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--theme-accent)';
                        }}
                      >
                        {loading ? 'Moving...' : 'Move'}
                      </button>
                    </div>
                  </>
                )}

                {mode === 'extract' && selection && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text-primary)' }}>
                        New Note Name
                      </label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleExtract();
                          if (e.key === 'Escape') onClose();
                        }}
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{
                          backgroundColor: 'var(--theme-bg-secondary)',
                          borderColor: 'var(--theme-border-primary)',
                          color: 'var(--theme-text-primary)',
                        }}
                        autoFocus
                      />
                      <p className="text-xs mt-1" style={{ color: 'var(--theme-text-tertiary)' }}>
                        Selected text will be extracted to a new note and replaced with a wikilink
                      </p>
                    </div>
                    <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--theme-bg-secondary)', color: 'var(--theme-text-secondary)' }}>
                      <p className="font-medium mb-1" style={{ color: 'var(--theme-text-primary)' }}>Selection preview:</p>
                      <p className="line-clamp-3">{selection.text.substring(0, 200)}{selection.text.length > 200 ? '...' : ''}</p>
                    </div>
                    {error && (
                      <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-error) 10%, var(--theme-bg-primary))', color: 'var(--theme-error)' }}>
                        <FiAlertCircle size={16} />
                        <span>{error}</span>
                      </div>
                    )}
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                          backgroundColor: 'var(--theme-bg-secondary)',
                          color: 'var(--theme-text-primary)',
                          border: '1px solid var(--theme-border-primary)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--theme-bg-secondary)';
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleExtract}
                        disabled={loading || !newName.trim()}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        style={{
                          backgroundColor: 'var(--theme-accent)',
                          color: 'var(--theme-accent-text)',
                        }}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.backgroundColor = 'var(--theme-accent-hover)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--theme-accent)';
                        }}
                      >
                        {loading ? 'Extracting...' : 'Extract'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

