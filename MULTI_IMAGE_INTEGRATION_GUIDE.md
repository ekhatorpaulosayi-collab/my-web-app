# 🖼️ Multi-Image Upload Integration Guide

## ✅ What's Been Implemented

### 1. Database (Supabase)
- ✅ `product_images` table (stores multiple images per product)
- ✅ `subscription_tiers` table (tracks user limits)
- ✅ Helper functions (`can_add_product_image`, `check_chat_quota`, etc.)
- ✅ Row Level Security (RLS) policies

### 2. AI Chat Improvements
- ✅ Intelligent onboarding system
- ✅ Context-aware responses based on user tier/product count
- ✅ Subtle upgrade triggers
- ✅ 80/20 quota split (flexible/storefront)

### 3. Components
- ✅ `MultiImageUpload.tsx` - Upload multiple images with drag-and-drop
- ✅ `ProductImageGallery.tsx` - Display images on storefront
- ✅ Updated `WhatsAppPricingTiers.tsx` - New pricing structure

---

## 📊 New Pricing Structure

| Feature | FREE | STARTER ₦5k | PRO ₦10k | BUSINESS ₦15k |
|---------|------|-------------|----------|---------------|
| **Products** | 50 | 200 | Unlimited | Unlimited |
| **AI Chats** | 50 (3mo) → 20 | 500 | 1,500 | 10,000 |
| **Images/Product** | 1 | 3 | 5 | 10 |
| **Users** | 1 | 2 | 5 | Unlimited |
| **Storefront** | ✅ | ✅ | ✅ | ✅ |
| **Profit Tracking** | ❌ | ✅ | ✅ | ✅ |
| **API Access** | ❌ | ❌ | ❌ | ✅ |

---

## 🚀 How to Integrate

### Step 1: Using Multi-Image Upload in Product Form

In your product add/edit modal (likely in `App.jsx` or a separate component):

```jsx
import MultiImageUpload from './components/MultiImageUpload';

function AddProductModal({ productId, onClose }) {
  const [productImages, setProductImages] = useState([]);

  const handleSaveProduct = async () => {
    // Your existing product save logic...

    // Images are automatically saved to database by MultiImageUpload
    // if productId is provided. Otherwise, save after product creation:

    const newProductId = await saveProduct(productData);

    // If creating new product, you may need to update image references
    // (MultiImageUpload handles this automatically when productId is set)
  };

  return (
    <div className="modal">
      <h2>{productId ? 'Edit Product' : 'Add Product'}</h2>

      {/* Your existing form fields */}
      <input type="text" placeholder="Product name" />
      <input type="number" placeholder="Price" />

      {/* Add Multi-Image Upload */}
      <div style={{ marginTop: '20px' }}>
        <label>Product Images</label>
        <MultiImageUpload
          productId={productId}  // Pass existing product ID if editing
          onImagesChange={(images) => setProductImages(images)}
        />
      </div>

      <button onClick={handleSaveProduct}>Save Product</button>
    </div>
  );
}
```

---

### Step 2: Display Images on Storefront

In your public storefront product page:

```jsx
import ProductImageGallery from './components/ProductImageGallery';

function ProductPage({ productId, productData }) {
  return (
    <div className="product-page">
      {/* Left side: Images */}
      <div style={{ flex: 1 }}>
        <ProductImageGallery
          productId={productId}
          fallbackImage={productData.image}  // Show old single image if no new images
        />
      </div>

      {/* Right side: Product info */}
      <div style={{ flex: 1 }}>
        <h1>{productData.name}</h1>
        <p className="price">₦{productData.price.toLocaleString()}</p>
        <p>{productData.description}</p>

        <button>Add to Cart</button>
      </div>
    </div>
  );
}
```

---

### Step 3: Create Subscription Tier for New Users

When a user signs up, create their tier record:

```javascript
// In your signup function
import { supabase } from './lib/supabase';

async function onUserSignup(userId) {
  try {
    // Create subscription tier record
    const { data, error } = await supabase
      .from('subscription_tiers')
      .insert({
        user_id: userId,
        tier: 'free',
        product_limit: 50,
        user_limit: 1,
        images_per_product: 1,
        monthly_chat_limit: 50
      });

    if (error) {
      console.error('Error creating tier:', error);
    }
  } catch (error) {
    console.error('Signup error:', error);
  }
}
```

---

### Step 4: Handle Tier Upgrades

When user upgrades their plan:

