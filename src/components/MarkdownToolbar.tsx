import { useRef, useEffect } from 'react';
import type { editor as MonacoEditor } from 'monaco-editor';
import {
  FiBold,
  FiItalic,
  FiCode,
  FiType,
  FiList,
  FiLink,
  FiMinus,
  FiMessageSquare,
  FiHash,
} from 'react-icons/fi';

interface MarkdownToolbarProps {
  editor: MonacoEditor.IStandaloneCodeEditor | null;
}

export function MarkdownToolbar({ editor }: MarkdownToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Helper function to get current selection
  const getSelection = () => {
    if (!editor) return null;
    const selection = editor.getSelection();
    if (!selection) return null;
    return selection;
  };

  // Helper function to get selected text
  const getSelectedText = () => {
    if (!editor) return '';
    const selection = getSelection();
    if (!selection || selection.isEmpty()) return '';
    const model = editor.getModel();
    if (!model) return '';
    return model.getValueInRange(selection);
  };

  // Helper function to insert text at cursor or replace selection
  const insertText = (before: string, after: string = '', placeholder: string = '') => {
    if (!editor) return;
    
    const selection = getSelection();
    if (!selection) return;
    
    const model = editor.getModel();
    if (!model) return;

    const selectedText = getSelectedText();
    const hasSelection = !selection.isEmpty();

    let textToInsert: string;
    let newCursorPosition: MonacoEditor.IPosition;

    if (hasSelection) {
      // Replace selected text
      textToInsert = before + selectedText + after;
      newCursorPosition = {
        lineNumber: selection.endLineNumber,
        column: selection.endColumn + before.length + selectedText.length + after.length,
      };
    } else {
      // Insert at cursor with placeholder
      const placeholderText = placeholder || 'text';
      textToInsert = before + placeholderText + after;
      const startColumn = selection.startColumn;
      newCursorPosition = {
        lineNumber: selection.startLineNumber,
        column: startColumn + before.length + placeholderText.length,
      };
    }

    editor.executeEdits('markdown-format', [
      {
        range: selection,
        text: textToInsert,
      },
    ]);

    // Set cursor position (in the middle if no selection, at the end if selection)
    if (!hasSelection) {
      // Place cursor in the middle of the inserted text
      editor.setPosition({
        lineNumber: selection.startLineNumber,
        column: selection.startColumn + before.length + (placeholder || 'text').length,
      });
      // Select the placeholder text so user can type over it
      editor.setSelection({
        startLineNumber: selection.startLineNumber,
        startColumn: selection.startColumn + before.length,
        endLineNumber: selection.startLineNumber,
        endColumn: selection.startColumn + before.length + (placeholder || 'text').length,
      });
    } else {
      // Place cursor after the formatted text
      editor.setPosition(newCursorPosition);
    }

    editor.focus();
  };

  // Formatting functions
  const formatBold = () => {
    insertText('**', '**', 'bold text');
  };

  const formatItalic = () => {
    insertText('*', '*', 'italic text');
  };

  const formatCode = () => {
    if (!editor) return;
    
    const selection = getSelection();
    if (!selection) return;
    
    const model = editor.getModel();
    if (!model) return;

    const selectedText = getSelectedText();
    const hasSelection = !selection.isEmpty();
    
    if (hasSelection && !selectedText.includes('\n')) {
      // If single line text is selected, wrap with backticks
      insertText('`', '`');
      return;
    }
    
    // If no selection or multi-line, insert code block
    let textToInsert: string;
    if (hasSelection) {
      // Wrap selected text in code block
      textToInsert = '```\n' + selectedText + '\n```';
    } else {
      // Insert code block template
      textToInsert = '```\ncode\n```';
    }

    editor.executeEdits('markdown-code', [
      {
        range: selection,
        text: textToInsert,
      },
    ]);

    if (hasSelection) {
      // Place cursor after the code block
      editor.setPosition({
        lineNumber: selection.endLineNumber + 2,
        column: 1,
      });
    } else {
      // Select "code" text
      editor.setSelection({
        startLineNumber: selection.startLineNumber + 1,
        startColumn: 1,
        endLineNumber: selection.startLineNumber + 1,
        endColumn: 5,
      });
    }

    editor.focus();
  };

  const formatHeading = (level: number) => {
    if (!editor) return;
    
    const selection = getSelection();
    if (!selection) return;
    
    const model = editor.getModel();
    if (!model) return;

    const selectedText = getSelectedText();
    const hasSelection = !selection.isEmpty();
    const lineNumber = selection.startLineNumber;
    const line = model.getLineContent(lineNumber);
    
    // Check if line already starts with #
    const existingHeadingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    const prefix = '#'.repeat(level) + ' ';

    if (hasSelection) {
      // If text is selected, replace the entire line with heading
      const lineStart = 1;
      const lineEnd = line.length + 1;
      
      // Extract just the text content (remove existing heading markers if any)
      let textContent = selectedText.trim();
      if (existingHeadingMatch) {
        textContent = existingHeadingMatch[2].trim();
      }
      
      editor.executeEdits('markdown-heading', [
        {
          range: {
            startLineNumber: lineNumber,
            startColumn: lineStart,
            endLineNumber: lineNumber,
            endColumn: lineEnd,
          },
          text: prefix + textContent,
        },
      ]);
      
      editor.setPosition({
        lineNumber: lineNumber,
        column: prefix.length + textContent.length + 1,
      });
    } else {
      // No selection - check if we're on a line with existing heading
      if (existingHeadingMatch) {
        // Replace existing heading level
        const textContent = existingHeadingMatch[2];
        editor.executeEdits('markdown-heading', [
          {
            range: {
              startLineNumber: lineNumber,
              startColumn: 1,
              endLineNumber: lineNumber,
              endColumn: line.length + 1,
            },
            text: prefix + textContent,
          },
        ]);
        editor.setPosition({
          lineNumber: lineNumber,
          column: prefix.length + textContent.length + 1,
        });
      } else {
        // Insert heading at start of line
        const lineStart = 1;
        const lineEnd = line.length + 1;
        const textContent = line.trim() || 'Heading';
        
        editor.executeEdits('markdown-heading', [
          {
            range: {
              startLineNumber: lineNumber,
              startColumn: lineStart,
              endLineNumber: lineNumber,
              endColumn: lineEnd,
            },
            text: prefix + textContent,
          },
        ]);
        
        // Select the text part if it was "Heading"
        if (!line.trim()) {
          editor.setSelection({
            startLineNumber: lineNumber,
            startColumn: prefix.length + 1,
            endLineNumber: lineNumber,
            endColumn: prefix.length + 1 + 'Heading'.length,
          });
        } else {
          editor.setPosition({
            lineNumber: lineNumber,
            column: prefix.length + textContent.length + 1,
          });
        }
      }
    }

    editor.focus();
  };

  const formatList = (ordered: boolean = false) => {
    if (!editor) return;
    
    const selection = getSelection();
    if (!selection) return;
    
    const model = editor.getModel();
    if (!model) return;

    const selectedText = getSelectedText();
    const hasSelection = !selection.isEmpty();

    if (hasSelection && selection.startLineNumber !== selection.endLineNumber) {
      // Multiple lines selected - convert each line to list item
      const lines: string[] = [];
      for (let i = selection.startLineNumber; i <= selection.endLineNumber; i++) {
        const line = model.getLineContent(i);
        const trimmed = line.trim();
        if (trimmed) {
          const prefix = ordered ? `${i - selection.startLineNumber + 1}. ` : '- ';
          lines.push(prefix + trimmed);
        }
      }
      
      const startLine = model.getLineContent(selection.startLineNumber);
      const startColumn = 1;
      const endLine = model.getLineContent(selection.endLineNumber);
      const endColumn = endLine.length + 1;
      
      editor.executeEdits('markdown-list', [
        {
          range: {
            startLineNumber: selection.startLineNumber,
            startColumn,
            endLineNumber: selection.endLineNumber,
            endColumn,
          },
          text: lines.join('\n'),
        },
      ]);
    } else {
      // Single line or no selection
      const prefix = ordered ? '1. ' : '- ';
      insertText(prefix, '', 'List item');
    }

    editor.focus();
  };

  const formatLink = () => {
    const selectedText = getSelectedText();
    if (selectedText) {
      // If text is selected, wrap with link syntax
      insertText('[', '](url)', selectedText);
    } else {
      // If no selection, insert link template
      insertText('[', '](url)', 'link text');
    }
  };

  const formatBlockquote = () => {
    if (!editor) return;
    
    const selection = getSelection();
    if (!selection) return;
    
    const model = editor.getModel();
    if (!model) return;

    const selectedText = getSelectedText();
    const hasSelection = !selection.isEmpty();

    if (hasSelection && selection.startLineNumber !== selection.endLineNumber) {
      // Multiple lines - add > to each line
      const lines: string[] = [];
      for (let i = selection.startLineNumber; i <= selection.endLineNumber; i++) {
        const line = model.getLineContent(i);
        lines.push('> ' + line);
      }
      
      const startLine = model.getLineContent(selection.startLineNumber);
      const startColumn = 1;
      const endLine = model.getLineContent(selection.endLineNumber);
      const endColumn = endLine.length + 1;
      
      editor.executeEdits('markdown-blockquote', [
        {
          range: {
            startLineNumber: selection.startLineNumber,
            startColumn,
            endLineNumber: selection.endLineNumber,
            endColumn,
          },
          text: lines.join('\n'),
        },
      ]);
    } else {
      // Single line or no selection
      insertText('> ', '', 'Quote');
    }

    editor.focus();
  };

  const formatHorizontalRule = () => {
    if (!editor) return;
    
    const selection = getSelection();
    if (!selection) return;
    
    const model = editor.getModel();
    if (!model) return;

    const lineNumber = selection.startLineNumber;
    const line = model.getLineContent(lineNumber);
    const isEmpty = line.trim() === '';

    let insertLine: number;
    let insertColumn: number;

    if (isEmpty) {
      // Insert on current line
      insertLine = lineNumber;
      insertColumn = 1;
    } else {
      // Insert on new line after current line
      insertLine = lineNumber + 1;
      insertColumn = 1;
    }

    const hrText = isEmpty ? '---\n' : '\n---\n';

    editor.executeEdits('markdown-hr', [
      {
        range: {
          startLineNumber: insertLine,
          startColumn,
          endLineNumber: insertLine,
          endColumn: insertColumn,
        },
        text: hrText,
      },
    ]);

    // Move cursor after the horizontal rule
    editor.setPosition({
      lineNumber: insertLine + (isEmpty ? 0 : 1),
      column: 1,
    });
    editor.focus();
  };

  // Special formatting functions
  const formatWikilink = () => {
    const selectedText = getSelectedText();
    if (selectedText) {
      // If text is selected, wrap with wikilink syntax
      insertText('[[', ']]', selectedText);
    } else {
      // If no selection, insert wikilink template
      insertText('[[', ']]', 'Note Name');
    }
  };

  const formatBlockReference = () => {
    insertText('((', '))', 'block-id');
  };

  const formatCallout = () => {
    if (!editor) return;
    
    const selection = getSelection();
    if (!selection) return;
    
    const model = editor.getModel();
    if (!model) return;

    const selectedText = getSelectedText();
    const hasSelection = !selection.isEmpty();

    const calloutText = hasSelection
      ? `> [!note]\n> ${selectedText.split('\n').join('\n> ')}`
      : `> [!note]\n> Callout content`;

    editor.executeEdits('markdown-callout', [
      {
        range: selection,
        text: calloutText,
      },
    ]);

    if (hasSelection) {
      editor.setPosition({
        lineNumber: selection.endLineNumber + 1,
        column: 1,
      });
    } else {
      // Select "Callout content"
      editor.setSelection({
        startLineNumber: selection.startLineNumber + 1,
        startColumn: 3,
        endLineNumber: selection.startLineNumber + 1,
        endColumn: 3 + 'Callout content'.length,
      });
    }

    editor.focus();
  };

  if (!editor) {
    return null;
  }

  return (
    <div
      ref={toolbarRef}
      className="flex items-center gap-1 p-2 border-b"
      style={{
        backgroundColor: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-primary)',
      }}
    >
      {/* Standard formatting */}
      <div className="flex items-center gap-1 pr-2 border-r" style={{ borderColor: 'var(--theme-border-primary)' }}>
        <button
          onClick={formatBold}
          className="p-2 rounded transition-colors"
          style={{
            color: 'var(--theme-text-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Bold (Ctrl+B)"
        >
          <FiBold size={16} />
        </button>
        <button
          onClick={formatItalic}
          className="p-2 rounded transition-colors"
          style={{
            color: 'var(--theme-text-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Italic (Ctrl+I)"
        >
          <FiItalic size={16} />
        </button>
        <button
          onClick={formatCode}
          className="p-2 rounded transition-colors"
          style={{
            color: 'var(--theme-text-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Code / Code Block"
        >
          <FiCode size={16} />
        </button>
      </div>

      {/* Headings */}
      <div className="flex items-center gap-1 pr-2 border-r" style={{ borderColor: 'var(--theme-border-primary)' }}>
        <button
          onClick={() => formatHeading(1)}
          className="p-2 rounded transition-colors"
          style={{
            color: 'var(--theme-text-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Heading 1"
        >
          <FiType size={16} />
          <span className="ml-1 text-xs">1</span>
        </button>
        <button
          onClick={() => formatHeading(2)}
          className="p-2 rounded transition-colors"
          style={{
            color: 'var(--theme-text-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Heading 2"
        >
          <FiType size={16} />
          <span className="ml-1 text-xs">2</span>
        </button>
        <button
          onClick={() => formatHeading(3)}
          className="p-2 rounded transition-colors"
          style={{
            color: 'var(--theme-text-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Heading 3"
        >
          <FiType size={16} />
          <span className="ml-1 text-xs">3</span>
        </button>
      </div>

      {/* Lists and other */}
      <div className="flex items-center gap-1 pr-2 border-r" style={{ borderColor: 'var(--theme-border-primary)' }}>
        <button
          onClick={() => formatList(false)}
          className="p-2 rounded transition-colors"
          style={{
            color: 'var(--theme-text-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Bullet List"
        >
          <FiList size={16} />
        </button>
        <button
          onClick={() => formatList(true)}
          className="p-2 rounded transition-colors"
          style={{
            color: 'var(--theme-text-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Numbered List"
        >
          <FiList size={16} />
          <span className="ml-1 text-xs">#</span>
        </button>
        <button
          onClick={formatLink}
          className="p-2 rounded transition-colors"
          style={{
            color: 'var(--theme-text-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Link"
        >
          <FiLink size={16} />
        </button>
        <button
          onClick={formatBlockquote}
          className="p-2 rounded transition-colors"
          style={{
            color: 'var(--theme-text-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Blockquote"
        >
          <FiMessageSquare size={16} />
        </button>
        <button
          onClick={formatHorizontalRule}
          className="p-2 rounded transition-colors"
          style={{
            color: 'var(--theme-text-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Horizontal Rule"
        >
          <FiMinus size={16} />
        </button>
      </div>

      {/* Special options */}
      <div className="flex items-center gap-1">
        <button
          onClick={formatWikilink}
          className="p-2 rounded transition-colors"
          style={{
            color: 'var(--theme-text-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Wikilink [[Note Name]]"
        >
          <FiLink size={16} />
          <span className="ml-1 text-xs">[[</span>
        </button>
        <button
          onClick={formatBlockReference}
          className="p-2 rounded transition-colors"
          style={{
            color: 'var(--theme-text-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Block Reference ((block-id))"
        >
          <FiHash size={16} />
          <span className="ml-1 text-xs">((</span>
        </button>
        <button
          onClick={formatCallout}
          className="p-2 rounded transition-colors"
          style={{
            color: 'var(--theme-text-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Callout > [!note]"
        >
          <FiMessageSquare size={16} />
          <span className="ml-1 text-xs">!</span>
        </button>
      </div>
    </div>
  );
}

