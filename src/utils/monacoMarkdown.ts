import type { editor as MonacoEditor } from 'monaco-editor';
import type * as Monaco from 'monaco-editor';

/**
 * Register custom markdown language with wikilink support
 * This ensures wikilinks [[...]] are tokenized correctly
 */
export function registerCustomMarkdownLanguage(monacoInstance: typeof Monaco) {
  // Check if already registered
  if (monacoInstance.languages.getLanguages().find(lang => lang.id === 'markdown-wikilink')) {
    return;
  }

  // Get the base markdown language
  const markdownLanguage = monacoInstance.languages.getLanguages().find(lang => lang.id === 'markdown');
  if (!markdownLanguage) {
    // Fallback: register a basic markdown language with wikilink support
    monacoInstance.languages.register({ id: 'markdown-wikilink' });
    monacoInstance.languages.setMonarchTokensProvider('markdown-wikilink', {
      tokenizer: {
        root: [
          // Wikilinks: [[...]] - use state-based tokenization
          [/\[\[/, { token: 'string.link', next: '@wikilink' }], // Opening [[, enter wikilink state
          // Block references: ((block-id))
          [/\(\([a-zA-Z0-9_-]+\)\)/, 'string.link'], // Block refs
          // Callouts: > [!type]
          [/^>\s+\[![a-zA-Z]+\]/, 'keyword'], // Callout start
          // Regular markdown patterns
          [/^#{1,6}\s+.*$/, 'heading'],
          [/\*\*.*?\*\*/, 'strong'],
          [/\*.*?\*/, 'emphasis'],
          [/`[^`]+`/, 'code'],
          [/\[.*?\]\(.*?\)/, 'link'],
          [/^>\s+.*$/, 'quote'],
          [/^[\*\-\+]\s+.*$/, 'list'],
          [/^\d+\.\s+.*$/, 'list'],
        ],
        wikilink: [
          // Inside a wikilink - match content until we see ]]
          [/\]\]/, { token: 'string.link', next: '@pop' }], // Closing ]], exit wikilink state
          [/[^\]]+/, 'string.link'], // Any content inside wikilink (not containing ])
          [/\]/, 'string.link'], // Single ] inside wikilink (shouldn't happen, but handle it)
        ],
      },
    });
    return;
  }

  // Register custom markdown language that extends base markdown
  monacoInstance.languages.register({ id: 'markdown-wikilink' });
  
  // Set up tokenizer with wikilink support using states
  monacoInstance.languages.setMonarchTokensProvider('markdown-wikilink', {
    tokenizer: {
      root: [
        // Wikilinks: [[...]] - use state-based tokenization
        [/\[\[/, { token: 'string.link', next: '@wikilink' }], // Opening [[, enter wikilink state
        // Block references: ((block-id))
        [/\(\([a-zA-Z0-9_-]+\)\)/, 'string.link'], // Block refs
        // Callouts: > [!type]
        [/^>\s+\[![a-zA-Z]+\]/, 'keyword'], // Callout start
        // Regular markdown patterns
        [/^#{1,6}\s+.*$/, 'heading'],
        [/\*\*.*?\*\*/, 'strong'],
        [/\*.*?\*/, 'emphasis'],
        [/`[^`]+`/, 'code'],
        [/\[.*?\]\(.*?\)/, 'link'],
        [/^>\s+.*$/, 'quote'],
        [/^[\*\-\+]\s+.*$/, 'list'],
        [/^\d+\.\s+.*$/, 'list'],
      ],
      wikilink: [
        // Inside a wikilink - match content until we see ]]
        [/\]\]/, { token: 'string.link', next: '@pop' }], // Closing ]], exit wikilink state
        [/[^\]]+/, 'string.link'], // Any content inside wikilink (not containing ])
        [/\]/, 'string.link'], // Single ] inside wikilink (shouldn't happen, but handle it)
      ],
    },
  });
}

/**
 * Setup wikilink autocomplete in Monaco Editor
 * Works like a search - when typing inside [[...]], shows filtered note suggestions
 */
// Global storage for notes to avoid closure issues
let globalNotes: Array<{ id: string; title: string; path: string }> = [];
let providerDisposable: { dispose: () => void } | null = null;
let keyDownDisposable: { dispose: () => void } | null = null;

