# odoo-lint

Make AI-written Odoo code pass **Odoo's official linters** — the pylint checks
enforced by Odoo's [`test_lint`](https://github.com/odoo/odoo/tree/18.0/odoo/addons/test_lint)
module and the ESLint rules from Odoo's `eslintrc`. Part of the
[odoo-technical-plugins](../../README.md) collection.

## 🔌 Install

**One command, any agent** (Claude Code / Codex / Cursor):

```bash
npx odoo-technical-plugins --plugin odoo-lint
```

Or run `npx odoo-technical-plugins` and pick `odoo-lint` from the menu.

## What it enforces

- **Python (pylint):** no undefined/used-before-assignment/unreachable/redefined,
  no `eval()`/`input()`, no deprecated modules or leftover debuggers,
  **no SQL injection**, lazy-translation rules for `_()`, and no `unlink()`
  override that just raises.
- **JavaScript (ESLint):** no-undef with Odoo globals, no private class fields,
  OWL components must declare `static props`/`static template`, named `_t`
  placeholders, and the usual `no-debugger`/`no-dupe-*`/`no-unused-vars`.

See [`rules/odoo-lint.md`](rules/odoo-lint.md) for details, and the ready-to-use
configs [`rules/eslintrc`](rules/eslintrc) and [`rules/pylintrc`](rules/pylintrc).

## Contents

```text
skills/odoo-lint/SKILL.md                  # Claude Code skill (auto-activates on Odoo py/js)
rules/odoo-lint.md                         # reference notes
rules/eslintrc                             # Odoo's ESLint config (usable as-is)
rules/pylintrc                             # standalone pylint config
dist/codex/AGENTS.md                       # ready-to-copy for Codex
dist/cursor/.cursor/rules/odoo-lint.mdc    # ready-to-copy for Cursor
```
