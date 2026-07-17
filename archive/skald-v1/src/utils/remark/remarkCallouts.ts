import { visit } from 'unist-util-visit';
import type { Root, Blockquote, Paragraph, Text } from 'mdast';

/**
 * Remark plugin to parse Obsidian-style callouts
 * Transforms blockquotes with > [!type] Title into callout nodes
 */
export function remarkCallouts() {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote, index, parent) => {
      if (!parent || index === undefined) return;
      
      // Check if first child is a paragraph starting with [!type]
      const firstChild = node.children[0];
      if (firstChild.type !== 'paragraph') return;
      
      const firstText = firstChild.children[0];
      if (firstText?.type !== 'text') return;
      
      const text = firstText.value;
      const calloutMatch = text.match(/^\[!([a-zA-Z]+)\]\s*(.*)$/);
      
      if (calloutMatch) {
        const [, type, title] = calloutMatch;
        
        // Remove the first paragraph (the title line)
        const restChildren = firstChild.children.slice(1);
        const hasTitle = title.trim().length > 0;
        
        // Get remaining content (other paragraphs in blockquote)
        const content = node.children.slice(1);
        
        // If there's remaining text in the first paragraph, add it as content
        if (restChildren.length > 0) {
          content.unshift({
            type: 'paragraph',
            children: restChildren,
          } as Paragraph);
        }
        
        // Store callout data in node data
        if (!(node as any).data) {
          (node as any).data = {};
        }
        (node as any).data.calloutType = type.toLowerCase();
        (node as any).data.calloutTitle = hasTitle ? title.trim() : null;
        (node as any).children = content;
      }
    });
  };
}
