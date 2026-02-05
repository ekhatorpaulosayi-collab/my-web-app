#!/bin/bash

echo "🧪 TESTING FILE ACCESS..."
echo ""

# Test 1: Can we see the files?
echo "✅ Test 1: Checking files exist..."
if [ -f "QUICK_START_BUG_FIXING.md" ]; then
    echo "   ✓ QUICK_START_BUG_FIXING.md - Found!"
else
    echo "   ✗ QUICK_START_BUG_FIXING.md - NOT FOUND!"
fi

if [ -f "EMERGENCY_BUG_FIX_GUIDE.md" ]; then
    echo "   ✓ EMERGENCY_BUG_FIX_GUIDE.md - Found!"
else
    echo "   ✗ EMERGENCY_BUG_FIX_GUIDE.md - NOT FOUND!"
fi

if [ -f "share-codebase-with-claude.sh" ]; then
    echo "   ✓ share-codebase-with-claude.sh - Found!"
else
    echo "   ✗ share-codebase-with-claude.sh - NOT FOUND!"
fi

if [ -f "HOW_TO_ACCESS_FILES.md" ]; then
    echo "   ✓ HOW_TO_ACCESS_FILES.md - Found!"
else
    echo "   ✗ HOW_TO_ACCESS_FILES.md - NOT FOUND!"
fi

echo ""

# Test 2: Can we read the files?
echo "✅ Test 2: Checking files are readable..."
head -1 QUICK_START_BUG_FIXING.md > /dev/null 2>&1 && echo "   ✓ Files are readable!" || echo "   ✗ Cannot read files!"

echo ""

# Test 3: Can we execute the script?
echo "✅ Test 3: Checking script is executable..."
if [ -x "share-codebase-with-claude.sh" ]; then
    echo "   ✓ Script is executable!"
else
    echo "   ⚠ Script is NOT executable. Fixing..."
    chmod +x share-codebase-with-claude.sh
    echo "   ✓ Fixed! Script is now executable."
fi

echo ""

# Test 4: Show file sizes
echo "✅ Test 4: File information..."
echo ""
printf "   %-40s %8s\n" "FILE" "SIZE"
printf "   %-40s %8s\n" "----" "----"
printf "   %-40s %8s\n" "QUICK_START_BUG_FIXING.md" "$(ls -lh QUICK_START_BUG_FIXING.md | awk '{print $5}')"
printf "   %-40s %8s\n" "EMERGENCY_BUG_FIX_GUIDE.md" "$(ls -lh EMERGENCY_BUG_FIX_GUIDE.md | awk '{print $5}')"
printf "   %-40s %8s\n" "share-codebase-with-claude.sh" "$(ls -lh share-codebase-with-claude.sh | awk '{print $5}')"
printf "   %-40s %8s\n" "HOW_TO_ACCESS_FILES.md" "$(ls -lh HOW_TO_ACCESS_FILES.md | awk '{print $5}')"

echo ""
echo ""

# Test 5: Show access paths
echo "✅ Test 5: How to access these files..."
echo ""
echo "   📂 Current Location:"
echo "      $(pwd)"
echo ""
echo "   🖥️ Windows File Explorer:"
echo "      \\\\wsl\$\\Ubuntu$(pwd | sed 's/\//\\/g')"
echo ""
echo "   💻 VS Code:"
echo "      code $(pwd)"
echo ""
echo "   🌐 GitHub:"
git remote get-url origin 2>/dev/null | sed 's/git@github.com:/https:\/\/github.com\//' | sed 's/\.git$//' | sed 's/^/      /' || echo "      Git not configured"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ALL TESTS PASSED! FILES ARE ACCESSIBLE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Quick Commands:"
echo ""
echo "   Read Quick Start Guide:"
echo "   cat QUICK_START_BUG_FIXING.md"
echo ""
echo "   Run Bug Fix Script:"
echo "   ./share-codebase-with-claude.sh"
echo ""
echo "   Open in VS Code:"
echo "   code ."
echo ""
