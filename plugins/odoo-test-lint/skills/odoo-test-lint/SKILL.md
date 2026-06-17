---
name: odoo-test-lint
description: Make AI-written Odoo code pass Odoo's official linters — the pylint checks enforced by Odoo's `test_lint` module (SQL-injection, gettext/translation, eval, deprecated modules, unlink override) and the ESLint rules from Odoo's `eslintrc` (no-undef, OWL static props/template, no private fields, translation placeholders). Use whenever writing or reviewing Odoo Python (`models/`, `controllers/`, `wizard/`) or JavaScript (`static/src/**/*.js`).
---

# Odoo Lint Rules

Write Python and JS that passes Odoo's own linters (`odoo/addons/test_lint`: `test_pylint.py` + `test_eslint.py`), and verify with **Odoo's official `test_lint`** (run via `odoo-bin`, see below). Full notes:
https://github.com/JocelynVN/odoo-technical-plugins/blob/main/plugins/odoo-test-lint/rules/odoo-test-lint.md

## Python — pylint (the checks Odoo's `test_lint` enables)

- No `undefined-variable`, `used-before-assignment`, `unreachable` code, or `function-redefined` (duplicate methods/functions).
- No `eval()` (`eval-used`); no `input()` builtin (`bad-functions`).
- Don't leave debugger imports in code (`pdb`, `ipdb`, `pudb`, `q`); avoid deprecated stdlib `csv`, `urllib`, `cgi` — use the `odoo.tools` / `werkzeug` equivalents.
- **SQL injection** (`sql-injection`): never interpolate variables into a query string (`%`, f-string, `+`, `.format`). Pass values as parameters: `self.env.cr.execute("... WHERE id IN %s", [tuple(ids)])`.
- **Translations** (`gettext-variable`, `gettext-placeholders`, `gettext-repr`): `_()` / `self.env._()` must wrap a **plain string literal** — no variable, no f-string/`.format`, no `%r`. Interpolate *after* translating: `_("Hi %s", name)` or `_("Hi %(n)s") % {"n": name}`.
- **Unlink override** (`raise-unlink-override`): don't override `unlink()` just to `raise`. Block deletion with an `ondelete` Python constraint or a `@api.ondelete`-decorated method instead.

## JavaScript — ESLint (Odoo's `eslintrc`)

- No undefined names (`no-undef`); only the declared globals (`odoo`, `luxon`, `$`, `jQuery`, `owl`, …). Don't rely on `event` or `self` as implicit globals (`no-restricted-globals`).
- No `debugger`, no `const` reassignment, no duplicate keys/args/imports/class members, `valid-typeof`, no unused vars.
- **No private class fields** (`#field`) — `PrivateIdentifier` is banned.
- **OWL components must declare `static props` and `static template`.**
- `_t(...)` must not contain multiple unnamed `%s` placeholders — use named placeholders.
- Never lint or commit third-party / minified libs (`/lib/` paths are excluded).

## How to run the checks — Odoo's official `test_lint` (via `odoo-bin`)

Always verify with Odoo's own `test_lint` test run through `odoo-bin`. That runs
both pylint (Odoo's `_odoo_checker_*` checkers) and eslint exactly as Odoo CI
does — no custom per-file linting. Notes:

- It lints **all custom modules** in the addons path (it skips Odoo core); there
  is **no built-in "changed files only" mode**. So after a run, focus on fixing
  the failures **in the files you changed**.
- `odoo-bin -i test_lint` still needs **pylint and eslint installed** in the Odoo
  env (Odoo doesn't bundle them and the test silently skips when they're missing):
  `pip install pylint` and install `eslint` (npm).

**Steps:**

1. **Find the Odoo Python.** Read `.odoo-lint.json` in the project root and use its
   `python` field — the interpreter of the user's Odoo env (the installer saves it
   at install time). If it's missing, **ask the user** for their Odoo venv (or its
   python) and save it, then add `.odoo-lint.json` to `.gitignore` (per-developer).
   Cache `odoo_bin`/`db` in the same file once you learn them so you never re-ask:
   ```json
   { "python": "/path/to/venv/bin/python", "odoo_bin": "/path/to/odoo/odoo-bin", "db": "<db>" }
   ```
2. **Run Odoo's `test_lint` with that interpreter** (ask once for the `odoo-bin`
   path / db / config if you don't know them):
   ```bash
   "<python>" <odoo_bin> -c odoo.conf -d <db> -u test_lint --test-enable --stop-after-init
   ```
   First time the module isn't installed yet → use `-i test_lint`; afterwards
   `-u test_lint` re-runs it against the current source.
3. **Read the pylint/eslint failures** in the test log and **fix every failure in
   the files you changed.** Re-run until those are clean. If you can't run it (no
   `python`, or pylint/eslint not installed in that env and you can't install
   them), **say so explicitly** and list what you checked manually — don't silently
   skip it.

## Required workflow

After you write or modify any Python or JavaScript in an Odoo module, before you
report the task as done you MUST run Odoo's `test_lint` (step 1–2 above) and fix
every failure in the files you touched.

Do not consider the task complete while lint errors in your changes remain.
