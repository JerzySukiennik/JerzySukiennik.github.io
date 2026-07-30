# Adding the second person to Gzowo Labs

Everything on the site is published from someone's own machine, signed with their own
name. This is the whole setup, once, for a new person. It takes about fifteen minutes,
most of which is a browser downloading itself.

## 1. A GitHub account (the new person does this)

Go to [github.com/signup](https://github.com/signup) and make an account. Any username
works — it is not shown on the site, only in the commit history.

Then tell the repo owner what the username is. Nothing else needs sharing: no
passwords, no tokens. If someone offers to send you a token, say no — that is exactly
what the collaborator invite exists to avoid.

## 2. The invite (the repo owner does this)

Either on the web — the repo's **Settings → Collaborators → Add people** — or with one
command:

```bash
gh api -X PUT repos/JerzySukiennik/JerzySukiennik.github.io/collaborators/USERNAME -f permission=push
```

The invited person gets an email with an **Accept invitation** button. It has to be
clicked or the push will keep failing with a permissions error.

## 3. Let the new machine talk to GitHub

On their computer, once:

```bash
gh auth login
```

Pick GitHub.com → HTTPS → *login with a web browser* and follow the prompts. This is
what lets `git push` work later without asking for a password every time. (If `gh` is
not installed: `brew install gh` on a Mac.)

## 4. Install the skill

```bash
git clone https://github.com/JerzySukiennik/JerzySukiennik.github.io.git
cd JerzySukiennik.github.io
bash skill/install.sh "Ryszard Sukiennik"
```

Use the full name as it should appear under the projects — that string is the
signature on every card published from this machine, and it cannot be overridden
per project.

The last step downloads a browser for taking screenshots. It runs for a few minutes
and prints as it goes; leave it alone until it says **Done**.

Requirements: Claude Code, Node and Git. Nothing else.

## 5. First publish

In Claude Code, from inside a project folder:

```
/projects
```

Claude reads the project, writes the card and the project page, takes a screenshot from
inside the running thing, commits and pushes. The site updates a minute or two later.

If it comes out wrong: `/projects delete <slug>`, or `/projects update <slug>` to redo it.

## What each person can and cannot touch

The name in `config.json` is the owner of everything published from that machine. The
tools refuse to edit or delete a project signed by the other person — that is deliberate,
not a limitation to work around. If a card of theirs needs changing, ask them.

Updates to the skill itself arrive with `git pull` in the clone at `~/.gzowo-labs/site-repo`
followed by re-running `bash skill/install.sh "Your Name"`.
