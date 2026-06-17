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

## 🔎 How to run the checks (Odoo's own linters)

Odoo's `test_lint` isn't a standalone tool — its Python checks are **pylint
plugins** that live in the Odoo source you already have
(`odoo/addons/test_lint/tests/_odoo_checker_*.py`), and its JS check is an
**ESLint** config. Odoo doesn't ship pylint/eslint, so install the linter and
point it at Odoo's own checkers via the configs in [`rules/`](rules). The
checkers only load when `odoo` is importable, so run pylint with the **Python
interpreter of your Odoo env** — the installer asks for it (`--python`, default:
system python) and saves it to `.odoo-lint.json`:

```bash
"<python>" -m pip install "pylint>=3.0"                       # one-time, in your Odoo env
"<python>" -m pylint --rcfile=rules/pylintrc path/to/your_module   # runs Odoo's real checkers
npx --yes eslint@8 --no-eslintrc -c rules/eslintrc "your_module/static/src/**/*.js"
```

(Odoo running from a source checkout that isn't pip-installed? Pass the source
root: `ODOO_PATH=/path/to/odoo "<python>" -m pylint --rcfile=rules/pylintrc …`.)

The interpreter (and optional Odoo source root) live in a project-root
`.odoo-lint.json` so the agent never has to ask — add that file to `.gitignore`,
the paths are per-developer:

```json
{ "python": "/path/to/venv/bin/python", "odoo_path": "/path/to/odoo" }
```

The bundled [`rules/pylintrc`](rules/pylintrc) loads Odoo's exact checker plugins
(`_odoo_checker_sql_injection`, `_odoo_checker_gettext`,
`_odoo_checker_unlink_override`) and enables the same messages Odoo CI does, so
you get the authentic `E8501`/`E8502`/`E8503`/`E8505`/`E8506` checks — not a
reimplementation. See [`rules/odoo-test-lint.md`](rules/odoo-test-lint.md) for details.

## What it enforces

- **Python (pylint):** no undefined/used-before-assignment/unreachable/redefined,
  no `eval()`/`input()`, no deprecated modules or leftover debuggers,
  **no SQL injection**, lazy-translation rules for `_()`, and no `unlink()`
  override that just raises.
- **JavaScript (ESLint):** no-undef with Odoo globals, no private class fields,
  OWL components must declare `static props`/`static template`, named `_t`
  placeholders, and the usual `no-debugger`/`no-dupe-*`/`no-unused-vars`.

See [`rules/odoo-test-lint.md`](rules/odoo-test-lint.md) for details, and the ready-to-use
configs [`rules/eslintrc`](rules/eslintrc) and [`rules/pylintrc`](rules/pylintrc).

## Contents

```text
skills/odoo-test-lint/SKILL.md   # rules body, written into AGENTS.md / CLAUDE.md
rules/odoo-test-lint.md          # reference notes
rules/eslintrc                   # Odoo's ESLint config (usable as-is)
rules/pylintrc                   # pylint config that loads Odoo's own checkers
```
