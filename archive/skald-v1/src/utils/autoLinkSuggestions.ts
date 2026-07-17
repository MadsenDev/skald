import type { editor as MonacoEditor } from 'monaco-editor';
import type * as Monaco from 'monaco-editor';

interface LinkSuggestion {
  noteId: string;
  title: string;
  path: string;
  matchText: string;
  startOffset: number;
  endOffset: number;
}

// Global state for the suggestion
let currentSuggestion: LinkSuggestion | null = null;
let suggestionDisposable: { dispose: () => void } | null = null;
let lastSuggestionTime = 0;
const SUGGESTION_COOLDOWN = 2000; // 2 seconds between suggestions
const MIN_WORDS_FOR_SUGGESTION = 2; // Minimum words to analyze
const MAX_WORDS_TO_ANALYZE = 5; // Maximum words to look back

/**
 * Extract last N words from text before cursor
 */
function extractLastWords(text: string, maxWords: number): string {
  // Remove markdown syntax, code blocks, and wikilinks
  const cleaned = text
    .replace(/\[\[.*?\]\]/g, '') // Remove existing wikilinks
    .replace(/`[^`]+`/g, '') // Remove code spans
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/[#*_~`\[\](){}]/g, ' ') // Remove markdown syntax
    .trim();
  
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return '';
  
  // Get last N words
  const start = Math.max(0, words.length - maxWords);
  return words.slice(start).join(' ').toLowerCase();
}

/**
 * Simple fuzzy match score
 */
function scoreMatch(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match gets highest score
  if (textLower === queryLower) return 100;
  
  // Starts with query
  if (textLower.startsWith(queryLower)) return 80;
  
  // Contains query
  if (textLower.includes(queryLower)) return 60;
  
  // Word boundary match
  const words = textLower.split(/\s+/);
  const queryWords = queryLower.split(/\s+/);
  let score = 0;
  for (const qw of queryWords) {
    for (const tw of words) {
      if (tw === qw) score += 20;
      else if (tw.startsWith(qw)) score += 10;
      else if (tw.includes(qw)) score += 5;
    }
  }
  
  return score;
}

/**
 * Find best matching note for text
 */
async function findBestMatch(text: string, currentNoteId: string | null): Promise<LinkSuggestion | null> {
  if (text.length < 3) return null; // Too short
  
  try {
    // Get all documents from search index
    const allDocs = await window.api.search.getAll();
    
    // Filter to only notes (not tasks) and exclude current note
    const notes = allDocs.filter((doc: any) => 
      doc.type === 'note' && 
      doc.noteId !== currentNoteId &&
      doc.title && 
      doc.title.trim().length > 0
    );
    
    if (notes.length === 0) return null;
    
    // Score each note
    const scored = notes.map((note: any) => {
      const titleScore = scoreMatch(text, note.title);
      const pathScore = scoreMatch(text, note.path);
      const headingScore = Math.max(...(note.headings || []).map((h: string) => scoreMatch(text, h)));
      
      // Weight: title > headings > path
      const totalScore = titleScore * 3 + headingScore * 2 + pathScore;
      
      return {
        note,
        score: totalScore,
      };
    });
    
    // Sort by score and get best match
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    
    // Only suggest if score is above threshold
    if (best.score < 30) return null;
    
    // Find the matching text in the original query
    const matchText = best.note.title;
    
    return {
      noteId: best.note.noteId,
      title: best.note.title,
      path: best.note.path,
      matchText,
      startOffset: 0, // Will be calculated when we know the position
      endOffset: 0,
    };
  } catch (error) {
    console.error('Error finding link suggestion:', error);
    return null;
  }
}

/**
 * Setup automatic link suggestions
 */
