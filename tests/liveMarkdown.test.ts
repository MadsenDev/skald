import { describe, expect, it } from 'vitest';
import {
  replaceMarkdownBlock,
  replaceMarkdownBody,
  splitMarkdownBlocks,
} from '../src-shared/liveMarkdown';

describe('live Markdown blocks', () => {
  it('splits common Markdown structures into editable blocks', () => {
    const blocks = splitMarkdownBlocks(
      '# Title\n\nIntro text\nstill intro\n\n- [ ] Do thing\n- [x] Done\n\n```ts\nconst x = 1\n```\n\n> [!note] Hello\n> body'
    );

    expect(blocks.map((b) => b.kind)).toEqual([
      'heading',
      'blank',
      'paragraph',
      'blank',
      'task',
      'blank',
      'code',
      'blank',
      'quote',
    ]);
    expect(blocks[2].raw).toBe('Intro text\nstill intro');
    expect(blocks[6].raw).toBe('```ts\nconst x = 1\n```');
  });

  it('replaces only the selected block', () => {
    const body = '# Title\n\nOld paragraph\n\n- [ ] Task';
    const block = splitMarkdownBlocks(body).find((item) => item.kind === 'paragraph')!;

    expect(replaceMarkdownBlock(body, block, 'New paragraph')).toBe(
      '# Title\n\nNew paragraph\n\n- [ ] Task'
    );
  });

  it('replaces a frontmatter-stripped body without touching frontmatter', () => {
    const content = '---\ntitle: Note\n---\n\nOld body';
    expect(replaceMarkdownBody(content, 4, 'New body')).toBe('---\ntitle: Note\n---\n\nNew body');
  });
});
