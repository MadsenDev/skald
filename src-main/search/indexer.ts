import { parseFrontmatter } from '../utils/frontmatter.js';
import { extractTasks } from '../tasks/extractor.js';

export interface SearchDocument {
  id: string;
  type: 'note' | 'task';
  noteId?: string;
  title: string;
  content: string;
  path: string;
  frontmatter?: Record<string, any>;
  tags: string[];
  schema?: string;
  status?: string;
  priority?: number;
  dueDate?: number;
  assignedTo?: string;
  headings: string[];
  codeBlocks: string[];
  updatedAt: number;
}

export interface SearchIndex {
  documents: Map<string, SearchDocument>;
}

let searchIndex: SearchIndex = {
  documents: new Map(),
};

/**
 * Index a note for search
 */
export function indexNote(
  noteId: string,
  path: string,
  title: string,
  content: string,
  frontmatter?: Record<string, any>,
  schema?: string,
  updatedAt?: number
): void {
  const parsed = parseFrontmatter(content);
  const bodyContent = parsed.content;
  
  // Extract headings
  const headings: string[] = [];
  const headingRegex = /^#{1,6}\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(bodyContent)) !== null) {
    headings.push(match[1].trim());
  }
  
  // Extract code blocks
  const codeBlocks: string[] = [];
  const codeBlockRegex = /```[\s\S]*?```/g;
  let codeMatch;
  while ((codeMatch = codeBlockRegex.exec(bodyContent)) !== null) {
    codeBlocks.push(codeMatch[0]);
  }
  
  // Extract tags from frontmatter and content
  const tags: string[] = [];
  if (parsed.frontmatter.tags && Array.isArray(parsed.frontmatter.tags)) {
    tags.push(...parsed.frontmatter.tags);
  }
  // Also extract hashtags from content
  const hashtagRegex = /#(\w+)/g;
  let tagMatch;
  while ((tagMatch = hashtagRegex.exec(bodyContent)) !== null) {
    if (!tags.includes(tagMatch[1])) {
      tags.push(tagMatch[1]);
    }
  }
  
  const doc: SearchDocument = {
    id: noteId,
    type: 'note',
    noteId,
    title,
    content: bodyContent,
    path,
    frontmatter: parsed.frontmatter,
    tags,
    schema: schema || parsed.frontmatter.schema,
    headings,
    codeBlocks,
    updatedAt: updatedAt || Date.now(),
  };
  
  searchIndex.documents.set(noteId, doc);
}

/**
 * Index tasks from a note
 */
export function indexTasks(noteId: string, content: string, notePath?: string): void {
  // Remove existing tasks for this note
  for (const [id, doc] of searchIndex.documents.entries()) {
    if (doc.type === 'task' && doc.noteId === noteId) {
      searchIndex.documents.delete(id);
    }
  }
  
  const tasks = extractTasks(content, noteId);
  
  for (const task of tasks) {
    const taskId = `task-${noteId}-${task.lineAnchor}`;
    const doc: SearchDocument = {
      id: taskId,
      type: 'task',
      noteId,
      title: task.content,
      content: task.content,
      path: notePath || '',
      tags: task.labels,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).getTime() : undefined,
      assignedTo: task.assignedTo,
      headings: [],
      codeBlocks: [],
      updatedAt: Date.now(),
    };
    
    searchIndex.documents.set(taskId, doc);
  }
}

/**
 * Remove a document from the index
 */
export function removeDocument(id: string): void {
  searchIndex.documents.delete(id);
}

/**
 * Remove all documents for a note
 */
export function removeNoteDocuments(noteId: string): void {
  for (const [id, doc] of searchIndex.documents.entries()) {
    if (doc.noteId === noteId || doc.id === noteId) {
      searchIndex.documents.delete(id);
    }
  }
}

/**
 * Get all documents in the index
 */
export function getAllDocuments(): SearchDocument[] {
  return Array.from(searchIndex.documents.values());
}

/**
 * Clear the entire index
 */
export function clearIndex(): void {
  searchIndex.documents.clear();
}

