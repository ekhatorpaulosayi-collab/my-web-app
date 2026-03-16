/**
 * PAYSTACK DOCUMENTATION FOR STOREHOUSE
 * Complete guide for payment integration
 * Nigerian-focused with local context
 * Last updated: 2024-03-16
 */

import { Documentation } from '../types/documentation';

export const paystackDocumentation: Documentation[] = [
  // ============================================
  // PAYSTACK BASICS
  // ============================================
  {
    id: 'what-is-paystack',
    category: 'payments',
    title: 'What is Paystack?',
    subtitle: "Nigeria's #1 payment gateway",
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 95,
    description: 'Understand what Paystack is and why you need it for your business.',
    content: `**Paystack** is Nigeria's most trusted payment gateway that lets your customers pay you online instantly. Think of it as your 24/7 digital POS machine! 💳

**Why Use Paystack?**

With Paystack on your StoreFront store:
✅ **Accept Multiple Payment Methods**
   - Cards (Mastercard, Visa, Verve)
   - Bank transfers
   - USSD payments
   - Mobile money

✅ **Instant Notifications**
   - Real-time payment alerts
   - Email receipts automatically sent
   - SMS notifications available

✅ **Bank-Level Security**
   - PCI-DSS certified
   - 256-bit SSL encryption
   - Fraud detection built-in

✅ **Next-Day Settlement**
   - Money arrives in your bank the next working day
   - No manual withdrawal needed
   - Automatic daily payouts

✅ **Trusted by 60,000+ Businesses**
   - Including Bolt, Domino's Pizza, Lagos State
   - 99.9% uptime guarantee
   - Local customer support

**Perfect For:**
- Online stores
- Service businesses
- Subscription services
- Freelancers & consultants
- Any business accepting online payments

Ready to start accepting payments? Let's set up your Paystack account!`,
    keywords: ['paystack', 'payment gateway', 'online payments', 'nigeria', 'introduction']
  },

  {
    id: 'paystack-fees-charges',
    category: 'payments',
    title: 'Paystack Fees & Charges',
    subtitle: 'Simple, transparent pricing',
    difficulty: 'beginner',
    estimatedTime: '3 minutes',
    priority: 94,
    description: 'Understand exactly how much Paystack charges for transactions.',
    content: `**Paystack Pricing - Simple & Transparent**

📊 **Transaction Fees:**

**Local Payments (Nigerian cards & transfers):**
• **1.5% + ₦100** per successful transaction
• Example: Customer pays ₦10,000 → You receive ₦9,750
• Example: Customer pays ₦50,000 → You receive ₦49,150

**International Payments:**
• **3.9% + ₦100** per successful transaction
• For foreign cards (USD, GBP, EUR, etc.)

✅ **NO Charges For:**
• Creating an account - FREE
• Monthly subscription fees - FREE
• Setting up your store - FREE
• Failed transactions - FREE
• Withdrawals to your bank - FREE
• Refunds processing - FREE

**💰 Quick Calculator:**

| Customer Pays | Paystack Fee | You Receive |
|---------------|--------------|-------------|
| ₦1,000 | ₦115 (11.5%) | ₦885 |
| ₦5,000 | ₦175 (3.5%) | ₦4,825 |
| ₦10,000 | ₦250 (2.5%) | ₦9,750 |
| ₦50,000 | ₦850 (1.7%) | ₦49,150 |
| ₦100,000 | ₦1,600 (1.6%) | ₦98,400 |
| ₦500,000 | ₦7,600 (1.52%) | ₦492,400 |

**📈 Volume Discounts:**
Processing over ₦10 million monthly? Contact Paystack for custom rates!

**💡 Pro Tips:**
- You only pay when you make money
- Fees are automatically deducted before settlement
- All fees include VAT - no hidden charges
- Consider adding a small service charge to cover fees

**Compare with Alternatives:**
- Bank POS: 0.75% (but requires physical presence)
- Flutterwave: 1.4% (but has hidden charges)
- Paystack: 1.5% + ₦100 (all-inclusive, transparent)

Remember: The convenience of 24/7 online payments usually leads to MORE sales that offset the fees!`,
    keywords: ['fees', 'charges', 'pricing', 'cost', 'transaction fees', 'paystack pricing']
  },

  {
    id: 'create-paystack-account',
    category: 'payments',
    title: 'Create Your Paystack Account',
    subtitle: 'Step-by-step account setup',
    difficulty: 'beginner',
    estimatedTime: '10 minutes',
    priority: 93,
    description: 'Complete guide to creating and verifying your Paystack account.',
    content: `**Setting Up Your Paystack Account - Complete Guide**

## Step 1: Sign Up (2 minutes)

1. Go to **[paystack.com](https://paystack.com)**
2. Click **"Create free account"**
3. Enter your details:
   - Email address
   - Password (make it strong!)
   - Phone number
4. Check your email and click the verification link

## Step 2: Business Information (3 minutes)

Once logged in, provide:

**Business Details:**
- **Business Name**: Can be your personal name if not registered
- **Business Type**:
  - "Registered Business" (if you have CAC)
  - "Starter Business" (if using personal name)
- **Business Category**: Select "Retail/E-commerce"
- **Business Description**: Brief description of what you sell

**Contact Information:**
- Phone number (for SMS alerts)
- Business address (can be home address)
- Website URL (your StoreFront link)

## Step 3: Bank Account Setup (2 minutes)

Add where you want to receive money:

**Bank Details Required:**
- Bank name
- Account number
- Account name (MUST match BVN name)

⚠️ **Important**: The account name must match your BVN exactly!

## Step 4: Identity Verification (3 minutes)

**For Personal/Starter Account:**
- Upload any valid ID:
  - National ID (NIN)
  - Driver's License
  - International Passport
  - Voter's Card
- Enter your BVN

**For Registered Business:**
- CAC certificate
- Director's ID
- Business bank account

## Step 5: Await Approval

**Approval Timeline:**
- Personal accounts: 24-48 hours
- Business accounts: 2-3 business days
- You'll receive email confirmation

## While Waiting for Approval:

You can still:
✅ Access your dashboard
✅ Get your API keys
✅ Set up in test mode
✅ Configure your StoreFront

## Quick Setup Tips:

💡 **Start with Personal Account** if you don't have CAC yet
💡 **Use clear photos** of documents - blur = rejection
💡 **BVN name must match** bank account exactly
💡 **Check spam folder** for Paystack emails
💡 **Contact support** if not approved in 3 days

**Common Approval Issues:**
- Blurry document photos → Take in good lighting
- Name mismatch → Use exact BVN name
- Wrong business type → Choose appropriate category
- Invalid BVN → Verify with your bank first

Ready? [Start here](https://dashboard.paystack.com/#/signup) 🚀`,
    keywords: ['create account', 'sign up', 'register', 'paystack account', 'verification', 'bvn']
  },

  {
    id: 'find-paystack-api-keys',
    category: 'payments',
    title: 'Find Your API Keys',
    subtitle: 'Locate your Paystack keys',
    difficulty: 'beginner',
    estimatedTime: '2 minutes',
    priority: 92,
    description: 'Learn where to find your Paystack API keys for integration.',
    content: `**Finding Your Paystack API Keys**

## Where to Find Your Keys:

1. **Login** to [dashboard.paystack.com](https://dashboard.paystack.com)
2. Click **"Settings"** in the left sidebar (at the bottom)
3. Click **"API Keys & Webhooks"**
4. You'll see two sets of keys:

## Understanding Your Keys:

**🧪 Test Keys (For Practice)**
\`\`\`
Public Key: pk_test_xxxxxxxxxxxxxxxxxx
Secret Key: sk_test_xxxxxxxxxxxxxxxxxx
\`\`\`
- Use these first to test everything
- No real money involved
- Perfect for practice

**💰 Live Keys (For Real Payments)**
\`\`\`
Public Key: pk_live_xxxxxxxxxxxxxxxxxx
Secret Key: sk_live_xxxxxxxxxxxxxxxxxx
\`\`\`
- Use when ready for real transactions
- Real money will be charged
- Customers' cards will be debited

## Important Security Rules:

⚠️ **NEVER Share Your Secret Key!**
- Secret key = full access to your money
- Only use in backend/server code
- Never put in frontend code
- Never share via email/chat

✅ **Public Key is Safe to Share**
- Used in your website/app
- Customers can see this
- Only initiates payments
- Cannot access your money

## How to Copy Keys:

1. Click the **"Show"** button to reveal keys
2. Click the **copy icon** next to each key
3. Paste carefully - one wrong character breaks everything!

📱 **On Mobile?**
- Keys might be cut off
- Scroll horizontally to see full key
- Or rotate phone to landscape

## Which Keys to Use:

**Starting Out?**
→ Use Test Keys first

**Testing Payments?**
→ Test Keys only

**Ready for Real Money?**
→ Switch to Live Keys

## Storing Keys in StoreFront:

1. Go to Settings → Business Settings
2. Find "Payment Settings"
3. Toggle Test/Live mode
4. Paste your keys
5. Save

## Troubleshooting:

**"Invalid API Key" Error?**
- Check for extra spaces
- Ensure complete key copied
- Match mode (test/live) with keys

**Can't See Keys?**
- Account must be approved first
- Check account verification status
- Contact support if approved but no keys

💡 **Pro Tip**: Save your keys in a secure password manager!`,
    keywords: ['api keys', 'secret key', 'public key', 'find keys', 'test keys', 'live keys']
  },

  {
    id: 'connect-paystack-storefront',
    category: 'payments',
    title: 'Connect Paystack to StoreFront',
    subtitle: 'Integrate payment gateway',
    difficulty: 'intermediate',
    estimatedTime: '5 minutes',
    priority: 91,
    description: 'Step-by-step guide to connect Paystack to your StoreFront store.',
    content: `**Connecting Paystack to Your StoreFront Store**

## Prerequisites:
✅ Paystack account created
✅ API keys obtained
✅ StoreFront store set up

## Step-by-Step Integration:

### 1. Open Payment Settings

1. Click the **menu (☰)** at top-left
2. Go to **Settings** → **Business Settings**
3. Scroll to **"Payment Settings"** section
4. Click **"Connect Paystack"**

### 2. Configure Test Mode First

**Start with Test Mode:**
1. Toggle **"Test Mode"** to ON
2. You'll see two input fields appear

**Enter Test Keys:**
- **Public Key**: Paste your pk_test_... key
- **Secret Key**: Paste your sk_test_... key
- Click **"Save"**

### 3. Verify Connection

**Test the Integration:**
1. Go to your store page
2. Add any product to cart
3. Click checkout
4. You should see **"Pay with Paystack"** option
5. Look for "TEST MODE" label

### 4. Make a Test Payment

**Use Test Card:**
\`\`\`
Card Number: 4084 0840 8408 4081
Expiry: 12/25
CVV: 408
PIN: 0000
OTP: 123456
\`\`\`

**What to Expect:**
- Payment form appears
- Enter test card details
- See "Payment Successful"
- Check your dashboard for transaction

### 5. Switch to Live Mode

**When Ready for Real Payments:**

1. Return to Payment Settings
2. Toggle **"Test Mode"** to OFF
3. Replace with Live Keys:
   - **Public Key**: pk_live_...
   - **Secret Key**: sk_live_...
4. Click **"Save"**

## Verification Checklist:

After connecting, verify:

✅ **Checkout Works**
- Products can be added to cart
- Paystack option appears
- Payment form loads

✅ **Test Payment Succeeds**
- Test card accepted
- Success message shown
- Transaction in dashboard

✅ **Settings Saved**
- Keys stored correctly
- Mode matches keys
- No error messages

## Common Issues & Solutions:

**"Invalid API Key"**
- Check for spaces before/after keys
- Ensure complete key copied
- Verify test/live mode matches keys

**Payment Option Not Showing**
- Refresh the page
- Clear browser cache
- Check keys are saved
- Ensure Paystack account approved

**Payment Fails**
- Using test card in live mode?
- Using real card in test mode?
- Check internet connection
- Try different browser

## Security Best Practices:

🔒 **Keep Keys Secure**
- Never share secret keys
- Use environment variables in production
- Rotate keys if compromised

🧪 **Always Test First**
- Complete full payment in test mode
- Verify money flow
- Check email receipts
- Test refunds

📱 **Mobile Testing**
- Test on mobile devices
- Check payment form responsive
- Verify USSD option works

## Next Steps:

Once connected:
1. ✅ Test different payment methods
2. ✅ Set up payment notifications
3. ✅ Configure receipts
4. ✅ Test refund process
5. ✅ Go live!

Need help? Check our troubleshooting guide or contact support!`,
    keywords: ['connect', 'integrate', 'setup', 'storefront', 'configuration', 'api integration']
  },

  {
    id: 'test-paystack-payments',
    category: 'payments',
    title: 'Test Paystack Payments',
    subtitle: 'Practice with test cards',
    difficulty: 'beginner',
    estimatedTime: '5 minutes',
    priority: 90,
    description: 'Learn how to test payments safely without real money.',
    content: `**Testing Paystack Payments - Complete Guide**

## Test Cards for Different Scenarios:

### ✅ Successful Payment
\`\`\`
Card Number: 4084 0840 8408 4081
Expiry: 12/25 (or any future date)
CVV: 408
PIN: 0000
OTP: 123456
\`\`\`

### ❌ Card Declined
\`\`\`
Card Number: 4084 0840 8408 4084
Expiry: 12/25
CVV: 408
\`\`\`

### ⚠️ Insufficient Funds
\`\`\`
Card Number: 4084 0840 8408 1089
Expiry: 12/25
CVV: 408
\`\`\`

## How to Test Payments:

### Step 1: Enable Test Mode
1. Go to Settings → Payment Settings
2. Toggle **"Test Mode"** ON
3. Ensure test keys are configured

### Step 2: Create Test Order
1. Visit your store
2. Add products to cart
3. Go to checkout
4. Select "Pay with Card"

### Step 3: Enter Test Card
1. Use successful test card above
2. Enter all details exactly
3. Submit payment
4. Enter PIN: 0000
5. Enter OTP: 123456

### Step 4: Verify Success
✅ "Payment Successful" message
✅ Order confirmation shown
✅ Receipt email sent
✅ Transaction in dashboard

## Testing Different Scenarios:

**1. Test Successful Payment**
- Use successful test card
- Verify order created
- Check email receipt
- Confirm in dashboard

**2. Test Failed Payment**
- Use declined test card
- Verify error message
- Check no order created
- Customer can retry

**3. Test Different Amounts**
- Small amount (₦500)
- Medium amount (₦10,000)
- Large amount (₦100,000)
- Verify fees calculated correctly

**4. Test Payment Methods**
- Card payment
- Bank transfer (if enabled)
- USSD (if available)
- Mobile money

## What to Check:

### During Payment:
- [ ] Payment form loads quickly
- [ ] All fields visible
- [ ] Mobile responsive
- [ ] Clear instructions
- [ ] Security badges shown

### After Payment:
- [ ] Success message clear
- [ ] Order details correct
- [ ] Receipt sent immediately
- [ ] Transaction in dashboard
- [ ] Inventory updated

### In Dashboard:
- [ ] Transaction listed
- [ ] Amount correct
- [ ] Fees shown
- [ ] Customer details saved
- [ ] Can view receipt

## Common Test Issues:

**"Invalid Card Number"**
- Check spacing (4084 0840...)
- Don't include dashes
- Copy exactly as shown

**"Transaction Failed"**
- Ensure test mode is ON
- Using test keys, not live
- Check internet connection

**"PIN/OTP Incorrect"**
- PIN must be: 0000
- OTP must be: 123456
- Case sensitive

## Testing Checklist:

Before going live, test:
- [ ] Successful payment
- [ ] Failed payment handling
- [ ] Different payment amounts
- [ ] Mobile device payment
- [ ] Email receipts working
- [ ] Dashboard shows transactions
- [ ] Refund process
- [ ] Multiple products in cart
- [ ] Customer details saved

## Important Notes:

⚠️ **Test Mode Only**
- No real money charged
- Test unlimited times
- Safe for practice

💡 **Test Regularly**
- After any changes
- Before promotions
- Monthly health check

📱 **Test on Mobile**
- Most customers use phones
- Check form usability
- Verify USSD works

## Moving to Live Mode:

After successful testing:
1. Switch to Live Mode
2. Update to Live API keys
3. Do one small real transaction
4. Verify money received
5. Ready for customers!

Remember: Always test thoroughly before accepting real payments!`,
    keywords: ['test', 'test card', 'practice', 'demo', 'test payment', 'sandbox']
  },

  {
    id: 'paystack-settlement-payout',
    category: 'payments',
    title: 'Settlements & Payouts',
    subtitle: 'How you receive your money',
    difficulty: 'intermediate',
    estimatedTime: '5 minutes',
    priority: 89,
    description: 'Understand how and when Paystack sends money to your bank account.',
    content: `**Understanding Paystack Settlements & Payouts**

## How Settlements Work:

**Automatic Daily Settlements**
Paystack automatically sends your money to your bank account - no manual withdrawal needed!

**⏰ Settlement Schedule:**

**T+1 Settlement (Next Business Day)**
- Monday payment → Tuesday settlement
- Tuesday payment → Wednesday settlement
- Wednesday payment → Thursday settlement
- Thursday payment → Friday settlement
- Friday payment → Monday settlement
- Weekend payments → Monday settlement

**Settlement Times:**
- Processing starts: 7:00 AM
- Arrives in bank: 7:00 AM - 12:00 PM
- Latest arrival: 2:00 PM

## Money Calculation:

**Example Transaction:**
\`\`\`
Customer pays: ₦10,000
Paystack fee: -₦250 (1.5% + ₦100)
You receive: ₦9,750
\`\`\`

**Daily Settlement Example:**
\`\`\`
Monday Sales:
Transaction 1: ₦10,000 - ₦250 = ₦9,750
Transaction 2: ₦5,000 - ₦175 = ₦4,825
Transaction 3: ₦20,000 - ₦400 = ₦19,600
Total Settlement: ₦34,175 (arrives Tuesday)
\`\`\`

## Tracking Your Money:

### In Paystack Dashboard:

**1. View Transactions**
- Go to "Transactions" tab
- See all payments received
- Filter by date/status
- Export for records

**2. Check Payouts**
- Go to "Payouts" section
- See settlement history
- Track pending settlements
- Download statements

**3. Settlement Email**
You receive daily emails with:
- Number of transactions
- Total amount collected
- Fees deducted
- Net amount settled

### Bank Notifications:

**What You'll See:**
- Credit alert from your bank
- Sender: "Paystack/YourBusinessName"
- Reference: Settlement batch ID
- Amount: Net after fees

## Settlement Rules:

**Minimum Settlement:**
- No minimum amount
- Even ₦100 is settled

**Maximum Settlement:**
- No maximum limit
- Large amounts may be split

**Public Holidays:**
- No settlements on public holidays
- Accumulated and sent next working day

**Bank Issues:**
- If bank has issues, retry next day
- You're notified of any problems
- Money never lost

## Common Questions:

**Q: Can I change settlement schedule?**
A: Contact Paystack for custom schedules (weekly/monthly)

**Q: Multiple bank accounts?**
A: Yes, can split between accounts

**Q: International settlements?**
A: Available for USD to domiciliary accounts

**Q: Instant settlements?**
A: Available for established accounts (fees apply)

## Tracking Best Practices:

**Daily Reconciliation:**
1. Check dashboard each morning
2. Match settlement with bank alert
3. Verify all transactions included
4. Note any discrepancies

**Monthly Accounting:**
- Export monthly statements
- Calculate total revenue
- Track fees paid
- Prepare tax records

**Record Keeping:**
- Save settlement emails
- Download monthly statements
- Keep transaction records
- Track for tax purposes

## Troubleshooting Settlements:

**Settlement Delayed?**
- Check if today is holiday
- Verify bank account active
- Check email for issues
- Contact support if > 2 days

**Amount Incorrect?**
- Check individual transactions
- Verify refunds processed
- Review fees calculation
- Check for chargebacks

**Not Receiving Settlements?**
- Verify bank details correct
- Ensure account can receive funds
- Check BVN verification complete
- Contact bank and Paystack

## Pro Tips:

💡 **Track Daily**: Check settlements every morning
💡 **Set Alerts**: Configure bank SMS alerts
💡 **Export Data**: Download monthly for accounting
💡 **Plan Cash Flow**: Remember T+1 timing
💡 **Keep Records**: For tax and accounting

## Settlement Security:

🔒 Settlements only go to verified bank
🔒 Cannot be redirected without verification
🔒 Email alerts for any changes
🔒 Two-factor authentication available

Remember: Your money is safe and automatically sent daily!`,
    keywords: ['settlement', 'payout', 'withdrawal', 'money', 'bank', 't+1']
  },

  {
    id: 'paystack-troubleshooting',
    category: 'payments',
    title: 'Fix Payment Issues',
    subtitle: 'Troubleshooting guide',
    difficulty: 'intermediate',
    estimatedTime: '5 minutes',
    priority: 88,
    description: 'Solve common Paystack payment problems quickly.',
    content: `**Paystack Troubleshooting Guide**

## Quick Diagnostic:

### 1️⃣ Check Your Mode
**Problem**: Payments not working
**Check**: Are you in the right mode?
- Test Mode = Only test cards work
- Live Mode = Only real cards work
**Solution**: Match your mode with card type

### 2️⃣ Verify API Keys
**Problem**: "Invalid API Key" error
**Check**:
- No extra spaces before/after keys
- Complete key copied (check mobile)
- Test keys for test mode
- Live keys for live mode
**Solution**: Re-copy and paste carefully

### 3️⃣ Customer Card Issues
**Problem**: Customer can't pay
**Common Causes**:
- Insufficient funds
- Card not enabled for online
- Daily limit exceeded
- Wrong PIN or OTP
- Network timeout
**Solutions**:
- Try different card
- Use bank transfer instead
- Contact their bank
- Increase online limit

## Common Issues & Solutions:

### "Payment Page Not Loading"

**Checks:**
1. Internet connection stable?
2. Browser cache cleared?
3. Ad blocker disabled?
4. JavaScript enabled?

**Solutions:**
- Clear browser cache
- Try incognito mode
- Try different browser
- Disable extensions

### "Transaction Declined"

**Reasons & Fixes:**
- **Insufficient funds** → Check balance
- **Wrong PIN** → Try again carefully
- **Daily limit** → Increase via bank app
- **Card expired** → Use different card
- **International block** → Enable international transactions

### "API Keys Not Working"

**Step-by-step Fix:**
1. Login to Paystack dashboard
2. Go to Settings → API Keys
3. Click "Show" to reveal keys
4. Copy entire key (scroll if needed)
5. Paste in StoreFront settings
6. Match mode (test/live)
7. Save and refresh

### "Payment Successful but Not Reflected"

**Where to Check:**
1. Paystack Dashboard → Transactions
2. Your email for receipt
3. Bank SMS alerts
4. StoreFront orders page

**If Still Missing:**
- Note transaction reference
- Check customer email used
- Contact support with reference

### "Can't See Paystack Option"

**Troubleshooting Steps:**
1. Verify account approved
2. Check keys are saved
3. Refresh store page
4. Clear browser cache
5. Try different device

### "Refund Not Received"

**Timeline:**
- Card refunds: 7-14 business days
- Transfer refunds: 24-48 hours

**To Track:**
1. Check refund status in dashboard
2. Verify with customer's bank
3. Get refund reference number

## Error Messages Explained:

**"Transaction could not be authorized"**
- Card details incorrect
- Insufficient funds
- Card blocked

**"Invalid transaction reference"**
- Payment already processed
- Session expired
- Try new payment

**"Gateway timeout"**
- Network issue
- Try again
- Use different connection

**"This authorization is already being processed"**
- Duplicate payment attempt
- Wait and check dashboard
- Don't retry immediately

## Quick Fixes to Try:

✅ **For Any Issue:**
1. Refresh the page
2. Clear browser cache
3. Try incognito mode
4. Try different browser
5. Check internet connection

✅ **For Payment Failures:**
1. Try different payment method
2. Use different card
3. Try bank transfer
4. Reduce amount (test limits)
5. Wait and retry

✅ **For Setup Issues:**
1. Re-enter API keys
2. Toggle test/live mode
3. Save settings again
4. Logout and login
5. Contact support

## Testing Checklist:

When issues occur, test:
- [ ] Test mode with test card works?
- [ ] Live mode with real card works?
- [ ] Different browser works?
- [ ] Mobile payment works?
- [ ] Different payment method works?

## Getting Help:

### Paystack Support:
- Email: support@paystack.com
- Live chat in dashboard
- Twitter: @paystack
- Phone: +234 908 566 2909

### What to Provide:
- Transaction reference
- Error message/screenshot
- Time of transaction
- Amount and payment method
- Customer email

### StoreFront Support:
- Check our help center
- Contact via chat widget
- Email support team

## Prevention Tips:

🛡️ **Avoid Issues:**
- Always test after changes
- Keep keys secure
- Monitor daily transactions
- Verify bank details
- Update regularly

Remember: Most issues have simple solutions. Try quick fixes first!`,
    keywords: ['troubleshooting', 'error', 'problem', 'not working', 'failed', 'fix']
  }
];

// Combine with existing documentation
export function getPaystackDocumentation(): Documentation[] {
  return paystackDocumentation;
}