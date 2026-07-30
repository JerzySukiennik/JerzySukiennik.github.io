# Gzowo Labs

Games, web apps and experiments built by **Jerzy Sukiennik** and **Ryszard Sukiennik**.
Live at [jerzysukiennik.github.io](https://jerzysukiennik.github.io/).

Nothing on this site is edited by hand. Every project is added, updated and removed by
the `/projects` skill running inside Claude Code on one of our machines.

## How it is put together

- **Zero build.** Plain HTML, CSS and JavaScript, served straight from this repo by
  GitHub Pages. There is nothing to compile before publishing, which is what makes the
  automatic path possible.
- **The content is a file.** `data/projects.json` is the whole site's data. Adding a
  project is a commit, so every change has an author and can be reverted.
- **One live piece.** A Firebase Realtime Database holds a click counter and nothing
  else. Its rules allow reading the counts and adding exactly one — no other write is
  possible, which is why the counter can be public with no login.
- **Sorted by what people open.** Pinned projects first, then a manual nudge for
  anything too new to have clicks, then the counter.
- **The background** is a single fragment shader: five layers of grass with the wind
  running through them, one draw call a frame. It is the meadow in Gzowo.
- **The wordmark** lights one whole letter at a time under the cursor, in the colours of
  the plot. The blend happens in time, through a spring, not in a soft radius — colour
  at half opacity over a black letter is mud.

## Layout

```
index.html            the shelf
project.html          one project, rendered from projects.json
assets/               styles, background shader, wordmark, click counter
data/projects.json    every project — written by the skill, never by hand
project-images/       one WebP per project, plus numbered gallery shots
skill/                the /projects skill itself, so both machines share one copy
```

## Installing the skill

On a machine with Claude Code, Node and Git:

```bash
git clone https://github.com/JerzySukiennik/JerzySukiennik.github.io.git
cd JerzySukiennik.github.io
bash skill/install.sh "Your Name"
```

The name you pass is the signature every project published from that machine gets. It
is the only thing that differs between the two installs. Updates arrive with `git pull`.

## Working on the site locally

```bash
cd <this repo> && python3 -m http.server 8123
```

Then open `http://localhost:8123`. The click counter talks to the live database either
way, so avoid clicking through to projects while testing.
