/**
 * STAFF MANAGEMENT MICRO-CHUNKS
 * ==================================
 * Focused documentation chunks for RAG retrieval about staff features.
 * Based on ACTUAL Storehouse implementation (not aspirational).
 *
 * Files referenced:
 * - src/pages/StaffManagement.tsx
 * - src/contexts/StaffContext.tsx
 * - src/components/StaffPinLogin.tsx
 * - src/services/staffService.ts
 *
 * Last verified: 2026-03-10
 */

export const staffMicroChunks = [
  // ============================================
  // CHUNK 1: How to Add Staff Members
  // ============================================
  {
    id: 'staff-add-member',
    title: 'How to Add Staff Members',
    keywords: [
      'add staff', 'create staff', 'new staff', 'add employee', 'staff member',
      'how to add staff', 'add cashier', 'add manager', 'create staff account',
      'setup staff', 'staff registration', 'register staff', 'new employee',
      'add team member', 'staff setup'
    ],
    content: `## How to Add Staff Members

Give employees secure access to Storehouse without sharing your password.

---

## Step-by-Step: Add Staff

**Step 1: Open Staff Management**
1. Tap **More** button (bottom navigation)
2. Tap **Manage Staff**
3. Tap **Add Staff** button (green button, top right)

**Step 2: Fill in Staff Details**

You'll see a form with these fields:

**Name (Required)**
- Enter staff member's full name
- Example: "Tunde Balogun"

**Phone (Optional)**
- Enter their mobile number
- Example: "080 1234 5678"
- Used for contact purposes only

**Email (Optional)**
- Enter their email address
- Example: "tunde@example.com"

**PIN Code (Required)**
- Create a 4-6 digit PIN code
- Staff uses this to log in
- Example: "1234" or "123456"
- Important: Remember this PIN - staff will need it!

**Role (Required)**
- Choose **Manager** or **Cashier**

**Step 3: Save**
- Tap **Add Staff** button at bottom
- Staff account is created immediately
- Share the PIN with your staff member

---

## Staff Roles Explained

**Manager Role:**
✅ Record sales
✅ Add new products
✅ View reports
❌ Cannot manage staff (owner only)
❌ Cannot access settings (owner only)

**Cashier Role:**
✅ Record sales
✅ Add products
❌ Limited report access
❌ Cannot manage staff
❌ Cannot access settings

---

## Example

**Adding a Cashier:**

Name: Tunde Balogun
Phone: 0901 234 5678
Email: (leave blank)
PIN: 1234
Role: Cashier

Tap "Add Staff" ✅

Now share PIN "1234" with Tunde so he can log in!

---

## Important Notes

- PIN must be 4-6 digits (numbers only)
- Keep PINs secure
- Only owner can add staff
- Staff members cannot add other staff
- You can add unlimited staff members

---

## What Staff Can See

After login, staff can:
- Record sales
- View product inventory
- Add products
- Send WhatsApp receipts

Staff CANNOT:
- See your owner password
- Add or remove other staff
- Change business settings
- Delete the business

---

## Next Steps

After adding staff:
1. Share the PIN with them
2. Show them how to use Staff Mode (see "How Staff Logs In" guide)
3. Monitor their activity on dashboard`
  },

  // ============================================
  // CHUNK 2: How Staff Logs In (Staff Mode)
  // ============================================
  {
    id: 'staff-mode-login',
    title: 'How Staff Logs In (Staff Mode)',
    keywords: [
      'staff login', 'staff mode', 'how staff login', 'staff pin', 'staff access',
      'enter staff mode', 'login as staff', 'staff authentication', 'staff pin login',
      'how do staff login', 'staff sign in', 'employee login', 'pin login',
      'staff mode entry', 'switch to staff mode', 'activate staff mode'
    ],
    content: `## How Staff Logs In (Staff Mode)

Staff members log in using a simple PIN code - NO password needed!

---

## ⚠️ IMPORTANT: Two Login Methods

**Owner Login:**
- Email + Password
- Used by you (the business owner)
- Full access to everything

**Staff Mode:**
- PIN code only (4-6 digits)
- Used by employees
- Limited access based on role

This guide is for STAFF MODE login.

---

## Step-by-Step: Staff Login

**Step 1: Owner Logs In First**
- Staff Mode requires owner to log in first
- Staff cannot use the app without owner login active

**Step 2: Open Staff Mode**
1. Owner taps **More** button (bottom navigation)
2. Tap **Staff Mode** button
3. PIN pad opens

**Step 3: Enter PIN**
- Staff types their 4-6 digit PIN
- Example: 1234
- Can use on-screen keypad or physical keyboard
- Dots appear as you type (•••••)

**Step 4: Tap Login**
- If PIN is correct: Staff is logged in! ✅
- If PIN is wrong: "Invalid PIN" error appears

---

## What the PIN Pad Looks Like

Beautiful number pad with:
- Large buttons (1-9, 0)
- Clear button (reset PIN entry)
- Delete button (remove last digit)
- Login button (green when 4+ digits entered)

**Visual Feedback:**
- Dots fill up as you type
- Up to 6 dots shown
- Green login button activates when 4+ digits

---

## After Successful Login

Staff Mode is now active:
- Staff name shows in dashboard header
- Access based on role (Manager or Cashier)
- "Exit Staff Mode" button appears in More menu
- Owner can still monitor everything

---

## Exit Staff Mode

When staff shift ends:
1. Tap **More** button
2. Tap **Exit Staff Mode**
3. Back to owner mode

---

## Common Issues & Solutions

**Problem 1: "Invalid PIN" Error**
Solution:
- Verify PIN is correct
- Check if staff account is active
- Owner can reset PIN from Manage Staff page

**Problem 2: Can't Find Staff Mode Button**
Solution:
- Only OWNER sees this button
- Staff cannot open Staff Mode themselves
- Owner must log in first

**Problem 3: Staff Forgot PIN**
Solution:
- Owner goes to More → Manage Staff
- Click staff member's name
- Click "Reset PIN" button
- Enter new 4-6 digit PIN
- Share new PIN with staff

**Problem 4: PIN Not Working After Reset**
Solution:
- Make sure owner saved the new PIN
- Try logging out owner and logging back in
- Check if staff account is still active (not deactivated)

---

## Security Features

✅ PIN is hashed (secure storage)
✅ Owner can reset PINs anytime
✅ Owner can deactivate staff immediately
✅ Each staff member has unique PIN
✅ Activity is tracked by staff member

---

## Best Practices

✅ Use unique PINs for each staff member
✅ Change PINs every 3 months
✅ Don't share owner password with staff
✅ Deactivate staff when they quit
✅ Monitor staff activity regularly

❌ Don't use same PIN for everyone
❌ Don't write PINs down publicly
❌ Don't share owner login credentials`
  },

  // ============================================
  // CHUNK 3: Manage Existing Staff
  // ============================================
  {
    id: 'staff-manage-existing',
    title: 'Manage Existing Staff (Deactivate, Reset PIN)',
    keywords: [
      'manage staff', 'deactivate staff', 'reset pin', 'remove staff', 'delete staff',
      'staff management', 'reset staff pin', 'change pin', 'staff forgot pin',
      'deactivate employee', 'remove employee', 'edit staff', 'modify staff',
      'staff settings', 'update staff', 'reactivate staff'
    ],
    content: `## Manage Existing Staff

View all staff members and update their accounts.

---

## View All Staff

**Step 1: Open Staff Management**
1. Tap **More** button
2. Tap **Manage Staff**

**What You'll See:**

**Active Staff Section:**
- Shows all active staff members
- Staff name and role badge
- Phone and email (if provided)
- Last login time

**Inactive Staff Section:**
- Shows deactivated staff (if any)
- Same information but grayed out

---

## Staff Management Options

For each staff member, you can:

**1. Reset PIN**
**2. Deactivate Staff**
**3. Reactivate Staff** (if deactivated)

---

## How to Reset PIN

When staff forgets their PIN or you want to change it:

**Step 1:** Find staff member in list
**Step 2:** Tap **Reset PIN** button
**Step 3:** Enter new 4-6 digit PIN
**Step 4:** Tap **Reset PIN** button to confirm
**Step 5:** Share new PIN with staff member

**Example:**

Old PIN: 1234
New PIN: 5678

Staff member now uses "5678" to log in.

---

## How to Deactivate Staff

When someone quits or you want to temporarily block access:

**Step 1:** Find staff member in list
**Step 2:** Tap **Deactivate** button
**Step 3:** Confirm deactivation

**What Happens:**
- Staff can no longer log in with their PIN
- Their past sales remain in system
- You can reactivate them anytime

**Example Scenario:**

Tunde quit his job today.
1. Go to Manage Staff
2. Find "Tunde Balogun"
3. Tap "Deactivate"
4. Confirm

Tunde's PIN no longer works. ✅

---

## How to Reactivate Staff

If you deactivated someone and want to restore access:

**Step 1:** Scroll to "Inactive Staff" section
**Step 2:** Find the staff member
**Step 3:** Tap **Activate** button
**Step 4:** Confirm activation

Their PIN now works again!

---

## Staff Dashboard Overview

The Manage Staff page shows:

**Statistics Cards:**
- Total Staff (all active + inactive)
- Active Managers count
- Active Cashiers count

**Active Staff List:**
- Each staff member shown as card
- Name with role badge (Manager/Cashier)
- Contact info (phone, email)
- Last login date and time
- Action buttons (Reset PIN, Deactivate)

---

## Common Scenarios

**Scenario 1: Staff Forgot PIN**
→ Reset their PIN
→ Share new PIN with them

**Scenario 2: Staff Member Quit**
→ Deactivate their account immediately
→ Their historical sales remain

**Scenario 3: Part-Time Staff Returning**
→ Reactivate their account
→ Their old PIN still works

**Scenario 4: Suspicious Activity**
→ Deactivate staff immediately
→ Review their sales history
→ Reset PIN before reactivating

---

## What You CANNOT Do

❌ Edit staff name after creation
❌ Change staff role (Manager ↔ Cashier)
❌ View detailed activity logs (not implemented)
❌ Export staff performance reports (not implemented)
❌ Set custom permissions per staff (roles are fixed)

If you need to change role:
1. Deactivate old account
2. Create new account with correct role

---

## Important Notes

- Only OWNER can manage staff
- Managers and Cashiers cannot manage staff
- Deactivation is immediate (takes effect instantly)
- Reactivation is instant too
- No limit on number of staff members
- Staff sales history is preserved forever`
  },

  // ============================================
  // CHUNK 4: Staff Roles & Permissions
  // ============================================
  {
    id: 'staff-roles-permissions',
    title: 'Staff Roles and Permissions Explained',
    keywords: [
      'staff roles', 'staff permissions', 'manager role', 'cashier role', 'what can staff do',
      'staff access', 'role permissions', 'manager permissions', 'cashier permissions',
      'staff capabilities', 'what manager can do', 'what cashier can do',
      'role differences', 'staff restrictions', 'staff limits'
    ],
    content: `## Staff Roles & Permissions

Understand what each role can and cannot do in Storehouse.

---

## Three User Types

**1. Owner (You)**
- Full access to everything
- Can manage staff
- Can change settings
- Can view all reports

**2. Manager**
- Almost full access
- Can record sales & add products
- Can view reports
- CANNOT manage staff or settings

**3. Cashier**
- Basic access
- Can record sales
- Can add products
- Limited reporting access

---

## Detailed Permission Breakdown

**Owner Permissions:**

✅ Record sales
✅ Add/edit/delete products
✅ View all reports (Money & Profits, Dashboard, Analytics)
✅ Manage staff (add, deactivate, reset PINs)
✅ Access settings (business info, subscription, etc.)
✅ Track customer debts
✅ Create invoices
✅ Send WhatsApp receipts
✅ View sales history
✅ Everything!

---

**Manager Permissions:**

✅ Record sales
✅ Add products
✅ Edit products
✅ Delete products
✅ View reports (Dashboard, sales charts)
✅ Track customer debts
✅ Send WhatsApp receipts

❌ CANNOT manage staff
❌ CANNOT access settings
❌ CANNOT change subscription
❌ CANNOT see owner password

**Use Case:** Trusted employee who helps run the store

---

**Cashier Permissions:**

✅ Record sales
✅ Add products
✅ Edit products
✅ Delete products
✅ Send WhatsApp receipts

❌ CANNOT view financial reports
❌ CANNOT manage staff
❌ CANNOT access settings
❌ CANNOT track customer debts

**Use Case:** Front-line employee who handles customer transactions

---

## Simplified Permission Model

In the current Storehouse implementation:
- ALL staff (Manager & Cashier) can add/edit/delete products
- Permissions are simplified for better user experience
- Main difference is reporting access

---

## What EVERYONE Can Do

These features are available to Owner, Manager, AND Cashier:

- Record Sales
- Add Products
- Edit Products
- Delete Products
- View Product Inventory
- Search Products
- Send WhatsApp Receipts

---

## What Only MANAGERS Can Do (vs Cashier)

- View Money & Profits report
- Access Dashboard analytics
- Track customer credit/debts

---

## What Only OWNER Can Do

- Add/Remove Staff
- Reset Staff PINs
- Deactivate/Activate Staff
- Access Settings page
- Change business name/info
- Manage subscription
- Delete business

---

## Choosing the Right Role

**When to make someone a Manager:**
- They're your trusted assistant
- They help with stock management
- They need to see sales reports
- They handle customer credit

**When to make someone a Cashier:**
- They only handle sales
- They're new/temporary staff
- You want limited access
- Part-time employees

---

## Changing Roles

**Current Limitation:**
- You CANNOT change role after creation
- If you need to change role:
  1. Deactivate old account
  2. Create new account with correct role
  3. Use same name and PIN

---

## Security Best Practices

✅ Start new staff as Cashier
✅ Promote to Manager after trust is built
✅ Only give Manager role to trusted employees
✅ Regularly review who has Manager access
✅ Deactivate staff immediately when they quit

❌ Don't make everyone a Manager
❌ Don't share owner password
❌ Don't ignore suspicious activity`
  },

  // ============================================
  // CHUNK 5: Staff Mode vs Owner Mode
  // ============================================
  {
    id: 'staff-vs-owner-mode',
    title: 'Staff Mode vs Owner Mode (Understanding the Difference)',
    keywords: [
      'staff mode', 'owner mode', 'difference', 'staff vs owner', 'what is staff mode',
      'owner login', 'staff login', 'mode difference', 'switch mode',
      'exit staff mode', 'owner access', 'staff access', 'login types'
    ],
    content: `## Staff Mode vs Owner Mode

Understand the two ways to access Storehouse.

---

## Two Access Modes

**Owner Mode (Default)**
- Full business access
- Login: Email + Password
- You (the business owner)

**Staff Mode**
- Limited business access
- Login: 4-6 digit PIN
- Your employees

---

## How Owner Mode Works

**Login Method:**
- Email address
- Password (8+ characters)
- Same as when you registered

**What You Get:**
- Full access to everything
- All features unlocked
- Can manage staff
- Can change settings
- See all financial data

**Who Uses This:**
- You (business owner)
- Only you have the password

---

## How Staff Mode Works

**Login Method:**
- 4-6 digit PIN only
- No email or password needed
- Owner must be logged in first

**What Staff Get:**
- Limited access (based on role)
- Can record sales
- Can add products
- Cannot manage staff
- Cannot see owner password

**Who Uses This:**
- Your employees
- Cashiers
- Managers
- Store assistants

---

## Key Differences

**Owner Mode:**
- Email + Password
- Permanent access
- Full control
- Can delete business
- Independent login

**Staff Mode:**
- PIN only
- Temporary access
- Limited control
- Cannot delete anything critical
- Requires owner login first

---

## How to Switch Modes

**Entering Staff Mode:**
1. Owner logs in first (Email + Password)
2. Tap **More** → **Staff Mode**
3. Staff enters their PIN
4. Now in Staff Mode ✅

**Exiting Staff Mode:**
1. Tap **More** → **Exit Staff Mode**
2. Back to Owner Mode ✅

---

## Visual Indicators

**In Owner Mode:**
- "More" menu shows "Staff Mode" button
- Full navigation menu
- All features visible

**In Staff Mode:**
- Staff name shows in header
- "More" menu shows "Exit Staff Mode" button
- Limited navigation menu
- Some features hidden

---

## Common Questions

**Q: Can staff log in without owner logged in first?**
A: No. Owner must log in first, then activate Staff Mode.

**Q: Does staff have their own account?**
A: No. Staff uses owner's logged-in session with limited access.

**Q: Can owner and staff be logged in at same time?**
A: Yes! Owner can log in on their device, and staff can use Staff Mode on store device.

**Q: What happens if owner logs out while staff is in Staff Mode?**
A: Staff Mode ends. Staff must wait for owner to log back in.

**Q: Can staff see owner password?**
A: NO. Staff only use PIN. They never see or need owner password.

---

## Best Practices

✅ Owner keeps main device with full access
✅ Staff uses separate device in Staff Mode
✅ Exit Staff Mode at end of each shift
✅ Don't share owner password with staff

❌ Don't give owner password to staff
❌ Don't let staff use owner email to log in
❌ Don't stay in Staff Mode 24/7`
  },

  // ============================================
  // CHUNK 6: Staff Setup Checklist
  // ============================================
  {
    id: 'staff-setup-checklist',
    title: 'Staff Setup Checklist (Quick Start)',
    keywords: [
      'staff setup', 'setup staff', 'staff quick start', 'staff checklist',
      'getting started with staff', 'staff onboarding', 'new staff setup',
      'staff configuration', 'staff guide', 'staff walkthrough'
    ],
    content: `## Staff Setup Checklist

Complete guide to set up staff management in Storehouse.

---

## Prerequisites

Before adding staff, you need:
- ✅ Active Storehouse account
- ✅ Logged in as owner
- ✅ Employees ready to use the system

---

## Setup Steps

### STEP 1: Add Your First Staff Member

1. Tap **More** button
2. Tap **Manage Staff**
3. Tap **Add Staff** (green button)
4. Fill in details:
   - Name: Staff member's full name
   - Phone: (optional) Contact number
   - Email: (optional) Email address
   - PIN: 4-6 digit number (e.g., "1234")
   - Role: Choose Manager or Cashier
5. Tap **Add Staff** to save

**Result:** Staff account created! ✅

---

### STEP 2: Share PIN with Staff

1. Write down the PIN you created
2. Tell your staff member: "Your PIN is 1234"
3. Remind them: "Don't share your PIN with others"

**Important:** Staff MUST know their PIN to log in!

---

### STEP 3: Show Staff How to Log In

Walk through these steps with your staff:

1. Owner logs into Storehouse (Email + Password)
2. Tap **More** button
3. Tap **Staff Mode**
4. Staff enters their PIN (1234)
5. Tap **Login**

**Result:** Staff is logged in! ✅

---

### STEP 4: Test Staff Access

Have staff try these tasks:

**For Cashier:**
- ✅ Record a test sale
- ✅ View product list
- ✅ Search for products

**For Manager:**
- ✅ Record a test sale
- ✅ Add a test product
- ✅ View Dashboard

If staff can do these, setup is complete! ✅

---

### STEP 5: Show Exit Staff Mode

At end of shift:
1. Tap **More** button
2. Tap **Exit Staff Mode**
3. Back to owner mode

---

## Example: Complete Setup

**Scenario:** Adding Tunde as Cashier

**Step 1: Add Staff**
- Name: Tunde Balogun
- Phone: 080 1234 5678
- PIN: 1234
- Role: Cashier
- Tap "Add Staff"

**Step 2: Share PIN**
- Tell Tunde: "Your PIN is 1234"

**Step 3: Show Login**
- Owner logs in
- Tap More → Staff Mode
- Tunde enters 1234
- Tunde is logged in ✅

**Step 4: Test**
- Tunde records test sale
- Works! ✅

**Step 5: Exit**
- Tap More → Exit Staff Mode
- Done! ✅

---

## Troubleshooting Setup

**Problem: Can't find Staff Mode button**
- Make sure you're logged in as owner
- Check More menu at bottom
- Only owner sees this button

**Problem: PIN not working**
- Verify PIN was saved correctly
- Check if staff account is active
- Try resetting PIN from Manage Staff page

**Problem: Staff can't do anything**
- Verify staff role is correct (Manager vs Cashier)
- Make sure they're logged in via Staff Mode
- Try logging out and logging back in

---

## After Setup

**Daily Routine:**
1. Owner logs in (morning)
2. Activate Staff Mode for employee
3. Staff enters PIN
4. Staff works all day
5. Exit Staff Mode (evening)
6. Owner reviews sales

**Weekly Tasks:**
- Review staff activity
- Check sales by staff (if needed)
- Update PINs if security concern

**Monthly Tasks:**
- Review active staff list
- Deactivate former employees
- Add new employees

---

## Quick Reference

**Add Staff:** More → Manage Staff → Add Staff
**Staff Login:** More → Staff Mode → Enter PIN
**Exit Staff Mode:** More → Exit Staff Mode
**Reset PIN:** More → Manage Staff → Reset PIN
**Deactivate:** More → Manage Staff → Deactivate

---

## Need Help?

**Common Questions:**
- "How do I add staff?" → See STEP 1 above
- "Staff forgot PIN" → Go to Manage Staff → Reset PIN
- "How does staff log in?" → See STEP 3 above
- "Can't find Staff Mode" → Only owner sees this button

**Still Stuck?**
Contact Storehouse support with:
- Screenshot of issue
- Staff member role (Manager/Cashier)
- Error message (if any)`
  }
];

// Export for use in documentation.ts or AI chat endpoint
export default staffMicroChunks;
