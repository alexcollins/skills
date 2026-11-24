#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════
   verify-conventions.mjs — part of the agent-conventions skill
   https://github.com/alexcollins/skills/tree/main/skills/agent-conventions

   Checks that the files agents rely on are present, point at things
   that exist, and haven't quietly drifted:

     · AGENTS.md and CLAUDE.md exist, and every relative link resolves
     · when DESIGN.md exists, both point at it
     · when a tokens:check script exists, AGENTS.md names it and the
       build runs it
     · .claude/skills/<name> is a symlink into .agents/skills/<name>,
       not a second copy that can drift
     · every vendored skill is pinned in skills-lock.json, and its
       content still hashes to what the lock recorded — the same
       algorithm `npx skills` uses, so a mismatch means the skill was
       edited locally or updated without the lock
     · CLAUDE.md stays small enough to be worth loading every session
     · docs/<feature>/PLAN.md files carry a status line

     node scripts/verify-conventions.mjs            report; exit 1 on errors
     node scripts/verify-conventions.mjs --json     machine-readable
     node scripts/verify-conventions.mjs --root <dir>

   No dependencies. Node 18+.
   ══════════════════════════════════════════════════════════════════ */

import { existsSync, readFileSync, readdirSync, lstatSync, realpathSync, statSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve, relative, dirname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export const VERSION = '1.1.0';

/* The skills CLI's own hash (vercel-labs/skills). Every regular file under the
   skill, symlinks not followed, .git and node_modules skipped. Two formats exist:
   - current: sorted by path bytes; per file path, NUL, byte length, NUL, content,
     with CRLF normalised to LF in text files.
   - legacy (CLI releases before late 2026): sorted by path, path then content.
   A lock written by either release verifies. */
async function collectSkillFiles(skillDir) {
  const files = [];
  async function collect(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '.git' || entry.name === 'node_modules') return;
          await collect(full);
        } else if (entry.isFile()) {
          files.push({ rel: relative(skillDir, full).split('\\').join('/'), content: await readFile(full) });
        }
      })
    );
  }
  await collect(skillDir);
  return files;
}

function normaliseLineEndings(buf) {
  if (buf.includes(0) || !buf.includes('\r\n')) return buf;
  return Buffer.from(buf.toString('latin1').replaceAll('\r\n', '\n'), 'latin1');
}

export async function computeSkillFolderHashes(skillDir) {
  const files = await collectSkillFiles(skillDir);

  const current = createHash('sha256');
  const byBytes = files
    .map((f) => ({ path: Buffer.from(f.rel, 'utf8'), content: normaliseLineEndings(f.content) }))
    .sort((a, b) => Buffer.compare(a.path, b.path));
  for (const { path, content } of byBytes) {
    current.update(path);
    current.update('\0');
    current.update(String(content.length));
    current.update('\0');
    current.update(content);
  }

  const legacy = createHash('sha256');
  for (const f of [...files].sort((a, b) => a.rel.localeCompare(b.rel))) {
    legacy.update(f.rel);
    legacy.update(f.content);
  }

  return { current: current.digest('hex'), legacy: legacy.digest('hex') };
}

/* The hash the current skills CLI would record. */
export async function computeSkillFolderHash(skillDir) {
  return (await computeSkillFolderHashes(skillDir)).current;
}

