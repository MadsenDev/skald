/**
 * Extract wikilinks from markdown content
 * Supports: [[Note Name]], [[Note Name|Display Text]], [[Note Name#Heading]]
 */
export function extractWikilinks(content: string): string[] {
  const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match;

  while ((match = wikilinkRegex.exec(content)) !== null) {
    const linkText = match[1];
    // Handle pipe syntax: [[Note|Display]] -> extract "Note"
    // Handle heading syntax: [[Note#Heading]] -> extract "Note"
    const noteName = linkText.split('|')[0].split('#')[0].trim();
    if (noteName && !links.includes(noteName)) {
      links.push(noteName);
    }
  }

  return links;
}

/**
 * Parse a wikilink to extract note name, display text, and heading
 */
export function parseWikilink(wikilink: string): {
  noteName: string;
  displayText?: string;
  heading?: string;
} {
  // Remove brackets
  const content = wikilink.replace(/^\[\[|\]\]$/g, '');
  
  // Check for display text: [[Note|Display]]
  const pipeIndex = content.indexOf('|');
  let notePart = content;
  let displayText: string | undefined;
  
  if (pipeIndex !== -1) {
    notePart = content.slice(0, pipeIndex);
    displayText = content.slice(pipeIndex + 1);
  }
  
  // Check for heading: [[Note#Heading]]
  const hashIndex = notePart.indexOf('#');
  let noteName = notePart;
  let heading: string | undefined;
  
  if (hashIndex !== -1) {
    noteName = notePart.slice(0, hashIndex);
    heading = notePart.slice(hashIndex + 1);
  }
  
  return {
    noteName: noteName.trim(),
    displayText: displayText?.trim(),
    heading: heading?.trim(),
  };
}

