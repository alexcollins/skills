/* node --test scripts/verify-conventions.test.mjs */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

import { verify, computeSkillFolderHash } from './verify-conventions.mjs';

function repo(files) {
  const root = mkdtempSync(join(tmpdir(), 'conventions-'));
  for (const [p, s] of Object.entries(files)) {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), s);
  }
  return root;
}
const checks = (findings, level) => findings.filter((f) => !level || f.level === level).map((f) => f.check);

test('a well-formed repository has nothing to report', async () => {
  const root = repo({
    'AGENTS.md': '# AGENTS.md\n\nRead [DESIGN.md](./DESIGN.md). Verify: `npm run tokens:check`.\n',
    'CLAUDE.md': '# X\n\nSee [AGENTS.md](./AGENTS.md) and [DESIGN.md](./DESIGN.md).\n',
    'DESIGN.md': '---\nname: "x"\n---\n\n## Overview\n',
    'package.json': JSON.stringify({ scripts: { 'tokens:check': 'node x', build: 'npm run tokens:check && next build' } }),
    '.agents/skills/polish/SKILL.md': '---\nname: polish\ndescription: d\n---\n',
  });
  try {
    mkdirSync(join(root, '.claude/skills'), { recursive: true });
    symlinkSync('../../.agents/skills/polish', join(root, '.claude/skills/polish'));
    const hash = await computeSkillFolderHash(join(root, '.agents/skills/polish'));
    writeFileSync(join(root, 'skills-lock.json'), JSON.stringify({ version: 1, skills: { polish: { source: 'a/b', computedHash: hash } } }));
    const findings = await verify(root);
    assert.deepEqual(findings, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('missing files, broken links and a missing design pointer are errors', async () => {
  const root = repo({
    'CLAUDE.md': '# X\n\nSee [the plan](docs/plan.md).\n',
    'DESIGN.md': '## Overview\n',
  });
  try {
    const f = await verify(root);
    assert.ok(checks(f, 'error').includes('agents-md'));
    assert.ok(checks(f, 'error').includes('broken-link'));
    assert.ok(checks(f, 'error').includes('design-pointer'));
    assert.ok(checks(f, 'warning').includes('design-frontmatter'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a links inside a code block are not checked', async () => {
  const root = repo({ 'AGENTS.md': '# A\n\n```md\n[x](./nope.md)\n```\n', 'CLAUDE.md': 'See [AGENTS.md](./AGENTS.md).' });
  try {
    assert.ok(!checks(await verify(root)).includes('broken-link'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a copied skill is a warning while identical and an error once it drifts', async () => {
  const root = repo({
    'AGENTS.md': '# A',
    'CLAUDE.md': 'See [AGENTS.md](./AGENTS.md).',
    '.agents/skills/polish/SKILL.md': '---\nname: polish\ndescription: d\n---\nv1\n',
  });
  try {
    cpSync(join(root, '.agents/skills/polish'), join(root, '.claude/skills/polish'), { recursive: true });
    let f = await verify(root);
    assert.equal(f.find((x) => x.check === 'skill-copy').level, 'warning');
    writeFileSync(join(root, '.claude/skills/polish/SKILL.md'), '---\nname: polish\ndescription: d\n---\nv2\n');
    f = await verify(root);
    assert.equal(f.find((x) => x.check === 'skill-copy').level, 'error');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a skill edited after install no longer matches the lock', async () => {
  const root = repo({
    'AGENTS.md': '# A',
    'CLAUDE.md': 'See [AGENTS.md](./AGENTS.md).',
    '.agents/skills/polish/SKILL.md': 'original',
  });
  try {
    const hash = await computeSkillFolderHash(join(root, '.agents/skills/polish'));
    writeFileSync(join(root, 'skills-lock.json'), JSON.stringify({ version: 1, skills: { polish: { computedHash: hash }, gone: { computedHash: 'x' } } }));
    writeFileSync(join(root, '.agents/skills/polish/SKILL.md'), 'edited');
    const f = await verify(root);
    assert.ok(f.some((x) => x.check === 'skills-lock' && /polish no longer matches/.test(x.message)));
    assert.ok(f.some((x) => x.check === 'skills-lock' && x.level === 'error' && /pins gone/.test(x.message)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a Claude-only install is a layout warning, not a missing skill', async () => {
  const root = repo({ 'AGENTS.md': '# A', 'CLAUDE.md': 'See [AGENTS.md](./AGENTS.md).', '.claude/skills/polish/SKILL.md': 'x' });
  try {
    const hash = await computeSkillFolderHash(join(root, '.claude/skills/polish'));
    writeFileSync(join(root, 'skills-lock.json'), JSON.stringify({ version: 1, skills: { polish: { source: 'a/b', computedHash: hash } } }));
    const f = await verify(root);
    assert.ok(!f.some((x) => x.level === 'error'), JSON.stringify(f));
    assert.ok(f.some((x) => x.check === 'skill-layout' && /-a claude-code codex cursor/.test(x.message)));
    assert.ok(!f.some((x) => /no longer matches/.test(x.message)), 'the hash is checked where the skill actually is');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a tokens:check the build never runs is flagged', async () => {
  const root = repo({
    'AGENTS.md': '# A',
    'CLAUDE.md': 'See [AGENTS.md](./AGENTS.md).',
    'package.json': JSON.stringify({ scripts: { 'tokens:check': 'node x', build: 'next build' } }),
  });
  try {
    const gate = (await verify(root)).filter((x) => x.check === 'gate').map((x) => x.message);
    assert.ok(gate.some((m) => /build does not run it/.test(m)));
    assert.ok(gate.some((m) => /AGENTS\.md does not list tokens:check/.test(m)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the hash is the skills CLI hash: path and content, sorted, symlinks skipped', async () => {
  const a = repo({ 'b.md': 'B', 'a/x.md': 'X' });
  const b = repo({ 'a/x.md': 'X', 'b.md': 'B' });
  try {
    assert.equal(await computeSkillFolderHash(a), await computeSkillFolderHash(b));
    writeFileSync(join(b, 'b.md'), 'changed');
    assert.notEqual(await computeSkillFolderHash(a), await computeSkillFolderHash(b));
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});
