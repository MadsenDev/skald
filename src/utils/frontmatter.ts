// Frontend utilities for frontmatter parsing
// Note: This is a simplified parser. For production, use a proper YAML library like js-yaml

export interface ParsedFrontmatter {
  frontmatter: Record<string, any>;
  content: string;
}

/**
 * Parse frontmatter from Markdown content (client-side version)
 */
export function parseFrontmatter(content: string): ParsedFrontmatter {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return {
      frontmatter: {},
      content: content.trim(),
    };
  }
  
  const frontmatterText = match[1];
  const bodyContent = match[2];
  
  try {
    const frontmatter: Record<string, any> = {};
    const lines = frontmatterText.split('\n');
    let currentKey: string | null = null;
    let currentArray: any[] | null = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Handle array items
      if (trimmed.startsWith('- ')) {
        if (currentKey && currentArray !== null) {
          const value = trimmed.slice(2).trim();
          currentArray.push(parseValue(value));
        }
        continue;
      }
      
      // Reset array state
      currentArray = null;
      
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = trimmed.slice(0, colonIndex).trim();
      let value: any = trimmed.slice(colonIndex + 1).trim();
      
      // Check if this is an array declaration
      if (value === '' || value === '[]') {
        currentKey = key;
        currentArray = [];
        frontmatter[key] = currentArray;
        continue;
      }
      
      currentKey = null;
      value = parseValue(value);
      frontmatter[key] = value;
    }
    
    return {
      frontmatter,
      content: bodyContent.trim(),
    };
  } catch (error) {
    console.error('Error parsing frontmatter:', error);
    return {
      frontmatter: {},
      content: content.trim(),
    };
  }
}

function parseValue(value: string): any {
  // Remove quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  
  // Parse arrays
  if (value.startsWith('[') && value.endsWith(']')) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1).split(',').map(v => parseValue(v.trim()));
    }
  }
  
  // Parse booleans and numbers
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (!isNaN(Number(value)) && value !== '') return Number(value);
  
  return value;
}

/**
 * Serialize frontmatter and content back to Markdown
 */
export function serializeFrontmatter(frontmatter: Record<string, any>, content: string): string {
  if (Object.keys(frontmatter).length === 0) {
    return content;
  }
  
  const yamlLines: string[] = [];
  
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        yamlLines.push(`${key}: []`);
      } else {
        yamlLines.push(`${key}: [${value.map(v => JSON.stringify(v)).join(', ')}]`);
      }
    } else if (typeof value === 'string') {
      yamlLines.push(`${key}: ${JSON.stringify(value)}`);
    } else if (typeof value === 'object' && value !== null) {
      yamlLines.push(`${key}: ${JSON.stringify(value)}`);
    } else {
      yamlLines.push(`${key}: ${value}`);
    }
  }
  
  return `---\n${yamlLines.join('\n')}\n---\n\n${content}`;
}

