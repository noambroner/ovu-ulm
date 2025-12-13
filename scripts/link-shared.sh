#!/bin/bash
# link-shared.sh - Creates symlinks to shared-work for live development

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SHARED_WORK_DIR="$HOME/projects/worktrees/shared-work"

echo "🔗 Linking shared resources for development..."

# Remove existing shared directory
if [ -d "$PROJECT_DIR/shared" ]; then
    rm -rf "$PROJECT_DIR/shared"
fi

# Create shared directory
mkdir -p "$PROJECT_DIR/shared"

# Create symlinks for each shared subdirectory
cd "$PROJECT_DIR/shared"

if [ -d "$SHARED_WORK_DIR/interface-resources" ]; then
    ln -s "$SHARED_WORK_DIR/interface-resources" interface-resources
    echo "  ✅ interface-resources linked"
fi

if [ -d "$SHARED_WORK_DIR/localization" ]; then
    ln -s "$SHARED_WORK_DIR/localization" localization
    echo "  ✅ localization linked"
fi

if [ -d "$SHARED_WORK_DIR/react-components" ]; then
    ln -s "$SHARED_WORK_DIR/react-components" react-components
    echo "  ✅ react-components linked"
fi

echo "🎉 Shared resources linked! Changes in shared-work will appear instantly here."


