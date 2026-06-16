# Odoo Technical Plugins

A **collection of technical plugins for Odoo development**, installed into AI coding agents (Claude Code, Codex, Cursor) with a single `npx` command.

Each plugin is self-contained under [`plugins/`](plugins); the [`npx` installer](bin/cli.js) copies the right config into the agent you pick.

## Plugins

| Plugin | Description | Docs |
|--------|-------------|------|
| [`odoo-technical-rules`](plugins/odoo-technical-rules) | General, vendor-neutral Odoo coding rules (naming, manifest, views, Python/ORM, security, commits, stable policy). VI + EN. | [README](plugins/odoo-technical-rules/README.md) · [Install](plugins/odoo-technical-rules/INSTALL.md) |
| [`odoo-lint`](plugins/odoo-lint) | Make Python & JS pass Odoo's official linters (`test_lint` pylint checks + ESLint): SQL-injection, lazy translations, OWL static props/template, no private fields. | [README](plugins/odoo-lint/README.md) |

> More plugins will be added here over time.

## Install

Run the interactive installer from your project:

```bash
npx odoo-technical-plugins
```

It asks which plugin, which agent (Claude Code / Codex / Cursor / all), and the scope, then writes the right config:

- **Claude Code** → `.claude/skills/…` (project) or `~/.claude/skills/…` (global)
- **Codex** → `AGENTS.md`
- **Cursor** → `.cursor/rules/…`

Non-interactive too:

```bash
npx odoo-technical-plugins --agent all          # this project
npx odoo-technical-plugins --agent codex --global
```

> Pinned to the GitHub source instead of npm? `npx github:JocelynVN/odoo-technical-plugins` works the same (use `--` before flags).

It's a full lifecycle manager — installs are tracked in a manifest so you can refresh or remove them cleanly:

```bash
npx odoo-technical-plugins status       # what's installed (project + global)
npx odoo-technical-plugins update       # refresh to the latest rules
npx odoo-technical-plugins uninstall    # remove cleanly
```

See each plugin's `INSTALL.md` for all options (including a `curl | bash` script).

## Repository layout

```text
plugins.json                  # registry the npx installer reads
bin/cli.js                    # interactive npx installer (install/update/uninstall/status)
package.json                  # makes `npx odoo-technical-plugins` work
plugins/
  odoo-technical-rules/       # plugin #1 (self-contained)
    skills/                   # Claude Code skill
    rules/                    # full ruleset (en + vi) — single source of truth
    dist/                     # ready-to-copy configs for Codex & Cursor
    README.md
    INSTALL.md
```

## Adding a new plugin

1. Create `plugins/<your-plugin>/` with its `skills/`, `rules/`, and `dist/` content.
2. Add an entry to [`plugins.json`](plugins.json) → `plugins[]` (`name`, `source`, `description`).
3. Add a row to the **Plugins** table above.

It then appears automatically in `npx odoo-technical-plugins` and is managed by `status`/`update`/`uninstall`.
