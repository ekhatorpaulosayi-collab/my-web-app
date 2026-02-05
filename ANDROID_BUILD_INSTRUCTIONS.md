# 🚀 Storehouse Android App - Google Play Store Publishing Guide

## ✅ What We've Completed

Your Storehouse web app has been successfully converted to an Android app using Capacitor!

**Completed Steps:**
- ✅ Installed Capacitor
- ✅ Initialized Android project
- ✅ Configured permissions (Camera, Storage, Internet, etc.)
- ✅ Built production web app
- ✅ Synced to Android project

**Your Android project is now located at:** `/home/ekhator1/smartstock-v2/android/`

---

## 📱 Next Steps: Building & Publishing to Google Play Store

### **Step 1: Install Android Studio** (If Not Already Installed)

1. Download Android Studio from: https://developer.android.com/studio
2. Install it on your Windows machine
3. During installation, make sure to install:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (for testing)

---

### **Step 2: Open Project in Android Studio**

1. Open Android Studio
2. Click **"Open an Existing Project"**
3. Navigate to: `/home/ekhator1/smartstock-v2/android`
4. Wait for Gradle sync to complete (may take 5-10 minutes first time)

---

### **Step 3: Test the App**

**Option A: Test on Virtual Device (Emulator)**
1. In Android Studio, click **"Device Manager"** (phone icon on right)
2. Click **"Create Device"**
3. Select a phone (e.g., Pixel 5)
4. Download a system image (e.g., Android 13)
5. Click **▶️ Run** button
6. Your app will launch in the emulator

**Option B: Test on Real Phone (Recommended)**
1. Enable **Developer Options** on your Android phone:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
2. Enable **USB Debugging**:
   - Settings → Developer Options → USB Debugging
3. Connect phone via USB
4. Click **▶️ Run** in Android Studio
5. Select your phone from the list

**Test these features:**
- ✅ Camera (add product image)
- ✅ Login/Signup
- ✅ Add product
- ✅ Record sale
- ✅ Paystack payment

---

### **Step 4: Generate Signed APK/AAB for Play Store**

**4.1: Create a Keystore (First Time Only)**

1. In Android Studio, go to: **Build → Generate Signed Bundle / APK**
2. Select **Android App Bundle**
3. Click **Create new...** (under Key store path)
4. Fill in details:
   ```
   Key store path: C:\Users\YourName\storehouse-keystore.jks
   Password: [Create a strong password]
   Alias: storehouse-key
   Password: [Same or different password]
   Validity: 25 years

   Certificate:
   First and Last Name: [Your Name]
   Organizational Unit: Storehouse
   Organization: Storehouse
   City/Locality: [Your City]
   State/Province: [Your State]
   Country Code: NG
   ```
5. Click **OK**

**⚠️ CRITICAL: BACKUP YOUR KEYSTORE!**
- Copy `storehouse-keystore.jks` to a safe location
- Store passwords securely
- **If you lose this, you can NEVER update your app on Play Store!**

**4.2: Build the App Bundle**

1. Select your keystore
2. Enter passwords
3. Select build variant: **release**
4. Destination folder: Choose where to save
5. Click **Finish**

Wait for build to complete. You'll get a file:
```
app-release.aab
```

This is your **Android App Bundle** for Google Play Store!

---

### **Step 5: Create Google Play Console Account**

1. Go to: https://play.google.com/console
2. Click **"Create Developer Account"**
3. Pay **$25 one-time fee** (credit/debit card)
4. Fill in developer profile:
   - Developer name: Storehouse or [Your Name/Company]
   - Email address
   - Phone number
5. Accept agreements
6. Submit

**Processing time:** Usually instant, but can take up to 48 hours

---

### **Step 6: Create Your App Listing**

1. In Play Console, click **"Create app"**
2. Fill in details:

**App Details:**
```
App name: Storehouse - Inventory Management
Default language: English (United States)
App or game: App
Free or paid: Free
```

**Category:**
```
Category: Business
```

**Contact details:**
```
Email: [Your support email]
Phone: [Your business phone]
Website: https://smartstock-v2.vercel.app
```

**Privacy policy:**
```
[You need to create a simple privacy policy]
URL: [Your privacy policy page]
```

3. Click **"Create app"**

---

### **Step 7: Fill Out Store Listing**

**App Details:**
```
Short description (80 chars max):
"Manage inventory, sales, customers & invoices for Nigerian businesses"

Full description (4000 chars max):
"Storehouse is Nigeria's #1 inventory management app for small businesses.

✅ Manage Products & Inventory
Track stock levels, add product images, set reorder alerts, scan barcodes

✅ Record Sales (Cash & Credit)
Fast sales recording, customer debt tracking, WhatsApp receipts

✅ Customer Management
Track customer purchases, debts, payment history

✅ Professional Invoices
Create beautiful invoices, send via WhatsApp, track payments

✅ Online Store
Sell 24/7 with your own online storefront, accept Paystack payments

✅ Staff Management
Add cashiers & managers with PIN login, track staff sales

✅ Reports & Analytics
Daily/monthly reports, profit tracking, sales trends

✅ WhatsApp Integration
Send receipts, payment reminders, daily reports via WhatsApp

Perfect for:
• Retailers & Shops
• Wholesalers
• Fashion Boutiques
• Electronics Stores
• Food & Grocery
• Pharmacies

Made for Nigerian businesses with support for:
• Naira (₦) currency
• OPay, Moniepoint, PalmPay
• Paystack payments
• WhatsApp Business

Start FREE - No credit card required!"
```

