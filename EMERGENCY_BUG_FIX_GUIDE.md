# 🚨 EMERGENCY BUG FIX GUIDE

## When Something Breaks - Copy & Paste This:

---

### **📋 STEP 1: Tell Me What's Broken**

```
Example:
"The Add Product button doesn't work when I click it"
"Images disappear after 2 hours"
"Users can't login"
"Payment fails with error message: [paste error]"
```

---

### **📂 STEP 2: Share Relevant Files**

Based on what's broken, share these files:

#### **🔴 Authentication Issues** (Login/Signup broken)
```bash
cat src/contexts/AuthContext.jsx
cat src/lib/supabase-auth.ts
cat src/pages/Login.jsx
cat src/pages/Signup.jsx
```

#### **🔴 Add/Edit Product Issues**
```bash
cat src/App.jsx | grep -A 50 "handleSave"
cat src/services/supabaseProducts.js
cat src/components/MultiImageUpload.tsx
```

#### **🔴 Image Display Issues**
```bash
cat src/components/MultiImageUpload.tsx
cat src/lib/imagekit.ts
cat src/pages/StorefrontPage.tsx | grep -A 30 "image"
cat .env.local | grep IMAGEKIT
```

#### **🔴 Payment Issues**
```bash
cat src/components/Cart.tsx
cat src/pages/StorefrontPage.tsx | grep -A 50 "payment"
cat .env.local | grep PAYSTACK
```

#### **🔴 Database/Supabase Issues**
```bash
cat src/lib/supabase.js
cat .env.local | grep SUPABASE
cat supabase/migrations/* | tail -100
```

#### **🔴 Storefront Not Loading**
```bash
cat src/pages/StorefrontPage.tsx
cat src/components/ProductImageGallery.tsx
cat src/styles/storefront.css
```

---

### **🎯 STEP 3: Copy Browser Console Errors**

1. Open your app
2. Press **F12** (or right-click → Inspect)
3. Click **Console** tab
4. Do the action that breaks
5. **Copy all RED errors** and send to me

Example:
```
TypeError: Cannot read property 'uid' of undefined
    at handleSave (App.jsx:1925)
    at onClick (App.jsx:4503)
```

---

### **📸 STEP 4: Screenshot (Optional but Helpful)**

