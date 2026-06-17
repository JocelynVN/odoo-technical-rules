# odoo-test-lint

Make AI-written Odoo code pass **Odoo's official linters** — the pylint checks
enforced by Odoo's [`test_lint`](https://github.com/odoo/odoo/tree/18.0/odoo/addons/test_lint)
module and the ESLint rules from Odoo's `eslintrc`. Part of the
[odoo-technical-plugins](../../README.md) collection.

## 🔌 Install

**One command, any agent** (Claude Code / Codex / Cursor):

```bash
npx odoo-technical-plugins@latest --plugin odoo-test-lint
```

Or run `npx odoo-technical-plugins@latest` and pick `odoo-test-lint` from the menu.

## 🔎 How to run the checks — Odoo's official `test_lint`

Verify with Odoo's own `test_lint`, run through `odoo-bin`. That runs pylint
(Odoo's `_odoo_checker_*` checkers) and eslint exactly as Odoo CI does:

```bash
odoo-bin -c odoo.conf -d <db> -u test_lint --test-enable --stop-after-init
```

Notes:
- It lints **all custom modules** in the addons path (it skips Odoo core); there's
  no "changed files only" mode, so fix the failures in the files you changed.
- `test_lint` still needs **pylint and eslint installed** in the Odoo env — Odoo
  doesn't bundle them and the test silently skips when they're missing
  (`pip install pylint`, `eslint` via npm).
- First run installs the module (`-i test_lint`); afterwards `-u test_lint`
  re-runs it against the current source.

The command is environment-specific (db, config, addons path, docker…), so the
installer asks for it (`--test-cmd`) and saves it to a project-root
`.odoo-lint.json` — add that file to `.gitignore`, it's per-developer:

```json
{ "test_lint_cmd": "odoo-bin -c odoo.conf -d <db> -u test_lint --test-enable --stop-after-init" }
```

See [`rules/odoo-test-lint.md`](rules/odoo-test-lint.md) for the full list of
checks and message IDs (`E8501`/`E8502`/`E8503`/`E8505`/`E8506` + the JS/OWL rules).

## What it enforces

- **Python (pylint):** no undefined/used-before-assignment/unreachable/redefined,
  no `eval()`/`input()`, no deprecated modules or leftover debuggers,
  **no SQL injection**, lazy-translation rules for `_()`, and no `unlink()`
  override that just raises.
- **JavaScript (ESLint):** no-undef with Odoo globals, no private class fields,
  OWL components must declare `static props`/`static template`, named `_t`
  placeholders, and the usual `no-debugger`/`no-dupe-*`/`no-unused-vars`.

See [`rules/odoo-test-lint.md`](rules/odoo-test-lint.md) for the full list of
checks and how to run Odoo's `test_lint`.

## Contents

```text
skills/odoo-test-lint/SKILL.md   # rules body, written into AGENTS.md / CLAUDE.md
rules/odoo-test-lint.md          # reference notes + how to run test_lint via odoo-bin
```
