# AI CHAT WIDGET - IMPLEMENTATION GUIDE
## How to Train Claude to Answer ALL Storehouse Questions Accurately

**Document Purpose:** Guide for integrating the comprehensive feature inventory into AI chat responses

---

## CRITICAL CONTEXT FOR AI RESPONSES

### 1. What Storehouse IS (Simple Explanation)
```
Storehouse is a business management app that helps Nigerian entrepreneurs:
- Manage products and inventory
- Record sales (cash and credit)
- Track customers and their purchases
- Create professional invoices
- Run an online store
- Manage staff with different roles
- Send receipts via WhatsApp
- Get insights on profits and trends
```

### 2. What Storehouse is NOT
- Not a full accounting software (basic expense tracking only)
- Not a CRM (basic customer tracking, not advanced)
- Not FMCG/warehouse management software
- Not a marketplace (connects to customers, not a platform)
- Not a bank or payment processor (integrates with OPay, Moniepoint)

---

## KEY CONVERSATION PATTERNS TO SUPPORT

### Pattern 1: "How do I...?" (Task-Based)
**Examples:**
- "How do I add a product?"
- "How do I record a sale?"
- "How do I see my profits?"
- "How do I add staff?"

**Response Strategy:**
1. Identify the feature they're asking about
2. Provide step-by-step instructions
3. Link to related Help Center guide
4. Mention any prerequisites (e.g., "Pro plan only")
5. Offer troubleshooting if needed

**Key Components to Reference:**
- `/src/components/Dashboard.tsx` - Main interface
- `/src/components/RecordSaleModal.tsx` - Sale recording
- `/src/pages/Settings.jsx` - Settings access
- `/src/pages/StaffManagement.tsx` - Staff setup

---

### Pattern 2: "What is...?" (Feature Explanation)
**Examples:**
- "What is a credit sale?"
- "What are product variants?"
- "What is the referral system?"
- "What are payment methods?"

**Response Strategy:**
1. Explain the concept clearly
2. Give practical example from Nigerian context
3. Show where to find it in the app
4. Explain the benefit
5. Link to detailed guide

**Critical Concepts to Explain:**
- **Cash vs Credit Sale:** Cash = paid now, Credit = customer owes money
- **Product Variants:** Different sizes/colors of same product
- **Invoices:** Professional B2B sales documents
- **Debt Tracking:** Following money customers owe
- **Staff Roles:** Owner (all access), Manager (products+sales), Cashier (sales only)
- **Payment Methods:** Different ways customers can pay
- **Sales Channels:** Where sales come from (Online, WhatsApp, Retail)

---

### Pattern 3: "Why can't I...?" (Troubleshooting)
**Examples:**
- "Why can't I see the Staff menu?"
- "Why won't my images upload?"
- "Why can't I record a sale offline?"
- "Why is my profit showing negative?"

**Response Strategy:**
1. Identify the most likely cause
2. Provide diagnosis steps
3. Give step-by-step fix
4. Mention workarounds if applicable
5. Suggest when to contact support

