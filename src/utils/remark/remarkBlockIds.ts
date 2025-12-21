import { visit } from 'unist-util-visit';
import type { Root, HTML, Paragraph, Heading, ListItem } from 'mdast';

/**
 * Remark plugin to parse block IDs from HTML comments
 * Looks for <!-- skald:block=id:xxx --> and attaches block IDs to adjacent nodes
 */
export function remarkBlockIds() {
  return (tree: Root) => {
    visit(tree, 'html', (node: HTML, index, parent) => {
      if (!parent || index === undefined) return;
      
      const match = node.value.match(/<!--\s*skald:block=id:([a-zA-Z0-9_-]+)\s*-->/);
      if (!match) return;
      
      const blockId = match[1];
      
      // Find the next non-HTML node (the block this ID belongs to)
      let nextIndex = index + 1;
      while (nextIndex < parent.children.length) {
        const nextNode = parent.children[nextIndex];
        if (nextNode.type === 'html') {
          nextIndex++;
          continue;
        }
        
        // Attach block ID to this node
        if (!(nextNode as any).data) {
          (nextNode as any).data = {};
        }
        (nextNode as any).data.blockId = blockId;
        (nextNode as any).data.hProperties = {
          ...((nextNode as any).data?.hProperties || {}),
          'data-block-id': blockId,
        };
        
        break;
      }
      
      // Remove the HTML comment node
      parent.children.splice(index, 1);
    });
  };
}

