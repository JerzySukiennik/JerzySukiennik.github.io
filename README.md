# Gzowo Labs

Source of https://gzowo.fun, a deliberately ugly 1998 GeoCities-style home page. Plain HTML, CSS and JS
served by GitHub Pages from `main`. The only build step is `tools/build.mjs`, and the tools run it for you.

Everything is driven by the `/gzowo-labs` Claude Code skill ("wrzuć na gzowo labs"). Nobody edits the
generated pages by hand.

## Layout

| Path | What |
| --- | --- |
| `data/projects.json` | The shelf. Array order is the display order, newest first. |
| `data/site.json` | Every piece of site copy outside a project: taglines, marquees, widgets, footer. |
| `tools/build.mjs` | Builds `index.html` and `p/<slug>/index.html`, then lints for em dashes. |
| `tools/site.mjs` | Data CLI: add, set, move, hide, delete, check. |
| `tools/shot.mjs` | Screenshot frames and the 4:3 WebP conversion. `tools/recipes/` holds per-project recipes. |
| `tools/publish.sh` | Build, lint, commit, push, poll the live URL. |
| `assets/` | CSS, scripts, the fire GIF, favicon. |
| `project-images/` | One 1200x900 WebP per project. |
| `islands/`, `win/` | Separate pages that live under the same domain. |

## Rules that hold the site together

- **No em dashes anywhere.** `build.mjs` fails on the em dash character and its HTML entities.
- **Project pages live under `/p/<slug>/`**, never `/<slug>/`: GitHub redirects a path that matches a repo
  name with its own Pages site.
- **The slug never changes** after creation (URL and image name).
- The build has no dependencies. `tools/package.json` only pins `playwright-core` for screenshots.
