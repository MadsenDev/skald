import type { AttachmentKind } from './types';

export interface ParsedAttachmentLink {
  target: string;
  label: string;
  embedded: boolean;
}

const LINK_RE = /(!)?\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export function isExternalTarget(target: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|#)/i.test(target);
}

export function extractAttachmentLinks(markdown: string): ParsedAttachmentLink[] {
  const out: ParsedAttachmentLink[] = [];
  for (const match of markdown.matchAll(LINK_RE)) {
    const target = match[3].replace(/^<|>$/g, '');
    if (isExternalTarget(target)) continue;
    out.push({ target, label: match[2], embedded: match[1] === '!' });
  }
  return out;
}

export function resolveAttachmentPath(notePath: string, target: string): string | null {
  const withoutSuffix = target.split(/[?#]/, 1)[0];
  let decoded: string;
  try {
    decoded = decodeURIComponent(withoutSuffix);
  } catch {
    return null;
  }
  const clean = decoded.replace(/\\/g, '/');
  const parts = clean.startsWith('/')
    ? []
    : notePath.split('/').slice(0, -1).filter(Boolean);
  for (const part of clean.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (parts.length === 0) return null;
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  const resolved = parts.join('/');
  return !resolved || resolved === '.skald' || resolved.startsWith('.skald/') ? null : resolved;
}

export function relativeAttachmentTarget(notePath: string, attachmentPath: string): string {
  const from = notePath.split('/').slice(0, -1).filter(Boolean);
  const to = attachmentPath.split('/').filter(Boolean);
  let common = 0;
  while (common < from.length && common < to.length && from[common] === to[common]) common++;
  const relative = [
    ...from.slice(common).map(() => '..'),
    ...to.slice(common),
  ];
  return relative.map((part) => encodeURIComponent(part)).join('/');
}

export function attachmentMime(name: string, provided = ''): string {
  if (provided) return provided;
  const ext = name.toLowerCase().match(/\.([^.]+)$/)?.[1] ?? '';
  return ({
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    pdf: 'application/pdf',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    mp4: 'video/mp4',
    webm: 'video/webm',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    zip: 'application/zip',
  } as Record<string, string>)[ext] ?? 'application/octet-stream';
}

export function attachmentKind(name: string, mime = ''): AttachmentKind {
  const type = attachmentMime(name, mime);
  if (type.startsWith('image/')) return 'image';
  if (type === 'application/pdf') return 'pdf';
  if (type.startsWith('audio/')) return 'audio';
  if (type.startsWith('video/')) return 'video';
  return 'file';
}

export function attachmentMarkdown(
  notePath: string,
  attachmentPath: string,
  displayName: string,
  kind: AttachmentKind
): string {
  const target = relativeAttachmentTarget(notePath, attachmentPath);
  const label = displayName.replace(/[\[\]\\]/g, ' ').replace(/\s+/g, ' ').trim() || 'attachment';
  return kind === 'image' ? `![${label}](${target})` : `[${label}](${target})`;
}
