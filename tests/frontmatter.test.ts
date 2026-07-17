import { describe, it, expect } from 'vitest';
import { parseFrontmatter, serializeFrontmatter } from '../src-shared/frontmatter';

describe('parseFrontmatter', () => {
  it('handles notes without frontmatter', () => {
    const r = parseFrontmatter('# Hello\n\nWorld');
    expect(r.hasFrontmatter).toBe(false);
    expect(r.frontmatter).toEqual({});
    expect(r.body).toBe('# Hello\n\nWorld');
    expect(r.bodyStartLine).toBe(0);
  });

  it('parses scalars, arrays and quoted strings', () => {
    const raw = [
      '---',
      'schema: Project',
      'title: "The: tricky title"',
      'tags: [design, vision]',
      'count: 3',
      'done: false',
      'created: 2026-05-12',
      '---',
      '',
      'Body here',
    ].join('\n');
    const r = parseFrontmatter(raw);
    expect(r.hasFrontmatter).toBe(true);
    expect(r.frontmatter['schema']).toBe('Project');
    expect(r.frontmatter['title']).toBe('The: tricky title');
    expect(r.frontmatter['tags']).toEqual(['design', 'vision']);
    expect(r.frontmatter['count']).toBe(3);
    expect(r.frontmatter['done']).toBe(false);
    expect(r.frontmatter['created']).toBe('2026-05-12');
    expect(r.body).toBe('\nBody here');
  });

  it('parses block lists', () => {
    const raw = '---\ntags:\n  - one\n  - two\n---\nx';
    const r = parseFrontmatter(raw);
    expect(r.frontmatter['tags']).toEqual(['one', 'two']);
  });

  it('computes bodyStartLine correctly', () => {
    const raw = '---\na: 1\n---\nline4';
    const r = parseFrontmatter(raw);
    // body 'line4' starts on line index 3 (0-based), i.e. file line 4
    expect(r.bodyStartLine).toBe(3);
    expect(raw.split('\n')[r.bodyStartLine]).toBe('line4');
  });

  it('round-trips through serialize', () => {
    const fm = { schema: 'Note', tags: ['a', 'b'], created: '2026-01-01' };
    const out = serializeFrontmatter(fm, 'Hello');
    const back = parseFrontmatter(out);
    expect(back.frontmatter).toEqual(fm);
    expect(back.body.trim()).toBe('Hello');
  });
});
