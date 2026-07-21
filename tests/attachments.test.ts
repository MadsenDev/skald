import { describe, expect, it } from 'vitest';
import {
  attachmentKind,
  attachmentMarkdown,
  extractAttachmentLinks,
  relativeAttachmentTarget,
  resolveAttachmentPath,
} from '../src-shared/attachments';

describe('attachments', () => {
  it('finds local Markdown file links but ignores external links and anchors', () => {
    expect(
      extractAttachmentLinks(
        '![Map](../Attachments/map.png) [Brief](../Attachments/brief.pdf) [Site](https://skald.dev) [Top](#top)'
      )
    ).toEqual([
      { target: '../Attachments/map.png', label: 'Map', embedded: true },
      { target: '../Attachments/brief.pdf', label: 'Brief', embedded: false },
    ]);
  });

  it('resolves paths relative to the note without allowing vault escapes', () => {
    expect(resolveAttachmentPath('Projects/Skald.md', '../Attachments/map.png')).toBe(
      'Attachments/map.png'
    );
    expect(resolveAttachmentPath('Projects/Skald.md', '../../outside.txt')).toBeNull();
    expect(resolveAttachmentPath('Skald.md', '.skald/settings.json')).toBeNull();
  });

  it('creates portable, encoded Markdown links', () => {
    expect(relativeAttachmentTarget('Projects/Skald.md', 'Attachments/Product map.png')).toBe(
      '../Attachments/Product%20map.png'
    );
    expect(
      attachmentMarkdown('Projects/Skald.md', 'Attachments/Product map.png', 'Product map.png', 'image')
    ).toBe('![Product map.png](../Attachments/Product%20map.png)');
    expect(attachmentKind('brief.pdf')).toBe('pdf');
  });
});
