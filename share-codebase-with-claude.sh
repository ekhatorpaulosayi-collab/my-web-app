#!/bin/bash

# 🚨 EMERGENCY: Share Codebase with Claude Code
# Run this when something is broken and you need help

echo "🔧 CREATING BUG FIX PACKAGE FOR CLAUDE CODE"
echo "============================================"
echo ""

# Create timestamped directory
REPORT_DIR=~/claude-bug-report-$(date +%Y%m%d-%H%M%S)
mkdir -p "$REPORT_DIR"

echo "📦 Copying essential files..."

# Core application files
cp /home/ekhator1/smartstock-v2/src/App.jsx "$REPORT_DIR/" 2>/dev/null
cp /home/ekhator1/smartstock-v2/package.json "$REPORT_DIR/" 2>/dev/null
cp /home/ekhator1/smartstock-v2/.env.local "$REPORT_DIR/.env.local.txt" 2>/dev/null

# Library files
mkdir -p "$REPORT_DIR/lib"
cp /home/ekhator1/smartstock-v2/src/lib/*.js "$REPORT_DIR/lib/" 2>/dev/null
cp /home/ekhator1/smartstock-v2/src/lib/*.ts "$REPORT_DIR/lib/" 2>/dev/null

# Services
mkdir -p "$REPORT_DIR/services"
cp /home/ekhator1/smartstock-v2/src/services/*.js "$REPORT_DIR/services/" 2>/dev/null
cp /home/ekhator1/smartstock-v2/src/services/*.ts "$REPORT_DIR/services/" 2>/dev/null

# Contexts
mkdir -p "$REPORT_DIR/contexts"
cp /home/ekhator1/smartstock-v2/src/contexts/*.jsx "$REPORT_DIR/contexts/" 2>/dev/null
cp /home/ekhator1/smartstock-v2/src/contexts/*.tsx "$REPORT_DIR/contexts/" 2>/dev/null

# Components (top-level only, not subdirectories)
mkdir -p "$REPORT_DIR/components"
cp /home/ekhator1/smartstock-v2/src/components/*.jsx "$REPORT_DIR/components/" 2>/dev/null
cp /home/ekhator1/smartstock-v2/src/components/*.tsx "$REPORT_DIR/components/" 2>/dev/null

# Pages
mkdir -p "$REPORT_DIR/pages"
cp /home/ekhator1/smartstock-v2/src/pages/*.jsx "$REPORT_DIR/pages/" 2>/dev/null
cp /home/ekhator1/smartstock-v2/src/pages/*.tsx "$REPORT_DIR/pages/" 2>/dev/null

# Recent migrations
mkdir -p "$REPORT_DIR/migrations"
cp /home/ekhator1/smartstock-v2/supabase/migrations/*.sql "$REPORT_DIR/migrations/" 2>/dev/null

echo "✅ Files copied!"
echo ""

# Create issue template
cat > "$REPORT_DIR/BUG_REPORT.md" <<'EOF'
# 🚨 BUG REPORT

**Date:** $(date)

---

## 📝 DESCRIBE THE BUG

What's broken? (e.g., "Add Product button doesn't work")

```
[Write description here]
```

---

## 🔴 BROWSER CONSOLE ERRORS

Press F12 → Console tab → Copy all RED errors:

```
[Paste console errors here]
```

---

## 📍 STEPS TO REPRODUCE

How to make the bug happen:

1. Go to...
2. Click...
3. See error

---

## ✅ EXPECTED BEHAVIOR

What SHOULD happen?

```
[Describe expected behavior]
```

---

## 😞 ACTUAL BEHAVIOR

What ACTUALLY happens?

```
[Describe actual behavior]
```

---

## 🌐 ENVIRONMENT

- **Browser:** Chrome / Safari / Firefox / Edge
- **Device:** Desktop / Mobile
- **User Type:** Owner / Staff / Customer
- **Internet:** Fast / Slow / Offline

---

## 📸 SCREENSHOTS (Optional)

Attach screenshots if helpful

---

## 💡 WHAT I'VE TRIED

What fixes did you attempt?

```
[List what you tried]
```

---

## 🆘 URGENCY

- [ ] Critical (app is down, users blocked)
- [ ] High (major feature broken)
- [ ] Medium (minor feature broken)
- [ ] Low (cosmetic issue)

---

**Files Included:**
- ✅ App.jsx (main application)
- ✅ Services (API calls)
- ✅ Components (UI elements)
- ✅ Pages (route views)
- ✅ Lib (utilities)
- ✅ Contexts (global state)
- ✅ Migrations (database schema)
- ✅ .env.local (configuration)

EOF

# Replace $(date) in template
sed -i "s/\$(date)/$(date)/" "$REPORT_DIR/BUG_REPORT.md" 2>/dev/null

# Create file list
echo "📄 Creating file index..."
cat > "$REPORT_DIR/FILE_LIST.txt" <<EOF
Files included in this bug report:
Generated: $(date)

Core Files:
$(ls -lh "$REPORT_DIR"/*.jsx "$REPORT_DIR"/*.json 2>/dev/null | awk '{print "  - " $9 " (" $5 ")"}')

Services:
$(ls -lh "$REPORT_DIR/services/" 2>/dev/null | grep -v "^total" | awk '{print "  - " $9}')

Components:
$(ls -lh "$REPORT_DIR/components/" 2>/dev/null | grep -v "^total" | awk '{print "  - " $9}')

Pages:
$(ls -lh "$REPORT_DIR/pages/" 2>/dev/null | grep -v "^total" | awk '{print "  - " $9}')

Libraries:
$(ls -lh "$REPORT_DIR/lib/" 2>/dev/null | grep -v "^total" | awk '{print "  - " $9}')

Contexts:
$(ls -lh "$REPORT_DIR/contexts/" 2>/dev/null | grep -v "^total" | awk '{print "  - " $9}')

Database Migrations:
$(ls -lh "$REPORT_DIR/migrations/" 2>/dev/null | grep -v "^total" | awk '{print "  - " $9}')

Total Files: $(find "$REPORT_DIR" -type f | wc -l)
Total Size: $(du -sh "$REPORT_DIR" | awk '{print $1}')
EOF

echo ""
echo "============================================"
echo "✅ BUG REPORT PACKAGE CREATED!"
echo "============================================"
echo ""
echo "📂 Location: $REPORT_DIR"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. Open and fill out: $REPORT_DIR/BUG_REPORT.md"
echo "   - Describe what's broken"
echo "   - Copy browser console errors (F12)"
echo "   - Add screenshots if helpful"
echo ""
echo "2. Share this ENTIRE folder with Claude Code:"
echo "   Option A: Zip it and upload"
echo "             cd $REPORT_DIR && zip -r ../bug-report.zip ."
echo ""
echo "   Option B: Use Claude Code directly"
echo "             Just paste the file paths from FILE_LIST.txt"
echo ""
echo "3. In Claude Code, say:"
echo "   'I have a bug. Here are the files: [attach folder]'"
echo ""
echo "🎯 Claude Code will:"
echo "   ✓ Read all your code instantly"
echo "   ✓ Find the exact bug location"
echo "   ✓ Give you the fix with line numbers"
echo "   ✓ Explain why it broke"
echo ""
echo "============================================"
echo ""

# Open the directory (works on most Linux systems)
if command -v xdg-open &> /dev/null; then
    xdg-open "$REPORT_DIR" 2>/dev/null &
elif command -v explorer.exe &> /dev/null; then
    # WSL Windows
    explorer.exe "$REPORT_DIR" 2>/dev/null &
fi

echo "💡 TIP: Keep this folder until bug is fixed!"
echo "    Then delete it to save space."
echo ""
