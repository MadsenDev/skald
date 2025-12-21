import { visit } from 'unist-util-visit';
import type { Root, Text } from 'mdast';

/**
 * Remark plugin to parse block references ((block-id))
 * Transforms ((block-id)) into block reference nodes
 */
export function remarkBlockRefs() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return;
      
      const text = node.value;
      const blockRefRegex = /\(\(([a-zA-Z0-9_-]+)\)\)/g;
      const matches = Array.from(text.matchAll(blockRefRegex));
      
      if (matches.length === 0) return;
      
      // Replace text node with multiple nodes (text + block refs)
      const newNodes: any[] = [];
      let lastIndex = 0;
      
      for (const match of matches) {
        const matchIndex = match.index!;
        const blockId = match[1];
        
        // Add text before match
        if (matchIndex > lastIndex) {
          newNodes.push({
            type: 'text',
            value: text.slice(lastIndex, matchIndex),
          });
        }
        
        // Add block ref node (as HTML for react-markdown to handle)
        newNodes.push({
          type: 'html',
          value: `<skald-block-ref data-block-id="${blockId}"></skald-block-ref>`,
        });
        
        lastIndex = matchIndex + match[0].length;
      }
      
      // Add remaining text
      if (lastIndex < text.length) {
        newNodes.push({
          type: 'text',
          value: text.slice(lastIndex),
        });
      }
      
      // Replace the text node with new nodes
      if (newNodes.length > 0) {
        parent.children.splice(index, 1, ...newNodes);
      }
    });
  };
}
