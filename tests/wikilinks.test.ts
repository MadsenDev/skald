import { describe, it, expect } from 'vitest';
import {
  extractWikilinkTargets,
  countWikilinks,
  renameWikilinks,
  parseWikilink,
  snippetAround,
} from '../src-shared/wikilinks';

describe('wikilinks', () => {
  it('extracts distinct targets, ignoring code', () => {
    const body =
      'See [[Alpha]] and [[Beta|the b note]] and [[Alpha#Heading]].\n`[[NotThis]]`\n```\n[[NorThis]]\n```';
    expect(extractWikilinkTargets(body)).toEqual(['Alpha', 'Beta']);
  });

  it('counts occurrences', () => {
    expect(countWikilinks('[[A]] x [[A]] y [[B]]')).toBe(3);
  });

  it('parses pipe and heading', () => {
    expect(parseWikilink('Note#Sec|Shown')).toEqual({
      target: 'Note',
      heading: 'Sec',
      display: 'Shown',
    });
    expect(parseWikilink('Just A Note')).toEqual({
      target: 'Just A Note',
      heading: null,
      display: 'Just A Note',
    });
  });

  it('renames targets case-insensitively, preserving display', () => {
    const body = 'A [[old name|shown]] and [[Old Name#H]] and [[Other]]';
    const out = renameWikilinks(body, 'Old Name', 'New Name');
    expect(out).toBe('A [[New Name|shown]] and [[New Name#H]] and [[Other]]');
  });

  it('builds a snippet around the mention', () => {
    const body = 'x'.repeat(200) + ' before [[Target]] after ' + 'y'.repeat(200);
    const s = snippetAround(body, 'Target');
    expect(s).toContain('[[Target]]');
    expect(s.startsWith('…')).toBe(true);
    expect(s.endsWith('…')).toBe(true);
  });
});
