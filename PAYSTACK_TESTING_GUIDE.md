# 🧪 Paystack Integration - Developer Testing Guide

> ⚠️ **IMPORTANT:** This test page is for DEVELOPER USE ONLY. Regular users (store owners) will never see this page.

## ✅ What's Been Built

### For Store Owners (Production):
1. **PaymentSettings** (`src/components/PaymentSettings.tsx`)
   - In Business Settings → Payment Integration
   - Store owners enter their Paystack keys here
   - Saves to localStorage
   - ✅ **Keep this - it's for your users**

2. **Checkout** (`src/components/Checkout.jsx`)
   - Payment modal shown to customers
   - Integrates with Paystack Inline
   - Reads keys from localStorage
   - ✅ **This is what customers see when paying**

### For Developers Only (Hidden):
3. **TestPayment** (`src/pages/TestPayment.jsx`)
   - Complete test page with sample product
   - Only for development/testing
   - ⚠️ **Hidden from regular users**

---

## 🚀 How to Test (DEVELOPER ONLY)

### Step 1: Enable Test Mode (Browser Console)

**Method 1: Browser Console**
1. Open your app: `http://localhost:4000`
2. Press `F12` to open DevTools
3. Go to **Console** tab
4. Type this command and press Enter:
```javascript
localStorage.setItem('storehouse-test-mode', 'true')
```
5. Refresh the page (`F5`)
6. The test page will now appear!

**Method 2: Application Storage**
1. Open DevTools (`F12`)
2. Go to **Application** tab → **Local Storage**
3. Click on `http://localhost:4000`
4. Add new item:
   - Key: `storehouse-test-mode`
   - Value: `true`
5. Refresh the page

### Step 1b: Return to Normal App

To go back to the main app:
```javascript
localStorage.setItem('storehouse-test-mode', 'false')
```
Then refresh the page.

### Step 2: Configure Paystack

1. On the Test Payment page, click **"Business Settings"** button
2. Scroll down and expand **"💳 Payment Integration"** section
3. Check **"Enable Paystack Payments"**
4. Check **"Test Mode"** checkbox
5. Enter your Test Public Key: `pk_test_...`
   - Get from: https://dashboard.paystack.com/settings#api-keys-webhooks
6. Click **"💾 Save Payment Settings"**
7. Close the Settings modal

### Step 3: Verify Status

After saving, you should see:
- ✅ **Paystack Integration:** ✅ Enabled (green)
- 🧪 **Payment Mode:** 🧪 TEST MODE (yellow)
- **Active Key:** `pk_test_...` (first 20 characters)

### Step 4: Test Payment Flow

1. Click the **"Buy Now - ₦5,000"** button on the sample product
2. In the checkout modal:
   - Enter any email: `test@example.com`
   - Click **"Pay ₦5,000"**
3. Paystack payment modal opens
4. Use one of the test cards from the page:

#### Test Cards:

**✓ Success Card:**
```
Card Number: 4084 0840 8408 4081
Expiry:      12/26
CVV:         408
PIN:         1234
```

**✗ Declined Card:**
```
Card Number: 5060 6666 6666 6666
Expiry:      12/26
CVV:         123
PIN:         1234
```

**⚠ Insufficient Funds:**
```
Card Number: 4084 0840 8408 4084
Expiry:      12/26
CVV:         408
PIN:         1234
```

### Step 5: Complete Payment

1. Enter card details from the test card
2. Click **"Pay"**
3. Enter PIN when prompted: `1234`
4. Payment should succeed!
5. You'll see a success alert with:
   - Reference number
   - Amount
   - Email
   - Product name

### Step 6: Return to Main App

Click **"← Back to App"** button in the header to return to your main inventory app.

---

## 🔧 Advanced Testing

### Testing Different Scenarios:

#### 1. No API Key Set
- Disable Paystack in settings
- Try to buy → Should show error: "⚠️ Paystack is not configured"

#### 2. Invalid Email
- Enter invalid email (e.g., `notanemail`)
- Try to pay → Should show: "Please enter a valid email address"

#### 3. Test Mode Warning
- Enable test mode
- Check that yellow banner appears: "⚠️ Test mode active"

#### 4. Live Mode
- Uncheck "Test Mode"
- Enter Live Public Key
- Status should show: "🔴 LIVE MODE"

---

## 📁 File Structure

