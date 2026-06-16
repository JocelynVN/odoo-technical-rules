# Odoo Lint — reference

Mirrors the checks in Odoo's official **`test_lint`** module
([`odoo/addons/test_lint`](https://github.com/odoo/odoo/tree/18.0/odoo/addons/test_lint)),
which is what quality gates like Viindoo's `test_pylint` build on. Two linters:
**pylint** for Python and **ESLint** for JavaScript.

## Python — pylint

Odoo's `test_pylint.py` runs pylint with `--disable=all` and enables a small,
high-signal set of checks plus custom Odoo checkers.

**Standard pylint checks enabled**
- `undefined-variable`, `used-before-assignment` — undefined / too-early names.
- `unreachable` — dead code after `return`/`raise`/`continue`.
- `function-redefined` — duplicate function/method definitions.
- `eval-used` — no `eval()`.
- `bad-builtin` with `bad-functions=input` — no `input()`.
- `deprecated-module` — no `csv`, `urllib`, `cgi`; no leftover debuggers
  (`pdb`, `ipdb`, `pudb`, `q`).

**Custom Odoo checkers** (live in Odoo source; run inside Odoo's test suite)
- `sql-injection` — never interpolate variables into a SQL string. Always pass
  values as query parameters:
  ```python
  self.env.cr.execute("SELECT id FROM res_partner WHERE id IN %s", [tuple(ids)])
  ```
- `gettext-variable` / `gettext-placeholders` / `gettext-repr` — `_()` /
  `self.env._()` must wrap a **plain string literal**: no variable argument, no
  f-string or `.format()`, no `%r`. Interpolate **after** translation:
  ```python
  raise UserError(self.env._("Record %s is locked", record.name))
  message = self.env._("Hello %(name)s") % {"name": partner.name}
  ```
- `raise-unlink-override` — don't override `unlink()` solely to `raise`. Prevent
  deletion declaratively instead:
  ```python
  @api.ondelete(at_uninstall=False)
  def _unlink_except_locked(self):
      if any(rec.locked for rec in self):
          raise UserError(self.env._("Locked records cannot be deleted."))
  ```

**Run it**
```bash
pylint --rcfile=pylintrc path/to/your_module        # standalone subset
pip install pylint-odoo                              # for the odoo-specific checks
```
See [`pylintrc`](pylintrc) in this folder.

## JavaScript — ESLint

Odoo's `test_eslint.py` runs ESLint with the bundled [`eslintrc`](eslintrc)
over `**/static/**/*.js` (excluding `/lib/` and generated code).

Key rules:
- `no-undef` + an allowlist of globals (`odoo`, `luxon`, `$`, `jQuery`, `owl`, …).
- `no-restricted-globals`: don't use `event` or `self` implicitly.
- `no-debugger`, `no-const-assign`, `no-dupe-*`, `valid-typeof`, `no-unused-vars`.
- `no-restricted-syntax`:
  - **No private class fields** (`#field` / `PrivateIdentifier`).
  - **OWL `Component` subclasses must declare `static props` and `static template`.**
  - `_t(...)` must not contain multiple unnamed `%s` placeholders — use named ones.

**Run it**
```bash
eslint --no-eslintrc -c eslintrc "your_module/static/src/**/*.js"
```
Point-of-sale modules use a stricter config (`web/tooling/_eslintrc.json`) in Odoo.

> Never commit minified JS and never lint third-party libraries under `/lib/`.
