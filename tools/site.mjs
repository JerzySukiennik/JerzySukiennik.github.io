#!/usr/bin/env node
/* Data CLI for the Gzowo Labs shelf. The only sanctioned way to change data/projects.json.

   node tools/site.mjs list
   node tools/site.mjs get <slug>
   node tools/site.mjs add --json '{...}'            (or --file entry.json)
   node tools/site.mjs set <slug> --json '{"url":"..."}'   partial update, slug can not change
   node tools/site.mjs move <slug> top | bottom | before:<other> | after:<other>
   node tools/site.mjs hide|show <slug>
   node tools/site.mjs delete <slug>
   node tools/site.mjs check                          schema + em-dash lint of the whole repo

   Exit code 2 means "a human has to answer first": stdout lists every NEED. The caller
   asks those questions and calls again. Nothing is ever guessed to make a call succeed.
*/

import { readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { root, loadProjects, saveProjects, checkProject, lintRepo } from "./lib.mjs";

const [cmd, ...rest] = process.argv.slice(2);

const flag = (name) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
};
const fail = (msg, code = 1) => { console.error(msg); process.exit(code); };
const payload = () => {
  const raw = flag("--json") ?? (flag("--file") ? readFileSync(flag("--file"), "utf8") : undefined);
  if (!raw) fail("Pass --json '{...}' or --file <path>");
  try { return JSON.parse(raw); } catch (e) { fail("Bad JSON: " + e.message); }
};

const data = loadProjects();
const list = data.projects;
const find = (slug) => list.findIndex((p) => p.slug === slug);
const need = (slug) => { const i = find(slug); if (i < 0) fail(`No project "${slug}". Slugs: ${list.map((p) => p.slug).join(", ")}`); return i; };

const ALLOWED = ["section", "slug", "name", "category", "status", "year", "url", "repo", "blurb", "body", "stack", "image", "hidden", "download"];

function validate(entry, { creating }) {
  const unknown = Object.keys(entry).filter((k) => !ALLOWED.includes(k));
  if (unknown.length) fail(`Unknown field(s): ${unknown.join(", ")}. Allowed: ${ALLOWED.join(", ")}`);
  const r = checkProject(entry);
  if (creating && r.need.length) {
    console.log("NEEDS ANSWERS BEFORE THIS CAN BE ADDED:");
    r.need.forEach((n) => console.log("NEED: " + n));
    process.exit(2);
  }
  if (r.errors.length) fail("REJECTED:\n" + r.errors.join("\n"));
}

switch (cmd) {
  case "list":
    list.forEach((p, i) => console.log(`${String(i + 1).padStart(2)}. ${p.slug.padEnd(24)} ${p.status.padEnd(8)} ${p.category.padEnd(10)} ${p.hidden ? "[hidden] " : ""}${p.image ? "" : "[no shot] "}${p.name}`));
    break;

  case "get": {
    console.log(JSON.stringify(list[need(rest[0])], null, 2));
    break;
  }

  case "add": {
    const entry = { hidden: false, ...payload() };
    if (find(entry.slug) >= 0) fail(`"${entry.slug}" already exists. Use "set" to change it.`);
    validate(entry, { creating: true });
    list.unshift(entry); // newest first: the "New!!!" widget and the top of the shelf
    saveProjects(data);
    console.log(`Added ${entry.slug} at the top of the shelf.`);
    break;
  }

  case "set": {
    const i = need(rest[0]);
    const patch = payload();
    if ("slug" in patch && patch.slug !== list[i].slug) fail("The slug is the page URL and the image name. It does not change.");
    const merged = { ...list[i], ...patch };
    validate(merged, { creating: false });
    list[i] = merged;
    saveProjects(data);
    console.log(`Updated ${merged.slug}: ${Object.keys(patch).join(", ")}`);
    break;
  }

  case "move": {
    const i = need(rest[0]);
    const to = rest[1] || "";
    const [item] = list.splice(i, 1);
    if (to === "top") list.unshift(item);
    else if (to === "bottom") list.push(item);
    else if (/^(before|after):/.test(to)) {
      const [where, other] = to.split(":");
      const j = list.findIndex((p) => p.slug === other);
      if (j < 0) { list.splice(i, 0, item); fail(`No project "${other}"`); }
      list.splice(where === "before" ? j : j + 1, 0, item);
    } else { list.splice(i, 0, item); fail("move <slug> top|bottom|before:<slug>|after:<slug>"); }
    saveProjects(data);
    console.log("Shelf order now: " + list.map((p) => p.slug).join(", "));
    break;
  }

  case "hide":
  case "show": {
    const i = need(rest[0]);
    list[i].hidden = cmd === "hide";
    saveProjects(data);
    console.log(`${list[i].slug} is now ${cmd === "hide" ? "hidden" : "visible"}.`);
    break;
  }

  case "delete": {
    const i = need(rest[0]);
    const [gone] = list.splice(i, 1);
    saveProjects(data);
    for (const suffix of ["", "-2", "-3", "-4"]) {
      const f = join(root, "project-images", `${gone.slug}${suffix}.webp`);
      if (existsSync(f)) rmSync(f);
    }
    console.log(`Deleted ${gone.slug} and its images. (git history still has it)`);
    break;
  }

  case "check": {
    let problems = 0;
    for (const p of list) {
      const r = checkProject(p);
      [...r.errors, ...r.need.map((n) => "missing " + n)].forEach((m) => { problems++; console.log(`${p.slug}: ${m}`); });
    }
    const dashes = lintRepo();
    dashes.forEach((d) => console.log("EM DASH " + d));
    console.log(problems + dashes.length ? `${problems} data gaps, ${dashes.length} dashes` : "All clear.");
    process.exit(dashes.length ? 1 : 0);
  }

  default:
    fail("Commands: list | get | add | set | move | hide | show | delete | check");
}
