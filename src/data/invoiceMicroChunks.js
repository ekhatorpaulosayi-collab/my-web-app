// INVOICE MICRO-CHUNKS - 17 Focused Documentation Entries
// Each chunk answers ONE specific question with laser-focused keywords
// This replaces the monolithic 1,000-line invoice guide

export const invoiceMicroChunks = [
  // ====================================
  // CHUNK 1: How to Create New Invoice
  // ====================================
  {
    id: 'invoice-create-new',
    category: 'invoices',
    title: 'How to Create a New Invoice',
    subtitle: 'Step-by-step invoice creation',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 95,
    description: 'Learn how to create a professional invoice from start to finish.',
    content: `## How to Create a New Invoice

### Quick Steps:

1. Click **"Invoices"** in sidebar
2. Click **"+ Create Invoice"** button (top-right)
3. Fill customer details
4. Add line items
5. Set payment terms & due date
6. Add discount/VAT if needed
7. Save as Draft or Mark as Sent

---

### Detailed Walkthrough:

**Step 1: Navigate to Invoices**
- Click "Invoices" in left sidebar
- You'll see the invoices dashboard

**Step 2: Click Create Invoice**
- Top-right corner: "+ Create Invoice" button
- Invoice creation form opens

**Step 3: Customer Information**
- **Customer Name** (required): "Chioma Electronics Ltd"
- **Email OR Phone** (at least one required): orders@chioma.ng
- **Address** (optional): "Shop 45, Computer Village, Lagos"

**Step 4: Invoice Details**
- **Issue Date**: Defaults to today
- **Payment Terms**: Choose Net 15, Net 30, etc.
- **Due Date**: Auto-calculated from payment terms

**Step 5: Add Line Items**
For each product/service:
- Item name: "Samsung 55\\" Smart TV"
- Description (optional): "Model UN55AU7000"
- Quantity: 10
- Unit Price: ₦250,000
- Total: Auto-calculated (₦2,500,000)

Click "+ Add Item" for more items

**Step 6: Adjustments**
- **Discount**: Enter amount in ₦ (optional)
- **VAT/Tax**: Toggle "Include Tax" (7.5% default)

**Step 7: Save**
Two options:
- **Save as Draft**: Not sent yet, can edit
- **Mark as Sent**: Ready, sent to customer

---

### What Happens Next:

✅ Invoice created
✅ Auto-generated number (INV-001, INV-002, etc.)
✅ Appears in invoices table
✅ Ready to share with customer`,
    keywords: [
      'create invoice',
      'create new invoice',
      'how to create invoice',
      'make invoice',
      'new invoice',
      'start invoice',
      'invoice creation',
      'how do i create invoice',
      'creating invoice'
    ],
    lastUpdated: '2025-03-10',
  },

  // ====================================
  // CHUNK 2: Required Fields
  // ====================================
  {
    id: 'invoice-required-fields',
    category: 'invoices',
    title: 'Invoice Required Fields',
    subtitle: 'What you must fill in',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 90,
    description: 'Learn which fields are required when creating an invoice.',
    content: `## Invoice Required Fields

### Absolutely Required:

**1. Customer Name** ✅
- Full business or person name
- Example: "Chioma Electronics Ltd"

**2. Email OR Phone** ✅ (at least one)
- **Email**: For sending invoice via email
- **Phone**: For WhatsApp/SMS sharing
- Must provide at least ONE contact method
- Best practice: Provide both

**3. Line Items** ✅ (at least 1)
- At least one product/service
- Each line item requires:
  - Item name
  - Quantity
  - Unit price

---

### Optional Fields:

- Customer address
- Item description
- Discount
- VAT/Tax
- Notes
- Terms & Conditions

---

### Examples:

**Minimum Valid Invoice:**
\`\`\`
Customer Name: Chioma Electronics
Email: orders@chioma.ng

Item 1:
  Name: Samsung TV
  Qty: 10
  Price: ₦250,000
\`\`\`

**Complete Professional Invoice:**
\`\`\`
Customer Name: Chioma Electronics Ltd
Email: orders@chioma.ng
Phone: +234 803 456 7890
Address: Shop 45, Computer Village, Lagos

Item 1:
  Name: Samsung 55" Smart TV
  Description: Model UN55AU7000, 4K UHD
  Qty: 10
  Price: ₦250,000

Payment Terms: Net 15
Discount: ₦50,000
VAT: 7.5%
\`\`\`

---

### Why Email/Phone Required?

You need a way to **share the invoice**:
- **Email**: Professional invoice delivery
- **Phone**: WhatsApp/SMS sharing
- **No contact**: Can only use "Copy Link"`,
    keywords: [
      'required fields invoice',
      'invoice required fields',
      'what fields required',
      'invoice mandatory fields',
      'must fill invoice',
      'invoice required info',
      'what fields are required when creating invoice'
    ],
    lastUpdated: '2025-03-10',
  },

  // ====================================
  // CHUNK 3: Add Multiple Line Items
  // ====================================
  {
    id: 'invoice-line-items',
    category: 'invoices',
    title: 'How to Add Multiple Line Items',
    subtitle: 'Adding products/services to invoice',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 88,
    description: 'Learn how to add and manage multiple line items on an invoice.',
    content: `## How to Add Multiple Line Items to Invoice

### Adding Line Items:

**Each Line Item Has:**
1. **Item Name** (required): Product/service sold
2. **Description** (optional): Additional details
3. **Quantity** (required): Number of units
4. **Unit Price** (required): Price per unit in ₦
5. **Total**: Auto-calculated (Quantity × Price)

---

### Step-by-Step:

**First Item:**
- Automatically shows when you create invoice
- Fill in name, quantity, price

**Add More Items:**
- Click **"+ Add Item"** button
- New row appears below
- Fill in details for second item
- Repeat for each additional item

**Remove Items:**
- Click trash icon (🗑️) next to item
- Item deleted immediately
- Cannot delete if only 1 item remains

---

### Example - Electronics Wholesale:

**Item 1:**
- Name: Samsung 55" Smart TV
- Description: Model UN55AU7000, 4K UHD
- Quantity: 10
- Price: ₦250,000
- **Total: ₦2,500,000** (auto-calculated)

**Item 2:**
- Name: LG Inverter AC 1.5HP
- Description: 1 year warranty included
- Quantity: 5
- Price: ₦180,000
- **Total: ₦900,000** (auto-calculated)

**Item 3:**
- Name: Samsung Refrigerator 350L
- Description: Double door, frost-free
- Quantity: 3
- Price: ₦320,000
- **Total: ₦960,000** (auto-calculated)

**Invoice Subtotal: ₦4,360,000** (sum of all items)

---

### Tips:

✅ **No maximum limit** on line items
✅ **Totals calculate automatically** when you enter qty/price
✅ **Descriptions are optional** but professional
✅ **Minimum 1 item** required`,
    keywords: [
      'add line items',
      'multiple line items',
      'add items to invoice',
      'invoice line items',
      'add multiple items',
      'how to add line items to invoice',
      'adding items invoice',
      'invoice items'
    ],
    lastUpdated: '2025-03-10',
  },

  // ====================================
  // CHUNK 4: Draft vs Sent Status
  // ====================================
  {
    id: 'invoice-draft-vs-sent',
    category: 'invoices',
    title: 'Draft vs Sent Invoice Status',
    subtitle: 'Understanding the difference',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 87,
    description: 'Learn the difference between Draft and Sent invoice statuses.',
    content: `## Draft vs Sent Invoice - What's the Difference?

### Draft Status (Gray Badge)

**What it means:**
- Invoice created but **NOT sent** to customer yet
- Still being prepared/reviewed
- Customer hasn't received it

**When to use:**
- Preparing invoice for review
- Getting manager approval
- Want to edit before sending
- Creating template for recurring customer

**What you can do:**
- ✅ Edit freely (all fields)
- ✅ Delete invoice
- ✅ Add/remove line items
- ✅ Change amounts
- ❌ No payment tracking (not sent yet)

**Example scenario:**
You create invoice for ₦5M order, save as Draft to get manager approval before sending to customer.

---

### Sent Status (Blue Badge)

**What it means:**
- Invoice **shared with customer**
- Customer should have received it
- **Due date tracking active**
- Waiting for payment

**When status changes to Sent:**
- You click "Mark as Sent" button
- Or you save invoice with "Mark as Sent" option

**What you can do:**
- ✅ View and share again
- ✅ Record payments
- ✅ Track due date
- ⚠️ Edit carefully (customer has original)
- ❌ Don't delete (use Cancel instead)

**Example scenario:**
You sent invoice via WhatsApp to customer. Mark as Sent to start tracking payment deadline.

---

### Quick Comparison:

| Feature | Draft | Sent |
|---------|-------|------|
| **Customer received** | No ❌ | Yes ✅ |
| **Payment tracking** | No ❌ | Yes ✅ |
| **Due date countdown** | No ❌ | Yes ✅ |
| **Can edit freely** | Yes ✅ | Carefully ⚠️ |
| **Can delete** | Yes ✅ | No ❌ |
| **Overdue monitoring** | No ❌ | Yes ✅ |

---

### Best Practices:

✅ **Use Draft for:** Preparing, reviewing, getting approval
✅ **Use Sent for:** After customer receives invoice
✅ **Don't leave in Draft forever** - send when ready`,
    keywords: [
      'draft vs sent',
      'difference between draft and sent',
      'draft invoice',
      'sent invoice',
      'draft sent difference',
      'what is draft status',
      'what is sent status',
      'draft or sent invoice'
    ],
    lastUpdated: '2025-03-10',
  },

  // ====================================
  // CHUNK 5: Partial Payment Status
  // ====================================
  {
    id: 'invoice-partial-payment',
    category: 'invoices',
    title: 'What is Partial Payment Status?',
    subtitle: 'Understanding partial payments',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 89,
    description: 'Learn what partial payment means and how it works on invoices.',
    content: `## What Does Partial Payment Mean?

### Partial Payment Status (Orange Badge)

**What it means:**
- Customer has paid **SOME** money
- But **NOT the full amount** yet
- Balance still outstanding
- More payment expected

---

### How It Works:

**Invoice Total:** ₦3,000,000

**Customer pays:** ₦1,500,000 (first installment)

**Status changes to:** **Partial** (Orange)

**Shows:**
- Paid: ₦1,500,000
- Balance: ₦1,500,000
- Status: Partial (orange badge)

---

### Real Nigerian Example - Installment Payment:

**Balogun Market Fashion Wholesale**

**Invoice Total:** ₦2,500,000
**Due Date:** 30 Dec 2025

**Payment 1 (15 Dec):**
- Amount: ₦1,000,000
- Method: Bank Transfer
- **Status: Partial** (₦1.5M balance)

**Payment 2 (28 Dec):**
- Amount: ₦1,500,000
- Method: Cash
- **Status: Paid** ✅ (Fully paid!)

---

### When Does Partial Status Appear?

**Automatically when:**
1. You record a payment
2. Payment amount is **less than** balance due
3. System auto-updates status to "Partial"

**Example:**
- Balance: ₦5,000,000
- You record: ₦2,000,000
- System marks: **Partial** (₦3M balance)

---

### What Shows on Invoice:

**Invoice Detail Page:**
\`\`\`
Total: ₦3,000,000
Paid: ₦1,500,000 ✅
Balance: ₦1,500,000 ⚠️
Status: PARTIAL (orange)

Payment History:
1. 15 Dec 2025 - Transfer - ₦1,500,000
\`\`\`

---

### Partial Payment vs Other Statuses:

| Status | Amount Paid | Balance |
|--------|-------------|---------|
| **Sent** | ₦0 | ₦3M (100%) |
| **Partial** | ₦1.5M | ₦1.5M (50%) |
| **Paid** | ₦3M | ₦0 (0%) |

---

### Common Questions:

**Q: Can customer make partial payment?**
A: YES! Very common in Nigerian B2B. Record each payment as it comes.

**Q: How many partial payments allowed?**
A: Unlimited! Record as many installments as needed.

**Q: Does partial count as overdue?**
A: If past due date + still partial → **Overdue** (takes priority)`,
    keywords: [
      'partial payment',
      'partial payment mean',
      'what is partial payment',
      'partial status',
      'installment payment',
      'partial invoice',
      'partial payment status',
      'what does partial payment mean on invoice'
    ],
    lastUpdated: '2025-03-10',
  },

  // ====================================
  // CHUNK 6: Overdue Status
  // ====================================
  {
    id: 'invoice-overdue-status',
    category: 'invoices',
    title: 'Why is My Invoice Marked Overdue?',
    subtitle: 'Understanding overdue invoices',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 86,
    description: 'Learn why invoices become overdue and what to do about it.',
    content: `## Why is My Invoice Marked Overdue?

### Overdue Status (Red Badge)

**What it means:**
- **Due date has passed**
- Payment **NOT fully received**
- Customer is late
- Action required!

---

### How Invoice Becomes Overdue:

**Automatic Process:**

1. Invoice created: **5 Dec 2025**
2. Payment terms: **Net 15**
3. Due date: **20 Dec 2025**
4. Today: **21 Dec 2025** → **OVERDUE** (1 day late)

System automatically marks invoice as **Overdue** at midnight after due date.

---

### Real Example - Late Payment:

**University Cafeteria Food Supply**

**Invoice Details:**
- Total: ₦1,128,750
- Issue Date: 5 Dec 2025
- Payment Terms: Net 7
- **Due Date: 12 Dec 2025**

**What happened:**
- **12 Dec**: No payment → Status: **Overdue** (0 days)
- **13 Dec**: Still no payment → **Overdue (1 day)**
- **15 Dec**: Customer finally pays → Status: **Paid** ✅

**Invoice was overdue for 3 days**

---

### Overdue Scenarios:

**Scenario 1: No Payment**
- Total: ₦5M
- Paid: ₦0
- Past due date
- **Status: Overdue (Red)**

**Scenario 2: Partial Payment + Late**
- Total: ₦5M
- Paid: ₦2M (partial)
- Past due date
- **Status: Overdue (Red)**
- (Still shows Overdue even though partially paid!)

**Scenario 3: Paid on Time**
- Total: ₦5M
- Paid: ₦5M
- BEFORE due date
- **Status: Paid (Green)** ✅

---

### What To Do When Overdue:

**1. Send Payment Reminder**
- WhatsApp: "Payment for INV-001 (₦1.1M) is 3 days overdue"
- Click "Send Reminder" button

**2. Call Customer**
- Personal follow-up
- Understand delay reason
- Negotiate new payment date

**3. Record Payment When Received**
- Click "Record Payment"
- Enter amount received
- Status auto-updates to Paid

---

### Preventing Overdue:

✅ **Set realistic payment terms** (Net 15 common in Nigeria)
✅ **Send reminders 2-3 days before due date**
✅ **Follow up promptly** when overdue
✅ **Offer early payment discounts**
✅ **Check customer creditworthiness** before large orders`,
    keywords: [
      'overdue invoice',
      'invoice overdue',
      'why overdue',
      'overdue status',
      'past due',
      'late payment',
      'invoice late',
      'why is my invoice marked overdue',
      'invoice past due date'
    ],
    lastUpdated: '2025-03-10',
  },

  // ====================================
  // CHUNK 7: Record Payment
  // ====================================
  {
    id: 'invoice-record-payment',
    category: 'invoices',
    title: 'How to Record a Payment for an Invoice',
    subtitle: 'Recording customer payments',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 93,
    description: 'Learn how to record full or partial payments when customers pay their invoices.',
    content: `## How to Record a Payment for an Invoice

### Quick Steps:

1. Go to **Invoices** page
2. Find the invoice (Sent/Partial/Overdue status)
3. Click **"Record Payment"** button
4. Enter payment amount received
5. Select payment method
6. Add reference/notes (optional)
7. Click **"Save Payment"**

---

### Step-by-Step Walkthrough:

**STEP 1: Find the Invoice**

Navigate to Invoices page:
- Click "Invoices" in sidebar
- Find customer's invoice using:
  - Search by customer name
  - Filter by status (Sent/Partial/Overdue)
  - Browse invoice table

**STEP 2: Open Invoice Details**

- Click on the invoice row
- Invoice detail page opens
- Shows customer info, line items, total, balance

**STEP 3: Click "Record Payment"**

Look for **"Record Payment"** button:
- Usually top-right on invoice detail page
- Or in invoice actions menu
- Opens payment recording form

**STEP 4: Enter Payment Details**

**Payment Amount** (required):
- Enter amount customer paid in ₦
- Can be:
  - **Full amount**: Pays entire balance
  - **Partial amount**: Pays some of balance

Example:
- Balance: ₦3,000,000
- Customer paid: ₦1,500,000
- Enter: 1500000

**Payment Method** (required):
Choose how customer paid:
- Cash
- Bank Transfer
- POS/Card
- Mobile Money
- Cheque
- Other

**Payment Date** (required):
- Defaults to today
- Change if payment was received earlier

**Reference/Notes** (optional):
- Transaction ID for bank transfer
- Cheque number
- Receipt number
- Any notes about payment

---

### What Happens After Recording Payment:

**If Full Payment (Balance = ₦0):**
- Status changes to: **Paid** (Green) ✅
- Invoice marked complete
- Shows "Fully Paid" badge
- Payment history updated

**If Partial Payment (Balance > ₦0):**
- Status changes to: **Partial** (Orange)
- Remaining balance shown
- Can record more payments later
- Payment history shows all installments

**If Still Overdue:**
- If past due date + balance remaining
- Status stays: **Overdue** (Red)
- Even if partial payment made

---

### Real Nigerian Example - Multiple Payments:

**Chioma Electronics - Phone Wholesale**

**Original Invoice:**
- Total: ₦5,000,000
- Issue Date: 1 Dec 2025
- Due Date: 16 Dec 2025 (Net 15)

**Payment 1 (10 Dec):**
- Amount: ₦2,000,000
- Method: Bank Transfer
- **Status: Partial** (₦3M balance)

**Payment 2 (15 Dec):**
- Amount: ₦1,500,000
- Method: Cash
- **Status: Partial** (₦1.5M balance)

**Payment 3 (16 Dec):**
- Amount: ₦1,500,000
- Method: POS
- **Status: Paid** ✅ (Fully paid on time!)

---

### Tips:

✅ **Always record payments immediately** when received
✅ **Keep transaction references** for your records
✅ **Partial payments are OK** - very common in Nigerian B2B
✅ **Payment history is permanent** - cannot delete, only add
✅ **Customer gets automatic balance update**`,
    keywords: [
      'record payment',
      'record payment for invoice',
      'how to record payment',
      'how do i record payment for invoice',
      'mark invoice as paid',
      'customer paid invoice',
      'receive payment',
      'invoice payment recording',
      'record invoice payment'
    ],
    lastUpdated: '2025-03-10',
  },

  // ====================================
  // CHUNK 8: Confirm Payment
  // ====================================
  {
    id: 'invoice-confirm-payment',
    category: 'invoices',
    title: 'How to Confirm Customer Paid Invoice',
    subtitle: 'Verifying and confirming payments',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 91,
    description: 'Learn how to confirm and verify that a customer has paid their invoice.',
    content: `## How to Confirm Customer Paid Invoice

### Three Ways to Confirm Payment:

**Method 1: Check Invoice Status Badge**

Fastest way - look at status:
- **Paid (Green)** ✅ = Fully paid, confirmed
- **Partial (Orange)** = Some payment received
- **Sent (Blue)** = Not paid yet
- **Overdue (Red)** = Late, not paid

---

**Method 2: View Invoice Details**

1. Click on invoice in table
2. Invoice detail page shows:
   - **Total**: Original invoice amount
   - **Paid**: Amount received so far ✅
   - **Balance**: Amount still owed
   - **Payment History**: All payments with dates

**Example:**
\`\`\`
Invoice Total: ₦3,000,000
Paid: ₦3,000,000 ✅
Balance: ₦0
Status: PAID

Payment History:
1. 15 Dec 2025 - Bank Transfer - ₦2,000,000
2. 20 Dec 2025 - Cash - ₦1,000,000
\`\`\`

---

**Method 3: Check Bank Statement Match**

For bank transfers:
1. Open your bank statement
2. Find transaction from customer
3. Match:
   - Amount (₦ value)
   - Date
   - Customer name/reference
4. If matched → Record payment in Storehouse

---

### Understanding Payment Status:

**Fully Paid:**
- Status: **Paid** (Green)
- Balance: ₦0
- Payment History shows total = invoice total
- **Confirmed!** ✅

**Partially Paid:**
- Status: **Partial** (Orange)
- Balance: > ₦0
- Payment History shows partial amounts
- **More payment expected**

**Not Paid:**
- Status: **Sent** or **Overdue**
- Balance: = Total (100%)
- Payment History: Empty or no full payment
- **Follow up with customer**

---

### Nigerian B2B Example:

**University Cafeteria Food Supply Invoice**

**Invoice:** INV-045
**Customer:** UniLag Cafeteria Services
**Total:** ₦1,128,750

**Checking Payment Status:**

**Step 1:** Go to Invoices page
**Step 2:** Search "UniLag"
**Step 3:** Click INV-045

**Shows:**
\`\`\`
Status: PAID (green badge) ✅
Total: ₦1,128,750
Paid: ₦1,128,750
Balance: ₦0

Payment History:
- 15 Dec 2025, Bank Transfer, ₦1,128,750
  Ref: TRF/UniLag/Dec15
\`\`\`

**Confirmation:** Customer fully paid ₦1,128,750 via bank transfer on 15 Dec.

---

### Common Confirmation Questions:

**Q: Customer says they paid but status shows Sent?**
A: You haven't recorded the payment yet. Click "Record Payment" and enter the amount.

**Q: How do I know which customer has paid?**
A: Filter invoices by "Paid" status. All green badges = paid customers.

**Q: Can I see payment date?**
A: Yes! View invoice details → Payment History shows dates, methods, amounts.

**Q: Customer sent proof of transfer, now what?**
A: Verify bank statement shows the money, then click "Record Payment" in Storehouse.`,
    keywords: [
      'confirm payment',
      'confirm customer paid',
      'how to confirm payment',
      'verify invoice paid',
      'check if customer paid',
      'customer paid invoice',
      'invoice payment confirmation',
      'how to confirm customer paid invoice',
      'verify payment received'
    ],
    lastUpdated: '2025-03-10',
  },

  // ====================================
  // CHUNK 9: Can Customer Make Partial Payment
  // ====================================
  {
    id: 'invoice-customer-partial-payment',
    category: 'invoices',
    title: 'Can Customer Make Partial Payments?',
    subtitle: 'Partial payment flexibility',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 85,
    description: 'Learn whether customers can pay invoices in installments and how it works.',
    content: `## Can Customers Make Partial Payments on Invoices?

### Short Answer: YES! ✅

Customers can absolutely make partial payments (installments) on invoices. This is **very common** in Nigerian B2B transactions.

---

### How Partial Payments Work:

**Invoice Total:** ₦5,000,000
**Due Date:** 30 Dec 2025

**Customer pays in installments:**

**Payment 1 (10 Dec):**
- Pays: ₦2,000,000
- You record: ₦2,000,000
- Status: **Partial**
- Balance: ₦3,000,000

**Payment 2 (20 Dec):**
- Pays: ₦1,500,000
- You record: ₦1,500,000
- Status: **Partial**
- Balance: ₦1,500,000

**Payment 3 (28 Dec):**
- Pays: ₦1,500,000 (final payment)
- You record: ₦1,500,000
- Status: **Paid** ✅
- Balance: ₦0

**Total paid:** ₦5,000,000 (in 3 installments)

---

### Benefits of Partial Payments:

**For Customers:**
- ✅ **Better cash flow** management
- ✅ **Pay as they sell** goods/services
- ✅ **Less financial strain** on large orders
- ✅ **Builds trust** with supplier

**For You (Seller):**
- ✅ **Start receiving money** sooner
- ✅ **Less risk** than waiting for full amount
- ✅ **Stronger customer relationships**
- ✅ **Can monitor payment behavior**

---

### Real Nigerian Example - Installment Plan:

**Balogun Market Fashion Wholesale**

**Scenario:**
Your fabric shop supplies ₦3.5M worth of materials to Treasure's Fashion Hub.

**Agreement:**
Customer will pay in 4 weekly installments:

**Week 1 (7 Dec):** ₦1,000,000 → Status: Partial
**Week 2 (14 Dec):** ₦1,000,000 → Status: Partial
**Week 3 (21 Dec):** ₦1,000,000 → Status: Partial
**Week 4 (28 Dec):** ₦500,000 → Status: **Paid** ✅

**How to record:**
1. Each week customer pays, you click "Record Payment"
2. Enter amount received
3. System automatically updates status
4. Balance shown reduces each time

---

### Unlimited Partial Payments:

**No limits!**
- Customer can pay in 2, 3, 5, 10 installments
- No maximum number of partial payments
- Record each payment as it comes
- System tracks everything automatically

**Example with many payments:**
\`\`\`
Invoice: ₦10,000,000
Payment 1: ₦500,000
Payment 2: ₦500,000
Payment 3: ₦1,000,000
Payment 4: ₦500,000
Payment 5: ₦2,000,000
Payment 6: ₦1,500,000
Payment 7: ₦4,000,000 (final)
Total: ₦10,000,000 ✅
\`\`\`

All 7 payments recorded, tracked, and invoice marked Paid.

---

### What If Due Date Passes During Partial Payments?

**Example:**
- Invoice: ₦5M
- Due Date: 20 Dec
- Paid so far: ₦3M (partial)
- Today: 22 Dec

**Status:** **Overdue** (red) - even though ₦3M paid!

**Why?** Because:
- Balance still outstanding (₦2M)
- Past due date
- Overdue takes priority over Partial

**What to do:**
1. Follow up with customer for remaining ₦2M
2. Consider extending due date (if agreed)
3. Record final payment when received → Status becomes Paid

---

### Best Practices:

✅ **Agree on installment plan upfront** - document how many payments, when
✅ **Record each payment immediately** - don't wait to batch
✅ **Send payment reminders** before each installment due
✅ **Communicate balance clearly** - "You've paid ₦2M, ₦3M remaining"
✅ **Monitor overdue status** - follow up if installment missed`,
    keywords: [
      'partial payment',
      'can customer make partial payment',
      'partial payments allowed',
      'installment payment',
      'pay in installments',
      'can customer pay partial',
      'multiple payments invoice',
      'partial payment on invoice',
      'installments invoice'
    ],
    lastUpdated: '2025-03-10',
  },

  // ====================================
  // CHUNK 10: Send Invoice via WhatsApp
  // ====================================
  {
    id: 'invoice-send-whatsapp',
    category: 'invoices',
    title: 'How to Send Invoice to Customer via WhatsApp',
    subtitle: 'Sharing invoices on WhatsApp',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 92,
    description: 'Learn how to share invoices with customers using WhatsApp.',
    content: `## How to Send Invoice to Customer via WhatsApp

### Quick Steps:

1. Go to **Invoices** page
2. Find the invoice
3. Click **"Share"** or **"View"** button
4. Click **"Share via WhatsApp"** button
5. WhatsApp opens with invoice link
6. Send to customer

---

### Detailed Walkthrough:

**STEP 1: Navigate to Invoice**

- Click "Invoices" in sidebar
- Find customer's invoice:
  - Search by customer name
  - Or browse invoice table
  - Click on invoice row

**STEP 2: Open Invoice Detail**

Invoice detail page shows:
- Customer information
- Line items
- Total amount
- Payment status
- **Share/Action buttons**

**STEP 3: Click "Share via WhatsApp"**

Look for sharing options:
- **"Share via WhatsApp"** button
- Usually with WhatsApp icon 📱
- Or in "Share" dropdown menu

**STEP 4: WhatsApp Opens Automatically**

System automatically:
- Opens WhatsApp (desktop or mobile)
- Pre-fills message with:
  - Professional greeting
  - Invoice number
  - Total amount
  - Invoice link
  - Your business name

**Example WhatsApp message:**
\`\`\`
Hello,

Here is your invoice INV-045 for ₦2,500,000
from Chioma Electronics Ltd.

View and pay invoice:
https://storehouse.app/invoice/abc123

Payment Terms: Net 15
Due Date: 20 Dec 2025

Thank you for your business!
\`\`\`

**STEP 5: Send to Customer**

- Confirm customer's WhatsApp contact is correct
- Click **Send** in WhatsApp
- Invoice link delivered to customer ✅

---

### What Customer Receives:

**WhatsApp Message Contains:**
- Professional invoice notification
- Invoice number (e.g., INV-045)
- Total amount (e.g., ₦2,500,000)
- **Clickable link** to view full invoice
- Payment terms and due date
- Your business name

**When Customer Clicks Link:**
- Opens professional invoice page
- Shows all line items, totals, details
- Customer can:
  - View invoice anytime
  - Download as PDF
  - Print invoice
  - See payment status

---

### Requirements for WhatsApp Sharing:

**You need:**
- ✅ Customer's **phone number** in invoice
- ✅ Phone number must be valid
- ✅ WhatsApp installed on your device

**If no phone number:**
- You'll see "Copy Link" option instead
- Manually send link via SMS or other method

---

### Nigerian B2B Example:

**Computer Village Electronics Wholesale**

**Scenario:**
You created invoice INV-078 for Slot Systems Limited (₦8.5M Samsung phones order).

**Send via WhatsApp:**

1. Go to Invoices → Find INV-078
2. Click invoice → Opens detail page
3. Click "Share via WhatsApp" 📱
4. WhatsApp opens with:

\`\`\`
Hello Slot Systems Limited,

Here is your invoice INV-078 for ₦8,500,000
from Computer Village Electronics.

View invoice:
https://storehouse.app/invoice/slot-inv078

Items: 50x Samsung Galaxy S23
Payment Terms: Net 30
Due Date: 10 Jan 2026

Please confirm receipt.
\`\`\`

5. Send to Slot's procurement manager
6. They receive link, click, view invoice
7. Invoice status changes to "Viewed" (optional tracking)

---

### Other Sharing Options:

**Besides WhatsApp:**

**Email:**
- Click "Send via Email"
- Professional email sent with invoice PDF attached

**Copy Link:**
- Click "Copy Link"
- Share link via SMS, Telegram, any platform

**Download PDF:**
- Click "Download PDF"
- Get invoice as PDF file
- Print or attach to email manually

---

### Tips:

✅ **Always include customer phone** when creating invoice
✅ **Send via WhatsApp immediately** after creating invoice
✅ **Follow up** if customer doesn't confirm receipt
✅ **Mark invoice as Sent** after sharing
✅ **WhatsApp is fastest** delivery method in Nigeria`,
    keywords: [
      'send invoice whatsapp',
      'share invoice whatsapp',
      'how to send invoice via whatsapp',
      'whatsapp invoice',
      'send invoice to customer',
      'share invoice customer',
      'whatsapp invoice sharing',
      'how to send invoice to customer via whatsapp'
    ],
    lastUpdated: '2025-03-10',
  },

  // ====================================
  // CHUNK 11: Edit Existing Invoice
  // ====================================
  {
    id: 'invoice-edit-existing',
    category: 'invoices',
    title: 'How to Edit an Existing Invoice',
    subtitle: 'Modifying invoices after creation',
    difficulty: 'intermediate',
    estimatedTime: '3 minutes',
    priority: 84,
    description: 'Learn how to edit invoices after creating them, and important considerations.',
    content: `## How to Edit an Existing Invoice

### Quick Answer:

**Draft invoices:** ✅ Edit freely anytime
**Sent invoices:** ⚠️ Edit carefully (customer has copy)
**Paid invoices:** ❌ Don't edit (create credit note instead)

---

### How to Edit an Invoice:

**STEP 1: Find the Invoice**

- Go to Invoices page
- Find invoice you want to edit
- Click on invoice row

**STEP 2: Click "Edit" Button**

- Invoice detail page opens
- Look for **"Edit"** button (usually top-right)
- Or **"⋮"** menu → "Edit Invoice"
- Edit form opens

**STEP 3: Make Changes**

You can edit:
- ✅ Customer information (name, email, phone, address)
- ✅ Line items (add, remove, change qty/price)
- ✅ Discount amount
- ✅ VAT/Tax settings
- ✅ Payment terms
- ✅ Due date
- ✅ Notes and terms & conditions

**STEP 4: Save Changes**

- Click **"Save Changes"**
- Invoice updated
- Changes reflected immediately

---

### Important Considerations by Status:

### **Draft Status - Edit Freely** ✅

**Safe to edit:**
- Customer hasn't received invoice yet
- No external copies exist
- Edit as many times as needed
- No complications

**Example:**
You created invoice draft for ₦5M order, but manager says discount should be ₦200k instead of ₦100k. Edit freely.

---

### **Sent Status - Edit Carefully** ⚠️

**Consider before editing:**
- Customer already has original copy
- They may have printed or saved it
- Editing creates version mismatch
- Can cause confusion

**Best Practice:**
1. **Contact customer first** - "We need to revise invoice"
2. **Explain changes** - "Correcting line item quantity"
3. **Edit invoice** after customer agrees
4. **Re-send updated invoice** via WhatsApp/Email
5. **Mark old version as superseded** (note in comments)

**Example:**
Invoice sent for 50 phones ₦10M, but customer actually ordered 55 phones ₦11M.
- Call customer: "Need to update qty from 50 to 55"
- Customer agrees
- Edit invoice (50→55)
- Re-send: "Updated invoice attached"

---

### **Partial/Paid Status - DON'T Edit** ❌

**Why not to edit:**
- Payment already recorded against this invoice
- Accounting records reference this invoice
- Legal/audit trail concerns
- Can break payment history

**What to do instead:**

**Option 1: Create Credit Note**
- Issue credit note for incorrect amount
- Issue new corrected invoice
- Proper accounting trail

**Option 2: Add Notes**
- Add note explaining correction
- Don't change amounts
- Keep original for records

**Example:**
Invoice ₦5M paid, but you charged wrong VAT (8% instead of 7.5%).
- DON'T edit paid invoice
- Issue credit note for ₦25k overpayment
- Or note "VAT adjustment on next invoice"

---

### Real Nigerian Example:

**Computer Village - Invoice Correction**

**Situation:**
Created INV-089 for Slot Systems:
- 100x Samsung A14 @ ₦85,000 = ₦8,500,000
- Sent via WhatsApp yesterday
- Status: Sent

**Problem Discovered:**
Price should be ₦80,000 not ₦85,000!
Correct total: ₦8,000,000

**Correct Process:**

1. **Call customer** (Slot procurement)
   "We quoted wrong price, correcting from ₦8.5M to ₦8M"

2. **Customer agrees**
   "Yes, we noticed. Our PO says ₦80k per unit"

3. **Edit invoice:**
   - Go to INV-089
   - Click Edit
   - Change unit price: ₦85,000 → ₦80,000
   - Total updates: ₦8,000,000
   - Save changes

4. **Re-send invoice:**
   - Click "Share via WhatsApp"
   - Message: "Corrected invoice attached (price: ₦80k per unit)"
   - Customer receives updated version

5. **Add note:**
   - Internal note: "Price corrected 10 Dec from ₦85k to ₦80k, customer notified"

---

### What You CANNOT Edit:

❌ **Invoice number** (auto-generated, permanent)
❌ **Creation date** (audit trail)
❌ **Payment history** (cannot delete recorded payments)
❌ **User ID** (who created invoice)

---

### Tips for Safe Editing:

✅ **Edit Drafts freely** - no risk
✅ **For Sent invoices** - communicate with customer first
✅ **Never edit Paid invoices** - use credit notes
✅ **Add internal notes** explaining why edited
✅ **Re-send after editing** if customer has old copy
✅ **Keep paper trail** of all communications about changes`,
    keywords: [
      'edit invoice',
      'edit existing invoice',
      'how to edit invoice',
      'modify invoice',
      'change invoice',
      'update invoice',
      'edit invoice after sending',
      'how do i edit an existing invoice',
      'can i edit sent invoice'
    ],
    lastUpdated: '2025-03-10',
  },

  // ====================================
  // CHUNK 12: Delete or Cancel Invoice
  // ====================================
  {
    id: 'invoice-delete-cancel',
    category: 'invoices',
    title: 'Can I Delete or Cancel an Invoice?',
    subtitle: 'Deleting and canceling invoices',
    difficulty: 'intermediate',
    estimatedTime: '2 minutes',
    priority: 83,
    description: 'Learn when you can delete invoices and how to cancel sent invoices properly.',
    content: `## Can I Delete or Cancel an Invoice?

### Quick Answer:

**Draft invoices:** ✅ Can DELETE permanently
**Sent invoices:** ⚠️ Should CANCEL (not delete)
**Paid invoices:** ❌ NEVER delete (audit trail)

---

### How to Delete a Draft Invoice:

**When it's safe:**
- Invoice status: **Draft**
- Not sent to customer yet
- No payments recorded
- Just a template or mistake

**Steps:**
1. Go to Invoices page
2. Find draft invoice
3. Click on invoice row
4. Click **"Delete"** button (or ⋮ menu → Delete)
5. Confirm deletion
6. Invoice permanently removed ✅

**Example:**
You created invoice for ₦2M order, saved as Draft, then customer canceled order entirely. Safe to delete.

---

### How to Cancel a Sent Invoice:

**When to cancel (not delete):**
- Invoice status: **Sent** or **Overdue**
- Customer already received it
- Order canceled or mistake found
- Need to void the invoice

**Steps:**

**Option 1: Mark as Canceled/Void**
1. Go to Invoices page
2. Find sent invoice
3. Click on invoice
4. Click **"Cancel Invoice"** or **"Mark as Void"**
5. Add cancellation reason (required)
6. Invoice marked "Canceled" (kept for records)

**Option 2: Issue Credit Note**
1. Create credit note for full invoice amount
2. Sends to customer showing invoice voided
3. Proper accounting trail maintained

---

### Why NOT to Delete Sent/Paid Invoices:

**Legal & Audit Reasons:**
- ❌ Breaks accounting records
- ❌ Removes audit trail
- ❌ Can cause tax issues
- ❌ Customer may still have copy (confusing)
- ❌ Payment history references this invoice

**Better approach:** Mark as Canceled or Void

---

### Real Nigerian Examples:

**Example 1: Delete Draft - Order Canceled Before Sending**

**Scenario:**
- Created INV-055 for Chioma Electronics (₦3.5M)
- Saved as **Draft** to review with manager
- Customer calls: "Cancel order, found cheaper supplier"
- Invoice never sent to customer

**Action:**
- Delete INV-055 permanently ✅
- No complications (never sent)

---

**Example 2: Cancel Sent - Customer Returned Goods**

**Scenario:**
- Sent INV-078 to Slot Systems (₦8M phones)
- Status: **Sent** (customer received invoice via WhatsApp)
- Customer received phones, found 10 units defective
- Returns entire order

**Wrong approach:** Delete INV-078 ❌
- Customer already has copy
- Breaks records
- Confusing

**Correct approach:** Cancel INV-078 ✅
1. Click invoice → "Cancel Invoice"
2. Reason: "Full return - 10 defective units"
3. Status changes to: **Canceled**
4. Notify customer: "Invoice INV-078 canceled due to returns"
5. Invoice kept in system for records

---

**Example 3: NEVER Delete Paid - Incorrect Invoice Fully Paid**

**Scenario:**
- INV-092 for ₦5M (wrong amount, should be ₦4.5M)
- Customer already paid full ₦5M
- Status: **Paid**
- You owe customer ₦500k refund

**Wrong approach:** Delete INV-092 ❌
- Destroys payment records
- Accounting nightmare
- Tax audit issue

**Correct approach:** Issue Credit Note ✅
1. Keep INV-092 as Paid (don't touch!)
2. Issue credit note CR-001 for ₦500k
3. Refund ₦500k to customer
4. Or apply ₦500k to next order
5. Proper audit trail maintained

---

### Summary Table:

| Status | Delete? | Cancel? | Recommended Action |
|--------|---------|---------|-------------------|
| **Draft** | ✅ YES | N/A | Safe to delete permanently |
| **Sent** | ❌ NO | ✅ YES | Mark as Canceled/Void |
| **Partial** | ❌ NO | ✅ YES | Cancel + refund partial payment |
| **Paid** | ❌ NEVER | ⚠️ Rarely | Issue credit note instead |
| **Overdue** | ❌ NO | ✅ YES | Mark as Canceled/Void |

---

### Tips:

✅ **Delete only Draft invoices**
✅ **Cancel (don't delete) Sent invoices**
✅ **Never delete Paid invoices** - use credit notes
✅ **Always add cancellation reason** for records
✅ **Notify customer** when canceling sent invoice
✅ **Keep canceled invoices** for audit trail`,
    keywords: [
      'delete invoice',
      'cancel invoice',
      'can i delete invoice',
      'how to delete invoice',
      'how to cancel invoice',
      'void invoice',
      'remove invoice',
      'can i delete sent invoice',
      'delete or cancel invoice'
    ],
    lastUpdated: '2025-03-10',
  },

  // ====================================
  // CHUNK 13: VAT Calculation
  // ====================================
  {
    id: 'invoice-vat-calculation',
    category: 'invoices',
    title: 'How is VAT Calculated on Invoices?',
    subtitle: 'Understanding VAT/tax calculation',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 86,
    description: 'Learn how VAT (Value Added Tax) is calculated on invoices in Nigeria.',
    content: `## How is VAT Calculated on Invoices?

### Nigerian VAT Standard Rate: **7.5%**

VAT (Value Added Tax) in Nigeria is currently **7.5%** as of 2025.

---

### How VAT is Calculated:

**Basic Formula:**
\`\`\`
VAT Amount = (Subtotal - Discount) × VAT Rate
Total = (Subtotal - Discount) + VAT
\`\`\`

**Step-by-Step:**

1. **Calculate Subtotal** (sum all line items)
2. **Apply Discount** (if any)
3. **Calculate amount after discount**
4. **Apply VAT rate** (7.5% in Nigeria)
5. **Add VAT to get Total**

---

### Example 1: Simple VAT Calculation (No Discount)

**Line Items:**
- 10× Samsung TV @ ₦250,000 = ₦2,500,000
- 5× LG AC @ ₦180,000 = ₦900,000

**Calculation:**
\`\`\`
Subtotal: ₦2,500,000 + ₦900,000 = ₦3,400,000
Discount: ₦0
After Discount: ₦3,400,000

VAT (7.5%): ₦3,400,000 × 0.075 = ₦255,000

Total: ₦3,400,000 + ₦255,000 = ₦3,655,000
\`\`\`

**Invoice Shows:**
- Subtotal: ₦3,400,000
- VAT (7.5%): ₦255,000
- **Total: ₦3,655,000**

---

### Example 2: VAT with Discount

**Line Items:**
- 50× Samsung A14 @ ₦85,000 = ₦4,250,000

**Discount:** ₦250,000

**Calculation:**
\`\`\`
Subtotal: ₦4,250,000
Discount: -₦250,000
After Discount: ₦4,000,000

VAT (7.5%): ₦4,000,000 × 0.075 = ₦300,000

Total: ₦4,000,000 + ₦300,000 = ₦4,300,000
\`\`\`

**Invoice Shows:**
- Subtotal: ₦4,250,000
- Discount: -₦250,000
- After Discount: ₦4,000,000
- VAT (7.5%): ₦300,000
- **Total: ₦4,300,000**

**Important:** VAT calculated AFTER discount is applied!

---

### How to Add VAT to Invoice:

**When Creating Invoice:**

1. Fill in customer details and line items
2. Scroll to **"Adjustments"** section
3. Toggle **"Include Tax"** checkbox ✅
4. VAT rate field appears
5. Default: **7.5%** (Nigeria standard)
6. Can change if needed (e.g., 0% for exports)
7. VAT auto-calculates
8. Shows in invoice totals

**Example in Storehouse:**
\`\`\`
[ ] ADD TAX/VAT TO INVOICE

After toggling ON:

[✓] ADD TAX/VAT TO INVOICE

Tax Rate (%): [7.5]
Nigeria VAT standard rate is 7.5%
\`\`\`

---

### When to Charge VAT:

**✅ Charge VAT (7.5%) for:**
- Sales to Nigerian businesses
- Sales to Nigerian individuals
- Domestic transactions
- Taxable goods/services

**❌ Don't Charge VAT (0%) for:**
- Exports (sales outside Nigeria)
- VAT-exempt items (some foods, medicines)
- Sales to free trade zones
- Certain financial services

**Check with accountant** if unsure about specific products.

---

### Real Nigerian B2B Example:

**Computer Village Electronics - Wholesale Invoice**

**Customer:** Slot Systems Limited
**Order:** Samsung phones + accessories

**Line Items:**
1. 100× Samsung Galaxy A14 @ ₦80,000 = ₦8,000,000
2. 100× Phone cases @ ₦2,000 = ₦200,000
3. 50× Chargers @ ₦3,500 = ₦175,000

**Calculation:**
\`\`\`
Subtotal: ₦8,000,000 + ₦200,000 + ₦175,000 = ₦8,375,000
Discount: ₦375,000 (bulk discount)
After Discount: ₦8,000,000

VAT (7.5%): ₦8,000,000 × 0.075 = ₦600,000

Total: ₦8,000,000 + ₦600,000 = ₦8,600,000
\`\`\`

**Invoice Breakdown:**
\`\`\`
Subtotal: ₦8,375,000
Discount: -₦375,000
Subtotal after discount: ₦8,000,000
VAT (7.5%): +₦600,000
────────────────────────
TOTAL: ₦8,600,000
\`\`\`

---

### Can I Change VAT Rate?

**YES**, you can change the rate if needed:

**Common scenarios:**
- **0%** - Exports, exempt items
- **5%** - Reduced rate (if government changes)
- **7.5%** - Standard Nigeria VAT (default)
- **10%** - Some luxury items (if applicable)

**How to change:**
1. Toggle "Include Tax" checkbox
2. VAT rate field appears
3. Change from 7.5% to desired rate
4. VAT recalculates automatically

---

### Tips:

✅ **Always include VAT** for B2B sales in Nigeria (7.5%)
✅ **Discount applied BEFORE VAT** (not after)
✅ **VAT calculated automatically** when you toggle checkbox
✅ **Keep VAT records** for tax filing
✅ **Charge 0% VAT** only for exports or exempt items`,
    keywords: [
      'vat calculation',
      'how is vat calculated',
      'invoice vat',
      'calculate vat',
      'vat on invoice',
      'tax calculation invoice',
      'how is vat calculated on invoice',
      'nigeria vat rate',
      'add vat to invoice'
    ],
    lastUpdated: '2025-03-10',
  },

  // ====================================
  // CHUNK 14: Apply Discount
  // ====================================
  {
    id: 'invoice-apply-discount',
    category: 'invoices',
    title: 'How to Apply Discount to Invoice',
    subtitle: 'Adding discounts to invoices',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 87,
    description: 'Learn how to add discounts to invoices and how they affect totals.',
    content: `## How to Apply Discount to Invoice

### Quick Steps:

1. Create invoice with line items
2. Scroll to **"Adjustments"** section
3. Find **"Discount (₦)"** field
4. Enter discount amount in Naira
5. Total auto-updates
6. Save invoice

---

### How Discount Works:

**Discount is applied:**
- After subtotal calculated (sum of all line items)
- Before VAT/tax calculated
- As a **fixed Naira amount** (not percentage)

**Calculation Order:**
1. **Subtotal** = Sum all line items
2. **Subtract Discount** = Subtotal - Discount
3. **Calculate VAT** (if enabled) = After Discount × VAT%
4. **Total** = After Discount + VAT

---

### Example: Invoice with Discount

**Line Items:**
- 50× Samsung A14 @ ₦85,000 = ₦4,250,000

**Discount:** ₦500,000 (bulk order discount)

**Calculation:**
\`\`\`
Subtotal: ₦4,250,000
Discount: -₦500,000
After Discount: ₦3,750,000
VAT (7.5%): ₦3,750,000 × 0.075 = ₦281,250
Total: ₦3,750,000 + ₦281,250 = ₦4,031,250
\`\`\`

**Invoice Shows:**
- Subtotal: ₦4,250,000
- Discount: -₦500,000
- After Discount: ₦3,750,000
- VAT (7.5%): ₦281,250
- **Total: ₦4,031,250**

**Customer Savings:** ₦500,000 + saves on VAT too!

---

### How to Add Discount in Storehouse:

**When Creating Invoice:**

1. Fill customer details
2. Add all line items
3. Scroll to **"Adjustments"** section
4. Find **"Discount (₦)"** field
5. Click and type discount amount
   - Example: Type "500000" for ₦500k discount
6. System shows: **-₦500,000**
7. Total updates automatically
8. Continue with VAT (if needed)
9. Save invoice

**In the interface:**
\`\`\`
Adjustments

DISCOUNT (₦)
[500000]

Subtotal: ₦4,250,000
Discount: -₦500,000
Total: ₦3,750,000
\`\`\`

---

### Common Discount Scenarios:

**Scenario 1: Bulk Order Discount**

Customer orders 100 units:
- Regular price: ₦10,000,000
- Bulk discount: ₦500,000 (5%)
- Final: ₦9,500,000

**Scenario 2: Promotional Discount**

Special promotion week:
- Order total: ₦2,000,000
- Promo discount: ₦200,000 (10% off)
- Final: ₦1,800,000

**Scenario 3: Loyalty Customer Discount**

Repeat customer discount:
- Order: ₦5,000,000
- Loyalty discount: ₦250,000
- Final: ₦4,750,000

**Scenario 4: Early Payment Discount**

Pay within 7 days discount:
- Order: ₦3,000,000
- Early pay discount: ₦150,000 (5%)
- Final: ₦2,850,000

---

### Real Nigerian Example:

**Balogun Market Fashion Wholesale**

**Customer:** Treasure's Fashion Hub (loyal customer)
**Order:** Fabric wholesale

**Line Items:**
1. 200m Ankara fabric @ ₦3,500/m = ₦700,000
2. 150m Lace fabric @ ₦8,000/m = ₦1,200,000
3. 100m Cotton @ ₦2,000/m = ₦200,000

**Calculation WITHOUT discount:**
\`\`\`
Subtotal: ₦2,100,000
VAT (7.5%): ₦157,500
Total: ₦2,257,500
\`\`\`

**Customer asks:** "Can you give me discount? I'm buying in bulk."

**You offer:** ₦200,000 discount (loyal customer + bulk order)

**Calculation WITH discount:**
\`\`\`
Subtotal: ₦2,100,000
Discount: -₦200,000
After Discount: ₦1,900,000
VAT (7.5%): ₦142,500
Total: ₦2,042,500
\`\`\`

**Customer saves:** ₦215,000 total! (₦200k discount + ₦15k on VAT)

**In Storehouse:**
- Go to Adjustments section
- Enter Discount: 200000
- Shows: -₦200,000
- Total updates to ₦2,042,500
- Save invoice

---

### Percentage vs Fixed Amount:

**Storehouse uses FIXED AMOUNT** in Naira (₦):
- Not percentage-based
- You enter exact amount: ₦500,000
- More flexible and transparent

**To calculate percentage discount:**
1. Calculate manually: Subtotal × Percentage
2. Enter the result in discount field

**Example - 10% discount:**
- Subtotal: ₦5,000,000
- 10% of ₦5M = ₦500,000
- Enter in discount field: 500000
- Shows: -₦500,000

---

### Tips:

✅ **Discount is optional** - leave field empty (or 0) for no discount
✅ **Enter Naira amount** (not percentage)
✅ **Discount applied BEFORE VAT** - customer saves on tax too!
✅ **Use discounts for:**
  - Bulk orders (5-10% common)
  - Loyal customers (3-5%)
  - Early payment (2-3%)
  - Promotions (varies)
✅ **Document reason** in invoice notes ("Bulk order discount")`,
    keywords: [
      'apply discount',
      'invoice discount',
      'how to apply discount',
      'add discount to invoice',
      'discount on invoice',
      'how to discount invoice',
      'bulk discount',
      'how to apply discount to invoice'
    ],
    lastUpdated: '2025-03-10',
  },

  // ====================================
  // CHUNK 15: Search for Invoice
  // ====================================
  {
    id: 'invoice-search-customer',
    category: 'invoices',
    title: 'How to Search for Invoice by Customer Name',
    subtitle: 'Finding invoices quickly',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 81,
    description: 'Learn how to quickly find invoices by searching for customer names.',
    content: `## How to Search for Invoice by Customer Name

### Quick Steps:

1. Go to **Invoices** page
2. Look for **Search bar** (top of page)
3. Type customer name
4. Matching invoices appear instantly
5. Click invoice to view

---

### Using the Search Bar:

**Location:**
- Top of Invoices page
- Above invoice table
- Next to filter tabs

**What you can search:**
- ✅ Customer name
- ✅ Customer email
- ✅ Invoice number
- ✅ Customer phone

**Search is instant:**
- Results filter as you type
- No need to press Enter
- Shows all matching invoices

---

### Example Searches:

**Search by Full Name:**
\`\`\`
Type: "Chioma Electronics"
Results: All invoices for Chioma Electronics Ltd
\`\`\`

**Search by Partial Name:**
\`\`\`
Type: "Chioma"
Results:
- Chioma Electronics Ltd
- Chioma Fashion Hub
- Any customer with "Chioma" in name
\`\`\`

**Search by Email:**
\`\`\`
Type: "orders@chioma"
Results: All invoices with that email
\`\`\`

**Search by Invoice Number:**
\`\`\`
Type: "INV-045"
Results: Only INV-045
\`\`\`

---

### Real Nigerian Example:

**Computer Village Electronics - Finding Customer Invoice**

**Scenario:**
Customer calls: "Hi, this is Slot Systems. What's the status of our recent order?"

**You need to find their invoice:**

**Step 1:** Go to Invoices page

**Step 2:** Click search bar

**Step 3:** Type: "Slot"

**Results appear:**
\`\`\`
INV-078 | Slot Systems Limited | ₦8,500,000 | Sent
INV-045 | Slot Systems Limited | ₦5,200,000 | Paid
INV-023 | Slot Systems Limited | ₦3,800,000 | Paid
\`\`\`

**Step 4:** Click most recent (INV-078)

**Step 5:** Tell customer: "Your invoice INV-078 for ₦8.5M shows status Sent, due in 15 days"

**Total time:** 5 seconds! ⚡

---

### Advanced Filtering:

**Combine Search + Status Filter:**

**Example:** Find all OVERDUE invoices for customer "Treasure"

1. Type "Treasure" in search bar
2. Click **"Overdue"** status tab
3. Shows only overdue invoices for Treasure's Fashion Hub

**Result:**
\`\`\`
INV-092 | Treasure's Fashion Hub | ₦2,500,000 | Overdue (5 days)
\`\`\`

---

### Other Ways to Find Invoices:

**Method 1: Filter by Status**

Don't remember customer name? Use status tabs:
- **All** - Every invoice
- **Draft** - Unsent invoices
- **Sent** - Awaiting payment
- **Partial** - Partially paid
- **Overdue** - Late payments
- **Paid** - Completed

**Method 2: Sort by Date**

Click **"Issue Date"** or **"Due Date"** column header:
- Sort newest to oldest
- Sort oldest to newest
- Find recent invoices quickly

**Method 3: Browse Table**

Small business with few invoices:
- Just scroll through invoice table
- Look for customer name visually

---

### Tips:

✅ **Search works instantly** - no delay
✅ **Partial names work** - type "Chi" to find "Chioma Electronics"
✅ **Case insensitive** - "chioma" = "CHIOMA" = "Chioma"
✅ **Combine search + filters** for precision
✅ **Search by invoice number** for exact match (INV-045)
✅ **Use email search** if you forget customer name`,
    keywords: [
      'search invoice',
      'find invoice',
      'search customer name',
      'how to search invoice',
      'find invoice by customer',
      'invoice search',
      'search for invoice',
      'how to search for invoice by customer name',
      'find customer invoice'
    ],
    lastUpdated: '2025-03-10',
  },

  // ====================================
  // CHUNK 16: Payment Terms Explained (NEW)
  // ====================================
  {
    id: 'invoice-payment-terms-details',
    category: 'invoices',
    title: 'Payment Terms Explained - Net 15, Net 30',
    subtitle: 'Understanding payment term options',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 89,
    description: 'Complete guide to understanding invoice payment terms and which to choose.',
    content: `## Invoice Payment Terms - Complete Guide

### What Are Payment Terms?

**Payment Terms** = When customer must pay the invoice

Common format: "Net X days" (e.g., Net 15, Net 30)

**"Net 15"** means:
- Payment due within **15 days** from invoice date
- Customer has 15 days to pay
- After 15 days = **Overdue**

---

### All Payment Term Options:

**1. Due on Receipt** (Net 0)
- Payment required **immediately**
- When customer receives invoice
- No grace period

**Use for:**
- First-time customers
- Small orders
- High-risk customers
- Cash flow urgent

---

**2. Net 7 Days**
- Payment due **7 days** from invoice date
- One week to pay

**Use for:**
- Regular customers
- Small-medium orders (₦500k - ₦2M)
- Fast-moving goods
- Nigerian norm for fashion/food

---

**3. Net 15 Days** ⭐ **MOST COMMON**
- Payment due **15 days** from invoice date
- Two weeks to pay
- **Standard** B2B term in Nigeria

**Use for:**
- Most B2B transactions
- Established customers
- Medium orders (₦2M - ₦10M)
- Electronics/wholesale

**Example:**
- Issue Date: Dec 1
- Due Date: Dec 16 (15 days later)

---

**4. Net 30 Days**
- Payment due **30 days** from invoice date
- One month to pay

**Use for:**
- Large corporations
- Government contracts
- Very large orders (₦10M+)
- Trusted long-term customers

**Example:**
- Issue Date: Dec 1
- Due Date: Dec 31 (30 days later)

---

**5. Net 60 Days**
- Payment due **60 days** from invoice date
- Two months to pay

**Use for:**
- Government agencies
- Multinational corporations
- Very large contracts (₦50M+)

**Caution:** Long cash flow wait!

---

**6. Custom**
- Set your own specific due date
- Not based on issue date formula

**Use for:**
- Special arrangements
- Agreed payment schedules
- Irregular terms

**Example:**
- Issue Date: Dec 1
- Custom Due Date: Jan 15 (45 days)

---

### How Due Date is Calculated:

**Automatic Calculation:**

System auto-calculates due date when you choose payment terms.

**Examples:**

| Issue Date | Terms | Due Date | Days |
|------------|-------|----------|------|
| Dec 1 | Net 7 | Dec 8 | 7 |
| Dec 1 | Net 15 | Dec 16 | 15 |
| Dec 1 | Net 30 | Dec 31 | 30 |
| Dec 1 | Net 60 | Jan 30 | 60 |

**In Storehouse:**
1. Select Issue Date: Dec 1
2. Choose Payment Terms: Net 15
3. Due Date auto-fills: Dec 16 ✅

---

### Nigerian Business Standard Practices:

**Industry Norms:**

**Electronics/Phones:**
- Net 15 days (standard)
- Net 30 days (large orders)

**Fashion/Textiles:**
- Net 7-15 days (fast-moving)
- Due on Receipt (new customers)

**Construction Materials:**
- Net 30 days (project-based)
- Net 60 days (government)

**Food/Provisions:**
- Net 7 days (perishable)
- Due on Receipt (small shops)

**Computer Village (Lagos):**
- Net 15 is the norm
- Some wholesalers offer Net 30 for trusted buyers

---

### Choosing the Right Terms:

**Consider:**

**Customer History:**
- New customer → Net 7 or Due on Receipt
- Regular customer → Net 15
- Trusted long-term → Net 30

**Order Size:**
- Small (<₦500k) → Net 7
- Medium (₦500k-₦5M) → Net 15
- Large (₦5M+) → Net 30

**Your Cash Flow:**
- Need cash quickly → Net 7 or Due on Receipt
- Can wait → Net 15-30

**Industry Standard:**
- Follow what competitors offer
- Meet customer expectations

**Risk Level:**
- High risk → Shorter terms (Net 7)
- Low risk → Longer terms (Net 30)

---

### Real Example - Negotiation:

**Computer Village Electronics**

**New Customer (Slot Systems) First Order:**

**Customer asks:** "What are your payment terms?"

**You offer:** "Net 15 days is our standard"

**Customer:** "We're a large company, can we get Net 30?"

**You respond:**
"For first order, let's do Net 15. After you establish payment history, we can move to Net 30 for future orders."

**Result:**
- Invoice: ₦8.5M
- Terms: Net 15
- Customer pays on time (Day 12) ✅
- Next order: Offer Net 30 as promised
- Trust built! 🤝

---

### What Happens When Terms Expire:

**Net 15 Example:**
- Issue Date: Dec 1
- Due Date: Dec 16
- Dec 16 11:59 PM → Still OK
- Dec 17 12:00 AM → **OVERDUE** (Auto-marked by system)

**System Actions:**
- Status changes to: **Overdue (Red)**
- Shows "X days overdue"
- You receive notification
- Time to follow up with customer

---

### Tips:

✅ **Start conservative** (Net 7-15) for new customers
✅ **Net 15 is safest default** for most B2B
✅ **Reward loyalty** with longer terms (Net 30)
✅ **Match industry standards** to stay competitive
✅ **Consider cash flow** before offering long terms
✅ **Document terms clearly** in invoice
✅ **Send reminders** 2-3 days before due date`,
    keywords: [
      'payment terms',
      'net 15',
      'net 30',
      'net 7',
      'due on receipt',
      'invoice payment terms',
      'what is net 15',
      'what is net 30',
      'payment terms explained',
      'invoice terms'
    ],
    lastUpdated: '2025-03-10',
  },

  // ====================================
  // CHUNK 17: Invoice Calculations Overview (NEW)
  // ====================================
  {
    id: 'invoice-calculations-breakdown',
    category: 'invoices',
    title: 'Invoice Calculations Explained',
    subtitle: 'How totals are calculated',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 84,
    description: 'Complete breakdown of how invoice totals are calculated from line items to final total.',
    content: `## How Invoice Calculations Work

### Complete Calculation Flow:

**Step 1:** Line Items → **Subtotal**
**Step 2:** Subtotal - Discount → **After Discount**
**Step 3:** After Discount × VAT% → **VAT Amount**
**Step 4:** After Discount + VAT → **Grand Total**

---

### Step-by-Step Example:

**Line Items:**
- 10× Samsung TV @ ₦250,000 = ₦2,500,000
- 5× LG AC @ ₦180,000 = ₦900,000
- 3× Refrigerator @ ₦320,000 = ₦960,000

**STEP 1: Calculate Subtotal**
\`\`\`
Subtotal = ₦2,500,000 + ₦900,000 + ₦960,000
Subtotal = ₦4,360,000
\`\`\`

**STEP 2: Apply Discount** (if any)
\`\`\`
Discount = ₦360,000 (bulk order)
After Discount = ₦4,360,000 - ₦360,000
After Discount = ₦4,000,000
\`\`\`

**STEP 3: Calculate VAT** (7.5% Nigeria standard)
\`\`\`
VAT = ₦4,000,000 × 0.075
VAT = ₦300,000
\`\`\`

**STEP 4: Calculate Grand Total**
\`\`\`
Total = ₦4,000,000 + ₦300,000
Total = ₦4,300,000
\`\`\`

---

### Invoice Breakdown Display:

**What customer sees:**

\`\`\`
Line Items:
  10× Samsung 55" Smart TV @ ₦250,000    ₦2,500,000
  5× LG Inverter AC @ ₦180,000           ₦900,000
  3× Samsung Refrigerator @ ₦320,000     ₦960,000
                                    ─────────────
Subtotal:                                ₦4,360,000
Discount:                                -₦360,000
                                    ─────────────
After Discount:                          ₦4,000,000
VAT (7.5%):                              +₦300,000
                                    ═════════════
TOTAL:                                   ₦4,300,000
\`\`\`

---

### Each Line Item Calculation:

**Formula:**
\`\`\`
Line Total = Quantity × Unit Price
\`\`\`

**Example:**
\`\`\`
Item: Samsung Smart TV
Quantity: 10 units
Unit Price: ₦250,000
Line Total = 10 × ₦250,000 = ₦2,500,000
\`\`\`

**All line totals sum to Subtotal**

---

### Order of Operations (Important!):

**Correct Order:**
1. ✅ Sum line items → Subtotal
2. ✅ Apply discount → After Discount
3. ✅ Calculate VAT on discounted amount
4. ✅ Add VAT → Grand Total

**Why Order Matters:**

**CORRECT** (Discount before VAT):
\`\`\`
Subtotal: ₦4,360,000
- Discount: ₦360,000
= ₦4,000,000
VAT (7.5%): ₦300,000
Total: ₦4,300,000
\`\`\`

**WRONG** (VAT before discount):
\`\`\`
Subtotal: ₦4,360,000
VAT (7.5%): ₦327,000
- Discount: ₦360,000
Total: ₦4,327,000 (INCORRECT!)
\`\`\`

**Storehouse automatically uses CORRECT order!**

---

### Real Nigerian Example - Complete Breakdown:

**Balogun Market Fashion Wholesale**

**Customer:** Treasure's Fashion Hub
**Order:** Various fabrics

**Line Items:**
1. 200m Ankara @ ₦3,500/m = ₦700,000
2. 150m Lace @ ₦8,000/m = ₦1,200,000
3. 100m Cotton @ ₦2,000/m = ₦200,000
4. 50m Silk @ ₦15,000/m = ₦750,000

**Calculations:**

**Subtotal:**
\`\`\`
₦700,000 + ₦1,200,000 + ₦200,000 + ₦750,000
= ₦2,850,000
\`\`\`

**Discount:** ₦350,000 (loyal customer + bulk)
\`\`\`
After Discount = ₦2,850,000 - ₦350,000
= ₦2,500,000
\`\`\`

**VAT (7.5%):**
\`\`\`
VAT = ₦2,500,000 × 0.075
= ₦187,500
\`\`\`

**Grand Total:**
\`\`\`
Total = ₦2,500,000 + ₦187,500
= ₦2,687,500
\`\`\`

**Invoice Shows:**
\`\`\`
Line Items (4 items):              ₦2,850,000
Discount (Loyal customer):         -₦350,000
Subtotal after discount:           ₦2,500,000
VAT (7.5%):                        +₦187,500
═══════════════════════════════════════════
TOTAL DUE:                         ₦2,687,500
\`\`\`

---

### Common Calculation Scenarios:

**Scenario 1: No Discount, No VAT**
\`\`\`
Line Items: ₦5,000,000
Discount: ₦0
VAT: 0%
Total: ₦5,000,000
\`\`\`
(Simplest case - just sum line items)

---

**Scenario 2: Discount Only (No VAT)**
\`\`\`
Line Items: ₦5,000,000
Discount: -₦500,000
VAT: 0%
Total: ₦4,500,000
\`\`\`
(Common for exports - 0% VAT)

---

**Scenario 3: VAT Only (No Discount)**
\`\`\`
Line Items: ₦5,000,000
Discount: ₦0
VAT (7.5%): +₦375,000
Total: ₦5,375,000
\`\`\`

---

**Scenario 4: Both Discount and VAT** ⭐ Most Common
\`\`\`
Line Items: ₦5,000,000
Discount: -₦500,000
After Discount: ₦4,500,000
VAT (7.5%): +₦337,500
Total: ₦4,837,500
\`\`\`

---

### Auto-Calculation in Storehouse:

**You don't calculate manually!**

System auto-calculates when you:
1. ✅ Enter line item quantity
2. ✅ Enter line item price
3. ✅ Add discount amount
4. ✅ Toggle VAT checkbox

**Everything updates in real-time:**
- Line totals
- Subtotal
- After discount
- VAT amount
- Grand total

**Example - As you type:**
\`\`\`
Type quantity: 10
Type price: 250000
→ Line total instantly shows: ₦2,500,000

Add discount: 50000
→ Total updates: ₦2,450,000

Toggle VAT:
→ VAT shows: ₦183,750
→ Total updates: ₦2,633,750
\`\`\`

All automatic! ✅

---

### Balance Calculation (After Payments):

**When payments recorded:**

\`\`\`
Total: ₦5,000,000
Payment 1: -₦2,000,000
Balance: ₦3,000,000

Payment 2: -₦1,500,000
Balance: ₦1,500,000

Payment 3: -₦1,500,000
Balance: ₦0 (Fully Paid!)
\`\`\`

**Formula:**
\`\`\`
Balance = Total - Sum of All Payments
\`\`\`

---

### Tips:

✅ **Don't calculate manually** - system does it automatically
✅ **Discount before VAT** (always correct order)
✅ **VAT calculated on discounted amount** (saves customer money)
✅ **All calculations in Kobo internally** (accurate to ₦0.01)
✅ **Check "After Discount" amount** before finalizing
✅ **Grand Total = what customer pays**`,
    keywords: [
      'invoice calculations',
      'how invoice calculated',
      'invoice total calculation',
      'subtotal discount vat',
      'invoice math',
      'calculate invoice total',
      'invoice breakdown',
      'how are invoices calculated',
      'invoice amount calculation'
    ],
    lastUpdated: '2025-03-10',
  },
];
