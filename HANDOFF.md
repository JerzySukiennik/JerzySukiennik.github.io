# Gzowo Labs — handoff

For the next Claude picking this up. Read this before touching anything; it is short
on purpose, and everything in it was learned the hard way.

**Live:** https://jerzysukiennik.github.io/ — replaced the old "Relay" portfolio on
2026-07-30. The whole previous site is still in this repo's history.

Jerzy ("Jurek") does not open a terminal or an editor. You do the files, the git and the
deploys. He judges the result. Talk to him in Polish; everything in the repo is English.

## Where things are

| What | Path |
| --- | --- |
| Working clone (the real one) | `~/.gzowo-labs/site-repo` |
| Installed skill | `~/.claude/skills/projects/` (`SKILL.md`, `config.json`, `tools/`) |
| Skill source of truth | `skill/` in this repo — installs copy from here |
| Firebase Admin key | `~/.gzowo-labs/serviceAccount.json` (0600, never in a repo) |
| Design mockups, legacy backup | `~/Downloads/Claude/Projects/gzowo-labs/` |
| Vault note | `~/Downloads/Claude/ClaudeMemory/projects/gzowo-labs.md` |

`~/Downloads/Claude/Projects/gzowo-labs/` holds **no site source** — only the five hero
mockups, the pre-migration backups and a README pointing here. Editing anything there
changes nothing.

## How the site works

- **Zero build.** Plain HTML/CSS/JS served by GitHub Pages from `main`. Nothing compiles
  before publishing — that is what lets the skill push without a toolchain, and it must
  stay true. Do not introduce a bundler.
- **Content is `data/projects.json`.** Both pages fetch it at runtime. `index.html` renders
  the grid; `project.html?p=<slug>` renders one project from the same file.
- **One live service:** a Firebase Realtime Database holding a click counter, spoken to
  over plain REST — read is a GET, counting an open is a `PATCH` with
  `{".sv":{"increment":1}}`. No SDK on the page. Rules allow only +1 on a number:
  `set 999` and reading the root both return `Permission denied` (verified with curl).
  Firestore in the same project is deny-all and holds nothing.
- **Sorting:** `pinned` (top) → `boost * 1000` → click count. There is no manual order.
- **Images:** `project-images/<slug>.webp` is the card; `<slug>-2.webp`, `-3.webp` are the
  gallery. `projects.js shots <slug>` rebuilds the list from what is on disk, so the
  filenames are the source of truth, not the JSON.

## The two things the design rests on

**The wordmark.** Two stacked copies of the text: black underneath, colour on top, split
into letters. The colour letter under the cursor fades in *as a whole*. The blend happens
in **time** — one critically damped spring per letter, response 0.30 — and the target is
binary. Do not soften it spatially by lighting neighbours at partial opacity: colour at
half opacity over a black letter is mud, which is exactly why this design exists in this
form. Palette ramp `#3F7A2A → #8FC13F → #F4C534` spread across the letters.

**The fit.** Each line of the wordmark is measured and scaled to the same width, then the
whole block is capped at a share of viewport height. A different typeface changes the
texture of the mark, never its footprint. If you change the type, do not also start
hand-tuning font sizes.

The background is one fullscreen fragment shader — five layers of grass, one draw call a
frame, capped at DPR 1.5. The performance target is an Intel MacBook Pro 2019 with a
Radeon Pro 5500M and an iPhone XR. In GLSL always keep `smoothstep` edges increasing;
a reversed `smoothstep` is undefined behaviour and returns zero on that AMD card.

## Publishing

```bash
P=~/.claude/skills/projects/tools/projects.js
node $P list                      # everything, with author and status
node $P save --json '{...}'       # add or update, keyed by slug
node $P set <slug> --status building
node $P pin|unpin|hide|show|shots|delete <slug>
node $P boost <slug> 5

node ~/.claude/skills/projects/tools/capture.js --slug <slug> --url <url> [--index 2]
bash ~/.claude/skills/projects/tools/publish.sh "message"
```

**`publish.sh` runs `git add -A`.** Anything sitting uncommitted in the clone goes live
with the next publish. Check `git status` in `~/.gzowo-labs/site-repo` before publishing
and deal with what you find — see the open item below.

## Invariants — do not break these

