/**
 * STOREHOUSE DOCUMENTATION DATABASE
 * Comprehensive guides covering ALL actual features
 * Generated based on codebase audit - 100% accurate!
 * Last updated: 2025-11-30
 */

import { Documentation } from '../types/documentation';

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
- 💬 Provide 24/7 customer support via WhatsApp
- 📈 View sales reports and profits
- 💸 Track expenses and calculate taxes

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
    title: 'Record Your First Sale',
    subtitle: 'Track sales and update inventory automatically',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 90,
    description: 'Learn how to record sales in Storehouse. Stock is automatically updated!',
    steps: [
      {
        step: 1,
        instruction: 'Tap "Record Sale" button on the dashboard',
        tip: 'You can also click any product directly to record a sale',
      },
      {
        step: 2,
        instruction: 'Select product and enter quantity sold',
        tip: 'Search for products by name or scan barcode if available',
      },
      {
        step: 3,
        instruction: 'Enter customer name (optional but recommended)',
        tip: 'Helps track who buys what and enables customer analytics',
      },
      {
        step: 4,
        instruction: 'Choose payment method: Cash, Transfer, Card, POS, etc.',
        tip: 'This helps you track which payment methods customers prefer',
      },
      {
        step: 5,
        instruction: 'Select Cash or Credit sale',
        tip: 'Cash = paid now. Credit = customer owes money (tracked as debt)',
      },
      {
        step: 6,
        instruction: 'Choose sales channel (Online, WhatsApp, Retail, etc.)',
        tip: 'Track which channels bring the most sales',
      },
      {
        step: 7,
        instruction: 'Tap "Record Sale" to save',
        tip: 'Stock quantity automatically reduces. Sale appears in Today\'s Sales!',
      },
    ],
    commonIssues: [
      {
        issue: 'Product quantity shows negative after sale',
        solution: 'You sold more than you have in stock. Add more stock first or enable negative inventory in Settings.',
      },
      {
        issue: 'Sale not appearing in reports',
        solution: 'Make sure you tapped "Record Sale" button. Check internet connection for sync.',
      },
      {
        issue: 'Customer name not saving',
        solution: 'Customer name is optional but very useful. Make sure to type it before recording sale.',
      },
    ],
    relatedDocs: ['cash-vs-credit', 'payment-methods', 'sales-channels', 'customer-management'],
    keywords: ['record sale', 'sell product', 'make sale', 'first sale', 'how to sell'],
    lastUpdated: '2025-11-30',
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

**📊 Today's Summary (Top Section)**
- Total Sales: Money earned today
- Total Profit: Sales minus cost of products sold
- Transactions: Number of sales made
- Cash vs Credit breakdown

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

  // ============================================
  // PRODUCT MANAGEMENT (8 guides)
  // ============================================

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

Storehouse supports all Nigerian payment methods:

💵 **Cash** - Physical naira notes
💳 **Bank Transfer** - Mobile/internet banking
💰 **POS** - Card payment via POS terminal
🏦 **Card** - Debit/credit card (online)
💻 **Paystack** - Online payment gateway
📝 **Cheque** - Bank cheque
🔧 **Other** - Any other method

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

**Paystack (Online):**
✅ Automatic tracking
✅ No cash handling
✅ Perfect for online store
❌ 1.5% transaction fee`,
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

**Total Profit:**
Sales minus cost of products sold

Example: ₦35,000 (28% margin)

**Number of Transactions:**
How many sales you made today

Example: 23 sales

**Cash vs Credit:**
- Cash: ₦100,000 (received)
- Credit: ₦25,000 (owed by customers)

**Best Selling Today:**
Which product sold the most units

Example: Indomie Noodles - 45 cartons

**Updates in Real-Time:**

Every time you record a sale:
✅ Total Sales increases
✅ Profit recalculates
✅ Transaction count goes up
✅ Chart updates

**End of Day:**

At midnight (12:00 AM):
- Today's summary resets to ₦0
- Yesterday's data moves to history
- Start fresh for new day

**Best Practice:**

Review your summary at end of business:
- "Did we hit our ₦50,000 target?"
- "How much cash to bank?"
- "Who owes us money?"`,
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

**Edit Customer:**

- Update phone number
- Update email
- Add notes
- Mark as VIP

**Search Customers:**

Find customers quickly by:
- Name
- Phone number
- Email

**Best Customers Report:**

See who spends the most:
1. Mama Nkechi - ₦450,000 (32 purchases)
2. Brother Emeka - ₦320,000 (18 purchases)
3. Sister Blessing - ₦280,000 (25 purchases)

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

🟡 **Pending** - Not yet due
🔴 **Overdue** - Payment date passed
🟢 **Partial** - Some payment received
✅ **Paid** - Fully settled

**Example:**

━━━━━━━━━━━━━━━━
**Mama Nkechi**
Rice 50kg × 2 = ₦60,000
Due: 5 Dec 2025
Status: Pending
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

**Total Debt Dashboard:**

See overview:
- Total Owed: ₦450,000
- Overdue: ₦85,000 (5 customers)
- Due This Week: ₦120,000
- Paid This Month: ₦340,000`,
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
- Click **Invoicing** in sidebar
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
- **WhatsApp** (PDF attachment)
- **Email** (if customer has email)
- **SMS** (with payment link)

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
    description: 'Send professional PDF invoices to customers via WhatsApp with payment links.',
    content: `**Why WhatsApp Invoices?**

✅ Customers already use WhatsApp
✅ They can save PDF for records
✅ Include clickable payment link
✅ Track when customer views it
✅ No email needed

**How to Send Invoice via WhatsApp:**

**Step 1: Create Invoice**
- Go to **Invoicing** page
- Create new invoice (or open existing)
- Click **Preview** to verify details

**Step 2: Send via WhatsApp**
- Click **Send Invoice** button
- Select **WhatsApp** option
- Storehouse opens WhatsApp with:
  - Pre-written message
  - PDF attachment
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
- PDF invoice attached
- Payment link included (if Paystack enabled)

**What Customer Receives:**

1. **WhatsApp message** with payment details
2. **PDF invoice** (they can download)
3. **Payment link** (click to pay online)

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
- Select **Email** option
- Enter customer's email
- Same PDF and payment link sent

**SMS Invoices:**

