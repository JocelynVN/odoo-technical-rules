---
name: odoo-lint
description: Make AI-written Odoo code pass Odoo's official linters — the pylint checks enforced by Odoo's `test_lint` module (SQL-injection, gettext/translation, eval, deprecated modules, unlink override) and the ESLint rules from Odoo's `eslintrc` (no-undef, OWL static props/template, no private fields, translation placeholders). Use whenever writing or reviewing Odoo Python (`models/`, `controllers/`, `wizard/`) or JavaScript (`static/src/**/*.js`).
---

# Odoo Lint Rules

Write Python and JS that passes Odoo's own linters (`odoo/addons/test_lint`: `test_pylint.py` + `test_eslint.py` / `eslintrc`). Bundled configs you can use directly are next to this plugin under `rules/` (`eslintrc`, `pylintrc`); full notes in `rules/odoo-lint.md`.

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

## Configs in this plugin (`rules/`)

- `rules/eslintrc` — Odoo's ESLint config, usable as-is: `eslint --no-eslintrc -c eslintrc <files>`.
- `rules/pylintrc` — standalone pylint config approximating `test_lint` (note: Odoo's custom checkers live in Odoo source; install `pylint-odoo` for standalone SQL/gettext checks).
