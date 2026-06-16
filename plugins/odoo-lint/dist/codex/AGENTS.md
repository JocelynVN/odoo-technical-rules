# Odoo Lint Rules (for Codex)

Write Odoo Python and JS that passes Odoo's official linters (`odoo/addons/test_lint`).
Full notes & ready-to-use configs: https://github.com/JocelynVN/odoo-technical-plugins/tree/main/plugins/odoo-lint/rules

## Python — pylint (checks Odoo's test_lint enables)
- No `undefined-variable`, `used-before-assignment`, `unreachable` code, or `function-redefined`.
- No `eval()`; no `input()`; no leftover debuggers (`pdb`/`ipdb`/`pudb`/`q`); avoid deprecated stdlib `csv`/`urllib`/`cgi`.
- **SQL injection**: never interpolate variables into SQL (`%`, f-string, `+`, `.format`). Pass params: `cr.execute("... WHERE id IN %s", [tuple(ids)])`.
- **Translations**: `_()` / `env._()` must wrap a plain string literal — no variable, no f-string/`.format`, no `%r`. Interpolate after: `_("Hi %s", name)` or `_("Hi %(n)s") % {"n": name}`.
- **Unlink override**: don't override `unlink()` just to `raise` — use an `ondelete` / `@api.ondelete` constraint instead.

## JavaScript — ESLint (Odoo's eslintrc)
- No undefined names; only declared globals (`odoo`, `luxon`, `$`, …). Don't use `event`/`self` as implicit globals.
- No `debugger`, no `const` reassignment, no duplicate keys/args/imports/class members, valid `typeof`, no unused vars.
- No private class fields (`#x`).
- OWL components must declare `static props` and `static template`.
- `_t(...)` must not use multiple unnamed `%s` placeholders — use named placeholders.
- Never lint/commit third-party or minified libs (`/lib/`).
