# 📱 Storehouse TWA (Trusted Web Activity) Setup Guide

Complete guide to publishing Storehouse on Google Play Store

---

## ⏱️ TIMELINE

- **Setup time:** 2-3 hours
- **Google review:** 1-7 days (usually 2-3 days)
- **Total to launch:** 3-10 days

---

## 💰 COSTS

| Item | Cost | When |
|------|------|------|
| Google Play Developer Account | $25 (~₦40,000) | One-time |
| Domain (storehouse.ng) | ₦2,500 | Per year |
| Everything else | FREE | - |

---

## 📋 PREREQUISITES

Before starting, make sure you have:

- ✅ Domain purchased (storehouse.ng)
- ✅ Domain pointing to Vercel (DNS configured)
- ✅ App accessible at https://storehouse.ng
- ✅ SSL certificate active (automatic with Vercel)
- ✅ Google account for Play Console
- ✅ Node.js installed (check: `node --version`)

---

## STEP 1: Install Bubblewrap CLI

Bubblewrap is Google's official tool for creating TWAs.

```bash
npm install -g @bubblewrap/cli
```

Verify installation:
```bash
bubblewrap --version
```

---

## STEP 2: Initialize TWA Project

Navigate to a new directory:

```bash
cd ~
mkdir storehouse-twa
cd storehouse-twa
```

Initialize Bubblewrap:

```bash
bubblewrap init --manifest https://storehouse.ng/manifest.webmanifest
```

**Answer the prompts:**

```
? Domain being opened in the TWA: storehouse.ng
? Name of the application: Storehouse
? Short name of the application: Storehouse
? Color (HTML format): #2063F0
? Background color (HTML format): #ffffff
? Display mode: standalone
? Orientation: portrait
? Icon URL: https://storehouse.ng/icon-512.png
? Maskable icon URL: (leave blank, press Enter)
? Monochrome icon URL: (leave blank, press Enter)
? Start URL: /
? Fallback URL (offline): /offline.html
? Enable Notification Delegation: Yes
? Enable Location Delegation: No
? Enable Google Play Billing: No
? Package ID: ng.storehouse.app
? App version name: 1.0.0
? App version code: 1
? Enable Site Settings Shortcut: Yes
? Enable PWA Install: No
? Signing key alias: storehouse_key
? Signing key path: ./storehouse.keystore
? Signing key password: [CREATE A STRONG PASSWORD]
```

**IMPORTANT:** Save your keystore password somewhere safe!

---

## STEP 3: Generate Signing Key

The init command creates a keystore, but if you need to create one manually:

