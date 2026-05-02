import { useState, useEffect, useRef, useMemo } from 'react';
import Editor, { OnMount, loader } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import type * as Monaco from 'monaco-editor';
import * as monaco from 'monaco-editor';

// Use locally bundled monaco-editor instead of CDN
loader.config({ monaco });
import { useVaultStore } from '../store/vaultStore';
import { useSchemaStore } from '../store/schemaStore';
import { useSettingsStore } from '../store/settingsStore';
import { registerMonacoTheme, getMonacoTheme } from '../themes/applyTheme';
import { findThemeById, getDefaultThemeDefinition } from '../themes/themeSystem';
import { toLegacyThemeShape } from '../themes/themes';
import { parseFrontmatter, serializeFrontmatter } from '../utils/frontmatter';
import { FrontmatterEditor } from './FrontmatterEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { BacklinksPanel } from './BacklinksPanel';
import { setupMarkdownAutoPairing, setupWikilinkAutocomplete, registerCustomMarkdownLanguage } from '../utils/monacoMarkdown';
import { setupAutoLinkSuggestions } from '../utils/autoLinkSuggestions';
import { z } from 'zod';
import { FiChevronDown, FiChevronUp, FiEye, FiEdit3, FiColumns, FiX, FiScissors } from 'react-icons/fi';
import { RefactorNoteModal } from './RefactorNoteModal';
import { MarkdownToolbar } from './MarkdownToolbar';

interface NoteEditorProps {
  notePath: string;
  onClose?: () => void;
}

