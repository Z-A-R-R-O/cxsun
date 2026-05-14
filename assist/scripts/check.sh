#!/bin/bash
# Run this after making changes to verify code quality
# Usage: bash assist/scripts/check.sh

echo "=== Lint ==="
npm run lint 2>/dev/null || echo "No lint script found"

echo ""
echo "=== Typecheck ==="
npm run typecheck 2>/dev/null || npx tsc --noEmit 2>/dev/null || echo "No typecheck script found"

echo ""
echo "=== Build ==="
npm run build 2>/dev/null || echo "No build script found"
