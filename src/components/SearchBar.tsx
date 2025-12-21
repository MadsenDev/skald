import { useState, useEffect, useRef } from 'react';
import { FiSearch, FiX, FiExternalLink, FiEye, FiCopy } from 'react-icons/fi';
import { useSearchStore, SearchDocument } from '../store/searchStore';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { useContextMenu } from '../hooks/useContextMenu';

interface SearchBarProps {
  onResultClick?: (result: { type: 'note' | 'task'; path?: string; noteId?: string }) => void;
}

export function SearchBar({ onResultClick }: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState('');
  const { results, query, loading, search, clearResults } = useSearchStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const [contextMenuResult, setContextMenuResult] = useState<SearchDocument | null>(null);

  useEffect(() => {
    // Debounce search
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (localQuery.trim()) {
      debounceTimer.current = setTimeout(() => {
        search(localQuery);
      }, 300);
    } else {
      clearResults();
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [localQuery, search, clearResults]);

  useEffect(() => {
    // Focus input when search opens
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setLocalQuery('');
      clearResults();
    } else if (e.key === 'Enter' && results.length > 0 && onResultClick) {
      onResultClick(results[0]);
      setIsOpen(false);
      setLocalQuery('');
      clearResults();
    }
  };

  const handleResultClick = (result: SearchDocument) => {
    if (onResultClick) {
      onResultClick({
        type: result.type,
        path: result.path,
        noteId: result.noteId,
      });
    }
    setIsOpen(false);
    setLocalQuery('');
    clearResults();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        title="Search (Ctrl+K)"
      >
        <FiSearch />
        <span className="hidden md:inline">Search</span>
        <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded">
          Ctrl+K
        </kbd>
      </button>
    );
  }

  const getContextMenuItems = (): ContextMenuItem[] => {
    if (!contextMenuResult || !contextMenuResult.path) return [];

    return [
      {
        id: 'open',
        label: 'Open',
        icon: <FiExternalLink className="w-4 h-4" />,
        onClick: () => {
          if (onResultClick) {
            onResultClick({
              type: contextMenuResult.type,
              path: contextMenuResult.path,
              noteId: contextMenuResult.noteId,
            });
          }
        },
      },
      {
        id: 'peek',
        label: 'Peek',
        icon: <FiEye className="w-4 h-4" />,
        onClick: () => {
          if (contextMenuResult.path) {
            window.dispatchEvent(new CustomEvent('peek-note', { detail: { path: contextMenuResult.path } }));
          }
        },
        disabled: !contextMenuResult.path || contextMenuResult.type === 'task',
      },
      { id: 'sep1', label: '', separator: true },
      {
        id: 'copy-path',
        label: 'Copy Path',
        icon: <FiCopy className="w-4 h-4" />,
        onClick: async () => {
          if (contextMenuResult.path) {
            await navigator.clipboard.writeText(contextMenuResult.path);
          }
        },
        disabled: !contextMenuResult.path,
      },
      {
        id: 'copy-content',
        label: 'Copy Content',
        icon: <FiCopy className="w-4 h-4" />,
        onClick: async () => {
          await navigator.clipboard.writeText(contextMenuResult.content);
        },
      },
    ];
  };

  return (
    <div className="relative w-full max-w-2xl">
      <ContextMenu
        items={getContextMenuItems()}
        position={contextMenu}
        onClose={() => {
          hideContextMenu();
          setContextMenuResult(null);
        }}
      />
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Search... (try: type:task status:open "search term")'
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {localQuery && (
          <button
            onClick={() => {
              setLocalQuery('');
              clearResults();
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <FiX size={18} />
          </button>
        )}
      </div>

      {localQuery && (results.length > 0 || loading) && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No results found</div>
          ) : (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenuResult(result);
                    showContextMenu(e);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          result.type === 'task' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {result.type}
                        </span>
                        {result.status && (
                          <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">
                            {result.status}
                          </span>
                        )}
                        {result.schema && (
                          <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                            {result.schema}
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 truncate">{result.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                        {result.content.substring(0, 150)}
                        {result.content.length > 150 ? '...' : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <span>{result.path}</span>
                        {result.tags.length > 0 && (
                          <span className="flex items-center gap-1">
                            {result.tags.map(tag => (
                              <span key={tag} className="text-indigo-600">#{tag}</span>
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

