import { SearchDocument } from './indexer.js';

export interface QueryFilter {
  type?: 'note' | 'task';
  status?: string;
  schema?: string;
  tag?: string;
  assignedTo?: string;
  dueBefore?: number;
  dueAfter?: number;
  priority?: number;
}

export interface ParsedQuery {
  text: string[];
  filters: QueryFilter;
}

/**
 * Parse a search query string
 * Supports: type:task status:open tag:research due<2025-12-01 "exact phrase"
 */
export function parseQuery(queryString: string): ParsedQuery {
  const filters: QueryFilter = {};
  const text: string[] = [];
  
  // Extract quoted phrases
  const quotedRegex = /"([^"]+)"/g;
  let match;
  let remainingQuery = queryString;
  while ((match = quotedRegex.exec(queryString)) !== null) {
    text.push(match[1]);
    remainingQuery = remainingQuery.replace(match[0], '');
  }
  
  // Extract filters (key:value or key<value or key>value)
  const filterRegex = /(\w+)([:<>])([^\s"]+)/g;
  while ((match = filterRegex.exec(remainingQuery)) !== null) {
    const key = match[1].toLowerCase();
    const operator = match[2];
    const value = match[3];
    
    switch (key) {
      case 'type':
        if (value === 'note' || value === 'task') {
          filters.type = value;
        }
        break;
      case 'status':
        filters.status = value;
        break;
      case 'schema':
        filters.schema = value;
        break;
      case 'tag':
        filters.tag = value;
        break;
      case 'assigned':
      case 'assignedto':
        filters.assignedTo = value;
        break;
      case 'due':
        if (operator === '<') {
          filters.dueBefore = new Date(value).getTime();
        } else if (operator === '>') {
          filters.dueAfter = new Date(value).getTime();
        }
        break;
      case 'priority':
        filters.priority = parseInt(value, 10);
        break;
    }
    
    remainingQuery = remainingQuery.replace(match[0], '');
  }
  
  // Remaining text is search terms
  const remainingTerms = remainingQuery.trim().split(/\s+/).filter(t => t.length > 0);
  text.push(...remainingTerms);
  
  return { text, filters };
}

/**
 * Search documents with a query
 */
export function searchDocuments(
  documents: SearchDocument[],
  query: ParsedQuery
): SearchDocument[] {
  let results = documents;
  
  // Apply filters
  if (query.filters.type) {
    results = results.filter(doc => doc.type === query.filters.type);
  }
  
  if (query.filters.status) {
    results = results.filter(doc => doc.status === query.filters.status);
  }
  
  if (query.filters.schema) {
    results = results.filter(doc => doc.schema === query.filters.schema);
  }
  
  if (query.filters.tag) {
    results = results.filter(doc => doc.tags.includes(query.filters.tag!));
  }
  
  if (query.filters.assignedTo) {
    results = results.filter(doc => doc.assignedTo === query.filters.assignedTo);
  }
  
  if (query.filters.dueBefore !== undefined) {
    results = results.filter(doc => doc.dueDate && doc.dueDate < query.filters.dueBefore!);
  }
  
  if (query.filters.dueAfter !== undefined) {
    results = results.filter(doc => doc.dueDate && doc.dueDate > query.filters.dueAfter!);
  }
  
  if (query.filters.priority !== undefined) {
    results = results.filter(doc => doc.priority === query.filters.priority);
  }
  
  // Apply text search
  if (query.text.length > 0) {
    const searchTerms = query.text.map(term => term.toLowerCase());
    results = results.filter(doc => {
      const searchableText = [
        doc.title,
        doc.content,
        ...doc.headings,
        ...doc.tags,
      ].join(' ').toLowerCase();
      
      // Check for exact phrases first
      for (const term of searchTerms) {
        if (term.length > 2 && !searchableText.includes(term)) {
          return false;
        }
      }
      
      return true;
    });
    
    // Sort by relevance (simple: count matches)
    results.sort((a, b) => {
      const aText = [a.title, a.content, ...a.headings].join(' ').toLowerCase();
      const bText = [b.title, b.content, ...b.headings].join(' ').toLowerCase();
      
      let aScore = 0;
      let bScore = 0;
      
      for (const term of searchTerms) {
        if (a.title.toLowerCase().includes(term)) aScore += 10;
        if (aText.includes(term)) aScore += 1;
        if (b.title.toLowerCase().includes(term)) bScore += 10;
        if (bText.includes(term)) bScore += 1;
      }
      
      return bScore - aScore;
    });
  } else {
    // Sort by updated date if no text search
    results.sort((a, b) => b.updatedAt - a.updatedAt);
  }
  
  return results;
}

