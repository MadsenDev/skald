import { useEffect, useState, useRef } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  $getRoot, 
  $getSelection, 
  $isRangeSelection, 
  FORMAT_TEXT_COMMAND,
  $createParagraphNode,
} from 'lexical';
import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode, $isHeadingNode, $isQuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, $isListNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { CodeNode, CodeHighlightNode, $createCodeNode, $isCodeNode } from '@lexical/code';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { 
  $convertFromMarkdownString, 
  $convertToMarkdownString, 
  TRANSFORMERS,
} from '@lexical/markdown';
import { $createTextNode } from 'lexical';
import { 
  FiBold, 
  FiItalic, 
  FiList,
  FiCode,
  FiType,
} from 'react-icons/fi';
import './EditableMarkdownPreview.css';
import { useSettingsStore } from '../store/settingsStore';

interface EditableMarkdownPreviewProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
}

// Toolbar component
function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [blockType, setBlockType] = useState<string>('paragraph');

  const updateToolbar = () => {
    const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        setIsBold(selection.hasFormat('bold'));
        setIsItalic(selection.hasFormat('italic'));
      
      const anchorNode = selection.anchor.getNode();
      const element = anchorNode.getKey() === 'root' 
        ? anchorNode 
        : anchorNode.getTopLevelElementOrThrow();
      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);
      
      if (elementDOM !== null) {
        if ($isHeadingNode(element)) {
          const tag = elementDOM.tagName.toLowerCase();
          setBlockType(tag);
        } else if ($isQuoteNode(element)) {
          setBlockType('quote');
        } else if ($isCodeNode(element)) {
          setBlockType('code');
        } else if ($isListNode(element)) {
          setBlockType('list');
        } else {
          setBlockType('paragraph');
        }
      }
    }
  };

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor]);

  const formatText = (format: 'bold' | 'italic' | 'underline') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatHeading = (level: 1 | 2 | 3 | 4 | 5 | 6) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        const element = anchorNode.getKey() === 'root' 
          ? anchorNode 
          : anchorNode.getTopLevelElementOrThrow();
        
        if ($isHeadingNode(element)) {
          element.setTag(`h${level}`);
        } else {
          const heading = $createHeadingNode(`h${level}`);
          element.replace(heading);
          heading.select();
        }
      }
    });
  };

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        const element = anchorNode.getKey() === 'root' 
          ? anchorNode 
          : anchorNode.getTopLevelElementOrThrow();
        
        if ($isQuoteNode(element)) {
          const paragraph = $createParagraphNode();
          element.replace(paragraph);
          paragraph.select();
        } else {
          const quote = $createQuoteNode();
          element.replace(quote);
          quote.select();
        }
      }
    });
  };

  const formatList = (type: 'bullet' | 'number') => {
    editor.dispatchCommand(
      type === 'bullet' ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
      undefined
    );
  };

  const formatCode = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        const element = anchorNode.getKey() === 'root' 
          ? anchorNode 
          : anchorNode.getTopLevelElementOrThrow();
        
        if ($isCodeNode(element)) {
          const paragraph = $createParagraphNode();
          element.replace(paragraph);
          paragraph.select();
        } else {
          const code = $createCodeNode('markdown');
          element.replace(code);
          code.select();
        }
      }
    });
  };

  return (
    <div
      className="flex items-center gap-1 p-2 border-b rounded-t-lg"
      style={{
        backgroundColor: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-primary)',
      }}
    >
      <button
        onClick={() => formatText('bold')}
        className={`p-2 rounded transition-colors ${
          isBold ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'
        }`}
        style={{
          color: isBold ? 'var(--theme-accent)' : 'var(--theme-text-primary)',
          backgroundColor: isBold ? 'color-mix(in srgb, var(--theme-accent) 15%, var(--theme-bg-primary))' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!isBold) {
            e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isBold) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        title="Bold"
      >
        <FiBold className="w-4 h-4" />
      </button>
      <button
        onClick={() => formatText('italic')}
        className={`p-2 rounded transition-colors ${
          isItalic ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'
        }`}
        style={{
          color: isItalic ? 'var(--theme-accent)' : 'var(--theme-text-primary)',
          backgroundColor: isItalic ? 'color-mix(in srgb, var(--theme-accent) 15%, var(--theme-bg-primary))' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!isItalic) {
            e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isItalic) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        title="Italic"
      >
        <FiItalic className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-gray-300" style={{ backgroundColor: 'var(--theme-border-primary)' }} />
      <button
        onClick={() => formatHeading(1)}
        className={`p-2 rounded transition-colors ${
          blockType === 'h1' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'
        }`}
        style={{
          color: blockType === 'h1' ? 'var(--theme-accent)' : 'var(--theme-text-primary)',
          backgroundColor: blockType === 'h1' ? 'color-mix(in srgb, var(--theme-accent) 15%, var(--theme-bg-primary))' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (blockType !== 'h1') {
            e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
          }
        }}
        onMouseLeave={(e) => {
          if (blockType !== 'h1') {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        title="Heading 1"
      >
        <FiType className="w-4 h-4" />
      </button>
      <button
        onClick={() => formatList('bullet')}
        className={`p-2 rounded transition-colors ${
          blockType === 'list' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'
        }`}
        style={{
          color: blockType === 'list' ? 'var(--theme-accent)' : 'var(--theme-text-primary)',
          backgroundColor: blockType === 'list' ? 'color-mix(in srgb, var(--theme-accent) 15%, var(--theme-bg-primary))' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (blockType !== 'list') {
            e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
          }
        }}
        onMouseLeave={(e) => {
          if (blockType !== 'list') {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        title="Bullet List"
      >
        <FiList className="w-4 h-4" />
      </button>
      <button
        onClick={() => formatQuote()}
        className={`p-2 rounded transition-colors ${
          blockType === 'quote' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'
        }`}
        style={{
          color: blockType === 'quote' ? 'var(--theme-accent)' : 'var(--theme-text-primary)',
          backgroundColor: blockType === 'quote' ? 'color-mix(in srgb, var(--theme-accent) 15%, var(--theme-bg-primary))' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (blockType !== 'quote') {
            e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
          }
        }}
        onMouseLeave={(e) => {
          if (blockType !== 'quote') {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        title="Quote"
      >
        <FiType className="w-4 h-4" />
      </button>
      <button
        onClick={() => formatCode()}
        className={`p-2 rounded transition-colors ${
          blockType === 'code' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'
        }`}
        style={{
          color: blockType === 'code' ? 'var(--theme-accent)' : 'var(--theme-text-primary)',
          backgroundColor: blockType === 'code' ? 'color-mix(in srgb, var(--theme-accent) 15%, var(--theme-bg-primary))' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (blockType !== 'code') {
            e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
          }
        }}
        onMouseLeave={(e) => {
          if (blockType !== 'code') {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        title="Code Block"
      >
        <FiCode className="w-4 h-4" />
      </button>
    </div>
  );
}

// Plugin to handle content changes and convert to markdown
function OnChangeMarkdownPlugin({ onChange }: { onChange: (markdown: string) => void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        try {
          const markdown = $convertToMarkdownString(CUSTOM_TRANSFORMERS);
          onChange(markdown);
        } catch (error) {
          console.error('Error converting to markdown:', error);
        }
      });
    });
  }, [editor, onChange]);

  return null;
}

// Use standard transformers - wikilinks and tasks are preserved as text
// They can be styled/rendered specially via CSS or post-processing
const CUSTOM_TRANSFORMERS = TRANSFORMERS;

// Plugin to initialize content from markdown
function InitializeFromMarkdownPlugin({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext();
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!isInitializedRef.current && content) {
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        try {
          $convertFromMarkdownString(content, CUSTOM_TRANSFORMERS);
          isInitializedRef.current = true;
        } catch (error) {
          console.error('Error converting from markdown:', error);
          // Fallback: create a paragraph with the content
          const paragraph = $createParagraphNode();
          const textNode = $createTextNode(content);
          paragraph.append(textNode);
          root.append(paragraph);
          isInitializedRef.current = true;
        }
      });
    }
  }, [editor, content]);

  return null;
}

export function EditableMarkdownPreview({ content, onChange, className = '' }: EditableMarkdownPreviewProps) {
  const settings = useSettingsStore((state) => state.settings);
  const previewSettings = settings.preview || {};
  const codeFontSize = previewSettings.codeBlockFontSize || 14;
  const codeFontFamily = previewSettings.codeBlockFontFamily || 'monospace';

  // Set CSS variables for code styling
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--code-font-size', `${codeFontSize}px`);
    root.style.setProperty('--code-font-family', codeFontFamily);
  }, [codeFontSize, codeFontFamily]);

  const initialConfig = {
    namespace: 'EditableMarkdownPreview',
    theme: {
      paragraph: 'mb-2',
      heading: {
        h1: 'text-3xl font-bold mb-4',
        h2: 'text-2xl font-bold mb-3',
        h3: 'text-xl font-bold mb-2',
        h4: 'text-lg font-bold mb-2',
        h5: 'text-base font-bold mb-1',
        h6: 'text-sm font-bold mb-1',
      },
      list: {
        nested: {
          listitem: 'ml-4',
        },
        ol: 'list-decimal ml-6 mb-2',
        ul: 'list-disc ml-6 mb-2',
        listitem: 'mb-1',
      },
      quote: 'border-l-4 pl-4 italic my-4',
      code: 'my-4 rounded-lg overflow-hidden font-mono text-sm',
      link: 'text-blue-600 underline',
      text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
      },
    },
    onError: (error: Error) => {
      console.error('Lexical error:', error);
    },
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      LinkNode,
      CodeNode,
      CodeHighlightNode,
    ],
  };

  return (
    <div className={`editable-markdown-preview ${className}`} style={{ backgroundColor: 'var(--theme-bg-primary)' }}>
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="min-h-[400px] p-6 outline-none prose prose-sm max-w-none"
                style={{
                  color: 'var(--theme-text-primary)',
                  backgroundColor: 'var(--theme-bg-primary)',
                }}
              />
            }
            placeholder={
              <div
                className="absolute top-6 left-6 pointer-events-none"
                style={{ color: 'var(--theme-text-tertiary)' }}
              >
                Start typing...
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <MarkdownShortcutPlugin transformers={CUSTOM_TRANSFORMERS} />
          <OnChangeMarkdownPlugin onChange={onChange} />
          <InitializeFromMarkdownPlugin content={content} />
        </div>
      </LexicalComposer>
    </div>
  );
}