```bash
keytool -genkey -v -keystore storehouse.keystore \
  -alias storehouse_key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Fill in the details:**
- Password: [Strong password]
- First and Last Name: Storehouse
- Organization: Storehouse
- City: Lagos
- State: Lagos
- Country: NG

**⚠️ CRITICAL:** Backup your keystore file! You can't update your app without it!

```bash
# Backup to a safe location
cp storehouse.keystore ~/backup/
```

---

## STEP 4: Build the Android App

Build the Android App Bundle (.aab):

```bash
bubblewrap build
```

This creates:
- `app-release-bundle.aab` - Upload to Play Store
- `app-release-signed.apk` - For testing

---

## STEP 5: Test the APK Locally

Install on Android device for testing:

```bash
# Connect Android phone via USB with Developer Mode enabled
adb install app-release-signed.apk
```

Or use Android Studio emulator.

**Test checklist:**
- ✅ App opens to your website
- ✅ Navigation works
- ✅ Login works
- ✅ Offline mode works
- ✅ Back button behaves correctly
- ✅ App doesn't show browser UI

---

## STEP 6: Register Google Play Console Account

1. Go to: https://play.google.com/console
2. Click "Sign up"
3. Pay $25 one-time fee
4. Complete developer profile:
   - Developer name: Your name or company
   - Email: Your business email
   - Website: https://storehouse.ng
   - Phone: Your phone number

**Verification:** Google may ask for ID verification (1-2 days)

---

## STEP 7: Create App in Play Console

1. Go to: https://play.google.com/console
2. Click "Create app"
3. Fill in details:

**App Details:**
- App name: `Storehouse: Inventory & Market`
- Default language: English (UK) - en_GB
- App or game: App
- Free or paid: Free
- Declarations: Check all boxes

4. Click "Create app"

---

## STEP 8: Set Up App Store Listing

### **Main Store Listing**

**App details:**
- Short description (80 chars max):
  ```
  Manage inventory, track sales, and sell on our marketplace. Built for Nigeria.
  ```

- Full description (4000 chars max):
  ```
  **Storehouse: Africa's #1 Inventory Management Platform**

  Manage your inventory, track sales, record credits, and sell excess stock on our marketplace—all from your phone. Built specifically for Nigerian retailers.

  **KEY FEATURES:**

  📦 INVENTORY MANAGEMENT
  • Track stock levels in real-time
  • Low stock alerts
  • Barcode scanning
  • Multi-location support
  • Product variants (sizes, colors)

  💰 SALES TRACKING
  • Quick sale recording
  • Multiple payment methods
  • Instant WhatsApp receipts
  • Profit tracking
  • Sales analytics

  🏪 STOREHOUSE MARKET (Coming Soon)
  • Buy and sell with verified businesses
  • Wholesale pricing
  • Secure transactions
  • Africa-wide delivery

  👥 CUSTOMER MANAGEMENT
  • Customer database
  • Credit/debt tracking
  • Automated payment reminders
  • Purchase history

  📊 SMART REPORTS
  • Daily/weekly/monthly reports
  • Best sellers analytics
  • Profit margins
  • Export to Excel

  ⚡ WORKS OFFLINE
  • No internet? No problem!
  • Auto-sync when online
  • Never lose data

  💬 24/7 AI ASSISTANT
  • Instant answers to questions
  • Business tips
  • Product support

  **WHO IS THIS FOR?**
  • Fashion boutiques
  • Phone & electronics shops
  • Supermarkets
  • Pharmacies
  • Beauty & cosmetics stores
  • Any retail business in Nigeria

  **PRICING:**
  • FREE plan: Up to 50 products
  • Starter: ₦5,000/month (200 products)
  • Pro: ₦10,000/month (unlimited products + AI assistant)
  • Business: ₦15,000/month (enterprise features)

  **WHY STOREHOUSE?**
  ✅ Built for Nigerian businesses
  ✅ Works on any device
  ✅ Optimized for slow networks
  ✅ Bank-level security
  ✅ 30-day money-back guarantee
  ✅ Nigerian customer support

  **CONTACT US:**
  WhatsApp: [Your WhatsApp]
  Email: support@storehouse.ng
  Website: https://storehouse.ng

  Start managing your business like a pro. Download Storehouse today!
  ```

**App Icon:**
- Upload: `/public/icon-512.png`
- Size: 512x512px
- Format: PNG

**Feature Graphic:**
- Size: 1024x500px
- Create with Canva (see guide below)

**Screenshots (Required):**
- Phone: At least 2 screenshots (1080x1920px or 1080x2340px)
- 7-inch tablet: Optional but recommended
- 10-inch tablet: Optional

**Video (Optional but recommended):**
- YouTube demo video
- 30-60 seconds showing key features

---

## STEP 9: Content Rating

1. Go to "Content rating" section
2. Start questionnaire
3. Select category: "Utility, Productivity, Communication, or Other"
4. Answer questions honestly:
   - Violence: No
   - Sexual content: No
   - Profanity: No
   - Controlled substances: No
   - Gambling: No
   - etc.
5. Get rating (usually "Everyone" or "Everyone 3+")

---

## STEP 10: Target Audience & Content

**Target age:**
- Check: "18 and older"

**Store presence:**
- Countries: Nigeria (add more later: Kenya, Ghana, South Africa)

**Ads:**
- Contains ads: No (unless you add ads later)

---

## STEP 11: Upload App Bundle

1. Go to "Production" → "Create new release"
2. Upload `app-release-bundle.aab`
3. Release name: `1.0.0 - Initial Release`
4. Release notes:
   ```
   Initial release of Storehouse!

   Features:
   • Inventory management
   • Sales tracking
   • Customer management
   • Credit/debt tracking
   • Smart reports
   • Works offline
   • 24/7 AI assistant

   Start managing your business today!
   ```

---

## STEP 12: Privacy Policy

**Required!** Create a simple privacy policy:

1. Use: https://www.freeprivacypolicy.com/
2. Or use this template:

```
STOREHOUSE PRIVACY POLICY

Last updated: [Date]

Storehouse ("we", "our", "us") operates the Storehouse mobile application.

INFORMATION WE COLLECT:
• Account information (name, email, phone)
• Business data (products, sales, customers)
• Usage data (features used, time spent)

HOW WE USE YOUR DATA:
• Provide and improve our service
• Send important updates
• Customer support
• Analytics

DATA STORAGE:
• Encrypted on secure servers
• Regular backups
• Not shared with third parties

YOUR RIGHTS:
• Access your data anytime
• Export data to Excel
• Delete account and data
• Request data removal

SECURITY:
• Bank-level encryption
• Secure authentication
• Regular security audits

CONTACT:
Email: privacy@storehouse.ng

By using Storehouse, you agree to this policy.
```

3. Host at: `https://storehouse.ng/privacy-policy`
4. Add URL to Play Console

