---
name: odoo-technical-rules
description: Apply the project's general Odoo technical rules when writing, modifying, or reviewing Odoo module code — module/manifest naming, directory & per-component static layout, models & fields, XML/views (minimum list+kanban+form+search), Python & ORM safety, docstrings (flake8-docstrings/PEP 257), security, tests, commit messages, branch names, and stable-version policy. Use whenever the task touches an Odoo addon (`__manifest__.py`, `models/`, `views/`, `.xml`, `ir.model.access.csv`, etc.).
---

# Odoo Technical Rules

You are working in an Odoo codebase. Follow the rules below for any code you write or review. The checklist here is the canonical summary; for full detail and examples, read the complete ruleset:

- English: https://github.com/JocelynVN/odoo-technical-rules/blob/main/technical-rules.en.md
- Tiếng Việt: https://github.com/JocelynVN/odoo-technical-rules/blob/main/technical-rules.vi.md

If this repo is the working directory, those files are at the repo root (`technical-rules.en.md` / `technical-rules.vi.md`). Consult them before a non-trivial change.

## Must-follow checklist

**Module & manifest**
- Technical name: lowercase `[a-z0-9_]`, team prefix `<prefix>_`. Extensions: `<prefix>_<base_module>_<feature>`. Localization: `l10n_<cc>_<prefix>_xxx`.
- `summary` ≤ 158 chars; `description` in Markdown. New module version `<odoo_version>.1.0.0`; bump version **only** when a migration ships. `depends` only on modules actually used.

**Layout**
- Split files per model (`models/<model>.py`, `views/<model>_views.xml`, ...).
- **Static is packaged per component**: an OWL component's js + xml + scss live together in `static/src/components/<component_name>/`, **not** split into `js/`, `xml/`, `scss/` folders.

**Models & fields**
- New models must set `_description`. Many2one → `_id`, One2many/Many2many → `_ids`.
- Every field needs `string`; add `help` whenever meaning isn't obvious.

**Views**
- Provide at least 4 views: `list`, `kanban` (for mobile), `form`, `search`.
- `id` before `model`; `<field name>` first. Reuse the parent view's xml_id for inherits. Avoid `position="replace"` (if unavoidable: comment why + `priority` > 100).

**Python & ORM**
- Keep import order and in-model declaration order (private attrs → fields → defaults → compute/search → constraints/onchange → CRUD → actions → business).
- Method naming: `_compute_`, `_inverse_`, `_search_`, `_default_`, `_onchange_`, `_check_`.
- Never build SQL via string concatenation — use parameterized queries. Don't bypass the ORM if `search`/`read` can do it (document with a docstring if you must).
- Validate with `@api.constrains`, not `onchange` (onchange may only warn).
- **Docstrings**: mandatory on public methods; must pass `flake8-docstrings` (PEP 257) — triple double-quotes, imperative summary ending in a period, blank line before the body.

**Security**
- Define access in `ir.model.access.csv`; declare groups and record rules in `security.xml` with same-model rules kept contiguous.

**Tests**
- Scenario-based; reuse demo data; use `@example.com` emails. Update tests when computation logic changes.

**Commits & branches**
- English commits prefixed `[IMP] [FIX] [ADD] [REM] [REN] [MIG] [UPG] [I18N] [MERGE] [MISC]`, with the module name in the title.
- Branch: `v<odoo_version>_<fix|upg|add|rem|imp>_<module_name>` or `v<odoo_version>_<feature_name>`.

**Stable policy**
- On released versions (`16.0`, `17.0`, ...): no schema/data-model changes, no method renames, no xml_id changes or data-record deletions, no new required args. When logic affects existing data, write a migration in the module.
