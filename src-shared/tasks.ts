import type { TaskItem, TaskPriority, TaskStatus } from './types';

// Task lines look like:
//   - [ ] Write the saga @due(2026-06-01) @p(high) #editor
//   - [x] Done thing
//   - [ ] Blocked thing @status(blocked)
// Status: unchecked = open (or @status(working|blocked)), checked = done.

const TASK_RE = /^(\s*)[-*+]\s+\[( |x|X)\]\s+(.*)$/;

export interface RawTask {
  line: number; // 1-based
  content: string;
  status: TaskStatus;
  priority: TaskPriority;
  due: string | null;
  tags: string[];
}

export function extractTasks(body: string, lineOffset = 0): RawTask[] {
  const tasks: RawTask[] = [];
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(TASK_RE);
    if (!m) continue;
    const checked = m[2].toLowerCase() === 'x';
    let text = m[3].trim();

    const tags: string[] = [];
    text = text.replace(/(^|\s)#([\w/-]+)/g, (_, pre, tag) => {
      tags.push(tag);
      return pre;
    });

    let due: string | null = null;
    text = text.replace(/@due\(([^)]+)\)/i, (_, d) => {
      due = normalizeDate(d.trim());
      return '';
    });

    let priority: TaskPriority = 'med';
    text = text.replace(/@p(?:riority)?\(([^)]+)\)/i, (_, p) => {
      const val = p.trim().toLowerCase();
      if (val === 'high' || val === '3') priority = 'high';
      else if (val === 'low' || val === '1') priority = 'low';
      else priority = 'med';
      return '';
    });

    let status: TaskStatus = checked ? 'done' : 'open';
    text = text.replace(/@status\(([^)]+)\)/i, (_, s) => {
      const val = s.trim().toLowerCase();
      if (!checked && (val === 'working' || val === 'in-progress' || val === 'doing')) {
        status = 'working';
      } else if (!checked && val === 'blocked') {
        status = 'blocked';
      }
      return '';
    });

    tasks.push({
      line: i + 1 + lineOffset,
      content: text.replace(/\s{2,}/g, ' ').trim(),
      status,
      priority,
      due,
      tags,
    });
  }
  return tasks;
}

function normalizeDate(d: string): string | null {
  const m = d.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

export interface TaskEdits {
  status?: TaskStatus;
  content?: string;
  due?: string | null;
  priority?: TaskPriority;
}

/**
 * Rewrite the task line at `line` (1-based, in the raw file content) applying
 * edits, preserving the metadata tokens that were not edited.
 */
export function updateTaskLine(raw: string, line: number, edits: TaskEdits): string {
  const lines = raw.split('\n');
  const idx = line - 1;
  if (idx < 0 || idx >= lines.length) return raw;
  const m = lines[idx].match(TASK_RE);
  if (!m) return raw;

  const existing = extractTasks(lines[idx])[0];
  const status = edits.status ?? existing.status;
  const content = (edits.content ?? existing.content).trim();
  const due = edits.due !== undefined ? edits.due : existing.due;
  const priority = edits.priority ?? existing.priority;
  const tags = existing.tags;

  const checkbox = status === 'done' ? 'x' : ' ';
  const parts = [content];
  if (due) parts.push(`@due(${due})`);
  if (priority !== 'med') parts.push(`@p(${priority})`);
  if (status === 'working' || status === 'blocked') parts.push(`@status(${status})`);
  for (const t of tags) parts.push(`#${t}`);

  lines[idx] = `${m[1]}- [${checkbox}] ${parts.join(' ')}`;
  return lines.join('\n');
}

/** Serialize a brand-new task line. */
export function formatTaskLine(
  content: string,
  opts: { status?: TaskStatus; due?: string | null; priority?: TaskPriority; tags?: string[] } = {}
): string {
  const status = opts.status ?? 'open';
  const checkbox = status === 'done' ? 'x' : ' ';
  const parts = [content.trim()];
  if (opts.due) parts.push(`@due(${opts.due})`);
  if (opts.priority && opts.priority !== 'med') parts.push(`@p(${opts.priority})`);
  if (status === 'working' || status === 'blocked') parts.push(`@status(${status})`);
  for (const t of opts.tags ?? []) parts.push(`#${t}`);
  return `- [${checkbox}] ${parts.join(' ')}`;
}

export function taskId(notePath: string, line: number): string {
  return `${notePath}#L${line}`;
}

export function isOverdue(task: Pick<TaskItem, 'due' | 'status'>, todayISO: string): boolean {
  return !!task.due && task.due < todayISO && task.status !== 'done';
}
