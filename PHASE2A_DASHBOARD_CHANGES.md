# 🛠️ PHASE 2A: Dashboard Changes Guide

## ✅ Migration Complete!
The `specifications` column is now in your database.

## 📝 Frontend Changes Needed

Since your App.jsx is very large (5974 lines), here's a step-by-step guide to add specifications support:

---

## CHANGE 1: Add Specifications to Form State

**Location:** Around line 268 in `/src/App.jsx`

**Find this code:**
```javascript
const [formData, setFormData] = useState({
  name: '',
  category: 'Fashion',
  description: '',
  barcode: '',
  qty: '',
  purchasePrice: '',
  sellingPrice: '',
  reorderLevel: '10',
  isPublic: true,
  attributes: {}
});
```

**Add specifications field:**
```javascript
const [formData, setFormData] = useState({
  name: '',
  category: 'Fashion',
  description: '',
  barcode: '',
  qty: '',
  purchasePrice: '',
  sellingPrice: '',
  reorderLevel: '10',
  isPublic: true,
  attributes: {},
  specifications: {}  // PHASE 2A: Add this line
});
```

---

## CHANGE 2: Add Specifications State

**Location:** After line 279 in `/src/App.jsx`

**Add new state for specifications:**
```javascript
// PHASE 2A: Product specifications state
const [specifications, setSpecifications] = useState({
  battery_life: '',
  screen_size: '',
  camera: '',
  ram: '',
  storage: '',
  processor: '',
  // For fashion/other categories
  fabric: '',
  fit: '',
  care: '',
  // For food
  ingredients: '',
  spice_level: '',
  allergens: ''
});
```

---

## CHANGE 3: Update Product Insert

**Search for:** `supabase.from('products').insert`

**Find the insert object and add specifications:**
```javascript
const { data, error } = await supabase
  .from('products')
  .insert({
    user_id: user.id,
    name: formData.name,
    selling_price: sellingPriceInKobo,
    purchase_price: purchasePriceInKobo,
    quantity: parseInt(formData.qty),
    description: formData.description,
    category: formData.category,
    barcode: formData.barcode,
    reorder_level: parseInt(formData.reorderLevel),
    is_public: formData.isPublic,
    specifications: specifications  // PHASE 2A: Add this line
  });
```

---

## CHANGE 4: Update Product Update

**Search for:** `supabase.from('products').update`

**Find the update object and add specifications:**
```javascript
const { data, error } = await supabase
  .from('products')
  .update({
    name: formData.name,
    selling_price: sellingPriceInKobo,
    purchase_price: purchasePriceInKobo,
    quantity: parseInt(formData.qty),
    description: formData.description,
    category: formData.category,
    specifications: specifications  // PHASE 2A: Add this line
  })
  .eq('id', editingProductId);
```

---

## CHANGE 5: Load Specifications When Editing

**Search for:** Where product data is loaded for editing (probably in `onEditItem` or similar)

**Add specifications loading:**
```javascript
// When editing product, load specifications
if (editingProduct) {
  setSpecifications(editingProduct.specifications || {
    battery_life: '',
    screen_size: '',
    camera: '',
    ram: '',
    storage: '',
    processor: '',
    fabric: '',
    fit: '',
    care: '',
    ingredients: '',
    spice_level: '',
    allergens: ''
  });
}
```

---

## CHANGE 6: Add Form Fields to Product Modal

**Search for:** The product form modal JSX (look for description, category, price inputs)

**Add this section AFTER the description field:**