```
src/
├── components/
│   ├── BusinessSettings.tsx     # Settings modal
│   ├── PaymentSettings.tsx      # Paystack config section
│   ├── Checkout.jsx             # Payment modal
│   └── CheckoutDemo.jsx         # Standalone demo
│
├── pages/
│   └── TestPayment.jsx          # Complete test page
│
├── styles/
│   ├── PaymentSettings.css      # Payment settings styles
│   ├── Checkout.css             # Checkout modal styles
│   └── TestPayment.css          # Test page styles
│
├── utils/
│   └── paystackSettings.ts      # localStorage helpers
│
└── App.jsx                      # Main app (integrated)
```

---

## 🔌 Integration with Your Sales System

### Example: Add to RecordSale Modal

```jsx
import Checkout from './components/Checkout';

function RecordSaleModal() {
  const [showCheckout, setShowCheckout] = useState(false);
  const [saleData, setSaleData] = useState(null);

  const handlePaymentSuccess = (paymentData) => {
    // Save sale with payment reference
    const sale = {
      ...saleData,
      paymentMethod: 'Card',
      paymentReference: paymentData.reference,
      status: 'PAID',
      paidAt: new Date().toISOString()
    };

    saveSale(sale);
    setShowCheckout(false);
  };

  return (
    <>
      {/* Your existing sale form */}
      <button onClick={() => setShowCheckout(true)}>
        Pay with Card
      </button>

      {showCheckout && (
        <Checkout
          productName={saleData.itemName}
          amount={saleData.totalAmount}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </>
  );
}
```

---

## 🐛 Troubleshooting

### Issue: Paystack modal doesn't open
**Solution:** Check browser console for errors. Make sure you saved API keys correctly.

### Issue: "Payment system not configured"
**Solution:**
1. Open Business Settings
2. Make sure "Enable Paystack Payments" is checked
3. Enter Test Public Key
4. Save settings

### Issue: Test card declined
**Solution:** Make sure you're using the exact test card numbers provided above with PIN `1234`.

### Issue: Settings not saving
**Solution:** Check browser console. Make sure localStorage is not blocked.

---

## 📊 LocalStorage Data Structure

### Paystack Config:
```javascript
// Key: 'storehouse-paystack-config'
{
  enabled: true,
  testMode: true,
  publicKeyTest: "pk_test_...",
  publicKeyLive: "pk_live_..."
}
```

### Test Mode Toggle:
```javascript
// Key: 'storehouse-test-mode'
true  // Show test page
false // Show main app
```

---

## 🎯 Production Checklist

Before going live with real payments:

- [ ] Get live public key from Paystack Dashboard
- [ ] Add live public key to settings
- [ ] **UNCHECK "Test Mode"**
- [ ] Test with a real card (small amount)
- [ ] Verify webhook integration (optional but recommended)
- [ ] Set up proper error logging
- [ ] Add payment receipts/confirmations
- [ ] Implement order tracking

---

## 🔐 Security Notes

✅ **Safe:**
- Public keys stored in localStorage (public by design)
- Client-side only integration
- Test mode clearly indicated

⚠️ **Remember:**
- Never store secret keys in frontend
- Always verify payments on backend (recommended)
- Use webhooks for order confirmation
- Validate amounts on server-side

---

## 📞 Support

### Paystack Resources:
- Dashboard: https://dashboard.paystack.com
- Documentation: https://paystack.com/docs
- Test Cards: https://paystack.com/docs/payments/test-payments

### Local Testing:
- Dev Server: http://localhost:4000
- Test Page: Click 🧪 button in header
- Main App: Click "← Back to App"

---

## 🎉 Quick Start Summary (Developer)

**Enable Test Page:**
```javascript
localStorage.setItem('storehouse-test-mode', 'true')
// Then refresh page
```

**Test Flow:**
1. Configure: Business Settings → Payment Integration
2. Test: Use test card `4084 0840 8408 4081`
3. Integrate: Import `Checkout` component in your sale flow
4. Deploy: Remove test page from production

**Disable Test Page:**
```javascript
localStorage.setItem('storehouse-test-mode', 'false')
// Or just delete the key from localStorage
```

---

## 👥 Production User Flow (Store Owners)

Your users will:

1. **Setup (One-time):**
   - Open your app
   - Click Settings → Payment Integration
   - Enable Paystack
   - Enter their test/live public keys
   - Save

2. **Their Customers:**
   - Browse products in the store
   - Click "Buy" or "Checkout"
   - See the `Checkout` component (payment modal)
   - Enter email
   - Pay with Paystack
   - Done!

**Users will NEVER see the TestPayment page** - it's dev-only! ✅

---

**Happy Testing! 🚀**
