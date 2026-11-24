#!/usr/bin/env node
// Checks every skills/<name>/SKILL.md against the Agent Skills format and this repo's conventions:
// frontmatter present, name matches the folder, description within the spec's limit, metadata
// carries author and version, and every relative link in every Markdown file resolves.
// Exit 1 on any error.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = join(root, 'skills');
const errors = [];
const err = (file, msg) => errors.push(`${relative(root, file)}: ${msg}`);

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const fields = {};
  let key = null;
  for (const line of m[1].split('\n')) {
    const top = line.match(/^([a-z][\w-]*):\s*(.*)$/);
    if (top) {
      key = top[1];
      fields[key] = top[2] === '>-' || top[2] === '|' ? '' : top[2].replace(/^"(.*)"$/, '$1');
    } else if (key && /^\s+/.test(line)) {
      fields[key] = `${fields[key]} ${line.trim()}`.trim();
    }
  }
  return fields;
}

// templates/ hold files copied into other projects; their links resolve there, not here.
function markdownFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) return entry === 'templates' ? [] : markdownFiles(p);
    return p.endsWith('.md') ? [p] : [];
  });
}

const names = readdirSync(skillsDir).filter((d) => statSync(join(skillsDir, d)).isDirectory());

for (const name of names) {
  const file = join(skillsDir, name, 'SKILL.md');
  if (!existsSync(file)) { err(join(skillsDir, name), 'no SKILL.md'); continue; }
  const fm = frontmatter(readFileSync(file, 'utf8'));
  if (!fm) { err(file, 'no frontmatter'); continue; }

  if (fm.name !== name) err(file, `name "${fm.name}" does not match folder "${name}"`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64)
    err(file, 'name must be lowercase words joined by hyphens, at most 64 characters');
  if (!fm.description) err(file, 'description is missing');
  else if (fm.description.length > 1024)
    err(file, `description is ${fm.description.length} characters; the spec allows 1024`);
  if (!('metadata' in fm)) err(file, 'metadata (author, version) is missing');
  else {
    const raw = readFileSync(file, 'utf8');
    if (!/\n\s+author:\s*\S/.test(raw)) err(file, 'metadata.author is missing');
    if (!/\n\s+version:\s*"?\d+\.\d+\.\d+/.test(raw)) err(file, 'metadata.version is missing');
  }

  for (const md of markdownFiles(join(skillsDir, name))) {
    const text = readFileSync(md, 'utf8').replace(/```[\s\S]*?```/g, '');
    for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const path = resolve(dirname(md), target.split('#')[0]);
      if (!existsSync(path)) err(md, `broken link: ${target}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} problem(s) in ${names.length} skills`);
  process.exit(1);
}
console.log(`${names.length} skills OK`);
