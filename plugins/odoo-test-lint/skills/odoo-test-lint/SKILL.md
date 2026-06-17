---
name: odoo-test-lint
description: Make AI-written Odoo code pass Odoo's official linters — the pylint checks enforced by Odoo's `test_lint` module (SQL-injection, gettext/translation, eval, deprecated modules, unlink override) and the ESLint rules from Odoo's `eslintrc` (no-undef, OWL static props/template, no private fields, translation placeholders). Use whenever writing or reviewing Odoo Python (`models/`, `controllers/`, `wizard/`) or JavaScript (`static/src/**/*.js`).
---

# Odoo Lint Rules

Write Python and JS that passes Odoo's own linters (`odoo/addons/test_lint`: `test_pylint.py` + `test_eslint.py` / `eslintrc`). Ready-to-use lint configs and full notes:
https://github.com/JocelynVN/odoo-technical-plugins/tree/main/plugins/odoo-test-lint/rules

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

## How to actually run these checks (use Odoo's own linters)

Odoo's `test_lint` is **not** a standalone linter — its Python checks are
**pylint plugins** living in the Odoo source you already have
(`odoo/addons/test_lint/tests/_odoo_checker_*.py`), and its JS check is an
**ESLint** config. Odoo does not ship pylint/eslint in `requirements.txt`, and
its own test silently *skips* when they're missing — so you must install the
linter, then point it at Odoo's own checkers. Two ready-to-use configs ship in
this plugin's [`rules/`](https://github.com/JocelynVN/odoo-technical-plugins/tree/main/plugins/odoo-test-lint/rules).

**Python — pylint loading Odoo's real checkers** (exact same checks as Odoo CI).
The checkers only load when `odoo` is importable, so you must run the **pylint
that lives in the user's Odoo virtualenv** — not a random global one:

1. **Find the venv path.** First read `.odoo-lint.json` in the project root and use
   its `venv` field. If the file is missing, **ask the user** for their Odoo venv
   path (e.g. `/path/to/venv`) and **write it** there so you never ask again — then
   add `.odoo-lint.json` to `.gitignore` (paths are per-developer). Valid JSON,
   `odoo_path` optional (see step 3):
   ```json
   { "venv": "/path/to/venv", "odoo_path": "/path/to/odoo" }
   ```
2. **Run that venv's pylint** (it loads Odoo's checkers automatically because
   `odoo` is importable there):
   ```bash
   "<venv>/bin/pylint" --rcfile=<this plugin's rules/pylintrc> path/to/your_module
   ```
   Install pylint into that venv once if missing:
   `"<venv>/bin/pip" install "pylint>=3.0"` (Odoo doesn't bundle it).
3. **Source-checkout fallback.** If Odoo runs from a source tree that isn't
   pip-installed (so `import odoo` fails even in the venv), pass the Odoo root via
   `ODOO_PATH=/path/to/odoo "<venv>/bin/pylint" …` — store it as `odoo_path` in
   `.odoo-lint.json` (ask once if absent).

The bundled `pylintrc` lists Odoo's plugins (`_odoo_checker_sql_injection`,
`_odoo_checker_gettext`, `_odoo_checker_unlink_override` + `bad_builtin`) and
enables the exact messages Odoo CI does. (No Odoo source at all? `pip install
pylint-odoo` into the venv and swap the three `_odoo_checker_*` plugins for
`pylint_odoo` in the rcfile.)

**JavaScript — ESLint with Odoo's config:**

```bash
npx --yes eslint@8 --no-eslintrc -c <this plugin's rules/eslintrc> \
    "your_module/static/src/**/*.js"     # skip /lib/ and *.min.js
```

## Required workflow

After you write or modify any Python or JavaScript in an Odoo module, before you
report the task as done you MUST:

1. **Run the linter on the files/module you changed** — pylint with this plugin's
   `pylintrc` (Python) and/or ESLint with its `eslintrc` (JS), as shown above.
2. **Fix every reported error.** Re-run until clean.
3. If the linter isn't installed and you can't install it, **say so explicitly**
   and list what you checked manually against the rules above — don't silently
   skip it.

Do not consider the task complete while lint errors remain.