```jsx
{/* PHASE 2A: Product Specifications (Optional) */}
<div className="specifications-section" style={{
  borderTop: '2px solid #e5e7eb',
  paddingTop: '1rem',
  marginTop: '1rem'
}}>
  <h3 style={{
    fontSize: '1.125rem',
    fontWeight: '600',
    marginBottom: '0.5rem'
  }}>
    📋 Product Specifications (Optional)
  </h3>
  <p style={{
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '1rem'
  }}>
    Add specs so AI can answer customer questions. Leave blank if not applicable.
  </p>

  {/* Electronics Specs */}
  {(formData.category === 'Electronics' || formData.category === 'Technology') && (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '1rem',
      marginBottom: '1rem'
    }}>
      <div>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginBottom: '0.25rem'
        }}>
          Battery Life
        </label>
        <input
          type="text"
          placeholder="e.g., Up to 22 hours"
          value={specifications.battery_life}
          onChange={(e) => setSpecifications({
            ...specifications,
            battery_life: e.target.value
          })}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginBottom: '0.25rem'
        }}>
          Screen Size
        </label>
        <input
          type="text"
          placeholder="e.g., 6.1 inches"
          value={specifications.screen_size}
          onChange={(e) => setSpecifications({
            ...specifications,
            screen_size: e.target.value
          })}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginBottom: '0.25rem'
        }}>
          Camera
        </label>
        <input
          type="text"
          placeholder="e.g., 12MP triple camera"
          value={specifications.camera}
          onChange={(e) => setSpecifications({
            ...specifications,
            camera: e.target.value
          })}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginBottom: '0.25rem'
        }}>
          RAM
        </label>
        <input
          type="text"
          placeholder="e.g., 6GB"
          value={specifications.ram}
          onChange={(e) => setSpecifications({
            ...specifications,
            ram: e.target.value
          })}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginBottom: '0.25rem'
        }}>
          Storage
        </label>
        <input
          type="text"
          placeholder="e.g., 256GB"
          value={specifications.storage}
          onChange={(e) => setSpecifications({
            ...specifications,
            storage: e.target.value
          })}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginBottom: '0.25rem'
        }}>
          Processor
        </label>
        <input
          type="text"
          placeholder="e.g., A15 Bionic"
          value={specifications.processor}
          onChange={(e) => setSpecifications({
            ...specifications,
            processor: e.target.value
          })}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
      </div>
    </div>
  )}

  {/* Fashion Specs */}
  {formData.category === 'Fashion' && (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '1rem',
      marginBottom: '1rem'
    }}>
      <div>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginBottom: '0.25rem'
        }}>
          Fabric/Material
        </label>
        <input
          type="text"
          placeholder="e.g., 100% cotton"
          value={specifications.fabric}
          onChange={(e) => setSpecifications({
            ...specifications,
            fabric: e.target.value
          })}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginBottom: '0.25rem'
        }}>
          Fit
        </label>
        <input
          type="text"
          placeholder="e.g., Relaxed fit, true to size"
          value={specifications.fit}
          onChange={(e) => setSpecifications({
            ...specifications,
            fit: e.target.value
          })}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginBottom: '0.25rem'
        }}>
          Care Instructions
        </label>
        <input
          type="text"
          placeholder="e.g., Machine washable"
          value={specifications.care}
          onChange={(e) => setSpecifications({
            ...specifications,
            care: e.target.value
          })}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
      </div>
    </div>
  )}

  {/* Food Specs */}
  {(formData.category === 'Food' || formData.category === 'Grocery') && (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '1rem',
      marginBottom: '1rem'
    }}>
      <div>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginBottom: '0.25rem'
        }}>
          Ingredients
        </label>
        <input
          type="text"
          placeholder="e.g., Tomatoes, onions, peppers"
          value={specifications.ingredients}
          onChange={(e) => setSpecifications({
            ...specifications,
            ingredients: e.target.value
          })}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginBottom: '0.25rem'
        }}>
          Spice Level
        </label>
        <input
          type="text"
          placeholder="e.g., Medium-hot (7/10)"
          value={specifications.spice_level}
          onChange={(e) => setSpecifications({
            ...specifications,
            spice_level: e.target.value
          })}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginBottom: '0.25rem'
        }}>
          Allergens
        </label>
        <input
          type="text"
          placeholder="e.g., Contains nuts"
          value={specifications.allergens}
          onChange={(e) => setSpecifications({
            ...specifications,
            allergens: e.target.value
          })}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
      </div>
    </div>
  )}

  <p style={{
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.5rem'
  }}>
    💡 Tip: AI will use these specs to answer customer questions like "What's the battery life?"
  </p>
</div>
```

---

## CHANGE 7: Reset Specifications on Form Close

**Search for:** Where form is reset/closed (probably `setFormData` back to defaults)

**Add specifications reset:**
```javascript
// Reset form when closing
setFormData({
  name: '',
  category: 'Fashion',
  description: '',
  barcode: '',
  qty: '',
  purchasePrice: '',
  sellingPrice: '',
  reorderLevel: '10',
  isPublic: true,
  attributes: {},
  specifications: {}  // PHASE 2A: Reset this too
});

// PHASE 2A: Reset specifications
setSpecifications({
  battery_life: '',
  screen_size: '',
  camera: '',
  ram: '',
  storage: '',
  processor: '',
  fabric: '',
  fit: '',
  care: '',
  ingredients: '',
  spice_level: '',
  allergens: ''
});
```

---

## ✅ Quick Summary of Changes:

1. **Line ~268:** Add `specifications: {}` to formData state
2. **After line ~279:** Add specifications useState
3. **Product insert:** Add `specifications: specifications`
4. **Product update:** Add `specifications: specifications`
5. **Load when editing:** Set specifications from product data
6. **Form fields:** Add conditional specifications section based on category
7. **Form reset:** Reset specifications state

---

## 🧪 Testing After Changes:

### Test 1: Add Product with Specs
1. Add new product (e.g., "iPhone 13 Pro")
2. Fill: Battery Life = "Up to 22 hours"
3. Save product
4. Go to storefront, ask AI: "What's the battery life?"
5. Expected: "Up to 22 hours!"

### Test 2: Product Without Specs
1. Add product without filling specifications
2. Ask AI about specs
3. Expected: "For details, WhatsApp..."

### Test 3: Edit Product
1. Edit existing product
2. Add specifications
3. Save
4. Test AI recognizes new specs

---

## 🚀 Deploy After Changes:

```bash
cd /home/ekhator1/smartstock-v2
npm run build
vercel --prod
```

---

**Need help finding exact locations?** Search for:
- `const [formData` → Add specifications
- `supabase.from('products').insert` → Add to insert
- `supabase.from('products').update` → Add to update
- Product form JSX (look for description field) → Add form fields

**Phase 2A is 95% complete - just need these frontend changes!** 🎉
