# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This is **not** an Odoo codebase — it is the **npx installer + content** for a collection of Odoo
technical rule plugins. The plugins themselves are just Markdown rule sets; `bin/cli.js` writes them
into the always-on instruction file of a user's AI agent (Claude Code, Codex, or Cursor). Distributed
via npm/`npx` only — there is no Claude `/plugin marketplace` integration.

## Commands

There is no build or test suite. Verification is done by exercising the CLI directly:

```bash
node bin/cli.js list                              # available plugins
node bin/cli.js --help
node bin/cli.js install --agent all --dir /tmp/x  # non-interactive install into a throwaway dir
node bin/cli.js status                            # what's installed (project + global)
node bin/cli.js uninstall --dir /tmp/x --yes
node -c bin/cli.js                                # syntax-check (no deps to install)
```

`--dir <path>` targets any directory, so use a scratch dir to test install/update/uninstall without
touching the repo. Interactive mode (no `--agent`) requires a TTY.

### Release

Versioned in `package.json`. Bump version, commit, push, **then the user runs `npm publish --otp=…`**
(2FA-gated — the agent cannot publish). The CLI surfaces its own version from `package.json` at
runtime, and `install` stamps that version into the manifest, so the bump must land before publish.

## Architecture

**Zero runtime dependencies** — `bin/cli.js` uses only Node built-ins (`fs`, `os`, `path`, `readline`).
Keep it that way; it must run under bare `npx` with `node >=16`.

Data flow: `plugins.json` (the registry) → each plugin's `skills/<name>/SKILL.md` → a marker-wrapped
block in the target agent's instruction file.

- **`plugins.json`** is the source of truth for which plugins exist. `loadPlugins()` reads it; adding a
  plugin here makes it appear in every command automatically.
- **`SKILL.md` body is the installed content.** `skillBody()` strips the YAML frontmatter and the
  remaining Markdown is what gets written. The frontmatter `description` is reused as the Cursor
  global `.mdc` description.
- **Per-agent destination** (see `installAgent()`): rules must load at the *start* of every session, so
  they go into each agent's always-on file, not a lazy-loaded skill:
  | Agent | Project | Global |
  |-------|---------|--------|
  | Claude | `CLAUDE.md` | `~/.claude/CLAUDE.md` |
  | Codex | `AGENTS.md` | `~/.codex/AGENTS.md` |
  | Cursor | `AGENTS.md` (shared w/ Codex) | `~/.cursor/rules/<plugin>.mdc` (always-apply) |
  Cursor has no global `AGENTS.md`, hence the special `.mdc` path. Codex and Cursor **share** the
  project `AGENTS.md`.

### The marker block contract

Content is written as `<!-- BEGIN <plugin> --> … <!-- END <plugin> -->`. `writeBlock()` strips any
existing block of that marker and re-appends, leaving the rest of the file untouched. This is why
`update` overwrites cleanly and why user customizations must live **outside** the block. Never hand-edit
these markers' format without updating `stripBlock()`/`fileHasBlock()` together.

### Manifest + discovery (uninstall/status correctness)

State is tracked in `.odoo-technical-plugins.json` (project) or `~/.odoo-technical-plugins.json`
(`--global`). But `status`/`uninstall` must also work without a manifest and clean up artifacts from
older layouts, so `collectInstalled()` **merges** two sources per plugin+agent:
1. the manifest's recorded `installs`, and
2. `discover()` — on-disk scan for current blocks/mdc **and** legacy layouts (`<=2.0` skill dirs under
   `.<agent>/skills/`, `<=1.4` project `.cursor/rules/*.mdc`).

When uninstalling, a block in a **shared** `AGENTS.md` must survive if another kept install still owns
it — `keepBlocks` is computed from the **manifest** (not discovery, which can't tell who owns a shared
file) to decide what to leave. Touch this logic carefully: it's the subtle part.

## Adding a plugin

1. Create `plugins/<name>/skills/<name>/SKILL.md` with `name` + `description` frontmatter; the body is
   the rule text that gets installed.
2. Add an entry to `plugins.json` → `plugins[]` (`name`, `source`, `description`).
3. Add a row to the Plugins table in `README.md`.

It then flows through `list`/`install`/`status`/`update`/`uninstall` automatically.

> The two existing plugins keep their full rulesets under `plugins/<name>/rules/` and link to the
> GitHub-hosted copies from `SKILL.md`; the `SKILL.md` body is only the everyday checklist/summary.

## How odoo-test-lint runs the checks

The plugin does **not** ship its own linter or configs. The agent verifies code by running Odoo's official
`test_lint` through `odoo-bin` (e.g. `odoo-bin -c odoo.conf -d <db> -u test_lint --test-enable
--stop-after-init`). That runs Odoo's own pylint checkers (`_odoo_checker_*`) and eslint exactly as Odoo
CI does. Design notes that bit us while iterating, so they're worth keeping:

- `test_lint` lints **all custom modules** in the addons path (skips core); `test_pylint.py` has **no**
  git-changed-files or single-file scoping. So the SKILL tells the agent to run it and then fix failures
  **in the files it changed** — don't expect the tool to scope itself.
- It still needs **pylint and eslint installed** in the Odoo env (Odoo ships neither in `requirements.txt`;
  the test silently skips when missing).
- The exact command is environment-specific (db, conf, addons path, docker…), so it can't be templated.
  **`cmdInstall` prompts for the full command** (project scope + `odoo-test-lint` selected; flag
  `--test-cmd`) and stores it in a project-root **`.odoo-lint.json`** (`{ "test_lint_cmd" }`, merged with
  any existing keys). Non-interactive installs only write it when `--test-cmd` is passed. The SKILL has the
  agent read that file and reuse the command.

History (don't re-litigate): we tried (a) a stdlib reimplementation of the checkers, then (b) shipping
`rules/pylintrc`+`eslintrc` to drive pylint/eslint per-file. Both were dropped in favour of the official
`odoo-bin` route — (a) risked drift from Odoo, and the owner wanted only the canonical test, not custom
per-file linting. If you find a stray reference to `odoo_lint.py`, a `lint` CLI command, `pylintrc`, or
`eslintrc`, it's leftover and should be removed.
