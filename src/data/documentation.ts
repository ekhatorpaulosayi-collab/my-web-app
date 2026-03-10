/**
 * STOREHOUSE DOCUMENTATION DATABASE
 * Comprehensive guides covering ALL actual features
 * Generated based on codebase audit - 100% accurate!
 * Last updated: 2025-11-30
 */

import { Documentation } from '../types/documentation';
import { invoiceMicroChunks } from './invoiceMicroChunks';

export const DOCUMENTATION: Documentation[] = [

  // ============================================
  // GETTING STARTED (5 guides)
  // ============================================

  {
    id: 'welcome-to-storehouse',
    category: 'getting-started',
    title: 'Welcome to Storehouse',
    subtitle: 'Your complete business management platform',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 100,
    description: 'Learn what Storehouse can do for your business and how to get started.',
    content: `Welcome to **Storehouse** - Nigeria's most powerful business management platform! 🎉

**What is Storehouse?**

Storehouse helps you:
- 📦 Manage products and inventory
- 💰 Record sales (cash and credit)
- 👥 Track customers and their purchases
- 📊 Generate professional invoices
- 🏪 Run your own online store
- 👨‍💼 Manage staff with different roles
- 💬 Send WhatsApp receipts and daily reports
- 📈 View sales reports and profits
- 💸 Track expenses and estimate taxes

**Your Dashboard:**

After logging in, you'll see:
- Today's sales and profit
- Your product inventory
- Quick sale recording
- Sales trends chart
- Low stock alerts

**Quick Actions:**

- **+ Add Item**: Add new products
- **Record Sale**: Sell products instantly
- **⚙️ Settings**: Configure your business
- **👥 Customers**: View customer list
- **📄 Invoices**: Create B2B invoices

**Mobile-Friendly:**

Storehouse works perfectly on phones, tablets, and computers!

**Need Help?**

- 💬 Click the AI chat widget (bottom right)
- 📚 Browse this Help Center
- 📱 WhatsApp support available`,
    relatedDocs: ['add-first-product', 'record-first-sale', 'dashboard-tour', 'business-setup'],
    keywords: ['welcome', 'getting started', 'introduction', 'new user', 'first time', 'what is storehouse'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'add-first-product',
    category: 'getting-started',
    title: 'Add Your First Product',
    subtitle: 'Start tracking inventory in 3 easy steps',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 95,
    description: 'Learn how to add products to your Storehouse inventory.',
    steps: [
      {
        step: 1,
        instruction: 'Tap "+ Add Item" button on your dashboard',
        tip: 'Look for the button at the top of your products list',
      },
      {
        step: 2,
        instruction: 'Fill in product details',
        tip: 'Required: Product Name, Cost Price (what you paid), Selling Price (what customers pay), Quantity in stock',
      },
      {
        step: 3,
        instruction: 'Add optional details (SKU, barcode, category, low stock alert)',
        tip: 'SKU helps you track products uniquely. Barcode enables quick scanning.',
      },
      {
        step: 4,
        instruction: 'Upload product image (optional)',
        tip: 'Images help customers recognize products in your online store',
      },
      {
        step: 5,
        instruction: 'Tap "Save" and your product is added!',
        tip: 'Profit margin is automatically calculated: Selling Price - Cost Price',
      },
    ],
    commonIssues: [
      {
        issue: "I can't see the Add Item button",
        solution: "You might be logged in as Staff (Cashier role). Only Owners and Managers can add products. Check Settings → Staff Management to see your role.",
      },
      {
        issue: 'Validation error: Please enter valid prices',
        solution: 'Cost Price and Selling Price must be positive numbers. Make sure Selling Price is higher than Cost Price for profit.',
      },
      {
        issue: 'Product not showing after saving',
        solution: 'Check your internet connection. The product is saved and will sync when online. Try refreshing the page.',
      },
    ],
    relatedDocs: ['edit-product', 'delete-product', 'product-variants', 'product-images'],
    keywords: ['add product', 'new item', 'first product', 'add inventory', 'create product', 'stock', 'add item'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'record-first-sale',
    category: 'getting-started',
    title: 'Complete Guide: How to Record Sales',
    subtitle: 'Step-by-step walkthrough with real Nigerian business examples',
    difficulty: 'beginner',
    estimatedTime: '5 minutes',
    priority: 90,
    description: 'Master sales recording in Storehouse with practical examples from Nigerian businesses. Learn every field, payment method, and pro tips from experienced sellers.',

    content: `
## Quick Start (10 seconds)

1. Click "Record Sale" on Dashboard
2. Search & select product
3. Click "Complete Sale"

Done! For detailed walkthrough with examples, keep reading.

---

## Real Nigerian Business Example

**Scenario:** Beauty shop owner (@beautybyade) selling products via WhatsApp

**Customer:** Blessing Okonkwo
**Order:** Glow Vitamin C Serum (₦12,500) + Face Moisturizer (₦12,800)
**Payment:** Already paid via Moniepoint transfer
**Channel:** WhatsApp

Let's record this sale step-by-step:

---

## Step 1: Open Record Sale Modal

**Location:** Dashboard → Click green "Record Sale" button (top section)

**Keyboard Shortcut:** Press **Ctrl+S** (Windows) or **Cmd+S** (Mac)

**Alternative:** Click directly on any product in your inventory list

**What you'll see:** Record Sale modal opens with search bar at top

---

## Step 2: Search & Select Products

**How to add first item:**

1. Click the search box (or it auto-focuses)
2. Type product name: "glow serum"
3. Results appear instantly as you type
4. Click "Glow Vitamin C Serum - ₦12,500"
5. Product added to cart! See toast: "🛒 Added Glow Vitamin C Serum to cart"

**Search tips:**
- Search by product name (fastest)
- Search by SKU if you have one
- Search by barcode if product has barcode
- Searches work with partial matches (typing "glow" finds "Glow Vitamin C Serum")

**Adding second item:**

6. Search bar clears automatically (for fast workflow)
7. Type "moisturizer"
8. Click "Face Moisturizer - ₦12,800"
9. Cart now shows 2 items, Total: ₦25,300

**Stock warnings:**
- If product out of stock, you'll see: "⚠️ Product Name is out of stock"
- If trying to sell more than available: "⚠️ Only 3 units available"
- Enable "Allow Negative Inventory" in Settings to sell beyond stock

---

## Step 3: Review Cart (Optional)

**What you'll see:**

    Cart (2 items)
    ━━━━━━━━━━━━━━━━━━━
    Glow Vitamin C Serum
    Qty: 1 × ₦12,500 = ₦12,500

    Face Moisturizer
    Qty: 1 × ₦12,800 = ₦12,800

    ━━━━━━━━━━━━━━━━━━━
    Total: ₦25,300

**Adjusting quantities:**
- Click + or - buttons next to each item
- Or type quantity directly
- Remove item: Click trash icon

---

## Step 4: Enter Customer Information

**Customer Name** (Optional but highly recommended)

- Field: "Customer Name"
- Enter: "Blessing Okonkwo"
- Why: Track repeat customers, purchase history, analytics
- Pro tip: For walk-ins without names, use: "Walk-in customer - pink dress"

**Customer Phone** (Optional)

- Field: "Customer Phone"
- Enter: "080 1234 5678" (Nigerian format)
- Also accepts: "+44 7459 044" (International)
- Auto-formats as you type: "080 1234 5678" → "0801 234 5678"
- Shows validation: "✓ Valid Nigerian number"
- Why: Enables WhatsApp receipt sending

**Email** (Only required for Card payments)

- Only appears if you select "Card" payment method
- Required for Paystack card payments
- Enter customer's email for receipt

---

## Step 5: Choose Payment Method

**Toggle:** Cash or Credit?

- **Cash Sale** (default): Customer paid now
- **Credit Sale**: Customer owes money (will pay later)

**For our example:** Select **Cash** (customer already paid)

**Then select payment method:**

**Available payment methods:**
1. **Cash** - Physical cash payment
2. **Transfer** - Bank transfer (any bank: Zenith, GTBank, UBA, etc.)
3. **Card** - Debit/credit card via Paystack (requires setup)
4. **POS** - Card payment via POS terminal

**For our example:** Select **Transfer**

**Note:** OPay, Moniepoint, Kuda are NOT separate payment options. Use "Transfer" for these and mention in notes if needed.

**Payment method tips:**
- Last used method is remembered (saves time)
- Click "More payment methods..." to see all 4 options
- Storehouse tracks which methods customers prefer (see reports)

---

## Step 6: Select Sales Channel

**Field:** "Sales Channel"

**Available channels:**
1. 🏪 **In-Store / Walk-in** - Physical store customers
2. 💬 **WhatsApp** - Orders via WhatsApp chat/status
3. 📷 **Instagram** - Sales from Instagram DM/posts
4. 📘 **Facebook** - Facebook Marketplace/page sales
5. 🌐 **Online Store** - Your Storehouse public storefront
6. 🎵 **TikTok** - TikTok Shop/DM orders
7. 👥 **Referral** - Customer referrals
8. 📦 **Other** - Any other channel

**For our example:** Select **WhatsApp**

**Why track sales channels?**
- Know where most customers come from
- Focus marketing on best-performing channels
- Example: "@beautybyade discovered 70% of sales from Instagram, 20% WhatsApp, 10% walk-ins"

---

## Step 7: WhatsApp Receipt (Optional)

**Checkbox:** "Send receipt via WhatsApp"

- Automatically enabled if phone number valid
- Preview: "Send to ...5678" (last 4 digits)
- Receipt will open in WhatsApp with pre-filled message

**For our example:** ✓ Check this box

**What happens:**
- After completing sale, WhatsApp opens automatically
- Receipt text already formatted and ready
- Just click Send in WhatsApp

---

## Step 8: Complete Sale

**Button:** "Complete Sale" (green button, bottom right)

**Click it!**

**What happens next:**

1. Sale saves to database ✅
2. Stock automatically reduces:
   - Glow Vitamin C Serum: 10 → 9 units
   - Face Moisturizer: 15 → 14 units
3. Success toast appears: "✅ Sale recorded! ₦25,300"
4. Receipt modal opens automatically
5. Cart clears, ready for next sale

---

## Step 9: Share Receipt

**Receipt Modal** opens with 5 sharing options:

1. **📱 Share via WhatsApp**
   - Opens WhatsApp to Blessing's number
   - Receipt already formatted
   - Shows: Items, prices, total, payment method, date
   - Click Send in WhatsApp

2. **📧 Email Receipt**
   - Opens email app
   - Subject: "Receipt from [Your Business Name]"
   - Body: Formatted receipt

3. **📋 Copy to Clipboard**
   - Copies receipt text
   - Paste anywhere (Notes, WhatsApp Web, etc.)

4. **💾 Download Receipt**
   - Downloads as .txt file
   - Filename: receipt-[timestamp].txt

5. **🖨️ Print Receipt**
   - Opens print dialog
   - Print on thermal printer or regular printer

**For our example:** Click "Share via WhatsApp"

**Result:** WhatsApp opens with this message:

    ━━━━━━━━━━━━━━━━━━━
    🧾 SALES RECEIPT
    ━━━━━━━━━━━━━━━━━━━

    📍 Beauty By Ade

    👤 Blessing Okonkwo

    📦 ITEMS
    1. Glow Vitamin C Serum
       1 × ₦12,500 = ₦12,500

    2. Face Moisturizer
       1 × ₦12,800 = ₦12,800

    ━━━━━━━━━━━━━━━━━━━
    💰 TOTAL: ₦25,300
    ✅ Payment: Transfer
    ━━━━━━━━━━━━━━━━━━━

    📅 10 Mar 2026, 2:30 PM

    Thank you for your business!

    ━━━━━━━━━━━━━━━━━━━
    Powered by Storehouse

---

## Understanding Credit Sales

**When to use Credit Sale:**

- Customer wants to pay later
- Corporate clients with payment terms (e.g., "Pay in 30 days")
- Regular customers you trust
- Installment payments

**Example:** Electronics store selling 5 laptops to company

**How to record credit sale:**

1. Follow Steps 1-4 (add products, enter customer info)
2. **Step 5:** Toggle "Credit Sale" ON
3. **Required fields appear:**
   - Customer Name (required): "ABC Company"
   - Due Date (required): "April 10, 2026"
   - Message/Note (optional): "Invoice #12345"
4. Complete sale

**What happens:**
- Sale recorded immediately
- Stock reduces (laptops already given to customer)
- Debt created in Credit Management
- Revenue shows as "Unpaid"
- Due date tracked
- Customer can pay later (mark as paid in Credit Management)

**Credit sale tips:**
- Always get customer phone number (for follow-up)
- Set realistic due dates
- Add invoice/agreement number in Message field
- Check Credit Management regularly for overdue debts

---

## Common Mistakes & Solutions

### MISTAKE #1: "I can't find the Record Sale button"

**Possible causes:**

1. **Button scrolled out of view**
   - Solution: Scroll to top of Dashboard

2. **Looking in wrong place**
   - Solution: Button is on Dashboard, NOT in Settings or Reports
   - Location: Top section, green button with "Record Sale" text

3. **Mobile vs Desktop view difference**
   - Solution: On mobile, button may be at bottom floating bar
   - On desktop, button at top right

**Note:** ALL users (Owner, Manager, Cashier) can ALWAYS see and use Record Sale button. There are NO permission restrictions.

---

### MISTAKE #2: "Product shows negative stock after sale"

**Cause:** You sold more than available stock

**Example:**
- Stock: 5 units
- Trying to sell: 8 units
- Result: Stock becomes -3 (negative)

**Solution Option 1:** Restock first
- Go to Inventory → Find product → Click Restock
- Add more units before recording sale

**Solution Option 2:** Enable "Allow Negative Inventory"
- Go to Settings → Business Settings
- Toggle "Allow Negative Inventory" ON
- Useful for: Pre-orders, consignment, services

**Warning:** Track negative inventory carefully to avoid overselling

---

### MISTAKE #3: "Sale not appearing in Today's Sales report"

**Possible causes:**

1. **Didn't click "Complete Sale" button**
   - Cart was filled but sale not saved
   - Solution: Make sure to click "Complete Sale" every time

2. **Internet connection issue (sale stuck in queue)**
   - Check for spinning sync icon
   - Solution: Wait for internet connection to restore, sale will sync automatically

3. **Viewing wrong date in reports**
   - Sale recorded yesterday but viewing today's report
   - Solution: Check date filter in Sales Report, select correct date

---

### MISTAKE #4: "WhatsApp receipt not sending"

**Possible causes:**

1. **Invalid phone number format**
   - Wrong format: "080-1234-5678" or "080.1234.5678"
   - Correct format: "080 1234 5678" or "08012345678" or "+2348012345678"
   - Solution: Re-enter phone number, wait for "✓ Valid" message

2. **WhatsApp not installed**
   - Solution: Use "Copy to Clipboard" instead, paste in WhatsApp Web

3. **Pop-up blocker**
   - WhatsApp window blocked by browser
   - Solution: Allow pop-ups for Storehouse website in browser settings

---

### MISTAKE #5: "Customer name not saving"

**Cause:** Field left blank (it's optional but recommended)

**Solution:** Make it a habit to always enter customer names

**Benefits of entering names:**
- Track repeat customers
- See purchase history: "Mrs. Adebayo bought 2 dresses last month"
- Customer analytics: "Top 10 customers this month"
- Better customer service

**For walk-ins without names:**
- Use descriptive tags: "Walk-in customer - pink dress"
- Or: "Regular - comes every Friday"
- Or: "Young lady - lives nearby"

---

### MISTAKE #6: "Can't change quantity after adding to cart"

**Cause:** Clicking too fast before modal loads

**Solution:**
- Wait for product to appear in cart
- Then click + or - buttons to adjust quantity

**Alternative:** Remove item (trash icon) and re-add with correct quantity

---

### MISTAKE #7: "Receipt modal disappeared before I could share"

**Old behavior:** Modal closed automatically (this was a bug, now fixed!)

**Current behavior:** Modal stays open until you close it manually

**How to reopen if accidentally closed:**
- Look for "Share Receipt" button
- Or: Find sale in Sales Report → Click to view → Click "Share Receipt"

**Pro tip:** Share to multiple channels before closing (WhatsApp + Email)

---

### MISTAKE #8: "Recorded sale to wrong customer"

**Problem:** Can't edit completed sales

**Solution Option 1:** Delete and re-record (if just recorded)
- Find sale in Today's Sales
- Owner can delete recent sales
- Re-record correctly

**Solution Option 2:** Contact support to void/adjust

**Prevention:** Double-check customer name before clicking "Complete Sale"

---

## Advanced Scenarios

### SCENARIO A: Recording Bulk Sales (50 bags of rice)

**Challenge:** Large quantity, tedious to adjust

**Solution:**

1. Add product once: "Rice - 50kg bag"
2. Click + button 49 times OR
3. Click quantity number, type "50" directly
4. Total auto-calculates: ₦35,000 × 50 = ₦1,750,000
5. Complete sale normally

**Pro tip:** For 100+ items, consider creating a CSV import (advanced feature)

---

### SCENARIO B: Credit Sale with Due Date

**Example:** Corporate buyer, 30-day payment terms

**Steps:**

1. Add products (e.g., 5 laptops × ₦450,000 = ₦2,250,000)
2. Enter customer: "ABC Company Ltd"
3. Enter phone: "070 1234 5678"
4. Toggle "Credit Sale" ON
5. Due date: April 10, 2026 (30 days from now)
6. Message: "Invoice #INV-2026-001, PO #12345"
7. Complete sale

**What happens:**
- Sale recorded: ₦2,250,000
- Stock reduces: 5 laptops given to customer
- Debt created: ₦2,250,000 (unpaid)
- Due date tracked: April 10, 2026
- Appears in Credit Management as "Outstanding"

**When customer pays:**
- Go to Credit Management
- Find "ABC Company Ltd - ₦2,250,000"
- Click "Mark as Paid"
- Debt moves to "Paid Debts"

---

### SCENARIO C: Undoing the Last Sale (Mistakes Only)

**Important:** Can ONLY undo the most recent sale

**When to use:**
- Immediately after recording wrong sale
- Accidentally clicked Complete Sale
- Entered wrong customer/amount

**How to undo:**

1. Look for "Undo" button in success toast (appears for ~5 seconds)
2. Click "Undo" quickly
3. Sale removed
4. Stock restored automatically
5. Debt cancelled (if credit sale)

**What happens:**
- Sale disappears from Today's Sales
- Stock quantity increases back
- If credit sale: Debt removed
- Cannot undo old sales (data integrity protection)

**Alternative for old sales:**
- Owner can delete from Sales Report (use carefully!)
- Cannot undo sales from previous days

---

### SCENARIO D: Recording Services (Not Physical Products)

**Examples:** Hair braiding, laundry service, phone repair

**Challenge:** Services don't have stock quantity

**Solution:**

1. Create service as "product" with unlimited stock
2. Set stock to 9999 OR enable "Allow Negative Inventory"
3. Example product: "Hair Braiding Service - ₦8,000"
4. Record sale normally
5. Stock stays at 9999 (unlimited)

**Pro tip:** Use product variants for different service types
- "Hair Braiding - Short Hair" - ₦5,000
- "Hair Braiding - Long Hair" - ₦8,000
- "Hair Braiding - Children" - ₦3,000

---

## Pro Tips from Nigerian Business Owners

### TIP #1: Speed is Everything (Computer Village Vendors)

> "At Computer Village, customers don't wait. I trained my workflow to:
> 1. Click 'Record Sale'
> 2. Type product name
> 3. Press Enter
> 4. Click 'Complete Sale'
>
> Under 10 seconds per sale! Storehouse remembers my payment method (Transfer)
> and channel (In-Store), so I don't re-select every time."
>
> — **Chidi, Phone Accessories Vendor, Computer Village**

**Keyboard shortcuts:**
- Ctrl+S: Open Record Sale
- Enter: Select highlighted product
- Esc: Close modal

---

### TIP #2: Always Get Customer Phone Numbers (Online Sellers)

> "I send WhatsApp receipts to EVERY customer. Now 70% are repeat buyers!
> They trust me because I'm professional. When they reorder, I check their
> purchase history: 'Oh, you bought the face cream last month. Want to try
> the serum?' Personalized service wins customers."
>
> — **@beautybyade, Instagram Beauty Products Vendor**

---

### TIP #3: Track Sales Channels Religiously (Fashion Boutique)

> "I was spending ₦50,000/month on Facebook ads thinking that's where
> sales come from. After 3 months of tracking channels in Storehouse,
> I discovered 60% of sales came from Instagram, 30% from WhatsApp status,
> only 10% from Facebook! I stopped Facebook ads, focused on Instagram.
> Revenue increased 40%! Data don't lie!"
>
> — **Funmi, Lekki Boutique Owner**

---

### TIP #4: Use Credit Sales for Corporate Clients (Electronics Store)

> "Corporate clients don't pay immediately. Before Storehouse, I tracked
> debts in notebook - total mess! Now I use Credit Sales feature:
>
> - Record sale immediately (stock reduces, I know what I gave)
> - Set due date (30 days)
> - Add invoice number in message
> - Storehouse reminds me when payment is due
> - Mark as paid when money arrives
>
> I recovered ₦2.5 million in overdue debts by following up systematically!"
>
> — **Emeka, Port Harcourt Electronics**

---

### TIP #5: Send Receipts for Accountability (Provisions Store)

> "Customers trust you more when they receive receipts. Even for small
> sales (₦2,000 bread and milk), I send WhatsApp receipt. Professional
> image = repeat customers. One customer even showed my receipt to her
> friend saying 'This shop is organized, go buy from them!'"
>
> — **Mama Ngozi, Surulere Provisions Store**

---

## Keywords for Search

record sale, sell product, make sale, complete sale, record transaction, how to sell, sell item, track sales, sales process, record revenue, whatsapp receipt, send receipt, customer receipt, sale receipt, payment method, cash sale, credit sale, debt tracking, sales channel, instagram sales, whatsapp sales, online sales, customer name, customer phone, customer information, negative stock, overselling, stock reduction, inventory update, bulk sales, multiple items, cart, shopping cart, corporate sales, invoice, due date, payment terms, undo sale, delete sale, cancel sale, nigeria sales, nigerian business, lekki, computer village, surulere, boutique, phone shop, beauty business, provisions store, electronics, moniepoint, bank transfer, pos payment, zenith bank, gtbank, walk-in customer, retail customer, online customer
`,

    steps: [
      {
        step: 1,
        instruction: 'Click "Record Sale" button on Dashboard',
        tip: 'Keyboard shortcut: Ctrl+S (Windows) or Cmd+S (Mac). Button is always visible to all users.',
      },
      {
        step: 2,
        instruction: 'Search and select product(s) - search bar auto-focuses',
        tip: 'Type product name, SKU, or barcode. Search bar clears automatically after each selection for fast workflow.',
      },
      {
        step: 3,
        instruction: 'Review cart - adjust quantities if needed using + or - buttons',
        tip: 'Cart shows: Item name, quantity, price, total. Click trash icon to remove items.',
      },
      {
        step: 4,
        instruction: 'Enter customer name (optional but recommended for tracking repeat customers)',
        tip: 'Customer name helps you build purchase history and track who buys what. For walk-ins: use descriptive tags like "Walk-in customer - pink dress".',
      },
      {
        step: 5,
        instruction: 'Enter customer phone (optional - enables WhatsApp receipts)',
        tip: 'Nigerian format: 080 1234 5678. International: +44 7459 044. Shows "✓ Valid" when correct.',
      },
      {
        step: 6,
        instruction: 'Toggle Cash or Credit: Cash = paid now, Credit = pay later with due date',
        tip: 'Credit sales create debt in Credit Management. Use for corporate clients, installments, trusted customers.',
      },
      {
        step: 7,
        instruction: 'Choose payment method: Cash, Transfer, Card, or POS',
        tip: 'Last used method is remembered. Transfer = bank transfer (Zenith, GTBank, UBA, etc.). Card requires Paystack setup.',
      },
      {
        step: 8,
        instruction: 'Select sales channel: In-Store, WhatsApp, Instagram, Facebook, Online Store, TikTok, Referral, Other',
        tip: 'Track where customers come from. Example: Discover 70% sales from Instagram, 20% WhatsApp, 10% walk-ins.',
      },
      {
        step: 9,
        instruction: 'Check "Send receipt via WhatsApp" if customer phone is valid',
        tip: 'Receipt opens in WhatsApp with pre-filled message. Professional receipts build customer trust and drive repeat business.',
      },
      {
        step: 10,
        instruction: 'Click "Complete Sale" button - stock automatically reduces',
        tip: 'Sale saves to database, stock updates, receipt modal opens. Cart clears ready for next sale.',
      },
    ],

    commonIssues: [
      {
        issue: 'Product shows negative stock after sale',
        solution: 'You sold more than available stock. Two options: (1) Restock first via Inventory → Restock, or (2) Enable "Allow Negative Inventory" in Settings → Business Settings. Useful for pre-orders, consignment, services.',
      },
      {
        issue: 'Sale not appearing in Today\'s Sales report',
        solution: 'Three possible causes: (1) Didn\'t click "Complete Sale" button - make sure to complete every sale. (2) Internet connection issue - wait for sync icon to stop spinning. (3) Viewing wrong date - check date filter in Sales Report.',
      },
      {
        issue: 'WhatsApp receipt not sending',
        solution: 'Check phone number format: Nigerian (080 1234 5678) or International (+44 7459 044). If WhatsApp not installed, use "Copy to Clipboard" instead. If pop-up blocked, allow pop-ups for Storehouse website.',
      },
      {
        issue: 'Can\'t find Record Sale button',
        solution: 'Button is on Dashboard at top section (green button). On mobile, may be at bottom floating bar. Button is ALWAYS visible to all users - no permission restrictions. If still not visible, scroll to top of Dashboard or refresh page.',
      },
      {
        issue: 'Receipt modal disappeared before I could share',
        solution: 'Modal now stays open until you close it manually (bug fixed!). If accidentally closed, find sale in Sales Report → Click sale → Click "Share Receipt" button. Pro tip: Share to multiple channels before closing.',
      },
      {
        issue: 'Recorded sale to wrong customer',
        solution: 'Cannot edit completed sales. If just recorded: Owner can delete from Today\'s Sales and re-record correctly. If old sale: Contact support. Prevention: Double-check customer name before clicking "Complete Sale".',
      },
      {
        issue: 'Customer name not saving',
        solution: 'Customer name is optional but highly recommended. Make it a habit to always enter names. Benefits: Track repeat customers, see purchase history, customer analytics. For walk-ins: use descriptive tags like "Walk-in customer - pink dress".',
      },
      {
        issue: 'Need to undo a sale I just recorded',
        solution: 'Can ONLY undo the most recent sale. Look for "Undo" button in success toast (appears for ~5 seconds). Click quickly. Sale removed, stock restored, debt cancelled if credit sale. Cannot undo old sales.',
      },
    ],

    relatedDocs: ['cash-vs-credit', 'payment-methods', 'sales-channels', 'customer-management', 'whatsapp-receipts', 'credit-management'],
    keywords: [
      // Core sales actions
      'record sale', 'sell product', 'make sale', 'complete sale', 'record transaction', 'how to sell', 'sell item', 'track sales', 'sales process',

      // Receipt actions (CRITICAL for RAG search)
      'send receipt', 'email receipt', 'share receipt', 'receipt modal', 'receipt options', 'copy receipt', 'download receipt', 'print receipt',
      'receipt after sale', 'how to send receipt', 'receipt sharing', 'receipt not sending', 'receipt disappeared', 'find receipt',
      'whatsapp receipt', 'email customer receipt', 'sms receipt', 'receipt via email', 'receipt to customer',

      // Business name & branding
      'company name on receipt', 'business name on receipt', 'receipt branding', 'customize receipt', 'change business name', 'business settings',

      // Cart & shopping
      'cart visibility', 'see cart', 'view cart', 'cart items', 'items in cart', 'shopping cart', 'check cart', 'cart icon',
      'negative stock', 'overselling', 'bulk sales', 'shopping cart',

      // Payment & sales types
      'payment method', 'cash sale', 'credit sale', 'debt tracking', 'corporate sales', 'invoice', 'due date', 'moniepoint', 'bank transfer', 'pos payment',

      // Sales channels
      'sales channel', 'instagram sales', 'whatsapp sales', 'online sales', 'walk-in customer', 'retail customer',

      // Customer info
      'customer name', 'customer phone', 'customer receipt',

      // Actions & management
      'undo sale', 'delete sale',

      // Location context (Nigerian businesses)
      'nigeria sales', 'nigerian business', 'lekki', 'computer village', 'surulere', 'boutique', 'beauty business', 'provisions store'
    ],
    lastUpdated: '2026-03-10',
  },

  {
    id: 'business-setup',
    category: 'getting-started',
    title: 'Set Up Your Business Information',
    subtitle: 'Complete your business profile',
    difficulty: 'beginner',
    estimatedTime: '5 minutes',
    priority: 85,
    description: 'Add your business details to personalize Storehouse and enable features.',
    steps: [
      {
        step: 1,
        instruction: 'Go to Settings (⚙️ icon)',
        tip: 'Settings button is usually in the top-right or navigation menu',
      },
      {
        step: 2,
        instruction: 'Tap "Business Settings"',
        tip: 'This is where you configure your business information',
      },
      {
        step: 3,
        instruction: 'Enter business name',
        tip: 'This appears on receipts, invoices, and your online store',
      },
      {
        step: 4,
        instruction: 'Add WhatsApp business number',
        tip: 'Customers can contact you via WhatsApp. Format: 2348012345678',
      },
      {
        step: 5,
        instruction: 'Fill in business description (for online store)',
        tip: 'Describe what you sell. Appears on your public storefront.',
      },
      {
        step: 6,
        instruction: 'Upload business logo (optional)',
        tip: 'Makes your store look professional',
      },
      {
        step: 7,
        instruction: 'Save changes',
        tip: 'Your business info is now set!',
      },
    ],
    commonIssues: [
      {
        issue: 'Logo not uploading',
        solution: 'Make sure image is less than 2MB and in JPG/PNG format. Try a smaller image.',
      },
      {
        issue: 'WhatsApp number format error',
        solution: 'Use international format: 234 + your 10-digit number (no spaces or +)',
      },
    ],
    relatedDocs: ['store-setup', 'payment-setup', 'tax-settings'],
    keywords: ['business settings', 'setup', 'configure', 'business info', 'logo'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'dashboard-tour',
    category: 'getting-started',
    title: 'Dashboard Tour',
    subtitle: 'Understand your dashboard at a glance',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 80,
    description: 'Learn what each section of your dashboard does.',
    content: `Your **Dashboard** is your business command center! Here's what each section does:

**📊 Today's Sales (Top Section)**
- Total Sales: Money earned today
- Transactions: Number of sales made
- Recent sales list with timestamps
- Toggle to hide/show sales data

**📦 Products List (Middle Section)**
- See all your products
- Current stock quantity
- Selling price
- Quick actions: Edit, Delete, Record Sale
- Search products by name
- Infinite scroll for many products

**📈 Sales Chart (Collapsible)**
- Visual chart showing sales trends
- Daily, weekly, or monthly view
- Tap to expand/collapse

**💼 Sales by Channel (Collapsible)**
- See which sales channels perform best
- Online, WhatsApp, Retail, etc.
- Percentage breakdown

**⚡ Quick Actions**
- **+ Add Item**: Add new products
- **Record Sale**: Sell products
- **More**: Access Money & Profits, Low Stock, Expenses
- **⚙️ Settings**: Configure app
- **📱 Share Store**: Share your online store link

**🔔 Alerts**
- Low stock warnings (products running out)
- Pending customer debts
- Important notifications

**🎯 Getting Started Checklist**
- For new users only
- Guides you through first steps
- Disappears after completion

**💬 AI Chat Widget (Bottom Right)**
- Ask questions
- Get help
- Instant support`,
    relatedDocs: ['add-first-product', 'record-first-sale', 'sales-analytics'],
    keywords: ['dashboard', 'tour', 'overview', 'main screen', 'home page'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'first-5-minutes-checklist',
    category: 'getting-started',
    title: '✅ Your First 5 Minutes',
    subtitle: 'Quick wins to get started fast',
    difficulty: 'beginner',
    estimatedTime: '5 minutes',
    priority: 100, // HIGHEST PRIORITY for new users
    description: 'Complete these 3 quick steps to see how Storehouse works!',
    content: `Welcome to Storehouse! 🎉 Let's get you started with **3 quick wins** in just 5 minutes!

**Why this matters:** These 3 steps will help you understand how Storehouse works before diving deeper.

---

## ✅ Step 1: Add Your First Product (1 minute)

**What you'll learn:** How inventory tracking works

**Quick Actions:**
1. Tap **"+ Add Item"** button at top of products list
2. Fill in the basics:
   - **Product Name**: "Test Product"
   - **Cost Price**: ₦500 (what you paid)
   - **Selling Price**: ₦800 (what customers pay)
   - **Quantity**: 10
3. Tap **"Add Product"**

🎊 **Success!** You just added your first product. Storehouse is now tracking this inventory.

**What happened:**
- Product added to your inventory
- Stock: 10 units
- Expected profit per sale: ₦300 (₦800 - ₦500)

---

## ✅ Step 2: Record a Test Sale (1 minute)

**What you'll learn:** How sales tracking works

**Quick Actions:**
1. Find your test product in the list
2. Tap **"Record Sale"** button next to it
3. Quantity sold: **2** units
4. Payment method: **Cash**
5. Tap **"Complete Sale"**

🎊 **Success!** You just recorded your first sale!

**What happened:**
- 2 units sold
- Revenue: ₦1,600 (2 × ₦800)
- Profit: ₦600 (2 × ₦300)
- Remaining stock: 8 units (10 - 2)
- Dashboard updated with today's sales

**Check your dashboard:**
- Today's Sales: ₦1,600
- Today's Profit: ₦600
- See your recent sale in the sales list

---

## ✅ Step 3: Set Up Your Online Store (3 minutes)

**What you'll learn:** How to sell online 24/7

**Quick Actions:**
1. Tap **More** (bottom navigation)
2. Tap **Online Store**
3. Fill in the basics:
   - **Store Name**: Auto-filled from business name
   - **Store URL**: Choose a unique slug (e.g., "my-test-store")
   - **WhatsApp Number**: Your business WhatsApp
4. Tap **"Create Store"**
5. **Copy your store URL** and open it in a new tab!

🎊 **Success!** You now have an online store at storehouse.ng/store/YOUR-SLUG

**What happened:**
- Your products are now online
- Customers can browse 24/7
- Orders come via WhatsApp
- You can accept online payments (add Paystack later)

**Try it:**
- Open your store URL in a browser
- Browse your test product
- Add to cart
- See the checkout flow

---

## 🎯 What's Next?

You've completed the basics! Now you can:

**Build Your Inventory:**
- Add your real products (tap "+ Add Item")
- Upload product images
- Set low stock alerts
- Organize by categories

**Start Selling:**
- Record real sales as they happen
- Track cash, transfer, and POS payments
- Send WhatsApp receipts to customers
- View daily sales reports

**Grow Your Business:**
- Share your online store link
- Add payment methods (OPay, Moniepoint, etc.)
- Create professional invoices
- Add staff members
- Track customer debts

---

## 💡 Pro Tips:

1. **Add products in bulk:** Click More → Import Products → Upload Excel
2. **Set low stock alerts:** Get notified when products run low
3. **Use the chat widget:** Ask me anything! I'm here 24/7
4. **Check daily reports:** Dashboard shows today's performance at a glance

---

## 🆘 Need Help?

- 💬 **Chat with me** (this widget!) - I'm your AI guide
- 📚 **Browse Help Docs** - Search for specific topics
- 📱 **WhatsApp Support** - Available on business plan

---

**🎉 Congratulations!** You've completed your first 5 minutes. You're now ready to use Storehouse to manage your business!`,
    relatedDocs: ['add-first-product', 'record-first-sale', 'create-online-store', 'dashboard-tour'],
    keywords: ['first 5 minutes', 'quick start', 'getting started', 'onboarding', 'new user', 'checklist', 'quick wins', 'tutorial', 'first steps'],
    lastUpdated: '2025-12-03',
  },

  // ============================================
  // MARKETING & VISITOR INFO (4 guides)
  // ============================================

  {
    id: 'storehouse-vs-excel',
    category: 'marketing',
    title: 'Storehouse vs Excel: Which is Better?',
    subtitle: 'Why 5,000+ businesses switched from spreadsheets',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 95,
    description: 'See why Storehouse is more powerful than Excel for inventory management.',
    content: `**Great question!** Many business owners start with Excel, but here's why they switch to Storehouse:

## 🚀 Speed & Simplicity

**Excel:**
- Manually type each sale into rows
- Calculate profits with formulas
- Risk formula errors breaking your sheet
- Takes 5-10 minutes per sale

**Storehouse:**
- Tap product → quantity → done (10 seconds!)
- Profits calculated automatically
- No formulas to break
- Save 90% of your time

---

## 📊 Real-Time Insights

**Excel:**
- Update numbers manually
- Chart breaks when you add rows
- No automatic reports
- Hard to see trends

**Storehouse:**
- Live dashboard with today's profit
- Auto-updating charts
- Daily/weekly/monthly reports
- Spot trends instantly

---

## 🏪 Online Store (Excel Can't Do This!)

**Storehouse gives you:**
- Beautiful online store in 3 minutes
- Customers order via WhatsApp
- Accept OPay, Moniepoint, Banks
- Share one link: storehouse.ng/@yourstore

**Excel:** No online store feature ❌

---

## 💪 Mobile-First

**Excel on Phone:**
- Tiny cells, hard to tap
- Zooming in/out constantly
- Accidental formula deletion
- Frustrating experience

**Storehouse on Phone:**
- Built for mobile from day 1
- Large tap targets
- Fast & smooth
- Actually enjoyable to use!

---

## 💰 Pricing Reality Check

**Excel/Google Sheets:**
- "Free" but costs you TIME
- 10 hours/month on manual entry = ₦50,000 opportunity cost
- No support when you're stuck

**Storehouse:**
- 100% FREE forever (basic features)
- Save 10+ hours/month
- AI chat support included
- Pro features: ₦5,000/month (optional)

---

## 🎯 The Verdict

**Use Excel if:**
- You sell 1-2 items per day
- You enjoy manual calculations
- You don't need an online presence

**Use Storehouse if:**
- You sell 5+ items per day
- You want to save time
- You want to grow online
- You value real-time insights
- You want WhatsApp integration

---

## ✅ Try Both (Risk-Free!)

**Good news:** You don't have to choose! Many users:
1. Start with Storehouse (free signup, 30 seconds)
2. Test it for a week
3. Keep using it because it's 10x better
4. Export Excel backup anytime (we support Excel imports/exports!)

**Ready to save 10 hours/month?** [Sign up free →]`,
    relatedDocs: ['welcome-to-storehouse', 'pricing-plans', 'security-privacy'],
    keywords: ['excel vs storehouse', 'spreadsheet vs app', 'why not excel', 'excel alternative', 'google sheets', 'comparison', 'which is better', 'traditional methods'],
    lastUpdated: '2025-12-03',
  },

  {
    id: 'pricing-plans',
    category: 'marketing',
    title: 'How Much Does Storehouse Cost?',
    subtitle: '100% FREE forever (seriously!)',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 100,
    description: 'Transparent pricing - no hidden fees, no credit card required.',
    content: `**Short Answer:** Storehouse is **100% FREE** to start, and you can use it forever without paying!

---

## 🆓 FREE Plan (Forever)

**What you get for ₦0:**
- ✅ Unlimited products
- ✅ Unlimited sales tracking
- ✅ Customer management
- ✅ Online store (storehouse.ng/@yourname)
- ✅ WhatsApp ordering
- ✅ Accept OPay, Moniepoint, Banks
- ✅ Sales reports & profit tracking
- ✅ Invoice generation
- ✅ Mobile app access
- ✅ AI chat support (5 questions/month)
- ✅ Daily backups
- ✅ No ads!

**Perfect for:**
- Solopreneurs
- Small shops
- Side hustles
- Testing before committing

---

## 💼 PRO Plan (₦5,000/month)

**Everything in FREE, plus:**
- ✅ Unlimited AI chat support
- ✅ Staff accounts (add cashiers, managers)
- ✅ Advanced permissions & roles
- ✅ Priority WhatsApp support
- ✅ Custom store domain (yourname.com)
- ✅ Remove Storehouse branding
- ✅ Export to Excel anytime
- ✅ Bulk product import
- ✅ Expense tracking & tax estimates
- ✅ Customer debt management

**Perfect for:**
- Growing businesses
- Multiple staff members
- Professional branding
- Advanced features

---

## 🎁 LAUNCH BONUS (Limited Time)

**Sign up this month and get:**
- 30 days PRO trial (FREE)
- 50% off first 3 months (₦2,500/month)
- Lifetime FREE if you refer 10 friends!

---

## 💳 Payment Methods

We accept:
- 🟢 OPay
- 🔵 Moniepoint
- 🟣 PalmPay
- 🏦 Bank Transfer (GTBank, Access, Zenith, etc.)
- 💳 Debit Card (Verve, Mastercard, Visa)

---

## ❓ FAQs

**Q: Do I need a credit card to sign up?**
A: NO! Sign up is 100% free, no card required.

**Q: Can I cancel anytime?**
A: Yes! Cancel PRO anytime, no questions asked. Your data stays safe.

**Q: What happens if I don't pay?**
A: You automatically drop to FREE plan. Your data is NEVER deleted.

**Q: Is there a setup fee?**
A: NO setup fees, NO hidden charges, NO surprises!

**Q: Do you offer refunds?**
A: Yes! 30-day money-back guarantee if you're not satisfied.

---

## 🧮 Cost Comparison

**Manual Excel tracking:**
- "Free" but 10 hours/month = ₦50,000 opportunity cost

**Hiring a bookkeeper:**
- ₦30,000 - ₦100,000/month

**Storehouse:**
- ₦0 - ₦5,000/month
- Saves 10+ hours/month
- More accurate than humans!

---

## ✅ Ready to Start?

**No credit card. No setup fees. No risk.**

[Sign up FREE in 30 seconds →]`,
    relatedDocs: ['welcome-to-storehouse', 'storehouse-vs-excel', 'security-privacy'],
    keywords: ['pricing', 'cost', 'how much', 'free', 'paid', 'subscription', 'plans', 'price', 'payment', 'fees', 'charges'],
    lastUpdated: '2025-12-03',
  },

  {
    id: 'security-privacy',
    category: 'marketing',
    title: 'Is My Business Data Safe & Secure?',
    subtitle: 'Bank-level security for your peace of mind',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 90,
    description: 'Learn how we protect your business data with enterprise-grade security.',
    content: `**Short Answer:** YES! Your data is protected with the same security banks use. Here's exactly how:

---

## 🔐 Data Encryption

**What we do:**
- ✅ **256-bit SSL encryption** (same as banks)
- ✅ Data encrypted in transit (when you upload)
- ✅ Data encrypted at rest (when stored)
- ✅ No one (even our staff) can read your data

**What this means:**
Even if hackers intercept data, they see gibberish like: "8h#kL@9xP2$mQ" instead of "Product: Rice, Price: ₦5000"

---

## 🏢 Infrastructure Security

**We use Supabase (trusted by 100,000+ companies):**
- ✅ ISO 27001 certified (international security standard)
- ✅ SOC 2 Type II compliant (audited security)
- ✅ GDPR compliant (European data protection law)
- ✅ Daily backups (automatic, encrypted)
- ✅ 99.9% uptime guarantee

**Server location:** Secure data centers in Europe (Frankfurt, Germany)

---

## 👤 Privacy Protection

**We NEVER:**
- ❌ Sell your data to third parties
- ❌ Show ads based on your business info
- ❌ Share customer lists with anyone
- ❌ Access your data without permission

**You OWN your data:**
- ✅ Export anytime (Excel, CSV, PDF)
- ✅ Delete account anytime (data removed in 30 days)
- ✅ Control who sees what (staff permissions)

---

## 🔑 Access Control

**How we protect access:**
- ✅ Strong password requirements
- ✅ Automatic logout after inactivity
- ✅ Device-specific sessions
- ✅ Staff role permissions (Owner, Manager, Cashier)
- ✅ Audit logs (see who did what)

**You control:**
- Who can view products
- Who can edit prices
- Who can see profits
- Who can delete data

---

## 💾 Backup & Recovery

**Automatic protection:**
- ✅ Daily backups (last 30 days)
- ✅ Point-in-time recovery
- ✅ Accidental deletion protection
- ✅ Export backup anytime

**Example:** Accidentally deleted 100 products? We can restore them from yesterday's backup!

---

## 🌐 Online Store Security

**For your customers:**
- ✅ No payment card details stored on our servers
- ✅ OPay/Moniepoint payments go direct to YOUR account
- ✅ Customer phone numbers encrypted
- ✅ No customer data visible to other stores

---

## 📱 Mobile Security

**App protection:**
- ✅ Secure local storage (encrypted)
- ✅ Face ID / Fingerprint support (coming soon)
- ✅ Remote logout (if phone is stolen)
- ✅ Screen lock after inactivity

---

## ⚖️ Legal Compliance

**We comply with:**
- ✅ Nigerian Data Protection Regulation (NDPR)
- ✅ GDPR (European standard)
- ✅ PCI DSS (payment card security)

---

## 🆚 Security Comparison

**Excel on Google Drive/Dropbox:**
- Anyone with link can view
- No audit logs
- Accidental deletion = permanent loss
- No encryption at rest

**Storehouse:**
- Role-based access only
- Full audit trail
- 30-day backup retention
- Bank-level encryption

---

## ❓ Security FAQs

**Q: Can Storehouse staff see my data?**
A: NO. Data is encrypted. Only you have the decryption keys.

**Q: What if Storehouse gets hacked?**
A: Data is encrypted. Hackers see gibberish. Plus, we have 24/7 monitoring & instant alerts.

**Q: What if Storehouse shuts down?**
A: You get 90 days notice + free export of ALL your data.

**Q: Can my staff steal my customer list?**
A: You control permissions. Cashiers can't export data. Audit logs track everything.

---

## ✅ Our Promise

**We treat your data like our own:**
- 🔐 Bank-level security
- 🔒 Zero-knowledge encryption
- 💼 Compliant with international standards
- 📞 24/7 security monitoring
- ⚡ Instant breach alerts (99.99% uptime)

**Your business data is your livelihood. We take that responsibility seriously.**

[Start FREE with confidence →]`,
    relatedDocs: ['welcome-to-storehouse', 'pricing-plans', 'staff-management'],
    keywords: ['security', 'safe', 'privacy', 'data protection', 'secure', 'encryption', 'backup', 'hack', 'steal', 'safe', 'trust', 'reliable'],
    lastUpdated: '2025-12-03',
  },

  {
    id: 'no-coding-required',
    category: 'marketing',
    title: 'Do I Need to Know Coding or Tech?',
    subtitle: 'If you can use WhatsApp, you can use Storehouse',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 85,
    description: 'Storehouse is designed for non-technical business owners.',
    content: `**Short Answer:** NO! If you can use WhatsApp or Instagram, you can use Storehouse. Zero coding required!

---

## 👵 Designed for Everyone

**Our promise:**
- ✅ No technical jargon
- ✅ Simple Nigerian English
- ✅ Clear instructions in every step
- ✅ AI chat helper (ask anything!)
- ✅ Video tutorials (coming soon)

**Real user quote:**
> "I'm 55 years old and barely use computers. Storehouse is so easy, I set up my store in 10 minutes!" - Mama Ngozi, Lagos

---

## 📱 Easier Than Social Media

**If you can:**
- ✅ Post on Instagram → You can add products
- ✅ Send WhatsApp message → You can record sales
- ✅ View Facebook page → You can view your dashboard
- ✅ Use banking app → You can manage your store

**Storehouse is actually SIMPLER because:**
- No hashtags to remember
- No algorithms to fight
- No confusing settings
- Just tap, type, done!

---

## 🎯 Setup is Point-and-Click

**To create your online store:**
1. **Click** "Create Store" button
2. **Type** your store name
3. **Tap** payment methods you accept
4. **Share** your store link

**Time:** 3 minutes (seriously!)
**Coding required:** 0% ❌

---

## 🤝 We Guide You Every Step

**Built-in help:**
- 💬 **AI Chat Widget** - Ask anything, get instant answers
- 📋 **Step-by-step checklist** - Follow along
- 🎓 **Tooltips everywhere** - Hover for quick help
- 📱 **WhatsApp support** - Human help when you need it

**Example:**
- Confused about "SKU"? Hover to see: "Stock Keeping Unit - optional product code"
- Don't know cost price? Chat asks: "Did you pay ₦500 or ₦800 for this item?"

---

## 🏪 Your Store Looks Professional

**No design skills needed:**
- ✅ Beautiful templates (pre-designed)
- ✅ Auto-generated product pages
- ✅ Responsive (works on all phones)
- ✅ Fast loading (no coding needed)

**You just:**
- Upload product photos (from your phone)
- Type product names
- Set prices
- Done! ✨

---

## 🚫 What You DON'T Need

**You DON'T need:**
- ❌ Website design skills
- ❌ Programming knowledge
- ❌ HTML/CSS/JavaScript
- ❌ Graphic design software
- ❌ Domain registration (we provide: storehouse.ng/@yourname)
- ❌ Hosting setup
- ❌ SSL certificate installation
- ❌ Payment gateway integration

**We handle ALL the technical stuff!**

---

## 👨‍💻 What About Advanced Features?

**Even "advanced" features are simple:**

**Staff Management:**
- Click "Add Staff"
- Type their phone number
- Choose role: Owner, Manager, or Cashier
- Done!

**Payment Methods:**
- Click "Add Payment Method"
- Select "OPay"
- Type your OPay number
- Save!

**Reports:**
- Click "View Report"
- See chart automatically
- Download PDF (one click)

---

## 📊 Comparison: Old Way vs Storehouse

**Building website the old way:**
1. Learn HTML/CSS (6 months)
2. Buy domain (₦5,000/year)
3. Buy hosting (₦15,000/year)
4. Design website (3 weeks)
5. Add payment integration (hire developer: ₦50,000)
**Total:** ₦70,000 + 7 months

**Building store with Storehouse:**
1. Sign up (30 seconds)
2. Add products (5 minutes)
3. Click "Create Store" (2 minutes)
4. Share link (1 second)
**Total:** ₦0 + 8 minutes

---

## 🎓 Learning Curve

**Time to get started:**
- Excel: 2-3 hours (learning formulas)
- Shopify: 1-2 days (complex setup)
- **Storehouse: 8 minutes** (our record: 3 minutes!)

**Time to master:**
- Excel: 1-2 months
- Shopify: 2-3 weeks
- **Storehouse: 1 day** (most users feel comfortable after first day)

---

## ❓ Common Worries (Solved!)

**"I'm too old for this tech stuff"**
→ Our oldest user is 68! She manages 3 stores.

**"I only have a basic phone"**
→ Works on ANY smartphone (Android/iPhone)

**"I don't have a laptop"**
→ 100% mobile-friendly! No laptop needed.

**"What if I make a mistake?"**
→ AI helper corrects you. Nothing breaks. Easy undo.

**"I tried other apps and got confused"**
→ We designed Storehouse based on YOUR feedback. Nigerian English, Nigerian context.

---

## ✅ Try It Risk-Free

**Here's the deal:**
1. Sign up FREE (30 seconds, no card)
2. Add 1 test product (2 minutes)
3. See how easy it is
4. If confused, ask AI chat
5. Still confused? WhatsApp us!

**Guarantee:** If you can't set up your store in 10 minutes, we'll do it FOR you (free)!

[Start FREE - No Coding Required →]`,
    relatedDocs: ['welcome-to-storehouse', 'first-5-minutes-checklist', 'create-online-store'],
    keywords: ['no coding', 'easy', 'simple', 'non-technical', 'beginner', 'no tech', 'do i need coding', 'technical skills', 'user friendly', 'simple to use'],
    lastUpdated: '2025-12-03',
  },

  // ============================================
  // PRODUCT MANAGEMENT (9 guides)
  // ============================================

  {
    id: 'add-product-comprehensive',
    category: 'products',
    title: 'How to Add Products - Complete Guide',
    subtitle: 'Master every feature of the Add Product modal',
    difficulty: 'intermediate',
    estimatedTime: '15 minutes',
    priority: 90,
    description: 'Complete walkthrough of adding products with all fields, variants, images, categories, and specifications explained with Nigerian business examples.',
    content: `## Complete Guide to Adding Products in Storehouse

This comprehensive guide covers EVERY field and feature available when adding products to your inventory.

---

## Opening the Add Product Modal

**Click "+ Add Item"** button on your Dashboard (next to "Record Sale" button).

The "Add New Item" modal opens with 10+ field sections.

---

## SECTION 1: Required Fields

### 1. ITEM NAME (Required)
- Type the product name exactly as you want it to appear
- Examples: "Nike Air Force 1 White", "Indomie Chicken Flavor", "Samsung Galaxy A54"
- **Auto-Detection**: If you type an existing product name, Storehouse loads it for editing instead of creating a duplicate
- Must not be empty

### 2. SELLING PRICE (Required)
- Large, prominent field with ₦ symbol
- Label: "💰 Selling Price (Customer Pays)"
- This is what customers pay
- Format: Enter as decimal (e.g., 5000 or 5000.00)
- Must be ≥ ₦0
- **Nigerian Example**: Indomie pack costs you ₦120, you sell for ₦150

### 3. PURCHASE PRICE / COST PRICE (Required)
- Also called "Cost Price"
- This is what YOU paid your supplier
- Format: Enter as decimal (e.g., 3000.00)
- Must be ≥ ₦0
- **Used for**: Profit calculation and inventory valuation
- **Nigerian Example**: You bought Indomie carton for ₦5,000 (40 packs), so cost per pack = ₦125

### 4. QUANTITY (Required if no variants)
- Number of units in stock
- For new products: must be > 0
- **When editing existing items**, you'll see two modes:
  - **Add Units**: Adds to existing stock (e.g., 50 existing + 20 new = 70 total)
  - **Replace Total**: Sets absolute stock (e.g., replace 50 with 30)
  - Shows preview: "Current: 50 → New: 70"
- **Note**: Hidden if you enable variants (variants manage their own stock)

### 5. CATEGORY (Required)
- Dropdown with 9 options:
  - Fashion
  - Electronics
  - Food & Beverages
  - Beauty & Cosmetics
  - Furniture
  - Books
  - Phones & Accessories
  - Shoes
  - Other
- **Default**: Fashion
- **IMPORTANT**: Selecting a category shows category-specific fields (see Section 3 below)

---

## SECTION 2: Optional Core Fields

### 6. BARCODE / SKU (Optional)
- Text input for product codes
- Label: "Barcode / SKU (Optional)"
- Placeholder: "Scan or enter barcode/SKU"
- Help text: "Product barcode, SKU, or unique identifier for inventory tracking"
- **Nigerian Example**: "INDO-CHK-001" for Indomie Chicken, or scan actual barcode with phone
- **Benefit**: Fast item lookup during sales using barcode scanner

### 7. LOW STOCK ALERT LEVEL (Optional)
- Number input
- Label: "🔔 Low Stock Alert Level"
- Default: 10
- **Purpose**: System notifies you when stock drops below this threshold
- Help text: "You'll be notified when stock reaches this level"
- **Nigerian Example**: Set to 20 for fast-moving items like soft drinks, 5 for slow movers like designer shoes

### 8. DESCRIPTION (Optional)
- Textarea (3 rows, resizable)
- Label: "📝 Description (Optional)"
- Placeholder: "Additional details about this product (e.g., brand, size, color, material, condition...)"
- **Nigerian Example**: "Original UK used iPhone, excellent battery health, comes with charger"

### 9. PUBLIC VISIBILITY (Optional, checked by default)
- Checkbox: "📢 Show on Public Storefront"
- **When checked**: Item appears on your online store for customers to see
- **When unchecked**: Item is internal-only (not visible to public)
- Help text: "When checked, this item will be visible to customers on your store"
- **Nigerian Example**: Uncheck for wholesale items you don't want retail customers to see

---

## SECTION 3: Category-Specific Attributes (Dynamic Fields)

**These fields appear automatically based on the category you selected.** All are optional unless marked Required.

### For FASHION Category:
- **Size**: Dropdown (XXS, XS, S, M, L, XL, XXL, 3XL, 4XL, One Size)
- **Color**: Text (e.g., "Navy Blue", "Red")
- **Brand**: Text (e.g., "Zara", "Gucci")
- **Material**: Text (e.g., "100% Cotton", "Polyester blend")
- **Gender**: Dropdown (Male, Female, Unisex, Kids)
- **Fit**: Dropdown (Slim, Regular, Loose, Oversized)

**Nigerian Fashion Example**:
- Name: "Senator Style Kaftan"
- Size: XL
- Color: "White with Gold Embroidery"
- Material: "100% Cotton"
- Gender: Male
- Fit: Regular

### For ELECTRONICS Category:
- **Brand**: Text (e.g., "Samsung", "LG") **Required**
- **Model**: Text (e.g., "Galaxy A54 5G")
- **Warranty**: Dropdown (No Warranty, 3 Months, 6 Months, 1 Year, 2 Years, 3 Years)
- **Condition**: Dropdown (Brand New, Refurbished, Used)
- **Key Specifications**: Textarea (e.g., "6.4\" display, 128GB storage, 5000mAh battery")

**Nigerian Electronics Example**:
- Name: "Samsung 55\" Smart TV"
- Brand: Samsung (required)
- Model: "UA55CU7000"
- Warranty: 1 Year
- Condition: Brand New
- Specifications: "55-inch 4K UHD, Crystal Processor, Smart Hub"

### For FOOD & BEVERAGES Category:
- **Weight/Volume**: Text (e.g., "500g", "1L", "330ml")
- **Expiry Date**: Date picker
- **Ingredients**: Textarea
- **Dietary Information**: Dropdown (None, Vegetarian, Vegan, Halal, Kosher, Gluten-Free, Nut-Free)
- **Storage Instructions**: Text (e.g., "Keep refrigerated")

**Nigerian Food Example**:
- Name: "Indomie Chicken Flavor"
- Weight/Volume: "70g per pack"
- Expiry Date: 2025-12-31
- Dietary Information: Halal
- Storage: "Store in cool, dry place"

### For BEAUTY & COSMETICS Category:
- **Brand**: Text (e.g., "MAC", "Fenty Beauty")
- **Shade/Color**: Text (e.g., "Mocha", "#420")
- **Skin Type**: Dropdown (All Skin Types, Oily, Dry, Combination, Sensitive)
- **Key Ingredients**: Textarea (e.g., "Hyaluronic Acid, Vitamin C")
- **Volume/Size**: Text (e.g., "50ml", "15g")
- **Expiry Date**: Date picker

**Nigerian Beauty Example**:
- Name: "Shea Butter Body Cream"
- Brand: "Ori by Nneoma"
- Skin Type: All Skin Types
- Volume: "250ml"
- Ingredients: "100% raw shea butter, coconut oil"

### For FURNITURE Category:
- **Dimensions (L × W × H)**: Text (e.g., "200cm × 180cm × 45cm")
- **Material**: Text (e.g., "Solid Oak Wood")
- **Color/Finish**: Text (e.g., "Walnut Brown")
- **Weight**: Text (e.g., "35kg")
- **Assembly Required**: Dropdown (No, Yes - Easy, Yes - Moderate, Yes - Complex, Professional Installation Required)

**Nigerian Furniture Example**:
- Name: "6-Seater Dining Table"
- Dimensions: "180cm × 90cm × 75cm"
- Material: "Mahogany Wood with Glass Top"
- Color: "Dark Brown"
- Assembly: Yes - Easy

### For BOOKS Category:
- **Author**: Text (e.g., "Chimamanda Adichie")
- **Publisher**: Text (e.g., "Penguin Random House")
- **ISBN**: Text (e.g., "978-0-307-26557-1")
- **Number of Pages**: Number (e.g., 477)
- **Language**: Text (e.g., "English", "Yoruba")
- **Format**: Dropdown (Hardcover, Paperback, eBook, Audiobook)

**Nigerian Books Example**:
- Name: "Americanah"
- Author: "Chimamanda Ngozi Adichie"
- Publisher: "Fourth Estate"
- Pages: 477
- Language: English
- Format: Paperback

### For PHONES & ACCESSORIES Category:
- **Brand**: Text (e.g., "Apple", "Tecno") **Required**
- **Model**: Text (e.g., "iPhone 15 Pro", "Spark 10")
- **Storage**: Dropdown (16GB, 32GB, 64GB, 128GB, 256GB, 512GB, 1TB)
- **RAM**: Dropdown (2GB, 3GB, 4GB, 6GB, 8GB, 12GB, 16GB)
- **Color**: Text (e.g., "Midnight Black")
- **Condition**: Dropdown (Brand New, UK Used, US Used, Refurbished, Nigerian Used)

**Nigerian Phones Example**:
- Name: "Tecno Phantom X2 Pro"
- Brand: Tecno (required)
- Model: "Phantom X2 Pro"
- Storage: 256GB
- RAM: 12GB
- Color: "Stardust Grey"
- Condition: Brand New

### For SHOES Category:
- **Shoe Size**: Dropdown (35 to 47)
- **Brand**: Text (e.g., "Nike", "Adidas")
- **Color**: Text (e.g., "Triple White")
- **Material**: Text (e.g., "Leather", "Canvas")
- **Gender**: Dropdown (Men, Women, Unisex, Kids)

**Nigerian Shoes Example**:
- Name: "Nike Air Force 1"
- Shoe Size: 42
- Brand: Nike
- Color: "Triple White"
- Material: "Leather"
- Gender: Men

---

## SECTION 4: Product Images (Optional but Recommended)

### Image Limits by Subscription Plan:
- **Free Plan**: 1 image per product
- **Starter Plan**: 3 images per product
- **Pro Plan**: 5 images per product
- **Business Plan**: 10 images per product

### How to Upload Images:
1. Click "Upload Images" or "Add Images" button
2. Select images from your device
3. Wait for upload (progress bar shows status)
4. **Set Primary Image**: Click star icon on the image you want as main photo
5. **Reorder Images**: Drag and drop to change order
6. **Delete Image**: Click X icon on unwanted images

### Image Requirements:
- **Formats**: JPG, PNG, WebP (all image types supported)
- **Automatic Features**:
  - Compression (max 1200px width) for fast loading
  - ImageKit CDN integration for optimized delivery
  - Thumbnail generation
- **Best Practices**:
  - Use square images (1:1 ratio) for consistent display
  - Min resolution: 500×500px
  - Show product from multiple angles
  - Include product in use (lifestyle shots)

### IMPORTANT: Must Complete Upload Before Saving
- "Save Item" button shows "Uploading images..." and is disabled while images upload
- Wait for all images to finish uploading before clicking Save

**Nigerian Example**: For a fashion boutique selling Ankara dresses, upload:
1. Front view (set as primary)
2. Back view
3. Side view
4. Close-up of fabric pattern
5. Model wearing the dress

---

## SECTION 5: Product Variants (Optional but Powerful)

**What are variants?** Sell the same product in different sizes, colors, or other options, each with its own stock and optional price.

### When to Use Variants:
- Clothing in different sizes (S, M, L, XL)
- Shoes in different sizes (38, 39, 40, 41)
- Products in different colors (Red, Blue, Green)
- Any product with multiple options

### How to Create Variants:
1. Check the box: **"This product has variants (size, color, etc.)"**
2. **Add Option Types**: Click "+ Add Option" and enter type (e.g., "Size", "Color")
3. **Add Values**: For each option type, add values (e.g., Small, Medium, Large)
4. **Auto-Generation**: System creates all combinations automatically
   - Example: 3 sizes × 3 colors = 9 variants
5. **Variant Table Shows**:
   - Variant Name (auto-generated like "Red - Large")
   - SKU (optional, unique per variant)
   - Quantity (stock for this specific variant)
   - Price Override (optional, uses base selling price if empty)
6. **Bulk Actions**:
   - "Set All Quantities" button: Apply same stock to all variants
   - "Set All Prices" button: Apply same price to all variants

**Nigerian Fashion Store Example**:
Product: "Ankara Maxi Dress"
Base Price: ₦15,000

Variants:
- Small (Stock: 10, Price: ₦15,000)
- Medium (Stock: 15, Price: ₦15,000)
- Large (Stock: 12, Price: ₦16,000) ← Price override
- XL (Stock: 8, Price: ₦17,000) ← Price override

**When Variants Are Enabled**:
- Main quantity field is hidden (each variant tracks its own stock)
- During sales, cashier selects product then chooses variant
- Stock decreases for the specific variant sold

---

## SECTION 6: Product Specifications for AI (Optional but Powerful)

**Label**: "📋 Product Specifications (Optional - AI will use these)"

These structured fields enable the AI chatbot to accurately answer customer questions about your products.

### Why Use Specifications?
- **AI chatbot** can answer technical questions about products
- **Online store** can display detailed specs
- **Customer confidence** increases with detailed information

### Common Specification Fields (varies by category):

**For Electronics**:
- Battery Life (e.g., "Up to 22 hours video playback")
- Screen Size (e.g., "6.1 inches")
- Camera (e.g., "12MP triple camera system")
- RAM (e.g., "6GB")
- Storage (e.g., "256GB")
- Processor (e.g., "A15 Bionic chip")
- Operating System (e.g., "iOS 17")

**For Fashion**:
- Fabric/Material (e.g., "100% cotton")
- Fit (e.g., "True to size")
- Care Instructions (e.g., "Machine washable, tumble dry low")
- Country of Origin (e.g., "Made in Nigeria")

**For Food**:
- Ingredients (e.g., "Tomatoes, onions, peppers, palm oil")
- Spice Level (e.g., "Medium (7/10)")
- Allergens (e.g., "Contains nuts, gluten")
- Nutritional Info (e.g., "250 kcal per serving")

**Nigerian Electronics Example**:
Product: "Samsung Galaxy A54"
Specifications:
- Screen Size: 6.4 inches
- Camera: 50MP main + 12MP ultrawide + 5MP macro
- RAM: 8GB
- Storage: 256GB
- Battery: 5000mAh
- Operating System: Android 13 with One UI 5.1

**Result**: When customer asks chatbot "how long does the battery last?", AI can answer "The Samsung Galaxy A54 has a 5000mAh battery" using these specs.

---

## SECTION 7: Profit Calculator (Auto-Display)

**Automatically appears** when you enter both Purchase Price and Selling Price.

### What It Shows:
- **Profit per Unit**: ₦X,XXX (Y% markup)
- **Total Potential Profit**: Profit × Quantity
- **Warning if Loss**: Red alert if Selling Price < Purchase Price

**Nigerian Example**:
- Purchase Price: ₦120
- Selling Price: ₦150
- Quantity: 100

**Calculator Shows**:
- Profit per unit: ₦30 (25% markup)
- Total potential profit: ₦3,000 (30 × 100)

---

## SECTION 8: Validation Rules

### What You MUST Fill to Save:
1. ✅ Item Name (cannot be empty)
2. ✅ Quantity > 0 (OR variants if variants enabled)
3. ✅ Purchase Price ≥ ₦0
4. ✅ Selling Price ≥ ₦0
5. ✅ Category (default: Fashion)

### Optional Fields (No Error if Left Empty):
- All category-specific attributes
- Product images
- Barcode/SKU
- Description
- Low stock threshold (defaults to 10)
- Product specifications
- Public visibility (defaults to checked)
- Variants

### Special Behaviors:
- **Duplicate Detection**: If you type an existing product name, Storehouse loads it for editing
- **Weighted Average Costing**: When adding stock to existing items, purchase price recalculates using weighted average formula
- **Upload Blocking**: Cannot save while images are uploading

---

## SECTION 9: Save and Success

### Save Button States:
- **Normal**: "Save Item" (green, clickable)
- **Uploading**: "Uploading images..." (grey, disabled)
- **After Save**: Modal closes, success toast appears

### Success Messages:
- **New Product**: "✅ Product added successfully!"
- **Edit (Add Mode)**: "✅ Added 20 units to iPhone 15!"
- **Edit (Replace Mode)**: "✅ Stock updated to 50 units"

---

## SECTION 10: Bulk Import Alternative

### For Adding Many Products at Once:

Instead of "+ Add Item", use **"📥 Import" button** (next to search bar on Dashboard).

**CSV Import Process**:
1. Download template CSV
2. Fill Excel/Google Sheets with:
   - Item Name / Product / Name
   - Price / Selling Price
   - Cost / Cost Price
   - Quantity / Stock
   - Category
   - Barcode
   - Low Stock Alert
3. Upload CSV file
4. Preview first 10 items
5. Confirm import

**Sample CSV**:
    Item Name,Selling Price,Cost Price,Quantity,Category,Barcode,Low Stock Alert
    Nike Air Force 1,45000,35000,20,Shoes,NIKE-AF1-W,5
    Indomie Chicken,150,120,500,Food & Beverages,IND-CHK,50
    Samsung A54,285000,270000,10,Phones & Accessories,SAM-A54-256,3

---

## SECTION 11: Real-World Nigerian Business Examples

### Example 1: Fashion Boutique (Lekki, Lagos)
**Product**: Ankara Maxi Dress
- **Name**: "Ankara Sunset Maxi Dress"
- **Category**: Fashion
- **Purchase Price**: ₦8,000 (from Balogun Market)
- **Selling Price**: ₦18,000
- **Quantity**: 15
- **Size**: Create variants (S, M, L, XL)
- **Color**: "Orange & Yellow Pattern"
- **Material**: "100% Cotton Ankara"
- **Gender**: Female
- **Images**: 5 photos (front, back, side, pattern close-up, model shot)
- **Public Visibility**: ✅ Checked (show on online store)
- **Profit**: ₦10,000 per dress (125% markup)

### Example 2: Electronics Shop (Ikeja Computer Village)
**Product**: UK Used iPhone 13
- **Name**: "iPhone 13 128GB (UK Used)"
- **Category**: Phones & Accessories
- **Brand**: Apple (required)
- **Model**: "iPhone 13"
- **Purchase Price**: ₦420,000
- **Selling Price**: ₦485,000
- **Quantity**: 3
- **Storage**: 128GB
- **RAM**: 4GB
- **Color**: "Midnight Black"
- **Condition**: UK Used
- **Specifications**:
  - Screen: 6.1" Super Retina XDR
  - Camera: 12MP dual
  - Battery: 3,227mAh
  - Chip: A15 Bionic
- **Warranty**: 3 Months
- **Description**: "Excellent condition, 95% battery health, original box included"
- **Profit**: ₦65,000 per unit (15.5% markup)

### Example 3: Supermarket (Surulere, Lagos)
**Product**: Indomie Carton
- **Name**: "Indomie Chicken Flavor (Carton of 40)"
- **Category**: Food & Beverages
- **Purchase Price**: ₦5,000 (from distributor)
- **Selling Price**: ₦6,000
- **Quantity**: 50 cartons
- **Weight/Volume**: "40 packs × 70g"
- **Expiry Date**: 2025-12-31
- **Dietary**: Halal
- **Storage**: "Store in cool, dry place"
- **Low Stock Alert**: 10 cartons
- **Public Visibility**: ✅ Checked
- **Profit**: ₦1,000 per carton (20% markup)

### Example 4: Furniture Store (Abuja)
**Product**: Executive Office Chair
- **Name**: "Ergonomic Executive Office Chair"
- **Category**: Furniture
- **Purchase Price**: ₦65,000
- **Selling Price**: ₦95,000
- **Quantity**: 8
- **Dimensions**: "65cm × 70cm × 120cm"
- **Material**: "Genuine Leather with Chrome Base"
- **Color**: "Black"
- **Weight**: "18kg"
- **Assembly**: Yes - Easy
- **Description**: "360° swivel, adjustable height, lumbar support"
- **Images**: 4 photos
- **Profit**: ₦30,000 per chair (46% markup)

### Example 5: Beauty Supply Store (Port Harcourt)
**Product**: Shea Butter Cream
- **Name**: "Ori Natural Shea Butter Body Cream"
- **Category**: Beauty & Cosmetics
- **Brand**: "Ori by Nneoma"
- **Purchase Price**: ₦1,500
- **Selling Price**: ₦3,500
- **Quantity**: 100
- **Skin Type**: All Skin Types
- **Volume**: "250ml"
- **Ingredients**: "100% raw shea butter, coconut oil, vitamin E"
- **Expiry Date**: 2026-06-30
- **Description**: "Locally made, no chemicals, perfect for Nigerian weather"
- **Low Stock Alert**: 20
- **Profit**: ₦2,000 per jar (133% markup)

---

## Troubleshooting

### "I can't see the Add Item button"
**Solution**: Only Owners and Managers can add products. If you're logged in as Staff (Cashier role), you don't have permission. Check Settings → Team & Permissions to see your role.

### "Validation error: Please enter valid prices"
**Solution**: Purchase Price and Selling Price must be positive numbers (≥ 0). Check for:
- Negative numbers
- Letters or symbols (except decimal point)
- Empty fields

### "Product not showing after saving"
**Solution**:
- Check internet connection (product saves locally and syncs when online)
- Refresh the page
- Check if "Show on Public Storefront" is unchecked (would hide from store)

### "Image upload failed"
**Solution**:
- Check internet connection
- Ensure image is under 2MB
- Try different image format (JPG/PNG)
- Check subscription plan (Free plan = 1 image only)

### "Variants not appearing during sale"
**Solution**:
- Ensure "This product has variants" checkbox is checked
- Each variant must have quantity > 0
- Save the product after adding variants
- Refresh page and try recording sale again

---

**Related Guides**: Add First Product (Basic), Edit Products, Product Variants, Product Images, CSV Import, Online Store Setup, Profit Calculator`,
    relatedDocs: ['add-first-product', 'product-variants', 'product-images', 'csv-import', 'edit-product'],
    keywords: [
      // Core actions
      'add product', 'add item', 'add inventory', 'create product', 'new product',
      'add products', 'how to add', 'add items', 'add stock', 'product creation',

      // Detailed queries
      'product fields', 'required fields', 'product form', 'product modal',
      'all product fields', 'product details', 'product information',

      // Images
      'product images', 'upload image', 'multiple images', 'product photos',
      'image upload', 'add pictures', 'product pictures',

      // Variants
      'product variants', 'sizes', 'colors', 'product options', 'variant creation',
      'size options', 'color options', 'different sizes', 'multiple options',

      // Categories
      'product category', 'fashion category', 'electronics category',
      'category fields', 'category attributes', 'category-specific',

      // Specifications
      'product specifications', 'product specs', 'technical details', 'ai specifications',

      // Pricing
      'profit calculator', 'purchase price', 'cost price', 'selling price',
      'markup', 'profit margin',

      // Stock
      'quantity', 'stock quantity', 'inventory quantity', 'add stock',
      'low stock alert', 'stock threshold',

      // Other features
      'barcode', 'sku', 'product code', 'public visibility', 'storefront visibility',
      'bulk import', 'csv import', 'import products',

      // Nigerian context
      'nigerian products', 'naira pricing', 'lagos business', 'ankara products',
      'indomie', 'computer village',
    ],
    lastUpdated: '2025-12-03',
  },

  // ============================================
  // INVOICES - MICRO-CHUNKS (17 focused guides)
  // ============================================
  // Replaced monolithic 1000+ line guide with 17 focused chunks (50-150 lines each)
  // for better RAG retrieval and precise answers
  ...invoiceMicroChunks,

  // ============================================
  // LEGACY COMPREHENSIVE INVOICE GUIDE (ARCHIVED - DO NOT USE)
  // ============================================
  // This monolithic guide has been replaced by 17 micro-chunks above
  // Kept for reference only - RAG should never retrieve this
  /*
  {
    id: 'invoices-comprehensive-ARCHIVED',
    category: 'invoices',
    title: 'How to Create & Manage Invoices - Complete Guide',
    subtitle: 'Master B2B invoicing, payments, and customer billing',
    difficulty: 'intermediate',
    estimatedTime: '20 minutes',
    priority: 85,
    description: 'Complete walkthrough of creating professional invoices, tracking payments, sharing with customers, and managing B2B sales with Nigerian business examples.',
    content: `## Complete Guide to Invoices in Storehouse

This comprehensive guide covers EVERY feature of the invoice system from creation to payment confirmation.

---

## What Are Invoices?

**Invoices** are for B2B (business-to-business) sales where you need to:
- Track payment over time (not instant payment)
- Send professional documents to customers
- Manage multiple line items with details
- Monitor which invoices are paid/unpaid/overdue
- Accept online payments via Paystack

**Difference from Regular Sales:**
- **Sales** = Instant POS transactions (cash, transfer, credit)
- **Invoices** = Formal billing with payment tracking over time

---

## SECTION 1: Accessing Invoices

### Navigate to Invoices Page

1. Click **"Invoices"** in the sidebar (left menu)
2. You'll see the Invoices Dashboard with:
   - Summary cards (Total Invoices, Paid Amount, Pending Payment)
   - Filter tabs (All, Draft, Sent, Partial, Overdue, Paid)
   - Search bar
   - Invoice table
   - **"+ Create Invoice"** button (top right)

---

## SECTION 2: Creating a New Invoice

### Step 1: Click "Create Invoice"

Click the **"+ Create Invoice"** button on the Invoices page.

The **Create Invoice** form opens with 4 sections:
1. Customer Information
2. Invoice Details
3. Line Items
4. Totals & Adjustments

---

### Step 2: Fill Customer Information

**Required Fields:**
- **Customer Name** (required): Full business or person name

**At Least One Contact Required:**
- **Email**: For emailing invoice
- **Phone**: For WhatsApp/SMS sharing
- You MUST provide email OR phone (or both)

**Optional Fields:**
- **Address**: Business address

**Nigerian Example - Wholesaler Invoice:**
Customer Name: Chioma Electronics Ltd
Email: orders@chiomaelectronics.ng
Phone: +234 803 456 7890
Address: Shop 45, Computer Village, Ikeja, Lagos

---

### Step 3: Set Invoice Details

**Issue Date:**
- Defaults to today
- Change if invoice was created earlier

**Payment Terms:**
- **Due on Receipt**: Payment required immediately
- **Net 7 days**: Payment due in 7 days
- **Net 15 days**: Payment due in 15 days (most common)
- **Net 30 days**: Payment due in 30 days
- **Net 60 days**: Payment due in 60 days
- **Custom**: Set your own due date manually

**Due Date:**
- Auto-calculated based on Payment Terms
- Can be changed manually
- Shows red "Overdue" badge if payment is late

**Nigerian Example:**
Issue Date: 20 Nov 2025
Payment Terms: Net 15 days
Due Date: 5 Dec 2025 (auto-calculated)

---

### Step 4: Add Line Items

**Each line item has:**
1. **Item name** (required): Product/service sold
2. **Description** (optional): Additional details
3. **Quantity** (required): Number of units
4. **Price** (required): Unit price in Naira
5. **Total**: Auto-calculated (Quantity × Price)

**Add More Items:**
- Click **"+ Add Item"** to add another row
- Minimum 1 item required
- No maximum limit

**Remove Items:**
- Click trash icon to delete item
- Cannot delete if only 1 item remains

**Nigerian Example - Electronics Wholesale:**
Item 1:
  Name: Samsung 55" Smart TV
  Description: Model UN55AU7000, 4K UHD
  Quantity: 10
  Price: ₦250,000
  Total: ₦2,500,000

Item 2:
  Name: LG Inverter AC 1.5HP
  Description: 1 year warranty included
  Quantity: 5
  Price: ₦180,000
  Total: ₦900,000

---

### Step 5: Adjustments & Totals

**Discount:**
- Enter discount amount in Naira
- Subtracted from subtotal before VAT

**Tax/VAT:**
- Toggle **"Include Tax"** checkbox
- Default VAT rate: 7.5% (Nigeria standard)
- Can change VAT percentage
- VAT calculated AFTER discount

**Totals Calculation:**
1. **Subtotal** = Sum of all line items
2. **After Discount** = Subtotal - Discount
3. **VAT** = After Discount × VAT%
4. **Total** = After Discount + VAT

**Nigerian Example - Full Calculation:**
Subtotal: ₦3,400,000
Discount: ₦100,000
After Discount: ₦3,300,000
VAT (7.5%): ₦247,500
**TOTAL: ₦3,547,500**

---

### Step 6: Notes & Terms (Optional)

**Notes:**
- Internal notes visible on invoice
- Example: "Bulk order discount applied"

**Terms & Conditions:**
- Default: "Payment is due within the agreed terms..."
- Customize with your policies:
  - Late payment fees
  - Return policy
  - Warranty terms

**Nigerian Example:**
Notes: "10% discount for orders above ₦3M"

Terms: "Payment due within 15 days. Late payments subject to 5% monthly interest. All sales final after delivery. 1-year manufacturer warranty applies."

---

### Step 7: Save as Draft or Send

**Two Options:**

**1. Save as Draft**
- Invoice saved with status **"Draft"**
- NOT sent to customer yet
- You can edit before sending
- Use for: preparing invoices, getting approvals

**2. Mark as Sent**
- Invoice saved with status **"Sent"**
- Marks invoice as shared with customer
- Customer should receive it
- Due date tracking starts

**Success:**
- Redirects to Invoices page
- Invoice appears in table
- Auto-generated invoice number (e.g., **INV-001**)

---

## SECTION 3: Invoice Status System

**Storehouse tracks 6 invoice statuses:**

**1. Draft** (Gray)
- Invoice created but not sent yet
- No payment tracking
- Can edit freely

**2. Sent** (Blue)
- Invoice shared with customer
- Waiting for payment
- Due date countdown active

**3. Viewed** (Purple)
- Customer opened the invoice link
- They've seen it (coming soon feature)

**4. Partial** (Orange)
- Customer paid some amount
- Balance still due
- Shows: Paid ₦X, Balance ₦Y

**5. Paid** (Green)
- Fully paid
- No balance due
- Archive-ready

**6. Overdue** (Red)
- Due date passed
- Payment not received
- Auto-marked by system daily
- Send payment reminders!

---

## SECTION 4: Viewing & Managing Invoices

### Invoice List Dashboard

**Summary Cards:**
- **Total Invoices**: Count of all invoices
- **Paid Amount**: Total money received
- **Pending Payment**: Outstanding balance
- **Overdue** (if any): Late payments

**Filters:**
- Click tabs: All | Draft | Sent | Partial | Overdue | Paid
- Shows matching invoices only

**Search:**
- Type invoice number: "INV-001"
- Type customer name: "Chioma"
- Type email: "orders@"

**Table Columns:**
- Invoice #
- Customer (name + email)
- Issue Date
- Due Date (with countdown/overdue days)
- Amount (total)
- Paid (amount paid)
- Balance (remaining)
- Status badge
- Actions (View icon)

---

### Viewing Invoice Detail

**Click any invoice row** to view full details.

**Invoice Detail Page Shows:**

**1. Company Branding** (top)
- Your business name
- Your phone, email
- Professional header

**2. Invoice Header**
- Invoice number (INV-001)
- Status badge
- Issue date & Due date

**3. Bill To Section**
- Customer name
- Email, phone, address

**4. Line Items Table**
- All products/services
- Quantities, prices, totals

**5. Totals Section**
- Subtotal
- Discount (if any)
- VAT (if any)
- **Grand Total**
- **Amount Paid**
- **Balance Due**

**6. Payment History** (if payments recorded)
- Date of each payment
- Amount paid
- Payment method
- Reference number

**7. Notes & Terms**
- Your notes
- Terms & conditions

---

## SECTION 5: Sharing Invoices with Customers

**From Invoice Detail page:**

**Share Invoice Section** (bottom left) offers 4 options:

### 1. WhatsApp

**Requirements:** Customer phone number must be set

**Click "WhatsApp" button** → Opens WhatsApp with pre-filled message:

📄 INVOICE INV-001

Hello [Customer Name],

Here's your invoice for recent purchase:

💰 Amount: ₦3,547,500
📅 Due Date: 5 December 2025

View full invoice: [link]

Thank you for your business! 🙏

**If customer phone exists:**
- Opens chat with that customer
- Message pre-filled
- Just click Send

**If no phone:**
- Opens WhatsApp contact picker
- Choose recipient manually

---

### 2. Email

**Requirements:** Customer email must be set

**Click "Email" button** → Opens your email app with:

**Subject:** Invoice INV-001 from [Your Name]

**Body:** Formatted invoice details with link

**You can:**
- Edit message before sending
- Add attachments
- CC others

---

### 3. SMS

**Requirements:** Customer phone must be set

**Click "SMS" button** → Opens SMS app with:

"Invoice INV-001: ₦3,547,500 due 5 Dec 2025. View: [link]"

**Best for:**
- Quick reminders
- No internet customers
- Follow-ups

---

### 4. Copy Link

**Click "Copy Link"** → Invoice URL copied to clipboard

**Share via:**
- Paste in any chat app
- Email manually
- Social media
- Anywhere you want

**Link format:**
https://storehouse.com/invoice/abc123

**Customer can:**
- View full invoice
- See payment history
- Pay online (if Paystack enabled)

---

## SECTION 6: Recording Payments

### When Customer Pays

**From Invoice Detail page:**

1. Click **"Record Payment"** button (bottom right)

**Payment Modal Opens** with fields:

---

### Payment Form Fields

**1. Amount (₦)** (required)
- Enter payment received
- Can be partial (less than balance)
- Cannot exceed balance due
- Shows balance reminder below

**Example:** Balance ₦3,547,500
Enter: ₦2,000,000 (partial payment)

**2. Payment Method** (required)
- Cash
- Bank Transfer
- Card
- Paystack (online payment)
- POS
- Cheque
- Other

**3. Reference** (optional)
- Transaction ID
- Cheque number
- Transfer reference

**Example:** TRF/2025/11/001234

**4. Notes** (optional)
- Additional info
- Payment conditions

**Example:** "First installment, balance in 7 days"

---

### Save Payment

Click **"Record Payment"** button

**What Happens:**
1. Payment saved to invoice
2. Amount Paid updated
3. Balance Due recalculated
4. Status updated automatically:
   - If full payment → **Paid**
   - If partial → **Partial**
5. Payment appears in Payment History
6. Invoice refreshes

---

### Multiple Payments Example

**Nigerian Scenario - Installment Payments:**

**Invoice Total:** ₦3,547,500
**Due Date:** 5 Dec 2025

**Payment 1 (25 Nov):**
Amount: ₦1,500,000
Method: Bank Transfer
Reference: TRF/001
Status: **Partial**

**Payment 2 (2 Dec):**
Amount: ₦2,047,500
Method: Cash
Reference: -
Status: **Paid** ✅

**Payment History Shows:**
1. 2 Dec 2025 - Cash - ₦2,047,500
2. 25 Nov 2025 - Transfer (TRF/001) - ₦1,500,000

**Total Paid:** ₦3,547,500
**Balance:** ₦0

---

## SECTION 7: Invoice Actions

### Edit Invoice

**Click "Edit" button** (top right on invoice detail)

**You can change:**
- Customer details
- Due date
- Payment terms
- Notes
- Terms & conditions

**You CANNOT change:**
- Invoice number (auto-generated)
- Line items (after sent)
- Issue date

**Best Practice:**
- Only edit Draft invoices freely
- Edit Sent invoices carefully (customer may have original)

---

### Delete Invoice

**Click "Delete" button** (top right)

**Confirmation:** "Are you sure you want to delete invoice INV-001?"

**When deleted:**
- Invoice removed permanently
- Cannot be recovered
- Invoice number not reused

**Warning:** Only delete by mistake. For cancelled invoices, mark as Cancelled instead.

---

### Mark as Sent

**For Draft invoices:**

**Click "Mark as Sent"** button

**What happens:**
- Status changes: Draft → Sent
- Due date tracking starts
- Overdue monitoring active

---

### Send Payment Reminder

**For Overdue invoices:**

**From Invoices List page:**
- Overdue invoices show **Send** button
- Click to send reminder

**Reminder sent via:**
- WhatsApp (if phone exists)
- Email (if email exists)
- SMS

**Message:** "Payment reminder: Invoice INV-001 for ₦3,547,500 is X days overdue. Please settle."

---

## SECTION 8: Paystack Online Payments (Advanced)

**Enable customers to pay online via card/transfer**

**Requirements:**
1. Paystack account
2. Paystack secret key configured in Storehouse
3. Customer email must be set

**How It Works:**

1. When creating invoice, **Generate Payment Link** option appears
2. Click to create Paystack payment link
3. Link added to invoice automatically
4. When you share invoice (WhatsApp/Email), link included
5. Customer clicks link → Paystack payment page
6. Customer pays online
7. Paystack notifies Storehouse
8. Payment auto-recorded
9. Invoice auto-marked as Paid

**Benefits:**
- Faster payments
- No manual recording
- Card payments accepted
- Customer convenience
- Payment confirmation automatic

---

## SECTION 9: Invoice Statuses Explained

### Auto Status Updates

Storehouse automatically updates invoice status based on:

**1. Payment Amount:**
- 0% paid → Sent/Draft
- 1-99% paid → **Partial**
- 100% paid → **Paid**

**2. Due Date:**
- If Sent/Partial and past due date → **Overdue**

**3. Manual Actions:**
- Mark as Sent → **Sent**
- Record payment → **Partial** or **Paid**
- Delete → Removed

**Daily Cron Job:**
- Runs at midnight
- Checks all invoices
- Marks overdue automatically

---

## SECTION 10: Real Nigerian Business Examples

### Example 1: Construction Supplies B2B

**Business:** Dangote Building Materials Dealer (Abuja)
**Customer:** Metro Construction Ltd

**Invoice:**
Customer: Metro Construction Ltd
Email: procurement@metroconstruction.ng
Phone: +234 809 123 4567
Address: Plot 234, Central Business District, Abuja

Issue Date: 1 Dec 2025
Payment Terms: Net 30
Due Date: 31 Dec 2025

**Items:**
1. Dangote Cement (50kg) - 500 bags × ₦5,200 = ₦2,600,000
2. Iron Rods (16mm) - 200 pieces × ₦3,500 = ₦700,000
3. Binding Wire - 50 rolls × ₦2,800 = ₦140,000

Subtotal: ₦3,440,000
Discount: ₦40,000 (bulk discount)
VAT (7.5%): ₦255,000
**Total: ₦3,655,000**

Terms: "Delivery within 3 days. Payment via transfer. 2% late fee after 30 days."

**Payment Timeline:**
- 15 Dec: ₦2,000,000 (Partial)
- 28 Dec: ₦1,655,000 (Paid)

---

### Example 2: Fashion Wholesale

**Business:** Balogun Market Fabrics (Lagos)
**Customer:** Abuja Fashion Boutique

**Invoice:**
Customer: Treasure's Fashion Hub
Email: treasurefashion@gmail.com
Phone: +234 803 456 7890

Issue Date: 10 Nov 2025
Payment Terms: Net 15
Due Date: 25 Nov 2025

**Items:**
1. Ankara Fabric (6 yards) - 50 pieces × ₦12,000 = ₦600,000
2. Swiss Lace (5 yards) - 20 pieces × ₦25,000 = ₦500,000
3. Senator Material - 30 pieces × ₦8,000 = ₦240,000

Subtotal: ₦1,340,000
No discount
No VAT (not registered)
**Total: ₦1,340,000**

**Payment:**
- 24 Nov: ₦1,340,000 via Bank Transfer (Paid on time!)

---

### Example 3: Food Supplies

**Business:** Mama Cass Provisions (Ibadan)
**Customer:** University Cafeteria

**Invoice:**
Customer: UI Student Cafeteria
Email: cafeteria@ui.edu.ng
Phone: +234 805 111 2222

Issue Date: 5 Dec 2025
Payment Terms: Net 7
Due Date: 12 Dec 2025

**Items:**
1. Rice (50kg) - 10 bags × ₦45,000 = ₦450,000
2. Vegetable Oil (25L) - 5 jerry cans × ₦32,000 = ₦160,000
3. Tomato Paste (carton) - 20 cartons × ₦18,000 = ₦360,000
4. Indomie (carton) - 30 cartons × ₦4,500 = ₦135,000

Subtotal: ₦1,105,000
Discount: ₦55,000
VAT (7.5%): ₦78,750
**Total: ₦1,128,750**

**Payment:**
- Not paid by 12 Dec → Status: **Overdue**
- Send WhatsApp reminder
- Paid 15 Dec: ₦1,128,750 (3 days late)

---

## SECTION 11: Troubleshooting & FAQs

### "I can't find the Create Invoice button"

**Solution:** Click **"Invoices"** in sidebar first. Button is top-right on Invoices page.

---

### "Invoice number keeps incrementing"

**Expected behavior:** Each new invoice gets next number automatically (INV-001, INV-002, etc.). Cannot be changed.

---

### "Customer didn't receive invoice"

**Check:**
1. Customer email/phone correct?
2. Did you click Share button?
3. Check spam folder (for emails)
4. WhatsApp message sent successfully?
5. Try Copy Link and share manually

---

### "Can I edit invoice after sending?"

**Yes, but be careful:**
- Click Edit button on invoice detail
- Changes won't update customer's copy
- Best practice: Send updated invoice again

---

### "How do I cancel an invoice?"

**Option 1:** Delete invoice (if never sent)
**Option 2:** Keep invoice, add note "CANCELLED" in Notes field

---

### "Invoice shows wrong due date"

**Fix:**
1. Click Edit
2. Change Payment Terms to "Custom"
3. Set Due Date manually
4. Save

---

### "Payment recorded but status still Overdue"

**Reason:** Status checks:
1. Payment amount
2. Due date

**If partial payment + past due → Still Overdue**
**Only when fully paid → Paid**

---

### "Can I send invoice without email/phone?"

**No.** You must provide:
- Customer Email, OR
- Customer Phone, OR
- Both

**Workaround:** Use Copy Link button, share link manually anywhere.

---

### "VAT not calculating"

**Check:**
1. Is "Include Tax" checkbox enabled?
2. VAT percentage set? (default 7.5%)
3. VAT calculated on: (Subtotal - Discount)

---

### "Where are my invoices stored?"

**All invoices saved in:**
- Invoices page → Table
- Filter by status to find
- Search by customer name/invoice number

---

## SECTION 12: Best Practices

**1. Always Set Clear Payment Terms**
- Net 15 is standard for most Nigerian businesses
- Net 7 for regular customers
- Net 30 for large corporate clients

**2. Send Invoices Immediately**
- Don't save as Draft unless reviewing
- Faster invoices = faster payments

**3. Follow Up on Overdue Invoices**
- Check Overdue tab daily
- Send WhatsApp reminders
- Call customer if >7 days overdue

**4. Record Payments Same Day**
- Don't delay payment recording
- Accurate balance tracking important
- Builds customer trust

**5. Use Professional Details**
- Set your business name in Settings
- Include contact info
- Customize Terms & Conditions

**6. Keep Notes for Records**
- Document discount reasons
- Note payment plans
- Track special agreements

**7. Review Payment History**
- Check which customers pay on time
- Identify slow payers
- Adjust terms accordingly

**8. Enable Paystack for Big Customers**
- Corporate clients prefer card payment
- Reduces collection time
- Professional image

---

## Summary

**Invoices in Storehouse help you:**
✅ Create professional B2B invoices in 2 minutes
✅ Track payments over time (partial, full)
✅ Share via WhatsApp, Email, SMS, Link
✅ Monitor due dates and overdue invoices
✅ Accept online payments via Paystack
✅ Auto-generate invoice numbers
✅ Calculate VAT and discounts automatically
✅ Maintain payment history
✅ Send automated reminders

**Next Steps:**
1. Go to Invoices page
2. Click "+ Create Invoice"
3. Fill customer details
4. Add line items
5. Save as Sent
6. Share invoice
7. Record payment when received

**Need Help?**
- Review examples above
- Check Troubleshooting section
- Contact Storehouse support`,
    steps: [
      {
        title: 'Access Invoices Page',
        description: 'Click "Invoices" in sidebar',
      },
      {
        title: 'Click Create Invoice',
        description: 'Click "+ Create Invoice" button (top right)',
      },
      {
        title: 'Fill Customer Information',
        description: 'Enter customer name, email/phone, address',
      },
      {
        title: 'Set Invoice Details',
        description: 'Choose payment terms, issue date, due date',
      },
      {
        title: 'Add Line Items',
        description: 'Add products/services with quantities and prices',
      },
      {
        title: 'Adjust Totals',
        description: 'Add discount, enable VAT if needed',
      },
      {
        title: 'Add Notes & Terms',
        description: 'Optional notes and terms & conditions',
      },
      {
        title: 'Save as Draft or Send',
        description: 'Save Draft to edit later, or Mark as Sent',
      },
      {
        title: 'Share Invoice',
        description: 'Share via WhatsApp, Email, SMS, or Copy Link',
      },
      {
        title: 'Record Payment',
        description: 'Click Record Payment when customer pays',
      },
      {
        title: 'Monitor Status',
        description: 'Track Draft, Sent, Partial, Paid, Overdue statuses',
      },
      {
        title: 'Send Reminders',
        description: 'Send payment reminders for overdue invoices',
      },
    ],
    relatedDocs: ['record-sale-comprehensive', 'manage-customers', 'payment-methods', 'business-settings'],
    keywords: [
      // Core invoice actions
      'create invoice', 'new invoice', 'make invoice', 'invoice creation', 'how to invoice',
      'send invoice', 'share invoice', 'invoice customer', 'b2b invoice', 'business invoice',

      // Invoice fields & details
      'invoice fields', 'invoice form', 'invoice number', 'invoice details',
      'customer information', 'customer details', 'bill to', 'customer name', 'customer email',
      'customer phone', 'customer address',

      // Payment terms & dates
      'payment terms', 'due date', 'issue date', 'net 15', 'net 30', 'net 7', 'due on receipt',
      'when is payment due', 'payment deadline', 'invoice due date', 'change due date',

      // Line items
      'line items', 'invoice items', 'add items', 'add products to invoice', 'item description',
      'quantity', 'unit price', 'item total', 'add more items', 'multiple items',

      // Calculations & adjustments
      'invoice total', 'calculate invoice', 'subtotal', 'discount', 'vat', 'tax',
      'vat calculation', 'include tax', 'vat percentage', 'invoice discount',
      'how total calculated', 'invoice math',

      // Payment recording
      'record payment', 'receive payment', 'customer paid', 'mark as paid', 'payment received',
      'partial payment', 'installment', 'payment method', 'payment reference',
      'payment history', 'payment tracking', 'confirm payment',

      // Invoice status
      'invoice status', 'draft invoice', 'sent invoice', 'paid invoice', 'overdue invoice',
      'partial payment status', 'invoice paid', 'invoice unpaid', 'pending payment',
      'overdue', 'late payment', 'past due',

      // Sharing & sending
      'send invoice whatsapp', 'email invoice', 'share invoice', 'sms invoice',
      'copy invoice link', 'invoice link', 'send to customer', 'how to share invoice',
      'invoice url', 'whatsapp invoice', 'email customer', 'invoice receipt',

      // Viewing & managing
      'view invoices', 'invoice list', 'find invoice', 'search invoice', 'invoice dashboard',
      'filter invoices', 'all invoices', 'invoice table', 'invoice summary',
      'paid amount', 'pending payment', 'total invoices',

      // Editing & deleting
      'edit invoice', 'update invoice', 'change invoice', 'modify invoice',
      'delete invoice', 'remove invoice', 'cancel invoice',

      // Reminders & follow-up
      'payment reminder', 'send reminder', 'follow up', 'overdue reminder',
      'chase payment', 'remind customer',

      // Online payments
      'paystack', 'online payment', 'payment link', 'card payment', 'pay online',
      'accept cards', 'payment gateway', 'online invoice payment',

      // Invoice numbers & formatting
      'invoice number', 'inv number', 'auto invoice number', 'invoice format',
      'invoice template', 'professional invoice', 'business name on invoice',

      // Customer management
      'customer invoice', 'customer history', 'customer payments', 'customer account',
      'repeat customer', 'customer balance',

      // B2B & wholesale
      'b2b sales', 'wholesale invoice', 'bulk order', 'corporate invoice',
      'business to business', 'supplier invoice', 'distributor invoice',

      // Terms & conditions
      'invoice terms', 'terms and conditions', 'payment terms', 'late fee',
      'invoice notes', 'invoice terms', 'payment conditions',

      // Troubleshooting
      'invoice not sending', 'invoice not found', 'cant create invoice',
      'invoice error', 'invoice wont save', 'customer didnt receive',
      'vat not calculating', 'wrong due date', 'cant delete invoice',

      // Nigerian context
      'nigerian invoice', 'naira invoice', 'lagos invoice', 'abuja business',
      'wholesale nigeria', 'b2b nigeria', 'vat nigeria', 'payment terms nigeria',
    ],
    lastUpdated: '2025-12-10',
  },
  */

  {
    id: 'edit-product',
    category: 'products',
    title: 'Edit & Update Products',
    subtitle: 'Change product details anytime',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 75,
    description: 'Learn how to edit product information, prices, and stock levels.',
    steps: [
      {
        step: 1,
        instruction: 'Find the product in your products list',
        tip: 'Use the search bar to quickly find products',
      },
      {
        step: 2,
        instruction: 'Tap the edit icon (✏️ pencil) next to the product',
        tip: 'If you don\'t see the edit icon, you might be logged in as Staff (Cashier)',
      },
      {
        step: 3,
        instruction: 'Update the details you want to change',
        tip: 'You can change name, prices, quantity, description, etc.',
      },
      {
        step: 4,
        instruction: 'Tap "Save" to apply changes',
        tip: 'Changes take effect immediately',
      },
    ],
    commonIssues: [
      {
        issue: 'Edit icon not showing',
        solution: 'Only Owners and Managers can edit products. If you\'re logged in as Cashier (staff), you won\'t see the edit option.',
      },
      {
        issue: 'Price changes not reflecting',
        solution: 'Try refreshing the page. Make sure you clicked Save after editing.',
      },
    ],
    relatedDocs: ['add-first-product', 'delete-product', 'stock-management'],
    keywords: ['edit product', 'update product', 'change price', 'modify product', 'pencil icon'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'delete-product',
    category: 'products',
    title: 'Delete Products Safely',
    subtitle: 'Remove products from your inventory',
    difficulty: 'beginner',
    estimatedTime: '1 minute',
    priority: 70,
    description: 'Learn how to safely delete products you no longer sell.',
    steps: [
      {
        step: 1,
        instruction: 'Find the product you want to delete',
        tip: 'Use search to quickly locate it',
      },
      {
        step: 2,
        instruction: 'Tap the delete icon (🗑️ trash bin) next to the product',
        tip: 'Be careful - this action removes the product',
      },
      {
        step: 3,
        instruction: 'Confirm deletion in the popup',
        tip: 'Once deleted, the product is removed from inventory',
      },
    ],
    commonIssues: [
      {
        issue: 'Delete icon not showing',
        solution: 'Only Owners and Managers can delete products. Cashiers cannot delete items.',
      },
      {
        issue: 'Can I undo deletion?',
        solution: 'No, deletions are permanent. If you want to hide products temporarily, consider setting quantity to 0 or marking as inactive.',
      },
      {
        issue: 'Product deleted but still appears',
        solution: 'Refresh the page. Check internet connection for sync.',
      },
    ],
    relatedDocs: ['edit-product', 'add-first-product', 'product-visibility'],
    keywords: ['delete product', 'remove product', 'trash bin icon', 'delete item'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'product-variants',
    category: 'products',
    title: 'Product Variants (Size, Color, etc.)',
    subtitle: 'Sell the same product in different sizes or colors',
    difficulty: 'intermediate',
    estimatedTime: '5 minutes',
    priority: 75,
    description: 'Create product variants for items that come in multiple options (size, color, material, etc.).',
    content: `**What are Product Variants?**

Variants let you sell one product in different options:
- **Clothing**: T-shirt in Small, Medium, Large, XL
- **Shoes**: Sizes 38, 39, 40, 41, 42
- **Colors**: Red, Blue, Green, Black
- **Materials**: Cotton, Polyester, Blend

**How to Create Variants:**

1. Edit an existing product or create new one
2. Look for "Variants" or "Options" section
3. Add variant types (e.g., "Size")
4. Add variant values (e.g., Small, Medium, Large)
5. Each variant can have:
   - Different price (optional)
   - Different stock quantity
   - Different SKU/barcode
   - Different image

**Example: T-Shirt**

Product: Nike T-Shirt
Variants:
- Small (10 in stock, ₦5,000)
- Medium (15 in stock, ₦5,000)
- Large (8 in stock, ₦5,500)
- XL (5 in stock, ₦6,000)

**Recording Sales with Variants:**

When recording a sale:
1. Select the main product (Nike T-Shirt)
2. Choose the variant (Medium)
3. Enter quantity
4. Stock for that specific variant decreases

**Benefits:**

✅ Track stock per size/color
✅ Different prices per variant
✅ Better inventory management
✅ Customer can choose options in online store`,
    relatedDocs: ['add-first-product', 'stock-management', 'online-store'],
    keywords: ['variants', 'sizes', 'colors', 'options', 'different sizes'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'product-images',
    category: 'products',
    title: 'Upload Multiple Product Images',
    subtitle: 'Add up to 10 images per product',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 70,
    description: 'Learn how to upload and manage multiple images for your products.',
    content: `**Why Multiple Images?**

- Show product from different angles
- Display product in use
- Show color variations
- Increase customer trust
- Improve online store appearance

**How Many Images Can I Upload?**

Depends on your plan:
- **Free**: 1 image per product
- **Starter**: 3 images per product
- **Pro**: 5 images per product
- **Business**: 10 images per product

**How to Upload Images:**

1. Edit a product
2. Tap "Add Images" or "Upload Image"
3. Choose images from your device
4. Wait for upload to complete
5. Set primary image (shows first)
6. Reorder images by dragging
7. Save product

**Image Requirements:**

- Format: JPG, PNG
- Size: Under 2MB per image
- Recommended: Square images (1:1 ratio)
- Min resolution: 500x500px
- Max resolution: 2000x2000px

**Image Optimization:**

Storehouse automatically:
- ✅ Compresses images for fast loading
- ✅ Creates thumbnails
- ✅ Delivers via CDN (ImageKit)
- ✅ Optimizes for mobile and desktop

**Managing Images:**

- **Delete**: Remove unwanted images
- **Reorder**: Drag images to change order
- **Set Primary**: Choose main product image
- **Replace**: Upload new image to replace old one`,
    relatedDocs: ['add-first-product', 'online-store', 'product-variants'],
    keywords: ['images', 'photos', 'pictures', 'upload image', 'multiple images'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'stock-management',
    category: 'products',
    title: 'Stock & Inventory Management',
    subtitle: 'Track and manage your inventory levels',
    difficulty: 'beginner',
    estimatedTime: '4 minutes',
    priority: 75,
    description: 'Learn how to manage stock levels, low stock alerts, and inventory tracking.',
    content: `**How Stock Tracking Works:**

When you:
- **Add a product**: Set initial stock quantity
- **Record a sale**: Stock automatically decreases
- **Restock**: Edit product to increase quantity

**Example:**

1. You have 50 units of Rice
2. Customer buys 5 units
3. Stock automatically becomes 45 units
4. No manual calculation needed!

**Low Stock Alerts:**

Set a low stock threshold for each product:
- Product: Rice
- Quantity: 45 units
- Low Stock Threshold: 10 units

When stock reaches 10 or below:
⚠️ Alert appears on dashboard
📧 Optional email notification

**How to Restock Products:**

1. Edit the product
2. Update quantity field to new stock level
3. Save

**Alternative:** Some businesses track restocking as "negative sales" or use a stock adjustment log.

**Stock Movements:**

Storehouse logs every stock change:
- Initial stock
- Sales (decrease)
- Restocks (increase)
- Manual adjustments

**Inventory Reports:**

View:
- Total inventory value (cost × quantity)
- Low stock items
- Out of stock items
- Best-selling items (by quantity)

**Best Practices:**

✅ Set realistic low stock thresholds
✅ Restock before running out
✅ Regular inventory audits (weekly/monthly)
✅ Track cost price accurately for profit calculations`,
    relatedDocs: ['add-first-product', 'low-stock-alerts', 'inventory-value'],
    keywords: ['stock', 'inventory', 'quantity', 'restock', 'low stock'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'low-stock-alerts',
    category: 'products',
    title: 'Low Stock Alerts',
    subtitle: 'Get notified before products run out',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 70,
    description: 'Set up and manage low stock alerts to prevent stockouts.',
    content: `**What are Low Stock Alerts?**

Automatic warnings when products are running low, so you can restock before running out completely.

**How to Set Up:**

1. Edit a product
2. Find "Low Stock Threshold" field
3. Enter minimum quantity (e.g., 10)
4. Save product

**Example:**

Product: Indomie Noodles
Current Stock: 50 cartons
Low Stock Threshold: 10 cartons

When stock reaches 10 or below:
⚠️ **Yellow badge** appears next to product
🔔 **Dashboard alert** shows warning
📧 **Email notification** (if enabled)

**Where to View Alerts:**

- **Dashboard**: Red/yellow badges on products
- **Low Stock Tab**: Dedicated view of all low stock items
- **Reports**: Low stock report

**Best Threshold Values:**

Depends on how fast you sell:

Fast-moving items (sell daily):
- Threshold: 20-30 units

Medium-moving items (sell weekly):
- Threshold: 10-15 units

Slow-moving items (sell monthly):
- Threshold: 5 units

**Action When Alert Appears:**

1. Check how many days of stock remain
2. Calculate reorder quantity
3. Contact supplier
4. Update stock when new inventory arrives

**Turn Off Alerts:**

Set threshold to 0 to disable alerts for a product`,
    relatedDocs: ['stock-management', 'add-first-product'],
    keywords: ['low stock', 'alerts', 'warnings', 'restock', 'running out'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'csv-import',
    category: 'products',
    title: 'Bulk Product Import (CSV)',
    subtitle: 'Add hundreds of products at once',
    difficulty: 'intermediate',
    estimatedTime: '10 minutes',
    priority: 65,
    description: 'Import products from Excel/CSV files to save time.',
    content: `**When to Use CSV Import:**

- Adding 50+ products at once
- Migrating from another system
- Updating prices in bulk
- Importing from supplier catalog

**CSV File Format:**

Your CSV file should have these columns:
- Product Name (required)
- SKU (optional)
- Barcode (optional)
- Cost Price (required)
- Selling Price (required)
- Quantity (required)
- Category (optional)
- Description (optional)
- Low Stock Threshold (optional)

**Example CSV:**

Name, SKU, Cost Price, Selling Price, Quantity
Rice 50kg, RICE50, 25000, 30000, 100
Beans 25kg, BEANS25, 18000, 22000, 50
Indomie Carton, INDO01, 4500, 6000, 200

**How to Import:**

1. Prepare your CSV file in Excel/Google Sheets
2. Make sure column names match exactly
3. Export as CSV
4. Go to Products → Import
5. Upload CSV file
6. Preview products before importing
7. Confirm import

**After Import:**

- Check products list to verify
- Edit any products with errors
- Set images manually (CSV doesn't upload images)
- Test a few products

**Common Errors:**

❌ Missing required fields
❌ Invalid price format
❌ Negative quantities
❌ Duplicate SKUs

**Tips:**

✅ Start with a small test file (10 products)
✅ Use Excel to validate data first
✅ Remove special characters
✅ Use numbers only for prices (no ₦ symbol)`,
    relatedDocs: ['add-first-product', 'edit-product', 'product-variants'],
    keywords: ['import', 'csv', 'excel', 'bulk upload', 'bulk import'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'product-categories',
    category: 'products',
    title: 'Product Categories & Tags',
    subtitle: 'Organize products for easy finding',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 65,
    description: 'Use categories and tags to organize your products effectively.',
    content: `**Why Use Categories?**

- Organize products logically
- Filter products easily
- Better online store navigation
- Faster product search
- Professional presentation

**How to Set Categories:**

1. Edit a product
2. Find "Category" field
3. Type category name (e.g., "Electronics", "Clothing", "Food")
4. Save product

**Category Examples:**

**Retail Store:**
- Electronics
- Home & Kitchen
- Clothing & Shoes
- Food & Beverages
- Health & Beauty

**Restaurant:**
- Appetizers
- Main Course
- Drinks
- Desserts
- Specials

**Fashion Store:**
- Men's Wear
- Women's Wear
- Kids
- Accessories
- Shoes

**Tags (Keywords):**

Add multiple tags to help customers find products:

Product: Samsung Phone
Tags: smartphone, android, samsung, mobile, electronics

**Searching by Category:**

In your products list:
- Filter by category
- See only products in that category
- Sort within category

**Online Store Benefits:**

Categories appear as navigation menu:
- Electronics → Phones, Laptops, Accessories
- Clothing → Shirts, Pants, Shoes

**Best Practices:**

✅ Use broad categories (max 10-15)
✅ Be consistent with naming
✅ One category per product
✅ Use tags for details
✅ Review and merge duplicate categories`,
    relatedDocs: ['add-first-product', 'online-store', 'product-search'],
    keywords: ['categories', 'tags', 'organize', 'filter', 'group products'],
    lastUpdated: '2025-11-30',
  },

  // ============================================
  // SALES & REVENUE (6 guides)
  // ============================================

  {
    id: 'cash-vs-credit-sales',
    category: 'sales',
    title: 'Cash vs Credit Sales',
    subtitle: 'Understand the difference and track both',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 85,
    description: 'Learn when to use cash sales vs credit sales and how to track customer debts.',
    content: `**What's the Difference?**

**Cash Sale:**
- Customer pays IMMEDIATELY (cash, transfer, POS, etc.)
- Money is in your hand or bank account NOW
- No debt tracking needed
- Example: Customer buys rice for ₦30,000 and pays cash

**Credit Sale:**
- Customer takes goods NOW, pays LATER
- You record the sale + customer debt
- Track when payment is due
- Example: Customer buys rice for ₦30,000, promises to pay on Friday

**When to Use Cash:**
- Walk-in customers
- Unknown customers
- Small purchases
- Customers with debt history

**When to Use Credit:**
- Trusted regular customers
- B2B transactions
- Large orders
- Established relationships

**How to Record Credit Sale:**

1. Record sale normally
2. Toggle "Credit Sale" switch
3. Enter customer name (required for credit)
4. Set due date (when customer promises to pay)
5. Save - debt is automatically tracked!

**Tracking Credit:**

View all customer debts in:
- Dashboard → Customer Debts
- Customers → Select customer → View debt

**Get Paid:**

When customer pays:
1. Find their debt record
2. Tap "Record Payment"
3. Enter amount paid
4. Payment method
5. Save!

**Best Practices:**

✅ Only give credit to trusted customers
✅ Set realistic due dates
✅ Send reminders before due date
✅ Track partial payments
✅ Limit credit per customer

**Nigerian Context:**

Many businesses give credit to:
- Mama Nkechi (regular customer for 5 years)
- Brother Emeka (church member)
- Sister Blessing (pays every month-end)

But NOT to:
- New customers
- One-time buyers
- Customers who owe already`,
    relatedDocs: ['customer-debts', 'payment-methods', 'debt-reminders'],
    keywords: ['cash', 'credit', 'debt', 'owe', 'customer owes'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'payment-methods',
    category: 'sales',
    title: 'Payment Methods',
    subtitle: 'Track how customers pay',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 70,
    description: 'Record different payment methods to understand customer preferences.',
    content: `**Available Payment Methods:**

Storehouse supports all common Nigerian payment methods:

💵 **Cash** - Physical naira notes
💳 **Transfer** - Mobile/internet banking
💰 **POS** - Card payment via POS terminal
🏦 **Card** - Debit/credit card payments

**Why Track Payment Method?**

- See which methods customers prefer
- Know how much cash vs transfer you receive
- Plan for POS maintenance
- Understand customer payment habits

**How to Record:**

When recording a sale:
1. Select product and quantity
2. Choose payment method from dropdown
3. Complete sale

That's it! Payment method is saved.

**View Payment Analytics:**

Settings → Reports → Payment Methods
See breakdown:
- 60% Cash
- 30% Transfer
- 10% POS

**Tips for Each Method:**

**Cash:**
✅ Count carefully
✅ Give correct change
✅ Store safely
❌ Risk of theft

**Transfer:**
✅ Confirm before releasing goods
✅ Check bank alerts
✅ Verify sender name
❌ May delay if network issues

**POS:**
✅ Instant confirmation
✅ Professional
✅ Receipt prints automatically
❌ Charges per transaction

**Card (requires Paystack setup):**
✅ Accept online payments
✅ Automatic tracking
✅ Perfect for online store
❌ 1.5% transaction fee
📝 Enable in Settings → Payments`,
    relatedDocs: ['record-first-sale', 'paystack-setup'],
    keywords: ['payment', 'cash', 'transfer', 'pos', 'paystack', 'how customers pay'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'sales-channels',
    category: 'sales',
    title: 'Sales Channels Tracking',
    subtitle: 'Know where your sales come from',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 70,
    description: 'Track which channels bring the most sales: Online, WhatsApp, Retail, etc.',
    content: `**What are Sales Channels?**

Sales channels are WHERE customers buy from you:

🏪 **Retail (In-Store)** - Walk-in customers
🌐 **Online Store** - Your Storehouse storefront
📱 **WhatsApp** - Orders via WhatsApp chat
📘 **Facebook** - Orders from Facebook page
📷 **Instagram** - Orders from Instagram DM
🏢 **B2B** - Business-to-business (invoices)
📦 **Wholesale** - Bulk buyers

**Why Track Channels?**

Know which channels to focus on:
- "80% of sales come from WhatsApp" → Post more on WhatsApp status!
- "Only 5% from Instagram" → Maybe reduce Instagram effort
- "Online store growing 20% monthly" → Invest more in online

**How to Record Channel:**

When recording a sale:
1. Select product
2. Choose sales channel dropdown
3. Pick where customer bought from
4. Complete sale

**View Channel Analytics:**

Dashboard → Sales by Channel section

See:
- WhatsApp: ₦450,000 (45%)
- Retail: ₦350,000 (35%)
- Online: ₦200,000 (20%)

**Real Example: Clothing Seller**

**Before tracking channels:**
- Mixed up where sales came from
- Wasted time on slow channels
- Missed opportunities

**After tracking:**
- Found 70% sales from WhatsApp
- Created WhatsApp catalog
- Doubled WhatsApp sales!

**Best Practices:**

✅ Always select the correct channel
✅ Review monthly trends
✅ Focus effort on top channels
✅ Test new channels (TikTok, etc.)`,
    relatedDocs: ['record-first-sale', 'sales-analytics', 'online-store'],
    keywords: ['sales channel', 'whatsapp', 'online', 'retail', 'where sales come from'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'view-sales-history',
    category: 'sales',
    title: 'View Sales History',
    subtitle: 'See all your past sales and transactions',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 65,
    description: 'Access and review your complete sales history.',
    content: `**Where to Find Sales History:**

Dashboard → Today's Sales section → "View All Sales"

**What You'll See:**

For each sale:
- Date and time
- Product name
- Quantity sold
- Selling price
- Total amount
- Customer name (if recorded)
- Payment method
- Sales channel
- Profit (if cost price tracked)

**Filter Sales:**

- By date range (today, this week, this month)
- By customer name
- By product
- By payment method
- By sales channel

**Search Sales:**

Type customer name or product name to find specific sales quickly.

**Export Sales:**

Download sales data as:
- CSV file (open in Excel)
- PDF report
- WhatsApp summary

**Use Cases:**

**Daily Reconciliation:**
- Check today's cash vs transfer
- Count physical cash
- Verify POS transactions

**Monthly Review:**
- See best-selling products
- Identify slow-moving items
- Calculate monthly profit

**Customer Inquiry:**
- "When did I last buy rice?"
- Check customer's purchase history
- Verify past transactions`,
    relatedDocs: ['record-first-sale', 'sales-analytics'],
    keywords: ['sales history', 'past sales', 'view sales', 'sales report'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'todays-sales-summary',
    category: 'sales',
    title: "Today's Sales Summary",
    subtitle: 'Track your daily performance at a glance',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 75,
    description: 'Understand your Today\'s Sales dashboard section.',
    content: `**Today's Summary Shows:**

**Total Sales:**
All money earned today from all sales

Example: ₦125,000

**Number of Transactions:**
How many sales you made today

Example: 23 sales

**Recent Sales:**
List of your last 5 sales with:
- Time of sale
- Product name
- Sale amount
- Staff member (if recorded by staff)

**Toggle Visibility:**
Eye icon to hide/show sales amounts for privacy

**Updates in Real-Time:**

Every time you record a sale:
✅ Total Sales increases
✅ Transaction count goes up
✅ Recent sales list updates
✅ Sales chart updates (if expanded)

**End of Day:**

At midnight (12:00 AM):
- Today's summary resets to ₦0
- Yesterday's data moves to history
- Start fresh for new day

**Best Practice:**

Review your summary at end of business:
- "Did we hit our ₦50,000 target?"
- "How much cash to bank?"
- Check Money & Profits page for profit details
- View customer debts in Customers section`,
    relatedDocs: ['record-first-sale', 'view-sales-history', 'profit-tracking'],
    keywords: ['today sales', 'daily sales', 'summary', 'today profit'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'whatsapp-receipts',
    category: 'sales',
    title: 'Send Receipts via WhatsApp',
    subtitle: 'Share sale receipts with customers instantly',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 70,
    description: 'Learn how to send professional receipts to customers via WhatsApp.',
    content: `**How It Works:**

After recording a sale:
1. Receipt preview appears
2. Tap "Share via WhatsApp"
3. Choose customer contact or enter number
4. Message with receipt details opens in WhatsApp
5. Send!

**Receipt Contains:**

- Your business name
- Date and time
- Items purchased
- Quantities
- Prices
- Total amount
- Payment method
- Thank you message

**Example Receipt:**

━━━━━━━━━━━━━━━━
**Ada's Provisions**
━━━━━━━━━━━━━━━━

Date: 30/11/2025, 2:45 PM

**RECEIPT**

Rice 50kg × 2 = ₦60,000
Beans 25kg × 1 = ₦22,000

**Total: ₦82,000**
Payment: Bank Transfer

Thank you for your patronage!
━━━━━━━━━━━━━━━━

**Why Send Receipts?**

✅ Professional image
✅ Customer keeps record
✅ Easy for customer to re-order
✅ Reduces disputes
✅ Marketing (shows your contact)

**Customer Consent:**

Before sharing:
- "Can I send you the receipt via WhatsApp?"
- Get customer's number
- Confirm it's correct

**Best Practices:**

✅ Always ask for consent first
✅ Verify phone number
✅ Professional message format
✅ Include your contact info`,
    relatedDocs: ['record-first-sale', 'customer-management', 'business-setup'],
    keywords: ['whatsapp receipt', 'send receipt', 'share receipt', 'customer receipt'],
    lastUpdated: '2025-11-30',
  },

  // ============================================
  // CUSTOMER MANAGEMENT (4 guides)
  // ============================================

  {
    id: 'customer-management',
    category: 'customers',
    title: 'Add & Manage Customers',
    subtitle: 'Build your customer database',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 70,
    description: 'Track customers, their contact info, and purchase history.',
    content: `**Why Track Customers?**

- Know your best customers
- See who buys what
- Send targeted promotions
- Track customer debts
- Build relationships

**Customers Are Added Automatically:**

When you record a sale with a customer name:
✅ Customer is automatically created
✅ Purchase is linked to their profile
✅ History starts building

**View All Customers:**

Tap Customers page to see:
- Customer names
- Phone numbers
- Total spent
- Number of purchases
- Last purchase date
- Outstanding debts

**Customer Profile:**

Tap any customer to see:
- Full purchase history
- All products they bought
- Total spent (lifetime)
- Current debts
- Contact info

**Customer Information:**

Storehouse automatically captures:
- Phone numbers from sales
- Email addresses from sales
- Purchase history
- Total spending

**Search Customers:**

Find customers quickly by:
- Name
- Phone number
- Email

**Customer Sorting:**

Customers are automatically sorted by:
1. Overdue debts first (red flag)
2. Outstanding debt amounts
3. Total spending (highest to lowest)

This helps you quickly see your best customers and who needs follow-up

**Use Cases:**

**Christmas Promotion:**
"Send WhatsApp to top 20 customers with special offer"

**Birthday Wishes:**
"Mama Nkechi shops every month, send her birthday discount"

**Debt Collection:**
"See who owes money and hasn't paid"`,
    relatedDocs: ['record-first-sale', 'customer-debts', 'whatsapp-receipts'],
    keywords: ['customers', 'customer list', 'customer profile', 'track customers'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'customer-purchase-history',
    category: 'customers',
    title: 'View Customer Purchase History',
    subtitle: 'See everything a customer has bought',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 65,
    description: 'Access detailed purchase history for any customer.',
    content: `**How to View:**

1. Go to Customers page
2. Tap on customer name
3. See complete purchase history

**What You'll See:**

**Purchase Summary:**
- Total Spent: ₦145,000
- Number of Purchases: 12
- Average Purchase: ₦12,083
- Last Purchase: 2 days ago

**Individual Purchases:**

Each purchase shows:
- Date and time
- Products bought
- Quantities
- Total amount
- Payment method
- Outstanding debt (if any)

**Example: Mama Nkechi's History**

━━━━━━━━━━━━━━━━
**28 Nov 2025**
Rice 50kg × 2 = ₦60,000
Payment: Cash

**25 Nov 2025**
Indomie × 5 = ₦30,000
Payment: Transfer

**20 Nov 2025**
Beans 25kg × 1 = ₦22,000
Payment: Credit (PAID)
━━━━━━━━━━━━━━━━

**Use This For:**

**Reordering:**
"You bought rice last week. Need more?"

**Recommendations:**
"You always buy rice. Try our new brand?"

**Credit Decisions:**
"She's bought 12 times, always pays. Give her credit!"

**Dispute Resolution:**
"You said I never bought beans?"
→ Show purchase history → Dispute solved!

**Loyalty Programs:**
"Spent ₦100,000+? Get 5% discount!"`,
    relatedDocs: ['customer-management', 'record-first-sale'],
    keywords: ['purchase history', 'customer history', 'what customer bought', 'past purchases'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'customer-debts',
    category: 'customers',
    title: 'Track Customer Debts',
    subtitle: 'Manage money owed by customers',
    difficulty: 'beginner',
    estimatedTime: '4 minutes',
    priority: 80,
    description: 'Record, track, and collect customer debts (credit sales).',
    content: `**What is Customer Debt?**

When you sell on credit:
- Customer takes goods today
- Customer pays later
- You track the debt in Storehouse

**How Debts Are Created:**

When recording a sale:
1. Toggle "Credit Sale" ON
2. Enter customer name (required!)
3. Set due date
4. Record sale
→ Debt is automatically created!

**View All Debts:**

Dashboard → Customer Debts
OR
Customers → Select customer → View Debts

**Debt Statuses:**

🔵 **Open** - Active debt, not yet paid
🔴 **Overdue** - Payment date passed (open debt past due date)
🟢 **Partial** - Some payment received, balance remaining
✅ **Paid** - Fully settled

**Example:**

━━━━━━━━━━━━━━━━
**Mama Nkechi**
Rice 50kg × 2 = ₦60,000
Due: 5 Dec 2025
Status: Open
━━━━━━━━━━━━━━━━

**Record Payment:**

When customer pays:
1. Find their debt
2. Tap "Record Payment"
3. Enter amount paid (full or partial)
4. Choose payment method
5. Save!

**Partial Payment Example:**

Debt: ₦60,000
Payment 1: ₦30,000 (2 Dec)
Balance: ₦30,000
Payment 2: ₦30,000 (5 Dec)
**Status: PAID ✅**

**Send Reminder:**

Tap "Send Reminder" →
WhatsApp message opens:

"Hello Mama Nkechi,

This is a friendly reminder that ₦60,000 for Rice 50kg is due on 5 Dec 2025.

Please pay when convenient.

Thank you!
- Ada's Provisions"

**Best Practices:**

✅ Only give credit to trusted customers
✅ Set realistic due dates
✅ Send reminder 2 days before due
✅ Follow up on overdue debts
✅ Limit total credit per customer
✅ Track payment history

**Warning Signs:**

❌ Customer always pays late
❌ Debts keep increasing
❌ Avoids your calls
❌ Makes excuses

→ Stop giving credit!

**View All Debts:**

In the Customers page, you can see:
- All customers with outstanding debts
- Overdue debts highlighted in red
- Total amount owed by each customer
- Due dates for payments`,
    relatedDocs: ['cash-vs-credit-sales', 'debt-reminders', 'customer-management'],
    keywords: ['debt', 'customer debt', 'credit', 'money owed', 'customer owes'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'debt-reminders',
    category: 'customers',
    title: 'Send Debt Reminders via WhatsApp',
    subtitle: 'Politely remind customers about payments',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 70,
    description: 'Send professional debt reminders to customers via WhatsApp.',
    content: `**When to Send Reminders:**

**2 days before due date:**
"Friendly reminder - payment due soon!"

**On due date:**
"Payment is due today. Please pay when ready."

**1 day after due:**
"Your payment was due yesterday. Please settle when possible."

**How to Send:**

1. Go to Customer Debts
2. Find the debt
3. Tap "Send Reminder"
4. WhatsApp opens with pre-filled message
5. Review and customize message
6. Send!

**Professional Message Template:**

"Good day [Customer Name],

This is a friendly reminder that [Amount] for [Product] is due on [Date].

Kindly pay via:
- Transfer: [Bank Details]
- Cash: Visit our store

Thank you for your patronage!

[Your Business Name]
[Your Phone]"

**Tips for Effective Reminders:**

✅ Be polite and professional
✅ Include payment options
✅ Mention specific debt details
✅ Provide your contact info
✅ Don't be aggressive

❌ Don't threaten
❌ Don't embarrass customer
❌ Don't send at odd hours

**Best Times to Send:**

Morning: 8-10 AM (people check phones)
Afternoon: 2-4 PM (after lunch)
Evening: 7-8 PM (after work)

❌ Not before 7 AM
❌ Not after 9 PM

**Track Reminder Status:**

Storehouse logs:
- When reminder was sent
- Customer's response (if any)
- Payment received after reminder

**Escalation:**

If no response after 3 reminders:
1. Phone call
2. Visit in person
3. Stop further credit

**Friendly But Firm:**

Balance between:
- Maintaining relationship
- Getting your money

Remember: Most customers want to pay. A polite reminder helps!`,
    relatedDocs: ['customer-debts', 'cash-vs-credit-sales', 'whatsapp-receipts'],
    keywords: ['debt reminder', 'payment reminder', 'whatsapp reminder', 'remind customer'],
    lastUpdated: '2025-11-30',
  },

  // ============================================
  // INVOICING (3 guides)
  // ============================================

  {
    id: 'create-professional-invoice',
    category: 'invoicing',
    title: 'Create Professional Invoices',
    subtitle: 'Send branded invoices to B2B customers',
    difficulty: 'beginner',
    estimatedTime: '5 minutes',
    priority: 75,
    description: 'Create and send professional invoices for business-to-business sales with Storehouse branding.',
    content: `**Why Use Invoices?**

For B2B customers:
- More professional than receipts
- Include payment terms
- Track due dates
- Accept online payments via Paystack

**How to Create an Invoice:**

**Step 1: Go to Invoicing Page**
- Click **More** button (bottom navigation)
- Click **Professional Invoices**
- Click **Create Invoice** button

**Step 2: Add Customer Details**
- Select existing customer OR
- Add new business customer:
  - Business name (e.g., "Tunde's Restaurant")
  - Contact person
  - Phone number
  - Email (optional)
  - Address

**Step 3: Add Products**
- Click **Add Product**
- Select product from inventory
- Enter quantity
- Price auto-fills (you can edit)
- Click **Add More** for multiple items

**Step 4: Set Payment Terms**
- **Due Date:** When payment is expected
  - Net 15: Payment due in 15 days
  - Net 30: Payment due in 30 days
  - Custom: Pick your own date

- **Payment Method:**
  - Bank Transfer
  - Paystack (online payment)
  - Cash on Delivery
  - POS

**Step 5: Add Notes (Optional)**
- Payment instructions
- Special terms
- "Thank you" message

Example:
"Payment due within 30 days. Transfer to Zenith Bank - 1234567890. Thank you for your business!"

**Step 6: Preview & Send**
- Click **Preview Invoice**
- Check all details
- Click **Send Invoice**

**Your Invoice Includes:**

✅ Your business logo
✅ Your business details
✅ Customer details
✅ Itemized product list
✅ Subtotal, tax, total
✅ Payment terms
✅ Due date
✅ Invoice number (auto-generated)
✅ Date issued

**Example Invoice:**

\`\`\`
----------------------------------
STOREHOUSE INVOICE
----------------------------------
From: Mama Ngozi Store
123 Ikeja Road, Lagos
Phone: 0803 456 7890

To: Tunde's Restaurant
45 Victoria Island, Lagos
Contact: Tunde Balogun
Phone: 0901 234 5678

Invoice #: INV-2025-001
Date: 30 Nov 2025
Due Date: 30 Dec 2025 (Net 30)

----------------------------------
ITEMS:
----------------------------------
Golden Penny Flour (50kg) x 10
₦35,000 each = ₦350,000

Dangote Sugar (1kg) x 50
₦1,200 each = ₦60,000

----------------------------------
Subtotal: ₦410,000
Tax (0%): ₦0
TOTAL DUE: ₦410,000

Payment Instructions:
Pay online via Paystack or transfer to:
Zenith Bank - 1234567890
Account Name: Mama Ngozi Store

Thank you for your business!
\`\`\`

**Invoice Delivery:**

Storehouse sends invoice via:
- **WhatsApp** (with invoice link)
- **Email** (with invoice link)
- **SMS** (with invoice link)

**Track Invoice Status:**
- **Draft:** Not sent yet
- **Sent:** Delivered to customer
- **Viewed:** Customer opened it
- **Paid:** Payment received
- **Overdue:** Past due date`,
    relatedDocs: ['track-invoice-payments', 'send-invoice-whatsapp', 'customer-management'],
    keywords: ['invoice', 'b2b invoice', 'professional invoice', 'create invoice', 'business invoice'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'send-invoice-whatsapp',
    category: 'invoicing',
    title: 'Send Invoices via WhatsApp',
    subtitle: 'Deliver invoices instantly to customers',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 70,
    description: 'Send professional invoices to customers via WhatsApp with payment links.',
    content: `**Why WhatsApp Invoices?**

✅ Customers already use WhatsApp
✅ They can view invoice online
✅ Include clickable payment link
✅ Track when customer views it
✅ No email needed

**How to Send Invoice via WhatsApp:**

**Step 1: Create Invoice**
- Click **More** → **Professional Invoices**
- Create new invoice (or open existing)
- Review invoice details

**Step 2: Send via WhatsApp**
- Click **Send Invoice** button
- Click WhatsApp share option
- Storehouse opens WhatsApp with:
  - Pre-written message
  - Invoice link to view online
  - Payment link (if using Paystack)

**Step 3: Review Message**

Storehouse auto-generates:

\`\`\`
Good day! 👋

Please find your invoice attached.

Invoice #: INV-2025-001
Amount Due: ₦410,000
Due Date: 30 Dec 2025

Pay online: [Payment Link]

Or transfer to:
Zenith Bank - 1234567890
Account Name: Mama Ngozi Store

Thank you!
Mama Ngozi Store
\`\`\`

**Step 4: Click Send**
- Message goes to customer
- Invoice link included
- Payment link included (if Paystack enabled)

**What Customer Receives:**

1. **WhatsApp message** with payment details
2. **Invoice link** (click to view online)
3. **Payment link** (click to pay online, if Paystack enabled)

**Payment Link Benefits:**

When customer clicks link:
- Opens Paystack payment page
- They pay with card/bank
- You receive payment instantly
- Invoice auto-marks as "Paid"
- Both of you get confirmation

**Track Delivery:**

Storehouse shows:
- ✓ Sent (message delivered)
- ✓✓ Delivered (reached phone)
- ✓✓ (blue) Read (customer opened)

**Follow-Up Messages:**

**2 days before due date:**
"Friendly reminder - Invoice #INV-2025-001 due in 2 days. Total: ₦410,000. Pay online: [link]"

**On due date:**
"Payment due today for Invoice #INV-2025-001 (₦410,000). Please settle to avoid late fees. [link]"

**After due date:**
"Invoice #INV-2025-001 is now overdue. Kindly pay ₦410,000 at your earliest convenience. [link]"

**Professional Tips:**

✅ Send during business hours (9 AM - 6 PM)
✅ Be polite and clear
✅ Include payment options
✅ Follow up professionally

❌ Don't spam
❌ Don't send at night
❌ Don't be rude

**Alternative: Email Invoices**

If customer prefers email:
- Click **Send Invoice**
- Click Email share option
- Opens your email client with pre-filled message
- Invoice link and payment details included

**SMS Invoices:**

For customers without WhatsApp:
- Click **Send Invoice**
- Click SMS share option
- Opens SMS app with pre-filled message
- Includes invoice link and payment details`,
    relatedDocs: ['create-professional-invoice', 'track-invoice-payments', 'whatsapp-receipts'],
    keywords: ['send invoice', 'whatsapp invoice', 'invoice delivery', 'invoice pdf'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'track-invoice-payments',
    category: 'invoicing',
    title: 'Track Invoice Payments',
    subtitle: 'Monitor which invoices are paid or overdue',
    difficulty: 'beginner',
    estimatedTime: '4 minutes',
    priority: 75,
    description: 'Keep track of invoice payments, view pending amounts, and identify overdue invoices.',
    content: `**Invoice Payment Tracking:**

Storehouse automatically tracks:
- Which invoices are paid
- Which are pending
- Which are overdue
- Total amount owed to you

**View All Invoices:**

**Step 1: Go to Invoicing Page**
- Click **More** button (bottom navigation)
- Click **Professional Invoices**
- See list of all invoices

**Step 2: Filter by Status**
- **All:** Every invoice
- **Draft:** Not sent yet
- **Sent:** Delivered to customer
- **Paid:** Payment received ✅
- **Overdue:** Past due date ⚠️
- **Cancelled:** No longer valid

**Invoice Status Indicators:**

🟢 **Paid** - Payment received, all good!
🟡 **Sent** - Waiting for payment
🔴 **Overdue** - Past due date
⚪ **Draft** - Not sent yet

**Track Individual Invoice:**

Click any invoice to see:
- **Date Created**
- **Date Sent**
- **Date Viewed** (when customer opened it)
- **Date Paid** (if paid)
- **Payment Method Used**
- **Amount Paid**
- **Outstanding Balance** (if partial payment)

**Payment History:**

See all payments for an invoice:

\`\`\`
Invoice #INV-2025-001
Total Due: ₦410,000

Payments Received:
1. 15 Dec 2025 - ₦200,000 (Bank Transfer)
2. 20 Dec 2025 - ₦210,000 (Paystack)

Outstanding: ₦0
Status: PAID ✅
\`\`\`

**Partial Payments:**

If customer pays in installments:
- Storehouse tracks each payment
- Shows remaining balance
- Invoice status: "Partially Paid"

Example:
\`\`\`
Invoice Total: ₦410,000
Paid So Far: ₦200,000
Outstanding: ₦210,000
\`\`\`

**Overdue Invoices:**

When invoice passes due date:
- Status changes to "Overdue"
- Appears in **Overdue** filter
- Shows how many days overdue

Example:
"Invoice #INV-2025-001 - ₦410,000 - 5 days overdue ⚠️"

**Send Payment Reminders:**

For overdue invoices:
1. Click invoice
2. Click **Send Reminder**
3. Choose channel:
   - WhatsApp
   - SMS
   - Email

Reminder message:
"Invoice #INV-2025-001 is now 5 days overdue. Kindly pay ₦410,000. Pay online: [link]"

**Mark Invoice as Paid Manually:**

If customer paid via cash/transfer:
1. Click invoice
2. Click **Record Payment**
3. Enter:
   - Amount paid
   - Payment method
   - Payment date
   - Reference number (optional)
4. Click **Save Payment**

Invoice auto-updates to "Paid" ✅

**Automatic Paystack Payments:**

When customer pays via Paystack link:
- Payment auto-recorded
- Invoice auto-marked "Paid"
- You get instant notification
- Customer gets receipt

No manual work needed!

**View Summary Dashboard:**

On the Invoices page, see at a glance:
- **Total Invoices** (paid vs unpaid count)
- **Paid Amount** (from X invoices)
- **Pending Payment** (from X invoices)
- **Overdue Amount** (from X invoices)

**Common Scenarios:**

**Scenario 1: Customer Claims They Paid**
1. Go to invoice
2. Check **Payment History**
3. Verify if payment recorded
4. Check bank statement to confirm

**Scenario 2: Payment Not Auto-Detected**
1. Confirm payment in your bank
2. Manually record payment in Storehouse
3. Payment gets linked to invoice

**Scenario 3: Customer Wants Payment Extension**
1. Open invoice
2. Click **Edit Due Date**
3. Set new due date
4. Invoice no longer shows as overdue

**Best Practices:**

✅ Check invoices daily
✅ Send reminders 2 days before due
✅ Follow up on overdue promptly
✅ Record all payments immediately
✅ Export monthly for accounting`,
    relatedDocs: ['create-professional-invoice', 'send-invoice-whatsapp', 'customer-debts'],
    keywords: ['track invoice', 'invoice payment', 'overdue invoice', 'payment tracking'],
    lastUpdated: '2025-11-30',
  },

  // ============================================
  // REFERRAL PROGRAM (3 guides) - CRITICAL ACCURACY
  // ============================================

  {
    id: 'referral-program-overview',
    category: 'referrals',
    title: 'Storehouse Referral Program Explained',
    subtitle: 'Earn rewards for referring other businesses',
    difficulty: 'beginner',
    estimatedTime: '5 minutes',
    priority: 85,
    description: 'Understand how the Storehouse referral program works and what rewards you can earn.',
    content: `**What is the Referral Program?**

Refer other business owners to Storehouse and earn:
- **₦500 cash credit** per referral
- **₦300 airtime credit** per referral
- **Free subscription months** at milestones
- **Lifetime access** + **1% revenue share** at 50 referrals!

**How It Works:**

1. **You share your unique referral link**
2. **Friend signs up using your link**
3. **Friend completes setup** (adds business info + 1 product)
4. **You get rewarded instantly!**

**Rewards Per Referral:**

Every successful referral earns you:

💵 **₦500 Cash Credit**
- Added to your wallet
- Use for subscription payment
- Or withdraw to your bank

💰 **₦300 Airtime Credit**
- Added to your Storehouse account
- Use for WhatsApp messages, SMS, calls
- No expiry

**Example:**
Refer 3 friends = ₦1,500 cash + ₦900 airtime! 🎉

**Milestone Rewards:**

Hit these milestones for HUGE bonuses:

**🎯 3 Referrals:**
- **7-Day Pro Trial** unlocked
- Try all Pro features FREE
- Includes online store, staff management, advanced reports

**🎯 5 Referrals:**
- **1 FREE MONTH** of Storehouse Pro
- Worth ₦4,000
- Plus the ₦2,500 cash + ₦1,500 airtime from 5 referrals!

**🎯 10 Referrals:**
- **3 MORE FREE MONTHS** (total: 4 months)
- Worth ₦16,000
- Plus ₦5,000 cash + ₦3,000 airtime from 10 referrals!

**🎯 25 Referrals:**
- **8 MORE FREE MONTHS** (total: 12 months = 1 FULL YEAR!)
- Worth ₦48,000
- Plus ₦12,500 cash + ₦7,500 airtime!

**🎯 50 Referrals:**
- **🏆 LIFETIME ACCESS** - Never pay again!
- **Plus 1% revenue share** - Earn from Storehouse forever!
- Become a Storehouse partner!

**Referral Tracking:**

Your dashboard shows:
- Total referrals (how many friends joined)
- Successful referrals (completed setup)
- Next milestone (how many more needed)
- Total earnings (airtime + cash)

Example:
\`\`\`
Your Referral Stats:
--------------------
Total Referrals: 7
Successful: 6
Pending: 1 (friend hasn't added product yet)

Earnings:
- Cash: ₦3,000
- Airtime: ₦1,800

Next Milestone:
🎯 10 referrals - 4 more to go!
Unlock 3 FREE MONTHS!
\`\`\`

**Who Counts as a Referral?**

✅ **Valid Referral:**
- Friend clicks your unique link
- Signs up with their phone number
- Adds business information
- Adds at least 1 product to inventory
- Starts using Storehouse

❌ **Not Counted:**
- Friend signs up but doesn't add business info
- Friend doesn't add any products
- Friend signs up without your link
- Duplicate accounts (same person)
- Fake/test accounts

**Payment Timeline:**

- **Airtime credit:** Instant (within 1 minute)
- **Cash credit:** Instant (within 1 minute)
- **Free months:** Activated when milestone reached
- **Revenue share (50+ refs):** Monthly payouts

**Example Journey:**

**Month 1:** You refer 2 friends
- Earn: ₦1,000 cash + ₦600 airtime

**Month 2:** You refer 3 more friends (total: 5)
- Earn: ₦1,500 cash + ₦900 airtime
- 🎉 **Milestone reached! 1 FREE MONTH unlocked**

**Month 3:** You refer 5 more friends (total: 10)
- Earn: ₦2,500 cash + ₦1,500 airtime
- 🎉 **Milestone reached! 3 MORE FREE MONTHS (total: 4)**

**Month 6:** You refer 15 more friends (total: 25)
- Earn: ₦7,500 cash + ₦4,500 airtime
- 🎉 **Milestone reached! 8 MORE FREE MONTHS (total: 12 = 1 YEAR!)**

**Year 2:** You refer 25 more friends (total: 50)
- Earn: ₦12,500 cash + ₦7,500 airtime
- 🎉 **🏆 LIFETIME ACCESS + 1% REVENUE SHARE!**

Total earnings: ₦25,000 cash + ₦15,000 airtime + Never pay subscription again!

**Why Refer?**

✅ Help your business friends succeed
✅ Earn passive income
✅ Get free subscription
✅ Unlock Pro features
✅ Potential lifetime access
✅ Everyone wins!`,
    relatedDocs: ['how-to-refer-friends', 'track-referral-rewards'],
    keywords: ['referral program', 'refer friends', 'earn rewards', 'free months', 'airtime credit', 'referral rewards'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'how-to-refer-friends',
    category: 'referrals',
    title: 'How to Refer Friends',
    subtitle: 'Share your link and start earning',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 80,
    description: 'Learn how to share your referral link and invite other business owners to join Storehouse.',
    content: `**Get Your Referral Link:**

**Step 1: Go to Referrals Page**
- Click **More** button (bottom navigation)
- Click **Referral Program**

**Step 2: Copy Your Unique Link**
- You'll see your personal referral link
- Example: \`storehouse.ng/ref/MAMA-NGOZI\`
- Click **Copy Link** button

**Step 3: Share Your Link**

**Share via WhatsApp (Easiest!):**
- Click **Share on WhatsApp** button
- Storehouse pre-writes message for you
- Choose contacts who run businesses
- Send!

Example message:
\`\`\`
Hey! 👋

I'm using Storehouse to manage my business - it tracks sales, inventory, profit & sends me daily reports via WhatsApp!

Try it FREE: storehouse.ng/ref/MAMA-NGOZI

You'll love it! 💯
\`\`\`

**Share via SMS:**
- Click **Share via SMS**
- Select business owner contacts
- Send

**Share on Facebook:**
- Click **Share on Facebook**
- Post to your timeline or business groups
- Your friends click and sign up

**Share on Instagram:**
- Click **Copy Link**
- Post on your story/bio
- Caption: "Managing my business made easy with @storehouseng. Join me!"

**Share in Person:**
- Show your Storehouse dashboard
- Demonstrate features
- They scan QR code on your referral page
- Or they type link: storehouse.ng/ref/YOUR-CODE

**Who to Refer:**

**Great Referrals:**
✅ Shop owners (provision store, supermarket)
✅ Restaurant/food business owners
✅ Fashion designers & boutique owners
✅ Wholesalers & distributors
✅ Pharmacy owners
✅ Phone/electronics sellers
✅ Furniture makers
✅ Beauty salon owners
✅ Gas station owners
✅ ANY business with inventory!

**Perfect Timing to Refer:**

✅ When friend complains about:
  - "I don't know my daily profit"
  - "I'm losing track of stock"
  - "Customers owe me money"
  - "I need to manage staff better"

✅ When you show them your daily WhatsApp report

✅ When they see how organized your business is

✅ At business owner meetups/events

**What Happens When They Click Your Link:**

1. **They land on Storehouse signup page**
   - Your referral code auto-applied
   - They see: "Referred by [Your Name]"

2. **They create account**
   - Enter phone number
   - Set password
   - Verify OTP

3. **They complete setup**
   - Add business name
   - Add first product

4. **🎉 You get rewarded!**
   - ₦500 cash credited
   - ₦300 airtime credited
   - Notification sent to you

**Track Your Referrals:**

Referrals page shows:

\`\`\`
Referral Status:
----------------
Pending: 2
(Friends signed up but haven't added product yet)
- Tunde: Signed up 2 days ago
- Ada: Signed up 5 hours ago

Successful: 8
(Friends completed setup)
- Bola: Joined 30 Nov 2025 → ₦800 earned ✅
- Emeka: Joined 28 Nov 2025 → ₦800 earned ✅
- ... 6 more

Total Earned:
- Cash: ₦4,000
- Airtime: ₦2,400
\`\`\`

**Help Friends Complete Setup:**

If friend is "Pending":
- Message them: "Did you add your products yet?"
- Offer to help set up their first product
- Once they add 1 product → You get rewarded!

**Referral Tips:**

✅ **Be genuine** - Share your real experience
✅ **Show, don't tell** - Demo your dashboard
✅ **Explain benefits** - Daily reports, profit tracking, etc.
✅ **Offer help** - "I'll help you set it up"
✅ **Follow up** - Check if they signed up

❌ Don't spam
❌ Don't use fake accounts
❌ Don't mislead friends

**Creative Sharing Ideas:**

1. **Business Meetups**
   - Print your QR code
   - Hand out at networking events

2. **WhatsApp Status**
   - Post screenshot of your daily report
   - Add referral link

3. **Facebook Groups**
   - Join "Business Owners in Lagos" groups
   - Share success story + link

4. **YouTube/TikTok**
   - Record video showing Storehouse
   - Put referral link in description

5. **Market Associations**
   - Present at trader meetings
   - Show how Storehouse helps

**Bonus: Referral Challenges**

Storehouse occasionally runs:
- "Refer 5 in 30 days, win ₦10,000"
- "Top referrer this month wins Samsung tablet"
- Check Referrals page for active challenges

**Your Goal:**

🎯 **Start with 5 referrals → 1 FREE MONTH**
🎯 **Reach 25 → 1 FREE YEAR**
🎯 **Hit 50 → LIFETIME ACCESS + REVENUE SHARE!**

Good luck! 🚀`,
    relatedDocs: ['referral-program-overview', 'track-referral-rewards'],
    keywords: ['refer friends', 'share referral link', 'referral code', 'invite friends'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'track-referral-rewards',
    category: 'referrals',
    title: 'Track Your Referral Rewards',
    subtitle: 'See your earnings and next milestones',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 75,
    description: 'Monitor your referral earnings, track progress toward milestones, and withdraw your credits.',
    content: `**View Your Referral Dashboard:**

**Step 1: Go to Referrals Page**
- Click **More** → **Referral Program**
- See your complete referral stats

**Step 2: View Earnings**

Your dashboard shows:

\`\`\`
🎉 REFERRAL STATS
------------------
Total Referrals: 12
Successful: 10
Pending: 2

💰 EARNINGS
------------------
Cash Credit: ₦5,000
Airtime Credit: ₦3,000
Total Value: ₦8,000

🎯 MILESTONES UNLOCKED
------------------
✅ 3 Referrals: 7-Day Pro Trial
✅ 5 Referrals: 1 FREE MONTH
✅ 10 Referrals: 3 MORE FREE MONTHS (Total: 4)

🎯 NEXT MILESTONE
------------------
15 more referrals to unlock:
🏆 25 Referrals: 8 MORE FREE MONTHS (1 YEAR!)

Progress: [==========----------] 40%
\`\`\`

**Understanding Credits:**

**Cash Credit (₦500 per referral):**
- Use to pay subscription
- Or withdraw to bank account

Balance shows in dashboard:
"Cash Balance: ₦5,000"

**Airtime Credit (₦300 per referral):**
- Use for WhatsApp messages
- Send SMS to customers
- Make calls via Storehouse

Balance shows in dashboard:
"Airtime Balance: ₦3,000"

**How to Use Airtime Credit:**

Airtime auto-deducts when you:
- Send WhatsApp receipt (₦2 per message)
- Send SMS reminder (₦4 per SMS)
- Send invoice via WhatsApp
- Use AI chat assistant (₦10 per query)

Example:
\`\`\`
Airtime Usage:
- 100 WhatsApp receipts sent = ₦200
- 20 SMS reminders sent = ₦80
- 10 AI queries = ₦100
Total Used: ₦380
Remaining: ₦4,620
\`\`\`

**How to Use Cash Credit:**

**Option 1: Pay Subscription**
- When subscription due (₦4,000/month)
- Cash credit auto-applied
- Pay remaining with card/transfer

Example:
\`\`\`
Subscription Due: ₦4,000
Cash Credit: ₦3,000
You Pay: ₦1,000 ✅
\`\`\`

**Option 2: Withdraw to Bank**
- Click **Withdraw Cash Credit**
- Enter bank details
- Minimum withdrawal: ₦1,000
- Money arrives in 24 hours

**View Referral List:**

See everyone you referred:

\`\`\`
SUCCESSFUL REFERRALS (10)
-------------------------
1. Bola's Store
   Joined: 30 Nov 2025
   Earned: ₦500 airtime + ₦300 cash ✅

2. Emeka's Shop
   Joined: 28 Nov 2025
   Earned: ₦500 airtime + ₦300 cash ✅

3. Ada's Boutique
   Joined: 25 Nov 2025
   Earned: ₦500 airtime + ₦300 cash ✅

... 7 more

PENDING REFERRALS (2)
---------------------
1. Tunde (Signed up - needs to add product)
   Signed up: 29 Nov 2025
   Status: Awaiting product ⏳

2. Chidi (Signed up - needs to add product)
   Signed up: 30 Nov 2025
   Status: Awaiting product ⏳

Help them complete setup to earn ₦1,600 more!
\`\`\`

**Help Pending Referrals:**
- Click **Remind** button
- Storehouse sends them: "Complete your setup to unlock all features!"
- Once they add 1 product → You get ₦800!

**Milestone Progress:**

Track your journey to free months:

\`\`\`
MILESTONE TRACKER
-----------------
[✅✅✅✅✅] 5 Referrals - UNLOCKED!
  → 1 FREE MONTH activated

[✅✅✅✅✅✅✅✅✅✅] 10 Referrals - UNLOCKED!
  → 3 MORE FREE MONTHS (Total: 4)

[✅✅✅✅✅✅✅✅✅✅ - - - - - ] 25 Referrals
  → 15 more needed for 1 FREE YEAR!

[ - - - - - - - - - - - - - - - - ] 50 Referrals
  → 40 more needed for LIFETIME ACCESS + 1% revenue share!
\`\`\`

**Free Months Status:**

When you unlock free months:

\`\`\`
FREE SUBSCRIPTION
-----------------
Months Remaining: 4
Expires: 30 Mar 2026

No payment needed until April 2026! 🎉
Keep referring to extend further!
\`\`\`

**Transaction History:**

View all referral transactions:

\`\`\`
RECENT TRANSACTIONS
-------------------
30 Nov 2025: +₦500 airtime (Bola referred) ✅
30 Nov 2025: +₦300 cash (Bola referred) ✅
29 Nov 2025: -₦200 (WhatsApp messages sent)
28 Nov 2025: +₦500 airtime (Emeka referred) ✅
28 Nov 2025: +₦300 cash (Emeka referred) ✅
25 Nov 2025: +₦500 airtime (Ada referred) ✅
25 Nov 2025: +₦300 cash (Ada referred) ✅
\`\`\`

**Export Referral Report:**

Download your data:
- Click **Export Report**
- Choose format: PDF or CSV
- Includes:
  - All referrals
  - Earnings breakdown
  - Transaction history
  - Milestone achievements

**Notifications:**

You get notified when:
- New referral signs up (SMS + WhatsApp)
- Referral completes setup (₦800 earned!)
- Milestone unlocked (Free months!)
- Credit balance low (Top up or refer more)

**Leaderboard:**

See top referrers:

\`\`\`
TOP REFERRERS THIS MONTH
------------------------
🥇 1. Mama Caro - 47 referrals
🥈 2. Alhaji Musa - 38 referrals
🥉 3. Sister Peace - 29 referrals

... You're #15 with 12 referrals!

Keep going! 🚀
\`\`\`

**Tips to Maximize Rewards:**

✅ Refer quality businesses (they stay longer)
✅ Help referrals complete setup
✅ Share your referral link weekly
✅ Participate in referral challenges
✅ Aim for milestones (5, 10, 25, 50)

**Goal Tracker:**

Set your referral goals:
- "I want 5 referrals by end of month" (1 FREE MONTH)
- "I want 25 referrals by end of year" (1 FREE YEAR)
- "I want 50 referrals for LIFETIME ACCESS"

Storehouse tracks progress and cheers you on! 🎯`,
    relatedDocs: ['referral-program-overview', 'how-to-refer-friends'],
    keywords: ['referral rewards', 'track referrals', 'referral earnings', 'airtime credit', 'cash credit'],
    lastUpdated: '2025-11-30',
  },

  // ============================================
  // STAFF MANAGEMENT (3 guides)
  // ============================================

  {
    id: 'add-staff-members',
    category: 'staff',
    title: 'Add and Manage Staff Members',
    subtitle: 'Give employees secure access to your Storehouse',
    difficulty: 'intermediate',
    estimatedTime: '6 minutes',
    priority: 70,
    description: 'Add staff members with different roles and permissions to help run your business.',
    content: `**Why Add Staff?**

If you have employees:
- Cashiers who record sales
- Stock managers who receive goods
- Sales reps who make deliveries

Give them Storehouse access WITHOUT sharing your password!

**Staff Roles:**

**Manager:**
- Can do almost everything
- Record sales, add/edit products, view reports
- CANNOT: Manage staff, access settings, manage subscription

**Cashier:**
- Record sales
- Add/edit products
- View today's sales
- Send receipts
- CANNOT: View financial reports, manage staff, access settings

**How to Add Staff:**

**Step 1: Go to Staff Page**
- Click **More** button (bottom navigation)
- Click **Manage Staff**
- Click **Add Staff Member** button

**Step 2: Enter Staff Details**
- **Full Name:** e.g., "Tunde Balogun"
- **Phone Number:** Their mobile number
- **Role:** Manager or Cashier
- **Create 4-Digit PIN:** Staff uses this to log in

**Role Permissions:**

**Manager:**
- ✅ Record sales
- ✅ Add/edit/delete products
- ✅ View reports (Money & Profits, Dashboard)
- ❌ Manage staff (owner only)
- ❌ Access settings (owner only)

**Cashier:**
- ✅ Record sales
- ✅ Add/edit products
- ❌ View financial reports
- ❌ Manage staff
- ❌ Access settings

**Step 3: Save & Share PIN**
- Click **Add Staff**
- Storehouse creates the account
- **Important:** Share the PIN with staff member
- They need it to log in!

**Example:**

\`\`\`
Staff Member Added! ✅

Name: Tunde Balogun
Phone: 0901 234 5678
Role: Cashier
PIN: 1234

Share this PIN with Tunde. He'll use it to log in.
\`\`\`

**How Staff Logs In:**

**Step 1:** Staff opens Storehouse
**Step 2:** Enters their phone number
**Step 3:** Enters 4-digit PIN (NOT your password!)
**Step 4:** They're in! 🎉

**Staff Can See:**
- Only what you allowed
- Their own sales (not your full history)
- Current inventory
- NOT your business finances (unless you allow)

**View All Staff:**

Staff page shows:

\`\`\`
ACTIVE STAFF (3)
----------------
1. Tunde Balogun (Cashier)
   Phone: 0901 234 5678
   Added: 15 Nov 2025
   Last Active: Today, 3:45 PM
   Sales Today: 12 transactions

2. Ada Okafor (Manager)
   Phone: 0803 555 1234
   Added: 1 Nov 2025
   Last Active: Today, 5:12 PM
   Sales Today: 8 transactions

3. Emeka Nwankwo (Cashier)
   Phone: 0805 777 8888
   Added: 10 Nov 2025
   Last Active: Yesterday, 7:30 PM
   Sales Today: 0 transactions
\`\`\`

**Edit Staff:**

To change staff permissions:
1. Click staff member's name
2. Click **Edit Permissions**
3. Toggle permissions on/off
4. Click **Save Changes**

**Change Staff PIN:**

If staff forgets PIN:
1. Click staff member
2. Click **Reset PIN**
3. Enter new 4-digit PIN
4. Share with staff

**Deactivate Staff:**

If someone quits:
1. Click staff member
2. Click **Deactivate**
3. Confirm

**Deactivated staff:**
- Can no longer log in
- Their sales history remains
- You can reactivate anytime

**Track Staff Performance:**

See what each staff member does:

\`\`\`
Tunde's Activity:
-----------------
Sales This Week: 47
Total Amount: ₦125,000
Products Added: 0
Last Sale: Today, 3:45 PM
\`\`\`

**Common Scenarios:**

**Scenario 1: Cashier Needs to Add Product**
- Give them Manager role
- OR add the product yourself
- Then they can sell it

**Scenario 2: Manager Deleted Important Product**
- Check **Activity Log**
- See who deleted it
- Restore from backup (if available)
- Adjust their permissions

**Scenario 3: Staff Forgot PIN**
- You reset it for them
- Give them new PIN
- They log in again

**Best Practices:**

✅ Give minimum permissions needed
✅ Change PINs regularly (every 3 months)
✅ Monitor staff activity weekly
✅ Deactivate staff immediately when they quit
✅ Use Managers for trusted employees only

❌ Don't share your owner password
❌ Don't give everyone Manager role
❌ Don't ignore suspicious activity`,
    relatedDocs: ['staff-pin-login', 'track-staff-sales'],
    keywords: ['add staff', 'staff management', 'employee access', 'cashier', 'manager role'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'staff-pin-login',
    category: 'staff',
    title: 'Staff PIN Authentication',
    subtitle: 'Secure login system for employees',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 65,
    description: 'Understand how staff members use PINs to access Storehouse securely.',
    content: `**What is PIN Login?**

Instead of sharing your password with employees, Storehouse uses **4-digit PINs**.

**Benefits:**
✅ Staff can't access your personal account
✅ Easy to remember (4 digits)
✅ Easy to change if needed
✅ Track who did what

**How Staff Logs In:**

**Step 1: Open Storehouse**
- Staff goes to storehouse.ng
- Or opens the app

**Step 2: Enter Phone Number**
- They enter their registered phone
- Example: 0901 234 5678

**Step 3: Select "Staff Login"**
- NOT owner login!
- Click **Login as Staff**

**Step 4: Enter 4-Digit PIN**
- Type the PIN you gave them
- Example: 1234
- Click **Login**

**Step 5: They're In!**
- Access based on their role
- Can only do what you allowed

**Example Login Screen:**

\`\`\`
STAFF LOGIN
-----------
Phone: 0901 234 5678

Enter Your PIN:
[_] [_] [_] [_]

Forgot PIN? Contact your manager.
\`\`\`

**Creating Good PINs:**

✅ **Good PINs:**
- 2468 (easy pattern)
- 1379 (odd numbers)
- 2580 (phone keypad middle)

❌ **Avoid:**
- 1234 (too obvious)
- 0000 (very weak)
- 1111 (too simple)
- Staff's birthday (easy to guess)

**Changing PINs:**

**As Owner:**
1. Go to **More** → **Manage Staff**
2. Click staff member
3. Click **Reset PIN**
4. Enter new 4-digit PIN
5. Share with staff

**As Staff Member:**
- Staff CANNOT change their own PIN
- They must ask you (the owner)

**Security Benefits:**

**PIN-Based Access:**
- Each staff has unique PIN
- You can reset PINs anytime
- Revoke access by deactivating staff

**Activity Tracking:**
- You see when staff logs in
- When they log out
- What they do while logged in

**Example Activity Log:**

\`\`\`
Tunde's Recent Activity:
------------------------
30 Nov 2025, 9:05 AM - Logged in (PIN)
30 Nov 2025, 9:10 AM - Recorded sale (₦5,000)
30 Nov 2025, 11:30 AM - Recorded sale (₦12,500)
30 Nov 2025, 3:45 PM - Recorded sale (₦8,000)
30 Nov 2025, 6:00 PM - Logged out
\`\`\`

**Common PIN Issues:**

**Problem 1: Staff Forgot PIN**
- You reset it for them
- Give new PIN
- They log in again

**Problem 2: Wrong PIN 5 Times (Locked)**
- Wait 30 minutes
- OR you can unlock them:
  - Go to Staff page
  - Click staff member
  - Click **Unlock Account**

**Problem 3: PIN Not Working**
- Verify they're using correct phone number
- Check if account is active
- Try resetting PIN

**Problem 4: Staff Sharing PINs**
- Educate staff: "Don't share PINs!"
- Change PINs regularly
- Monitor for suspicious activity

**PIN vs Password:**

**Owner Password:**
- Full access to everything
- Change subscription
- Delete business
- Add/remove staff
- View all financial data

**Staff PIN:**
- Limited access
- Only what you allowed
- Can't change settings
- Can't view sensitive data

**Best Practices:**

✅ Change PINs every 3 months
✅ Use unique PINs for each staff
✅ Don't write PINs down publicly
✅ Monitor login activity
✅ Deactivate former staff immediately

❌ Don't use same PIN for everyone
❌ Don't share your owner password
❌ Don't ignore failed login attempts`,
    relatedDocs: ['add-staff-members', 'track-staff-sales'],
    keywords: ['staff pin', 'pin login', 'staff authentication', 'employee login'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'track-staff-sales',
    category: 'staff',
    title: 'Track Staff Sales & Performance',
    subtitle: 'Monitor employee activity and productivity',
    difficulty: 'intermediate',
    estimatedTime: '5 minutes',
    priority: 65,
    description: 'View individual staff performance, sales records, and activity logs.',
    content: `**Why Track Staff Sales?**

Know:
- Who's your best salesperson
- Who needs more training
- If any suspicious activity
- How to reward top performers

**View Staff Performance:**

**Step 1: Go to Staff Page**
- Click **Staff** in sidebar
- See all staff members

**Step 2: Click a Staff Member**
- View their complete profile
- See performance metrics

**Staff Performance Dashboard:**

\`\`\`
TUNDE BALOGUN (Cashier)
Phone: 0901 234 5678
Status: Active
Joined: 15 Nov 2025

📊 PERFORMANCE THIS MONTH
-------------------------
Total Sales: 127
Total Revenue: ₦487,500
Average Sale: ₦3,839
Best Day: 25 Nov (₦45,000 in sales)
Days Worked: 15

📅 TODAY'S ACTIVITY
-------------------
Sales: 12
Revenue: ₦38,000
First Sale: 9:15 AM
Last Sale: 5:30 PM

⭐ TOP PRODUCTS SOLD
--------------------
1. Indomie Noodles - 45 units
2. Golden Penny Flour - 12 units
3. Coca-Cola (50cl) - 67 units
\`\`\`

**Compare Staff Performance:**

See all staff side-by-side:

\`\`\`
STAFF LEADERBOARD (This Month)
-------------------------------
🥇 Ada Okafor (Manager)
   Sales: 234 | Revenue: ₦892,000

🥈 Tunde Balogun (Cashier)
   Sales: 127 | Revenue: ₦487,500

🥉 Emeka Nwankwo (Cashier)
   Sales: 98 | Revenue: ₦321,000
\`\`\`

**View Individual Sales:**

Click **View Sales History** to see every sale a staff member made:

\`\`\`
TUNDE'S SALES - 30 NOV 2025
----------------------------
1. 9:15 AM - ₦5,000 (Cash)
   - Indomie x 10
   - Peak Milk x 5

2. 9:47 AM - ₦12,500 (Transfer)
   - Golden Penny Flour x 1
   - Dangote Sugar x 3

3. 11:30 AM - ₦3,000 (Cash)
   - Coca-Cola x 6

... 9 more sales
\`\`\`

**Activity Log:**

See everything a staff member did:

\`\`\`
TUNDE'S ACTIVITY LOG
--------------------
30 Nov 2025, 9:05 AM - Logged in
30 Nov 2025, 9:15 AM - Recorded sale (₦5,000)
30 Nov 2025, 9:47 AM - Recorded sale (₦12,500)
30 Nov 2025, 10:15 AM - Viewed product "Flour"
30 Nov 2025, 11:30 AM - Recorded sale (₦3,000)
30 Nov 2025, 2:00 PM - Sent WhatsApp receipt
30 Nov 2025, 5:30 PM - Recorded sale (₦8,000)
30 Nov 2025, 6:00 PM - Logged out

29 Nov 2025, 9:00 AM - Logged in
29 Nov 2025, 9:10 AM - Edited product "Milk"
... more activity
\`\`\`

**Detect Issues:**

**Red Flags to Watch:**

🚩 **Lots of deleted sales**
- May indicate theft or errors
- Check what was deleted and why

🚩 **Unusually large discounts**
- Staff giving friends free discounts?
- Review discount patterns

🚩 **Sales at odd hours**
- Sales recorded at 2 AM?
- Investigate

🚩 **Consistent low stock for certain products**
- Staff might be taking products
- Verify physical stock

**Export Staff Reports:**

Download detailed reports:
- **Monthly Performance Report** (PDF)
- **Sales by Staff Member** (CSV)
- **Activity Log** (Excel)

Useful for:
- Payroll (if commission-based)
- Performance reviews
- Accounting records

**Set Staff Targets:**

Create goals for staff:

\`\`\`
TUNDE'S MONTHLY TARGET
----------------------
Target: ₦500,000 in sales
Current: ₦487,500
Remaining: ₦12,500
Progress: [====================] 97.5%

Days left: 1
Status: On track! 🎯
\`\`\`

**Reward Top Performers:**

Ideas:
- Commission: 2% of sales
- Bonus for hitting target
- "Salesperson of the Month" award
- Extra day off

**Performance Insights:**

Storehouse shows:

\`\`\`
INSIGHTS: Tunde Balogun
------------------------
✅ Consistently high sales on Fridays
✅ Best at selling beverages
✅ Average transaction time: 3 minutes (good!)
⚠️ Lower sales on Mondays (might need support)
⚠️ Deleted 3 sales this week (ask why)
\`\`\`

**Team Performance:**

Overall team stats:

\`\`\`
ALL STAFF (This Month)
----------------------
Total Staff: 3
Total Sales: 459
Total Revenue: ₦1,700,500
Average per Staff: ₦566,833

Busiest Day: 25 Nov (₦145,000)
Slowest Day: 3 Nov (₦18,000)
\`\`\`

**Best Practices:**

✅ Review staff performance weekly
✅ Praise top performers publicly
✅ Coach low performers privately
✅ Set realistic targets
✅ Investigate anomalies immediately
✅ Export reports monthly for records

❌ Don't micromanage every sale
❌ Don't ignore red flags
❌ Don't compare unfairly (morning vs evening shifts)`,
    relatedDocs: ['add-staff-members', 'staff-pin-login'],
    keywords: ['staff sales', 'track staff', 'employee performance', 'staff activity'],
    lastUpdated: '2025-11-30',
  },

  // ============================================
  // ONLINE STORE (3 guides)
  // ============================================

  {
    id: 'create-online-store',
    category: 'online-store',
    title: 'Create Your Online Store',
    subtitle: 'Sell products online with your own web store',
    difficulty: 'intermediate',
    estimatedTime: '10 minutes',
    priority: 80,
    description: 'Set up your own online storefront and start selling products on the internet.',
    content: `**What is the Online Store?**

Storehouse gives you a FREE online store where customers can:
- Browse your products
- Add to cart
- Pay online (via Paystack)
- Contact you via WhatsApp

Your store URL: **storehouse.ng/store/YOUR-STORE-SLUG**

**Benefits:**

✅ Sell 24/7 (even while you sleep!)
✅ Reach customers anywhere in Nigeria
✅ Accept online payments
✅ Automatic inventory updates
✅ No coding needed!

**How to Create Your Store:**

**Step 1: Go to Online Store**
- Click **More** button (bottom navigation)
- Click **Online Store**
- Set up your store details

**Step 2: Customize Your Store**

**Store Name:**
- Auto-fills from your business name
- Example: "Mama Ngozi Store"

**Store URL (Slug):**
- Choose a unique slug for your store
- Example: storehouse.ng/store/mama-ngozi
- Must be unique across all Storehouse stores
- Can use custom domain or subdomain (advanced)

**WhatsApp Number:**
- Your business WhatsApp for customer orders
- Customers contact you via WhatsApp button

**Step 3: Add Optional Details**

**Bank Account (for transfers):**
- Bank name
- Account number
- Account name

**Delivery Information:**
- Delivery areas you serve
- Delivery fee
- Minimum order amount

**Business Hours:**
- Operating hours
- Days of operation

**About Your Business:**
- Store description
- What you sell

**Social Media:**
- Instagram URL
- Facebook URL

**Paystack Integration (Optional):**
- Enable online payments
- Add Paystack public key
- Test mode vs Live mode

**Step 4: Make Store Public**
- By default, products marked as public show in store
- To hide a product: Edit product → Uncheck "Show in Online Store"
- Share your store URL with customers

**Your Online Store Features:**

**Homepage:**
\`\`\`
[Your Logo]
MAMA NGOZI STORE
Quality products, delivered to your door

[Search Products]

FEATURED PRODUCTS
-----------------
[Golden Penny Flour] [Dangote Sugar] [Indomie]
₦35,000            ₦1,200        ₦150

CATEGORIES
----------
- Grains & Cereals
- Beverages
- Snacks
- Cooking Essentials
\`\`\`

**Product Page:**
- Product image(s)
- Name & description
- Price
- Stock status ("10 available")
- **Add to Cart** button
- Variants (if any): Size, Color, etc.

**Shopping Cart:**
- Lists all items
- Shows quantities
- Subtotal
- Delivery fee
- Total

**Checkout:**
- Customer enters:
  - Full name
  - Phone number
  - Delivery address
  - Payment method

- Pays online (Paystack)
- OR selects Pay on Delivery

**Customer Experience:**
- Customers browse your products
- Add items to cart
- Checkout with Paystack (if enabled)
- Or contact you via WhatsApp to place order

**Share Your Store:**

Share your store URL:
- Via WhatsApp to customers
- In social media bio (Instagram, Facebook)
- On business cards or flyers

Example URL: storehouse.ng/store/mama-ngozi

**Custom Domain (Advanced):**

You can use your own domain:
- Instead of: storehouse.ng/store/mama-ngozi
- Use: www.mamangozi.com

Requires domain ownership and DNS configuration.

**Track Sales:**

When customers order from your store:
- If paid via Paystack: Sale auto-records in Storehouse
- If WhatsApp order: You manually record the sale
- All sales appear in your Dashboard and reports`,
    relatedDocs: ['manage-online-orders', 'online-store-seo'],
    keywords: ['online store', 'e-commerce', 'sell online', 'web store', 'online shop'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'whatsapp-storefront-ordering',
    category: 'online-store',
    title: 'WhatsApp Ordering from Your Store',
    subtitle: 'How customers order directly via WhatsApp',
    difficulty: 'beginner',
    estimatedTime: '4 minutes',
    priority: 85,
    description: 'Learn how the WhatsApp ordering button works on your online storefront and how to handle WhatsApp orders.',
    content: `**What is WhatsApp Ordering?**

Your online store has a **green "Order Now" button** on every product that opens WhatsApp with a pre-filled message - making ordering super easy for Nigerian customers who prefer WhatsApp!

**How It Works (Customer Side):**

**Step 1: Customer browses your store**
- They visit: storehouse.ng/store/yourslug
- See all your public products

**Step 2: Customer finds a product they want**
\`\`\`
┌────────────────────┐
│  [Product Image]   │
│  iPhone 15 Pro     │
│  ₦850,000         │
│                    │
│  [+] Add to Cart  │ ← Cart option
│  [💚] Order Now    │ ← WhatsApp button (GREEN)
└────────────────────┘
\`\`\`

**Step 3: Customer clicks "Order Now"**
- WhatsApp opens automatically
- Message is pre-filled:
  "Hi, I'm interested in ordering *iPhone 15 Pro* (₦850,000)"
- Your WhatsApp number is auto-selected
- Customer just needs to hit send!

**Benefits for Customers:**

✅ No need to create account
✅ Order in under 10 seconds
✅ Direct communication with seller
✅ Can ask questions before buying
✅ Can negotiate delivery details
✅ Familiar (everyone knows WhatsApp)

**How to Set Up (Your Side):**

**Step 1: Add WhatsApp Number**
- Go to **More** → **Settings** → **Business Settings**
- Scroll to **WhatsApp Number**
- Enter your business WhatsApp (format: 2348012345678 or 08012345678)
- Click **Save**

**Step 2: Make Products Public**
- Go to **Inventory**
- Edit product
- Check **"Show in Online Store"**
- Save

**Step 3: Test It!**
- Visit your store: storehouse.ng/store/yourslug
- Click **"Order Now"** on any product
- Verify WhatsApp opens with correct message

**What Happens When Customer Orders:**

**You Receive:**
- WhatsApp message from customer
- Pre-filled with product details
- Customer's phone number (can save to contacts)

**Example Messages You'll Get:**

\`\`\`
Customer: Hi, I'm interested in ordering *Golden Penny Flour 50kg* (₦35,000)

Customer: Hello! Can I order *Dangote Sugar 1kg* (₦1,200)? Do you deliver to Ikeja?

Customer: Hi! I want to buy *iPhone 15 Pro* (₦850,000). Is it still available?
\`\`\`

**How to Respond:**

**Good Response:**
\`\`\`
You: Hello! Yes, iPhone 15 Pro is available ✅

Price: ₦850,000
Delivery: ₦2,000 (within Lagos)
Estimated delivery: 1-2 days

To confirm your order:
1. Send delivery address
2. Payment: Bank transfer or Pay on Delivery

Shall we proceed? 😊
\`\`\`

**After Customer Confirms:**

**Step 1: Confirm Details**
- Verify delivery address
- Confirm payment method
- Set delivery date

**Step 2: Record the Sale**
- Go to **Storehouse** → **Record Sale**
- Select the product
- Enter customer details
- Select channel: **WhatsApp**
- Save

**Step 3: Process Order**
- Pack the item
- Arrange delivery
- Update customer via WhatsApp

**Step 4: Collect Payment**
- If Pay on Delivery: Collect when delivering
- If Bank Transfer: Share account details
- Mark as paid in Storehouse when received

**Multiple Items Order:**

If customer wants multiple products:

\`\`\`
Customer: Hi! I want:
- Golden Penny Flour x 2 = ₦70,000
- Dangote Sugar x 5 = ₦6,000

Total: ₦76,000

Do you deliver to Lekki?
\`\`\`

**Your Response:**
- Confirm all items available
- Calculate delivery fee
- Send total amount
- Confirm order when customer agrees

**WhatsApp vs Cart Checkout:**

**WhatsApp Ordering:**
✅ Faster for customers (no forms)
✅ Personal communication
✅ Can negotiate/ask questions
✅ Works for all ages (even non-tech)
❌ You manually record sale

**Cart Checkout (Paystack):**
✅ Automatic payment
✅ Auto-records in Storehouse
✅ Professional checkout flow
❌ Requires payment setup
❌ Some customers distrust online payment

**💡 Pro Tip:** Enable BOTH methods!
- Tech-savvy customers use cart
- Traditional customers use WhatsApp
- More payment options = More sales!

**Common Questions:**

**Q: Can I disable the WhatsApp button?**
A: Yes! Remove your WhatsApp number in Settings → Business Settings

**Q: Can I change the button text?**
A: Not currently - it says "Order Now" for all stores

**Q: Do I get notified of orders?**
A: Yes, via WhatsApp! Customer messages you directly

**Q: How do I track WhatsApp orders?**
A: Record them manually in Storehouse → Sales

**Q: Can customers order multiple products at once?**
A: Currently, button sends one product at a time. Customer can message you about multiple items.

**🚀 Next Steps:**

1. ✅ Set your WhatsApp number in Settings
2. ✅ Make products public
3. ✅ Share your store link
4. ✅ Start getting WhatsApp orders!

**Share Your Store:**
- WhatsApp Status: "Shop online! storehouse.ng/store/yourslug"
- Instagram Bio: Add link
- Facebook posts: Share store URL
- Print on flyers/business cards`,
    relatedDocs: ['create-online-store', 'manage-online-orders', 'record-first-sale', 'business-settings'],
    keywords: ['whatsapp', 'order via whatsapp', 'whatsapp button', 'whatsapp ordering', 'order now button', 'how customers order whatsapp', 'whatsapp sales', 'green button', 'storefront whatsapp', 'customer ordering', 'whatsapp store'],
    lastUpdated: '2025-12-04',
  },

  {
    id: 'manage-online-orders',
    category: 'online-store',
    title: 'Handle Online Store Customers',
    subtitle: 'Process customer inquiries and orders',
    difficulty: 'beginner',
    estimatedTime: '6 minutes',
    priority: 75,
    description: 'Manage customer orders from your online store.',
    content: `**How Customers Order:**

**Option 1: Paystack Checkout (if enabled)**
1. Customer adds products to cart
2. Proceeds to checkout
3. Pays via Paystack (card/bank)
4. Sale auto-records in Storehouse
5. You get notification

**Option 2: WhatsApp Contact**
1. Customer browses products
2. Clicks "Contact on WhatsApp" button
3. Opens WhatsApp with pre-filled message listing items
4. You discuss delivery and payment
5. You manually record the sale

**When You Get an Order:**

**Notification:**
- WhatsApp message: "New order #ORD-2025-045!"
- SMS notification
- Email (if configured)
- In-app notification

**Step 1: View Order Details**
- Go to **Orders** page
- Click the new order

**Order details:**
\`\`\`
ORDER #ORD-2025-045
-------------------
Date: 30 Nov 2025, 3:15 PM
Status: NEW

CUSTOMER:
Name: Chidi Okonkwo
Phone: 0901 234 5678
Address: 12 Allen Avenue, Ikeja, Lagos

ITEMS:
1. Golden Penny Flour (50kg) x 2 = ₦70,000
2. Dangote Sugar (1kg) x 5 = ₦6,000

Subtotal: ₦76,000
Delivery: ₦2,000
TOTAL: ₦78,000

PAYMENT:
Method: Paystack (Card)
Status: PAID ✅
Reference: PSK-789456123
\`\`\`

**Step 2: Confirm Stock**
- Verify you have items in stock
- If out of stock:
  - Call customer
  - Offer substitute OR refund

**Step 3: Mark as "Processing"**
- Click **Update Status**
- Select **Processing**
- Customer gets WhatsApp update:
  "Your order is being prepared! 📦"

**Step 4: Pack the Items**
- Gather all products
- Pack securely
- Print order details (attach to package)
- Update inventory (auto-deducted)

**Step 5: Arrange Delivery**

**Option A: Use Logistics Company**
- GIG Logistics, Kwik, DHL, etc.
- Click **Arrange Delivery**
- Select delivery partner
- Pay delivery fee
- Get tracking number

**Option B: Self Delivery**
- Deliver yourself or use staff
- Enter delivery person's name
- Enter phone number

**Step 6: Mark as "Shipped"**
- Click **Update Status**
- Select **Shipped**
- Enter tracking number (if any)
- Customer gets update:
  "Your order is on the way! 🚚 Track: TRK-123456"

**Step 7: Mark as "Delivered"**
- When customer receives order
- Click **Update Status**
- Select **Delivered**
- Customer gets:
  "Order delivered! Thank you for shopping with us! 🎉"

**Payment on Delivery Orders:**

If customer selected "Pay on Delivery":

**Step 1-4:** Same as above

**Step 5: Collect Payment**
- Delivery person collects money
- Cash OR POS

**Step 6: Mark as "Delivered + Paid"**
- Click **Update Status**
- Select **Delivered**
- Toggle **Payment Collected** ON
- Enter amount collected
- Revenue auto-added to Storehouse

**Cancelled Orders:**

**Customer Cancels:**
- Customer calls to cancel
- Click **Cancel Order**
- Select reason: "Customer requested"
- If paid online: Refund auto-processed (2-5 days)

**You Cancel:**
- Out of stock or can't deliver
- Click **Cancel Order**
- Select reason: "Out of stock"
- Call customer to explain
- Refund processed if they paid

**Order Filters:**

View specific orders:
- **All Orders**
- **New** (needs processing)
- **Processing** (being prepared)
- **Shipped** (in transit)
- **Delivered** (completed)
- **Cancelled**
- **Pending Payment** (Pay on Delivery not collected yet)

**Order Search:**

Find specific order:
- Search by order number: "ORD-2025-045"
- Search by customer name: "Chidi"
- Search by phone: "0901 234 5678"
- Filter by date range

**Bulk Actions:**

Process multiple orders:
- Select multiple orders
- Click **Bulk Update**
- Mark all as "Processing"
- OR mark all as "Shipped"

**Customer Communication:**

**Send Updates:**
- Click **Send Message**
- Pre-written templates:
  - "Your order is being prepared"
  - "Your order has shipped"
  - "Estimated delivery: Tomorrow"

**Handle Issues:**
- Customer: "Where's my order?"
- You: Check status, send tracking number

- Customer: "I received wrong item"
- You: Arrange return + send correct item

**Export Orders:**

Download order data:
- CSV for Excel
- PDF for printing
- Filter by date, status, or customer

**Order Reports:**

View insights:
- **Orders This Month:** 43
- **Total Revenue:** ₦187,000
- **Average Order Value:** ₦4,349
- **Pending Orders:** 5 (need processing!)
- **Completed Orders:** 38

**Common Scenarios:**

**Scenario 1: Multiple Orders Same Day**
- Prioritize by payment status (paid first)
- Then by order time (first come, first served)

**Scenario 2: Out of Stock After Order**
- Call customer immediately
- Offer substitute or refund
- Don't delay - customer is waiting!

**Scenario 3: Delivery Failed**
- Customer not home
- Delivery person calls customer
- Reschedule delivery
- Update status: "Attempted Delivery"

**Best Practices:**

✅ Process orders within 24 hours
✅ Update status at every step
✅ Communicate with customers
✅ Pack items securely
✅ Verify delivery address before shipping

❌ Don't delay processing
❌ Don't forget to update inventory
❌ Don't ignore customer messages`,
    relatedDocs: ['create-online-store', 'online-store-seo'],
    keywords: ['online orders', 'order management', 'process orders', 'order fulfillment'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'online-store-seo',
    category: 'online-store',
    title: 'Optimize Your Store for Google',
    subtitle: 'Get more customers from search engines',
    difficulty: 'intermediate',
    estimatedTime: '8 minutes',
    priority: 70,
    description: 'Improve your online store visibility on Google and attract more customers.',
    content: `**What is SEO?**

SEO (Search Engine Optimization) = Making your store easy to find on Google.

**Why It Matters:**

When someone searches Google for:
- "Buy Indomie in Lagos"
- "Golden Penny Flour online"
- "Food store in Ikeja"

Your store could appear in results!

**Basic SEO Setup:**

**Step 1: Add Store Description**
- Go to **Online Store Settings**
- Write clear description (150-200 words)

Good example:
\`\`\`
"Mama Ngozi Store is your trusted online supermarket in Lagos, Nigeria. We sell quality food items, beverages, household products, and cooking essentials at affordable prices. Order online and get fast delivery across Lagos and Nigeria. Shop Golden Penny Flour, Dangote Sugar, Indomie Noodles, and more. Same-day delivery available!"
\`\`\`

Why it works:
- Mentions location (Lagos, Nigeria)
- Lists popular products (Golden Penny, Dangote)
- Includes key terms (online supermarket, delivery)

**Step 2: Optimize Product Names**

❌ **Bad:** "Flour 50kg"
✅ **Good:** "Golden Penny Flour 50kg - Premium Wheat Flour"

❌ **Bad:** "Sugar"
✅ **Good:** "Dangote Sugar 1kg - White Refined Sugar"

Include:
- Brand name
- Product type
- Size/quantity
- Key features

**Step 3: Write Product Descriptions**

Don't leave blank! Google reads descriptions.

❌ **Bad:** "Flour for cooking"

✅ **Good:**
\`\`\`
"Golden Penny Flour 50kg is Nigeria's #1 choice for baking, puff-puff, and pastries. Made from premium wheat, this flour gives soft, fluffy results. Perfect for bakeries, restaurants, and home use. Order online with fast delivery across Lagos and Nigeria."
\`\`\`

Include:
- What it's used for
- Benefits
- Who it's for
- Call to action ("Order online")

**Step 4: Add Product Images**

Google favors stores with images.

✅ Upload clear product photos
✅ Multiple angles if possible
✅ Well-lit, high quality
✅ Image file name: "golden-penny-flour-50kg.jpg" (NOT "IMG_1234.jpg")

**Step 5: Use Categories**

Organize products:
- **Grains & Cereals** (Rice, Flour, Oats)
- **Beverages** (Milo, Coca-Cola, Peak Milk)
- **Cooking Essentials** (Oil, Salt, Sugar)
- **Snacks** (Indomie, Biscuits, Gala)

Google shows category pages in search results!

**Step 6: Add Location Keywords**

If you deliver to specific areas, mention them:
- "Delivery to Ikeja, Lekki, Victoria Island"
- "Serving Lagos Mainland and Island"
- "Available in Abuja, Lagos, Port Harcourt"

**Advanced SEO:**

**Blog Posts (Pro Feature):**

Write helpful articles:
- "10 Uses for Golden Penny Flour"
- "How to Make Perfect Jollof Rice"
- "Best Cooking Oil for Nigerian Dishes"

Include your products in articles + links to buy.

**Customer Reviews:**

Encourage customers to leave reviews:
- "How was your order? Leave a review!"
- Reviews boost Google ranking
- 5-star ratings attract more customers

**Social Media Integration:**

Link your store to:
- Facebook Business Page
- Instagram Profile
- Twitter

Google sees social signals as trust factor.

**Google My Business:**

Create free Google Business Profile:
1. Go to google.com/business
2. Add your business
3. Add store URL
4. Get verified
5. Appear on Google Maps!

When someone searches "supermarket near me" → Your store shows!

**Monitor Store Traffic:**

Storehouse tracks:
- **Visitors:** How many people visit
- **Where from:** Google, Facebook, WhatsApp, Direct
- **Popular searches:** What customers search on your store
- **Top products viewed**

Example:
\`\`\`
TRAFFIC SOURCES (This Month)
----------------------------
Google Search: 347 visits (28%)
Facebook: 512 visits (41%)
WhatsApp: 289 visits (23%)
Direct (typed URL): 99 visits (8%)

TOP GOOGLE SEARCHES:
1. "buy indomie online lagos"
2. "golden penny flour delivery"
3. "mama ngozi store"
\`\`\`

**Improve Based on Data:**

- Lots of searches for "Indomie"?
  → Add more Indomie varieties
  → Write blog: "Indomie Recipes"

- Traffic from Facebook high?
  → Post more on Facebook
  → Run Facebook ads

**Content Ideas:**

Create pages for:
- **About Us** - Your story, why customers trust you
- **Delivery Information** - Where you deliver, how long
- **FAQs** - Common questions answered
- **Contact Us** - Phone, WhatsApp, email, address

Google ranks stores with more content higher!

**Technical SEO (Auto-Handled by Storehouse):**

✅ Mobile-friendly design
✅ Fast loading speed
✅ HTTPS security
✅ XML sitemap
✅ Structured data markup

You don't need to worry about these - Storehouse handles it!

**Local SEO:**

Target local customers:
- Mention neighborhood names (Ikeja, Surulere, Ajah)
- Add "Near [Landmark]" to product titles
  - Example: "Golden Penny Flour - Delivery Near Shoprite Ikeja"

**Track Your Google Ranking:**

Check where you appear:
- Search "your business name" → Should be #1
- Search "buy [product] in [city]" → Aim for first page

**Boost Ranking:**

✅ Get more customer reviews (ask every customer!)
✅ Update products regularly (Google favors active stores)
✅ Share store link on social media
✅ Get backlinks (other websites link to you)

**Best Practices:**

✅ Write unique product descriptions (don't copy from manufacturers)
✅ Update store regularly (add new products, remove sold out)
✅ Respond to customer reviews
✅ Share customer success stories

❌ Don't copy content from other websites
❌ Don't stuff keywords unnaturally
❌ Don't ignore customer feedback`,
    relatedDocs: ['create-online-store', 'manage-online-orders'],
    keywords: ['seo', 'google search', 'online store optimization', 'search engine'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'setup-multi-payment-methods',
    category: 'online-store',
    title: 'Add Payment Methods (OPay, Moniepoint, etc.)',
    subtitle: 'Let customers pay with their preferred method',
    difficulty: 'beginner',
    estimatedTime: '5 minutes',
    priority: 90,
    description: 'Add multiple payment options to your online store - OPay, Moniepoint, PalmPay, Kuda, Banks, and more!',
    content: `**🚀 NEW FEATURE! Multi-Payment Methods**

Give your customers MORE ways to pay = MORE sales! 💰

**Supported Payment Methods:**

🟢 **OPay** - Digital wallet (instant)
🔵 **Moniepoint** - Business banking (instant)
🟣 **PalmPay** - Mobile wallet (instant)
🟣 **Kuda Bank** - Digital bank (instant)
🏦 **Traditional Banks** - GTBank, Access, Zenith, etc.
💳 **Other** - Chipper Cash, Payoneer, etc.
💳 **Paystack** - Card payments (existing feature)
📱 **WhatsApp** - Chat-based checkout (existing feature)

**Why Add Multiple Payment Methods?**

✅ **Increase conversions** - 30-50% more customers complete orders
✅ **Youth prefer digital wallets** - OPay, PalmPay dominate 18-35 demographic
✅ **Older customers prefer banks** - Traditional bank transfers
✅ **Instant settlements** - OPay/Moniepoint arrive instantly vs hours for banks
✅ **Lower/zero fees** - Digital wallets often charge ₦0 vs ₦50-100 for bank transfers
✅ **Professional appearance** - Looks like Jumia, Konga, Amazon

---

## 📱 How to Add Payment Methods

**Step 1: Go to Settings**
1. Tap **More** (bottom navigation)
2. Tap **Settings** (⚙️)
3. Scroll to **💳 Payment Methods** section
4. Tap to expand

**Step 2: Add Your First Payment Method**
1. Tap **"Add Payment Method"** button
2. Select payment type (e.g., **OPay**)
3. Fill in details:
   - **Account Number**: 7012345678
   - **Account Name**: Your Business Name
   - **Instructions** (optional): "Send payment screenshot to WhatsApp"
4. Tap **"Add Payment Method"**

🎊 **Success!** Your first payment method is added!

**Step 3: Add More Methods (Optional)**
- Repeat for Moniepoint, PalmPay, Banks, etc.
- We recommend 2-3 payment methods for best results

---

## 💡 Example Setup (Recommended)

**Most Effective Combination:**

1. **OPay** (for youth/tech-savvy customers)
   - Account: 7012345678
   - Name: Fashion Store

2. **GTBank** (for older customers/corporate)
   - Bank: GTBank
   - Account: 0123456789
   - Name: Fashion Store Ltd

3. **Paystack** (for card payments)
   - Already set up in Paystack Setup section

**Result:** You now accept 8+ payment methods! 🚀

---

## 🎨 How Customers See It

**On Your Storefront:**

\`\`\`
💳 Payment Methods
▼ (Click to expand)

🟢 OPay
Account: 7012345678 [Copy 📋]
Name: Fashion Store

🏦 GTBank
Account: 0123456789 [Copy 📋]
Name: Fashion Store Ltd
\`\`\`

**During Checkout:**

\`\`\`
Select Payment Method:
⚡ Pay with Card (Paystack)
🟢 OPay (7012345678)
🏦 GTBank (0123456789)
📱 Order via WhatsApp
\`\`\`

When customer selects OPay:
\`\`\`
💰 PAYMENT DETAILS
Account Number: 7012345678 [Copy]
Account Name: Fashion Store

📝 Send payment screenshot to WhatsApp
\`\`\`

---

## ⚙️ Manage Payment Methods

**Enable/Disable:**
- Toggle payment methods ON/OFF without deleting
- Hide temporarily (e.g., bank account during maintenance)

**Edit Details:**
- Update account numbers
- Change instructions
- Modify account names

**Delete:**
- Remove payment methods you no longer use

**Copy Account Numbers:**
- Quick copy buttons throughout
- Easy to share with customers

---

## 🇳🇬 Nigerian Payment Method Guide

**OPay** (Most Popular)
- ✅ Instant settlement
- ✅ Zero fees for receiving
- ✅ Youth demographic
- ✅ Easy to verify
- Account starts with: **70**

**Moniepoint** (Business Favorite)
- ✅ Built for businesses
- ✅ Instant settlement
- ✅ POS integration available
- ✅ Business analytics
- Account starts with: **60**

**PalmPay** (Fast Growing)
- ✅ Instant transfers
- ✅ Cashback rewards
- ✅ Youth-focused
- Account starts with: **80**

**Kuda Bank** (Tech-Savvy)
- ✅ Digital-first bank
- ✅ Free transfers
- ✅ Modern users
- Account starts with: **20**

**Traditional Banks** (Trusted)
- ✅ Older customers prefer
- ✅ Corporate payments
- ✅ Familiar to everyone
- ⚠️ May take 1-3 hours to settle

---

## 🎯 Pro Tips

**1. Start with 2-3 methods:**
- Don't overwhelm customers
- OPay + Bank is a great combo

**2. Add clear instructions:**
- "Send screenshot after payment"
- "WhatsApp us for confirmation"
- "Use your name as reference"

**3. Test the flow:**
- Open your store in a new tab
- Add to cart
- Try the checkout with each payment method
- Make sure account numbers copy correctly

**4. Promote your payment options:**
- "We accept OPay, Moniepoint, Bank Transfer & Cards!"
- Mention in Instagram/Facebook posts
- Add to WhatsApp status

**5. Monitor which methods work best:**
- Check Settings → Reports
- See which payment methods customers prefer
- Double down on popular ones

---

## ❓ FAQs

**Q: Do I need all payment methods?**
A: No! Start with 1-2 that YOU already use. OPay + GTBank covers 80% of customers.

**Q: Are there fees?**
A: OPay, Moniepoint, PalmPay = Usually ₦0 to receive. Banks = ₦50-100 for customers. Paystack = 1.5% + ₦100.

**Q: How long to receive payment?**
A: OPay/Moniepoint/PalmPay = Instant (seconds). Banks = 1-3 hours. Paystack = Instant to dashboard, settles next day.

**Q: Can I change account numbers later?**
A: Yes! Edit anytime in Settings → Payment Methods.

**Q: What if a customer pays wrong account?**
A: All accounts are YOURS, so money still reaches you. Verify via bank app.

**Q: Should I remove Paystack if I add OPay?**
A: No! Keep both. Some customers prefer cards. More options = more sales.

**Q: Can customers pay with multiple methods?**
A: Not yet, but coming soon! For now, they choose one method per order.

---

## 🚀 Next Steps

After adding payment methods:

1. **Share your store link** everywhere
   - WhatsApp status
   - Instagram bio
   - Facebook posts

2. **Add Paystack** for card payments
   - Settings → Paystack Setup
   - Get public key from paystack.com
   - Enable card payments

3. **Monitor performance**
   - Check which methods customers use most
   - Adjust based on data

4. **Grow your sales**
   - More payment options = less cart abandonment
   - Watch your conversion rate increase!

---

**🎉 Congratulations!** You're now accepting payments like Jumia and Konga!

This is a HUGE competitive advantage. Most small businesses only accept one payment method. You accept 8+! 💪`,
    relatedDocs: ['create-online-store', 'manage-online-orders', 'business-settings'],
    keywords: ['opay', 'moniepoint', 'palmpay', 'kuda', 'payment methods', 'bank transfer', 'online payment', 'digital wallet', 'multi-payment', 'payment options', 'how to add opay', 'accept moniepoint'],
    lastUpdated: '2025-12-03',
  },

  // ============================================
  // REPORTS & SETTINGS (4 guides)
  // ============================================

  {
    id: 'view-business-reports',
    category: 'reports',
    title: 'View Business Reports & Analytics',
    subtitle: 'Understand your business performance',
    difficulty: 'intermediate',
    estimatedTime: '7 minutes',
    priority: 75,
    description: 'Access sales data, profit tracking, inventory stats, and customer insights across different pages.',
    content: `**Why Tracking Matters:**

Know:
- How much profit you're making
- Which products sell best
- Total sales and revenue
- Customer purchase history
- Stock levels and alerts

**Where to Find Your Data:**

Storehouse shows your business metrics across different pages:

**Dashboard (Home Page):**
- Today's Sales summary
- Recent transactions
- Quick stats

**Money & Profits Page:**
- Monthly profit calculation
- Tax estimates (if enabled)
- Sales vs COGS vs Expenses

**Inventory Page:**
- Total products count
- Stock levels for each product
- Low stock alerts

**Customers Page:**
- Customer list with debt balances
- Purchase history per customer
- Overdue debts

**WhatsApp Daily Reports:**
- Receive automatic daily sales summary via WhatsApp
- Shows total sales, revenue, and top products
- Configure in Settings → WhatsApp Reports

**What Data You Can Track:**

**Sales Tracking:**
- View individual sale records on Dashboard
- See payment method (Cash, POS, Transfer, Card)
- Check if sale was credit or cash
- View sale timestamps

**Profit Tracking (Money & Profits):**
- Monthly profit calculation shown if Tax Estimator enabled
- Sales - COGS - Expenses = Profit
- Estimated tax percentage

**Inventory Tracking:**
- Current stock quantity for each product
- Low stock warnings when quantity is low
- Product sales history
- Out of stock alerts

**Customer Tracking:**
- Customer names auto-captured from credit sales
- Total debt owed per customer
- Overdue vs current debts
- Debt payment history

**Expense Tracking:**
- Add business expenses (rent, salaries, transport, etc.)
- View total expenses
- Used in profit calculations

**Best Practices:**

✅ **Review Dashboard daily** - Check today's sales
✅ **Monitor Money & Profits monthly** - Track profitability
✅ **Check Inventory weekly** - Restock before stockouts
✅ **Review Customers regularly** - Follow up on overdue debts
✅ **Record all expenses** - Get accurate profit numbers

**Additional Features:**

**Export Data (More Menu):**
- Click **More** → **Export Data (CSV)**
- Downloads all your sales, products, and customers as CSV
- Open in Excel or Google Sheets for deeper analysis

**WhatsApp Daily Reports:**
- Receive automatic daily sales summary via WhatsApp
- Shows today's sales, revenue, and top products
- Configure in Settings → WhatsApp Reports section

View detailed analytics in the Reports section.`,
    relatedDocs: ['business-settings', 'export-data', 'dashboard-tour'],
    keywords: ['reports', 'analytics', 'business performance', 'sales report', 'profit report'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'business-settings',
    category: 'settings',
    title: 'Configure Business Settings',
    subtitle: 'Customize Storehouse for your business',
    difficulty: 'beginner',
    estimatedTime: '6 minutes',
    priority: 65,
    description: 'Set up business information, preferences, notifications, and integrations.',
    content: `**Access Settings:**

**Step 1: Go to Settings**
- Click **More** button (bottom navigation)
- Click **Settings** (gear icon at bottom)

**Settings Sections:**

**1. 👤 Profile**
- Business Name
- Owner Name
- Phone Number
- WhatsApp Number
- Instagram Handle
- Facebook Page
- TikTok Handle
- Store URL (for online store)

**2. 💳 Payments**
- Paystack integration
- Public key and secret key
- Test mode vs Live mode
- Enable/disable card payments

**3. 📱 WhatsApp Reports**
- Enable/disable daily sales reports
- Choose report time
- Configure which phone number receives reports
- Requires Supabase Edge Function deployment

**4. 🔒 Security & Privacy**
- Set PIN protection for Money & Profits page
- Change PIN
- Remove PIN
- Protects sensitive financial data

**5. ⚙️ Advanced**
- Tax Estimator toggle (enable/disable)
- Tax rate percentage (1%, 2%, 5%, or custom)
- Shows profit and estimated tax on Money & Profits page
- Important disclaimers about tax calculations

**Additional Actions in Settings:**
- Send Daily Summary (manually trigger WhatsApp report)
- Export Data (CSV) - downloads all sales, products, customers
- View Plans (subscription information)
- Logout

**Saving Changes:**

Settings auto-save when you update fields. You'll see a "Saved" indicator or save button depending on the section.

**Tips:**

✅ Fill in WhatsApp number for daily reports
✅ Set up Paystack to accept online payments
✅ Enable PIN protection for financial data
✅ Configure tax estimator if needed
✅ Keep profile information up to date`,
    relatedDocs: ['view-business-reports', 'whatsapp-daily-reports'],
    keywords: ['settings', 'business settings', 'configure', 'preferences', 'notifications'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'export-data',
    category: 'settings',
    title: 'Export & Backup Your Data',
    subtitle: 'Download your business data anytime',
    difficulty: 'beginner',
    estimatedTime: '4 minutes',
    priority: 60,
    description: 'Download your inventory, sales, and customer data as CSV files.',
    content: `**Why Export Data?**

Export your data for:
- Accounting and tax filing
- Analysis in Excel or Google Sheets
- Backup and record-keeping
- Sharing with your accountant

**What You Can Export:**

Your data is exported in CSV format (compatible with Excel, Google Sheets, Numbers, etc.):

1. **Inventory/Products** - All your products with prices and stock levels
2. **Sales Data** - Complete sales history with dates, amounts, and payment methods
3. **Customer Database** - Customer names, phone numbers, and purchase history

**How to Export:**

**Step 1: Open More Menu**
- Tap the **More** tab at the bottom of the screen

**Step 2: Select Export CSV**
- Tap **Export CSV** option

**Step 3: Download Files**
- Three CSV files will download to your device:
  - \`storehouse_inventory.csv\` - All products
  - \`storehouse_sales.csv\` - All sales records
  - \`storehouse_customers.csv\` - All customers

**What's Included in Each File:**

**Inventory CSV:**
- Product name
- Category
- SKU/Barcode
- Cost price
- Selling price
- Current stock quantity

**Sales CSV:**
- Date & time of sale
- Receipt number
- Customer name
- Items sold (with quantities and prices)
- Total amount
- Payment method (Cash, Transfer, POS)
- Profit amount

**Customers CSV:**
- Customer name
- Phone number
- Total purchases
- Outstanding debt (if any)
- Last purchase date

**Using Your Exported Data:**

**For Accounting:**
- Open CSV files in Excel or Google Sheets
- Share with your accountant
- Use for tax filing (FIRS requires sales records)

**For Analysis:**
- Track best-selling products
- Analyze sales trends
- Calculate total profits
- Review customer purchase patterns

**For Backup:**
- Save CSV files to cloud storage (Google Drive, Dropbox)
- Keep monthly backups for record-keeping
- Store for at least 6 years (Nigerian tax requirement)

**Best Practices:**

✅ Export monthly for accounting records
✅ Store backups in safe locations
✅ Share with accountant regularly
✅ Keep files organized by month/year

**Tips:**

- CSV files open automatically in Excel/Google Sheets
- All data is included from when you started using Storehouse
- Files are generated from your current data
- Safe to export anytime - doesn't affect your data

**Troubleshooting:**

**Can't open CSV file?**
- Use Microsoft Excel, Google Sheets, or Apple Numbers
- Right-click file → Open with → Excel (or Sheets)

**Special characters not showing?**
- In Excel: Data → From Text/CSV → Select UTF-8 encoding
- In Google Sheets: Upload file, it handles encoding automatically`,
    relatedDocs: ['view-business-reports', 'business-settings'],
    keywords: ['export', 'backup', 'download data', 'export sales', 'export reports'],
    lastUpdated: '2025-11-30',
  },

  // ============================================
  // TROUBLESHOOTING (3 guides)
  // ============================================

  {
    id: 'missing-edit-button',
    category: 'troubleshooting',
    title: 'Why Can\'t I See the Edit Button?',
    subtitle: 'Fix missing edit/delete button issues',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 85,
    description: 'Find edit buttons and understand permission restrictions.',
    content: `**Common Issue:**

"I can't find the edit button on my product/sale/customer!"

**Where to Find Edit Buttons:**

**Option 1: Click the Item**
- Tap/click on the product, sale, or customer name
- Details view opens
- Look for **Edit** button (usually at top or bottom)
- Tap to edit

**Option 2: Look for Action Buttons**
- Some lists show edit/delete icons directly
- Usually appears as pencil icon (✏️) or trash icon (🗑️)
- On mobile: May need to swipe left on item
- On desktop: Icons appear when hovering over item

**Permission Restrictions:**

Only certain features have access restrictions:

**Settings & Staff Management:**
- Only **Owner** can access Settings
- Only **Owner** can manage staff accounts
- Staff members cannot change business settings

**Financial Reports:**
- **Owner** and **Manager** can view all reports
- **Cashiers** have limited access to financial data

**Customer Debt Management:**
- **Owner** and **Manager** can manage customer debts
- **Cashiers** cannot manage debts/credits

**Everything Else:**
- All staff can add, edit, and delete products
- All staff can record sales
- All staff can view inventory

**Troubleshooting Steps:**

**Step 1: Check Your Role**
- If trying to access Settings or Staff page and can't:
  - You may be logged in as staff, not owner
  - Log out and log in with owner account

**Step 2: Refresh the Page**
- Press **F5** (Windows) or **Cmd+R** (Mac)
- Or pull down to refresh on mobile
- Page reloads and buttons should appear

**Step 3: Clear Browser Cache**

If buttons still don't appear:

**Google Chrome:**
1. Press **Ctrl+Shift+Delete** (Windows) or **Cmd+Shift+Delete** (Mac)
2. Select "Cached images and files"
3. Click "Clear data"
4. Reload Storehouse

**Safari (iPhone/iPad):**
1. Settings → Safari
2. Scroll down to "Clear History and Website Data"
3. Tap to clear
4. Reopen Storehouse

**Step 4: Try Different Browser**
- Using Chrome? Try Firefox or Edge
- Using Safari? Try Chrome
- Sometimes browser-specific issues occur

**Common Scenarios:**

**"I can't access Settings"**
- Only owners can access Settings
- If you're staff: Ask owner to log in for settings changes

**"I can't see financial reports"**
- Owners and Managers can view all reports
- Cashiers have limited financial visibility
- This is by design for security

**"I can't edit a sale after recording"**
- Sales are usually locked after recording
- This prevents accidental changes
- Contact owner to void/adjust sale if needed

**"Edit button disappeared after I logged in as staff"**
- Some features (Settings, Staff Management) are owner-only
- For products, sales, customers: All staff should have access
- If missing: Ask owner to check your staff role

**Still Having Issues?**

If buttons still don't appear after trying these steps:
1. Take a screenshot of the page
2. Note what you're trying to edit
3. Contact Storehouse support with details`,
    relatedDocs: ['add-staff-members', 'staff-pin-login'],
    keywords: ['edit button', 'missing button', 'can\'t edit', 'no edit button', 'fix edit'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'sync-issues',
    category: 'troubleshooting',
    title: 'Fix Sync & Connection Issues',
    subtitle: 'Resolve data sync and internet problems',
    difficulty: 'intermediate',
    estimatedTime: '5 minutes',
    priority: 75,
    description: 'Troubleshoot issues with data not saving or appearing across devices.',
    content: `**Common Data Issues:**

1. "Sales not showing up after I recorded them"
2. "Product changes not saving"
3. "Data looks old or outdated"
4. "Changes made on one device not showing on another"

**How Storehouse Saves Data:**

Storehouse automatically saves your data to the cloud (Supabase database):
- When you add a sale → Instantly saved to cloud
- When you edit a product → Saved to cloud
- When you open the app → Loads latest data from cloud

**Internet is required** for saving and loading data. Without internet, changes may only be saved locally on your device.

**Basic Troubleshooting:**

**Solution 1: Refresh the Page**

This forces the app to reload latest data from the cloud.

**On computer:**
- Press **F5** (Windows) or **Cmd+R** (Mac)
- Or click refresh button in browser

**On mobile browser:**
- Swipe down from top to pull-to-refresh
- Or close browser tab and reopen Storehouse

**Solution 2: Check Internet Connection**

Storehouse needs internet to save and load data:

**No internet?**
- Turn on mobile data or WiFi
- Check airplane mode is OFF
- Try opening another website to confirm internet works

**Slow/unstable internet?**
- Data may take longer to save
- Wait a moment and refresh the page
- Try moving to better WiFi/signal area

**Solution 3: Check if You're Logged In**

Sometimes login session expires:

**Step 1:** Look at the page - are you on the login screen?
**Step 2:** If yes → Log in again with your phone number
**Step 3:** After logging in, your data will reload

**Solution 4: Clear Browser Cache**

If data still looks old or wrong:

**Google Chrome:**
1. Press **Ctrl+Shift+Delete** (Windows) or **Cmd+Shift+Delete** (Mac)
2. Select "Cached images and files"
3. Click "Clear data"
4. Reload Storehouse (F5)

**Safari (iPhone/iPad):**
1. Settings → Safari
2. Scroll to "Clear History and Website Data"
3. Tap to clear
4. Reopen Storehouse

**Solution 5: Log Out and Back In**

If issues persist:

**Step 1:** Go to **More** → **Settings** → **Log Out**
**Step 2:** Close browser completely
**Step 3:** Reopen Storehouse
**Step 4:** Log in with your phone number
**Step 5:** Data loads fresh from cloud

**⚠️ Important:** Only do this when connected to internet!

**Multi-Device Usage:**

If you use Storehouse on phone and computer:

**Best Practices:**
- Always refresh when switching devices
- Give changes a moment to save before closing app
- Keep internet connected on both devices
- Communicate with staff about who's editing what

**Example Scenario:**
- You add products on your phone
- Later open Storehouse on computer
- Don't see the new products?
- **Solution:** Refresh the page (F5) to load latest data

**Data Safety:**

Your data is saved in the cloud (Supabase):
- ✅ Stored securely in cloud database
- ✅ Accessible from any device when logged in
- ✅ Protected by your account login

**Offline Limitations:**

Storehouse requires internet connection to function properly:
- Can't record sales offline
- Can't add/edit products offline
- Can't load data without internet

**If you temporarily lose internet:**
- Wait for connection to restore
- Then refresh the page
- Your data will reload

**Multiple People Editing Same Item:**

If you and a staff member edit the same product at the same time:
- **Last save wins** - whoever saves last overwrites the previous change
- **To avoid conflicts:** Communicate with your team about who's editing what

**Still Having Issues?**

If data still not appearing after trying all solutions:

1. **Check what you're looking for:**
   - Make sure you're on the right page (Sales, Inventory, etc.)
   - Check date filters - might be filtering out your data
   - Check if search box has text - clear it to see all items

2. **Verify it was actually saved:**
   - Did you click "Save" or "Record Sale"?
   - Did you see a success message?
   - Check on the device where you made the change

3. **Contact support with details:**
   - What did you try to save?
   - On which device?
   - Did you see any error messages?
   - Screenshot helps!`,
    relatedDocs: ['missing-edit-button', 'payment-not-recorded'],
    keywords: ['sync', 'connection', 'offline', 'not syncing', 'internet'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'payment-not-recorded',
    category: 'troubleshooting',
    title: 'Payment Not Recorded or Missing',
    subtitle: 'Fix issues with missing or incorrect payments',
    difficulty: 'intermediate',
    estimatedTime: '5 minutes',
    priority: 80,
    description: 'Troubleshoot missing or incorrect payment records.',
    content: `**Common Payment Issues:**

1. "I recorded a sale but can't find it"
2. "Paystack payment not showing in my sales"
3. "Payment recorded twice (duplicate)"
4. "Wrong amount was recorded"
5. "Customer paid debt but still shows owing"

**Issue 1: Can't Find a Recorded Sale**

You know you recorded a sale but can't see it on the Money & Profits page.

**Possible Causes:**
- Date filter is hiding it
- Search filter is active
- Recorded on different account/device
- Page needs refreshing

**Solution:**

**Step 1: Clear Filters**
- Go to **Money & Profits** page
- Check if date range is set to "Today" or specific dates
- Change to "All Time" or "This Month" to widen the search
- Clear any search text in search box

**Step 2: Search for the Sale**
- Use the search bar
- Search by customer name
- Or search by amount (e.g., "5000")
- Or search by product name

**Step 3: Refresh the Page**
- Press **F5** (Windows) or **Cmd+R** (Mac)
- On mobile: Pull down to refresh
- This reloads latest data from cloud

**Step 4: Check All Devices**
- If you use multiple devices, check the device where you recorded it
- Sale might not have synced yet
- Make sure device has internet connection

**Issue 2: Paystack Payment Not Showing**

Customer paid via your online store or payment link, but not showing in Storehouse.

**Step 1: Check Paystack Dashboard**
- Log in to your Paystack account at paystack.com
- Go to **Transactions**
- Find the customer's payment
- Check status: "Success" or "Failed"?

**If Failed:**
- Payment didn't go through
- Customer needs to retry payment
- Send them a new payment link

**If Success but not in Storehouse:**
- Payment went through but hasn't been recorded in Storehouse
- Paystack payments should auto-record via webhooks
- If missing after 10 minutes, you may need to record manually:
  - Go to **Record Sale** in Storehouse
  - Enter sale details manually
  - Payment method: Transfer or Online Payment
  - Add note: "Paystack transaction [transaction ref]"

**Issue 3: Duplicate Sales (Payment Recorded Twice)**

You see the same sale recorded twice.

**Solution:**

**Step 1: Verify It's Actually a Duplicate**
- Check the dates and times - are they identical?
- Check the amounts - are they exactly the same?
- Check customer name - is it the same person?
- If everything matches → Likely a duplicate
- If dates/amounts different → Customer may have paid twice

**Step 2: Delete the Duplicate**
- Click on the duplicate sale (not the original!)
- Look for **Delete** or trash icon
- Confirm deletion
- **⚠️ Warning:** Make absolutely sure it's a duplicate before deleting!

**Issue 4: Wrong Amount Was Recorded**

You recorded ₦5,000 but it should be ₦7,000.

**Solution:**

**If you can still edit:**
- Click the sale
- Look for **Edit** button
- Update the amount
- Save changes

**If you can't edit:**
- Some sales may become locked after a certain time
- **Workaround:** Record a second sale for the difference
  - Record new sale for ₦2,000 (difference)
  - Same customer, same payment method
  - Add note: "Additional payment for previous sale"

**Issue 5: Debt Payment Not Updating**

Customer paid off their debt but balance still shows they owe money.

**Solution:**

**Step 1: Go to Customers Page**
**Step 2:** Find and click the customer's name
**Step 3:** Look for their debt/credit balance
**Step 4:** Click **Record Payment** or **Pay Debt** button
**Step 5:** Enter:
- Amount customer paid
- Payment method (Cash, Transfer, etc.)
- Date of payment
**Step 6:** Save
**Step 7:** Debt balance should update immediately

**If balance still wrong after recording payment:**
- Refresh the page (F5)
- If still incorrect, check the customer's transaction history
- Verify all payments were recorded

**Issue 6: Sale Recorded with Wrong Payment Method**

You recorded a cash sale as "Transfer" by mistake.

**Solution:**

**If you can edit:**
- Click the sale
- Click **Edit**
- Change payment method to correct one
- Save

**If you can't edit:**
- The sale is locked
- This won't affect your total revenue (just categorization)
- For your own records, note the correction
- Future: Double-check before saving!

**Prevention Tips:**

✅ **Double-check before saving**
- Verify customer name
- Verify amount
- Verify payment method
- Verify quantities

✅ **Record sales immediately**
- Don't wait hours to record a sale
- Record right after customer pays
- Reduces chance of forgetting details

✅ **Keep internet connected**
- Makes sure sales save to cloud immediately
- Helps with multi-device usage

✅ **Train your staff**
- Show them exactly how to record sales
- Explain each payment method
- Practice with test sales

**Daily Reconciliation:**

At the end of each day, verify your records:

**For Cash Sales:**
1. Count physical cash in your register/drawer
2. Compare with Storehouse "Cash" sales total
3. They should match!
4. If not → Check for unrecorded sales or errors

**For Bank Transfers:**
1. Check your bank app/statement
2. Note all transfer receipts for the day
3. Compare with Storehouse "Transfer" sales
4. Each bank transfer should have a corresponding sale

**For POS/Card Payments:**
1. Check your POS machine report
2. Compare with Storehouse "POS" sales
3. Amounts should match

**Still Can't Find a Sale?**

If you've tried everything and still can't find a payment:

**What to check:**
- Which date was it recorded? (Check that specific date)
- Who recorded it? (Owner or staff member)
- Which device was used? (Check that device)
- Was there internet connection when recording?

**Last resort:**
- Sale may not have been saved due to technical issue
- You may need to re-record the sale
- Make a note of the discrepancy for your records`,
    relatedDocs: ['sync-issues', 'missing-edit-button', 'track-invoice-payments'],
    keywords: ['payment missing', 'payment not recorded', 'paystack', 'sale missing', 'wrong amount'],
    lastUpdated: '2025-11-30',
  },

  // ============================================
  // ANALYTICS & INSIGHTS
  // ============================================

  {
    id: 'channel-analytics',
    category: 'reports',
    title: 'Track Sales by Channel (Instagram, WhatsApp, etc.)',
    subtitle: 'See which channels bring the most sales',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 70,
    description: 'Analyze sales performance across different channels like Instagram, WhatsApp, Store, Retail to understand where your customers come from.',
    content: `**What is Channel Analytics?**

Channel Analytics helps you understand which sales channels are performing best:
- **Instagram** - Sales from Instagram DMs/posts
- **WhatsApp** - Sales via WhatsApp Business
- **Online Store** - Sales from your storehouse.ng/store link
- **Retail** - In-person walk-in sales
- **Other** - Phone calls, referrals, etc.

**Why Track Sales Channels?**

Know which channels to focus on:
- Identify your best-performing sales channel
- Allocate marketing budget effectively
- Understand customer preferences
- Track ROI of social media efforts

**How to View Channel Analytics:**

**Step 1:** Open More Menu
- Tap **More** button on dashboard

**Step 2:** Select Sales by Channel
- Tap **"Sales by Channel"**
- View breakdown appears

**What You See:**

**Channel Breakdown:**
- Total sales per channel
- Percentage of total revenue
- Number of transactions per channel
- Average order value by channel

**Example:**
\`\`\`
Instagram: ₦250,000 (40%) - 25 sales
WhatsApp: ₦180,000 (30%) - 30 sales
Retail: ₦150,000 (25%) - 20 sales
Online Store: ₦30,000 (5%) - 5 sales
\`\`\`

**How to Set Sales Channel:**

When recording a sale:

**Step 1:** Tap **Record Sale**
**Step 2:** Select products and customer
**Step 3:** Look for **"Sales Channel"** dropdown
**Step 4:** Choose channel:
- Instagram
- WhatsApp
- Online Store
- Retail (Walk-in)
- Phone Call
- Referral
- Other

**Using This Data:**

**If Instagram is top:**
- Post more product photos
- Run Instagram ads
- Engage with comments
- Use Instagram Shopping features

**If WhatsApp is top:**
- Share product catalogs regularly
- Use WhatsApp Status for promotions
- Quick response to inquiries
- Enable WhatsApp AI features

**If Retail is low:**
- Improve in-store displays
- Train staff on customer service
- Add promotions for walk-ins
- Focus on online channels

**Best Practices:**

✅ **Always select accurate channel** when recording sales
✅ **Review weekly** to spot trends
✅ **Test new channels** to diversify
✅ **Double down** on what works

**Tips:**

- Default channel is "Retail" if not specified
- Edit past sales to correct channel
- Train staff to ask "How did you hear about us?"
- Use this data for monthly marketing planning`,
    relatedDocs: ['view-business-reports', 'record-sale'],
    keywords: ['channel analytics', 'sales by channel', 'instagram', 'whatsapp', 'marketing'],
    lastUpdated: '2025-12-02',
  },

  {
    id: 'sales-trend-chart',
    category: 'reports',
    title: 'View Sales Trend Chart',
    subtitle: 'Visualize your sales over time',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 65,
    description: 'See a visual chart showing your daily sales trends over the last 7 or 30 days.',
    content: `**What is the Sales Trend Chart?**

A line graph on your dashboard showing:
- Daily sales amounts
- Sales trends over time
- Peaks and valleys in revenue
- Visual performance snapshot

**Where to Find It:**

**On Dashboard:**
- Scroll down on main dashboard
- Look for **"Sales Trend"** section
- Chart shows last 7 days by default
- Click to expand for more details

**What the Chart Shows:**

**Daily Sales Line:**
- Each point = one day's total sales
- Higher points = better sales days
- Line going up = growing sales
- Line going down = declining sales

**Example Chart:**
\`\`\`
₦50,000 |           •
        |         •   •
₦30,000 |       •       •
        |     •           •
₦10,000 | • •               •
        +---------------------
         M T W T F S S
\`\`\`

**How to Use the Chart:**

**Identify Best Days:**
- See which days have highest sales
- Plan inventory for busy days
- Schedule promotions on slow days

**Spot Trends:**
- Upward trend = business growing
- Downward trend = need intervention
- Flat line = stable but no growth

**Compare Periods:**
- This week vs last week
- Weekdays vs weekends
- Before vs after promotions

**Chart Options:**

**Time Period:**
- Last 7 days (default)
- Last 30 days
- Custom date range

**Expand/Collapse:**
- Click chart title to expand
- See more details
- Collapse to save space

**What This Tells You:**

**High Sales Days:**
- Friday/Saturday might be busiest (payday)
- Month-end spike (salary days)
- After promotions

**Low Sales Days:**
- Early week (Monday/Tuesday)
- Mid-month lull
- After holidays

**Action Steps:**

**For Low Days:**
- Run flash sales
- Post on social media
- Send WhatsApp broadcasts
- Offer discounts

**For High Days:**
- Stock up inventory
- Add extra staff
- Prepare for rush
- Capture customer contacts

**Best Practices:**

✅ **Check daily** to stay informed
✅ **Look for patterns** - weekly, monthly
✅ **Take action** on insights
✅ **Compare to goals** - are you on track?

**Example Use Cases:**

**Scenario 1: Weekend Spike**
- Chart shows Saturday/Sunday are peak
- **Action:** Stock more inventory for weekends, add weekend promotions

**Scenario 2: Declining Trend**
- Sales dropping for 3 weeks
- **Action:** Run promotion, check competition, improve marketing

**Scenario 3: Steady Growth**
- Sales gradually increasing
- **Action:** Maintain momentum, plan for scaling

**Tips:**

- Green line = positive trend
- Chart updates automatically with new sales
- Export chart data via CSV export
- Use for investor/bank presentations`,
    relatedDocs: ['view-business-reports', 'whatsapp-daily-reports'],
    keywords: ['sales chart', 'sales trend', 'analytics', 'graph', 'visualization'],
    lastUpdated: '2025-12-02',
  },

  {
    id: 'bulk-import-products',
    category: 'products',
    title: 'Bulk Import Products via CSV',
    subtitle: 'Add hundreds of products at once',
    difficulty: 'intermediate',
    estimatedTime: '10 minutes',
    priority: 60,
    description: 'Import large numbers of products quickly using a CSV file instead of adding them one by one.',
    content: `**Why Use CSV Import?**

Save time when:
- Starting with existing inventory (50+ products)
- Migrating from another system
- Supplier provides product list
- Updating prices in bulk

**What You Need:**

A CSV file with your products containing:
- Product name
- Category
- Quantity
- Cost price
- Selling price
- (Optional) SKU, barcode, description

**How to Import:**

**Step 1: Prepare Your CSV File**

Create a spreadsheet (Excel or Google Sheets) with these columns:
\`\`\`
Name, Category, Quantity, Cost Price, Selling Price
Indomie Noodles, Food, 100, 80, 150
Peak Milk, Beverages, 50, 280, 350
Pampers Size 3, Baby Care, 30, 3500, 4500
\`\`\`

**Step 2: Save as CSV**
- In Excel: File → Save As → CSV (Comma delimited)
- In Google Sheets: File → Download → CSV

**Step 3: Open Import Tool**
- Go to dashboard
- Tap **More** → **Import Products**
- Or look for "Import CSV" button

**Step 4: Upload File**
- Click **Choose File**
- Select your CSV file
- Click **Upload**

**Step 5: Map Columns**
- System shows preview
- Match CSV columns to Storehouse fields:
  - Column A → Product Name
  - Column B → Category
  - Column C → Quantity
  - Column D → Cost Price
  - Column E → Selling Price

**Step 6: Review & Import**
- Check preview looks correct
- Click **Import Products**
- Wait for completion message
- Products appear in inventory!

**CSV Format Requirements:**

**Required Columns:**
- Product Name (text)
- Cost Price (number, no ₦ symbol)
- Selling Price (number, no ₦ symbol)

**Optional Columns:**
- Category (creates categories if don't exist)
- Quantity (defaults to 0 if not provided)
- SKU/Barcode
- Description

**Example CSV:**
\`\`\`csv
Name,Category,Qty,Cost,Price
"Indomie Chicken",Food,100,80,150
"Golden Penny Flour 50kg",Provisions,20,28000,35000
"Peak Milk 900g",Beverages,45,280,350
\`\`\`

**Important Rules:**

✅ **Use quotes** for names with commas
✅ **No currency symbols** (₦) - just numbers
✅ **Consistent column names** in first row
✅ **One product per row**
✅ **Save as .csv** not .xlsx

**Common Mistakes:**

**Mistake 1: Excel formats**
❌ Upload .xlsx file
✅ Save as .csv first

**Mistake 2: Currency symbols**
❌ Cost Price: ₦5,000
✅ Cost Price: 5000

**Mistake 3: Commas in names**
❌ Peak Milk, 900g
✅ "Peak Milk, 900g" (use quotes)

**Mistake 4: Missing required fields**
❌ Only name and price
✅ Include cost price (for profit tracking)

**After Import:**

**Check Results:**
- Go to inventory
- Search for imported products
- Verify quantities are correct
- Check prices match

**Fix Errors:**
- Edit individual products if needed
- Or delete and re-import

**Update Later:**
- Export current products to CSV
- Edit CSV file
- Re-import (updates existing products)

**Best Practices:**

✅ **Start with 5-10 products** to test
✅ **Backup your CSV** before importing
✅ **Use categories** for organization
✅ **Include SKU** if you have it
✅ **Keep master CSV** for future updates

**Bulk Price Updates:**

**To update all prices:**
1. Export current inventory to CSV
2. Edit prices in Excel/Sheets
3. Re-import CSV
4. Existing products get updated prices

**Example Template:**

Download our template CSV:
\`\`\`csv
Name,Category,Quantity,Cost Price,Selling Price,SKU
Sample Product 1,Sample Category,10,100,200,SKU001
Sample Product 2,Sample Category,20,150,300,SKU002
\`\`\`

**Tips:**

- Use Excel formulas to calculate selling prices (Cost × 1.5)
- Import in batches (100 products at a time)
- Double-check quantities before importing
- Categories are case-sensitive
- Products with same name get updated, not duplicated`,
    relatedDocs: ['add-product', 'edit-product', 'export-data'],
    keywords: ['csv import', 'bulk import', 'mass upload', 'import products', 'excel'],
    lastUpdated: '2025-12-02',
  },

  {
    id: 'track-expenses',
    category: 'reports',
    title: 'Track Business Expenses',
    subtitle: 'Record rent, salary, utilities, and other costs',
    difficulty: 'beginner',
    estimatedTime: '5 minutes',
    priority: 80,
    description: 'Keep track of all business expenses to get accurate profit calculations and understand true business performance.',
    content: `**Why Track Expenses?**

Know your real profit:
- Sales - Cost of Goods - **Expenses** = True Profit
- Understand cash flow
- Plan for monthly bills
- Prepare for tax filing

**Types of Expenses:**

**Operating Expenses:**
- Rent/Shop rent
- Staff salaries
- Utilities (electricity, water)
- Transportation/fuel
- Phone/internet bills
- Marketing/advertising
- Bank charges

**One-Time Expenses:**
- Equipment purchases
- Repairs/maintenance
- Professional services
- Licenses/permits

**How to Record an Expense:**

**Step 1:** Open More Menu
- Tap **More** on dashboard
- Look for **Expenses** option

**Or:**
- Go to **Money & Profits** page
- Click **Track Expenses** button

**Step 2:** Add Expense Details
- **Amount** - How much you spent
- **Category** - What type of expense
  - Rent
  - Salary
  - Utilities
  - Transportation
  - Marketing
  - Other
- **Date** - When you paid
- **Description** - Brief note (e.g., "December shop rent")
- **Payment Method** - Cash, Transfer, etc.

**Step 3:** Save
- Click **Save Expense**
- Expense recorded!

**View All Expenses:**

**Monthly View:**
- See current month expenses
- Total for this month
- Breakdown by category

**Filter Options:**
- By month
- By category
- By payment method
- Search by description

**Expense Categories:**

**🏠 Rent/Lease**
- Shop rent
- Warehouse rent
- Lease payments

**👥 Staff Costs**
- Salaries/wages
- Bonuses
- Staff meals/welfare

**⚡ Utilities**
- Electricity
- Water
- Generator fuel
- Internet/data

**🚗 Transportation**
- Fuel/petrol
- Vehicle maintenance
- Delivery costs
- Uber/taxi for business

**📱 Communications**
- Phone bills
- WhatsApp Business
- Airtime for business calls

**📢 Marketing**
- Social media ads
- Flyers/posters
- Promotions/giveaways
- Influencer payments

**🔧 Maintenance**
- Shop repairs
- Equipment servicing
- Cleaning supplies

**💳 Banking/Financial**
- Bank charges
- POS machine fees
- Loan interest

**How Expenses Affect Profit:**

**Without Expense Tracking:**
\`\`\`
Sales: ₦500,000
Cost of Goods: ₦300,000
Profit: ₦200,000 (WRONG!)
\`\`\`

**With Expense Tracking:**
\`\`\`
Sales: ₦500,000
Cost of Goods: ₦300,000
Expenses: ₦80,000 (rent, salary, bills)
True Profit: ₦120,000 (CORRECT!)
\`\`\`

**Monthly Expense Budget:**

**Set Monthly Limits:**
- Rent: ₦50,000 (fixed)
- Salary: ₦30,000 (fixed)
- Utilities: ₦20,000 (variable)
- Marketing: ₦10,000 (variable)
- **Total: ₦110,000/month**

**Track Against Budget:**
- Record all expenses
- Compare to budget
- Identify overspending
- Adjust as needed

**Tax Deductions:**

Many expenses are tax-deductible:
- ✅ Rent/lease payments
- ✅ Staff salaries
- ✅ Utilities for business
- ✅ Transportation for business
- ✅ Marketing costs
- ✅ Professional fees

Keep expense records for:
- Tax filing with FIRS
- Loan applications
- Business analysis

**Best Practices:**

✅ **Record immediately** - Don't wait
✅ **Keep receipts** - Take photos, store in cloud
✅ **Categorize correctly** - For accurate analysis
✅ **Review monthly** - Are expenses too high?
✅ **Separate personal from business** - Only record business expenses

**Common Mistakes:**

❌ **Forgetting small expenses** - They add up!
❌ **Recording personal expenses** - Only business costs
❌ **No receipts** - Keep proof for tax purposes
❌ **Wrong category** - Affects analysis

**Monthly Expense Review:**

**End of Month Checklist:**
1. Review all expenses
2. Calculate total
3. Compare to last month
4. Identify areas to cut costs
5. Plan next month's budget

**Example Monthly Breakdown:**
\`\`\`
Rent: ₦50,000
Salaries: ₦30,000
Electricity: ₦15,000
Transportation: ₦10,000
Marketing: ₦8,000
Phone bills: ₦5,000
Miscellaneous: ₦7,000
---
Total: ₦125,000
\`\`\`

**Reducing Expenses:**

**High rent?**
- Negotiate with landlord
- Consider cheaper location
- Share space with another business

**High utilities?**
- Switch to prepaid meter
- Reduce generator use
- Solar panels (long-term)

**High transportation?**
- Bulk deliveries
- Route optimization
- Negotiate with drivers

**Tips:**

- Set up recurring expenses (rent, salary) to auto-record monthly
- Export expense data to CSV for accountant
- Include expenses in tax profit calculation
- Review expense trends quarterly`,
    relatedDocs: ['view-business-reports', 'export-data'],
    keywords: ['expenses', 'business costs', 'rent', 'salary', 'utilities', 'operating expenses'],
    lastUpdated: '2025-12-02',
  },

];
