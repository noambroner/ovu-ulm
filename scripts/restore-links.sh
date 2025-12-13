#!/bin/bash
# restore-links.sh - Restores symlinks after commit

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔁 Restoring symlinks for development..."

# Run link-shared.sh
"$SCRIPT_DIR/link-shared.sh"


