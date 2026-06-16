# Odoo Technical Plugins

A **marketplace of technical plugins for Odoo development**, installable by AI coding agents (Claude Code, Codex, Cursor).

This repository is a [Claude Code plugin marketplace](https://docs.claude.com/en/docs/claude-code/plugins): the root holds the marketplace manifest, and each plugin is self-contained under [`plugins/`](plugins).

## Plugins

| Plugin | Description | Docs |
|--------|-------------|------|
| [`odoo-technical-rules`](plugins/odoo-technical-rules) | General, vendor-neutral Odoo coding rules (naming, manifest, views, Python/ORM, security, commits, stable policy). VI + EN. | [README](plugins/odoo-technical-rules/README.md) · [Install](plugins/odoo-technical-rules/INSTALL.md) |

> More plugins will be added here over time.

## Install

### One command — any agent (recommended)

Run the interactive installer from your project:

```bash
npx odoo-technical-plugins
```

It asks which plugin, which agent (Claude Code / Codex / Cursor / all), and the scope, then writes the right config (`.claude/skills/…`, `AGENTS.md`, or `.cursor/rules/…`). Non-interactive too:

```bash
npx odoo-technical-plugins --agent all          # this project
npx odoo-technical-plugins --agent codex --global
```

> Pinned to the GitHub source instead of npm? `npx github:JocelynVN/odoo-technical-plugins` works the same (use `--` before flags).

### Claude Code marketplace (alternative)

```bash
/plugin marketplace add JocelynVN/odoo-technical-plugins
/plugin install odoo-technical-rules@odoo-technical-plugins
```

See each plugin's `INSTALL.md` for all options (including a `curl | bash` script).

## Repository layout

```text
.claude-plugin/
  marketplace.json            # lists every plugin in this repo
bin/cli.js                    # interactive npx installer
package.json                  # makes `npx github:…` work
plugins/
  odoo-technical-rules/       # plugin #1 (self-contained)
    .claude-plugin/plugin.json
    skills/                   # Claude Code skill
    rules/                    # full ruleset (en + vi) — single source of truth
    dist/                     # ready-to-copy configs for Codex & Cursor
    README.md
    INSTALL.md
```

## Adding a new plugin

1. Create `plugins/<your-plugin>/` with its own `.claude-plugin/plugin.json`.
2. Add an entry to `.claude-plugin/marketplace.json` → `plugins[]`.
3. Add a row to the **Plugins** table above.
