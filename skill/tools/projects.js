#!/usr/bin/env node
'use strict';

/**
 * Data tool for the /projects skill: every change to data/projects.json goes
 * through here, so the file never gets hand-edited into an invalid shape.
 *
 *   node projects.js list
 *   node projects.js get <slug>
 *   node projects.js save --json '<project json>'     upsert by slug
 *   node projects.js set <slug> --status building --pinned true ...
 *   node projects.js delete <slug>                    removes entry + its images
 *   node projects.js hide <slug> | show <slug>
 *   node projects.js pin <slug>  | unpin <slug>
 *   node projects.js boost <slug> <n>                 nudge above busier projects
 *   node projects.js shots <slug>                     rebuild the gallery from disk
 *   node projects.js repo                             print the repo path
 *
 * The author is never taken from an argument: it comes from the local config,
 * so a project is always signed by whoever's machine published it.
 */

const fs = require('node:fs');
const path = require('node:path');

const CATEGORIES = ['Game', 'Web app', 'Experiment'];
const STATUSES = ['live', 'building', 'archived'];

function config() {
  const p = path.join(__dirname, '..', 'config.json');
  if (!fs.existsSync(p)) {
    throw new Error('No config.json next to the skill. Run install.sh first.');
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function dataPath(cfg) {
  return path.join(cfg.repo, 'data', 'projects.json');
}

function read(cfg) {
  return JSON.parse(fs.readFileSync(dataPath(cfg), 'utf8'));
}

function write(cfg, data) {
  data.updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(dataPath(cfg), JSON.stringify(data, null, 2) + '\n');
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function normalize(input, existing, cfg) {
  const name = String(input.name || existing?.name || '').trim();
  if (!name) throw new Error('name is required');
  const slug = slugify(input.slug || existing?.slug || name);
  if (!slug) throw new Error('name must contain letters or numbers');

  const url = String(input.url ?? existing?.url ?? '').trim();
  const repo = String(input.repo ?? existing?.repo ?? '').trim();
  [url, repo].forEach((u) => {
    if (u && !/^https?:\/\//.test(u)) throw new Error('Links must start with http:// or https:// — got ' + u);
  });
  if (!url && !repo) throw new Error('A project needs somewhere to go: url, repo, or both');

  const category = CATEGORIES.includes(input.category) ? input.category
    : (existing?.category || 'Experiment');
  const status = STATUSES.includes(input.status) ? input.status
    : (existing?.status || (url ? 'live' : 'building'));

  const stack = Array.isArray(input.stack) ? input.stack
    : (typeof input.stack === 'string' ? input.stack.split(',') : existing?.stack || []);

  const body = Array.isArray(input.body) ? input.body.filter(Boolean)
    : (existing?.body || []);

  return {
    slug,
    name,
    author: existing?.author || cfg.author,      // never re-signed by someone else
    category,
    status,
    year: String(input.year || existing?.year || new Date().getFullYear()),
    pinned: input.pinned != null ? Boolean(input.pinned) : Boolean(existing?.pinned),
    hidden: input.hidden != null ? Boolean(input.hidden) : Boolean(existing?.hidden),
    boost: Number.isFinite(Number(input.boost)) ? Number(input.boost) : Number(existing?.boost || 0),
    url,
    repo,
    description: String(input.description ?? existing?.description ?? '').trim(),
    body,
    stack: [...new Set(stack.map((s) => String(s).trim()).filter(Boolean))].slice(0, 12),
    image: input.image || existing?.image || `project-images/${slug}.webp`,
    shots: Array.isArray(input.shots) ? input.shots : (existing?.shots || [])
  };
}

function findShots(cfg, slug) {
  const dir = path.join(cfg.repo, 'project-images');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f === `${slug}.webp` || new RegExp(`^${slug}-\\d+\\.webp$`).test(f))
    .sort((a, b) => {
      const n = (x) => Number((x.match(/-(\d+)\.webp$/) || [0, 1])[1]);
      return n(a) - n(b);
    })
    .map((f) => 'project-images/' + f);
}

function parseSetArgs(argv, from) {
  const out = {};
  for (let i = from; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const value = argv[++i];
    if (value === 'true' || value === 'false') out[key] = value === 'true';
    else if (key === 'stack' || key === 'body') out[key] = value.split('|').map((s) => s.trim());
    else out[key] = value;
  }
  return out;
}

function main() {
  const cfg = config();
  const [cmd, arg] = process.argv.slice(2);
  const data = fs.existsSync(dataPath(cfg)) ? read(cfg) : { version: 1, projects: [] };
  const at = (slug) => data.projects.findIndex((p) => p.slug === slug);

  switch (cmd) {
    case 'repo':
      console.log(cfg.repo);
      return;

    case 'list': {
      const rows = data.projects.map((p) => [
        p.pinned ? 'PIN' : '   ',
        p.hidden ? 'HIDDEN' : p.status.toUpperCase().padEnd(8),
        p.slug.padEnd(24),
        p.author,
        p.url || p.repo
      ].join('  '));
      console.log(rows.join('\n') || '(nothing published yet)');
      return;
    }

    case 'get': {
      const p = data.projects[at(arg)];
      if (!p) throw new Error('No project called ' + arg);
      console.log(JSON.stringify(p, null, 2));
      return;
    }

    case 'save': {
      const idx = process.argv.indexOf('--json');
      if (idx === -1) throw new Error('save needs --json');
      const input = JSON.parse(process.argv[idx + 1]);
      const slug = slugify(input.slug || input.name);
      const i = at(slug);
      const existing = i === -1 ? null : data.projects[i];
      if (existing && existing.author !== cfg.author) {
        throw new Error(`"${slug}" belongs to ${existing.author}. Ask them to change it.`);
      }
      const next = normalize(input, existing, cfg);
      next.shots = findShots(cfg, next.slug);
      if (i === -1) data.projects.push(next); else data.projects[i] = next;
      write(cfg, data);
      console.log(JSON.stringify({ ok: true, action: i === -1 ? 'added' : 'updated', project: next }, null, 2));
      return;
    }

    case 'set': {
      const i = at(arg);
      if (i === -1) throw new Error('No project called ' + arg);
      if (data.projects[i].author !== cfg.author) {
        throw new Error(`"${arg}" belongs to ${data.projects[i].author}. Ask them to change it.`);
      }
      const patch = parseSetArgs(process.argv, 4);
      data.projects[i] = normalize({ ...data.projects[i], ...patch }, data.projects[i], cfg);
      write(cfg, data);
      console.log(JSON.stringify({ ok: true, project: data.projects[i] }, null, 2));
      return;
    }

    case 'hide': case 'show': case 'pin': case 'unpin': {
      const i = at(arg);
      if (i === -1) throw new Error('No project called ' + arg);
      if (cmd === 'hide') data.projects[i].hidden = true;
      if (cmd === 'show') data.projects[i].hidden = false;
      if (cmd === 'pin') data.projects[i].pinned = true;
      if (cmd === 'unpin') data.projects[i].pinned = false;
      write(cfg, data);
      console.log(JSON.stringify({ ok: true, project: data.projects[i] }, null, 2));
      return;
    }

    case 'boost': {
      const i = at(arg);
      if (i === -1) throw new Error('No project called ' + arg);
      data.projects[i].boost = Number(process.argv[4] || 0);
      write(cfg, data);
      console.log(JSON.stringify({ ok: true, project: data.projects[i] }, null, 2));
      return;
    }

    case 'shots': {
      const i = at(arg);
      if (i === -1) throw new Error('No project called ' + arg);
      data.projects[i].shots = findShots(cfg, arg);
      if (data.projects[i].shots.length) data.projects[i].image = data.projects[i].shots[0];
      write(cfg, data);
      console.log(JSON.stringify({ ok: true, shots: data.projects[i].shots }, null, 2));
      return;
    }

    case 'delete': {
      const i = at(arg);
      if (i === -1) throw new Error('No project called ' + arg);
      const gone = data.projects[i];
      if (gone.author !== cfg.author) {
        throw new Error(`"${arg}" belongs to ${gone.author}. Ask them to remove it.`);
      }
      data.projects.splice(i, 1);
      write(cfg, data);
      const removed = [];
      findShots(cfg, arg).forEach((rel) => {
        const abs = path.join(cfg.repo, rel);
        if (fs.existsSync(abs)) { fs.unlinkSync(abs); removed.push(rel); }
      });
      console.log(JSON.stringify({ ok: true, deleted: arg, images: removed }, null, 2));
      return;
    }

    default:
      console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].split('/**')[1].trim());
  }
}

try {
  main();
} catch (e) {
  console.error('Error: ' + e.message);
  process.exit(1);
}
