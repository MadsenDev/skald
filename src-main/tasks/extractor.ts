import { randomUUID } from 'crypto';

export interface ExtractedTask {
  id: string;
  noteId: string;
  lineAnchor: string; // e.g., "L42" for line 42
  content: string; // The task text
  status: 'open' | 'in-progress' | 'done' | 'cancelled';
  priority?: number;
  dueDate?: string; // ISO datetime string
  assignedTo?: string;
  labels: string[];
}

/**
 * Extract tasks from Markdown content
 * Supports:
 * - [ ] Task text
 * - [x] Completed task
 * - [ ] Task text @due(2025-12-31)
 * - [ ] Task text #label1 #label2
 * - [ ] Task text @assign(john)
 */
export function extractTasks(content: string, noteId: string): ExtractedTask[] {
  const tasks: ExtractedTask[] = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    const lineAnchor = `L${lineNumber}`;
    
    // Match task patterns: - [ ] or - [x] or * [ ] etc.
    const taskMatch = line.match(/^[\s]*[-*+]\s+\[([ x])\]\s+(.+)$/);
    if (!taskMatch) continue;
    
    const isChecked = taskMatch[1].trim() === 'x';
    let taskText = taskMatch[2].trim();
    
    // Parse task metadata
    const labels: string[] = [];
    let dueDate: string | undefined;
    let assignedTo: string | undefined;
    let priority = 0;
    
    // Extract labels (#label)
    const labelMatches = taskText.matchAll(/#(\w+)/g);
    for (const match of labelMatches) {
      labels.push(match[1]);
      taskText = taskText.replace(match[0], '').trim();
    }
    
    // Extract due date @due(YYYY-MM-DD) or @due(YYYY-MM-DDTHH:mm)
    const dueMatch = taskText.match(/@due\(([^)]+)\)/);
    if (dueMatch) {
      dueDate = dueMatch[1];
      taskText = taskText.replace(dueMatch[0], '').trim();
    }
    
    // Extract assignee @assign(name)
    const assignMatch = taskText.match(/@assign\(([^)]+)\)/);
    if (assignMatch) {
      assignedTo = assignMatch[1];
      taskText = taskText.replace(assignMatch[0], '').trim();
    }
    
    // Extract priority @priority(high|medium|low) or @p(1-5)
    const priorityMatch = taskText.match(/@priority\((\w+)\)|@p\((\d+)\)/);
    if (priorityMatch) {
      const priorityValue = priorityMatch[1] || priorityMatch[2];
      if (priorityValue === 'high' || priorityValue === '3') priority = 3;
      else if (priorityValue === 'medium' || priorityValue === '2') priority = 2;
      else if (priorityValue === 'low' || priorityValue === '1') priority = 1;
      else if (!isNaN(Number(priorityValue))) priority = Number(priorityValue);
      taskText = taskText.replace(priorityMatch[0], '').trim();
    }
    
    // Extract explicit status @status(in-progress|cancelled|open|done)
    let explicitStatus: ExtractedTask['status'] | undefined;
    const statusMatch = taskText.match(/@status\(([^)]+)\)/i);
    if (statusMatch) {
      const val = statusMatch[1].toLowerCase();
      if (val === 'in-progress' || val === 'in progress') explicitStatus = 'in-progress';
      else if (val === 'cancelled' || val === 'canceled') explicitStatus = 'cancelled';
      else if (val === 'done') explicitStatus = 'done';
      else if (val === 'open') explicitStatus = 'open';
      taskText = taskText.replace(statusMatch[0], '').trim();
    }

    // Determine status
    let status: ExtractedTask['status'] = 'open';
    if (isChecked) {
      status = 'done';
    } else if (explicitStatus) {
      status = explicitStatus;
    } else if (taskText.toLowerCase().includes('in progress') || 
               taskText.toLowerCase().includes('in-progress')) {
      status = 'in-progress';
    }
    
    tasks.push({
      id: randomUUID(),
      noteId,
      lineAnchor,
      content: taskText,
      status,
      priority: priority || undefined,
      dueDate,
      assignedTo,
      labels,
    });
  }
  
  return tasks;
}

/**
 * Update task status in Markdown content
 */
export function updateTaskInContent(
  content: string,
  lineAnchor: string,
  updates: { status?: ExtractedTask['status']; content?: string }
): string {
  const lines = content.split('\n');
  const lineNumber = parseInt(lineAnchor.replace('L', '')) - 1;
  
  if (lineNumber < 0 || lineNumber >= lines.length) {
    return content;
  }
  
  const line = lines[lineNumber];
  const taskMatch = line.match(/^([\s]*[-*+]\s+)\[([ x])\](.+)$/);
  
  if (!taskMatch) {
    return content;
  }
  
  const prefix = taskMatch[1];
  const checkbox = updates.status === 'done' ? 'x' : ' ';
  let taskContent = (updates.content || taskMatch[3].trim()).trim();
  // Normalize/remove existing @status token
  taskContent = taskContent.replace(/@status\(([^)]+)\)/gi, '').trim();
  if (updates.status && updates.status !== 'done' && updates.status !== 'open') {
    // Append explicit status token for non-checkbox states so extractor preserves it
    const normalized = updates.status === 'in-progress' ? 'in-progress' : 'cancelled';
    taskContent = `${taskContent} @status(${normalized})`.trim();
  }
  lines[lineNumber] = `${prefix}[${checkbox}] ${taskContent}`;
  
  return lines.join('\n');
}

