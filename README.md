# Odoo Technical Plugins

A **collection of technical plugins for Odoo development**, installed into AI coding agents (Claude Code, Codex, Cursor) with a single `npx` command.

Each plugin is self-contained under [`plugins/`](plugins); the [`npx` installer](bin/cli.js) copies the right config into the agent you pick.

## Plugins

| Plugin | Description | Docs |
|--------|-------------|------|
| [`odoo-technical-rules`](plugins/odoo-technical-rules) | General, vendor-neutral Odoo coding rules (naming, manifest, views, Python/ORM, security, commits, stable policy). VI + EN. | [README](plugins/odoo-technical-rules/README.md) · [Install](plugins/odoo-technical-rules/INSTALL.md) |
| [`odoo-test-lint`](plugins/odoo-test-lint) | Make Python & JS pass Odoo's official linters (`test_lint` pylint checks + ESLint): SQL-injection, lazy translations, OWL static props/template, no private fields. Ships a `pylintrc` that loads **Odoo's own checker plugins**. | [README](plugins/odoo-test-lint/README.md) |

> More plugins will be added here over time.

## Install

Run the interactive installer from your project:

```bash
npx odoo-technical-plugins@latest
```

> The `@latest` tag bypasses npx's cache so you always get the newest rules.

It asks which plugin(s) and which agent(s) (multi-select with space) plus the scope, then writes the rules into each agent's **always-on instructions file** (loaded at the start of every session) as a marker-wrapped block that leaves the rest of the file untouched:

| Agent | Project | Global |
|-------|---------|--------|
| Codex | `AGENTS.md` | `~/.codex/AGENTS.md` |
| Cursor | `AGENTS.md` | `~/.cursor/rules/<plugin>.mdc` |
| Claude Code | `CLAUDE.md` | `~/.claude/CLAUDE.md` |

`AGENTS.md` is the cross-tool standard read by **Codex and Cursor**; Claude Code uses `CLAUDE.md` (it doesn't read `AGENTS.md` natively). So a project needs just two files. Non-interactive too:

```bash
npx odoo-technical-plugins --agent all          # this project
npx odoo-technical-plugins --agent codex --global
npx odoo-technical-plugins --agent claude --plugin odoo-test-lint --python /opt/odoo/venv/bin/python
```

> Installing `odoo-test-lint` into a project also asks for the Python interpreter
> of your Odoo env (so pylint can load Odoo's own checkers) and saves it to
> `.odoo-lint.json`. Pass `--python <path>` to set it non-interactively; omit it
> and the interactive installer defaults to your system python.

> Pinned to the GitHub source instead of npm? `npx github:JocelynVN/odoo-technical-plugins` works the same (use `--` before flags).

It's a full lifecycle manager — installs are tracked in a manifest so you can refresh or remove them cleanly:

```bash
npx odoo-technical-plugins status               # what's installed (project + global)
npx odoo-technical-plugins@latest update        # refresh to the latest rules
npx odoo-technical-plugins uninstall            # remove cleanly
```

The `odoo-test-lint` plugin ships ready-to-use `pylintrc`/`eslintrc` configs that
drive **Odoo's own `test_lint` checkers** (the SQL-injection / gettext /
unlink-override pylint plugins that live in the Odoo source), so the agent runs
the authentic Odoo checks rather than a reimplementation — see that
[plugin's README](plugins/odoo-test-lint/README.md#-how-to-run-the-checks-odoos-own-linters).

> **Customizing:** the installed rules sit in a `<!-- BEGIN/END <plugin> -->` block
> that `update` overwrites — keep team tweaks **outside** that block (elsewhere in
> your `AGENTS.md` / `CLAUDE.md`), or they'll be replaced on the next update.

## Repository layout

```text
plugins.json                  # registry the npx installer reads
bin/cli.js                    # interactive npx installer (install/update/uninstall/status)
package.json                  # makes `npx odoo-technical-plugins` work
plugins/
  odoo-technical-rules/       # plugin #1 (self-contained)
    skills/<plugin>/SKILL.md  # the rules body, written into AGENTS.md / CLAUDE.md
    rules/                    # full ruleset (en + vi) + reference material
    README.md
    INSTALL.md
  odoo-test-lint/             # plugin #2
    skills/<plugin>/SKILL.md
    rules/                    # eslintrc + pylintrc (loads Odoo's checkers) + notes
    README.md
```

The `SKILL.md` body is the source of the rules text; the installer wraps it in a
marker block inside each agent's instructions file.

## Adding a new plugin

1. Create `plugins/<your-plugin>/skills/<your-plugin>/SKILL.md` (with `name` + `description` frontmatter; the body is the rules that get installed).
2. Add an entry to [`plugins.json`](plugins.json) → `plugins[]` (`name`, `source`, `description`).
3. Add a row to the **Plugins** table above.

It then appears automatically in `npx odoo-technical-plugins` and is managed by `status`/`update`/`uninstall`.