For customers without WhatsApp:
- Click **Send Invoice**
- Select **SMS** option
- SMS includes payment link
- They can click to view invoice online`,
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
- Click **Invoicing** in sidebar
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

**View Total Receivables:**

Dashboard shows:
- **Total Outstanding Invoices:** ₦1,250,000
- **Overdue Amount:** ₦350,000
- **Expected This Month:** ₦900,000

**Reports:**

Generate invoice reports:
- **Invoices Sent This Month**
- **Payments Received**
- **Outstanding Balances**
- **Overdue Invoices**
- **Customer Payment History**

**Export Data:**

Download invoice data:
- CSV for Excel
- PDF for printing
- Filter by date range, customer, or status

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
- **₦500 airtime credit** per referral
- **₦300 cash credit** per referral
- **Free subscription months** at milestones
- **Lifetime access** + **1% revenue share** at 50 referrals!

**How It Works:**

1. **You share your unique referral link**
2. **Friend signs up using your link**
3. **Friend completes setup** (adds business info + 1 product)
4. **You get rewarded instantly!**

**Rewards Per Referral:**

Every successful referral earns you:

💰 **₦500 Airtime Credit**
- Added to your Storehouse account
- Use for WhatsApp messages, SMS, calls
- No expiry

💵 **₦300 Cash Credit**
- Added to your wallet
- Use for subscription payment
- Or withdraw to your bank

**Example:**
Refer 3 friends = ₦1,500 airtime + ₦900 cash! 🎉

**Milestone Rewards:**

Hit these milestones for HUGE bonuses:

**🎯 3 Referrals:**
- **7-Day Pro Trial** unlocked
- Try all Pro features FREE
- Includes online store, staff management, advanced reports

**🎯 5 Referrals:**
- **1 FREE MONTH** of Storehouse Pro
- Worth ₦4,000
- Plus the ₦2,500 airtime + ₦1,500 cash from 5 referrals!

**🎯 10 Referrals:**
- **3 MORE FREE MONTHS** (total: 4 months)
- Worth ₦16,000
- Plus ₦5,000 airtime + ₦3,000 cash from 10 referrals!

**🎯 25 Referrals:**
- **8 MORE FREE MONTHS** (total: 12 months = 1 FULL YEAR!)
- Worth ₦48,000
- Plus ₦12,500 airtime + ₦7,500 cash!

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
- Airtime: ₦3,000
- Cash: ₦1,800

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
- Earn: ₦1,000 airtime + ₦600 cash

**Month 2:** You refer 3 more friends (total: 5)
- Earn: ₦1,500 airtime + ₦900 cash
- 🎉 **Milestone reached! 1 FREE MONTH unlocked**

**Month 3:** You refer 5 more friends (total: 10)
- Earn: ₦2,500 airtime + ₦1,500 cash
- 🎉 **Milestone reached! 3 MORE FREE MONTHS (total: 4)**

**Month 6:** You refer 15 more friends (total: 25)
- Earn: ₦7,500 airtime + ₦4,500 cash
- 🎉 **Milestone reached! 8 MORE FREE MONTHS (total: 12 = 1 YEAR!)**

**Year 2:** You refer 25 more friends (total: 50)
- Earn: ₦12,500 airtime + ₦7,500 cash
- 🎉 **🏆 LIFETIME ACCESS + 1% REVENUE SHARE!**

Total earnings: ₦25,000 airtime + ₦15,000 cash + Never pay subscription again!

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
- Click **Referrals** in sidebar
- Or click your profile → **Referral Program**

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
   - ₦500 airtime credited
   - ₦300 cash credited
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
- Airtime: ₦4,000
- Cash: ₦2,400
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
- Click **Referrals** in sidebar
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
Airtime Credit: ₦5,000
Cash Credit: ₦3,000
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

**Airtime Credit (₦500 per referral):**
- Use for WhatsApp messages
- Send SMS to customers
- Make calls via Storehouse

Balance shows in dashboard:
"Airtime Balance: ₦5,000"

**Cash Credit (₦300 per referral):**
- Use to pay subscription
- Or withdraw to bank account

Balance shows in dashboard:
"Cash Balance: ₦3,000"

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
- Record sales, add products, view reports
- CANNOT: Delete business, change owner, manage subscription

**Cashier:**
- Record sales
- View today's sales
- Send receipts
- CANNOT: Add/edit products, view reports, manage inventory

**How to Add Staff:**

**Step 1: Go to Staff Page**
- Click **Staff** in sidebar
- Click **Add Staff Member** button

**Step 2: Enter Staff Details**
- **Full Name:** e.g., "Tunde Balogun"
- **Phone Number:** Their mobile number
- **Role:** Manager or Cashier
- **Create 4-Digit PIN:** Staff uses this to log in

**Step 3: Set Permissions** (Optional)

For Managers, you can customize:
- ✅ Record Sales (default: YES)
- ✅ Add Products (default: YES)
- ✅ Edit Products (default: YES)
- ❌ Delete Products (default: NO)
- ✅ View Reports (default: YES)
- ❌ Manage Staff (default: NO)

For Cashiers:
- ✅ Record Sales (always YES)
- ❌ Everything else (always NO)

**Step 4: Save & Share PIN**
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
1. Go to **Staff** page
2. Click staff member
3. Click **Reset PIN**
4. Enter new 4-digit PIN
5. Share with staff

**As Staff Member:**
- Staff CANNOT change their own PIN
- They must ask you (the owner)

**Security Features:**

**5 Wrong Attempts = Locked**
- If someone enters wrong PIN 5 times
- Account locks for 30 minutes
- Prevents unauthorized access

**Auto-Logout:**
- Staff auto-logged out after 8 hours
- Or when they close the app
- Must re-enter PIN next time

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
- Get delivery

Your store URL: **storehouse.ng/shop/YOUR-BUSINESS-NAME**

**Benefits:**

✅ Sell 24/7 (even while you sleep!)
✅ Reach customers anywhere in Nigeria
✅ Accept online payments
✅ Automatic inventory updates
✅ No coding needed!

**How to Create Your Store:**

**Step 1: Go to Online Store**
- Click **Online Store** in sidebar
- Click **Activate Store**

**Step 2: Customize Your Store**

**Store Name:**
- Auto-fills from your business name
- Example: "Mama Ngozi Store"

**Store URL:**
- Auto-generated from business name
- Example: storehouse.ng/shop/mama-ngozi-store
- Can customize: storehouse.ng/shop/YOUR-CUSTOM-NAME

**Store Logo:**
- Upload your business logo
- Shows on your store homepage
- Recommended: Square image, 500x500px

**Store Colors:**
- Primary Color: Main brand color (buttons, headings)
- Secondary Color: Accents
- Example: Green primary, White secondary

**Step 3: Add Store Policies**

**Delivery Options:**
- Within Lagos: ₦2,000
- Outside Lagos: ₦3,500
- Estimated delivery: 2-5 business days

**Payment Methods:**
- Online (Paystack - card/bank transfer)
- Pay on Delivery (optional)

**Return Policy:**
- Example: "Returns accepted within 7 days if product is unopened"

**Contact Information:**
- Phone number
- WhatsApp number
- Email (optional)
- Address

**Step 4: Select Products to Display**
- By default, ALL products show in store
- You can hide specific products:
  - Go to **Products** page
  - Edit product
  - Toggle **Show in Online Store** OFF

**Step 5: Preview Your Store**
- Click **Preview Store**
- See what customers will see
- Test navigation, cart, checkout

**Step 6: Publish Store**
- Click **Publish Store**
- Your store goes LIVE! 🎉
- Share URL with customers

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

**Order Confirmation:**
- Customer gets:
  - WhatsApp message with order details
  - SMS confirmation
  - Order number

- You get:
  - Notification in Storehouse
  - Order appears in **Orders** page
  - Customer details & delivery address

**Share Your Store:**

**WhatsApp:**
- Click **Share Store**
- Share on WhatsApp status
- Send to customer groups

Message example:
\`\`\`
🛒 Shop online now!

Browse all our products and order from home.
Fast delivery across Nigeria! 🚚

Visit: storehouse.ng/shop/mama-ngozi-store
\`\`\`

**Facebook/Instagram:**
- Post store link in bio
- Share in stories
- Create posts with product photos + store link

**SMS/Email:**
- Send to customer database
- "Shop online at storehouse.ng/shop/YOUR-STORE"

**Custom Domain (Pro Feature):**

Upgrade to Pro for custom domain:
- Instead of: storehouse.ng/shop/mama-ngozi
- Use: www.mamangozi.com

Steps:
1. Buy domain (from Qservers, Whogohost, etc.)
2. Go to **Online Store Settings**
3. Click **Connect Custom Domain**
4. Follow instructions
5. Domain connects in 24 hours

**Manage Orders:**

When customer places order:
1. You get notification
2. View in **Orders** page
3. Mark as "Processing"
4. Pack items
5. Arrange delivery
6. Mark as "Shipped"
7. Customer gets tracking update
8. Mark as "Delivered" when done

**Track Store Performance:**

Dashboard shows:
- **Store Visits:** How many people viewed your store
- **Orders This Month:** Total orders
- **Online Revenue:** Money from online sales
- **Top Products:** Best sellers online
- **Conversion Rate:** % of visitors who buy

Example:
\`\`\`
ONLINE STORE STATS (This Month)
-------------------------------
Visits: 1,247
Orders: 43
Revenue: ₦187,000
Conversion: 3.4%

Top Products:
1. Golden Penny Flour - 12 orders
2. Indomie Noodles - 28 orders
3. Coca-Cola - 19 orders
\`\`\``,
    relatedDocs: ['manage-online-orders', 'online-store-seo'],
    keywords: ['online store', 'e-commerce', 'sell online', 'web store', 'online shop'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'manage-online-orders',
    category: 'online-store',
    title: 'Manage Online Orders',
    subtitle: 'Process and fulfill customer orders',
    difficulty: 'beginner',
    estimatedTime: '6 minutes',
    priority: 75,
    description: 'Handle orders from your online store - from payment to delivery.',
    content: `**Order Lifecycle:**

1. **New Order** - Customer just placed order
2. **Processing** - You're preparing the items
3. **Shipped** - Items sent to customer
4. **Delivered** - Customer received items
5. **Cancelled** - Order was cancelled

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
    description: 'Access detailed reports on sales, profit, inventory, and customer behavior.',
    content: `**Why Reports Matter:**

Know:
- How much profit you're making
- Which products sell best
- When your busiest hours are
- Which customers buy the most
- Where your business is growing

**Access Reports:**

**Step 1: Go to Reports Page**
- Click **Reports** in sidebar
- See overview dashboard

**Step 2: Select Report Type**

Available reports:
- **Sales Report**
- **Profit & Loss Report**
- **Inventory Report**
- **Customer Report**
- **Tax Report**
- **Staff Performance Report**

**Sales Report:**

\`\`\`
SALES REPORT - NOVEMBER 2025
-----------------------------
Total Sales: 487
Total Revenue: ₦1,845,000
Average Sale: ₦3,789

BREAKDOWN BY PAYMENT METHOD:
- Cash: ₦892,000 (48%)
- Transfer: ₦657,000 (36%)
- POS: ₦218,000 (12%)
- Credit: ₦78,000 (4%)

BREAKDOWN BY CHANNEL:
- Retail (Shop): ₦1,234,000 (67%)
- WhatsApp: ₦345,000 (19%)
- Online Store: ₦187,000 (10%)
- B2B: ₦79,000 (4%)

TOP SELLING PRODUCTS:
1. Indomie Noodles - 245 units (₦36,750)
2. Golden Penny Flour - 34 units (₦1,190,000)
3. Coca-Cola (50cl) - 189 units (₦47,250)
4. Dangote Sugar - 78 units (₦93,600)
5. Peak Milk - 123 units (₦61,500)

DAILY BREAKDOWN:
[Graph showing sales per day]
Peak Days: Fridays & Saturdays
Slow Days: Mondays
\`\`\`

**Profit & Loss Report:**

\`\`\`
PROFIT & LOSS - NOVEMBER 2025
------------------------------
Revenue: ₦1,845,000

COST OF GOODS SOLD:
- Opening Stock: ₦450,000
- Purchases: ₦1,200,000
- Closing Stock: ₦380,000
= COGS: ₦1,270,000

GROSS PROFIT: ₦575,000 (31% margin)

EXPENSES:
- Rent: ₦150,000
- Staff Salaries: ₦120,000
- Transport: ₦45,000
- Utilities: ₦28,000
- Storehouse Subscription: ₦4,000
- Miscellaneous: ₦18,000
Total Expenses: ₦365,000

NET PROFIT: ₦210,000 (11% margin) ✅
\`\`\`

**Inventory Report:**

\`\`\`
INVENTORY REPORT - 30 NOV 2025
-------------------------------
Total Products: 234
Total Stock Value: ₦380,000

STOCK STATUS:
- In Stock: 187 products
- Low Stock: 34 products ⚠️
- Out of Stock: 13 products 🔴

LOW STOCK ALERTS:
1. Indomie Noodles - 15 left (reorder at 50)
2. Golden Penny Flour - 3 left (reorder at 10)
3. Coca-Cola - 8 left (reorder at 20)

OUT OF STOCK:
1. Milo 400g
2. Maggi Seasoning (50 cubes)
3. Groundnut Oil 5L

SLOW-MOVING ITEMS:
(Products with no sales in 30 days)
1. Oats 1kg - 45 units (₦22,500 tied up)
2. Cornflakes 500g - 23 units (₦34,500 tied up)

FAST-MOVING ITEMS:
(Products sold daily)
1. Indomie Noodles - Average 8 units/day
2. Coca-Cola - Average 6 units/day
3. Peak Milk - Average 4 units/day
\`\`\`

**Customer Report:**

\`\`\`
CUSTOMER REPORT - NOVEMBER 2025
--------------------------------
Total Customers: 127
New Customers: 23
Returning Customers: 104

TOP 10 CUSTOMERS (By Spend):
1. Tunde's Restaurant - ₦287,000 (12 orders)
2. Mama Caro - ₦156,000 (34 orders)
3. Chief Adekunle - ₦124,000 (8 orders)
4. Sister Peace - ₦89,000 (19 orders)
5. Alhaji Musa - ₦67,000 (15 orders)
... 5 more

CUSTOMER DEBTS:
Total Outstanding: ₦234,000
Customers Owing: 18
Overdue Amount: ₦78,000 (7 customers) ⚠️

CUSTOMER PURCHASE FREQUENCY:
- Daily: 12 customers
- Weekly: 45 customers
- Monthly: 38 customers
- One-time: 32 customers
\`\`\`

**Tax Report:**

\`\`\`
TAX REPORT - NOVEMBER 2025
---------------------------
For filing with FIRS (Federal Inland Revenue Service)

REVENUE SUMMARY:
Total Sales: ₦1,845,000

VAT Collected (7.5%): ₦138,375
(Automatically calculated on applicable items)

PROFIT FOR TAX:
Net Profit: ₦210,000

Estimated Income Tax (assuming Company Income Tax):
₦210,000 × 30% = ₦63,000

NOTE: Consult accountant for accurate tax filing!
\`\`\`

**Filter Reports:**

Customize by:
- **Date Range:** Today, This Week, This Month, Custom
- **Product Category:** Beverages, Grains, etc.
- **Payment Method:** Cash, Transfer, POS, Credit
- **Sales Channel:** Retail, WhatsApp, Online, B2B
- **Staff Member:** View specific staff performance

**Export Reports:**

Download reports as:
- **PDF** - For printing/sharing
- **CSV** - For Excel/Google Sheets
- **Email** - Auto-send to your email/accountant

**Schedule Automatic Reports:**

Get reports delivered automatically:
- **Daily Sales Summary** - Every 6 PM via WhatsApp
- **Weekly Performance** - Every Monday via Email
- **Monthly P&L** - First day of month via Email

**Visual Analytics:**

Storehouse shows graphs:
- **Sales Trend** - Line graph over time
- **Product Mix** - Pie chart of product categories
- **Payment Methods** - Bar chart comparison
- **Peak Hours** - Heatmap of busiest times

**Insights & Recommendations:**

Storehouse AI analyzes your data:

\`\`\`
INSIGHTS FOR YOU:
-----------------
✅ Sales increased 23% vs last month! Keep it up!
⚠️ 13 products out of stock - restock to avoid lost sales
💡 Fridays are your best day - consider weekend promotions
💡 3 customers owe ₦78,000 for 30+ days - send reminders
📈 Online store sales growing 45% month-over-month!
\`\`\`

**Compare Periods:**

Compare performance:
- This Month vs Last Month
- This Year vs Last Year
- Q4 vs Q3

Example:
\`\`\`
COMPARISON: NOV 2025 vs OCT 2025
---------------------------------
Sales: ₦1,845,000 vs ₦1,500,000 (+23%) ↑
Profit: ₦210,000 vs ₦178,000 (+18%) ↑
Customers: 127 vs 114 (+11%) ↑
Average Sale: ₦3,789 vs ₦3,456 (+10%) ↑

💚 All metrics improved! Great month!
\`\`\``,
    relatedDocs: ['whatsapp-daily-reports', 'business-settings', 'export-data'],
    keywords: ['reports', 'analytics', 'business performance', 'sales report', 'profit report'],
    lastUpdated: '2025-11-30',
  },

  {
    id: 'whatsapp-daily-reports',
    category: 'reports',
    title: 'Daily WhatsApp Business Reports',
    subtitle: 'Get automated sales summaries every evening',
    difficulty: 'beginner',
    estimatedTime: '4 minutes',
    priority: 90,
    description: 'Receive automatic daily business reports via WhatsApp showing sales, profit, and key metrics.',
    content: `**What Are Daily Reports?**

Every evening at 6 PM, Storehouse sends you a WhatsApp message with:
- Today's total sales
- Today's profit
- Top-selling products
- Low stock alerts
- Customer debts collected

**Example Daily Report:**

\`\`\`
🏪 STOREHOUSE DAILY REPORT
📅 30 November 2025

---------------------------
💰 SALES TODAY
---------------------------
Total Sales: 24 transactions
Revenue: ₦87,500
Profit: ₦28,300 (32% margin)

💳 PAYMENT BREAKDOWN
---------------------------
Cash: ₦45,000 (51%)
Transfer: ₦32,500 (37%)
POS: ₦10,000 (11%)

⭐ TOP PRODUCTS SOLD
---------------------------
1. Indomie x 45 = ₦6,750
2. Golden Penny Flour x 2 = ₦70,000
3. Coca-Cola x 12 = ₦3,000

📦 STOCK ALERTS
---------------------------
⚠️ Low Stock:
- Indomie (15 left)
- Coca-Cola (8 left)

🔴 Out of Stock:
- Milo 400g
- Maggi Cubes

💸 DEBTS COLLECTED
---------------------------
₦12,000 received from:
- Mama Caro (₦7,000)
- Tunde (₦5,000)

---------------------------
Keep up the great work! 🎉

View full report: [Link]
\`\`\`

**Enable Daily Reports:**

**Step 1: Go to Settings**
- Click **Settings** → **Notifications**

**Step 2: Enable WhatsApp Reports**
- Toggle **Daily WhatsApp Report** ON
- Set delivery time (default: 6 PM)
- Confirm your WhatsApp number

**Step 3: Customize What's Included**

Choose what to include:
✅ Sales summary (always included)
✅ Profit breakdown
✅ Top products
✅ Stock alerts
✅ Debt collections
✅ Staff performance (if you have staff)
✅ Comparison with yesterday

**Customize Report Time:**

Choose when to receive:
- 6:00 PM (default - after business hours)
- 8:00 PM (if you close late)
- 7:00 AM (next morning with coffee!)

**Who Gets the Report?**

Send reports to:
- ✅ Business Owner (you)
- ✅ Business Partners (if any)
- ✅ Your Accountant
- ✅ Store Manager

Just add their WhatsApp numbers in Settings.

**Weekly Reports:**

Get summarized weekly report every Monday:

\`\`\`
📊 WEEKLY REPORT - 25 NOV - 1 DEC 2025

Total Sales: 167 transactions
Total Revenue: ₦487,500
Total Profit: ₦156,300 (32% margin)

Best Day: Friday 29 Nov (₦98,000)
Slowest Day: Monday 25 Nov (₦34,000)

Top Product: Golden Penny Flour (₦245,000)

New Customers: 12
Returning Customers: 68

💡 INSIGHT: Sales increased 18% vs last week!
\`\`\`

**Monthly Reports:**

Detailed monthly summary every 1st of the month:

\`\`\`
📈 MONTHLY REPORT - NOVEMBER 2025

Sales: ₦1,845,000 (487 transactions)
Profit: ₦210,000 (11% margin)
Growth: +23% vs October

Customers: 127 (23 new)
Products Sold: 1,234 units

Top Category: Grains & Cereals (₦1,190,000)

Staff Performance:
- Tunde: 127 sales (₦487,500)
- Ada: 234 sales (₦892,000)

Recommendations:
- Restock Indomie (selling fast!)
- Follow up on ₦78,000 overdue debts
- Consider weekend promotions (Fridays peak!)
\`\`\`

**Benefits of Daily Reports:**

✅ **Know Your Numbers Daily**
- No surprises at month-end
- Track performance in real-time

✅ **Stay On Top of Stock**
- Reorder before you run out
- Avoid lost sales

✅ **Monitor Staff**
- See who's performing
- Spot issues early

✅ **Track Debts**
- Know who paid today
- Follow up on overdue

✅ **Make Quick Decisions**
- "Sales down today? Run a promo tomorrow!"
- "Indomie selling fast? Order more!"

**Share Reports:**

Forward report to:
- Your accountant (for bookkeeping)
- Business partner (keep them informed)
- Investors (show growth)

**Report History:**

Access past reports:
- Go to **Reports** → **Daily Reports**
- View any past day
- Compare trends

**Notifications:**

Besides WhatsApp, get notifications for:
- **SMS** - If WhatsApp unavailable
- **Email** - For detailed PDF report
- **In-App** - When you log in to Storehouse

**Privacy:**

Reports are encrypted:
- Only you and people you authorize see them
- Delivered via end-to-end encrypted WhatsApp
- Not shared with anyone else

**Troubleshooting:**

**Not receiving reports?**
- Check WhatsApp number in Settings
- Verify you haven't blocked Storehouse number
- Check WhatsApp is installed and working

**Report time wrong?**
- Check timezone in Settings
- Update delivery time preference

**Want different format?**
- Customize in Settings → Notifications
- Choose what to include/exclude`,
    relatedDocs: ['view-business-reports', 'business-settings'],
    keywords: ['daily report', 'whatsapp report', 'automated report', 'daily summary'],
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
- Click your profile icon (top right)
- Select **Settings**

**Settings Categories:**

1. **Business Information**
2. **Notifications**
3. **Tax & Currency**
4. **Integrations**
5. **Security**
6. **Subscription**

**1. Business Information:**

**Basic Details:**
- Business Name: "Mama Ngozi Store"
- Business Type: Retail, Wholesale, Restaurant, etc.
- Phone Number: 0803 456 7890
- WhatsApp Number: Same or different
- Email: (optional)
- Address: Full business address

**Business Logo:**
- Upload logo image
- Shows on receipts, invoices, online store
- Recommended: Square, 500x500px

**Business Hours:**
- Opening Time: 8:00 AM
- Closing Time: 8:00 PM
- Days: Monday - Saturday
- Closed: Sundays

Used for:
- Online store hours
- Staff scheduling
- Customer expectations

**2. Notifications:**

**WhatsApp Notifications:**
✅ Daily sales report (6 PM)
✅ Low stock alerts
✅ New customer order
✅ Payment received
✅ Staff login alerts
✅ Weekly summary (Mondays)
✅ Monthly report (1st of month)

**SMS Notifications:**
✅ Low stock alerts
✅ Payment reminders
❌ Daily reports (WhatsApp only)

**Email Notifications:**
✅ Monthly reports
✅ Invoice payments
✅ Weekly summaries
❌ Daily reports (WhatsApp only)

**In-App Notifications:**
✅ New orders
✅ Customer messages
✅ Stock alerts
✅ Staff activity

**3. Tax & Currency:**

**Currency:**
- Default: Nigerian Naira (₦)
- Symbol: ₦
- Format: ₦1,234.56

**Tax Settings:**
- VAT Rate: 7.5% (Nigeria standard)
- Apply VAT to: Selected products (toggle per product)
- Tax ID: Your business TIN (Tax Identification Number)

**Price Display:**
- Show prices with VAT: Yes/No
- Example: ₦1,200 (VAT incl.) vs ₦1,200 + ₦90 VAT

**4. Integrations:**

**Payment Gateways:**

**Paystack:**
- Connect your Paystack account
- Accept card/bank payments online
- Auto-reconcile payments

Setup:
1. Click **Connect Paystack**
2. Enter your Paystack API keys (from paystack.com)
3. Test connection
4. Start accepting payments!

**WhatsApp Business API:**
- Connect WhatsApp Business number
- Send automated receipts
- Customer can message you
- Auto-responses

**Accounting Software:**
- QuickBooks (export reports)
- Xero (sync transactions)
- Wave (free accounting)

**Delivery Partners:**
- GIG Logistics
- Kwik Delivery
- DHL

**5. Security:**

**Password:**
- Change password regularly
- Strong password required
- 2-factor authentication (recommended)

**Staff Permissions:**
- Review staff access levels
- Reset staff PINs
- Deactivate former staff

**Data Backup:**
- Automatic daily backups
- Download backup: Export all data
- Restore from backup (if needed)

**Activity Log:**
- View all account activity
- See who logged in when
- Track changes made

**6. Subscription:**

**Current Plan:**
- Plan: Starter / Pro
- Price: ₦4,000/month
- Renewal Date: 30 Dec 2025

**Payment Method:**
- Card ending in 4242
- Update card
- Add backup payment method

**Billing History:**
- View past invoices
- Download receipts
- See payment history

**Upgrade to Pro:**

Pro features:
- Custom domain for online store
- Advanced reports
- Priority support
- Unlimited products
- Multiple staff accounts
- WhatsApp AI assistant

Price: ₦8,000/month

**Other Settings:**

**Language:**
- English (default)
- Nigerian Pidgin (coming soon)

**Date Format:**
- DD/MM/YYYY (30/11/2025)
- MM/DD/YYYY (11/30/2025)

**Time Format:**
- 12-hour (3:45 PM)
- 24-hour (15:45)

**Receipt Settings:**
- Include business logo: Yes
- Show payment method: Yes
- Show cashier name: Yes
- Include WhatsApp number: Yes
- Footer message: "Thank you for your patronage!"

**Low Stock Threshold:**
- Default: 3 units
- Customize per product
- Get alert when stock falls below

**Default Payment Method:**
- Cash (for quick sales)
- Speeds up checkout

**Sales Tax:**
- Auto-calculate VAT: Yes
- Include tax in displayed prices: Yes

**Save Settings:**

After making changes:
1. Scroll to bottom
2. Click **Save Changes**
3. Confirmation: "Settings updated successfully!"

**Export Settings:**

Backup your settings:
- Click **Export Settings**
- Download JSON file
- Restore on new device if needed`,
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
    description: 'Export sales, products, customers, and reports for accounting, analysis, or backup.',
    content: `**Why Export Data?**

Use your data for:
- Accounting (give to your accountant)
- Tax filing (FIRS requires records)
- Analysis in Excel/Google Sheets
- Backup (keep offline copy)
- Migration (if switching systems)

**What You Can Export:**

1. **Sales Data**
2. **Product List**
3. **Customer Database**
4. **Inventory Records**
5. **Financial Reports**
6. **Staff Performance**
7. **Complete Backup** (everything)

**How to Export:**

**Step 1: Go to Export Page**
- Click **Settings** → **Export Data**
- Or go to specific page (e.g., Sales) → **Export** button

**Step 2: Select Data Type**
- Choose what to export
- Example: "Sales Report"

**Step 3: Choose Date Range**
- Today
- This Week
- This Month
- Custom: 1 Nov - 30 Nov 2025

**Step 4: Select Format**
- **CSV** - For Excel/Google Sheets
- **PDF** - For printing/sharing
- **JSON** - For developers/technical use
- **Excel (XLSX)** - Native Excel format

**Step 5: Click Export**
- File downloads immediately
- Or sent to email (for large files)

**Export Sales Data:**

CSV includes:
- Date & time of sale
- Receipt number
- Customer name
- Products sold (itemized)
- Quantity & price per item
- Subtotal
- Payment method
- Sales channel (Retail/WhatsApp/Online)
- Staff member (if applicable)
- Profit per sale

Example CSV:
\`\`\`
Date,Receipt,Customer,Product,Qty,Price,Total,Payment,Channel,Profit
30/11/2025 14:23,RCP-2025-0487,Mama Caro,Indomie,10,150,1500,Cash,Retail,300
30/11/2025 14:30,RCP-2025-0488,Tunde,Flour 50kg,1,35000,35000,Transfer,WhatsApp,5000
\`\`\`

**Export Product List:**

CSV includes:
- Product name
- Category
- SKU/Barcode
- Cost price
- Selling price
- Current stock quantity
- Reorder level
- Supplier
- Last restock date

**Export Customer Data:**

CSV includes:
- Customer name
- Phone number
- Email (if available)
- Address
- Total purchases (all-time)
- Last purchase date
- Outstanding debt
- Customer since (date joined)

**Export Financial Reports:**

**Profit & Loss (PDF):**
- Revenue breakdown
- Cost of goods sold
- Expenses
- Net profit
- Formatted for accountant

**Tax Report (CSV):**
- VATable sales
- VAT collected
- Profit for income tax calculation

**Inventory Valuation (Excel):**
- All products
- Quantity in stock
- Cost per unit
- Total stock value

**Schedule Automatic Exports:**

Send data automatically:
- **Daily Sales:** Every 6 PM to email
- **Weekly Reports:** Every Monday
- **Monthly Backup:** 1st of each month

Setup:
1. Go to Settings → Automated Exports
2. Choose frequency & format
3. Enter email address
4. Save

**Complete Backup:**

Export EVERYTHING:
- All sales (entire history)
- All products
- All customers
- All staff records
- All invoices
- All settings

**Step 1:** Settings → **Complete Backup**
**Step 2:** Click **Create Backup**
**Step 3:** Wait (may take 2-5 minutes)
**Step 4:** Download ZIP file

**Backup includes:**
- sales.csv
- products.csv
- customers.csv
- invoices.pdf
- reports.pdf
- settings.json

**Restore from Backup:**

If you lose data or switch devices:
1. Settings → **Restore from Backup**
2. Upload backup ZIP file
3. Confirm restoration
4. All data restored!

**Share with Accountant:**

Send specific data:
1. Export Profit & Loss Report (PDF)
2. Export Sales Data (CSV)
3. Export Tax Report (CSV)
4. Email all to accountant

Or:
- Settings → **Share with Accountant**
- Enter accountant's email
- Select what to share
- They receive monthly automatically

**Data Security:**

✅ All exports encrypted
✅ Files password-protected (optional)
✅ Sent via secure email
✅ Deleted from server after 7 days

**Storage:**

Exported files stored:
- On your device (Downloads folder)
- In your email (if emailed)
- Google Drive/Dropbox (if integrated)

Storehouse keeps data for:
- Active accounts: Forever
- Deleted accounts: 90 days (then permanently deleted)

**Best Practices:**

✅ Export monthly for accounting
✅ Create complete backup quarterly
✅ Store backups in 2 places (device + cloud)
✅ Share with accountant monthly
✅ Keep tax reports for 6 years (FIRS requirement)

**Troubleshooting:**

**Export taking too long?**
- Reduce date range
- Export in smaller chunks

**File too large for email?**
- Use Google Drive link instead
- Or export as CSV (smaller than PDF)

**Can't open CSV?**
- Use Excel, Google Sheets, or Numbers
- Change encoding to UTF-8 if special characters missing`,
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
    description: 'Understand why edit buttons might be hidden and how to access them.',
    content: `**Common Issue:**

"I can't find the edit button on my product/sale/customer!"

**Why This Happens:**

1. **You're logged in as Staff (not Owner)**
2. **Screen is too small (mobile view)**
3. **Item is locked for editing**
4. **Page hasn't fully loaded**
5. **Browser issue**

**Solution 1: Check Your Login Role**

If you're logged in as **Cashier** or **Staff** (not Owner):
- Cashiers can't edit products
- Only Owners and Managers can edit

**How to check:**
- Look at top right corner
- See your name and role
- If it says "Cashier" → You can't edit products

**Fix:**
- Log out
- Log in with Owner account (your main account)
- Or ask owner to promote you to Manager

**Solution 2: Look for 3-Dot Menu (Mobile)**

On mobile phones, edit buttons are in a menu:

**Step 1:** Click the product/sale/customer
**Step 2:** Look for **⋮** (three dots) icon
**Step 3:** Click it
**Step 4:** Menu appears with "Edit" and "Delete"

**Solution 3: Hover Over Item (Desktop)**

On computer/laptop:

**Step 1:** Move mouse over the item (don't click!)
**Step 2:** Edit and Delete icons appear on the right
**Step 3:** Click the edit icon (pencil ✏️)

**Solution 4: Open Item Details First**

**Step 1:** Click the product/sale/customer name
**Step 2:** Details page opens
**Step 3:** **Edit** button at top right
**Step 4:** Click to edit

**Solution 5: Refresh the Page**

Sometimes buttons don't load:

**Step 1:** Press **F5** (Windows) or **Cmd+R** (Mac)
**Step 2:** Page reloads
**Step 3:** Buttons should appear now

**Solution 6: Clear Browser Cache**

If refresh doesn't work:

**Google Chrome:**
1. Press **Ctrl+Shift+Delete** (Windows) or **Cmd+Shift+Delete** (Mac)
2. Select "Cached images and files"
3. Click "Clear data"
4. Reload Storehouse

**Safari:**
1. Safari → Preferences → Privacy
2. Click "Manage Website Data"
3. Remove Storehouse data
4. Reload

**Solution 7: Try Different Browser**

If still not working:
- Using Chrome? Try Firefox
- Using Safari? Try Chrome
- Using Opera? Try Edge

**Common Scenarios:**

**Scenario 1: "I can edit some products but not others"**
- Some products may be locked
- Check if product is part of active sale
- Wait for sale to complete, then edit

**Scenario 2: "Edit button was there yesterday, now missing"**
- Owner may have changed your permissions
- Check with business owner
- They may have changed you from Manager to Cashier

**Scenario 3: "I can see edit but can't click it"**
- Button may be grayed out
- Item may be locked (e.g., sale already recorded)
- Or you don't have permission

**Scenario 4: "Edit button in wrong language"**
- Check language settings
- Settings → Language → English

**For Owners: Grant Edit Permission**

If you're the owner and staff can't edit:

**Step 1:** Go to **Staff** page
**Step 2:** Click staff member
**Step 3:** Click **Edit Permissions**
**Step 4:** Toggle **Edit Products** ON
**Step 5:** Save

Now they can edit!

**Still Not Working?**

Contact Storehouse support:
- WhatsApp: [Support Number]
- Email: support@storehouse.ng
- Or use in-app chat (click Help icon)

Include:
- Your phone number
- What you're trying to edit
- Screenshot showing the issue`,
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
    description: 'Troubleshoot issues with data not syncing or connection problems.',
    content: `**Common Sync Issues:**

1. "Sales not showing up"
2. "Product changes not saving"
3. "Data looks old/outdated"
4. "Changes made on phone not showing on computer"
5. "Offline mode stuck"

**Understanding How Sync Works:**

Storehouse saves data in the cloud:
- When you add a sale → Sent to cloud
- When you edit a product → Saved in cloud
- Other devices download latest from cloud

**If internet is slow/offline:**
- Changes saved on device first
- Uploaded when internet returns
- "Pending sync" shown

**Check Your Connection:**

**Step 1: Test Internet**
- Open another website (google.com)
- Does it load?
- If NO → Internet issue
- If YES → Storehouse issue

**Step 2: Check Storehouse Status**
- Look for **green checkmark** ✅ (top right)
- Green = Connected
- Yellow ⚠️ = Syncing
- Red 🔴 = Offline

**Step 3: Check Sync Queue**
- Click sync icon
- See pending changes
- Wait for them to upload

**Solution 1: Refresh the Page**

**On computer:**
- Press **F5** (Windows) or **Cmd+R** (Mac)
- Or click refresh button in browser

**On phone app:**
- Swipe down on screen (pull to refresh)
- Or close app and reopen

**Solution 2: Wait for Sync to Complete**

If you see "Syncing..." or ⚠️:
- Wait 30-60 seconds
- Don't close the app/browser
- Let it finish

Progress shown:
"Syncing 3 of 5 changes..." → Almost done!

**Solution 3: Check Internet Connection**

**No internet?**
- Turn on mobile data or WiFi
- Check airplane mode is OFF
- Try other apps to confirm internet works

**Slow internet?**
- Sync may take longer
- Be patient
- Don't make new changes until current sync completes

**Solution 4: Force Sync**

**Step 1:** Click sync icon (🔄) or **⚠️**
**Step 2:** Click **Sync Now**
**Step 3:** Wait for completion
**Step 4:** ✅ appears when done

**Solution 5: Log Out and Log Back In**

If sync stuck:

**Step 1:** Click your profile → **Log Out**
**Step 2:** Close browser/app completely
**Step 3:** Reopen Storehouse
**Step 4:** Log back in
**Step 5:** Data syncs fresh from cloud

**⚠️ Warning:** Only do this if connected to internet! Otherwise local changes may be lost.

**Solution 6: Clear App Cache (Mobile)**

**Android:**
1. Settings → Apps → Storehouse
2. Storage → Clear Cache (NOT Clear Data!)
3. Reopen Storehouse

**iPhone:**
1. Settings → General → iPhone Storage
2. Storehouse → Offload App
3. Reinstall from App Store

**Solution 7: Update the App**

Outdated app may have sync bugs:

**Step 1:** Go to App Store (iPhone) or Play Store (Android)
**Step 2:** Search "Storehouse"
**Step 3:** If "Update" button shows → Click it
**Step 4:** Reopen app after update

**Prevent Sync Issues:**

✅ Keep internet connected when possible
✅ Sync regularly (don't accumulate many offline changes)
✅ Update app when prompted
✅ Don't force-close app during sync
✅ Use WiFi for large data uploads

**Offline Mode:**

Storehouse works offline!
- Record sales without internet
- Add products
- View existing data

**When internet returns:**
- Changes auto-sync
- May take a few minutes
- ⚠️ icon shows during sync

**Conflict Resolution:**

If same data edited on 2 devices:

Example:
- You edit "Indomie" price to ₦150 on phone
- Manager edits same product to ₦160 on computer
- Who wins?

**Storehouse rule:** Last change wins
- If manager saved after you → ₦160
- You get notification: "Product was updated by someone else"

**To avoid:**
- Communicate with staff
- "I'm editing Indomie, don't touch it!"

**Data Safety:**

Don't worry - your data is safe:
✅ Auto-saved every 30 seconds
✅ Backed up to cloud
✅ Even if sync fails, saved on device
✅ Will retry sync automatically

**Check Sync History:**

See what was synced:
1. Settings → Sync History
2. View all synced changes
3. See timestamps
4. Verify your changes uploaded

**Still Having Issues?**

**Check Storehouse Status Page:**
- Visit: status.storehouse.ng
- See if servers are down
- Check ongoing maintenance

**Contact Support:**
- WhatsApp support
- Email: support@storehouse.ng
- Include: Error message, screenshot, what you were doing`,
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
    description: 'Troubleshoot problems with payments not showing up or being recorded incorrectly.',
    content: `**Common Payment Issues:**

1. "Customer paid but it's not in my sales"
2. "Paystack payment not showing"
3. "Payment recorded twice"
4. "Wrong amount recorded"
5. "Can't find a sale I know I recorded"

**Issue 1: Payment Not Showing in Sales**

**Possible Causes:**
- Sale not completed (stuck in draft)
- Sync issue (offline when recorded)
- Recorded on different device/staff account
- Filtered out in sales view

**Solution:**

**Step 1: Check Sale Status**
- Go to **Sales** page
- Look for **Draft Sales** filter
- Click it
- Your sale might be there!
- Click sale → **Complete Sale**

**Step 2: Check Filters**
- Current filter might hide the sale
- Click **All Sales** (remove filters)
- Search by customer name or amount
- Check date range (is today selected?)

**Step 3: Check Sync Status**
- Look for ⚠️ sync icon
- If yellow → Still syncing
- Wait for ✅ green checkmark

**Step 4: Search Specifically**
- Use search bar
- Search customer name: "Mama Caro"
- Or search amount: "5000"
- Or receipt number: "RCP-2025-0487"

**Issue 2: Paystack Payment Not Recorded**

Customer paid online but not showing:

**Step 1: Check Paystack Dashboard**
- Log in to paystack.com
- Go to **Transactions**
- Is payment there?
- Status: "Success" or "Failed"?

**If Success in Paystack but not in Storehouse:**

**Step 2: Manual Sync**
- Go to Settings → Integrations → Paystack
- Click **Sync Paystack Transactions**
- Wait 1-2 minutes
- Check sales again

**If Failed in Paystack:**
- Customer's payment didn't go through
- They need to pay again
- Send new payment link

**Issue 3: Payment Recorded Twice**

Duplicate sales showing:

**Solution:**

**Step 1: Compare Receipt Numbers**
- Are receipt numbers different?
- If YES → Not duplicates, customer paid twice
- If SAME → Possible bug

**Step 2: Check Timestamps**
- When was each recorded?
- Same time = Duplicate
- Different times = Two separate sales

**Step 3: Delete Duplicate**
- Identify which is duplicate
- Click duplicate sale
- Click **Delete**
- Confirm deletion

**⚠️ Warning:** Only delete if you're 100% sure it's duplicate!

**Issue 4: Wrong Amount Recorded**

Sale shows ₦5,000 but customer paid ₦7,000:

**Solution:**

**Step 1: Edit the Sale**
- Click the sale
- Click **Edit** (if within 24 hours)
- Update amount
- Save

**If Edit not available (sale older than 24 hours):**

**Step 2: Record Adjustment**
- Go to **Sales** → **New Sale**
- Create sale for difference (₦2,000)
- Payment method: Same as original
- Note: "Adjustment for sale #RCP-2025-0487"

**Or:**

**Step 3: Contact Support**
- For large amounts or sensitive fixes
- Support can edit any sale
- WhatsApp support with receipt number

**Issue 5: Customer Paid Cash, Showing as Credit**

Sale recorded as credit instead of cash:

**Solution:**

**Step 1: Edit Payment Method**
- Click the sale
- Click **Edit**
- Change payment method to **Cash**
- Save

**If Edit not available:**
- Sale is older than 24 hours
- Can't change payment method
- Note it for your records
- Doesn't affect total revenue (just categorization)

**Issue 6: Debt Payment Not Recorded**

Customer paid off debt but still shows owing:

**Solution:**

**Step 1: Go to Customers Page**
**Step 2:** Click customer name
**Step 3:** See **Outstanding Debt** section
**Step 4:** Click **Record Payment**
**Step 5:** Enter:
- Amount paid
- Payment method
- Date
**Step 6:** Save
**Step 7:** Debt balance updates automatically

**Issue 7: Sale Deleted by Mistake**

Accidentally deleted a sale:

**Solution:**

**Step 1: Check Trash**
- Sales → **Trash** (at bottom of filters)
- Deleted sales kept for 30 days
- Find your sale
- Click **Restore**

**If Permanently Deleted (not in trash):**
- Can't restore yourself
- Contact support within 7 days
- They may recover from backup

**Prevention Tips:**

✅ **Double-check before recording**
- Verify amount before saving
- Confirm payment method

✅ **Use receipt numbers**
- Give customer receipt number
- Easy to find sale later

✅ **Record immediately**
- Don't wait hours to record sale
- Record right after payment

✅ **Sync regularly**
- Don't accumulate many offline sales
- Sync every few sales

✅ **Train staff properly**
- Show them how to record sales correctly
- Explain payment methods

**Verify Daily Sales:**

At end of each day:
1. Count physical cash in register
2. Compare with Storehouse cash sales total
3. Should match!
4. If not → investigate discrepancies

**Reconcile Bank Transfers:**

Weekly:
1. Check bank statement
2. Match with Storehouse transfer sales
3. Every transfer in bank should have a sale
4. Every sale should have a transfer

**Paystack Reconciliation:**

Monthly:
1. Download Paystack report
2. Download Storehouse online sales report
3. Compare totals
4. Should match within ₦100 (rounding)

**Contact Support If:**

- Payment over ₦50,000 missing
- Multiple payments not recording
- Sync issues persist after troubleshooting
- Data looks completely wrong

**Include in support request:**
- Your business name & phone number
- Receipt number (if you have it)
- Customer name
- Amount
- Date & time
- Payment method
- Screenshot of issue`,
    relatedDocs: ['sync-issues', 'missing-edit-button', 'track-invoice-payments'],
    keywords: ['payment missing', 'payment not recorded', 'paystack', 'sale missing', 'wrong amount'],
    lastUpdated: '2025-11-30',
  },

];
