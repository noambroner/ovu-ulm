#!/bin/bash
# unlink-shared.sh - Replaces symlinks with actual files for commit

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SHARED_WORK_DIR="$HOME/projects/worktrees/shared-work"

echo "📦 Unlinking shared resources (preparing for commit)..."

cd "$PROJECT_DIR"

# Check if shared exists and has symlinks
if [ ! -d "shared" ]; then
    echo "  ℹ️  No shared directory found"
    exit 0
fi

cd shared

# For each directory, check if it's a symlink and replace with actual content
for dir in interface-resources localization react-components; do
    if [ -L "$dir" ]; then
        echo "  🔄 Converting $dir from symlink to real directory..."
        
        # Get the target of the symlink
        target=$(readlink "$dir")
        
        # Remove the symlink
        rm "$dir"
        
        # Copy the actual content
        if [ -d "$target" ]; then
            cp -r "$target" "$dir"
            echo "  ✅ $dir converted"
        else
            echo "  ⚠️  Warning: $target not found"
        fi
    else
        echo "  ℹ️  $dir is already a real directory"
    fi
done

echo "🎉 Shared resources unlinked! Safe to commit now."