**App Icon:**
- Upload `/home/ekhator1/smartstock-v2/public/icon-512.png`

**Screenshots** (You need to create these):
- Minimum 2 screenshots
- Recommended size: 1080 x 1920 pixels (phone screenshots)
- Show: Dashboard, Products, Sales, Reports

**Feature Graphic:**
- Size: 1024 x 500 pixels
- Create a banner with app name and key features

**Video (Optional but recommended):**
- YouTube demo video of the app

---

### **Step 8: Upload App Bundle**

1. Go to **"Production"** (left sidebar)
2. Click **"Create new release"**
3. Click **"Upload"** and select your `app-release.aab` file
4. Fill in release notes:
```
Initial release of Storehouse inventory management app.

Features:
• Product & inventory management
• Sales tracking (cash & credit)
• Customer management
• Invoice generation
• Online store creation
• Staff management
• WhatsApp integration
• Paystack payments
```

5. Click **"Next"**

---

### **Step 9: Content Rating**

1. Go to **"Content rating"**
2. Click **"Start questionnaire"**
3. Fill honestly:
   - App category: Business/Productivity
   - No violence, gambling, mature content
4. Submit

You'll get rating: **Everyone** or **Teen**

---

### **Step 10: App Content**

Fill out:
- **Target audience**: Adults (18+)
- **Privacy policy**: [URL to your privacy policy]
- **Ads**: No ads (unless you have ads)
- **App access**: Select "All functionality is available without restrictions"
- **Data safety**: Fill out what data you collect (email, phone, business data)

---

### **Step 11: Submit for Review**

1. Review all sections (all should have green checkmarks)
2. Click **"Send for review"**
3. Wait for Google's review (usually 1-3 days)

**You'll receive email when:**
- App is approved ✅
- App is live on Play Store 🎉
- Issues found (if any) ❌

---

## 🔄 Updating Your App (Future Releases)

When you make changes to Storehouse:

```bash
# 1. Make your changes to the code
# 2. Build web app
npm run build

# 3. Sync to Android
npx cap sync android

# 4. Open in Android Studio
cd android
# (Open Android Studio)

# 5. Increment version number
# In android/app/build.gradle:
versionCode = 2  // Increment this
versionName = "1.1"  // Update this

# 6. Build new AAB (same as Step 4 above)
# 7. Upload to Play Console as new release
```

---

## 📝 Additional Files You Need

### **1. Privacy Policy**

Create a simple page at: `https://smartstock-v2.vercel.app/privacy-policy`

Sample template:
```
Privacy Policy for Storehouse

Last updated: [Date]

Storehouse ("us", "we", or "our") operates the Storehouse mobile application.

Information Collection and Use:
We collect:
- Email address and phone number for account creation
- Business information (products, sales, customers)
- Device information for app functionality

How We Use Information:
- Provide and maintain the app
- Notify you about changes
- Provide customer support
- Gather analysis to improve the app

Data Storage:
- Data is stored securely using Supabase
- We use industry-standard encryption

Your Rights:
- Access your data
- Delete your account
- Export your data

Contact Us:
For privacy questions: [your-email@example.com]
```

### **2. Terms of Service**

Create at: `https://smartstock-v2.vercel.app/terms`

---

## 🎯 Quick Checklist

Before submitting:
- [ ] App tested on real Android device
- [ ] All features work (camera, payments, etc.)
- [ ] Created keystore and backed it up
- [ ] Built signed AAB file
- [ ] Created Play Console account ($25)
- [ ] Prepared 2+ screenshots
- [ ] Created privacy policy page
- [ ] Filled out all Play Console sections
- [ ] Submitted for review

---

## 🆘 Common Issues & Solutions

**Issue: "Gradle sync failed"**
- Solution: Click "Sync Project with Gradle Files" button

**Issue: "SDK not found"**
- Solution: Tools → SDK Manager → Install Android SDK 33

**Issue: "App crashes on startup"**
- Solution: Check Android Studio Logcat for errors

**Issue: "Camera not working"**
- Solution: Permissions already added, test on real device

---

## 📞 Need Help?

If you encounter issues:
1. Check Android Studio Logcat for errors
2. Google the specific error message
3. Check Capacitor docs: https://capacitorjs.com/docs/android
4. Stack Overflow: https://stackoverflow.com/questions/tagged/capacitor

---

## 🎉 Success!

Once approved, your app will be live at:
```
https://play.google.com/store/apps/details?id=com.storehouse.app
```

Users can search "Storehouse" or "Storehouse Inventory" to find it!

---

**Your Android project location:**
`/home/ekhator1/smartstock-v2/android/`

**Capacitor config:**
`/home/ekhator1/smartstock-v2/capacitor.config.json`

**Good luck! 🚀**
