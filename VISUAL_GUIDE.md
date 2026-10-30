# 📸 Visual Step-by-Step Guide with Screenshots

## 🎯 Thing 1: Configure SMTP (The Only Manual Part)

### **Screen 1: Supabase Dashboard Home**

After logging in, you'll see:

```
┌──────────────────────────────────────────────────────┐
│ Supabase                                    [User] ▼ │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Your projects                                       │
│                                                      │
│  ┌─────────────────────────────────────┐            │
│  │ smartstock                          │            │
│  │ yzlniqwzqlsftxrtapdl               │            │
│  │ Europe West 2 (London)              │            │
│  │                                     │            │
│  │              [Open Project]  ◄─── Click this     │
│  └─────────────────────────────────────┘            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Action:** Click "Open Project" or click anywhere on the card

---

### **Screen 2: Project Dashboard (Left Sidebar)**

After opening the project:

```
┌────────────────┬─────────────────────────────────────┐
│ ≡ Menu         │  Project Dashboard                  │
├────────────────┤                                     │
│ Table Editor   │  Welcome to your project!           │
│ Authentication │                                     │
│ Storage        │  [Stats and graphs here]            │
│ SQL Editor     │                                     │
│ Database       │                                     │
│ Edge Functions │                                     │
│ Logs          │                                     │
│                │                                     │
│ ───────────   │                                     │
│ Project        │                                     │
│ Settings  ⚙️   │ ◄─── Scroll down and click this    │
│                │                                     │
└────────────────┴─────────────────────────────────────┘
```

**Action:** Scroll down the left sidebar, find "Project Settings" (gear icon), click it

---

### **Screen 3: Project Settings (Sub-menu)**

After clicking Project Settings:

```
┌────────────────┬─────────────────────────────────────┐
│ Project        │  General                            │
│ Settings       │                                     │
├────────────────┤  Project name: smartstock           │
│ General        │  Organization: ...                  │
│ Database       │                                     │
│ API            │                                     │
│ Auth      ◄────│── Click this                        │
│ Storage        │                                     │
│ Edge Functions │                                     │
│                │                                     │
└────────────────┴─────────────────────────────────────┘
```

**Action:** Click "Auth" in the sub-menu

---

### **Screen 4: Auth Settings Page**

You'll see a long page with many sections. Scroll down:

```
┌─────────────────────────────────────────────────────┐
│ Authentication Settings                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [General Settings section]                          │
│                                                     │
│ [External OAuth Providers section]                  │
│                                                     │
│ [Email Auth section]                                │
│                                                     │
│ ↓ Keep scrolling down ↓                            │
│                                                     │
│ ───────────────────────────────────────────────     │
│ SMTP Settings                    ◄── Stop here!     │
│ ───────────────────────────────────────────────     │
│                                                     │
│ Enable Custom SMTP      [OFF] ◄── Toggle this ON   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Action:**
1. Scroll down to "SMTP Settings" section
2. Toggle "Enable Custom SMTP" to ON

---

### **Screen 5: SMTP Form (After Toggling ON)**

After you toggle it ON, you'll see:

```
┌─────────────────────────────────────────────────────┐
│ SMTP Settings                                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Enable Custom SMTP      [ON] ✅                     │
│                                                     │
│ Host *                                              │
│ ┌─────────────────────────────────────────────┐   │
│ │ smtp.resend.com                            │   │ ◄── Paste this
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Port number *                                       │
│ ┌─────────────────────────────────────────────┐   │
│ │ 587                                        │   │ ◄── Type this
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Username (optional)                                 │
│ ┌─────────────────────────────────────────────┐   │
│ │ resend                                     │   │ ◄── Type this
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Password (optional)                                 │
│ ┌─────────────────────────────────────────────┐   │
│ │ YOUR_RESEND_API_KEY      │   │ ◄── Paste your API key
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Sender email *                                      │
│ ┌─────────────────────────────────────────────┐   │
│ │ noreply@storehouse.app                     │   │ ◄── Paste this
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Sender name                                         │
│ ┌─────────────────────────────────────────────┐   │
│ │ Storehouse                                 │   │ ◄── Type this
│ └─────────────────────────────────────────────┘   │
│                                                     │
│                              [Save] ◄── Click this │
└─────────────────────────────────────────────────────┘
```

**Action:** Fill all fields, then click "Save"

---

### **Screen 6: Success Message**

After clicking Save:

```
┌─────────────────────────────────────────────────────┐
│ ✓ Successfully updated settings                     │
└─────────────────────────────────────────────────────┘
```

**✅ Thing 1 DONE!** You've configured SMTP.

