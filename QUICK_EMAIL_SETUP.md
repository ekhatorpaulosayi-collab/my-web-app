# ⚡ Quick Email Setup (2 Minutes!)

## 🎯 What You Need to Do (Only 3 Things!)

### **Thing 1: Configure SMTP in Supabase** (2 minutes)

This is the ONLY thing you must do manually (can't be automated).

1. **Go to:** https://supabase.com/dashboard
2. **Select project:** smartstock (yzlniqwzqlsftxrtapdl)
3. **Click:** Project Settings (gear icon) → Auth
4. **Scroll down to:** "SMTP Settings"
5. **Toggle ON:** "Enable Custom SMTP"
6. **Copy-paste these values:**

```
Host:           smtp.resend.com
Port:           587
Username:       resend
Password:       re_XPVQSN5h_LiRBx7v2HE7uUQWTswAKavrN
Sender email:   noreply@storehouse.app
Sender name:    Storehouse
```

7. **Click Save** ✅

---

### **Thing 2: Run SQL Script** (30 seconds)

This configures redirect URLs automatically.

1. **Stay in Supabase dashboard**
2. **Click:** SQL Editor (in left sidebar)
3. **Click:** "New Query" button
4. **Copy the entire content** of the file: `configure-email.sql`
5. **Paste it** into the SQL editor
6. **Click "Run"** or press Ctrl+Enter

**Expected result:**
```
✓ Success. Rows affected: 2
```

Then scroll down and you'll see verification results showing your settings.

---

### **Thing 3: Update Email Templates** (1 minute)

This fixes the password reset links.

1. **Still in Supabase dashboard**
2. **Click:** Authentication → Email Templates (in left sidebar)

3. **For "Confirm signup" template:**
   - Click on it
   - Find the line that looks like: `<a href="{{ .ConfirmationURL }}">`
   - Replace `{{ .ConfirmationURL }}` with:
     ```
     {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/
     ```
   - Click Save

4. **For "Reset Password" template:**
   - Click on it
   - Find the line that looks like: `<a href="{{ .ConfirmationURL }}">`
   - Replace `{{ .ConfirmationURL }}` with:
     ```
     {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/
     ```
   - Click Save

---

## 🧪 Test It (1 minute)

1. **Go to:** http://localhost:4000/forgot-password
2. **Enter your email** and click "Reset Password"
3. **Check your email inbox**
4. **Click the reset link**
5. **Set a new password**
6. **Login with new password** ✅

---

## 📋 Copy-Paste Cheat Sheet

### SMTP Settings (for Thing 1):
```
Host: smtp.resend.com
Port: 587
Username: resend
Password: re_XPVQSN5h_LiRBx7v2HE7uUQWTswAKavrN
Sender email: noreply@storehouse.app
Sender name: Storehouse
```

### Signup Template URL (for Thing 3):
```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/
```

### Password Reset Template URL (for Thing 3):
```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/
```

---

## 🚨 If Something Goes Wrong

### "SQL script failed"
- Make sure you're in the SQL Editor (not table editor)
- Make sure you pasted the entire script
- Try running just the verification query at the bottom

### "SMTP settings won't save"
- Check your API key is correct
- Make sure "Enable Custom SMTP" toggle is ON
- Refresh the page and try again

### "Email still not arriving"
- Check spam folder
- Wait 1-2 minutes (first email can be slow)
- Check Resend dashboard: https://resend.com/emails
- Look for errors in Error Monitoring: http://localhost:4000/admin/monitoring

---

## ✅ Success Checklist

After completing all 3 things:

- [ ] SMTP settings saved in Supabase
- [ ] SQL script ran successfully
- [ ] Email templates updated with new URLs
- [ ] Test password reset worked
- [ ] Email arrived in inbox
- [ ] New password works for login

---

## 🎉 You're Done!

Your email system now:
- ✅ Sends emails reliably (no more spam folder)
- ✅ Password reset works perfectly
- ✅ Professional sender address
- ✅ 3,000 free emails per month
- ✅ Tracked in Error Monitoring Dashboard

**Time spent:** ~5 minutes
**Value gained:** Priceless 😊

---

## 💡 Optional: Disable Email Confirmation

If you want users to login immediately without waiting for email:

1. **In Supabase:** Authentication → Settings
2. **Find:** "Enable email confirmations"
3. **Toggle OFF**
4. **Save**

Users can now sign up and login instantly (no email needed).

**Recommendation:** Keep it disabled for now, enable later when everything works smoothly.

---

**Need help?** Just ask me:
- "How do I find the SQL Editor?"
- "Where is the SMTP settings?"
- "Template update didn't work"
- "Email still not arriving"

I'm here to help! 🚀
