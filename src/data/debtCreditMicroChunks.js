/**
 * DEBT/CREDIT SALES MICRO-CHUNKS
 * =================================
 *
 * 10 focused chunks (50-120 lines each) replacing 3 scattered debt/credit guides
 * Each chunk answers ONE specific user query for better RAG retrieval
 *
 * COVERAGE:
 * - What is credit sale vs cash sale
 * - How to record credit sales
 * - When to give credit
 * - Viewing all debts
 * - Debt statuses (Open, Overdue, Partial, Paid)
 * - Recording payments
 * - Partial payments
 * - Sending reminders
 * - Managing overdue debts
 * - Best practices
 */

export const debtCreditMicroChunks = [

  // ============================================
  // CHUNK 1: What is Credit Sale
  // ============================================
  {
    id: 'credit-what-is-credit-sale',
    category: 'credit-sales',
    title: 'What is a Credit Sale?',
    subtitle: 'Understand credit vs cash sales',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 90,
    description: 'Learn the difference between cash and credit sales, and when customer debts are created.',
    content: `## What is a Credit Sale?

A **credit sale** is when a customer takes goods TODAY but pays LATER.

---

## Cash Sale vs Credit Sale

### 💵 Cash Sale (Paid Immediately)
- Customer pays NOW (cash, transfer, POS, card)
- Money is in your hand or bank account immediately
- No debt tracking needed
- **Example:** Customer buys rice for ₦30,000 and pays via bank transfer

### 📝 Credit Sale (Pay Later)
- Customer takes goods NOW
- Customer pays LATER (on agreed date)
- You track the debt in Storehouse
- **Example:** Customer buys rice for ₦30,000, promises to pay on Friday

---

## How Credit Sales Work

**Step 1:** Customer selects items
**Step 2:** You record the sale
**Step 3:** Toggle "Credit Sale" ON
**Step 4:** Customer takes goods without paying
**Step 5:** Debt is automatically created and tracked
**Step 6:** Customer pays later (full or partial)
**Step 7:** You record the payment
**Step 8:** Debt is marked as PAID ✅

---

## Real Nigerian Example

**Mama Nkechi's Scenario:**

Monday: Mama Nkechi buys 2 bags of rice (50kg each) = ₦60,000
She says: "Sister, I will pay on Friday when my husband returns"

You record:
- **Items:** Rice 50kg × 2 = ₦60,000
- **Credit Sale:** ON
- **Customer:** Mama Nkechi
- **Due Date:** Friday (3 days)

System creates:
- **Debt:** ₦60,000
- **Status:** Open (unpaid)
- **Due:** Friday

Friday: Mama Nkechi pays ₦60,000
You record payment → Debt status: PAID ✅

---

## Key Differences Summary

| Feature | Cash Sale | Credit Sale |
|---------|-----------|-------------|
| Payment | Immediate | Later |
| Debt Created | No | Yes |
| Customer Name | Optional | Required |
| Due Date | Not needed | Required |
| Track Payment | Not needed | Yes |
| Risk | No risk | Risk of non-payment |

---

## When Debt is Created

Debt is **automatically created** when you:
1. Record a sale
2. Toggle "Credit Sale" ON
3. Enter customer name
4. Set due date
5. Save the sale

→ Storehouse creates debt record immediately!

---

## Where to See Debts

**Dashboard:**
- "Customer Debts" card shows total outstanding

**Customers Page:**
- Each customer shows their debt balance
- Red text = overdue

**Individual Customer:**
- Click customer → See all their debts
- Open, Overdue, Partial, Paid statuses`,
    relatedDocs: ['credit-how-to-record', 'credit-when-to-use', 'credit-view-all-debts'],
    keywords: [
      'what is credit sale', 'credit vs cash', 'customer debt', 'owe money', 'pay later',
      'sell on credit', 'credit meaning', 'what is debt', 'customer owes', 'take goods pay later',
      'difference cash credit', 'when customer pays later', 'record debt', 'track debt'
    ],
    lastUpdated: '2026-03-10',
  },

  // ============================================
  // CHUNK 2: How to Record Credit Sale
  // ============================================
  {
    id: 'credit-how-to-record',
    category: 'credit-sales',
    title: 'How to Record a Credit Sale',
    subtitle: 'Step-by-step guide to recording debts',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 95,
    description: 'Complete walkthrough of recording a credit sale with customer debt tracking.',
    content: `## How to Record a Credit Sale

Follow these steps to record a sale where customer pays later.

---

## Step-by-Step Process

### Step 1: Open Record Sale Modal
- From dashboard or any page
- Click **"Record Sale"** button

### Step 2: Add Products to Cart
- Search for product
- Add quantity
- Click "Add to Cart"
- Repeat for all items

### Step 3: Enable Credit Sale
- Toggle **"Credit Sale"** switch to ON
- Form changes to show debt fields

### Step 4: Enter Customer Information
**Customer Name** (Required for credit sales)
- Type customer's name
- Example: "Mama Nkechi", "Brother Emeka"
- Existing customers show in dropdown

**Customer Phone** (Optional but recommended)
- For WhatsApp reminders
- Example: 08012345678

### Step 5: Set Due Date
- Click calendar icon
- Select date customer promises to pay
- Example: "5 days from now" = Friday

### Step 6: Select Payment Method
Choose "Credit" (or the method customer will use when they pay)

### Step 7: Review Sale Details
- Total amount: ₦60,000
- Customer: Mama Nkechi
- Due: Friday, 5 Dec 2025
- Credit Sale: YES

### Step 8: Complete Sale
- Click "Complete Sale"
- ✅ Sale recorded
- ✅ Stock reduced
- ✅ Debt created automatically

---

## What Happens After Recording

**Inventory:**
- Stock reduced immediately
- Products marked as sold

**Debt Created:**
- Customer name: Mama Nkechi
- Amount owed: ₦60,000
- Due date: 5 Dec 2025
- Status: Open (unpaid)

**Visible in:**
- Dashboard → Customer Debts
- Customers → Mama Nkechi → Debts tab
- Sales → Credit Sales filter

---

## Real Example

**Brother Emeka's Phone Shop Order:**

Items:
- iPhone 13 Pro × 1 = ₦450,000
- Airpods Pro × 1 = ₦85,000
- **Total:** ₦535,000

Recording:
1. Add iPhone 13 Pro to cart
2. Add Airpods Pro to cart
3. Toggle "Credit Sale" ON
4. Customer Name: "Brother Emeka"
5. Phone: 08098765432
6. Due Date: "15 Dec 2025" (2 weeks)
7. Payment Method: Transfer (when he pays)
8. Complete Sale

Result:
- ✅ 1 iPhone, 1 Airpods removed from stock
- ✅ Debt created: ₦535,000
- ✅ Brother Emeka owes ₦535,000
- ✅ Due: 15 Dec 2025

---

## Important Requirements for Credit Sales

**✅ Required Fields:**
- Customer name (MUST enter)
- Due date (MUST select)
- At least 1 product in cart

**❌ Cannot record credit sale without:**
- Customer name (who owes the money?)
- Due date (when will they pay?)

**💡 Recommended (not required):**
- Customer phone (for reminders)
- Customer address (for follow-up)

---

## After Recording

### View the Debt
1. Go to **Customers** page
2. Find "Brother Emeka"
3. Click his name
4. See **Debts** tab:
   - Amount: ₦535,000
   - Due: 15 Dec 2025
   - Status: Open

### Send Receipt
- WhatsApp receipt automatically shows:
  - Items sold
  - Total amount
  - "CREDIT SALE - Pay by 15 Dec 2025"

### Set Reminder
- System can send auto-reminder:
  - 2 days before due date
  - On due date
  - 1 day after due date`,
    relatedDocs: ['credit-what-is-credit-sale', 'credit-record-payment', 'credit-send-reminder'],
    keywords: [
      'how to record credit sale', 'record debt', 'customer debt', 'sell on credit',
      'enable credit sale', 'toggle credit', 'credit sale switch', 'due date', 'customer name required',
      'create debt', 'record credit transaction', 'pay later sale', 'credit sale steps'
    ],
    lastUpdated: '2026-03-10',
  },

  // ============================================
  // CHUNK 3: When to Give Credit
  // ============================================
  {
    id: 'credit-when-to-use',
    category: 'credit-sales',
    title: 'When to Give Credit to Customers',
    subtitle: 'Who deserves credit and who doesn\'t',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 85,
    description: 'Learn when it\'s safe to give credit and when to insist on cash payment.',
    content: `## When to Give Credit to Customers

Not every customer should get credit. Learn who qualifies.

---

## ✅ Give Credit To:

### 1. Trusted Regular Customers
- Buy from you consistently (monthly, weekly)
- Always paid in the past
- Known for 3+ months
- **Example:** Mama Nkechi (buys rice every month for 5 years)

### 2. Customers with Good Payment History
- Previously took goods on credit
- Paid on time or early
- No outstanding debts
- **Example:** Brother Emeka (paid last 3 credit orders on time)

### 3. B2B Customers (Business-to-Business)
- Registered companies
- Purchase orders (PO)
- Long-term contracts
- **Example:** XYZ Restaurant (bulk rice supplier for 2 years)

### 4. Referrals from Trusted Customers
- Recommended by regular customer
- Customer vouches for them
- Willing to guarantee payment
- **Example:** "Mama Nkechi's sister from Enugu"

### 5. Church/Community Members
- Same church, mosque, or community
- Social pressure to pay
- Easy to find if they default
- **Example:** "Brother from Winners Chapel"

---

## ❌ DO NOT Give Credit To:

### 1. New Customers
- First time buying
- Don't know their payment habits
- No track record
- **Rule:** "Cash for first 3 purchases"

### 2. Customers Who Already Owe
- Have unpaid debt
- Overdue payments
- Excuses every time
- **Rule:** "Pay old debt before new credit"

### 3. One-Time Buyers
- Passing through area
- Not regular customers
- Unlikely to return
- **Example:** Tourist, traveler

### 4. Unknown Customers
- No contact information
- No address
- No references
- Can't be traced

### 5. Customers with Bad Debt History
- Previously defaulted
- Paid very late (weeks, months)
- Made promises they didn't keep
- **Example:** "Disappeared for 6 months"

---

## Credit Amount Limits

Even trusted customers have limits:

| Customer Type | Max Credit | Why |
|---------------|------------|-----|
| Regular (3-6 months) | ₦50,000 - ₦100,000 | Building trust |
| Regular (1+ year) | ₦100,000 - ₦500,000 | Proven reliable |
| B2B Contract | ₦500,000 - ₦2,000,000 | Legal agreement |
| New customer | ₦0 | No credit yet |
| Overdue customer | ₦0 | Pay debt first |

---

## Real Nigerian Examples

### ✅ GIVE CREDIT

**Mama Nkechi (Rice Seller Customer):**
- Buys 2 bags every month for 5 years
- Always pays within 3 days
- Knows your shop location
- Has valid phone number
- **Credit Limit:** ₦200,000

**Brother Emeka (Phone Shop Customer):**
- Church member (same church 3 years)
- Buys phones for resale
- Paid last 10 orders on time
- Brings customers to your shop
- **Credit Limit:** ₦1,000,000

### ❌ DO NOT GIVE CREDIT

**New Customer (Walk-in):**
- First time at your shop
- Says "I'll pay tomorrow"
- No phone number
- No recommendation
- **Credit:** NO - Cash only

**Aunty Grace (Bad History):**
- Owes ₦80,000 for 3 months
- Avoids phone calls
- Makes excuses every week
- **Credit:** NO - Pay old debt first

---

## How to Say NO Politely

**When customer requests credit:**

"I understand, but our policy is:
- Cash for new customers
- Credit after 3 successful purchases
- Or pay 50% deposit now, balance later"

**When customer already owes:**

"I appreciate your business, but please:
- Pay the ₦80,000 balance first
- Then I can give you new items on credit
- Or pay 50% of old debt, I can help"

---

## Setting Credit Limits

**For each trusted customer:**

1. **Review payment history**
   - How many times bought on credit?
   - Did they pay on time?
   - Average order size?

2. **Set maximum limit**
   - Example: Mama Nkechi = ₦200,000 max
   - If she owes ₦150,000, only ₦50,000 more credit

3. **Track total debt per customer**
   - Dashboard shows "Total Owed"
   - Customers page shows balance
   - Stop credit when limit reached

---

## Best Practices

✅ **Start small** - ₦20,000 first credit, then increase
✅ **Get phone number** - WhatsApp reminders work
✅ **Set realistic due dates** - 3-7 days better than 30 days
✅ **Send reminders** - 2 days before, on due date
✅ **Track payment behavior** - Reward good payers with higher limits
✅ **Stop credit immediately** - When payment becomes late

---

## Warning Signs - Stop Credit!

🚫 Customer asks for credit extension every time
🚫 Pays in tiny amounts (₦1,000, ₦2,000)
🚫 Avoids phone calls near due date
🚫 Makes excuses ("bank network", "husband traveling")
🚫 Debt keeps growing (₦50k → ₦100k → ₦200k)

**Action:** STOP GIVING CREDIT until fully paid!`,
    relatedDocs: ['credit-what-is-credit-sale', 'credit-best-practices', 'credit-overdue-debts'],
    keywords: [
      'when to give credit', 'who gets credit', 'credit limit', 'trusted customers',
      'new customer credit', 'customer owes money', 'stop credit', 'credit policy',
      'regular customers', 'b2b credit', 'church members credit', 'who deserves credit',
      'say no to credit', 'credit amount limit', 'bad debt history'
    ],
    lastUpdated: '2026-03-10',
  },

  // ============================================
  // CHUNK 4: View All Debts
  // ============================================
  {
    id: 'credit-view-all-debts',
    category: 'credit-sales',
    title: 'Where to See All Customer Debts',
    subtitle: 'Find and track all money owed',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 90,
    description: 'Learn where to view all customer debts, filter by status, and see totals.',
    content: `## Where to See All Customer Debts

Storehouse shows customer debts in 3 main places.

---

## 1. Dashboard - Quick Overview

**Location:** Main dashboard (home page)

**What You See:**
- **"Customer Debts" Card**
  - Total amount owed: ₦1,250,000
  - Number of customers owing: 12
  - Overdue amount: ₦450,000 (in red)

**Example:**
\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━
💰 CUSTOMER DEBTS
━━━━━━━━━━━━━━━━━━━━━━━
Total Owed: ₦1,250,000
Customers: 12
Overdue: ₦450,000 🔴
━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`

---

## 2. Customers Page - All Debts List

**Location:** Sidebar → Customers

**What You See:**
- List of ALL customers
- Debt balance next to each name
- Overdue debts in RED

**Example:**
\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CUSTOMERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mama Nkechi       ₦60,000 🔴
Brother Emeka     ₦535,000
Sister Blessing   ₦0 (Paid)
Aunty Grace       ₦125,000 🔴
Mr. Johnson       ₦200,000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`

**Filter Options:**
- All Customers
- Customers with Debts
- Overdue Debts Only
- Paid Debts

---

## 3. Individual Customer View - Detailed Debts

**Location:** Customers → Click customer name → Debts tab

**What You See:**
- All debts for THIS customer
- Each debt shows:
  - Date created
  - Items sold
  - Amount owed
  - Due date
  - Status (Open, Overdue, Partial, Paid)
  - Payment history

**Example: Mama Nkechi's Debts**
\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MAMA NKECHI - DEBTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debt #1 - 1 Dec 2025
Rice 50kg × 2 = ₦60,000
Due: 5 Dec 2025
Status: OVERDUE 🔴
[Record Payment] [Send Reminder]

Debt #2 - 15 Nov 2025
Beans 25kg × 4 = ₦80,000
Due: 20 Nov 2025
Status: PAID ✅
Paid: 19 Nov 2025

Total Owed: ₦60,000
Payment History: 1 paid, 1 overdue
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`

---

## 4. Sales Page - Credit Sales Filter

**Location:** Sidebar → Sales → Filter → Credit Sales

**What You See:**
- All credit sales (where debt was created)
- Filter by date range
- See which sales are unpaid

---

## Filtering Debts

### By Status
- **Open** - Not yet paid, not overdue
- **Overdue** - Past due date, still unpaid 🔴
- **Partial** - Some payment received
- **Paid** - Fully settled ✅

### By Date
- This week
- This month
- Last 30 days
- Custom range

### By Amount
- Sort: Highest to lowest
- Sort: Lowest to highest

---

## Searching for Specific Debt

**Search by Customer Name:**
1. Go to Customers page
2. Type in search box: "Mama Nkechi"
3. Click her name
4. View all her debts

**Search by Date:**
1. Sales page
2. Filter → Credit Sales
3. Select date range
4. See all credit sales in period

---

## Understanding the Debt Summary

**Dashboard Summary Shows:**

**Total Owed:** ₦1,250,000
- All money owed by all customers
- Includes Open + Overdue + Partial

**Overdue Amount:** ₦450,000
- Only debts past due date
- Needs immediate follow-up 🔴

**Number of Customers:** 12
- How many customers owe money

---

## Quick Actions from Debt View

**From Customers Page:**
- Click customer → View all debts
- Click "Record Payment" → Take payment
- Click "Send Reminder" → WhatsApp reminder

**From Individual Debt:**
- View sale details (items, quantity, price)
- Record full payment
- Record partial payment
- Send payment reminder
- View payment history
- Cancel debt (if needed)

---

## Mobile vs Desktop View

**Mobile:**
- Dashboard card shows total owed
- Customers page shows list with balances
- Tap customer to see debts

**Desktop:**
- Same as mobile but larger view
- Can see more customers at once
- Debt details in sidebar

---

## Notifications

**Red Badges:**
- Dashboard icon shows overdue count
- Customers with overdue debts highlighted red

**Auto Alerts:**
- Debt due tomorrow (reminder)
- Debt overdue by 3 days (alert)
- Debt overdue by 7 days (urgent)`,
    relatedDocs: ['credit-debt-statuses', 'credit-record-payment', 'credit-overdue-debts'],
    keywords: [
      'view customer debts', 'see all debts', 'where are debts', 'customer owes',
      'debt list', 'total debt', 'overdue debts', 'find customer debt',
      'debt dashboard', 'customers page', 'debt balance', 'how much customers owe',
      'track debt', 'debt summary'
    ],
    lastUpdated: '2026-03-10',
  },

  // ============================================
  // CHUNK 5: Debt Statuses Explained
  // ============================================
  {
    id: 'credit-debt-statuses',
    category: 'credit-sales',
    title: 'Understanding Debt Statuses',
    subtitle: 'Open, Overdue, Partial, Paid explained',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 85,
    description: 'Learn what each debt status means and when debts change status.',
    content: `## Understanding Debt Statuses

Every debt has a status that shows payment progress.

---

## The 4 Debt Statuses

### 🔵 OPEN (Active, Not Yet Due)
**Meaning:**
- Customer owes money
- Due date has NOT passed yet
- No payment received yet
- Everything is normal

**Example:**
- Debt created: 1 Dec 2025
- Amount: ₦60,000
- Due date: 5 Dec 2025
- Today: 3 Dec 2025
- **Status: OPEN** (2 days until due)

**What to do:**
- Wait for payment
- Optional: Send reminder 1 day before due date

---

### 🔴 OVERDUE (Past Due Date)
**Meaning:**
- Customer owes money
- Due date HAS passed
- Still no payment received
- **Needs immediate follow-up!**

**Example:**
- Debt created: 1 Dec 2025
- Amount: ₦60,000
- Due date: 5 Dec 2025
- Today: 8 Dec 2025
- **Status: OVERDUE** (3 days late)

**What to do:**
- Send WhatsApp reminder immediately
- Phone call if no response
- Visit customer if possible
- Stop giving more credit

**How debt becomes OVERDUE:**
- Status changes automatically at midnight on due date
- Example: Due 5 Dec → 6 Dec at 12:01 AM = OVERDUE

---

### 🟡 PARTIAL (Some Payment Received)
**Meaning:**
- Customer paid SOME of the debt
- Balance still remaining
- May or may not be overdue

**Example:**
- Original debt: ₦60,000
- Payment received: ₦30,000
- Balance remaining: ₦30,000
- **Status: PARTIAL**

**What to do:**
- Thank customer for partial payment
- Remind them of remaining balance
- Set new due date for balance (optional)
- Record each payment as customer pays

**Payment History Shows:**
\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Original Debt: ₦60,000
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Payment 1: ₦30,000 (2 Dec)
Balance: ₦30,000
Status: PARTIAL 🟡
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Payment 2: ₦20,000 (4 Dec)
Balance: ₦10,000
Status: PARTIAL 🟡
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Payment 3: ₦10,000 (5 Dec)
Balance: ₦0
Status: PAID ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`

---

### ✅ PAID (Fully Settled)
**Meaning:**
- Customer paid FULL amount
- No balance remaining
- Debt is closed
- Customer can get credit again

**Example:**
- Original debt: ₦60,000
- Total paid: ₦60,000
- Balance: ₦0
- **Status: PAID ✅**

**What happens:**
- Debt record archived
- Customer's available credit restored
- Can give them credit again (if they qualify)

---

## Status Flow Diagram

\`\`\`
CREDIT SALE RECORDED
        ↓
    🔵 OPEN
        ↓
   (Due date passes)
        ↓
    🔴 OVERDUE ←──────┐
        ↓              │
  (Partial payment)    │
        ↓              │
    🟡 PARTIAL ────────┤
        ↓              │
  (More payments)      │
        ↓              │
  (Still not enough)───┘
        ↓
  (Full payment)
        ↓
    ✅ PAID
\`\`\`

---

## Real Nigerian Scenario

**Mama Nkechi's Debt Journey:**

**Monday, 1 Dec:**
- Buys rice: ₦60,000
- Due: Friday, 5 Dec
- Status: 🔵 OPEN

**Wednesday, 3 Dec:**
- Still not paid (2 days until due)
- Status: 🔵 OPEN
- Action: Send friendly reminder

**Friday, 5 Dec (Due Date):**
- Still not paid
- Status: 🔵 OPEN (until midnight)

**Saturday, 6 Dec:**
- Past due date!
- Status: 🔴 OVERDUE (automatic)
- Action: Send urgent reminder

**Sunday, 7 Dec:**
- Mama Nkechi pays ₦30,000
- Balance: ₦30,000
- Status: 🟡 PARTIAL
- Action: Thank her, remind ₦30k remaining

**Tuesday, 9 Dec:**
- Mama Nkechi pays ₦30,000
- Balance: ₦0
- Status: ✅ PAID
- Action: Thank her, she can get credit again

---

## How to Check Debt Status

**Method 1: Customers Page**
1. Sidebar → Customers
2. See customer list
3. Red text = Overdue
4. Black text with amount = Open or Partial
5. ₦0 or strikethrough = Paid

**Method 2: Individual Customer**
1. Click customer name
2. Debts tab
3. See status badge for each debt:
   - 🔵 OPEN
   - 🔴 OVERDUE
   - 🟡 PARTIAL
   - ✅ PAID

**Method 3: Dashboard**
1. "Customer Debts" card
2. Shows overdue count in red
3. Click to see all overdue debts

---

## Filter by Status

**Customers Page:**
- Filter: "All Customers"
- Filter: "Customers with Debts"
- Filter: "Overdue Only" (shows only 🔴)
- Filter: "Paid Debts" (shows only ✅)

---

## Automatic Status Changes

**System automatically changes status when:**

1. **Due date passes** → OPEN becomes OVERDUE
2. **Partial payment** → OPEN becomes PARTIAL
3. **Partial payment** → OVERDUE becomes PARTIAL (overdue)
4. **Full payment** → Any status becomes PAID

**You don't need to manually change status!**

---

## Status Notifications

**Dashboard Badges:**
- Red badge on Customers icon = Overdue count
- Example: "Customers (3)" = 3 overdue debts

**Email/WhatsApp Alerts (if enabled):**
- "Mama Nkechi's debt is now overdue"
- "Brother Emeka made partial payment"
- "Sister Blessing paid full debt"`,
    relatedDocs: ['credit-view-all-debts', 'credit-record-payment', 'credit-overdue-debts'],
    keywords: [
      'debt status', 'open debt', 'overdue debt', 'partial payment', 'paid debt',
      'debt statuses explained', 'what is overdue', 'what is partial', 'debt paid',
      'status meaning', 'debt colors', 'red debt', 'green debt', 'when debt overdue',
      'debt status changes', 'payment status'
    ],
    lastUpdated: '2026-03-10',
  },

  // ============================================
  // CHUNK 6: Record Payment (Customer Pays Back)
  // ============================================
  {
    id: 'credit-record-payment',
    category: 'credit-sales',
    title: 'How to Record Debt Payment',
    subtitle: 'Customer pays back money owed',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 95,
    description: 'Step-by-step guide to recording when customer pays their debt (full or partial).',
    content: `## How to Record Debt Payment

When customer pays money they owe, record it in Storehouse.

---

## When to Use This

Customer says:
- "I want to pay my debt"
- "Here is ₦30,000 from what I owe"
- "I'm paying the full ₦60,000"

You need to:
1. Accept the money
2. Record the payment in Storehouse
3. Update debt balance

---

## Step-by-Step: Record Full Payment

### Step 1: Find Customer's Debt
**Option A: From Customers Page**
1. Sidebar → Customers
2. Find customer (e.g., "Mama Nkechi")
3. See debt balance: ₦60,000 🔴

**Option B: From Dashboard**
1. Click "Customer Debts" card
2. See list of all debts
3. Find customer

### Step 2: Open Debt Details
- Click customer name
- Go to "Debts" tab
- See list of their debts

**Example:**
\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━
MAMA NKECHI - DEBTS
━━━━━━━━━━━━━━━━━━━━━━━
Debt #1
Rice 50kg × 2 = ₦60,000
Due: 5 Dec 2025
Status: OVERDUE 🔴
Balance: ₦60,000

[Record Payment] [Send Reminder]
━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`

### Step 3: Click "Record Payment"
Button appears next to debt

### Step 4: Enter Payment Details
**Amount Paid:**
- Type: ₦60,000 (full amount)
- Or less for partial payment

**Payment Method:**
- Cash
- Transfer
- POS
- Card
- Mobile Money

**Payment Date:**
- Usually today (auto-filled)
- Or select different date

**Payment Reference (Optional):**
- Transaction ID
- Receipt number
- Example: "TRF20251205ABC"

**Notes (Optional):**
- "Paid in full"
- "Customer brought cash"

### Step 5: Save Payment
- Click "Record Payment"
- ✅ Payment recorded!

---

## What Happens After Recording

**Debt Status:**
- If paid full amount → Status: PAID ✅
- If paid partial → Status: PARTIAL 🟡
- Balance updated automatically

**Customer's Total Debt:**
- Reduced by payment amount
- Example: Owed ₦200,000 → Paid ₦60,000 → Now owes ₦140,000

**Payment History:**
- Logged in customer's record
- Shows: Date, Amount, Method, Reference

**Receipt (Optional):**
- WhatsApp receipt can be sent
- Shows payment details
- "Thank you for payment!"

---

## Step-by-Step: Record Partial Payment

Same process, but customer pays LESS than full amount.

**Example: Mama Nkechi Pays ₦30,000 of ₦60,000 Debt**

### Step 1-3: Same as above (find debt, open details, click "Record Payment")

### Step 4: Enter Partial Amount
**Amount Paid:** ₦30,000 (not full ₦60,000)

System shows:
\`\`\`
━━━━━━━━━━━━━━━━━━━━━
Original Debt: ₦60,000
Payment: ₦30,000
Remaining: ₦30,000
━━━━━━━━━━━━━━━━━━━━━
\`\`\`

**Payment Method:** Transfer

**Notes:** "First installment, will pay balance Friday"

### Step 5: Save Payment
- Click "Record Payment"
- ✅ Partial payment recorded!

**Result:**
- Debt Status: PARTIAL 🟡
- Balance: ₦30,000 (reduced from ₦60,000)
- Customer can pay remaining later

---

## Recording Multiple Partial Payments

**Scenario: Mama Nkechi Pays in 3 Installments**

**Original Debt:** ₦60,000

**Payment 1: Monday**
- Amount: ₦20,000
- Balance: ₦40,000
- Status: PARTIAL 🟡

**Payment 2: Wednesday**
- Amount: ₦20,000
- Balance: ₦20,000
- Status: PARTIAL 🟡

**Payment 3: Friday**
- Amount: ₦20,000
- Balance: ₦0
- Status: PAID ✅

**All 3 payments logged in history!**

---

## Payment History View

**After recording payments:**

\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MAMA NKECHI - DEBT #1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Original Amount: ₦60,000

PAYMENT HISTORY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 2 Dec 2025
   Paid: ₦20,000 (Transfer)
   Balance: ₦40,000

2. 4 Dec 2025
   Paid: ₦20,000 (Cash)
   Balance: ₦20,000

3. 6 Dec 2025
   Paid: ₦20,000 (POS)
   Balance: ₦0 ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: PAID ✅
Total Paid: ₦60,000
\`\`\`

---

## Real Nigerian Business Example

**Brother Emeka's Phone Shop Debt:**

**Debt:**
- iPhone 13 Pro + Airpods = ₦535,000
- Due: 15 Dec 2025

**15 Dec 2025 - Partial Payment:**
1. Brother Emeka comes to shop
2. Says: "I have ₦300,000 now, balance next week"
3. You record:
   - Amount: ₦300,000
   - Method: Transfer
   - Notes: "Balance ₦235,000 due 22 Dec"
4. Send WhatsApp receipt
5. Debt Status: PARTIAL 🟡

**22 Dec 2025 - Final Payment:**
1. Brother Emeka pays remaining ₦235,000
2. You record:
   - Amount: ₦235,000
   - Method: Transfer
   - Notes: "Fully paid, thank you!"
3. Send WhatsApp receipt
4. Debt Status: PAID ✅

**Result:**
- Brother Emeka's debt cleared
- He can get credit again
- Good payment history recorded

---

## Tips for Recording Payments

✅ **Record immediately** - Don't wait, record when customer pays
✅ **Verify amount** - Count cash carefully or check transfer alert
✅ **Save payment method** - Helps with accounting later
✅ **Add reference number** - For bank transfers (proof)
✅ **Send receipt** - WhatsApp confirmation to customer
✅ **Thank customer** - Especially if paid on time or early!

---

## What If Customer Says They Paid But You Don't See It?

**Troubleshooting:**

1. **Check if payment was recorded:**
   - Customers → Find customer → Debts tab
   - Check payment history

2. **If not recorded:**
   - Payment might not have been saved
   - Record it now with correct date

3. **If customer claims they paid but didn't:**
   - Check payment history
   - Show them: "No payment recorded on that date"
   - Ask for transfer receipt/proof`,
    relatedDocs: ['credit-partial-payment', 'credit-debt-statuses', 'credit-view-all-debts'],
    keywords: [
      'record debt payment', 'customer paid debt', 'pay back debt', 'debt repayment',
      'how to record payment', 'customer pays', 'receive debt payment', 'partial payment',
      'full payment', 'debt balance', 'payment method', 'payment history',
      'mark debt paid', 'customer settled debt', 'record installment', 'installment payment debt',
      'customer paying debt', 'record credit payment', 'debt payment from customer'
    ],
    lastUpdated: '2026-03-10',
  },

  // Continuing with remaining chunks in next response due to length...

  // ============================================
  // CHUNK 7: Partial Payments
  // ============================================
  {
    id: 'credit-partial-payment',
    category: 'credit-sales',
    title: 'Recording Partial Debt Payments',
    subtitle: 'Customer pays in installments',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 80,
    description: 'How to handle when customers pay debt in multiple installments.',
    content: `## Recording Partial Debt Payments

When customers pay their debt in installments (parts).

---

## What is Partial Payment?

**Partial payment** = Customer pays SOME (not all) of debt

**Example:**
- Customer owes: ₦60,000
- Customer pays: ₦30,000
- Remaining: ₦30,000
- **This is partial payment**

---

## When Customers Pay in Installments

**Common scenarios:**

"Sister, I have ₦20,000 now, I'll bring ₦40,000 Friday"

"Brother, let me pay ₦100,000 today, remaining next week"

"Mama, here is ₦50,000, I will complete it month-end"

---

## How to Record Partial Payment

### Step 1: Find Customer's Debt
1. Customers → Find customer
2. Debts tab → See their debt

**Example: Brother Emeka owes ₦535,000**

### Step 2: Click "Record Payment"

### Step 3: Enter Partial Amount
Instead of full ₦535,000:
- Enter amount customer gave: ₦300,000

System shows:
\`\`\`
━━━━━━━━━━━━━━━━━━━━
Original Debt: ₦535,000
Paying Now: ₦300,000
Remaining: ₦235,000
━━━━━━━━━━━━━━━━━━━━
\`\`\`

### Step 4: Add Notes
**Notes field:**
"First installment - balance ₦235,000 due 22 Dec"

### Step 5: Save
- Click "Record Payment"
- Debt Status: PARTIAL 🟡
- Balance: ₦235,000

---

## Multiple Partial Payments

Customer can pay in many installments.

**Example: Mama Nkechi - ₦100,000 Debt Paid in 4 Parts**

**Payment 1 (Monday):**
- Pays: ₦25,000
- Balance: ₦75,000
- Status: PARTIAL 🟡

**Payment 2 (Wednesday):**
- Pays: ₦25,000
- Balance: ₦50,000
- Status: PARTIAL 🟡

**Payment 3 (Friday):**
- Pays: ₦25,000
- Balance: ₦25,000
- Status: PARTIAL 🟡

**Payment 4 (Next Monday):**
- Pays: ₦25,000
- Balance: ₦0
- Status: PAID ✅

**All 4 payments tracked!**

---

## Viewing Partial Payment History

\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MAMA NKECHI - DEBT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Original Debt: ₦100,000
Due: 10 Dec 2025

PAYMENT HISTORY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 5 Dec - ₦25,000 (Transfer)
✅ 7 Dec - ₦25,000 (Cash)
✅ 9 Dec - ₦25,000 (POS)
✅ 12 Dec - ₦25,000 (Transfer)

Total Paid: ₦100,000
Balance: ₦0
Status: PAID ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`

---

## Setting New Due Date for Balance

After partial payment, you can agree on new due date for balance.

**Example:**

**Original:**
- Debt: ₦100,000
- Due: 10 Dec

**After Partial Payment (₦60,000 paid):**
- Paid: ₦60,000
- Balance: ₦40,000
- **New due date:** 20 Dec (agreed with customer)

**How to set:**
1. Record ₦60,000 payment
2. Notes: "Balance ₦40,000 due 20 Dec"
3. Optional: Set reminder for 20 Dec

---

## Handling Very Small Payments

Some customers pay tiny amounts daily/weekly.

**Example: Aunty Grace - ₦20,000 Debt, Pays ₦2,000 Weekly**

**Week 1:** ₦2,000 → Balance: ₦18,000
**Week 2:** ₦2,000 → Balance: ₦16,000
**Week 3:** ₦2,000 → Balance: ₦14,000
...continues...

**Challenge:** Many small payments = many records

**Solution:** Can record weekly total instead:
- Don't record every ₦500
- Wait until ₦5,000 or ₦10,000 accumulated
- Record larger amounts

---

## Partial Payment Best Practices

✅ **Accept partial payments** - Better than nothing!
✅ **Record immediately** - Don't forget small amounts
✅ **Thank customer** - Encourage them to continue paying
✅ **Set new deadline** - For remaining balance
✅ **Send reminder** - Before balance due date

❌ **Don't give more credit** - Until fully paid
❌ **Don't ignore small payments** - They add up!

---

## WhatsApp Receipt for Partial Payment

After recording partial payment, send receipt:

**Example Message:**
\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━
PAYMENT RECEIVED
━━━━━━━━━━━━━━━━━━━━━━━
Customer: Brother Emeka
Date: 15 Dec 2025

Original Debt: ₦535,000
Payment Today: ₦300,000
Balance Remaining: ₦235,000

Thank you for this payment!
Please pay remaining ₦235,000
by 22 Dec 2025.

- Ada's Phone Shop
━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`

---

## When Customer Says "I've Been Paying Small Small"

Customer claims they've paid in small amounts but you don't see it.

**How to verify:**
1. Go to their debt record
2. Check Payment History
3. Show them all recorded payments
4. If payment not recorded, ask for proof

**If you forgot to record:**
- Apologize
- Record now with correct date
- Update balance

---

## Partial Payment Report

See all customers with partial payments:

1. Customers page
2. Filter → "Partial Payments"
3. See list of all customers who paid some but not all

Useful for:
- Following up on remaining balances
- See who is making progress
- Identify who stopped paying`,
    relatedDocs: ['credit-record-payment', 'credit-debt-statuses', 'credit-send-reminder'],
    keywords: [
      'partial payment', 'installment', 'pay in parts', 'small payments',
      'debt installment', 'multiple payments', 'customer pays small', 'partial debt',
      'paying small small', 'remaining balance', 'payment history', 'incomplete payment',
      'record installment payment', 'installment payment', 'how to record installment',
      'customer pays installments', 'record partial debt payment', 'payment in installments',
      'installment from debt', 'credit payment installment', 'record debt installment'
    ],
    lastUpdated: '2026-03-10',
  },

  // ============================================
  // CHUNK 8: Send Debt Reminders
  // ============================================
  {
    id: 'credit-send-reminder',
    category: 'credit-sales',
    title: 'Send Debt Payment Reminders',
    subtitle: 'Remind customers via WhatsApp',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 85,
    description: 'How to send professional payment reminders to customers via WhatsApp.',
    content: `## Send Debt Payment Reminders

Politely remind customers about payments due or overdue.

---

## When to Send Reminders

### ⏰ 2 Days BEFORE Due Date
**Message:** "Friendly reminder - payment due soon!"
**Purpose:** Give customer advance notice
**Best for:** Large amounts, important customers

### 📅 ON Due Date
**Message:** "Payment is due today"
**Purpose:** Remind on exact day
**Best for:** All customers

### 🔴 1 Day AFTER Due Date
**Message:** "Payment was due yesterday"
**Purpose:** Urgent follow-up
**Best for:** Overdue debts

### 🚨 3-7 Days AFTER Due Date
**Message:** "This is urgent - payment 7 days overdue"
**Purpose:** Escalation
**Best for:** Significantly overdue debts

---

## How to Send Reminder

### Method 1: From Customer's Debt Page

**Step 1:** Find customer
- Customers → Click customer name
- Go to Debts tab

**Step 2:** Find the overdue debt
\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━
MAMA NKECHI - DEBT
━━━━━━━━━━━━━━━━━━━━━━━
Rice 50kg × 2 = ₦60,000
Due: 5 Dec 2025
Status: OVERDUE 🔴

[Record Payment] [Send Reminder]
━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`

**Step 3:** Click "Send Reminder"

**Step 4:** WhatsApp opens with pre-filled message

**Step 5:** Review and edit message (optional)

**Step 6:** Send!

---

### Method 2: From Dashboard

**Step 1:** Click "Customer Debts" card

**Step 2:** See list of overdue debts

**Step 3:** Click "Send Reminder" next to each debt

---

## Default Reminder Message Template

Storehouse auto-generates professional message:

\`\`\`
Good day Mama Nkechi,

This is a friendly reminder about your outstanding payment:

Amount: ₦60,000
Items: Rice 50kg × 2
Due Date: 5 Dec 2025
Days Overdue: 3 days

Please pay via:
• Transfer: [Your Bank Details]
• Cash: Visit our shop at [Address]

Thank you for your patronage!

[Your Business Name]
[Your Phone Number]
\`\`\`

---

## Customizing the Message

**Before sending, you can:**

1. **Add payment details:**
   
   Bank: GTBank
   Account: 0123456789
   Name: Ada Provisions
   

2. **Make it more personal:**
   
   Mama Nkechi, I know you're a trusted
   customer. Please help me with this
   payment when you can. Thank you!
   

3. **Offer options:**
   
   If you can't pay full ₦60,000:
   - Pay ₦30,000 now, ₦30,000 Friday?
   - Or any amount you have now?
   

---

## Message Tone Guidelines

### ✅ Friendly (Before Due Date or 1-2 Days Late)

Good morning Mama Nkechi! 👋

Just a quick reminder - your payment
of ₦60,000 is due tomorrow (Friday).

I know you're reliable! Just wanted
to give you a heads up.

Thank you! 🙏


### ⚠️ Firm But Polite (3-7 Days Late)

Hello Mama Nkechi,

Your payment of ₦60,000 was due on
5 Dec (now 5 days overdue).

Please kindly settle this at your
earliest convenience.

I would appreciate your cooperation.

Thank you.


### 🚨 Urgent (7+ Days Late)

Mama Nkechi,

I need to follow up urgently on your
debt of ₦60,000 which is now 10 days
overdue (due 5 Dec).

Please pay immediately to avoid
further issues. I will call you today.

Thank you.


---

## Best Times to Send Reminders

**✅ Good Times:**
- **Morning:** 8-10 AM (people check phones)
- **Afternoon:** 2-4 PM (after lunch)
- **Evening:** 7-8 PM (after work)

**❌ Bad Times:**
- Before 7 AM (too early)
- During lunch (12-2 PM)
- After 9 PM (too late)
- During working hours (many people busy)

---

## Tips for Effective Reminders

### ✅ DO:
1. **Be polite and professional**
   - Start with "Good day" or "Hello"
   - Use respectful language

2. **Include specific details**
   - Exact amount: ₦60,000 (not "your debt")
   - Items sold: Rice 50kg × 2
   - Due date: 5 Dec 2025

3. **Provide payment options**
   - Bank transfer details
   - Shop visit
   - Mobile money

4. **Thank them**
   - "Thank you for your patronage"
   - "I appreciate your business"

5. **Follow up**
   - If no response in 2 days, send again
   - Or phone call

### ❌ DON'T:
1. **Don't threaten**
   - ❌ "I will report you to police"
   - ❌ "I will disgrace you publicly"

2. **Don't embarrass publicly**
   - ❌ Don't send to WhatsApp status
   - ❌ Don't post on social media

3. **Don't be rude**
   - ❌ "You are a thief"
   - ❌ "You and debt, see your life"

4. **Don't spam**
   - ❌ Don't send every hour
   - ✅ Send once every 1-2 days max

---

## After Sending Reminder

**Track reminder status:**
1. System logs: "Reminder sent 8 Dec 2025"
2. Check if customer:
   - Read message (WhatsApp double blue tick)
   - Replied
   - Paid after reminder

**If no response after 2 reminders:**
1. **Phone call** - Personal touch
2. **Visit in person** - If possible
3. **Stop more credit** - Until paid

---

## Multiple Reminders Example

**Brother Emeka - ₦535,000 Debt:**

**Reminder 1: 13 Dec (2 days before due)**
- Type: Friendly advance notice
- Result: He read it, said "Ok"

**Reminder 2: 15 Dec (due date)**
- Type: Due today reminder
- Result: He paid ₦300,000 (partial)

**Reminder 3: 20 Dec (balance due)**
- Type: Balance remaining reminder
- Result: No response

**Reminder 4: 22 Dec (2 days after balance due)**
- Type: Firm reminder
- Result: He paid remaining ₦235,000 ✅

**Total: 4 reminders sent, debt fully paid!**

---

## WhatsApp Etiquette for Debt Reminders

**Good practices:**
1. **Use proper greeting** - "Good morning/afternoon/evening"
2. **Identify yourself** - "This is Ada from Ada's Shop"
3. **Be clear** - State amount and due date
4. **Provide solution** - How customer can pay
5. **End politely** - "Thank you" or "God bless"

**Example:**

Good evening Brother Emeka! 🙋‍♂️

This is Ada from Ada's Phone Shop.

Just following up on the balance of
₦235,000 from your iPhone purchase.

We agreed it would be paid by 22 Dec
(today).

You can pay via:
Bank Transfer: GTBank 0123456789 (Ada)
Or visit the shop: 45 Allen Avenue

Thank you for your understanding! 🙏
`,
    relatedDocs: ['credit-overdue-debts', 'credit-record-payment', 'credit-best-practices'],
    keywords: [
      'send debt reminder', 'payment reminder', 'whatsapp reminder', 'remind customer',
      'debt overdue', 'follow up debt', 'payment follow up', 'debt collection',
      'reminder message', 'chase payment', 'customer not paying', 'debt notice'
    ],
    lastUpdated: '2026-03-10',
  },

  // Continuing with final 2 chunks...

  // ============================================
  // CHUNK 9: Managing Overdue Debts
  // ============================================
  {
    id: 'credit-overdue-debts',
    category: 'credit-sales',
    title: 'Managing Overdue Debts',
    subtitle: 'Handle late payments and non-payers',
    difficulty: 'intermediate',
    estimatedTime: '4 minutes',
    priority: 90,
    description: 'Strategies for collecting overdue debts and preventing bad debts.',
    content: `## Managing Overdue Debts

How to handle customers who haven't paid by due date.

---

## What is an Overdue Debt?

**Overdue** = Payment date has passed, still not paid

**Example:**
- Debt: ₦60,000
- Due: 5 Dec 2025
- Today: 8 Dec 2025
- Status: OVERDUE 🔴 (3 days late)

---

## Finding Overdue Debts

### Dashboard View
1. "Customer Debts" card shows:
   - Total overdue amount (in red)
   - Number of overdue customers

**Example:**
\`\`\`
━━━━━━━━━━━━━━━━━━━━
💰 CUSTOMER DEBTS
━━━━━━━━━━━━━━━━━━━━
Total Owed: ₦1,250,000
Overdue: ₦450,000 🔴 (4 customers)
━━━━━━━━━━━━━━━━━━━━
\`\`\`

### Customers Page - Filter by Overdue
1. Sidebar → Customers
2. Filter → "Overdue Only"
3. See list of all late payments

**Example List:**
\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OVERDUE DEBTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mama Nkechi    ₦60,000   (3 days late)
Aunty Grace    ₦125,000  (10 days late) 🚨
Mr. Johnson    ₦200,000  (2 days late)
Sister Blessing ₦65,000  (7 days late)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Overdue: ₦450,000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`

---

## Escalation Steps for Overdue Debts

### 📅 Day 1 Overdue - Friendly Reminder
**Action:** Send WhatsApp reminder

**Message:**
"Good morning Mama Nkechi,

Your payment of ₦60,000 was due
yesterday. Just a friendly reminder!

Please pay when convenient.

Thank you! 🙏"

### 📞 Day 3 Overdue - Phone Call
**Action:** Call customer directly

**Script:**
"Hello Mama Nkechi, this is Ada. I'm
calling about the ₦60,000 payment that
was due 5 Dec. When can you pay?"

**Listen to reason:**
- If valid excuse → Set new date
- If no excuse → Insist on payment soon

### 🚨 Day 7 Overdue - Firm Message + Visit
**Action 1:** Send firm WhatsApp message

**Message:**
"Mama Nkechi,

Your debt of ₦60,000 is now 7 days
overdue. This is becoming a serious
matter.

Please pay immediately or I will have
to take further steps.

Thank you."

**Action 2:** Visit customer (if possible)
- Go to their shop/house
- Ask face-to-face
- Collect payment on the spot

### 🛑 Day 14+ Overdue - Stop Credit + Legal
**Action 1:** Stop all credit immediately
- No more sales on credit to this customer
- Cash only from now on

**Action 2:** Final warning
"Mama Nkechi,

Your debt has been overdue for 2 weeks.
I must insist you pay ₦60,000 immediately.

If not paid within 3 days, I will:
- Stop all future credit
- Report to [community/church/group]
- Take legal action if necessary

This is my final request.

Thank you."

**Action 3:** Consider legal action (last resort)
- Small claims court
- Community mediation
- Church/religious leader intervention

---

## Priority: Which Debts to Chase First?

**Priority 1: Large amounts + Very overdue**
- Example: ₦500,000 that's 30 days late
- **Why:** Big money, long delay = urgent

**Priority 2: Large amounts + Recently overdue**
- Example: ₦400,000 that's 3 days late
- **Why:** Large amount, catch early

**Priority 3: Small amounts + Very overdue**
- Example: ₦30,000 that's 15 days late
- **Why:** Small but very late

**Priority 4: Small amounts + Recently overdue**
- Example: ₦20,000 that's 2 days late
- **Why:** Small and just late, less urgent

---

## Dealing with Common Excuses

### Excuse 1: "My husband is traveling"
**Response:**
"I understand. When does he return?
Can you pay half now, half when he's back?"

**Action:** Set new date, send reminder

### Excuse 2: "Bank network problem"
**Response:**
"Ok, what about cash? Or mobile transfer?
Or visit the shop with POS?"

**Action:** Offer alternatives

### Excuse 3: "Business is slow, no money"
**Response:**
"I understand business can be tough.
Can you pay ₦20,000 now, and ₦40,000
next week?"

**Action:** Negotiate partial payment

### Excuse 4: "I will pay next week" (keeps saying this)
**Response:**
"You said that last week. I need
payment today or by Friday latest.
Otherwise I cannot give credit again."

**Action:** Be firm, set deadline

### Excuse 5: "I already paid!"
**Response:**
"Let me check... I don't see payment
recorded. Can you show me receipt or
transfer confirmation?"

**Action:** Ask for proof

---

## When to Write Off Bad Debt

Some debts may never be paid.

**Consider writing off when:**
- Customer disappeared completely
- Customer has no money (proven hardship)
- Customer died (and family can't pay)
- Amount is very small (₦5,000 or less)
- Chasing costs more than debt worth

**How to write off:**
1. Find customer's debt
2. Click "Cancel Debt" or "Write Off"
3. Add reason: "Customer relocated, untraceable"
4. Debt removed from active list
5. Recorded in "Bad Debts" history

---

## Preventing Future Overdue Debts

**1. Better customer selection**
- Only give credit to proven payers
- Check payment history before new credit

**2. Realistic due dates**
- Don't accept "I'll pay in 3 months"
- Shorter = better (3-7 days ideal)

**3. Send early reminders**
- 2 days before due = customer doesn't forget

**4. Credit limits**
- Don't let debt grow too large
- Example: Max ₦100,000 per customer

**5. Partial payments encouraged**
- Accept ₦20,000 today better than ₦0

**6. Track payment patterns**
- Customer always late? Reduce their limit
- Customer pays early? Increase their limit

---

## Real Nigerian Business Example

**Aunty Grace - Chronic Late Payer:**

**History:**
- Debt 1: ₦50,000 (paid 2 weeks late)
- Debt 2: ₦80,000 (paid 1 month late)
- Debt 3: ₦125,000 (now 10 days overdue)

**Current Situation:**
- Owes: ₦125,000
- Due: 1 Dec 2025
- Today: 11 Dec 2025
- Overdue: 10 days 🚨

**Action Plan:**
1. ✅ Send firm WhatsApp (Day 10)
2. ✅ Phone call (Day 10)
3. ⏳ Visit shop in person (Day 12 if no response)
4. ⏳ Final warning (Day 14)
5. ⏳ Stop all credit, report to community (Day 21)

**Decision:**
- Even if she pays this debt, REDUCE her credit limit
- Max ₦50,000 in future (down from ₦125,000)
- Or require 50% deposit upfront

---

## Dashboard Overdue Alerts

Storehouse automatically highlights overdue:
- 🔴 Red badge on Customers menu
- 🔴 Red text on customer names
- 🔴 Red status on debt records
- 📧 Optional email alerts (if enabled)

**You can't miss overdue debts!**`,
    relatedDocs: ['credit-send-reminder', 'credit-best-practices', 'credit-record-payment'],
    keywords: [
      'overdue debt', 'late payment', 'customer not paying', 'debt collection',
      'chase debt', 'customer owes', 'bad debt', 'debt defaulter', 'non payment',
      'follow up overdue', 'late payer', 'debt escalation', 'write off debt',
      'customer disappeared', 'debt excuses'
    ],
    lastUpdated: '2026-03-10',
  },

  // ============================================
  // CHUNK 10: Best Practices for Credit Sales
  // ============================================
  {
    id: 'credit-best-practices',
    category: 'credit-sales',
    title: 'Credit Sales Best Practices',
    subtitle: 'Rules for safe and profitable credit',
    difficulty: 'intermediate',
    estimatedTime: '4 minutes',
    priority: 75,
    description: 'Essential guidelines for managing credit sales, limits, and minimizing bad debts.',
    content: `## Credit Sales Best Practices

Rules and strategies for safe, profitable credit sales.

---

## The Golden Rules of Credit

### Rule 1: Know Your Customer First
**Don't give credit on first sale!**

✅ **Do:**
- Cash for first 3 purchases
- Build relationship first
- Observe payment habits
- Get references

❌ **Don't:**
- Credit to strangers
- Credit to one-time buyers
- Credit without phone number

---

### Rule 2: Set Clear Limits
**Don't let debt spiral out of control**

**Per Customer Limits:**
| Customer Type | Max Single Debt | Max Total Debt |
|---------------|-----------------|----------------|
| New (3-6 months) | ₦50,000 | ₦100,000 |
| Regular (1+ year) | ₦200,000 | ₦500,000 |
| B2B Long-term | ₦1,000,000 | ₦3,000,000 |

**Example:**
- Mama Nkechi (regular 2 years) = Max ₦200,000
- If she owes ₦150,000, only ₦50,000 more credit

---

### Rule 3: Keep Due Dates Short
**Shorter = Better!**

✅ **Good due dates:**
- 3 days
- 5 days
- 1 week (7 days)
- 2 weeks (14 days) max

❌ **Bad due dates:**
- 1 month (30 days)
- 2 months
- "Month-end" (vague)
- "When I get money" (no date!)

**Why short is better:**
- Customer less likely to forget
- You get money faster
- Less risk of non-payment

---

### Rule 4: Always Get Contact Info
**Required for credit sales:**

✅ **Must have:**
- Customer full name
- Phone number (WhatsApp)
- Shop/house location

✅ **Nice to have:**
- Alternative phone
- Customer's business name
- Guarantor's contact

❌ **Never give credit without:**
- Name
- Phone number

---

### Rule 5: Send Reminders Proactively
**Don't wait until overdue!**

**Reminder Schedule:**
- 📅 **2 days before due:** Advance notice
- 📅 **On due date:** "Due today"
- 📅 **1 day after:** "Was due yesterday"
- 📅 **3 days after:** Urgent follow-up

**Why it works:**
- Customer doesn't forget
- Shows you're tracking
- Reduces overdue rate

---

### Rule 6: Record Partial Payments Immediately
**Even small amounts matter!**

✅ **Do:**
- Record ₦5,000 payment immediately
- Thank customer for progress
- Remind remaining balance

❌ **Don't:**
- Wait to record until full payment
- Ignore small payments
- Forget to log payments

**Why:**
- Accurate balance
- Customer sees progress
- Encourages more payments

---

### Rule 7: Review Payment History Before More Credit
**Check before giving new credit**

**Before new credit sale, check:**
1. Does customer have unpaid debt?
2. Did they pay previous debts on time?
3. What's their payment pattern?

**Decision Matrix:**
| Payment History | New Credit? |
|----------------|-------------|
| Always pays on time | ✅ Yes, increase limit |
| Pays 1-2 days late | ✅ Yes, same limit |
| Pays 1+ week late | ⚠️ Reduce limit or require deposit |
| Currently owes | ❌ No, pay old debt first |
| Never pays on time | ❌ No, cash only |

---

### Rule 8: Stop Credit Immediately If Late
**Don't reward late payment with more credit!**

**Customer owes ₦100,000, now 5 days overdue:**

❌ **Don't:**
- Give them ₦50,000 more items on credit
- Say "Pay when you can"

✅ **Do:**
- Say: "Please pay the ₦100,000 first"
- Offer: "Or pay ₦50,000 now, I can give ₦50,000 credit"
- Stop all new credit until paid

---

### Rule 9: Track Total Outstanding Debt
**Know your exposure**

**Example Business:**
- Total sales: ₦2,000,000/month
- Total outstanding debts: ₦800,000
- **Debt ratio: 40%** 😟

**Healthy ratios:**
- **10-20%** = Excellent ✅
- **20-30%** = Good ⚠️
- **30-50%** = Risky 😟
- **50%+** = Dangerous 🚨

**If ratio too high:**
- Stop new credit temporarily
- Chase overdue debts aggressively
- Require deposits (50% upfront)

---

### Rule 10: Reward Good Payers
**Encourage prompt payment**

**Brother Emeka - Always pays early:**

✅ **Rewards:**
- Increase his credit limit
- Offer small discount (5% off)
- Give him priority/VIP treatment
- Allow longer due dates if he wants

**Why:**
- Keeps good customers happy
- Encourages others to pay on time
- Builds loyalty

---

## Credit Sales Checklist

**Before giving credit, verify:**
- [ ] Customer name recorded
- [ ] Phone number saved
- [ ] Previous debts paid (if repeat customer)
- [ ] Within customer's credit limit
- [ ] Realistic due date set (3-14 days)
- [ ] Customer agrees to due date
- [ ] Items and amount recorded clearly

---

## Red Flags - Don't Give Credit!

🚩 Customer avoids eye contact
🚩 Customer vague about where they live
🚩 Customer says "I'll pay whenever"
🚩 Customer already owes money
🚩 Customer recommended by suspicious person
🚩 Customer pressures you ("Give me or I go elsewhere!")
🚩 Customer has bad debt history
🚩 Customer first time here

**When you see red flags: CASH ONLY!**

---

## Communication Tips

### ✅ DO Say:
- "Our policy is cash for new customers"
- "You can get credit after 3 successful purchases"
- "Please pay the ₦50,000 first, then we can talk"
- "How about 50% deposit now, 50% on Friday?"

### ❌ DON'T Say:
- "I don't trust you" (offensive)
- "You look like a defaulter" (rude)
- "Pay or I'll disgrace you" (aggressive)

**Be firm but polite!**

---

## Monthly Credit Review

**Every month, review:**

1. **Top Debtors:**
   - Who owes the most?
   - Are they paying?

2. **Oldest Debts:**
   - Any debt over 30 days?
   - Why not paid?

3. **Success Rate:**
   - How many debts paid on time?
   - Calculate: (Paid on time / Total debts) × 100

4. **Bad Debts:**
   - How much written off?
   - Why?

5. **Adjust Strategy:**
   - Tighten credit if too many late payers
   - Relax credit if everyone pays on time

---

## Example Nigerian Business: Ada's Provisions

**Ada's Rules:**

1. **New customers:** Cash only first 3 visits
2. **Regular customers:** Max ₦100,000 credit
3. **Due dates:** 5 days maximum
4. **Already owes?** Pay 50% before new credit
5. **Overdue 7+ days?** Cash only until paid
6. **Church members:** Same rules (no exceptions)

**Results:**
- 95% debts paid within 7 days
- Only 2% bad debts per year
- Total outstanding: 15% of sales ✅

**Ada's secret:**
"I treat everyone the same. No special favors.
Pay on time = more credit. Pay late = less credit.
Simple!"

---

## Training Your Staff

**If you have employees, teach them:**

1. **Who gets credit:**
   - Only approved regular customers
   - Check approved list

2. **How much credit:**
   - Check customer's limit in system
   - Don't exceed

3. **Record immediately:**
   - Log every credit sale
   - Get customer signature if possible

4. **No exceptions:**
   - "My boss says cash only for new customers"
   - "Let me call my boss" (if customer insists)

---

## Final Wisdom

**Credit sales are good for:**
- Building customer loyalty
- Increasing sales volume
- Keeping regular customers

**But remember:**
- Cash in hand > Promise to pay
- Better lose sale than lose money
- Trust but verify
- Be kind but firm

**Nigerian proverb:**
"Monkey no fine, but im mama like am."
**Translation:** Trust your instincts. If it doesn't feel right, don't give credit!`,
    relatedDocs: ['credit-when-to-use', 'credit-overdue-debts', 'credit-what-is-credit-sale'],
    keywords: [
      'credit best practices', 'credit rules', 'credit policy', 'credit limit',
      'credit management', 'reduce bad debt', 'credit guidelines', 'safe credit',
      'credit tips', 'who to give credit', 'credit dos and donts', 'credit strategy',
      'manage credit sales', 'credit sales tips'
    ],
    lastUpdated: '2026-03-10',
  },

];