---

## STEP 13: Submit for Review

1. Review all sections (must be green checkmarks)
2. Click "Send for review"
3. Wait 1-7 days for Google approval

**What Google checks:**
- App functionality
- Content compliance
- Privacy policy
- Metadata accuracy
- Technical requirements

---

## 🎊 AFTER APPROVAL

Your app goes live automatically!

**Post-launch checklist:**
- ✅ Test install from Play Store
- ✅ Share Play Store link on social media
- ✅ Add Play Store badge to website
- ✅ Monitor reviews and ratings
- ✅ Respond to user feedback

---

## 📸 CREATING SCREENSHOTS & ASSETS

### **Feature Graphic (1024x500px)**

Use Canva: https://www.canva.com/

Template:
- Background: Gradient (#2063F0 to #1850C9)
- Text: "Storehouse: Inventory & Market"
- Subtitle: "Manage Your Business. Sell on Our Marketplace."
- Image: Phone mockup showing your app

### **Screenshots (1080x1920px)**

Take screenshots of:
1. Dashboard (main screen)
2. Add product screen
3. Sales recording screen
4. Reports screen
5. Online store preview

Use Android emulator or physical device.

---

## 🔄 UPDATING YOUR APP

When you make changes to your website:

1. Update version in `twa-manifest.json`:
   ```json
   {
     "versionName": "1.1.0",
     "versionCode": 2
   }
   ```

2. Rebuild:
   ```bash
   bubblewrap build
   ```

3. Upload new `.aab` to Play Console
4. Submit new release

**TWA auto-updates:** Users automatically get web updates without Play Store approval!

---

## ⚠️ TROUBLESHOOTING

**"App not opening"**
- Check Digital Asset Links (Step 14 below)
- Verify SSL certificate is active
- Test manifest.webmanifest URL

**"Build failed"**
- Update Bubblewrap: `npm update -g @bubblewrap/cli`
- Check keystore password
- Verify manifest.webmanifest is valid JSON

**"Google rejected app"**
- Read rejection email carefully
- Fix issues mentioned
- Resubmit

---

## 🔐 STEP 14: Digital Asset Links (CRITICAL!)

This links your website to your Android app.

Create file at: `/public/.well-known/assetlinks.json`

Content:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "ng.storehouse.app",
    "sha256_cert_fingerprints": [
      "[YOUR_SHA256_FINGERPRINT]"
    ]
  }
}]
```

**Get your SHA256 fingerprint:**
```bash
keytool -list -v -keystore storehouse.keystore -alias storehouse_key
```

Copy the SHA256 value and paste into assetlinks.json.

**Test:** https://storehouse.ng/.well-known/assetlinks.json should return the JSON.

---

## 📊 ANALYTICS

Track app performance:

**Google Play Console:**
- Downloads
- Active users
- Ratings
- Reviews
- Crash reports

**Your Analytics:**
- Already tracked via your website analytics
- No additional setup needed!

---

## 🎯 MARKETING YOUR APP

**Play Store badge:**
```html
<a href="https://play.google.com/store/apps/details?id=ng.storehouse.app">
  <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" height="60">
</a>
```

**Share links:**
- Play Store: `https://play.google.com/store/apps/details?id=ng.storehouse.app`
- Direct install: `market://details?id=ng.storehouse.app`

---

## ✅ CHECKLIST

Before submitting:

- [ ] Domain purchased and configured
- [ ] App accessible at https://storehouse.ng
- [ ] SSL certificate active
- [ ] manifest.webmanifest accessible
- [ ] Service worker working
- [ ] Icons created (512x512)
- [ ] TWA built and tested
- [ ] Screenshots taken (at least 2)
- [ ] Feature graphic created (1024x500)
- [ ] Privacy policy published
- [ ] assetlinks.json deployed
- [ ] Google Play account created
- [ ] App listing completed
- [ ] Content rating obtained
- [ ] Release notes written
- [ ] App bundle uploaded

---

## 🚀 QUICK START COMMANDS

```bash
# Install Bubblewrap
npm install -g @bubblewrap/cli

# Create TWA
mkdir storehouse-twa && cd storehouse-twa
bubblewrap init --manifest https://storehouse.ng/manifest.webmanifest

# Build
bubblewrap build

# Test
adb install app-release-signed.apk

# Get SHA256 for assetlinks
keytool -list -v -keystore storehouse.keystore -alias storehouse_key
```

---

## 📞 NEED HELP?

- Bubblewrap docs: https://github.com/GoogleChromeLabs/bubblewrap
- TWA Guide: https://developer.chrome.com/docs/android/trusted-web-activity/
- Play Console: https://support.google.com/googleplay/android-developer/

---

**Good luck with your launch! 🎉**