**Common Issues to Handle:**
- Feature availability by role (staff can't add products)
- Offline mode limitations (no product creation offline)
- Image upload issues (size, format)
- Missing data (offline queue not synced)
- Negative stock (enabled in settings)

---

### Pattern 4: "Should I use...?" (Decision Help)
**Examples:**
- "Should I use cash or credit for this customer?"
- "Should I upgrade to Pro?"
- "Should I create an invoice or just record sale?"
- "Should I hire staff or manage alone?"

**Response Strategy:**
1. Ask clarifying question
2. Present pros/cons
3. Recommend based on context
4. Show cost/benefit if applicable
5. Provide next steps

**Decision Frameworks:**
- **Cash vs Credit:** Use credit for known customers, cash for walk-ins
- **Invoice vs Sale:** Invoice for B2B/wholesale, Sale for retail
- **Online Store:** If selling to customers who don't visit physically
- **Staff:** When you process 20+ sales/day or need someone full-time

---

### Pattern 5: "Where do I...?" (Navigation Help)
**Examples:**
- "Where do I find my customers?"
- "Where do I set up payment methods?"
- "Where do I send WhatsApp receipts?"
- "Where do I see low stock items?"

**Response Strategy:**
1. Name the exact page/section
2. Give navigation path
3. Use landmark phrases ("gear icon", "bottom menu", etc.)
4. Provide shortcut if available
5. Screenshot or button reference helpful

**Navigation Quick Reference:**
- Dashboard: Main screen after login
- Settings: Click gear icon → Business Settings
- Customers: Navigation menu → Customers
- Staff: Navigation menu → Staff (owner only)
- Invoices: Navigation menu → Invoices
- Reviews: Navigation menu → Reviews
- Referrals: Navigation menu → Referrals

---

## FEATURE-SPECIFIC RESPONSE TEMPLATES

### Products & Inventory
**Key Points:**
- Products are your items for sale
- Set cost price (what you paid) and selling price (what you charge)
- Profit = (Selling Price - Cost Price) × Quantity
- Reorder level = when to notify you of low stock
- Variants = different versions (sizes, colors)
- Can upload multiple images
- Public products show in online store, private don't

**Common Questions:**
- Q: "Can I edit a product after creating it?"
  A: Yes! Click the product row, edit any field, save. Stock still updates correctly.

- Q: "What if I sell more than I have in stock?"
  A: Stock can go negative (default). You can disable in Settings if you prefer.

- Q: "How many products can I add?"
  A: Unlimited! Even on Free plan.

---

### Sales & Revenue
**Key Points:**
- Each sale records: product, quantity, customer, payment method, channel
- Profit auto-calculated based on cost vs selling price
- Can record sales offline, syncs when online
- Can undo last sale with 1 click
- Today's sales visible on dashboard
- Sales channel helps track where customers come from

**Common Questions:**
- Q: "Why is my profit negative?"
  A: Probably selling below cost price. Check if selling price < cost price.

- Q: "Can I change the price of a sale?"
  A: Override in Record Sale modal. Default is product price, but you can type different price.

- Q: "Where do I see all my sales?"
  A: Dashboard → Sales History (or swipe on today's sales widget).

---

### Customers & Debt
**Key Points:**
- Customers aggregated from sales and manual debt entries
- Track total spent, purchase count, last purchase date
- Can see individual customer history
- Debt = money customer owes from credit sales
- Can create manual debt entry for existing debt
- Can record payment to reduce debt
- WhatsApp reminders for overdue debt

**Common Questions:**
- Q: "How do I know if a customer owes me money?"
  A: Go to Customers page, overdue debts highlighted at top, red indicator shows overdue.

- Q: "Can I remind a customer about debt via WhatsApp?"
  A: Yes! In Customer Debt Drawer, click "Send Reminder" (requires WhatsApp setup).

- Q: "What if customer pays partial amount?"
  A: Record that amount, debt status becomes "Partial", shows remaining balance.

---

### Invoices
**Key Points:**
- Professional documents for B2B sales
- Can create, send, and track payment
- Auto-generate invoice number
- Track status: Draft → Sent → Viewed → Partial → Paid
- Customer gets public link (no login needed)
- Can add multiple line items
- Tax auto-calculated if enabled
- PDF download available

**Common Questions:**
- Q: "How do I send an invoice to customer?"
  A: Create invoice → click "Send" → copy link or send via WhatsApp/Email.

- Q: "Can customer pay directly from invoice?"
  A: If you set up OPay/Moniepoint, yes! "Pay" button on invoice.

- Q: "What if customer pays late?"
  A: Invoice shows overdue when past due date. Can send reminder.

---

### Payment Methods
**Key Points:**
- Multiple payment methods supported: Cash, Bank, OPay, Moniepoint, Card, POS, etc.
- Each sale records payment method used
- Can set up multiple methods
- OPay/Moniepoint for online store
- Bank account for manual transfers
- Paystack for storefront payments

**Common Questions:**
- Q: "Do I have to set up payment methods?"
  A: No! But highly recommended. Helps track customer preferences and get online payments.

- Q: "How long does OPay payment take?"
  A: Usually instant, sometimes 5-30 minutes.

- Q: "Can I accept multiple payment methods?"
  A: Yes! Set up as many as you want. Customer chooses at checkout.

---

### Staff Management
**Key Points:**
- 3 roles: Owner (full access), Manager (add products + view sales), Cashier (record sales only)
- Each staff member has PIN (no password)
- All sales tracked by staff member
- Can see staff performance (sales count, amount)
- Staff can't see profit margins (Cashier role)

**Common Questions:**
- Q: "How do I add a staff member?"
  A: Settings → Staff → "+ Add Staff" → Enter name, set role, create PIN.

- Q: "Can my cashier see how much profit I'm making?"
  A: Not if they're Cashier role. Only Owner and Manager can see profit.

- Q: "How do staff members log in?"
  A: No password needed! Select "Login as Staff" → enter their PIN.

---

### Inventory Management
**Key Points:**
- Low stock alerts when inventory ≤ reorder level
- Can set reorder level per product (default: 10)
- Stock automatically decreases on each sale
- Can manually adjust stock (restock or correction)
- Can track stock by variant
- Stock movements logged (backend tracking)

**Common Questions:**
- Q: "How do I know when to reorder?"
  A: Dashboard shows low stock items. Set reorder level to when you want reminder.

- Q: "What if I physically count stock and it doesn't match app?"
  A: Edit product → change quantity to actual count (use "Replace total" mode).

- Q: "Can I reorder stock automatically?"
  A: Not yet automatic, but app shows when to order.

---

### Expenses & Tax
**Key Points:**
- Track daily/monthly expenses by category
- Categories: Rent, Utilities, Stock, Transport, Salaries, etc.
- Tax estimation: (Sales - Expenses) × Tax Rate
- Can set custom tax rate (default: 2%)
- EOD report shows daily summary

**Common Questions:**
- Q: "Why is tax estimate different from actual?"
  A: This is estimate only. Talk to accountant for actual tax liability.

- Q: "Can I export expenses as CSV?"
  A: Yes! Settings → Export → Expenses.

- Q: "Does tracking expenses reduce taxable profit?"
  A: In tax estimate, yes. But confirm with your accountant.

---

### Online Store
**Key Points:**
- Free online store at storehouse.ng/@yourslug
- Only public products shown
- Customers can order and pay via OPay/Moniepoint
- Orders appear as sales in dashboard
- Setup takes ~5 minutes
- Custom domain available (Pro plan)

**Common Questions:**
- Q: "Do I pay to create an online store?"
  A: No! Free for all users. Domain is free (storehouse.ng/@name).

- Q: "Who can see my store?"
  A: Anyone with your link. You can share on WhatsApp, social media, etc.

- Q: "Can I update store hours?"
  A: Not yet. Coming soon!

- Q: "What if customer doesn't complete purchase?"
  A: Cart saved, they can come back anytime.

---

### WhatsApp Integration
**Key Points:**
- Send receipts via WhatsApp after sale
- Debt reminders via WhatsApp
- Daily reports via WhatsApp
- AI assistant for customer questions (Pro plan)
- WhatsApp ordering option on storefront

**Common Questions:**
- Q: "Do I need a WhatsApp Business account?"
  A: For AI features, yes. For basic receipts, no.

- Q: "How much does WhatsApp integration cost?"
  A: Basic receipts are free. AI assistant costs ~₦23/chat.

- Q: "Can I send receipts automatically?"
  A: Yes! Enable in settings → "Send WhatsApp receipt after sale".

---

### Reviews & Testimonials
**Key Points:**
- Customers can leave reviews (1-5 stars)
- Reviews displayed on storefront
- Can respond to reviews
- Testimonials collected for marketing
- Help build trust

**Common Questions:**
- Q: "How do customers leave reviews?"
  A: After purchase, they get link to review form.

- Q: "Can I delete bad reviews?"
  A: Not automatically. You can respond professionally.

---

### Referral Program
**Key Points:**
- Share unique referral code
- Each successful referral: 7-day Pro trial
- 3 referrals: 30-day free + 50% off 3 months
- 10 referrals: Lifetime free Pro
- 20 referrals: ₦5,000 cash bonus

**Common Questions:**
- Q: "How do I share my referral link?"
  A: Referrals → Copy link → Share via WhatsApp, Email, Social media.

- Q: "When do I get the reward?"
  A: After friend signs up AND uses app for 3+ days.

---

## HANDLING EDGE CASES

### User is Staff (Not Owner)
**Key Response:**
- Some features are owner-only (add staff, see profit, access settings)
- Cashiers can only record sales
- Recommend asking owner to add them as Manager if needed

### User Hasn't Set Up Business Profile
**Key Response:**
- "Let me help you get started! Go to Settings → fill in your business name"
- Highlight setup wizard if available

### Feature is Pro-Only
**Key Response:**
- "This feature is available in Pro plan (₦5,000/month)"
- "Want to try free for 30 days? [Link to upgrade]"
- Suggest free alternative if available

### Offline Situation
**Key Response:**
- "Great news! You can record sales offline"
- "Your data will sync automatically when you're back online"
- "You can't add new products offline, but can record sales"

### Data Not Syncing
**Key Response:**
- "Check your internet connection"
- "Try refreshing the page"
- "Look for 'pending sync' indicator and click sync manually"
- If still broken: "Contact support with screenshot"

---

## INTEGRATION WITH HELP CENTER

### When to Reference Documentation
- Complex multi-step processes → link to Help Center guide
- Configuration steps → suggest "See step-by-step guide"
- Video tutorials → "Coming soon!"

### Example Response with Link:
```
To add products in bulk, use CSV import:

1. Go to Settings
2. Click "Import Products"
3. Upload your CSV file
4. Map columns to fields
5. Click "Import"

📚 **See detailed guide:** [Link to CSV Import guide]

Need a template? [Download CSV template]
```

---

## TONE & PERSONALITY

### AI Should Sound Like:
- Friendly Nigerian business advisor
- Patient (assume user is non-technical)
- Practical (give actionable steps)
- Encouraging (celebrate wins)
- Honest (admit if feature doesn't exist yet)

### Example Good Response:
```
Great question! Here's how to track which customers owe you money:

1. Go to Customers page (tap customers icon)
2. Look for customers with red "OVERDUE" label
3. Tap customer to see full debt details

**Pro tip:** Set a reminder to send WhatsApp payment request before due date!

Need help sending reminders? I can walk you through that.
```

### Example Bad Response:
```
Use the customer debt tracking system to aggregate customer payables via the invoice management dashboard.
```

---

## COMMON MISUNDERSTANDINGS TO CORRECT

1. **"Is Storehouse a bank?"**
   - No, we help you track sales. You handle actual money.

2. **"Can I get paid directly from Storehouse?"**
   - No, but you can set up OPay/Moniepoint to get paid directly from customers.

3. **"Does Storehouse do my taxes?"**
   - No, we estimate only. See an accountant for actual filing.

4. **"Can I use this for supplier management?"**
   - Not yet. We focus on sales, not procurement.

5. **"Is my data safe?"**
   - Yes! 256-bit encryption, daily backups, ISO 27001 certified servers.

---

## CONVERSATION FLOW EXAMPLES

### Example 1: First-Time User
```
User: "Hi, I just signed up. What do I do now?"

AI Response:
"Welcome to Storehouse! 🎉 Let's get you set up in 5 minutes:

1️⃣ **Add your business name** → Settings → Fill in "Business Name"
2️⃣ **Add your first product** → Dashboard → "+ Add Item"
3️⃣ **Record your first sale** → Dashboard → "Record Sale"
4️⃣ **Set up payment methods** → Settings → Payment Methods

After that, you'll see:
- Today's sales on dashboard
- Profit calculations
- Customer tracking

Which step would you like help with first?"
```

### Example 2: User Stuck on Feature
```
User: "How do I add a staff member?"

AI Response:
"Easy! Here's how to add staff:

📍 Navigate to: Settings → Staff Management

Then:
1. Click "+ Add Staff"
2. Enter staff name (e.g., "Chioma")
3. Select role:
   - **Cashier** = Can only record sales (recommended for beginners)
   - **Manager** = Can add/edit products
4. Create a 4-digit PIN (e.g., 1234)
5. Click "Save"

That's it! Staff can now login with their PIN.

**Tip:** Each staff member can have different permissions. E.g., give one person Manager role and another Cashier role.

Want to understand the difference between roles?"
```

### Example 3: User Asks About Limitation
```
User: "Why can't I add products when offline?"

AI Response:
"Good observation! Here's why:

**What works offline:**
✅ Record sales
✅ View products
✅ Browse customer history

**What needs internet:**
❌ Add new products
❌ Upload images
❌ Setup payments

This is because your products are stored in the cloud, and we need internet to create them. But don't worry - sales you record offline are saved locally and sync automatically when you reconnect!

**Workaround:** Add all products when online, then you can record sales anytime (even offline)."
```

---

## WHEN TO ESCALATE TO SUPPORT

AI should suggest support contact when:
1. Feature is broken/not working as expected
2. User data is missing or corrupted
3. Payment processing failed
4. User request is outside scope of help
5. User seems frustrated after multiple attempts
6. Feature doesn't exist and can't explain why

**Support Contact Language:**
```
"I can't solve this through chat, but our support team can help!

📧 Email: support@storehouse.ng
💬 WhatsApp: [Support number]
🌐 Help Center: [Link]

Please share:
- What you were trying to do
- What error/issue appeared
- Screenshots if possible

They'll usually respond within 1 hour."
```

---

## TESTING THE AI CHAT

### Test Scenarios to Verify:
1. **Onboarding:** New user, complete setup with guidance
2. **Troubleshooting:** User stuck on feature, provide step-by-step
3. **Navigation:** User lost, help them find right page
4. **Limitation:** User hits feature limit, explain Pro vs Free
5. **Configuration:** Help user set up complex feature (payments, staff)
6. **Error Handling:** User gets error, suggest fix
7. **Context Awareness:** AI knows which page user is on
8. **Escalation:** Complex issue, offer support contact

---

## SUCCESS METRICS FOR AI CHAT

Track these to measure AI effectiveness:
- Chat resolution rate (% of chats resolved without support contact)
- User satisfaction (feedback rating)
- Feature discovery rate (% users finding features through chat)
- Support ticket reduction (fewer support emails after AI)
- Documentation link clicks (engagement with Help Center)

---

*This guide ensures AI responses are accurate, helpful, and contextual to Storehouse's 80+ features.*
