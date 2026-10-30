#!/bin/bash

# Upload Landing Page Images to ImageKit via API
# This script uploads images directly using curl

PRIVATE_KEY="${IMAGEKIT_PRIVATE_KEY:-}"
if [ -z "$PRIVATE_KEY" ]; then
  echo "Set IMAGEKIT_PRIVATE_KEY (ImageKit dashboard → Developer options)."
  exit 1
fi
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

  echo "📤 Uploading: $img"

  # Convert image to base64
  base64_img=$(base64 -w 0 "$img" 2>/dev/null || base64 "$img")

  # Upload to ImageKit
  response=$(curl -s -X POST "https://upload.imagekit.io/api/v1/files/upload" \
    -H "Authorization: Basic ${AUTH}" \
    -F "file=${base64_img}" \
    -F "fileName=${img}" \
    -F "useUniqueFileName=false")

  # Check if upload was successful
  if echo "$response" | grep -q '"url"'; then
    url=$(echo "$response" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
    echo "   ✅ Success: $url"
    ((success++))
  else
    echo "   ❌ Failed"
    echo "   Response: $response"
    ((failed++))
  fi

  # Small delay to avoid rate limiting
  sleep 0.5
done

echo ""
echo "📊 Upload Summary:"
echo "   ✅ Successful: $success"
echo "   ❌ Failed: $failed"
echo ""
echo "✨ Images are now optimized and available via ImageKit CDN!"