Take a screenshot showing:
- What you clicked
- What happened (or didn't happen)
- Any error messages on screen

---

## 🔥 QUICK COMMAND REFERENCE

### **Get Specific Function Code:**

```bash
# Find where "handleAddProduct" is defined:
grep -n "handleAddProduct" src/App.jsx

# Show that function + 30 lines after:
sed -n '1234,1264p' src/App.jsx  # Replace 1234 with line number
```

### **Show Recent Changes:**

```bash
# What changed in last 24 hours:
find src -name "*.jsx" -o -name "*.tsx" -mtime -1

# Show git changes (if using git):
git diff HEAD~1
```

### **Package Entire Codebase:**

```bash
# Create zip of entire project:
tar -czf storehouse-backup-$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=.git \
  /home/ekhator1/smartstock-v2

# This creates: storehouse-backup-20250118.tar.gz
# Upload to Google Drive / Dropbox and share link
```

---

## 📦 COMPONENT MAP (Where Things Live)

### **Core Files:**

| What's Broken | File to Check |
|---------------|---------------|
| Main app logic | `src/App.jsx` (5000+ lines - the heart) |
| User login/signup | `src/contexts/AuthContext.jsx` |
| Database connection | `src/lib/supabase.js` |
| Product operations | `src/services/supabaseProducts.js` |
| Image uploads | `src/components/MultiImageUpload.tsx` |
| Storefront (customer view) | `src/pages/StorefrontPage.tsx` |
| Shopping cart | `src/components/Cart.tsx` |
| Subscription tiers | `src/services/subscriptionService.ts` |

### **Key Directories:**

```
src/
├── components/        # UI pieces (buttons, modals, etc.)
├── pages/            # Full page views (Login, Storefront, etc.)
├── contexts/         # Global state (Auth, Cart, etc.)
├── services/         # API calls (Supabase, Paystack, etc.)
├── lib/              # Utilities (imagekit, supabase setup)
├── hooks/            # Reusable React logic
├── utils/            # Helper functions
└── styles/           # CSS files

supabase/
└── migrations/       # Database schema changes
```

---

## 🎯 FAST DEBUG TEMPLATES

### **Template 1: Button Not Working**

```
🚨 ISSUE: [Button Name] doesn't work when clicked

📍 WHERE: [Page name - e.g., "Add Product Modal"]

🔴 ERROR IN CONSOLE:
[Paste console error here]

📄 RELEVANT CODE:
[Paste the onClick function code]

🤔 WHAT I EXPECTED:
[e.g., "Product should be added to database"]

😞 WHAT ACTUALLY HAPPENED:
[e.g., "Nothing happens, modal stays open"]
```

### **Template 2: Data Not Saving**

```
🚨 ISSUE: Data not saving to database

📍 WHAT DATA: [e.g., "Product images", "User profile"]

🔴 ERROR IN CONSOLE:
[Paste console error]

📊 DATABASE CHECK:
[Go to Supabase Dashboard → Table Editor → Screenshot the table]

📄 CODE THAT SAVES:
[Paste the save function code]
```

### **Template 3: Something Disappeared**

```
🚨 ISSUE: [What disappeared - e.g., "Product images"]

⏰ WHEN: [e.g., "After 2 hours", "After page refresh"]

✅ WORKED BEFORE: [Yes/No - when did it last work?]

🔍 STILL IN DATABASE?
[Check Supabase Table Editor - Yes/No]

📄 CODE THAT DISPLAYS IT:
[Paste the display code]
```

---

## 🚀 ULTIMATE QUICK FIX COMMAND

**When EVERYTHING is broken and you need to send me ALL the code:**

```bash
#!/bin/bash
# Run this to create a bug report package

echo "🔧 Creating Emergency Bug Fix Package..."

# Create directory
mkdir -p ~/bug-report-$(date +%Y%m%d-%H%M)
cd ~/bug-report-$(date +%Y%m%d-%H%M)

# Copy key files
cp /home/ekhator1/smartstock-v2/src/App.jsx ./
cp /home/ekhator1/smartstock-v2/src/lib/supabase.js ./
cp /home/ekhator1/smartstock-v2/src/contexts/AuthContext.jsx ./
cp /home/ekhator1/smartstock-v2/.env.local ./
cp -r /home/ekhator1/smartstock-v2/src/services ./
cp -r /home/ekhator1/smartstock-v2/src/components ./

# Create summary
cat > ISSUE.txt <<EOF
🚨 BUG REPORT - $(date)

WHAT'S BROKEN:
[Describe the issue here]

BROWSER CONSOLE ERRORS:
[Paste console errors here]

STEPS TO REPRODUCE:
1.
2.
3.

EXPECTED BEHAVIOR:
[What should happen]

ACTUAL BEHAVIOR:
[What actually happens]

ENVIRONMENT:
- Browser: [Chrome/Safari/etc.]
- Device: [Desktop/Mobile]
- User Role: [Owner/Staff/Customer]
EOF

echo "✅ Bug report created at: $(pwd)"
echo "📦 Send this entire folder to Claude Code"
```

Save this as `create-bug-report.sh`, then:

```bash
chmod +x create-bug-report.sh
./create-bug-report.sh
```

---

## 💡 PRO TIPS

### **1. Use GitHub (Seriously, Do It)**

```bash
# One-time setup (10 minutes)
# Benefits forever:
- I can read your ENTIRE codebase in 5 seconds
- You have automatic backups
- Easy rollback if I break something
- Industry standard for sharing code
```

### **2. Keep a "Last Known Good" Version**

```bash
# When app is working perfectly:
git tag working-version-$(date +%Y%m%d)
git push --tags

# When something breaks:
git reset --hard working-version-20250118
```

### **3. Enable Supabase Logs**

```
Go to Supabase Dashboard → Logs → Enable all logs
When bug happens, send me the logs
They show EXACT database errors
```

---

## 🎯 THE ABSOLUTE FASTEST WAY

**Just send me these 3 things:**

1. **What broke:** "Add Product button doesn't work"

2. **Console error:** (Press F12, copy red text)
   ```
   TypeError: Cannot read property 'uid' of undefined
   ```

3. **The file where it broke:**
   ```bash
   cat src/App.jsx | grep -A 20 "handleAddProduct"
   ```

I can fix 90% of bugs with just this! 🎯

---

## 📞 EMERGENCY CONTACT FLOW

```
MINOR BUG (UI looks weird, button misplaced):
└─ Fix yourself using console.log debugging
   └─ If stuck after 30 mins → Message me with Template above

MAJOR BUG (Feature broken, data not saving):
└─ Message me immediately with:
   - What's broken
   - Console error
   - Relevant file (use commands above)

CRITICAL BUG (Can't login, database down, payment broken):
└─ Message me RIGHT NOW
   └─ I'll guide you live
   └─ Implement workaround first (disable feature)
   └─ Fix properly together
```

---

## ✅ CHECKLIST: Am I Ready?

- [ ] I know how to open Browser Console (F12)
- [ ] I can copy console errors
- [ ] I know which file handles what (use Component Map above)
- [ ] I saved the quick commands above
- [ ] I have GitHub set up OR know how to zip my code
- [ ] I have Supabase Dashboard bookmarked
- [ ] I tested this guide by sending myself a fake bug report

---

**YOU'RE READY! 🚀**

When something breaks, use this guide and I'll fix it FAST!