/* Markdown links that are paths, not URLs or anchors. */
function relativeLinks(text) {
  const links = [];
  const noCode = text.replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, ' '));
  for (const m of noCode.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = m[1];
    if (/^(https?:|mailto:|#|\/\/)/.test(target)) continue;
    links.push({ target: decodeURIComponent(target.split('#')[0]), line: noCode.slice(0, m.index).split('\n').length });
  }
  return links.filter((l) => l.target);
}

export async function verify(root) {
  const findings = [];
  const add = (level, check, message, where) => findings.push({ level, check, message, ...(where ? { where } : {}) });
  const at = (p) => join(root, p);
  const read = (p) => readFileSync(at(p), 'utf8');

  /* ── AGENTS.md / CLAUDE.md ─────────────────────────────────────── */
  const agents = existsSync(at('AGENTS.md')) ? read('AGENTS.md') : null;
  const claude = existsSync(at('CLAUDE.md')) ? read('CLAUDE.md') : null;
  const claudeIsLink = existsSync(at('CLAUDE.md')) && lstatSync(at('CLAUDE.md')).isSymbolicLink();

  if (!agents) add('error', 'agents-md', 'AGENTS.md is missing. It is the file every coding agent reads — Codex, Cursor, Copilot, Gemini, Claude Code.');
  if (!claude) add('warning', 'claude-md', 'CLAUDE.md is missing. Claude Code reads it on every session; without it, Claude only sees AGENTS.md if something points it there.');

  for (const [name, text] of [['AGENTS.md', agents], ['CLAUDE.md', claudeIsLink ? null : claude]]) {
    if (!text) continue;
    for (const link of relativeLinks(text)) {
      if (!existsSync(resolve(root, link.target))) add('error', 'broken-link', `${name} links to ${link.target}, which does not exist`, `${name}:${link.line}`);
    }
  }

  if (claude && !claudeIsLink) {
    const bytes = Buffer.byteLength(claude);
    const lines = claude.split('\n').length;
    if (bytes > 12_000)
      add('warning', 'claude-md-size', `CLAUDE.md is ${Math.round(bytes / 1024)} KB (${lines} lines) and is loaded into every session. Keep the rules that are broken most often there and move reference material into AGENTS.md or docs/, linked.`);
    if (agents && !/AGENTS\.md/.test(claude))
      add('warning', 'claude-points-to-agents', 'CLAUDE.md never mentions AGENTS.md, so the two can disagree without anyone noticing. Point at it.');
  }

  /* ── The design system, when there is one ──────────────────────── */
  if (existsSync(at('DESIGN.md'))) {
    for (const [name, text] of [['AGENTS.md', agents], ['CLAUDE.md', claude]]) {
      if (text && !/\]\(\.?\/?DESIGN\.md\)/.test(text))
        add('error', 'design-pointer', `${name} does not link to DESIGN.md. Agents build UI without reading it.`, name);
    }
    const design = read('DESIGN.md');
    if (!/^---\r?\n[\s\S]*?\r?\n---/.test(design))
      add('warning', 'design-frontmatter', 'DESIGN.md has no frontmatter. Generate it with design-contract (scripts/design-tokens.mjs) so its tokens come from the code.');
  }

  let pkg = null;
  if (existsSync(at('package.json'))) {
    try {
      pkg = JSON.parse(read('package.json'));
    } catch {
      add('error', 'package-json', 'package.json is not valid JSON');
    }
  }
  const scripts = pkg?.scripts ?? {};
  if (scripts['tokens:check']) {
    if (!/tokens:check/.test(scripts.build ?? '') && !/tokens:check/.test(scripts.prebuild ?? ''))
      add('warning', 'gate', 'tokens:check exists but the build does not run it, so drift reaches production. Prefix the build: "npm run tokens:check && …".');
    if (agents && !/tokens:check/.test(agents)) add('warning', 'gate', 'AGENTS.md does not list tokens:check in its verify commands.');
  }

  /* ── Skills ────────────────────────────────────────────────────── */
  const shared = at('.agents/skills');
  const claudeSkills = at('.claude/skills');
  const sharedNames = existsSync(shared) ? readdirSync(shared).filter((n) => statSync(join(shared, n)).isDirectory()) : [];
  const claudeNames = existsSync(claudeSkills) ? readdirSync(claudeSkills) : [];

  for (const name of sharedNames) {
    const link = join(claudeSkills, name);
    if (!claudeNames.includes(name)) {
      add('warning', 'skill-link', `.agents/skills/${name} is not exposed to Claude Code. Add a symlink: ln -s ../../.agents/skills/${name} .claude/skills/${name}`);
      continue;
    }
    const st = lstatSync(link);
    if (st.isSymbolicLink()) {
      let real;
      try {
        real = realpathSync(link);
      } catch {
        add('error', 'skill-link', `.claude/skills/${name} is a broken symlink`);
        continue;
      }
      if (real !== realpathSync(join(shared, name))) add('warning', 'skill-link', `.claude/skills/${name} points somewhere other than .agents/skills/${name}`);
    } else if (st.isDirectory()) {
      const [a, b] = await Promise.all([computeSkillFolderHash(join(shared, name)), computeSkillFolderHash(link)]);
      if (a === b)
        add('warning', 'skill-copy', `.claude/skills/${name} is a copy of .agents/skills/${name}. Identical today; replace it with a symlink so it can't drift: rm -rf .claude/skills/${name} && ln -s ../../.agents/skills/${name} .claude/skills/${name}`);
      else
        add('error', 'skill-copy', `.claude/skills/${name} is a separate copy that has already drifted from .agents/skills/${name}. Claude Code and every other agent are following different instructions. Decide which is right, then symlink.`);
    }
  }
  for (const name of claudeNames) {
    const p = join(claudeSkills, name);
    if (lstatSync(p).isSymbolicLink() && !existsSync(p)) add('error', 'skill-link', `.claude/skills/${name} is a broken symlink`);
  }

  const lockPath = at('skills-lock.json');
  if (existsSync(lockPath)) {
    let lock;
    try {
      lock = JSON.parse(readFileSync(lockPath, 'utf8'));
    } catch {
      add('error', 'skills-lock', 'skills-lock.json is not valid JSON');
    }
    const pinned = lock?.skills ?? {};
    for (const [name, entry] of Object.entries(pinned)) {
      let dir = join(shared, name);
      if (!existsSync(dir)) {
        /* `npx skills add … -a claude-code` alone installs a Claude-only
           copy straight into .claude/skills. It works — for Claude. */
        const claudeOnly = join(claudeSkills, name);
        if (existsSync(claudeOnly) && !lstatSync(claudeOnly).isSymbolicLink()) {
          add('warning', 'skill-layout', `${name} is installed for Claude Code only (.claude/skills/${name}); Codex, Cursor and other agents can't see it. Reinstall for several agents so it lands in .agents/skills with a .claude/skills symlink: npx skills add ${entry.source ?? '<source>'} --skill ${name} -a claude-code codex cursor`);
          dir = claudeOnly;
        } else {
          add('error', 'skills-lock', `skills-lock.json pins ${name}, but neither .agents/skills/${name} nor .claude/skills/${name} exists. Restore it with: npx skills experimental_install`);
          continue;
        }
      }
      if (entry.computedHash) {
        const { current, legacy } = await computeSkillFolderHashes(dir);
        if (entry.computedHash !== current && entry.computedHash !== legacy)
          add('warning', 'skills-lock', `${name} no longer matches its pinned hash — edited locally, or updated without the lock. If intended, re-add it with npx skills so the lock records the new content.`, `.agents/skills/${name}`);
      }
    }
    for (const name of sharedNames) {
      if (!pinned[name]) {
        const own = existsSync(join(shared, name, 'SKILL.md')) && /metadata:[\s\S]*?author:/m.test(readFileSync(join(shared, name, 'SKILL.md'), 'utf8'));
        add('info', 'skills-lock', `.agents/skills/${name} is not in skills-lock.json${own ? ' (fine if it is authored in this repository)' : ' — pin third-party skills so their source is recorded'}`);
      }
    }
  } else if (sharedNames.length) {
    add('warning', 'skills-lock', 'Skills are vendored in .agents/skills but there is no skills-lock.json, so nothing records where they came from. Install them with npx skills add, which writes it.');
  }

  /* ── Feature docs ──────────────────────────────────────────────── */
  if (existsSync(at('docs'))) {
    for (const dir of readdirSync(at('docs'))) {
      const plan = join('docs', dir, 'PLAN.md');
      if (!existsSync(at(plan))) continue;
      const text = read(plan);
      if (!/^\s*\**status\b/im.test(text) && !/^Status:/m.test(text))
        add('info', 'plan-status', `${plan} has no status line near the top. One line — what is built, what is next — saves every reader the scroll.`);
    }
  }

  /* ── Generated files say so ────────────────────────────────────── */
  if (existsSync(at('design/tokens.json'))) {
    const t = read('design/tokens.json');
    if (!/"\$generated"|"generated"/.test(t)) add('info', 'generated', 'design/tokens.json does not say it is generated. Mark generated files so nobody hand-edits them.');
  }

  return findings;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--root');
  const root = resolve(i >= 0 ? argv[i + 1] : process.cwd());
  const findings = await verify(root);
  const errors = findings.filter((f) => f.level === 'error');
  if (argv.includes('--json')) console.log(JSON.stringify({ ok: !errors.length, findings }, null, 2));
  else {
    const icon = { error: '✗', warning: '!', info: '·' };
    if (!findings.length) console.log('✓ agent conventions: nothing to report');
    for (const level of ['error', 'warning', 'info'])
      for (const f of findings.filter((x) => x.level === level)) console.log(`${icon[level]} ${f.check.padEnd(22)} ${f.message}${f.where ? `  (${f.where})` : ''}`);
    if (findings.length) {
      const n = (l) => findings.filter((f) => f.level === l).length;
      console.log(`\n${n('error')} errors · ${n('warning')} warnings · ${n('info')} notes`);
    }
  }
  process.exitCode = errors.length ? 1 : 0;
}
