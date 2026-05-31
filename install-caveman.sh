#!/usr/bin/env bash
# Reproduces the caveman install used in this terminal.
#
# Source of truth: https://github.com/JuliusBrussee/caveman
# Installer does:
#   1. Adds GitHub marketplace `JuliusBrussee/caveman` to ~/.claude/settings.json
#   2. Enables plugin `caveman@caveman`
#   3. Deploys hooks to ~/.claude/hooks/ (caveman-activate.js,
#      caveman-mode-tracker.js, caveman-statusline.sh, ...)
#   4. Registers SessionStart + UserPromptSubmit hooks and statusLine
#      in ~/.claude/settings.json
#
# Requirements: bash, curl, Node.js >= 18 (ships with npx).
# Run in another terminal:  bash install-caveman.sh
#
# Pass --all to enable every caveman skill/agent, or omit for defaults.

set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js >=18 required. Install from https://nodejs.org" >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Node $NODE_MAJOR too old. Need Node >=18." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl required." >&2
  exit 1
fi

# Forward any extra flags (e.g. --all) to the upstream installer.
curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh \
  | bash -s -- "$@"

echo
echo "Done. Restart Claude Code so SessionStart hook fires."
echo "Verify with:  /caveman-help    (inside Claude Code)"
echo "Toggle level: /caveman lite|full|ultra"
echo "Disable:      stop caveman   (or remove plugin via /plugin)"