1. **The author is never an argument.** It comes from `config.json` on the machine that
   runs the command, and the tools refuse to touch a project signed by the other brother.
   That guard is tested and deliberate; do not add an override flag.
2. **No build step**, ever, for the same reason.
3. **The counter rules stay `+1` only.** If the counter ever needs a reset, do it with the
   Firebase CLI as the owner, not by loosening rules.
4. **`~/Downloads/Claude/Projects/projects-cms/` must keep existing** — the Electron CMS
   inside it is gone, but the folder still holds `Images-to-cardboard`, which the separate
   `/shot` skill writes into. Deleting the folder breaks that skill.
5. **Full automatic, no draft.** Jurek chose this explicitly: `/projects` reads, writes,
   captures, commits and pushes without asking. The safety net is `/projects delete <slug>`,
   not a confirmation prompt.

## Screenshots: the actual craft

A cold page load is almost never the frame worth publishing — games open on menus and
multiplayer opens on an empty lobby. What decides the difficulty is one question: **does
the project hand over control without capturing the mouse?**

- Menus click fine, but use `page.evaluate(() => el.click())` rather than
  `elementHandle.click()`; a transparent overlay makes the real click time out.
- `page.screenshot` needs a raised timeout on a busy game — Playwright waits for a
  "stable" frame and otherwise fails on exactly the projects most worth photographing.
  Already set to 90 s in `capture.js`.
- Multiplayer needs a second peer, not patience. Gzowo Bowling's controller lives at
  `?role=controller&room=<code>`; opening it in a second page in the same context makes
  the lane appear. Match wizard buttons by **prefix** — the last step is `Ready! 🎳`.
- FPP games that request pointer lock cannot be driven from outside at all. An automated
  browser never gets the lock, so the game either shows its gate or a "Paused — couldn't
  grab the mouse" panel that redraws every frame and cannot be hidden. The only thing that
  worked was **never touching the canvas**: enter the world, shoot before anything asks
  for the mouse.
- `--camera` feeds a synthetic webcam, which works — but not when the project hangs
  loading a model (Airwave never gets past "loading hand model").
- `--hide` exists for the click-to-play veil that only appears because of the above. Never
  use it to hide the game itself.

## Open items

**An uncommitted dev toolbar is sitting in the clone.** `assets/agentation-dev.js` plus an
import map added to `index.html` appeared on 2026-08-03 from outside this work — a visual
feedback tool that only mounts on localhost. It is *not* committed and *not* live, but
`publish.sh` would sweep it into the next commit. Decide with Jurek: keep it (commit
deliberately, note that it ships dead code to visitors) or revert
`git checkout index.html && rm assets/agentation-dev.js`. Do not just publish over it.

**Gzowo Builders' card shows an empty meadow**, not building — the pointer-lock problem
above. The clean fix is in the game, not here: give it a `?demo=1` entry that skips the
gate and stamps a prefab, then `/projects update gzowo-builders` gets a real frame by
itself. Voxel Demolition would benefit from the same.

**Airwave's card shows the control legend**, not the instrument.

**Galleries are one shot per project.** `capture.js --index 2/3` fills them in; the project
page already renders whatever exists.

**Ryszard is invited but has not joined.** GitHub `rysiosukiennik`, write invite sent
2026-07-31, pending acceptance. His instructions are in `skill/START-HERE.md`. Until he
accepts, his `install.sh` works but pushes fail.

## Verifying

```bash
curl -s -o /dev/null -w '%{http_code}\n' -L https://jerzysukiennik.github.io/
curl -s https://jerzysukiennik-hub-default-rtdb.firebaseio.com/clicks.json
node ~/.claude/skills/projects/tools/capture.js --url https://jerzysukiennik.github.io/ --out /tmp/live.webp --width 1400 --height 900 --wait 6000
```

Shoot the **live** URL, not localhost, when reporting that something works — Pages takes a
minute or two after a push and the difference has bitten before. If you click through to a
project while testing, you have added a real click to the public counter; clear it with
`firebase database:remove /clicks/<slug> --project jerzysukiennik-hub --force`.

Note for tooling: `firebase-admin` here is v13, which is modular — `require('firebase-admin/app')`
and `require('firebase-admin/firestore')`, and it only resolves from a directory that has it
installed (`~/.gzowo-labs`). The old `admin.credential.cert(...)` shape is gone.