export function NoteEditor({ notePath, onClose }: NoteEditorProps) {
  const [content, setContent] = useState('');
  const [frontmatter, setFrontmatter] = useState<Record<string, any>>({});
  const [bodyContent, setBodyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showFrontmatter, setShowFrontmatter] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>('');
  const [validationErrors, setValidationErrors] = useState<z.ZodError | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const { loadNotes, notes } = useVaultStore();
  const { schemas, loadSchemas, getSchemaById, parseSchema } = useSchemaStore();
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null);
  const [zodSchema, setZodSchema] = useState<z.ZodObject<any> | null>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const [editorInstance, setEditorInstance] = useState<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const [isRefactorModalOpen, setIsRefactorModalOpen] = useState(false);
  const [selection, setSelection] = useState<{ text: string; startOffset: number; endOffset: number } | null>(null);

  // Get editor settings with defaults - use settings from store
  const settings = useSettingsStore((state) => state.settings);
  const editorSettings = {
    fontSize: settings.editor?.fontSize ?? 14,
    fontFamily: settings.editor?.fontFamily ?? 'monospace',
    wordWrap: settings.editor?.wordWrap ?? true,
    lineNumbers: settings.editor?.lineNumbers ?? true,
    minimap: settings.editor?.minimap ?? false,
    autoLinkSuggestions: settings.editor?.autoLinkSuggestions !== false, // Default to enabled
  };

  // Get Monaco editor theme
  const themeId = settings.appearance?.activeThemeId ?? settings.appearance?.theme ?? 'atelier-light';
  const customThemes = settings.appearance?.customThemes ?? [];
  const theme = useMemo(() => {
    const definition = findThemeById(themeId, customThemes) ?? getDefaultThemeDefinition();
    return toLegacyThemeShape(definition);
  }, [themeId, customThemes]);

  const monacoRef = useRef<typeof Monaco | null>(null);
  const autocompleteDisposableRef = useRef<{ dispose: () => void } | null>(null);
  const autoLinkSuggestionsDisposableRef = useRef<{ dispose: () => void } | null>(null);
  
  const handleEditorMount: OnMount = (editorInstance, monacoInstance) => {
    editorRef.current = editorInstance;
    setEditorInstance(editorInstance);
    monacoRef.current = monacoInstance;
    
    // Register custom markdown language with wikilink support
    registerCustomMarkdownLanguage(monacoInstance);
    
    setupMarkdownAutoPairing(editorInstance);
    
    // Setup wikilink autocomplete - will be updated when notes change
    if (notes.length > 0) {
      autocompleteDisposableRef.current = setupWikilinkAutocomplete(monacoInstance, editorInstance, notes);
    }
    
    // Setup automatic link suggestions
    autoLinkSuggestionsDisposableRef.current = setupAutoLinkSuggestions(
      editorInstance,
      currentNoteId,
      editorSettings.autoLinkSuggestions,
      monacoInstance
    );
    
    registerMonacoTheme(monacoInstance, theme);
    const customThemeName = getMonacoTheme(theme);
    monacoInstance.editor.setTheme(customThemeName);
  };
  
  // Update Monaco theme when theme changes
  useEffect(() => {
    if (!monacoRef.current || !theme) return;
    
      // Register and apply custom Monaco theme
      try {
        registerMonacoTheme(monacoRef.current, theme);
        const customThemeName = getMonacoTheme(theme);
        monacoRef.current.editor.setTheme(customThemeName);
      } catch (error) {
        console.error('Failed to apply Monaco theme:', error);
      }
  }, [theme]);
  
  // Update autocomplete when notes change
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    
    // Dispose old provider
    if (autocompleteDisposableRef.current) {
      autocompleteDisposableRef.current.dispose();
      autocompleteDisposableRef.current = null;
    }
    
    if (notes.length > 0) {
      autocompleteDisposableRef.current = setupWikilinkAutocomplete(
        monacoRef.current,
        editorRef.current,
        notes
      );
    }
    
    return () => {
      if (autocompleteDisposableRef.current) {
        autocompleteDisposableRef.current.dispose();
        autocompleteDisposableRef.current = null;
      }
    };
  }, [notes]);
  
  // Update auto-link suggestions when settings or current note changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      // Dispose old suggestions
      if (autoLinkSuggestionsDisposableRef.current) {
        autoLinkSuggestionsDisposableRef.current.dispose();
      }
      
      // Setup new suggestions with updated settings
      autoLinkSuggestionsDisposableRef.current = setupAutoLinkSuggestions(
        editorRef.current,
        currentNoteId,
        editorSettings.autoLinkSuggestions,
        monacoRef.current
      );
    }
    
    return () => {
      if (autoLinkSuggestionsDisposableRef.current) {
        autoLinkSuggestionsDisposableRef.current.dispose();
        autoLinkSuggestionsDisposableRef.current = null;
      }
    };
  }, [editorSettings.autoLinkSuggestions, currentNoteId]);

  // Load schemas on mount
  useEffect(() => {
    loadSchemas();
  }, [loadSchemas]);

  const loadNote = async () => {
    if (!notePath) return;

    setLoading(true);
    try {
      const text = await window.api.vault.readFile(notePath);
      const parsed = parseFrontmatter(text);
      setFrontmatter(parsed.frontmatter);
      setBodyContent(parsed.content);
      setContent(text);

      // Find current note ID for backlinks
      const currentNote = notes.find(n => n.path === notePath);
      setCurrentNoteId(currentNote?.id || null);

      // Try to find schema from frontmatter
      if (parsed.frontmatter.schema) {
        const schema = schemas.find(s => s.name === parsed.frontmatter.schema);
        if (schema) {
          setSelectedSchemaId(schema.id);
          const parsedZod = parseSchema(schema);
          setZodSchema(parsedZod);
        }
      }
    } catch (error) {
      console.error('Failed to load note:', error);
      setContent('# Error\n\nFailed to load note.');
    } finally {
      setLoading(false);
    }
  };

  // Reload note when path changes
  useEffect(() => {
    loadNote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notePath]);

  // Update schema when selection changes
  useEffect(() => {
    if (selectedSchemaId) {
      const schema = getSchemaById(selectedSchemaId);
      if (schema) {
        const parsed = parseSchema(schema);
        setZodSchema(parsed);
        // Update frontmatter with schema field
        setFrontmatter({ ...frontmatter, schema: schema.name });
      }
    } else {
      setZodSchema(null);
    }
  }, [selectedSchemaId, getSchemaById, parseSchema]);

  // Validate frontmatter when it changes
  useEffect(() => {
    if (zodSchema && frontmatter) {
      const result = zodSchema.safeParse(frontmatter);
      if (!result.success) {
        setValidationErrors(result.error);
      } else {
        setValidationErrors(null);
      }
    } else {
      setValidationErrors(null);
    }
  }, [frontmatter, zodSchema]);

  const handleFrontmatterChange = (newFrontmatter: Record<string, any>) => {
    setFrontmatter(newFrontmatter);
    // Update the full content
    const newContent = serializeFrontmatter(newFrontmatter, bodyContent);
    setContent(newContent);
  };

  const handleBodyChange = (newBody: string) => {
    setBodyContent(newBody);
    // Update the full content
    const newContent = serializeFrontmatter(frontmatter, newBody);
    setContent(newContent);
  };

  // Auto-save with debouncing
  useEffect(() => {
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Don't save if content hasn't changed
    if (content === lastSavedContentRef.current) {
      return;
    }

    // Don't save if there are validation errors
    if (zodSchema && validationErrors) {
      return;
    }

    // Don't save if still loading
    if (loading) {
      return;
    }

    // Set status to saving
    setSaveStatus('saving');

    // Debounce the save - wait 800ms after last change
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await window.api.vault.writeFile(notePath, content);
        lastSavedContentRef.current = content;
        setSaveStatus('saved');
        await loadNotes(); // Refresh note list to update timestamps
        
        // Reset to idle after 2 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } catch (error) {
        console.error('Failed to save note:', error);
        setSaveStatus('idle');
        alert('Failed to save note');
      }
    }, 800);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, notePath, zodSchema, validationErrors, loading, loadNotes]);

  // Update lastSavedContentRef when note is loaded
  useEffect(() => {
    if (!loading && content) {
      lastSavedContentRef.current = content;
    }
  }, [loading, notePath]); // Only when note changes, not on every content change

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-gray-200 bg-white">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <h2 className="text-sm font-medium text-gray-700 truncate">{notePath}</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1 rounded hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--theme-text-secondary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
                  e.currentTarget.style.color = 'var(--theme-text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--theme-text-secondary)';
                }}
                title="Close note"
              >
                <FiX size={18} />
              </button>
            )}
            {/* Save status indicator */}
            <div className="text-sm text-gray-500 flex items-center gap-1.5">
              {saveStatus === 'saving' && (
                <>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-xs">Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs">Saved</span>
                </>
              )}
              {saveStatus === 'idle' && validationErrors && (
                <span className="text-xs" style={{ color: 'var(--theme-error)' }}>Validation errors</span>
              )}
            </div>
            {zodSchema && (
              <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">
                {schemas.find(s => s.id === selectedSchemaId)?.name || 'Schema'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Get current selection from editor
                if (editorRef.current) {
                  const selection = editorRef.current.getSelection();
                  if (selection && !selection.isEmpty()) {
                    const model = editorRef.current.getModel();
                    if (model) {
                      const selectedText = model.getValueInRange(selection);
                      const startOffset = model.getOffsetAt(selection.getStartPosition());
                      const endOffset = model.getOffsetAt(selection.getEndPosition());
                      setSelection({ text: selectedText, startOffset, endOffset });
                    }
                  } else {
                    setSelection(null);
                  }
                }
                setIsRefactorModalOpen(true);
              }}
              className="px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 transition-colors"
              style={{
                color: 'var(--theme-text-secondary)',
                border: '1px solid var(--theme-border-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
                e.currentTarget.style.color = 'var(--theme-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--theme-text-secondary)';
              }}
              title="Refactor note (rename, move, or extract selection)"
            >
              <FiScissors size={14} />
              Refactor
            </button>
            <select
              value={selectedSchemaId || ''}
              onChange={(e) => setSelectedSchemaId(e.target.value || null)}
              className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No Schema</option>
              {schemas.map((schema) => (
                <option key={schema.id} value={schema.id}>
                  {schema.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowFrontmatter(!showFrontmatter)}
              className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-1"
            >
              Frontmatter
              {showFrontmatter ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1 transition-colors ${
                  viewMode === 'edit'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="Edit Mode"
              >
                <FiEdit3 size={14} />
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1 transition-colors border-l border-r border-gray-300 ${
                  viewMode === 'split'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="Split View"
              >
                <FiColumns size={14} />
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1 transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="Preview Mode"
              >
                <FiEye size={14} />
              </button>
            </div>
          </div>
        </div>
        {showFrontmatter && (
          <div className="border-t border-gray-200 bg-gray-50 max-h-64 overflow-y-auto">
            <FrontmatterEditor
              frontmatter={frontmatter}
              schema={zodSchema || undefined}
              onChange={handleFrontmatterChange}
              errors={validationErrors || undefined}
            />
          </div>
        )}
        {validationErrors && (
          <div 
            className="px-4 py-2 border-t"
            style={{
              backgroundColor: `color-mix(in srgb, var(--theme-error) 10%, var(--theme-bg-primary))`,
              borderColor: `color-mix(in srgb, var(--theme-error) 30%, var(--theme-bg-primary))`,
            }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--theme-error)' }}>Validation Errors:</p>
            <ul className="text-sm mt-1 list-disc list-inside" style={{ color: 'var(--theme-error)' }}>
              {validationErrors.errors.map((error, i) => (
                <li key={i}>
                  {error.path.join('.')}: {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {viewMode === 'edit' && (
          <div className="flex-1 flex flex-col">
            <MarkdownToolbar editor={editorInstance} />
            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage="markdown-wikilink"
                value={bodyContent}
                onChange={(value) => handleBodyChange(value || '')}
                onMount={handleEditorMount}
                theme={theme ? getMonacoTheme(theme) : (themeId === 'dark' || themeId === 'matrix' ? 'vs-dark' : 'vs')}
                options={{
                  minimap: { enabled: editorSettings.minimap },
                  wordWrap: editorSettings.wordWrap ? 'on' : 'off',
                  fontSize: editorSettings.fontSize,
                  fontFamily: editorSettings.fontFamily,
                  lineNumbers: editorSettings.lineNumbers ? 'on' : 'off',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  autoClosingBrackets: 'always',
                  autoClosingQuotes: 'always',
                  autoIndent: 'full',
                  quickSuggestions: {
                    other: true, // Enable for our wikilink provider
                    comments: false,
                    strings: false,
                  },
                  suggestOnTriggerCharacters: true,
                  acceptSuggestionOnCommitCharacter: true,
                  tabCompletion: 'on',
                  wordBasedSuggestions: 'off', // Disable word-based suggestions (like from code blocks)
                }}
              />
            </div>
          </div>
        )}
        {viewMode === 'preview' && (
          <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--theme-bg-primary)' }}>
            <MarkdownPreview content={bodyContent} />
          </div>
        )}
        {viewMode === 'split' && (
          <>
            <div className="flex-1 flex flex-col border-r border-gray-200">
              <MarkdownToolbar editor={editorInstance} />
              <div className="flex-1">
                <Editor
                  key={theme?.id || themeId}
                  height="100%"
                  defaultLanguage="markdown"
                  value={bodyContent}
                  onChange={(value) => handleBodyChange(value || '')}
                  onMount={handleEditorMount}
                  theme={theme ? getMonacoTheme(theme) : (themeId === 'dark' || themeId === 'matrix' ? 'vs-dark' : 'vs')}
                  options={{
                    minimap: { enabled: editorSettings.minimap },
                    wordWrap: editorSettings.wordWrap ? 'on' : 'off',
                    fontSize: editorSettings.fontSize,
                    fontFamily: editorSettings.fontFamily,
                    lineNumbers: editorSettings.lineNumbers ? 'on' : 'off',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    autoClosingBrackets: 'always',
                    autoClosingQuotes: 'always',
                    autoIndent: 'full',
                    quickSuggestions: {
                      other: true, // Enable for our wikilink provider
                      comments: false,
                      strings: false,
                    },
                    suggestOnTriggerCharacters: true,
                    acceptSuggestionOnCommitCharacter: true,
                    tabCompletion: 'on',
                    wordBasedSuggestions: 'off', // Disable word-based suggestions (like from code blocks)
                  }}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <MarkdownPreview content={bodyContent} />
            </div>
          </>
        )}
      </div>
      {/* Backlinks Panel */}
      <div className="flex-shrink-0">
        <BacklinksPanel 
          noteId={currentNoteId} 
          onNoteClick={(path) => {
            // Navigate to the linked note
            window.dispatchEvent(new CustomEvent('navigate-to-note', { detail: { path } }));
          }}
        />
      </div>
      <RefactorNoteModal
        isOpen={isRefactorModalOpen}
        onClose={() => {
          setIsRefactorModalOpen(false);
          setSelection(null);
        }}
        notePath={notePath}
        noteTitle={notes.find(n => n.path === notePath)?.title || notePath}
        selection={selection}
        onRename={(newPath) => {
          // Navigate to the renamed note
          window.dispatchEvent(new CustomEvent('navigate-to-note', { detail: { path: newPath } }));
        }}
        onMove={(newPath) => {
          // Navigate to the moved note
          window.dispatchEvent(new CustomEvent('navigate-to-note', { detail: { path: newPath } }));
        }}
        onExtract={(newNotePath) => {
          // Navigate to the new extracted note
          window.dispatchEvent(new CustomEvent('navigate-to-note', { detail: { path: newNotePath } }));
        }}
      />
    </div>
  );
}