export function setupWikilinkAutocomplete(
  monacoInstance: typeof Monaco,
  editor: MonacoEditor.IStandaloneCodeEditor,
  notes: Array<{ id: string; title: string; path: string }>
) {
  // Always dispose existing provider and keyDown handler first to avoid duplicates
  if (providerDisposable) {
    providerDisposable.dispose();
    providerDisposable = null;
  }
  if (keyDownDisposable) {
    keyDownDisposable.dispose();
    keyDownDisposable = null;
  }
  
  // Update global notes
  globalNotes = notes;
  
  // Register a completion item provider for markdown
  const provider: Monaco.languages.CompletionItemProvider = {
    provideCompletionItems: async (
      model: MonacoEditor.ITextModel,
      position: Monaco.Position,
      _ctx: Monaco.languages.CompletionContext,
      _token: Monaco.CancellationToken
    ) => {
      const line = model.getLineContent(position.lineNumber);
      const textUntilPosition = line.substring(0, position.column - 1);
      
      // Check if we're inside a wikilink: [[...]]
      // Look for [[ before cursor, and make sure we haven't closed it with ]]
      const lastBracketIndex = textUntilPosition.lastIndexOf('[');
      const secondLastBracketIndex = lastBracketIndex > 0 ? textUntilPosition.lastIndexOf('[', lastBracketIndex - 1) : -1;
      
      // Check if we're inside [[...]] - we need [[ before cursor and not ]] between [[ and cursor
      let isInsideWikilink = false;
      if (lastBracketIndex !== -1 && secondLastBracketIndex === lastBracketIndex - 1) {
        // We have [[ before cursor, now check if there's a closing ]] before the cursor
        const textAfterBrackets = textUntilPosition.slice(secondLastBracketIndex + 2);
        const closingBracketsIndex = textAfterBrackets.indexOf(']]');
        // If there's no ]] or it's at the end (meaning cursor is right before it), we're inside
        isInsideWikilink = closingBracketsIndex === -1 || closingBracketsIndex === textAfterBrackets.length - 2;
      }
      
      // Check if we're in a code block
      const linesBefore = model.getLinesContent().slice(0, position.lineNumber);
      const textBefore = linesBefore.join('\n');
      const isInCodeBlock = textBefore.split('```').length % 2 === 0; // Even number means we're inside a code block
      
      if (isInCodeBlock || !isInsideWikilink) {
        return { suggestions: [] };
      }
      
      if (!globalNotes || globalNotes.length === 0) {
        return { suggestions: [] };
      }
      
      // Extract query inside [[...|cursor]]
      const linkStart = secondLastBracketIndex;
      const queryRaw = textUntilPosition.slice(linkStart + 2); // after [[
      const query = queryRaw.trim();
      
      // Create range for replacement
      const range = new monacoInstance.Range(
        position.lineNumber,
        linkStart + 3, // after "[["
        position.lineNumber,
        position.column
      );
      
      // Filter notes by query - use a Set to ensure uniqueness
      const seen = new Set<string>();
      const filtered = globalNotes.filter((n) => {
        // Deduplicate by note ID
        if (seen.has(n.id)) {
          return false;
        }
        seen.add(n.id);
        
        const title = n.title ?? '';
        const path = n.path ?? '';
        const lc = query.toLowerCase();
        return (
          lc.length === 0 ||
          title.toLowerCase().includes(lc) ||
          path.toLowerCase().includes(lc)
        );
      });
      
      // If no matches, show all notes (also deduplicated)
      const allNotesDeduped = globalNotes.filter((n, index, self) => 
        index === self.findIndex(note => note.id === n.id)
      );
      
      const finalList = (filtered.length > 0 ? filtered : allNotesDeduped).map((note) => {
        const pathWithoutExtension = note.path.replace(/\.md$/, '');
        
        return {
          label: {
            label: pathWithoutExtension, // Show full path as the main label
            description: note.title, // Show title as description
          },
          kind: monacoInstance.languages.CompletionItemKind.File,
          insertText: note.title, // Insert the note title for wikilink resolution
          range,
          detail: `Title: ${note.title}`,
        } as Monaco.languages.CompletionItem;
      });
      
      // Final deduplication by label to ensure no duplicates
      const seenLabels = new Set<string>();
      const uniqueSuggestions = finalList.filter((suggestion) => {
        const label = typeof suggestion.label === 'string' 
          ? suggestion.label 
          : suggestion.label?.label || '';
        if (seenLabels.has(label)) {
          return false;
        }
        seenLabels.add(label);
        return true;
      });
      
      return { suggestions: uniqueSuggestions };
    },
    // Trigger on any character when inside [[...]]
    triggerCharacters: ['[', ' '],
  };
  
  // Register the provider for both markdown and markdown-wikilink
  providerDisposable = monacoInstance.languages.registerCompletionItemProvider('markdown-wikilink', provider);
  
  // Wrap in a disposable that also clears the global reference
  const disposable = {
    dispose: () => {
      providerDisposable?.dispose();
      providerDisposable = null;
      keyDownDisposable?.dispose();
      keyDownDisposable = null;
      globalNotes = [];
    }
  };
  
  // Trigger autocomplete when typing the second [ or any character inside [[...]]
  keyDownDisposable = editor.onKeyDown((e) => {
    const model = editor.getModel();
    if (!model) return;
    
    const selection = editor.getSelection();
    if (!selection || !selection.isEmpty()) return;
    
    const position = selection.getStartPosition();
    const line = model.getLineContent(position.lineNumber);
    const column = position.column;
    const textUntilPosition = line.substring(0, column - 1);
    
    // Check if we're inside a wikilink
    const lastBracketIndex = textUntilPosition.lastIndexOf('[');
    const secondLastBracketIndex = lastBracketIndex > 0 ? textUntilPosition.lastIndexOf('[', lastBracketIndex - 1) : -1;
    
    // Check if we're actually inside a complete wikilink (need to check for closing brackets)
    // We need [[ before cursor AND no ]] between [[ and cursor
    let isInsideWikilink = false;
    if (lastBracketIndex !== -1 && secondLastBracketIndex === lastBracketIndex - 1) {
      // We have [[ before cursor, now check if there's a closing ]] before the cursor
      const textAfterBrackets = textUntilPosition.slice(secondLastBracketIndex + 2);
      const closingBracketsIndex = textAfterBrackets.indexOf(']]');
      // If there's no ]] or it's at the end (meaning cursor is right before it), we're inside
      isInsideWikilink = closingBracketsIndex === -1 || closingBracketsIndex === textAfterBrackets.length - 2;
    }
    
    // Check if we're in a code block
    const fullText = model.getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    });
    const codeBlockMatches = fullText.match(/```/g);
    const isInCodeBlock = codeBlockMatches && codeBlockMatches.length % 2 === 1;
    
    // Trigger autocomplete when:
    // Typing any character inside [[...]] AFTER both brackets are complete (but not in code blocks)
    // Don't trigger on the second '[' itself - wait until user starts typing inside
    if (isInsideWikilink && !isInCodeBlock && e.browserEvent.key.length === 1 && !e.browserEvent.ctrlKey && !e.browserEvent.metaKey && !e.browserEvent.altKey && e.browserEvent.key !== '[') {
      // Typing inside wikilink - trigger after a short delay to let character be inserted
      setTimeout(() => {
        editor.trigger('wikilink-autocomplete', 'editor.action.triggerSuggest', {});
      }, 100);
    }
  });
  
  return disposable;
}

/**
 * Setup auto-pairing for Markdown syntax in Monaco Editor
 */
export function setupMarkdownAutoPairing(editor: MonacoEditor.IStandaloneCodeEditor) {
  // Define Markdown pairs: opening -> closing
  const pairs: Record<string, string> = {
    '*': '*',
    '_': '_',
    '`': '`',
    '[': ']',
    '(': ')',
    '{': '}',
    '"': '"',
    // Removed single quote - too annoying for contractions like "that's"
  };

  // Handle auto-pairing on key press
  editor.onKeyDown((e) => {
    const model = editor.getModel();
    if (!model) return;

    const selection = editor.getSelection();
    if (!selection || !selection.isEmpty()) return;

    const position = selection.getStartPosition();
    const lineNumber = position.lineNumber;
    const column = position.column;
    const line = model.getLineContent(lineNumber);
    const charBefore = column > 1 ? line[column - 2] : '';

    // Check if we're typing an opening pair
    const typedChar = e.browserEvent.key;
    if (pairs[typedChar]) {
      const closingChar = pairs[typedChar];
      
      // Special handling for * (bold) - only auto-pair when typing the second *
      // First *: just insert it, don't pair
      // Second * (when * is before): insert * and closing **, place cursor between them
      if (typedChar === '*') {
        if (charBefore === '*') {
          // We're typing the second *, so we want **text**
          // Insert * (the typed one) and ** (the closing pair), cursor between them
          e.preventDefault();
          e.stopPropagation();
          
          const edit = {
            range: {
              startLineNumber: lineNumber,
              startColumn: column,
              endLineNumber: lineNumber,
              endColumn: column,
            },
            text: '*' + closingChar + closingChar,
          };
          editor.executeEdits('markdown-auto-pair-bold', [edit]);
          // Move cursor back one position to be between the **
          editor.setPosition({ lineNumber, column: column + 1 });
          return;
        }
        // If charBefore is not *, just let it insert normally (no auto-pairing)
        return;
      }
      
      // Special handling for _ (italic) - only auto-pair when typing the second _
      if (typedChar === '_') {
        if (charBefore === '_') {
          e.preventDefault();
          e.stopPropagation();
          
          const edit = {
            range: {
              startLineNumber: lineNumber,
              startColumn: column,
              endLineNumber: lineNumber,
              endColumn: column,
            },
            text: '_' + closingChar,
          };
          editor.executeEdits('markdown-auto-pair-italic', [edit]);
          editor.setPosition({ lineNumber, column: column + 1 });
          return;
        }
        return;
      }
      
      // Special handling for ` (code) - only auto-pair when typing the second `
      if (typedChar === '`') {
        if (charBefore === '`') {
          e.preventDefault();
          e.stopPropagation();
          
          const edit = {
            range: {
              startLineNumber: lineNumber,
              startColumn: column,
              endLineNumber: lineNumber,
              endColumn: column,
            },
            text: '`' + closingChar,
          };
          editor.executeEdits('markdown-auto-pair-code', [edit]);
          editor.setPosition({ lineNumber, column: column + 1 });
          return;
        }
        return;
      }
      
      // Special handling for [ (brackets) - check if we're typing [[ for wikilinks
      if (typedChar === '[') {
        if (charBefore === '[') {
          // We're typing the second [, so we want [[text]]
          // Insert [ and ]], place cursor between them
          e.preventDefault();
          e.stopPropagation();
          
          const edit = {
            range: {
              startLineNumber: lineNumber,
              startColumn: column,
              endLineNumber: lineNumber,
              endColumn: column,
            },
            text: '[' + ']]',
          };
          editor.executeEdits('markdown-auto-pair-wikilink', [edit]);
          // Move cursor back one position to be between the [[ and ]]
          editor.setPosition({ lineNumber, column: column + 1 });
          return;
        }
        // For single [, just insert normally with auto-pairing
      }
      
      // For other pairs (quotes), auto-pair normally
      const charAfter = column <= line.length ? line[column - 1] : '';
      
      // Skip auto-pairing if closing char already exists
      if (charAfter === closingChar) {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      const edit = {
        range: {
          startLineNumber: lineNumber,
          startColumn: column,
          endLineNumber: lineNumber,
          endColumn: column,
        },
        text: typedChar + closingChar,
      };
      editor.executeEdits('markdown-auto-pair', [edit]);
      editor.setPosition({ lineNumber, column: column + 1 });
    }
    
    // Handle backspace to delete pairs together
    if (e.browserEvent.key === 'Backspace') {
      const charBefore = column > 1 ? line[column - 2] : '';
      const charAtCursor = column <= line.length ? line[column - 1] : '';
      
      // Check if we're deleting one half of a pair
      for (const [open, close] of Object.entries(pairs)) {
        if (charBefore === open && charAtCursor === close) {
          e.preventDefault();
          e.stopPropagation();
          
          const edit = {
            range: {
              startLineNumber: lineNumber,
              startColumn: column - 1,
              endLineNumber: lineNumber,
              endColumn: column + 1,
            },
            text: '',
          };
          editor.executeEdits('markdown-auto-pair-delete', [edit]);
          return;
        }
      }
    }
  });
}