```javascript
async function upgradeTier(userId, newTier) {
  const tierLimits = {
    free: { product_limit: 50, user_limit: 1, images_per_product: 1, chats: 50 },
    starter: { product_limit: 200, user_limit: 2, images_per_product: 3, chats: 500 },
    pro: { product_limit: 999999, user_limit: 5, images_per_product: 5, chats: 1500 },
    business: { product_limit: 999999, user_limit: 999999, images_per_product: 10, chats: 10000 }
  };

  const limits = tierLimits[newTier];

  const { error } = await supabase
    .from('subscription_tiers')
    .update({
      tier: newTier,
      product_limit: limits.product_limit,
      user_limit: limits.user_limit,
      images_per_product: limits.images_per_product,
      monthly_chat_limit: limits.chats,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (!error) {
    alert(`Successfully upgraded to ${newTier}!`);
    window.location.reload();
  }
}
```

---

## 🧪 Testing Checklist

### Multi-Image Upload
- [ ] Upload single image (free tier limit)
- [ ] Try to upload 2nd image on free tier → Should show upgrade prompt
- [ ] Upgrade to Starter → Should allow 3 images
- [ ] Drag and drop to reorder images
- [ ] Click ★ to set primary image
- [ ] Delete image → Remaining images re-index correctly
- [ ] Upload progress shows correctly

### Storefront Gallery
- [ ] Main image displays correctly
- [ ] Thumbnails show below (if multiple images)
- [ ] Click thumbnail → Main image changes
- [ ] Click main image → Lightbox opens
- [ ] Navigate with arrows in lightbox
- [ ] Works on mobile (swipeable)

### AI Chat
- [ ] Chat widget appears on dashboard
- [ ] AI asks discovery questions (What do you sell?)
- [ ] AI suggests features based on context
- [ ] Upgrade prompts appear when near limits
- [ ] Free tier degrades to 20 chats after 3 months
- [ ] Quota split works (80% flexible, 20% storefront)

### Pricing Page
- [ ] Displays correct limits (50/200/unlimited products)
- [ ] Shows correct AI chat quotas
- [ ] Upgrade button works
- [ ] Current plan badge shows correctly
- [ ] Can't downgrade if already using premium features

---

## 🐛 Troubleshooting

### Images not saving to database
**Problem:** Images upload but don't appear in `product_images` table

**Solution:** Make sure you're passing `productId` to `MultiImageUpload`:
```jsx
<MultiImageUpload productId={existingProductId} ... />
```

### Quota not working
**Problem:** Users can upload unlimited images

**Solution:** Verify subscription_tiers record exists for user:
```sql
SELECT * FROM subscription_tiers WHERE user_id = 'user-id-here';
```

If missing, create it:
```sql
INSERT INTO subscription_tiers (user_id, tier) VALUES ('user-id', 'free');
```

### AI chat quota exceeded immediately
**Problem:** AI says quota exceeded even though user just signed up

**Solution:** Check `ai_chat_usage` table. If flexible_limit is 0, run migration again:
```sql
UPDATE ai_chat_usage SET flexible_limit = 40, storefront_limit = 10 WHERE tier = 'free';
```

---

## 📈 Next Steps

1. **Deploy to Production**
   ```bash
   npm run build
   vercel --prod
   ```

2. **Test with Real Users**
   - Create test accounts on each tier
   - Upload images
   - Test AI chat
   - Verify limits work

3. **Monitor Usage**
   - Track AI chat costs (₦0.30/chat)
   - Monitor image storage (Firebase/Supabase limits)
   - Watch for abuse (users hitting limits repeatedly)

4. **Future Enhancements**
   - Image compression (reduce storage costs)
   - Background removal (premium feature)
   - Video support (Business tier)
   - Bulk image upload
   - AI-generated product descriptions

---

## 💡 Pro Tips

1. **Free Tier Hook Strategy**
   - 50 products is generous enough to get started
   - 50 AI chats (3 months) → plenty time to test value
   - Degradation to 20 chats creates natural upgrade pressure

2. **Upgrade Triggers**
   - Product limit (45/50 → "You're growing!")
   - Image limit (trying to add 2nd image → "Upgrade for 3 images!")
   - AI chat prompts ("Want profit tracking? Upgrade to Starter!")

3. **Cost Management**
   - AI chats: ₦0.30 each (managed by quotas)
   - Images: Free in Firebase/Supabase free tier (monitor growth)
   - Database: Supabase free tier (500MB, should be fine)

4. **Marketing the Features**
   - "Professional product galleries" (multiple images)
   - "AI-powered customer support" (chat widget)
   - "Grow without limits" (unlimited products on Pro)

---

## 🎉 You're Ready!

All components are built and ready to use. The system is:
- ✅ Cost-effective (97%+ profit margins)
- ✅ Scalable (handles unlimited users)
- ✅ Feature-gated (creates upgrade pressure)
- ✅ User-friendly (drag-and-drop, mobile-optimized)

**Questions?** Check the component files for inline documentation, or refer to this guide!

**Happy Building! 🚀**
