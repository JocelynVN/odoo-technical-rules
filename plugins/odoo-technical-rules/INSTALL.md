# Installation guide — odoo-technical-rules

This plugin ships the Odoo technical rules in formats installable by **Claude Code**, **Codex**, and **Cursor**. Paths below are relative to this plugin folder (`plugins/odoo-technical-rules/`).

| Agent | Format | Path |
|-------|--------|------|
| Claude Code | Plugin (marketplace + skill) | `skills/odoo-technical-rules/SKILL.md` |
| Codex | `AGENTS.md` | `dist/codex/AGENTS.md` |
| Cursor | Project rule (`.mdc`) | `dist/cursor/.cursor/rules/odoo-technical-rules.mdc` |

The full ruleset lives in **one place** — [`rules/technical-rules.en.md`](rules/technical-rules.en.md) / [`rules/technical-rules.vi.md`](rules/technical-rules.vi.md). Each agent format embeds the same must-follow checklist and links back to these full docs (no duplicated copies).

---

## ⚡ Recommended: one interactive command

Run from your Odoo project:

```bash
npx odoo-technical-plugins
```

It prompts for the plugin, the agent (Claude Code / Codex / Cursor / all), and the scope, then writes the right files. Non-interactive:

```bash
npx odoo-technical-plugins --agent all            # this project
npx odoo-technical-plugins --agent cursor
npx odoo-technical-plugins --agent codex --global
npx odoo-technical-plugins --list                 # list plugins
```

> Prefer the GitHub source over npm? `npx github:JocelynVN/odoo-technical-plugins -- <flags>` works identically.

This is idempotent and append-safe (won't duplicate an existing `AGENTS.md`).

> Prefer no Node? There's also a bash script for Codex & Cursor:
> ```bash
> curl -fsSL https://raw.githubusercontent.com/JocelynVN/odoo-technical-plugins/main/plugins/odoo-technical-rules/install.sh | bash
> ```
> Usage: `install.sh <codex|cursor|all> [project-dir|global]`.

The sections below document everything the installers automate, plus the Claude Code marketplace flow and fully manual steps.

---

## 🟣 Claude Code

The whole repo is a Claude Code plugin **marketplace** named `odoo-technical-plugins`; this is one plugin inside it.

### Install from GitHub (recommended)

```bash
# inside Claude Code
/plugin marketplace add JocelynVN/odoo-technical-plugins
/plugin install odoo-technical-rules@odoo-technical-plugins
```

Then restart Claude Code (or `/plugin` → reload) and verify:

```bash
/plugin                 # the plugin shows as enabled
```

The skill `odoo-technical-rules` activates automatically whenever you work on Odoo code (manifest, models, views, security…). You can also invoke it explicitly with `/odoo-technical-rules`.

### Install from a local clone

```bash
git clone https://github.com/JocelynVN/odoo-technical-plugins
# inside Claude Code:
/plugin marketplace add /absolute/path/to/odoo-technical-plugins
/plugin install odoo-technical-rules@odoo-technical-plugins
```

### Alternative: no plugin, just a CLAUDE.md rule

If you prefer not to install a plugin, copy the checklist into your project's `CLAUDE.md` (or `~/.claude/CLAUDE.md` for all projects):

```bash
cat dist/codex/AGENTS.md >> /path/to/your-odoo-project/CLAUDE.md
```

> Claude Code also reads `AGENTS.md` at the project root, so the Codex file below works for Claude Code too.

---

## 🟢 Codex (OpenAI Codex CLI)

Codex reads `AGENTS.md` — at the repo root (per-project) or `~/.codex/AGENTS.md` (global).

### Per project

```bash
cp dist/codex/AGENTS.md /path/to/your-odoo-project/AGENTS.md
```

If the project already has an `AGENTS.md`, append instead of overwriting:

```bash
printf '\n\n' >> /path/to/your-odoo-project/AGENTS.md
cat dist/codex/AGENTS.md >> /path/to/your-odoo-project/AGENTS.md
```

### Global (all projects)

```bash
mkdir -p ~/.codex
cp dist/codex/AGENTS.md ~/.codex/AGENTS.md
```

Codex picks it up automatically on the next session.

---

## 🔵 Cursor

Cursor reads **Project Rules** from `.cursor/rules/*.mdc`.

### Per project

```bash
mkdir -p /path/to/your-odoo-project/.cursor/rules
cp dist/cursor/.cursor/rules/odoo-technical-rules.mdc \
   /path/to/your-odoo-project/.cursor/rules/
```

Reload Cursor. The rule is scoped via `globs` to Odoo files (manifest, `models/`, `views/`, `security/`, `static/src/`) and applies automatically when those files are in context. To force it on for every request, open the `.mdc` and set `alwaysApply: true`.

### Global (all projects)

Cursor → **Settings → Rules → User Rules** → paste the body of
`dist/cursor/.cursor/rules/odoo-technical-rules.mdc` (without the frontmatter).

---

## Updating

When the rules change, re-pull this repo and:

- **Claude Code**: `/plugin marketplace update odoo-technical-plugins` then `/plugin install` again.
- **Codex / Cursor**: re-copy the file (or `git pull` if you symlinked it).

## Customizing for your team

Replace the placeholders in the copied files:
- `<prefix>` → your module prefix (e.g. `acme_`)
- `<odoo_version>` → your target version (e.g. `17.0`)

Add team-specific conventions at the end of each file.
