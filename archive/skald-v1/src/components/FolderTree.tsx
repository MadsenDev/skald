import { useState, useMemo, useEffect } from 'react';
import { FiFileText, FiFolder, FiFolderPlus, FiChevronRight, FiChevronDown, FiTrash2, FiCopy, FiExternalLink, FiEye, FiEdit3, FiScissors } from 'react-icons/fi';
import { CreateNoteDialog } from './CreateNoteDialog';
import { CreateFolderDialog } from './CreateFolderDialog';
import { RefactorNoteModal } from './RefactorNoteModal';
import { useVaultStore } from '../store/vaultStore';
import { useSettingsStore } from '../store/settingsStore';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { useContextMenu } from '../hooks/useContextMenu';

interface Note {
  id: string;
  path: string;
  title: string;
  updatedAt: Date;
}

interface FolderTreeProps {
  notes: Note[];
  selectedNote: string | null;
  onSelectNote: (path: string) => void;
}

interface FolderNode {
  name: string;
  fullPath: string;
  notes: Note[];
  children: Map<string, FolderNode>;
}

export function FolderTree({ notes, selectedNote, onSelectNote }: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [createNoteDialog, setCreateNoteDialog] = useState<{ isOpen: boolean; folder?: string }>({ isOpen: false });
  const [createFolderDialog, setCreateFolderDialog] = useState<{ isOpen: boolean; parentFolder?: string }>({ isOpen: false });
  const [allFolders, setAllFolders] = useState<string[]>([]);
  const [draggedItem, setDraggedItem] = useState<{ type: 'note' | 'folder'; path: string; name: string } | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const [contextMenuTarget, setContextMenuTarget] = useState<{ type: 'note' | 'folder'; path: string; name: string } | null>(null);
  const [refactorModal, setRefactorModal] = useState<{ isOpen: boolean; notePath: string; mode?: 'rename' | 'move' }>({ isOpen: false, notePath: '' });
  const { loadNotes } = useVaultStore();
  const settings = useSettingsStore((state) => state.settings);
  const sidebarNoteDisplay = (settings.appearance?.sidebarNoteDisplay as 'filename' | 'title') || 'filename';

  // Helper function to get filename from note path (without .md extension)
  const getNoteFileName = (notePath: string): string => {
    const pathWithoutNotes = notePath.replace(/^notes\//, '');
    const fileName = basename(pathWithoutNotes);
    return fileName.replace(/\.md$/, '');
  };

  // Get display name for a note based on settings
  const getNoteDisplayName = (note: Note): string => {
    if (sidebarNoteDisplay === 'title') {
      return note.title;
    }
    return getNoteFileName(note.path);
  };

  // Load folders from filesystem
  const loadFolders = async () => {
    try {
      const folders = await window.api.vault.listFolders();
      setAllFolders(folders);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  useEffect(() => {
    loadFolders();
    // Reload folders periodically (in case folders were created/deleted outside the app)
    const interval = setInterval(loadFolders, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [notes]);

  // Build folder tree from notes and folders
  const rootNode = useMemo(() => {
    const root: FolderNode = {
      name: '',
      fullPath: '',
      notes: [],
      children: new Map(),
    };

    // First, add all folders (including empty ones) to the tree
    for (const folderPath of allFolders) {
      const parts = folderPath.split(/[\/\\]/);
      let current = root;

      for (const part of parts) {
        if (!current.children.has(part)) {
          const parentPath = current.fullPath ? `${current.fullPath}/${part}` : part;
          current.children.set(part, {
            name: part,
            fullPath: parentPath,
            notes: [],
            children: new Map(),
          });
        }
        current = current.children.get(part)!;
      }
    }

    // Then, add notes to the tree
    for (const note of notes) {
      // Extract folder path from note path (e.g., "notes/folder/subfolder/file.md")
      const pathWithoutNotes = note.path.replace(/^notes\//, '');
      const dir = dirname(pathWithoutNotes);

      if (dir === '.' || dir === '') {
        // Root level note
        root.notes.push(note);
      } else {
        // Note in a folder
        const parts = dir.split(/[\/\\]/);
        let current = root;

        // Navigate/create folder structure (should already exist from folder scan)
        for (const part of parts) {
          if (!current.children.has(part)) {
            const parentPath = current.fullPath ? `${current.fullPath}/${part}` : part;
            current.children.set(part, {
              name: part,
              fullPath: parentPath,
              notes: [],
              children: new Map(),
            });
          }
          current = current.children.get(part)!;
        }

        current.notes.push(note);
      }
    }

    return root;
  }, [notes, allFolders]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const handleCreateNote = async (name: string, folder?: string) => {
    const folderPath = createNoteDialog.folder || folder || '';
    const fullPath = folderPath ? `${folderPath}/${name}` : name;
    
    try {
      const result = await window.api.vault.createNote(fullPath);
      onSelectNote(result.path);
      await useVaultStore.getState().loadNotes();
    } catch (error) {
      console.error('Failed to create note:', error);
      alert(`Failed to create note: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleCreateFolder = async (name: string) => {
    const parentFolder = createFolderDialog.parentFolder || '';
    const fullPath = parentFolder ? `${parentFolder}/${name}` : name;
    
    try {
      await window.api.vault.createFolder(fullPath);
      // Auto-expand the parent folder and the new folder
      if (parentFolder) {
        setExpandedFolders(prev => new Set(prev).add(parentFolder).add(fullPath));
      } else {
        setExpandedFolders(prev => new Set(prev).add(fullPath));
      }
      // Reload folders immediately to show the new folder
      await loadFolders();
      await useVaultStore.getState().loadNotes();
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert(`Failed to create folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const renderFolder = (node: FolderNode, level: number = 0): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    const isExpanded = expandedFolders.has(node.fullPath);
    // Root-level folders (level 1 from root's perspective) should align with root-level notes (level 0)
    // So we use level - 1 for root-level folders, or level for nested folders
    const isRootLevel = level === 1 && !node.fullPath.includes('/');
    const indentLevel = isRootLevel ? 0 : level;
    const indent = indentLevel * 16;

    // Render folder if not root
    if (node.fullPath) {
      const isDraggedOver = dragOverFolder === node.fullPath;
      const isDragged = draggedItem?.type === 'folder' && draggedItem.path === node.fullPath;
      
      elements.push(
        <div
          key={`folder-${node.fullPath}`}
          className="select-none"
          data-folder-path={node.fullPath}
          draggable
          onDragStart={(e) => {
            setDraggedItem({ type: 'folder', path: node.fullPath, name: node.name });
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragEnd={() => {
            setDraggedItem(null);
            setDragOverFolder(null);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (draggedItem && draggedItem.path !== node.fullPath && !node.fullPath.startsWith(draggedItem.path + '/')) {
              setDragOverFolder(node.fullPath);
            }
          }}
          onDragLeave={(e) => {
            // Only clear if we're actually leaving the folder (not just moving to a child)
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;
            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
              setDragOverFolder(null);
            }
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (!draggedItem) return;
            
            try {
              if (draggedItem.type === 'note') {
                // Extract note name from path
                const notePathWithoutNotes = draggedItem.path.replace(/^notes\//, '');
                const noteName = basename(notePathWithoutNotes);
                const newPath = node.fullPath ? `notes/${node.fullPath}/${noteName}` : `notes/${noteName}`;
                
                if (draggedItem.path !== newPath) {
                  // Use refactor moveNote to update wikilinks
                  await window.api.refactor.moveNote(draggedItem.path, newPath);
                  await loadNotes();
                  await loadFolders();
                  // Update selected note if it was moved
                  if (selectedNote === draggedItem.path) {
                    onSelectNote(newPath);
                  }
                }
              } else if (draggedItem.type === 'folder') {
                // Prevent moving folder into itself or its children
                if (node.fullPath.startsWith(draggedItem.path + '/') || node.fullPath === draggedItem.path) {
                  return;
                }
                
                const folderName = basename(draggedItem.path);
                const newPath = node.fullPath ? `${node.fullPath}/${folderName}` : folderName;
                
                if (draggedItem.path !== newPath) {
                  await window.api.vault.moveFolder(draggedItem.path, newPath);
                  await useVaultStore.getState().loadNotes();
                  await loadFolders();
                }
              }
            } catch (error) {
              console.error('Failed to move item:', error);
              alert(`Failed to move ${draggedItem.type}: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
              setDraggedItem(null);
              setDragOverFolder(null);
            }
          }}
        >
          <button
            onClick={() => toggleFolder(node.fullPath)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenuTarget({ type: 'folder', path: node.fullPath, name: node.name });
              showContextMenu(e);
            }}
            className={`group w-full flex items-center gap-1 px-2 py-1.5 text-sm rounded transition-colors ${
              isDraggedOver
                ? 'bg-indigo-100 border-2 border-indigo-400 border-dashed'
                : isDragged
                ? 'opacity-50'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            style={{ paddingLeft: `${16 + indent}px` }}
          >
            <FiFolder className="w-4 h-4 flex-shrink-0" />
            <span className="truncate flex-1 text-left">{node.name}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCreateNoteDialog({ isOpen: true, folder: node.fullPath });
                }}
                className="p-1 hover:bg-gray-200 rounded"
                title="Create note in this folder"
              >
                <FiFileText className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCreateFolderDialog({ isOpen: true, parentFolder: node.fullPath });
                }}
                className="p-1 hover:bg-gray-200 rounded"
                title="Create folder in this folder"
              >
                <FiFolderPlus className="w-3 h-3" />
              </button>
            </div>
            {isExpanded ? (
              <FiChevronDown className="w-4 h-4 flex-shrink-0 ml-1" />
            ) : (
              <FiChevronRight className="w-4 h-4 flex-shrink-0 ml-1" />
            )}
          </button>
        </div>
      );
    }

    // Render notes and child folders in this folder
    if (!node.fullPath || isExpanded) {
      // First render child folders, then notes (so folders appear before notes at the same level)
      const sortedChildren = Array.from(node.children.entries()).sort(([a], [b]) => a.localeCompare(b));
      for (const [_, childNode] of sortedChildren) {
        elements.push(...renderFolder(childNode, level + 1));
      }

      // Then render notes in this folder
      // Root-level notes (no fullPath) should have no extra indentation
      // Notes inside folders should be indented one level more than the folder
      const noteIndent = node.fullPath ? (level + 1) * 16 : 0;
      for (const note of node.notes.sort((a, b) => {
        const nameA = getNoteDisplayName(a);
        const nameB = getNoteDisplayName(b);
        return nameA.localeCompare(nameB);
      })) {
        const displayName = getNoteDisplayName(note);
        elements.push(
          <div
            key={note.id}
            draggable
            onDragStart={(e) => {
              setDraggedItem({ type: 'note', path: note.path, name: displayName });
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={() => {
              setDraggedItem(null);
              setDragOverFolder(null);
            }}
            className={`cursor-move ${
              draggedItem?.type === 'note' && draggedItem.path === note.path ? 'opacity-50' : ''
            }`}
          >
            <button
              onClick={() => onSelectNote(note.path)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenuTarget({ type: 'note', path: note.path, name: displayName });
                showContextMenu(e);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                selectedNote === note.path
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              style={{ paddingLeft: node.fullPath ? `${16 + noteIndent}px` : '16px' }}
            >
              <FiFileText className="w-4 h-4 flex-shrink-0" />
              <span className="truncate flex-1 text-left">{displayName}</span>
            </button>
          </div>
        );
      }
    }

    return elements;
  };

  // Build context menu items based on target
  const getContextMenuItems = (): ContextMenuItem[] => {
    if (!contextMenuTarget) return [];

    if (contextMenuTarget.type === 'note') {
      return [
        {
          id: 'open',
          label: 'Open',
          icon: <FiExternalLink className="w-4 h-4" />,
          onClick: () => onSelectNote(contextMenuTarget.path),
        },
        {
          id: 'peek',
          label: 'Peek',
          icon: <FiEye className="w-4 h-4" />,
          onClick: () => {
            window.dispatchEvent(new CustomEvent('peek-note', { detail: { path: contextMenuTarget.path } }));
          },
        },
        { id: 'sep1', label: '', separator: true },
        {
          id: 'rename',
          label: 'Rename',
          icon: <FiEdit3 className="w-4 h-4" />,
          onClick: () => {
            setRefactorModal({ isOpen: true, notePath: contextMenuTarget.path, mode: 'rename' });
            hideContextMenu();
          },
        },
        {
          id: 'move',
          label: 'Move',
          icon: <FiScissors className="w-4 h-4" />,
          onClick: () => {
            setRefactorModal({ isOpen: true, notePath: contextMenuTarget.path, mode: 'move' });
            hideContextMenu();
          },
        },
        { id: 'sep2', label: '', separator: true },
        {
          id: 'copy-path',
          label: 'Copy Path',
          icon: <FiCopy className="w-4 h-4" />,
          onClick: async () => {
            await navigator.clipboard.writeText(contextMenuTarget.path);
          },
        },
        { id: 'sep3', label: '', separator: true },
        {
          id: 'delete',
          label: 'Delete',
          icon: <FiTrash2 className="w-4 h-4" />,
          onClick: async () => {
            if (confirm(`Are you sure you want to delete "${contextMenuTarget.name}"?`)) {
              try {
                await window.api.vault.deleteNote(contextMenuTarget.path);
                await useVaultStore.getState().loadNotes();
                if (selectedNote === contextMenuTarget.path) {
                  onSelectNote('');
                }
              } catch (error) {
                console.error('Failed to delete note:', error);
                alert(`Failed to delete note: ${error instanceof Error ? error.message : String(error)}`);
              }
            }
          },
          danger: true,
        },
      ];
    } else {
      // Folder menu
      return [
        {
          id: 'new-note',
          label: 'New Note',
          icon: <FiFileText className="w-4 h-4" />,
          onClick: () => setCreateNoteDialog({ isOpen: true, folder: contextMenuTarget.path }),
        },
        {
          id: 'new-folder',
          label: 'New Folder',
          icon: <FiFolderPlus className="w-4 h-4" />,
          onClick: () => setCreateFolderDialog({ isOpen: true, parentFolder: contextMenuTarget.path }),
        },
        { id: 'sep1', label: '', separator: true },
        {
          id: 'copy-path',
          label: 'Copy Path',
          icon: <FiCopy className="w-4 h-4" />,
          onClick: async () => {
            await navigator.clipboard.writeText(contextMenuTarget.path);
          },
        },
        { id: 'sep2', label: '', separator: true },
        {
          id: 'delete',
          label: 'Delete',
          icon: <FiTrash2 className="w-4 h-4" />,
          onClick: async () => {
            if (confirm(`Are you sure you want to delete folder "${contextMenuTarget.name}" and all its contents?`)) {
              try {
                await window.api.vault.deleteFolder(contextMenuTarget.path);
                await useVaultStore.getState().loadNotes();
                await loadFolders();
              } catch (error) {
                console.error('Failed to delete folder:', error);
                alert(`Failed to delete folder: ${error instanceof Error ? error.message : String(error)}`);
              }
            }
          },
          danger: true,
        },
      ];
    }
  };

  return (
    <>
      <CreateNoteDialog
        isOpen={createNoteDialog.isOpen}
        onClose={() => setCreateNoteDialog({ isOpen: false })}
        onCreate={handleCreateNote}
        folder={createNoteDialog.folder}
      />
      <CreateFolderDialog
        isOpen={createFolderDialog.isOpen}
        onClose={() => setCreateFolderDialog({ isOpen: false })}
        onCreate={handleCreateFolder}
      />
      <ContextMenu
        items={getContextMenuItems()}
        position={contextMenu}
        onClose={() => {
          hideContextMenu();
          setContextMenuTarget(null);
        }}
      />
      <RefactorNoteModal
        isOpen={refactorModal.isOpen}
        onClose={() => setRefactorModal({ isOpen: false, notePath: '' })}
        notePath={refactorModal.notePath}
        noteTitle={notes.find(n => n.path === refactorModal.notePath)?.title || refactorModal.notePath}
        selection={null}
        mode={refactorModal.mode}
        onRename={async (newPath) => {
          await loadNotes();
          if (selectedNote === refactorModal.notePath) {
            onSelectNote(newPath);
          }
        }}
        onMove={async (newPath) => {
          await loadNotes();
          if (selectedNote === refactorModal.notePath) {
            onSelectNote(newPath);
          }
        }}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 flex items-center gap-2">
          <button
            onClick={() => setCreateNoteDialog({ isOpen: true })}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="New Note"
          >
            <FiFileText className="w-4 h-4" />
            <span>+</span>
          </button>
          <button
            onClick={() => setCreateFolderDialog({ isOpen: true })}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="New Folder"
          >
            <FiFolder className="w-4 h-4" />
            <span>+</span>
          </button>
        </div>
        <div
          className="px-2 pb-2 min-h-[200px]"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Only set root drop zone if we're not over a folder
            const target = e.target as HTMLElement;
            const folderElement = target.closest('[data-folder-path]');
            if (!folderElement && draggedItem) {
              setDragOverFolder('');
            }
          }}
          onDragLeave={(e) => {
            // Only clear if we're actually leaving the container
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;
            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
              setDragOverFolder(null);
            }
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (!draggedItem) return;
            
            // Check if we're dropping on a folder (not root)
            const target = e.target as HTMLElement;
            const folderElement = target.closest('[data-folder-path]');
            if (folderElement) {
              // Let the folder handle the drop
              return;
            }
            
            try {
              if (draggedItem.type === 'note') {
                // Extract note name from path (keep .md extension)
                const notePathWithoutNotes = draggedItem.path.replace(/^notes\//, '');
                const noteFileName = basename(notePathWithoutNotes);
                const newPath = `notes/${noteFileName}`;
                
                // Only move if the path actually changed (not already at root)
                const currentDir = dirname(notePathWithoutNotes);
                if (currentDir !== '.' && currentDir !== '') {
                  await window.api.vault.moveNote(draggedItem.path, newPath);
                  await useVaultStore.getState().loadNotes();
                  await loadFolders();
                  // Update selected note if it was moved
                  if (selectedNote === draggedItem.path) {
                    onSelectNote(newPath);
                  }
                }
              } else if (draggedItem.type === 'folder') {
                const folderName = basename(draggedItem.path);
                const newPath = folderName;
                
                // Only move if not already at root
                if (draggedItem.path.includes('/')) {
                  await window.api.vault.moveFolder(draggedItem.path, newPath);
                  await useVaultStore.getState().loadNotes();
                  await loadFolders();
                }
              }
            } catch (error) {
              console.error('Failed to move item:', error);
              alert(`Failed to move ${draggedItem.type}: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
              setDraggedItem(null);
              setDragOverFolder(null);
            }
          }}
        >
          {notes.length === 0 && allFolders.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">
              No notes yet. Create one to get started!
            </div>
          ) : (
            <div className={`space-y-1 ${dragOverFolder === '' ? 'bg-indigo-50 border-2 border-indigo-400 border-dashed rounded p-2' : ''}`}>
              {renderFolder(rootNode)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Helper functions
function dirname(path: string): string {
  const parts = path.split(/[\/\\]/);
  parts.pop();
  return parts.join('/') || '.';
}

function basename(path: string): string {
  const parts = path.split(/[\/\\]/);
  return parts[parts.length - 1] || path;
}

