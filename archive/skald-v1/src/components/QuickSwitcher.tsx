import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiFileText, FiCheckSquare, FiX, FiExternalLink, FiEye } from 'react-icons/fi';
import { SearchDocument } from '../store/searchStore';
import { MarkdownPreview } from './MarkdownPreview';

interface QuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (result: { type: 'note' | 'task'; path?: string; noteId?: string }) => void;
}

interface ScoredResult extends SearchDocument {
  score: number;
  matchType: 'title' | 'heading' | 'content' | 'path';
}

/**
 * Simple fuzzy match - checks if query appears in text (case-insensitive)
 * Returns a score based on match position and type
 */
function fuzzyScore(query: string, text: string, matchType: 'title' | 'heading' | 'content' | 'path'): number {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  
  // Exact match gets highest score
  if (lowerText === lowerQuery) {
    return matchType === 'title' ? 1000 : matchType === 'heading' ? 800 : matchType === 'path' ? 600 : 400;
  }
  
  // Starts with query gets high score
  if (lowerText.startsWith(lowerQuery)) {
    return matchType === 'title' ? 900 : matchType === 'heading' ? 700 : matchType === 'path' ? 500 : 300;
  }
  
  // Contains query
  const index = lowerText.indexOf(lowerQuery);
  if (index !== -1) {
    // Earlier in the string = higher score
    const positionScore = (text.length - index) / text.length * 100;
    const typeMultiplier = matchType === 'title' ? 5 : matchType === 'heading' ? 4 : matchType === 'path' ? 3 : 1;
    return positionScore * typeMultiplier;
  }
  
  // Word boundary match (query matches word boundaries)
  const words = lowerText.split(/\s+/);
  const queryWords = lowerQuery.split(/\s+/);
  let wordMatches = 0;
  for (const qWord of queryWords) {
    if (words.some(w => w.startsWith(qWord))) {
      wordMatches++;
    }
  }
  if (wordMatches > 0) {
    const wordScore = (wordMatches / queryWords.length) * 200;
    const typeMultiplier = matchType === 'title' ? 3 : matchType === 'heading' ? 2.5 : matchType === 'path' ? 2 : 1;
    return wordScore * typeMultiplier;
  }
  
  return 0;
}

/**
 * Score a document against a query with weighted relevance
 */
function scoreDocument(query: string, doc: SearchDocument): ScoredResult | null {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
  if (terms.length === 0) return null;
  
  let totalScore = 0;
  let matchType: 'title' | 'heading' | 'content' | 'path' = 'content';
  
  // Title match gets highest weight
  const titleScore = terms.reduce((sum, term) => {
    return sum + fuzzyScore(term, doc.title, 'title');
  }, 0);
  if (titleScore > 0) {
    totalScore += titleScore * 10; // 10x weight for title
    matchType = 'title';
  }
  
  // Heading matches get high weight
  const headingScore = doc.headings.reduce((max, heading) => {
    const score = terms.reduce((sum, term) => sum + fuzzyScore(term, heading, 'heading'), 0);
    return Math.max(max, score);
  }, 0);
  if (headingScore > 0) {
    totalScore += headingScore * 5; // 5x weight for headings
    if (matchType === 'content') matchType = 'heading';
  }
  
  // Path match gets medium weight
  const pathScore = terms.reduce((sum, term) => {
    return sum + fuzzyScore(term, doc.path, 'path');
  }, 0);
  if (pathScore > 0) {
    totalScore += pathScore * 3; // 3x weight for path
    if (matchType === 'content') matchType = 'path';
  }
  
  // Content match gets base weight
  const contentScore = terms.reduce((sum, term) => {
    return sum + fuzzyScore(term, doc.content, 'content');
  }, 0);
  totalScore += contentScore;
  
  // Recency boost (more recent = slightly higher score)
  const daysSinceUpdate = (Date.now() - doc.updatedAt) / (1000 * 60 * 60 * 24);
  const recencyBoost = Math.max(0, 30 - daysSinceUpdate) * 2; // Boost up to 60 points for very recent items
  totalScore += recencyBoost;
  
  if (totalScore === 0) return null;
  
  return {
    ...doc,
    score: totalScore,
    matchType,
  };
}

