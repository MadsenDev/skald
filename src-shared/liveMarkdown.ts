export type MarkdownBlockKind =
  | 'blank'
  | 'heading'
  | 'code'
  | 'quote'
  | 'task'
  | 'list'
  | 'rule'
  | 'paragraph';

export interface MarkdownBlock {
  id: string;
  kind: MarkdownBlockKind;
  startLine: number;
  endLine: number;
  raw: string;
}

const TASK_LINE = /^\s*[-*+]\s+\[( |x|X)\]\s+/;
const UL_LINE = /^\s*[-*+]\s+(?!\[[ xX]\]\s)/;
const OL_LINE = /^\s*\d+[.)]\s+/;
const HR_LINE = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;

export function splitMarkdownBlocks(body: string): MarkdownBlock[] {
  if (body.length === 0) {
    return [{ id: 'b0-0', kind: 'blank', startLine: 0, endLine: 0, raw: '' }];
  }

  const lines = body.split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  const push = (kind: MarkdownBlockKind, start: number, end: number) => {
    blocks.push({
      id: `b${start}-${end}`,
      kind,
      startLine: start,
      endLine: end,
      raw: lines.slice(start, end + 1).join('\n'),
    });
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      const start = i;
      while (i < lines.length && !lines[i].trim()) i++;
      push('blank', start, i - 1);
      continue;
    }

    if (/^\s*```/.test(line)) {
      const start = i;
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) i++;
      if (i < lines.length) i++;
      push('code', start, i - 1);
      continue;
    }

    if (/^(#{1,6})\s+/.test(line)) {
      push('heading', i, i);
      i++;
      continue;
    }

    if (HR_LINE.test(line)) {
      push('rule', i, i);
      i++;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const start = i;
      while (i < lines.length && /^\s*>/.test(lines[i])) i++;
      push('quote', start, i - 1);
      continue;
    }

    if (TASK_LINE.test(line)) {
      const start = i;
      while (i < lines.length && TASK_LINE.test(lines[i])) i++;
      push('task', start, i - 1);
      continue;
    }

    if (UL_LINE.test(line) || OL_LINE.test(line)) {
      const start = i;
      const matcher = UL_LINE.test(line) ? UL_LINE : OL_LINE;
      while (i < lines.length && matcher.test(lines[i])) i++;
      push('list', start, i - 1);
      continue;
    }

    const start = i;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*(#{1,6}\s|>|```)/.test(lines[i]) &&
      !TASK_LINE.test(lines[i]) &&
      !UL_LINE.test(lines[i]) &&
      !OL_LINE.test(lines[i]) &&
      !HR_LINE.test(lines[i])
    ) {
      i++;
    }
    push('paragraph', start, i - 1);
  }

  return blocks;
}

export function replaceMarkdownBlock(
  body: string,
  block: Pick<MarkdownBlock, 'startLine' | 'endLine'>,
  raw: string
): string {
  const lines = body.length === 0 ? [''] : body.split('\n');
  const replacement = raw.length === 0 ? [''] : raw.split('\n');
  lines.splice(block.startLine, block.endLine - block.startLine + 1, ...replacement);
  return lines.join('\n');
}

export function replaceMarkdownBody(content: string, bodyStartLine: number, body: string): string {
  const lines = content.split('\n');
  const frontmatter = lines.slice(0, bodyStartLine).join('\n');
  if (!frontmatter) return body;
  return `${frontmatter}\n${body}`;
}
