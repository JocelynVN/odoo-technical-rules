# odoo-technical-rules

A general, **vendor-neutral** technical ruleset for Odoo module development, packaged as an AI-agent plugin. Part of the [odoo-technical-plugins](../../README.md) marketplace.

## 📖 The rules

| Language | File |
|----------|------|
| 🇻🇳 Tiếng Việt | [rules/technical-rules.vi.md](rules/technical-rules.vi.md) |
| 🇬🇧 English | [rules/technical-rules.en.md](rules/technical-rules.en.md) |

Both versions have identical content and are the **single source of truth**. The agent configs below embed a condensed checklist and link back here.

## 🔌 Install

See **[INSTALL.md](INSTALL.md)** for per-agent steps (Claude Code / Codex / Cursor).

Quick start for Claude Code:

```bash
/plugin marketplace add JocelynVN/odoo-technical-plugins
/plugin install odoo-technical-rules@odoo-technical-plugins
```

One-line install for Codex & Cursor (run from your Odoo project, no clone needed):

```bash
curl -fsSL https://raw.githubusercontent.com/JocelynVN/odoo-technical-plugins/main/plugins/odoo-technical-rules/install.sh | bash
```

## Contents

```text
.claude-plugin/plugin.json                       # plugin manifest
skills/odoo-technical-rules/SKILL.md             # Claude Code skill (auto-activates on Odoo code)
rules/technical-rules.{en,vi}.md                 # full ruleset (single source)
dist/codex/AGENTS.md                             # ready-to-copy for Codex
dist/cursor/.cursor/rules/odoo-technical-rules.mdc  # ready-to-copy for Cursor
```

## What's inside the rules

Conventions covering: development environment, source control, module & manifest structure, directory/file layout (incl. per-component OWL static), models & fields, XML/views (minimum list+kanban+form+search), Python & ORM safety, docstrings (flake8-docstrings/PEP 257), security, automation tests, external dependencies, migrations & hooks, UX/UI, i18n, commit messages, pull requests, branch naming, and stable-version policy.

## Customizing for your team

Replace placeholders in the rule files: `<prefix>` → your module prefix, `<odoo_version>` → your target version. Add team-specific conventions at the end.
