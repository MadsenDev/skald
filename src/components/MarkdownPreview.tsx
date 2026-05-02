import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import DOMPurify from 'dompurify';
import { useSettingsStore } from '../store/settingsStore';
import { useVaultStore } from '../store/vaultStore';
import { parseWikilink } from '../utils/wikilinks';
import { HoverPreview } from './HoverPreview';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { remarkCallouts } from '../utils/remark/remarkCallouts';
import { remarkBlockIds } from '../utils/remark/remarkBlockIds';
import { remarkBlockRefs } from '../utils/remark/remarkBlockRefs';
import { Callout } from './Callout';
import { BlockRef } from './BlockRef';
import 'highlight.js/styles/github.css';

// Pre-bundle all highlight.js themes from node_modules (absolute project-root path)
const hlThemes = import.meta.glob<string>(
  '/node_modules/highlight.js/styles/*.min.css',
  { query: '?inline', import: 'default', eager: false }
);

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

// Extract inline task metadata tokens from text and return clean text + badges
function renderTaskTokens(text: string) {
  let clean = text;
  const badges: JSX.Element[] = [];
  // due date @due(YYYY-MM-DD or datetime)
  const dueRegex = /@due\(([^)]+)\)/g;
  clean = clean.replace(dueRegex, (_m, d) => {
    const date = new Date(d);
    const isValid = !isNaN(date.getTime());
    const isOverdue = isValid && date.getTime() < Date.now();
    badges.push(
      <span key={`due-${d}-${badges.length}`} className={`inline-flex items-center text-[11px] px-1.5 py-0.5 rounded ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
        {isValid ? date.toLocaleDateString() : d}
      </span>
    );
    return '';
  });
  // assignee @assign(name)
  const assignRegex = /@assign\(([^)]+)\)/g;
  clean = clean.replace(assignRegex, (_m, who) => {
    badges.push(
      <span key={`assign-${who}-${badges.length}`} className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
        @{who}
      </span>
    );
    return '';
  });
  // priority @p(n) or @priority(name)
  const priorityRegex = /@p\((\d+)\)|@priority\(([^)]+)\)/g;
  clean = clean.replace(priorityRegex, (_m, num, name) => {
    const val = num ? parseInt(num, 10) : (name || '').toLowerCase();
    let label = typeof val === 'number' ? `P${val}` : (val === 'high' ? 'P3' : val === 'medium' ? 'P2' : val === 'low' ? 'P1' : `P`);
    const color = label === 'P3' ? 'bg-red-100 text-red-700' : label === 'P2' ? 'bg-orange-100 text-orange-700' : label === 'P1' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700';
    badges.push(
      <span key={`pri-${label}-${badges.length}`} className={`inline-flex items-center text-[11px] px-1.5 py-0.5 rounded ${color}`}>
        {label}
      </span>
    );
    return '';
  });
  // status @status(in-progress|cancelled|open|done)
  const statusRegex = /@status\(([^)]+)\)/g;
  clean = clean.replace(statusRegex, (_m, s) => {
    const val = s.toLowerCase();
    const color = val === 'in-progress' ? 'bg-blue-100 text-blue-700' : val === 'cancelled' ? 'bg-gray-100 text-gray-700' : val === 'done' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
    badges.push(
      <span key={`status-${val}-${badges.length}`} className={`inline-flex items-center text-[11px] px-1.5 py-0.5 rounded ${color}`}>
        {val}
      </span>
    );
    return '';
  });
  // labels #label
  const labelRegex = /(^|\s)#(\w+)/g;
  clean = clean.replace(labelRegex, (_m, sp, tag) => {
    badges.push(
      <span key={`tag-${tag}-${badges.length}`} className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
        #{tag}
      </span>
    );
    return sp;
  });
  // normalize spaces
  clean = clean.replace(/\s{2,}/g, ' ').trim();
  return { clean, badges };
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  const settings = useSettingsStore((state) => state.settings);
  const { notes } = useVaultStore();
  const previewSettings = settings.preview || {};
  const codeTheme = previewSettings.codeBlockTheme || 'github';
  const showLineNumbers = previewSettings.codeBlockLineNumbers ?? false;
  const codeFontSize = previewSettings.codeBlockFontSize || 14;
  const codeFontFamily = previewSettings.codeBlockFontFamily || 'monospace';
  
  const [hoveredNote, setHoveredNote] = useState<{
    noteId: string;
    notePath: string;
    noteTitle: string;
    position: { x: number; y: number };
  } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load highlight.js theme from bundled node_modules (no CDN)
  useEffect(() => {
    const themeMap: Record<string, string> = { 'vs': 'vs2015' };
    const validTheme = themeMap[codeTheme] || codeTheme;
    const key = `/node_modules/highlight.js/styles/${validTheme}.min.css`;
    const loader = hlThemes[key];
    if (!loader) return;

    loader().then((css) => {
      let el = document.getElementById('highlight-theme-inline') as HTMLStyleElement | null;
      if (!el) {
        el = document.createElement('style');
        el.id = 'highlight-theme-inline';
        document.head.appendChild(el);
      }
      el.textContent = css;
    });
  }, [codeTheme]);

  const handleOpenNote = () => {
    if (hoveredNote) {
      const event = new CustomEvent('navigate-to-note', {
        detail: { path: hoveredNote.notePath },
        bubbles: true,
      });
      window.dispatchEvent(event);
    }
  };

  return (
    <>
      <div className={`markdown-preview prose prose-sm max-w-none ${className}`}>
        <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkCallouts, remarkBlockIds, remarkBlockRefs]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom code blocks
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && match) {
              const lines = codeString.split('\n');
              const lineCount = lines.length;
              const lineNumberWidth = Math.max(3, lineCount.toString().length);
              
              // Ensure hljs class is present for highlight.js styling
              const codeClassName = className?.includes('hljs') ? className : `hljs ${className || ''}`.trim();
              
              // Calculate exact line height based on font size
              const lineHeight = codeFontSize * 1.5;
              
              if (showLineNumbers) {
                return (
                  <div className="relative my-4 rounded-lg overflow-hidden border border-gray-200">
                    <div className="flex overflow-x-auto">
                      {/* Line numbers column */}
                      <div 
                        className="select-none text-right pr-4 text-gray-500 font-mono border-r border-gray-200 flex-shrink-0" 
                        style={{ 
                          width: `${lineNumberWidth * 0.6 + 1}em`,
                          fontSize: `${codeFontSize}px`,
                          fontFamily: codeFontFamily,
                          paddingTop: '1rem',
                          paddingBottom: '1rem',
                        }}
                      >
                        {lines.map((_, i) => (
                          <div 
                            key={i} 
                            style={{ 
                              height: `${lineHeight}px`,
                              lineHeight: `${lineHeight}px`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                            }}
                          >
                            {i + 1}
                          </div>
                        ))}
                      </div>
                      {/* Code column */}
                      <pre 
                        className="flex-1 m-0 p-4 overflow-x-auto hljs" 
                        style={{ 
                          fontSize: `${codeFontSize}px`, 
                          fontFamily: codeFontFamily,
                          lineHeight: `${lineHeight}px`,
                          margin: 0,
                        }}
                      >
                        <code className={codeClassName} {...props} style={{ lineHeight: `${lineHeight}px` }}>
                          {children}
                        </code>
                      </pre>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="relative my-4 rounded-lg overflow-hidden border border-gray-200">
                    <pre className="m-0 p-4 overflow-x-auto hljs" style={{ fontSize: `${codeFontSize}px`, fontFamily: codeFontFamily }}>
                      <code className={codeClassName} {...props}>
                        {children}
                      </code>
                    </pre>
                  </div>
                );
              }
            } else {
              return (
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm" {...props}>
                  {children}
                </code>
              );
            }
          },
          // Task list items (GFM)
          li({ children }: any) {
            // react-markdown with gfm sets props.className includes 'task-list-item' and input[type=checkbox]
            // Build text content for token parsing
            const text = Array.isArray(children)
              ? children.map((c: any) => (typeof c === 'string' ? c : (c?.props?.children ?? ''))).flat().join(' ')
              : (typeof children === 'string' ? children : '');
            const { clean, badges } = renderTaskTokens(String(text || ''));
            return (
              <li className="ml-4">
                <div className="inline-flex items-start gap-2">
                  <span className="leading-6">{clean}</span>
                  <span className="flex flex-wrap gap-1">{badges}</span>
                </div>
              </li>
            );
          },
          // Headings
          h1: ({ children }) => <h1 className="text-3xl font-bold mt-6 mb-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-2xl font-bold mt-5 mb-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xl font-semibold mt-4 mb-2">{children}</h3>,
          h4: ({ children }) => <h4 className="text-lg font-semibold mt-3 mb-2">{children}</h4>,
          h5: ({ children }) => <h5 className="text-base font-semibold mt-2 mb-1">{children}</h5>,
          h6: ({ children }) => <h6 className="text-sm font-semibold mt-2 mb-1">{children}</h6>,
          // Lists
          ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>,
          // Blockquote - check for callouts
          blockquote: ({ node, children, ...props }: any) => {
            const calloutType = (node as any)?.data?.calloutType;
            const calloutTitle = (node as any)?.data?.calloutTitle;
            
            if (calloutType) {
              return <Callout type={calloutType} title={calloutTitle} {...props}>{children}</Callout>;
            }
            
            return (
              <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-700" {...props}>
                {children}
              </blockquote>
            );
          },
          // HTML - handle block refs
          html: ({ node, ...props }: any) => {
            const value = (node as any).value || '';
            
            // Check for block ref
            const blockRefMatch = value.match(/<skald-block-ref data-block-id="([^"]+)"><\/skald-block-ref>/);
            if (blockRefMatch) {
              return <BlockRef blockId={blockRefMatch[1]} {...props} />;
            }
            
            // Default HTML rendering — sanitize before injection
            return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }} {...props} />;
          },
          // Links - handle both regular links and wikilinks
          a: ({ children, href }: any) => {
            // Check if this is a wikilink (starts with [[ and ends with ]])
            const text = String(children);
            if (text.startsWith('[[') && text.endsWith(']]')) {
              const parsed = parseWikilink(text);
              // Find all matching notes (handle duplicates)
              const matchingNotes = notes.filter(n => 
                n.title.toLowerCase() === parsed.noteName.toLowerCase() ||
                n.path.toLowerCase().includes(parsed.noteName.toLowerCase().replace(/\s+/g, '-'))
              );
              
              // If multiple matches, prefer exact title match, then first match
              const linkedNote = matchingNotes.find(n => 
                n.title.toLowerCase() === parsed.noteName.toLowerCase()
              ) || matchingNotes[0];
              
              if (linkedNote) {
                const hasDuplicates = matchingNotes.length > 1;
                return (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (hasDuplicates) {
                        console.warn(`Multiple notes found with name "${parsed.noteName}". Using: ${linkedNote.path}`);
                      }
                      const event = new CustomEvent('navigate-to-note', { 
                        detail: { path: linkedNote.path },
                        bubbles: true 
                      });
                      window.dispatchEvent(event);
                    }}
                    onMouseEnter={(e) => {
                      if (hoverTimeoutRef.current) {
                        clearTimeout(hoverTimeoutRef.current);
                      }
                      const target = e.currentTarget;
                      hoverTimeoutRef.current = setTimeout(() => {
                        if (!target || !document.body.contains(target)) {
                          return;
                        }
                        const rect = target.getBoundingClientRect();
                        console.log('[HoverPreview] Setting hovered note:', linkedNote.title, rect);
                        setHoveredNote({
                          noteId: linkedNote.id,
                          notePath: linkedNote.path,
                          noteTitle: linkedNote.title,
                          position: {
                            x: rect.left,
                            y: rect.top,
                          },
                        });
                      }, 300);
                    }}
                    onMouseLeave={() => {
                      if (hoverTimeoutRef.current) {
                        clearTimeout(hoverTimeoutRef.current);
                        hoverTimeoutRef.current = null;
                      }
                      // Don't close immediately - allow time to move to preview
                      if (closeTimeoutRef.current) {
                        clearTimeout(closeTimeoutRef.current);
                      }
                      closeTimeoutRef.current = setTimeout(() => {
                        setHoveredNote(null);
                      }, 300);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                    // title={parsed.heading ? `${linkedNote.title} - ${parsed.heading}` : linkedNote.title}
                  >
                    {parsed.displayText || parsed.noteName}
                  </a>
                );
              } else {
                // Note not found - show as broken link
                return (
                  <span className="text-red-600 underline decoration-dotted" title={`Note "${parsed.noteName}" not found`}>
                    {parsed.displayText || parsed.noteName}
                  </span>
                );
              }
            }
            // Regular link
            return (
              <a href={href} className="text-indigo-600 hover:text-indigo-800 underline" target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          // Paragraphs - handle wikilinks in text
          p: ({ children }: any) => {
            // Check if paragraph contains wikilinks
            const text = Array.isArray(children) 
              ? children.map((c: any) => typeof c === 'string' ? c : (c?.props?.children ?? '')).join('')
              : String(children || '');
            
            if (text.includes('[[') && text.includes(']]')) {
              // Split by wikilinks and render them
              const parts: JSX.Element[] = [];
              const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
              let lastIndex = 0;
              let match;
              let key = 0;
              
              while ((match = wikilinkRegex.exec(text)) !== null) {
                // Add text before the wikilink
                if (match.index > lastIndex) {
                  parts.push(<span key={`text-${key++}`}>{text.slice(lastIndex, match.index)}</span>);
                }
                
                // Add the wikilink
                const parsed = parseWikilink(match[0]);
                // Find all matching notes (handle duplicates)
                const matchingNotes = notes.filter(n => 
                  n.title.toLowerCase() === parsed.noteName.toLowerCase() ||
                  n.path.toLowerCase().includes(parsed.noteName.toLowerCase().replace(/\s+/g, '-'))
                );
                
                // If multiple matches, prefer exact title match, then first match
                const linkedNote = matchingNotes.find(n => 
                  n.title.toLowerCase() === parsed.noteName.toLowerCase()
                ) || matchingNotes[0];
                
                if (linkedNote) {
                  const hasDuplicates = matchingNotes.length > 1;
                  parts.push(
                    <a
                      key={`link-${key++}`}
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasDuplicates) {
                          console.warn(`Multiple notes found with name "${parsed.noteName}". Using: ${linkedNote.path}`);
                        }
                        const event = new CustomEvent('navigate-to-note', { 
                          detail: { path: linkedNote.path },
                          bubbles: true 
                        });
                        window.dispatchEvent(event);
                      }}
                      onMouseEnter={(e) => {
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current);
                        }
                        const target = e.currentTarget;
                        hoverTimeoutRef.current = setTimeout(() => {
                          if (!target || !document.body.contains(target)) {
                            return;
                          }
                          const rect = target.getBoundingClientRect();
                          setHoveredNote({
                            noteId: linkedNote.id,
                            notePath: linkedNote.path,
                            noteTitle: linkedNote.title,
                            position: {
                              x: rect.left,
                              y: rect.top,
                            },
                          });
                        }, 300);
                      }}
                      onMouseLeave={() => {
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current);
                          hoverTimeoutRef.current = null;
                        }
                        // Don't close immediately - allow time to move to preview
                        if (closeTimeoutRef.current) {
                          clearTimeout(closeTimeoutRef.current);
                        }
                        closeTimeoutRef.current = setTimeout(() => {
                          setHoveredNote(null);
                        }, 300);
                      }}
                      className="text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                      // title={parsed.heading ? `${linkedNote.title} - ${parsed.heading}` : linkedNote.title}
                    >
                      {parsed.displayText || parsed.noteName}
                    </a>
                  );
                } else {
                  parts.push(
                    <span 
                      key={`broken-${key++}`} 
                      className="text-red-600 underline decoration-dotted" 
                      title={`Note "${parsed.noteName}" not found`}
                    >
                      {parsed.displayText || parsed.noteName}
                    </span>
                  );
                }
                
                lastIndex = match.index + match[0].length;
              }
              
              // Add remaining text
              if (lastIndex < text.length) {
                parts.push(<span key={`text-${key++}`}>{text.slice(lastIndex)}</span>);
              }
              
              return <p className="my-3 leading-relaxed">{parts}</p>;
            }
            
            return <p className="my-3 leading-relaxed">{children}</p>;
          },
          // Images
          img: ({ src, alt }) => (
            <img src={src} alt={alt} className="max-w-full h-auto rounded-lg my-4" />
          ),
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-gray-300">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-gray-200">{children}</tr>,
          th: ({ children }) => (
            <th className="border border-gray-300 px-4 py-2 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-300 px-4 py-2">{children}</td>
          ),
          hr: () => <hr className="my-6 border-gray-300" />,
        }}
      >
          {content}
        </ReactMarkdown>
      </div>
      {hoveredNote && createPortal(
        <AnimatePresence>
          <HoverPreview
            key={hoveredNote.noteId}
            noteId={hoveredNote.noteId}
            notePath={hoveredNote.notePath}
            noteTitle={hoveredNote.noteTitle}
            position={hoveredNote.position}
            onOpen={handleOpenNote}
            onClose={() => {
              if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
              }
              setHoveredNote(null);
            }}
            onMouseEnter={() => {
              // Cancel any pending close when mouse enters preview
              if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = null;
              }
            }}
          />
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

