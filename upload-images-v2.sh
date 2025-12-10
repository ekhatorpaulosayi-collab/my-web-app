#!/bin/bash

# Upload Landing Page Images to ImageKit via API (File Upload Method)

PRIVATE_KEY="private_3aE43Ff8Wh96MBV47ri3Jp2zsIA="
AUTH=$(echo -n "${PRIVATE_KEY}:" | base64)

echo "🚀 Uploading Landing Page Images to ImageKit..."
echo ""

cd public

# Array of images to upload
images=(
  "landing-young-professional.png"
  "landing-elderly-woman.png"
  "landing-spice-shop.png"
  "landing-business-ecosystem.png"
  "ai-chatbot-store.png"
  "works-24-7.png"
  "whatsapp-ready.png"
  "any-device.png"
  "storehouse-logo-new.png"
)

success=0
failed=0

for img in "${images[@]}"; do
  if [ ! -f "$img" ]; then
    echo "⚠️  Skipping $img (not found)"
    continue
  fi

  echo "📤 Uploading: $img ($(du -h "$img" | cut -f1))"

  # Upload using multipart form data with file
  response=$(curl -s -X POST "https://upload.imagekit.io/api/v1/files/upload" \
    -u "${PRIVATE_KEY}:" \
    -F "file=@${img}" \
    -F "fileName=${img}" \
    -F "useUniqueFileName=false")

  # Check if upload was successful
  if echo "$response" | grep -q '"fileId"'; then
    url=$(echo "$response" | grep -o '"url":"[^"]*"' | cut -d'"' -f4 | head -1)
    echo "   ✅ Success!"
    echo "   📍 URL: $url"
    ((success++))
  else
    echo "   ❌ Failed"
    if echo "$response" | grep -q "message"; then
      error=$(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
      echo "   Error: $error"
    fi
    ((failed++))
  fi

  # Small delay
  sleep 0.3
  echo ""
done

echo "========================================"
echo "📊 Upload Summary:"
echo "   ✅ Successful: $success"
echo "   ❌ Failed: $failed"
echo ""

if [ $success -gt 0 ]; then
  echo "✨ Images are now available at:"
  echo "   https://ik.imagekit.io/onelove431212341234/[filename]"
  echo ""
  echo "🎯 Next Steps:"
  echo "   1. Images are automatically optimized to WebP"
  echo "   2. Served via global CDN"
  echo "   3. Now update your landing page to use ImageKit URLs"
fi