export function setupAutoLinkSuggestions(
  editor: MonacoEditor.IStandaloneCodeEditor,
  currentNoteId: string | null,
  enabled: boolean = true,
  monacoInstance?: typeof Monaco
): { dispose: () => void } {
  // Dispose existing
  if (suggestionDisposable) {
    suggestionDisposable.dispose();
  }
  
  if (!enabled) {
    return { dispose: () => {} };
  }
  
  let debounceTimer: NodeJS.Timeout | null = null;
  let decorationId: string | null = null;
  
  const checkForSuggestion = async (position: Monaco.Position) => {
    const model = editor.getModel();
    if (!model) return;
    
    // Clear existing suggestion
    if (decorationId) {
      editor.deltaDecorations([decorationId], []);
      decorationId = null;
    }
    currentSuggestion = null;
    
    // Check cooldown
    const now = Date.now();
    if (now - lastSuggestionTime < SUGGESTION_COOLDOWN) {
      return;
    }
    
    // Get text before cursor
    const offset = model.getOffsetAt(position);
    const textBefore = model.getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    });
    
    // Check if we're in a code block or existing wikilink
    const linesBefore = model.getLinesContent().slice(0, position.lineNumber);
    const textBeforeLines = linesBefore.join('\n');
    const isInCodeBlock = textBeforeLines.split('```').length % 2 === 0;
    
    // Check if cursor is inside existing wikilink
    const lineBefore = model.getLineContent(position.lineNumber);
    const textUntilCursor = lineBefore.substring(0, position.column - 1);
    const lastBracketIndex = textUntilCursor.lastIndexOf('[');
    const secondLastBracketIndex = lastBracketIndex > 0 ? textUntilCursor.lastIndexOf('[', lastBracketIndex - 1) : -1;
    const isInWikilink = lastBracketIndex !== -1 && 
                         secondLastBracketIndex === lastBracketIndex - 1 &&
                         !textUntilCursor.substring(secondLastBracketIndex + 2).includes(']]');
    
    if (isInCodeBlock || isInWikilink) {
      return;
    }
    
    // Extract last words
    const lastWords = extractLastWords(textBefore, MAX_WORDS_TO_ANALYZE);
    if (lastWords.split(/\s+/).length < MIN_WORDS_FOR_SUGGESTION) {
      return;
    }
    
    // Check if last character is space or punctuation (suggest after word completion)
    const lastChar = textBefore[textBefore.length - 1];
    if (lastChar && !/\s[.,!?;:]/.test(lastChar)) {
      return; // Still typing a word
    }
    
    // Find best match
    const suggestion = await findBestMatch(lastWords, currentNoteId);
    if (!suggestion) return;
    
    // Find the matching text in the line
    const currentLine = model.getLineContent(position.lineNumber);
    const words = currentLine.split(/\s+/);
    let matchStart = -1;
    let matchEnd = -1;
    
    // Try to find the matching words in the current line
    const suggestionWords = suggestion.matchText.toLowerCase().split(/\s+/);
    for (let i = words.length - 1; i >= 0; i--) {
      const wordLower = words[i].toLowerCase().replace(/[.,!?;:]/g, '');
      if (suggestionWords.includes(wordLower)) {
        // Found a match, try to find the full phrase
        let matchedWords = 0;
        let j = i;
        for (let k = suggestionWords.length - 1; k >= 0 && j >= 0; k--, j--) {
          const w = words[j].toLowerCase().replace(/[.,!?;:]/g, '');
          if (w === suggestionWords[k] || suggestionWords[k].includes(w) || w.includes(suggestionWords[k])) {
            matchedWords++;
          } else {
            break;
          }
        }
        
        if (matchedWords >= Math.min(2, suggestionWords.length)) {
          // Calculate positions
          let charCount = 0;
          for (let k = 0; k < j + 1; k++) {
            charCount += words[k].length + (k > 0 ? 1 : 0); // +1 for space
          }
          matchStart = charCount;
          matchEnd = charCount + words.slice(j + 1, i + 1).join(' ').length;
          break;
        }
      }
    }
    
    if (matchStart === -1) {
      // Fallback: use last 2-3 words
      const lineWords = currentLine.trim().split(/\s+/);
      if (lineWords.length >= 2) {
        const startWord = Math.max(0, lineWords.length - 3);
        let charCount = 0;
        for (let k = 0; k < startWord; k++) {
          charCount += lineWords[k].length + 1;
        }
        matchStart = charCount;
        matchEnd = currentLine.length;
      } else {
        return;
      }
    }
    
    // Update suggestion with actual positions
    suggestion.startOffset = model.getOffsetAt({
      lineNumber: position.lineNumber,
      column: matchStart + 1,
    });
    suggestion.endOffset = model.getOffsetAt({
      lineNumber: position.lineNumber,
      column: matchEnd + 1,
    });
    
    currentSuggestion = suggestion;
    lastSuggestionTime = now;
    
    // Show inline decoration
    if (!monacoInstance) return;
    
    const range = new monacoInstance.Range(
      position.lineNumber,
      matchStart + 1,
      position.lineNumber,
      matchEnd + 1
    );
    
    decorationId = editor.deltaDecorations([], [{
      range,
      options: {
        inlineClassName: 'auto-link-suggestion-highlight',
        hoverMessage: {
          value: `Press Tab to link to **${suggestion.title}**`,
        },
      },
    }])[0];
  };
  
  // Listen for cursor position changes and typing
  const model = editor.getModel();
  if (!model) {
    return { dispose: () => {} };
  }
  
  const positionChangeDisposable = editor.onDidChangeCursorPosition((e) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      checkForSuggestion(e.position);
    }, 500); // Debounce 500ms after cursor stops moving
  });
  
  const contentChangeDisposable = editor.onDidChangeModelContent(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      const position = editor.getPosition();
      if (position) {
        checkForSuggestion(position);
      }
    }, 800); // Longer debounce for content changes
  });
  
  // Handle Tab key to accept suggestion
  const keyDownDisposable = editor.onKeyDown((e) => {
    if (currentSuggestion && e.browserEvent.key === 'Tab' && !e.browserEvent.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      
      const model = editor.getModel();
      if (!model) return;
      
      // Replace the text with wikilink
      if (!monacoInstance) return;
      
      const range = new monacoInstance.Range(
        model.getPositionAt(currentSuggestion.startOffset),
        model.getPositionAt(currentSuggestion.endOffset)
      );
      
      const wikilink = `[[${currentSuggestion.title}]]`;
      editor.executeEdits('auto-link-suggestion', [{
        range,
        text: wikilink,
      }]);
      
      // Clear suggestion
      if (decorationId) {
        editor.deltaDecorations([decorationId], []);
        decorationId = null;
      }
      currentSuggestion = null;
    } else if (e.browserEvent.key.length === 1) {
      // Any typing clears the suggestion
      if (decorationId) {
        editor.deltaDecorations([decorationId], []);
        decorationId = null;
      }
      currentSuggestion = null;
    }
  });
  
  suggestionDisposable = {
    dispose: () => {
      positionChangeDisposable.dispose();
      contentChangeDisposable.dispose();
      keyDownDisposable.dispose();
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      if (decorationId) {
        editor.deltaDecorations([decorationId], []);
      }
      currentSuggestion = null;
    },
  };
  
  return suggestionDisposable;
}

