import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Vault } from '../src-main/vault';

let dir: string;
let vault: Vault;

async function makeVault(): Promise<Vault> {
  const v = new Vault(dir, () => {});
  await v.open();
  return v;
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'skald-test-'));
  mkdirSync(join(dir, 'Daily'));
  mkdirSync(join(dir, 'Projects'));
  writeFileSync(
    join(dir, 'Projects', 'Jormungandr.md'),
    [
      '---',
      'schema: Project',
      'created: 2026-05-01',
      'tags: [api]',
      '---',
      '',
      'The API rewrite. Depends on [[Stack decisions]].',
      '',
      '## Threads',
      '',
      '- [ ] Ship the new editor @due(2026-05-01) @p(high) #editor',
      '- [x] Pick a framework',
      '',
    ].join('\n')
  );
  writeFileSync(
    join(dir, 'Stack decisions.md'),
    ['# Stack decisions', '', 'Everything flows from [[Jormungandr]].', ''].join('\n')
  );
  writeFileSync(
    join(dir, 'Daily', '2026-05-28.md'),
    ['Worked on [[Jormungandr]] today.', ''].join('\n')
  );
});

afterEach(async () => {
  await vault?.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('Vault end-to-end', () => {
  it('scans, types, links, and counts', async () => {
    vault = await makeVault();
    const snap = vault.snapshot();

    expect(snap.notes).toHaveLength(3);
    const proj = snap.notes.find((n) => n.title === 'Jormungandr')!;
    expect(proj.schema).toBe('Project');
    expect(proj.tags).toEqual(['api']);
    expect(proj.links).toEqual(['Stack decisions.md']);

    const daily = snap.notes.find((n) => n.title === '2026-05-28')!;
    expect(daily.schema).toBe('Daily');

    expect(snap.tasks).toHaveLength(2);
    const open = snap.tasks.find((t) => t.status === 'open')!;
    expect(open.content).toBe('Ship the new editor');
    expect(open.due).toBe('2026-05-01');
    expect(snap.stats.tasksOpen).toBe(1);
    expect(snap.stats.overdue).toBe(1); // due 2026-05-01 is past

    // graph: 3 nodes, edges between linked notes, positions laid out
    expect(snap.graph.nodes).toHaveLength(3);
    expect(snap.graph.edges.length).toBeGreaterThanOrEqual(2);
    for (const n of snap.graph.nodes) {
      expect(n.x).toBeGreaterThan(0);
      expect(n.x).toBeLessThan(1);
    }

    // tree structure
    expect(snap.tree.folders.map((f) => f.name).sort()).toEqual(['Daily', 'Projects']);
    expect(snap.tree.notes).toEqual(['Stack decisions.md']);
  });

  it('reads notes with backlinks and snippets', async () => {
    vault = await makeVault();
    const payload = vault.readNote('Projects/Jormungandr.md');
    expect(payload.backlinks.map((b) => b.title).sort()).toEqual(['2026-05-28', 'Stack decisions']);
    expect(payload.backlinks[0].snippet).toContain('[[Jormungandr]]');
    expect(payload.bodyStartLine).toBe(5);
  });

  it('toggles a task and writes the file', async () => {
    vault = await makeVault();
    const snap = vault.snapshot();
    const open = snap.tasks.find((t) => t.status === 'open')!;
    await vault.updateTask(open.id, { status: 'done' });

    const onDisk = readFileSync(join(dir, 'Projects', 'Jormungandr.md'), 'utf-8');
    expect(onDisk).toContain('- [x] Ship the new editor @due(2026-05-01) @p(high) #editor');
    expect(vault.snapshot().stats.tasksOpen).toBe(0);

    await vault.updateTask(open.id, { status: 'working' });
    const again = readFileSync(join(dir, 'Projects', 'Jormungandr.md'), 'utf-8');
    expect(again).toContain('@status(working)');
    expect(vault.snapshot().tasks.find((t) => t.id === open.id)?.status).toBe('working');
  });

  it('adds a task to a note', async () => {
    vault = await makeVault();
    await vault.addTask('Stack decisions.md', 'Evaluate CodeMirror', { priority: 'high' });
    const onDisk = readFileSync(join(dir, 'Stack decisions.md'), 'utf-8');
    expect(onDisk.trim().endsWith('- [ ] Evaluate CodeMirror @p(high)')).toBe(true);
    expect(vault.snapshot().tasks.some((t) => t.content === 'Evaluate CodeMirror')).toBe(true);
  });

  it('creates notes with schema frontmatter and unique paths', async () => {
    vault = await makeVault();
    const p1 = await vault.createNote('Projects', 'New Saga', 'Project');
    const p2 = await vault.createNote('Projects', 'New Saga', 'Project');
    expect(p1).toBe('Projects/New Saga.md');
    expect(p2).toBe('Projects/New Saga 2.md');
    const meta = vault.snapshot().notes.find((n) => n.path === p1)!;
    expect(meta.schema).toBe('Project');
  });

  it('renames a note and rewrites wikilinks across the vault', async () => {
    vault = await makeVault();
    const newPath = await vault.renameNote('Projects/Jormungandr.md', 'World Serpent');
    expect(newPath).toBe('Projects/World Serpent.md');

    const stack = readFileSync(join(dir, 'Stack decisions.md'), 'utf-8');
    expect(stack).toContain('[[World Serpent]]');
    expect(stack).not.toContain('[[Jormungandr]]');

    const daily = readFileSync(join(dir, 'Daily', '2026-05-28.md'), 'utf-8');
    expect(daily).toContain('[[World Serpent]]');

    const snap = vault.snapshot();
    const renamed = snap.notes.find((n) => n.path === newPath)!;
    expect(renamed.title).toBe('World Serpent');
    // links still resolve after rename
    const stackMeta = snap.notes.find((n) => n.title === 'Stack decisions')!;
    expect(stackMeta.links).toEqual([newPath]);
  });

  it('deletes notes and updates stats', async () => {
    vault = await makeVault();
    await vault.deleteNote('Daily/2026-05-28.md');
    const snap = vault.snapshot();
    expect(snap.notes).toHaveLength(2);
    expect(snap.notes.some((n) => n.title === '2026-05-28')).toBe(false);
  });

  it('persists and applies settings', async () => {
    vault = await makeVault();
    vault.setSettings({ theme: 'light', marginOn: false });
    await vault.close();
    vault = await makeVault();
    expect(vault.getSettings().theme).toBe('light');
    expect(vault.getSettings().marginOn).toBe(false);
  });

  it('records activity for real events', async () => {
    vault = await makeVault();
    await vault.createNote('', 'Fresh', 'Idea');
    const snap = vault.snapshot();
    expect(snap.activity[0]).toMatchObject({ kind: 'note', verb: 'created', title: 'Fresh' });
  });

  it('seeds an empty vault with a welcome saga', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'skald-empty-'));
    const v = new Vault(empty, () => {});
    await v.open();
    await v.seed();
    const snap = v.snapshot();
    expect(snap.notes.length).toBe(2);
    expect(snap.notes.some((n) => n.title === 'Welcome to Skald')).toBe(true);
    expect(snap.tasks.length).toBeGreaterThan(0);
    // welcome links to the daily note
    const welcome = snap.notes.find((n) => n.title === 'Welcome to Skald')!;
    expect(welcome.links.length).toBe(1);
    await v.close();
    rmSync(empty, { recursive: true, force: true });
  });
});
