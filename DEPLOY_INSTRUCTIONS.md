# 🚀 Deployment Instructions - Advanced Image Enhancement System

## Quick Deploy (3 Steps)

### **Step 1: Login to Firebase**

Open your terminal in this directory and run:

```bash
firebase login
```

This will:
- Open your browser for Google authentication
- Ask you to authorize Firebase CLI
- Return you to the terminal when complete

If you're already logged in, you'll see: `Already logged in as <your-email>`

---

### **Step 2: Run the Deployment Script**

```bash
./deploy-imaging.sh
```

This script will automatically:
- ✅ Verify Firebase authentication
- ✅ Build the Cloud Functions
- ✅ Deploy to Firebase project: `storehouse-67e67`

**Expected output:**
```
🚀 Deploying Advanced Image Enhancement System...
📋 Step 1: Checking Firebase authentication...
✅ Firebase authentication confirmed
📋 Step 2: Verifying project...
Using project: storehouse-67e67
📋 Step 3: Building Cloud Functions...
✅ Build successful
📋 Step 4: Deploying to Firebase...
✔ functions: Finished running predeploy script.
✔ functions[processProductImage(us-central1)]: Successful create operation.
✔ Deploy complete!
✅ DEPLOYMENT SUCCESSFUL! 🎉
```

---

### **Step 3: Test the System**

After deployment, test with:

```bash
# View function logs in real-time
firebase functions:log --only processProductImage

# Or check recent logs
firebase functions:log
```

---

## Manual Deployment (Alternative)

If you prefer to deploy manually:

```bash
# 1. Login
firebase login

# 2. Build functions
cd functions
npm run build
cd ..

# 3. Deploy
firebase deploy --only functions
```

---

## What Gets Deployed?

✅ **Cloud Function:** `processProductImage`
- **Trigger:** Storage upload to `products/` folder
- **Region:** us-central1
- **Memory:** 2GB
- **Timeout:** 540 seconds (9 minutes)
- **Runtime:** Node.js 18

✅ **Dependencies:**
- firebase-admin (Firestore, Storage access)
- firebase-functions (Cloud Functions runtime)
- sharp (Image processing library)

---

## After Deployment

### Test Upload

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Navigate to **Storage** → `storehouse-67e67`
3. Upload a test image to the `products/` folder
4. Watch the Cloud Function process it automatically

### Verify Success

After uploading, check:

**Storage:**
- ✅ Original in `products/your-image.jpg`
- ✅ 18 variants in `products/variants/{hash}/`

**Firestore:**
- ✅ Document in `image_cache/{hash}` collection
- ✅ Contains: contentHash, lqip, variants, widths, formats

**Logs:**
```bash
firebase functions:log
```

Should show:
```
[Enhance] Triggered for: products/test.jpg
[Enhance] Image: 4000x3000, hash: a1b2c3d4e5f6g7h8
[Enhance] Generating variants...
[Enhance] ✅ Complete! Generated 18 variants in 23456ms
```

---

## Troubleshooting

### "Not logged in to Firebase"

Run: `firebase login`

### "Permission denied"

Make sure you have **Editor** or **Owner** role on the Firebase project.

### "Build failed"

```bash
cd functions
npm install
npm run build
```

Check for TypeScript errors.

### "Deployment failed"

Check if you have the Blaze (pay-as-you-go) plan enabled. Cloud Functions require it.

Enable at: [Firebase Console](https://console.firebase.google.com) → Project Settings → Usage and billing

---

## Cost Information

**Firebase Blaze Plan:**
- Free tier: 2M invocations/month, 400K GB-seconds
- Your expected usage: ~$1-5/month for 1,000 products

**No charges** until you exceed free tier limits.

---

## Next Steps After Deployment

1. ✅ **Integrate with your product upload form**
   - Use `useSmartImage` hook from `/src/hooks/useSmartImage.ts`

2. ✅ **Update product display pages**
   - Replace `<img>` tags with `SmartPicture` component

3. ✅ **Test with real product images**
   - Upload 5-10 test images
   - Verify variants are generated
   - Check image quality and load times

4. ✅ **Monitor performance**
   - Check Cloud Function logs regularly
   - Monitor Storage usage in Firebase Console
   - Track bandwidth savings

---

## Support

If you encounter issues:

1. Check logs: `firebase functions:log`
2. Verify Firebase project settings
3. Check Firebase Console for errors
4. Review the full documentation in `IMAGING_SYSTEM.md`

---

**Ready to deploy?**

```bash
firebase login
./deploy-imaging.sh
```

🚀 Let's make your images world-class!
