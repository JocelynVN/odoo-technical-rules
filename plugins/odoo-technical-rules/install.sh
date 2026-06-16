#!/usr/bin/env bash
#
# Installer for the odoo-technical-rules agent configs (Codex & Cursor).
#
# Works two ways:
#   • from a clone:   ./install.sh <agent> [target]
#   • remote, no clone:
#       curl -fsSL https://raw.githubusercontent.com/JocelynVN/odoo-technical-plugins/main/plugins/odoo-technical-rules/install.sh | bash -s -- <agent> [target]
#
# <agent>  : codex | cursor | all   (default: all)
# [target] : a project directory (default: current dir) or the word "global"
#
set -euo pipefail

REPO_RAW="https://raw.githubusercontent.com/JocelynVN/odoo-technical-plugins/main/plugins/odoo-technical-rules"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || true)"

AGENT="${1:-all}"
TARGET="${2:-.}"

c_green() { printf '\033[32m%s\033[0m\n' "$1"; }
c_blue()  { printf '\033[34m%s\033[0m\n' "$1"; }

# Print a bundled file to stdout — from the local clone if present, else fetch it.
get() {
  if [ -n "$SCRIPT_DIR" ] && [ -f "$SCRIPT_DIR/$1" ]; then
    cat "$SCRIPT_DIR/$1"
  else
    curl -fsSL "$REPO_RAW/$1"
  fi
}

install_codex() {
  local dest
  if [ "$TARGET" = "global" ]; then dest="$HOME/.codex/AGENTS.md"; else dest="$TARGET/AGENTS.md"; fi
  local content; content="$(get dist/codex/AGENTS.md)"
  mkdir -p "$(dirname "$dest")"
  if [ -f "$dest" ] && grep -q "Odoo Technical Rules (for Codex)" "$dest"; then
    c_blue "Codex: already present in $dest — skipped."
  elif [ -f "$dest" ]; then
    { printf '\n\n'; printf '%s\n' "$content"; } >> "$dest"
    c_green "Codex: appended rules to existing $dest"
  else
    printf '%s\n' "$content" > "$dest"
    c_green "Codex: created $dest"
  fi
}

install_cursor() {
  local dest
  if [ "$TARGET" = "global" ]; then
    dest="$HOME/.cursor/rules/odoo-technical-rules.mdc"
  else
    dest="$TARGET/.cursor/rules/odoo-technical-rules.mdc"
  fi
  mkdir -p "$(dirname "$dest")"
  get dist/cursor/.cursor/rules/odoo-technical-rules.mdc > "$dest"
  c_green "Cursor: installed $dest"
}

case "$AGENT" in
  codex)  install_codex ;;
  cursor) install_cursor ;;
  all)    install_codex; install_cursor ;;
  *) echo "Usage: install.sh <codex|cursor|all> [project-dir|global]" >&2; exit 1 ;;
esac