---

## 🎯 Thing 2: Run SQL Script

### **Screen 7: Find SQL Editor**

Go back to the left sidebar:

```
┌────────────────┬─────────────────────────────────────┐
│ ≡ Menu         │                                     │
├────────────────┤                                     │
│ Table Editor   │                                     │
│ Authentication │                                     │
│ Storage        │                                     │
│ SQL Editor  ◄──│── Click this                        │
│ Database       │                                     │
│                │                                     │
└────────────────┴─────────────────────────────────────┘
```

**Action:** Click "SQL Editor"

---

### **Screen 8: SQL Editor Page**

```
┌─────────────────────────────────────────────────────┐
│ SQL Editor                          [New query] ◄───│── Click this
├─────────────────────────────────────────────────────┤
│                                                     │
│ Quick start queries:                                │
│ • Create a table                                    │
│ • Insert data                                       │
│ • Select data                                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Action:** Click "New query" button (top right)

---

### **Screen 9: Empty Query Editor**

```
┌─────────────────────────────────────────────────────┐
│ Untitled Query                  [Run] [Save]        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1 │ ← Paste your SQL here                         │
│  2 │                                                │
│  3 │                                                │
│  4 │                                                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Action:**
1. Open the file: `configure-email.sql`
2. Copy ALL the content (Ctrl+A, Ctrl+C)
3. Paste it into the editor (Ctrl+V)
4. Click "Run" or press Ctrl+Enter

---

### **Screen 10: SQL Success**

After running:

```
┌─────────────────────────────────────────────────────┐
│ ✓ Success. 2 rows affected.                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Results:                                            │
│ ┌──────────────────────┬────────────────────────┐  │
│ │ parameter            │ value                  │  │
│ ├──────────────────────┼────────────────────────┤  │
│ │ redirect_urls        │ http://localhost:40... │  │
│ │ site_url            │ http://localhost:4000  │  │
│ └──────────────────────┴────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**✅ Thing 2 DONE!** URLs are configured.

---

## 🎯 Thing 3: Update Email Templates

### **Screen 11: Find Email Templates**

Go back to left sidebar:

```
┌────────────────┬─────────────────────────────────────┐
│ ≡ Menu         │                                     │
├────────────────┤                                     │
│ Table Editor   │                                     │
│ Authentication │ ◄── Click this                      │
│   Policies     │                                     │
│   Users        │                                     │
│   Email        │                                     │
│   Templates    │ ◄── Then click this                 │
│                │                                     │
└────────────────┴─────────────────────────────────────┘
```

**Action:**
1. Click "Authentication" (might expand a submenu)
2. Click "Email Templates"

---

### **Screen 12: Email Templates List**

```
┌─────────────────────────────────────────────────────┐
│ Email Templates                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ Confirm signup                     [Edit]  │◄──│── Click Edit
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ Invite user                        [Edit]  │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ Magic Link                         [Edit]  │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ Change Email Address               [Edit]  │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ Reset Password                     [Edit]  │◄──│── And this
│ └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Action:** Click "Edit" on "Confirm signup" first

---

### **Screen 13: Edit Template**

```
┌─────────────────────────────────────────────────────┐
│ Confirm signup                          [Save]      │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Subject:                                            │
│ ┌─────────────────────────────────────────────┐   │
│ │ Confirm Your Email                         │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Template (HTML):                                    │
│ ┌─────────────────────────────────────────────┐   │
│ │ <h2>Confirm your signup</h2>              │   │
│ │ <p>Follow this link to confirm:</p>       │   │
│ │ <p><a href="{{ .ConfirmationURL }}">      │◄──│── Find this line
│ │ Confirm your email</a></p>                │   │
│ │                                           │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Action:**
1. Find the line with `{{ .ConfirmationURL }}`
2. Replace ONLY `{{ .ConfirmationURL }}` with:
   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/
   ```
3. Should look like:
   ```html
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/">
   Confirm your email</a></p>
   ```
4. Click "Save"

---

Repeat the same for "Reset Password" template, but use:
```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/
```

---

**✅ Thing 3 DONE!** Templates are updated.

---

## 🎉 ALL DONE!

Now test it:
1. Go to: http://localhost:4000/forgot-password
2. Enter your email
3. Check inbox
4. Click reset link
5. Set new password
6. Login! ✅

---

**Questions?**
- "Can't find SQL Editor" → Look in left sidebar, might be under a submenu
- "SMTP won't save" → Check API key is correct, toggle is ON
- "Template confusing" → Just replace the URL part inside `href="..."`

You got this! 💪
