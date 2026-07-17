import { z } from 'zod';

export interface ParsedFrontmatter {
  frontmatter: Record<string, any>;
  content: string;
}

/**
 * Parse frontmatter from Markdown content
 * Supports YAML frontmatter between --- delimiters
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
    // Simple YAML parser (for production, use a proper YAML library)
    const frontmatter: Record<string, any> = {};
    const lines = frontmatterText.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = trimmed.slice(0, colonIndex).trim();
      let value: any = trimmed.slice(colonIndex + 1).trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      // Parse arrays (simple format: [item1, item2] or - item1\n- item2)
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          value = JSON.parse(value);
        } catch {
          // Fallback: simple split
          value = value.slice(1, -1).split(',').map((v: string) => v.trim().replace(/^["']|["']$/g, ''));
        }
      } else if (trimmed.startsWith('- ')) {
        // Handle YAML list items
        const listKey = lines[lines.indexOf(line) - 1]?.split(':')[0]?.trim();
        if (listKey) {
          if (!frontmatter[listKey]) frontmatter[listKey] = [];
          frontmatter[listKey].push(value);
        }
      } else {
        // Try to parse as number or boolean
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (!isNaN(Number(value)) && value !== '') value = Number(value);
      }
      
      if (!trimmed.startsWith('- ')) {
        frontmatter[key] = value;
      }
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
      yamlLines.push(`${key}: [${value.map(v => JSON.stringify(v)).join(', ')}]`);
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

/**
 * Validate frontmatter against a Zod schema
 */
export function validateFrontmatter<T extends z.ZodTypeAny>(
  frontmatter: Record<string, any>,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } {
  try {
    const result = schema.safeParse(frontmatter);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, errors: result.error };
    }
  } catch (error) {
    return {
      success: false,
      errors: new z.ZodError([
        {
          code: 'custom',
          path: [],
          message: `Validation error: ${error}`,
        },
      ]),
    };
  }
}

