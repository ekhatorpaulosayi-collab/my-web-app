#!/bin/bash

# Deploy Advanced Image Enhancement System to Firebase
# Project: storehouse-67e67

echo "🚀 Deploying Advanced Image Enhancement System..."
echo ""

# Check if logged in
echo "📋 Step 1: Checking Firebase authentication..."
if ! firebase projects:list > /dev/null 2>&1; then
    echo "❌ Not logged in to Firebase!"
    echo ""
    echo "Please run: firebase login"
    echo "Then run this script again."
    exit 1
fi

echo "✅ Firebase authentication confirmed"
echo ""

# Verify project
echo "📋 Step 2: Verifying project..."
PROJECT=$(firebase use)
echo "Using project: $PROJECT"
echo ""

# Build functions
echo "📋 Step 3: Building Cloud Functions..."
cd functions
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi
cd ..
echo "✅ Build successful"
echo ""

# Deploy functions only
echo "📋 Step 4: Deploying to Firebase..."
firebase deploy --only functions

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ DEPLOYMENT SUCCESSFUL! 🎉"
    echo ""
    echo "Your image enhancement system is now live!"
    echo ""
    echo "📊 Next steps:"
    echo "1. Upload a test image to the products/ folder in Firebase Storage"
    echo "2. Check Cloud Function logs: firebase functions:log"
    echo "3. Verify variants were created in products/variants/"
    echo "4. Check Firestore image_cache collection for metadata"
    echo ""
else
    echo ""
    echo "❌ Deployment failed. Check the error above."
    exit 1
fi
