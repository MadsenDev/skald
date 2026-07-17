import { describe, it, expect } from 'vitest';
import { extractTasks, updateTaskLine, formatTaskLine } from '../src-shared/tasks';

describe('extractTasks', () => {
  it('extracts open/done tasks with metadata', () => {
    const body = [
      'Intro',
      '- [ ] Ship the editor @due(2026-06-01) @p(high) #editor #ui',
      '- [x] Old thing',
      '- [ ] Waiting on infra @status(blocked)',
      '- [ ] In flight @status(working)',
      '* [ ] star bullet works',
      'not a task',
    ].join('\n');
    const tasks = extractTasks(body);
    expect(tasks).toHaveLength(5);
    expect(tasks[0]).toMatchObject({
      line: 2,
      content: 'Ship the editor',
      status: 'open',
      priority: 'high',
      due: '2026-06-01',
      tags: ['editor', 'ui'],
    });
    expect(tasks[1].status).toBe('done');
    expect(tasks[2].status).toBe('blocked');
    expect(tasks[3].status).toBe('working');
    expect(tasks[4].line).toBe(6);
  });

  it('applies a line offset (frontmatter)', () => {
    const tasks = extractTasks('- [ ] a', 4);
    expect(tasks[0].line).toBe(5);
  });
});

describe('updateTaskLine', () => {
  const raw = ['# T', '- [ ] Write it @due(2026-06-01) @p(high) #x', 'end'].join('\n');

  it('marks done and preserves metadata', () => {
    const out = updateTaskLine(raw, 2, { status: 'done' });
    expect(out.split('\n')[1]).toBe('- [x] Write it @due(2026-06-01) @p(high) #x');
  });

  it('sets working status token', () => {
    const out = updateTaskLine(raw, 2, { status: 'working' });
    expect(out.split('\n')[1]).toContain('@status(working)');
    expect(out.split('\n')[1]).toMatch(/^- \[ \]/);
  });

  it('round-trips through extractTasks', () => {
    const out = updateTaskLine(raw, 2, { status: 'blocked' });
    const t = extractTasks(out)[0];
    expect(t.status).toBe('blocked');
    expect(t.due).toBe('2026-06-01');
    expect(t.priority).toBe('high');
    expect(t.tags).toEqual(['x']);
  });

  it('leaves non-task lines alone', () => {
    expect(updateTaskLine(raw, 1, { status: 'done' })).toBe(raw);
    expect(updateTaskLine(raw, 99, { status: 'done' })).toBe(raw);
  });

  it('edits content', () => {
    const out = updateTaskLine(raw, 2, { content: 'Rewrite it' });
    const t = extractTasks(out)[0];
    expect(t.content).toBe('Rewrite it');
    expect(t.due).toBe('2026-06-01');
  });
});

describe('formatTaskLine', () => {
  it('serializes a full task line', () => {
    const line = formatTaskLine('Do the thing', {
      due: '2026-07-01',
      priority: 'high',
      status: 'working',
      tags: ['a'],
    });
    const t = extractTasks(line)[0];
    expect(t).toMatchObject({
      content: 'Do the thing',
      due: '2026-07-01',
      priority: 'high',
      status: 'working',
      tags: ['a'],
    });
  });
});