export function QuickSwitcher({ isOpen, onClose, onSelect }: QuickSwitcherProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [allDocuments, setAllDocuments] = useState<SearchDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Perform fuzzy search on all documents
  const [fuzzyResults, setFuzzyResults] = useState<ScoredResult[]>([]);
  
  // Load preview content for selected result
  const loadPreview = useCallback(async (result: ScoredResult) => {
    if (result.type === 'note' && result.path) {
      try {
        const content = await window.api.vault.readFile(result.path);
        // Get first 20 lines for better preview
        const lines = content.split('\n');
        const preview = lines.slice(0, 20).join('\n');
        setPreviewContent(preview);
      } catch (error) {
        console.error('Failed to load preview:', error);
        setPreviewContent(null);
      }
    } else {
      // For tasks, show the task content (already in markdown format)
      setPreviewContent(result.content);
    }
  }, []);
  
  // Load all documents when QuickSwitcher opens
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setPreviewContent(null);
      setFuzzyResults([]);
      return;
    }
    
    // Focus input when opened
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    
    // Load all documents for fuzzy search
    setIsLoadingDocuments(true);
    window.api.search.getAll()
      .then((docs: SearchDocument[]) => {
        setAllDocuments(docs);
        setIsLoadingDocuments(false);
      })
      .catch((error) => {
        console.error('Failed to load documents:', error);
        setIsLoadingDocuments(false);
      });
  }, [isOpen]);
  
  // Perform fuzzy search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setFuzzyResults([]);
      setPreviewContent(null);
      return;
    }
    
    // Apply fuzzy scoring to all documents
    const scored = allDocuments
      .map(doc => scoreDocument(query, doc))
      .filter((result): result is ScoredResult => result !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // Top 20 results
    
    setFuzzyResults(scored);
    
    // Reset selected index when results change
    if (scored.length > 0) {
      setSelectedIndex(0);
      loadPreview(scored[0]);
    } else {
      setPreviewContent(null);
    }
  }, [query, allDocuments, loadPreview]);
  
  // Update preview when selected index changes
  useEffect(() => {
    if (fuzzyResults.length > 0 && selectedIndex < fuzzyResults.length) {
      loadPreview(fuzzyResults[selectedIndex]);
    }
  }, [selectedIndex, fuzzyResults, loadPreview]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, fuzzyResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && fuzzyResults.length > 0) {
      e.preventDefault();
      const selected = fuzzyResults[selectedIndex];
      if (selected) {
        handleSelect(selected);
      }
    }
  };
  
  const handleSelect = (result: ScoredResult) => {
    onSelect({
      type: result.type,
      path: result.path,
      noteId: result.noteId,
    });
    onClose();
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-20"
          onClick={onClose}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
          }}
        >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-4xl mx-4"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'var(--theme-bg-primary)',
            borderRadius: '0.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: 'var(--theme-border-primary)' }}>
            <FiSearch className="flex-shrink-0" style={{ color: 'var(--theme-text-secondary)' }} size={20} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search notes, tasks, and headings..."
              className="flex-1 bg-transparent outline-none text-lg"
              style={{ color: 'var(--theme-text-primary)' }}
            />
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1 rounded hover:bg-opacity-20 transition-colors"
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
          
          {/* Results and Preview */}
          <div className="flex" style={{ maxHeight: '60vh', minHeight: '400px' }}>
            {/* Results List */}
            <div className="flex-1 overflow-y-auto border-r" style={{ borderColor: 'var(--theme-border-primary)' }}>
              {isLoadingDocuments ? (
                <div className="p-8 text-center" style={{ color: 'var(--theme-text-tertiary)' }}>
                  Loading...
                </div>
              ) : fuzzyResults.length === 0 ? (
                <div className="p-8 text-center" style={{ color: 'var(--theme-text-tertiary)' }}>
                  {query.trim() ? 'No results found' : 'Start typing to search...'}
                </div>
              ) : (
                <div className="py-2">
                  {fuzzyResults.map((result, index) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      className="w-full px-4 py-3 text-left transition-colors"
                      style={{
                        backgroundColor: index === selectedIndex ? 'var(--theme-hover)' : 'transparent',
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {result.type === 'task' ? (
                            <FiCheckSquare size={18} style={{ color: 'var(--theme-accent)' }} />
                          ) : (
                            <FiFileText size={18} style={{ color: 'var(--theme-accent)' }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className="text-xs px-2 py-0.5 rounded font-medium"
                              style={{
                                backgroundColor: result.type === 'task' 
                                  ? 'color-mix(in srgb, var(--theme-info) 20%, var(--theme-bg-primary))'
                                  : 'color-mix(in srgb, var(--theme-accent) 20%, var(--theme-bg-primary))',
                                color: result.type === 'task' ? 'var(--theme-info)' : 'var(--theme-accent)',
                              }}
                            >
                              {result.type}
                            </span>
                            {result.status && (
                              <span
                                className="text-xs px-2 py-0.5 rounded"
                                style={{
                                  backgroundColor: 'color-mix(in srgb, var(--theme-warning) 20%, var(--theme-bg-primary))',
                                  color: 'var(--theme-warning)',
                                }}
                              >
                                {result.status}
                              </span>
                            )}
                            {result.schema && (
                              <span
                                className="text-xs px-2 py-0.5 rounded"
                                style={{
                                  backgroundColor: 'color-mix(in srgb, var(--theme-accent) 20%, var(--theme-bg-primary))',
                                  color: 'var(--theme-accent)',
                                }}
                              >
                                {result.schema}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold truncate mb-1" style={{ color: 'var(--theme-text-primary)' }}>
                            {result.title}
                          </h3>
                          <p className="text-sm line-clamp-2 mb-2" style={{ color: 'var(--theme-text-secondary)' }}>
                            {result.content.substring(0, 100)}
                            {result.content.length > 100 ? '...' : ''}
                          </p>
                          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--theme-text-tertiary)' }}>
                            <span className="truncate">{result.path}</span>
                            {result.headings.length > 0 && (
                              <span className="flex-shrink-0">
                                {result.headings.length} heading{result.headings.length !== 1 ? 's' : ''}
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
            
            {/* Preview Pane */}
            {fuzzyResults.length > 0 && selectedIndex < fuzzyResults.length && (
              <div className="w-1/2 border-l overflow-y-auto p-4" style={{ borderColor: 'var(--theme-border-primary)' }}>
                {fuzzyResults[selectedIndex] && (
                  <>
                    <div className="mb-4">
                      <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--theme-text-primary)' }}>
                        {fuzzyResults[selectedIndex].title}
                      </h2>
                      <div className="flex items-center gap-2 text-sm mb-3" style={{ color: 'var(--theme-text-secondary)' }}>
                        <span>{fuzzyResults[selectedIndex].path}</span>
                        {fuzzyResults[selectedIndex].updatedAt && (
                          <span>•</span>
                        )}
                        {fuzzyResults[selectedIndex].updatedAt && (
                          <span>
                            {new Date(fuzzyResults[selectedIndex].updatedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSelect(fuzzyResults[selectedIndex])}
                          className="px-3 py-1.5 text-sm rounded-lg font-medium transition-colors"
                          style={{
                            backgroundColor: 'var(--theme-accent)',
                            color: 'var(--theme-accent-text)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--theme-accent-hover)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--theme-accent)';
                          }}
                        >
                          <FiExternalLink className="inline mr-1.5" size={14} />
                          Open
                        </button>
                        {fuzzyResults[selectedIndex].type === 'note' && (
                          <button
                            onClick={() => {
                              if (fuzzyResults[selectedIndex].path) {
                                window.dispatchEvent(new CustomEvent('peek-note', { detail: { path: fuzzyResults[selectedIndex].path } }));
                              }
                              onClose();
                            }}
                            className="px-3 py-1.5 text-sm rounded-lg font-medium transition-colors"
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
                            <FiEye className="inline mr-1.5" size={14} />
                            Peek
                          </button>
                        )}
                      </div>
                    </div>
                    {previewContent && (
                      <div className="markdown-preview-container">
                        <MarkdownPreview content={previewContent} />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Footer with keyboard hints */}
          <div className="px-4 py-2 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--theme-border-primary)', color: 'var(--theme-text-tertiary)' }}>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-primary)' }}>
                  ↑↓
                </kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-primary)' }}>
                  Enter
                </kbd>
                <span>Select</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-primary)' }}>
                  Esc
                </kbd>
                <span>Close</span>
              </span>
            </div>
            {fuzzyResults.length > 0 && (
              <span>
                {fuzzyResults.length} result{fuzzyResults.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}

