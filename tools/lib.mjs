/* Shared pieces for the Gzowo Labs tools: paths, the project schema, the em-dash lint.
   Node only, no dependencies. */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const projectsFile = join(root, "data/projects.json");
export const siteFile = join(root, "data/site.json");
export const rocketsFile = join(root, "data/rockets.json");

export const CATEGORIES = ["Game", "Web app", "Experiment", "AI model", "Hardware"];
export const STATUSES = ["live", "building", "archive"];
export const SECTIONS = ["rockets", "printing", "games", "software"];
const SECTION_BY_CATEGORY = { Game: "games", "Web app": "software", Experiment: "software", "AI model": "software", Hardware: "printing" };
export const sectionOf = (p) => p.section || SECTION_BY_CATEGORY[p.category] || "software";

export const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
export const site = () => readJson(siteFile);
export const loadProjects = () => readJson(projectsFile);

export function saveProjects(data) {
  const text = JSON.stringify(data, null, 2) + "\n";
  const hits = findDashes(text, "data/projects.json");
  if (hits.length) throw new Error("Refusing to save, em dash found:\n" + hits.join("\n"));
  writeFileSync(projectsFile, text);
}

/* The ban is on the em dash in every spelling a browser would render as one. */
const DASH = new RegExp(String.fromCharCode(0x2014) + "|&mdash;|&#0*8212;|&#x0*2014;|\\\\u2014", "i");

export function findDashes(text, label) {
  const out = [];
  text.split("\n").forEach((line, i) => {
    if (DASH.test(line)) out.push(`${label}:${i + 1}: ${line.trim().slice(0, 140)}`);
  });
  return out;
}

const SCAN_EXT = /\.(html|json|js|mjs|css|svg|md|txt|sh)$/;
const SKIP = new Set([".git", "node_modules", ".shots", "legacy", ".DS_Store"]);

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (SCAN_EXT.test(name)) files.push(full);
  }
  return files;
}

/* Scans the whole publishable repo, generated pages included. */
export function lintRepo() {
  const hits = [];
  for (const file of walk(root)) {
    if (file === join(root, "tools/lib.mjs")) continue; // holds the patterns it searches for
    hits.push(...findDashes(readFileSync(file, "utf8"), relative(root, file)));
  }
  return hits;
}

/* What a project entry must have. `need` returns the questions Claude has to ask the
   human before it may write the entry: a missing field is never guessed. */
export function checkProject(p) {
  const need = [];
  const errors = [];
  const has = (v) => typeof v === "string" && v.trim().length > 0;

  if (!has(p.slug) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) errors.push("slug must be lowercase-hyphens");
  if (!has(p.name)) need.push("name (display title)");
  if (!CATEGORIES.includes(p.category)) need.push(`category, one of: ${CATEGORIES.join(", ")}`);
  if (p.section && !SECTIONS.includes(p.section)) errors.push(`section must be one of: ${SECTIONS.join(", ")}`);
  if (!STATUSES.includes(p.status)) need.push(`status, one of: ${STATUSES.join(", ")}`);
  if (!/^\d{4}$/.test(String(p.year || ""))) need.push("year (4 digits)");
  if (!has(p.blurb) || p.blurb.trim().length < 20) need.push("blurb (one sentence, 20+ characters)");
  if (!Array.isArray(p.body) || p.body.length === 0) need.push("body (2 to 4 paragraphs of copy)");
  if (!Array.isArray(p.stack) || p.stack.length === 0) need.push("stack (list of technologies)");
  if (p.status === "live" && !has(p.url) && !p.download) need.push("url (public link, required for a live project)");
  if (p.url && !/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(p.url)) errors.push(`url looks wrong: ${p.url}`);
  if (p.repo && !/^(https?:\/\/)?github\.com\/[\w.-]+\/[\w.-]+/i.test(p.repo)) errors.push(`repo is not a GitHub URL: ${p.repo}`);

  const dashes = findDashes(JSON.stringify(p, null, 1), `entry ${p.slug || "?"}`);
  errors.push(...dashes.map((d) => "em dash not allowed: " + d));
  if (p.image && !existsSync(join(root, p.image))) errors.push(`image file missing: ${p.image}`);
  return { need, errors };
}
