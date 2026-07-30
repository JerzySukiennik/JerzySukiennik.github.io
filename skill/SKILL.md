---
name: projects
description: Put a project on Gzowo Labs — write the card and the project page, take the screenshot, and publish. Use when the user says /projects, "wrzuć to na stronę", "dodaj do portfolio", "add this to the site", or wants to update, hide, reorder or remove something already there. Signs every entry with whoever's machine this is.
---

# projects

Gzowo Labs is the shared site: **jerzysukiennik.github.io**. This skill is the only way
anything gets on it. No forms, no admin panel — you read the project, write the words,
take the shot, and push.

The site belongs to two people. **The author is never an argument you pass.** It comes
from `config.json` next to this file, so a card is always signed by whoever ran the
command, and the tools refuse to edit someone else's project.

## Full automatic. That was the deal.

Do not show a draft and wait for approval. Read, write, capture, publish, then report
what went live with the link. If it came out wrong, the fix is `/projects delete <slug>`
or another run of `/projects update <slug>` — both take seconds.

## Which project

In order:

1. an argument — `/projects gzowo-builders`
2. the current working directory, if it is a project folder
3. if the cwd is the container `~/Downloads/Claude/Projects` and nothing in the
   conversation points at one project — **ask**. Do not guess and publish the wrong game.

## Adding a project

### 1. Learn what it is

Read, in this order, and stop when you have enough to write three honest paragraphs:

1. `~/Downloads/Claude/ClaudeMemory/projects/<name>.md` — the vault note, if this machine
   has a vault. It is the best source: it says what the project actually is and which
   parts were hard. (Ryszard's machine has no vault; skip straight to the README.)
2. the project `README.md`, `SPEC.md`, `HANDOFF.md`
3. the source, when the README is thin

You are writing for someone who has never heard of the project. What is it, what makes
it different from the obvious version of the same idea, and what was genuinely difficult.
No marketing, no "revolutionary", no exclamation marks. Say what it does.

- `description` — one sentence, under ~110 characters. It sits on the card.
- `body` — two to four paragraphs for the project page. Concrete details beat adjectives:
  "wheels are raycast rather than physical bodies" is worth more than "advanced physics".
- `stack` — what it is actually built with, up to a dozen items.
- `category` — exactly one of `Game`, `Web app`, `Experiment`.
- `status` — `live` (there is a working link), `building` (real but not published yet),
  `archived` (kept for the record).

Everything on the site is in **English**, even when the conversation is in Polish.

### 2. Find the links

`url` is where a stranger can use the thing; `repo` is the code. A project needs at
least one. If the only URL is a local address (`localhost`, `192.168.x.x`, `10.x.x.x`),
that is **not** a public link: use the repo and set `status: building`.

Check both with `curl -s -o /dev/null -w '%{http_code}' -L <url>` before saving. A 404 on
the card is worse than no card.

### 3. Take the screenshot

```bash
node ~/.claude/skills/projects/tools/capture.js --slug <slug> --url <url>
```

**A cold load is almost never the good frame.** Games open on menus, multiplayer opens on
an empty lobby, and a title screen tells nobody anything. Get into the project first:

- `--eval "<js>"` — call into the page: `window.game.loadLevel(7)`, set `localStorage`,
  flip a debug flag
- `--click "<selector>"` — press Start, dismiss the menu
- `--drive <file.js>` — a module exporting `async (page) => {}` when it takes real input:

  ```js
  module.exports = async (page) => {
    await page.evaluate(() => window.game.loadLevel(7));
    await page.waitForTimeout(1500);
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(900);
    await page.keyboard.up('KeyW');
  };
  ```

Grep the source for the way in: a level select, a URL parameter, a global you can call,
seeded save state. Use the cheats — playing honestly to level 12 is not a good use of
the run.

For a project with no public URL, serve it locally (`python3 -m http.server`) and capture
`http://localhost:<port>` instead. The shot is of the real thing either way.

The card needs one good frame. Extra frames become the gallery on the project page:
`--index 2`, `--index 3`. Three or four is plenty.

The tool writes WebP straight into the repo and reports any console errors it saw while
loading — if the page threw, the screenshot is probably of a broken build, so fix the
project or pick another moment before publishing it.

### 4. Save and publish

```bash
node ~/.claude/skills/projects/tools/projects.js save --json '{
  "name": "Gzowo Builders",
  "category": "Game",
  "status": "live",
  "url": "https://jerzysukiennik.github.io/gzowo-builders/",
  "repo": "https://github.com/JerzySukiennik/gzowo-builders",
  "description": "Build a vehicle out of blocks and wheels, then drive it until something snaps off.",
  "body": ["First paragraph.", "Second paragraph."],
  "stack": ["three.js", "Rapier", "Node"]
}'

bash ~/.claude/skills/projects/tools/publish.sh "Add Gzowo Builders"
```

`save` fills in the slug, the author, the year and the image path, and picks up any
screenshots already on disk. `publish.sh` pulls, commits and pushes.

### 5. On this machine, also update the vault

If `~/Downloads/Claude/ClaudeMemory/` exists, note in the project's vault file that it is
now on Gzowo Labs, and follow the vault's own rules for indexes. Ryszard's machine has no
vault — skip this silently there.

## The other commands

```bash
P=~/.claude/skills/projects/tools/projects.js

node $P list                       # everything, with author and status
node $P get <slug>                 # one entry as JSON
node $P set <slug> --status building --description "..."
node $P hide <slug>                # off the site, still in the file
node $P show <slug>
node $P pin <slug>                 # straight to the top
node $P unpin <slug>
node $P boost <slug> 5             # nudge above busier projects without pinning
node $P shots <slug>               # rebuild the gallery from what is in project-images/
node $P delete <slug>              # entry and its images
```

Every one of these still needs `publish.sh` afterwards — nothing is live until it is pushed.

**`/projects update <slug>`** means: re-read the project, rewrite the description and the
body if they have drifted, retake the screenshot, `save`, publish. Use it after shipping a
new version of a game.

**`/projects delete <slug>`** is the undo. It is why the automatic mode is safe.

## How the ordering works

The site sorts by **how often a project has been opened** — pinned first, then boost, then
the click counter. There is no manual list to maintain. `pin` is for the two or three
things you want a stranger to see first; `boost` is for something new that has not had
time to collect clicks yet.

## When something goes wrong

- **`"<slug>" belongs to <name>`** — that project was published from the other brother's
  machine. Don't work around it; ask them to change it.
- **push rejected** — someone pushed first. `publish.sh` pulls with rebase; if it still
  fails, fix the repo it names and run it again.
- **the screenshot is a menu** — go back to step 3. That is the whole craft of this skill.
- **`playwright` missing** — run `npm install` in `~/.claude/skills/projects/tools`.
