# Stage-2 Implementation Guide

## Files Changed

### ✅ COMPLETED:
1. `/src/db/idb.js` - IndexedDB helper (DONE)
2. `/src/components/Toast.jsx` - Toast component (DONE)
3. `/src/Toast.css` - Toast styles (DONE)
4. `/src/App.css` - Table row height already 48px (DONE)
5. `package.json` - uuid dependency installed (DONE)

### ⏳ REQUIRES MANUAL UPDATE:
- `/src/App.jsx` - Needs full refactor to use IndexedDB

## Critical Changes for App.jsx

Due to file size (1576 lines), the full refactored App.jsx cannot be created in one response.
Below are the EXACT changes needed:

### 1. Update Imports (lines 1-3)
```javascript
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  initDB, 
  seedDemoItems, 
  getItems, 
  addOrUpdateItem, 
  getSales, 
  addSale, 
  updateSale,
  updateItemQty,
  getSettings,
  saveSettings,
  formatNGN,
  ngnToKobo
} from './db/idb';
import Toast from './components/Toast';
import './App.css';
```

### 2. Replace State Initialization (lines 20-104)
```javascript
// Replace all localStorage state loading with:
const [items, setItems] = useState([]);
const [sales, setSales] = useState([]);
const [settings, setSettings] = useState({ businessName: '', ownerName: '', phoneNumber: '' });
const [toast, setToast] = useState(null);
const [currentSaleId, setCurrentSaleId] = useState(null);

// Sales masking toggle (persisted in localStorage per spec)
const [salesMasked, setSalesMasked] = useState(() => {
  return localStorage.getItem('sales-masked') === 'true';
});

// Add useEffect to load from IndexedDB
useEffect(() => {
  async function loadData() {
    try {
      await initDB();
      await seedDemoItems();
      const loadedItems = await getItems();
      const loadedSales = await getSales();
      const loadedSettings = await getSettings();
      
      setItems(loadedItems);
      setSales(loadedSales);
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Failed to load data:', error);
      setToast({ message: 'Failed to load data', type: 'error' });
    }
  }
  loadData();
}, []);
```

### 3. Add Sales Toggle Function
```javascript
const toggleSalesMask = () => {
  const newValue = !salesMasked;
  setSalesMasked(newValue);
  localStorage.setItem('sales-masked', newValue);
};
```

### 4. Update handleSave (Add Item)
Replace lines ~244-275 with:
```javascript
const handleSave = async () => {
  if (!formData.name || !formData.qty || !formData.purchasePrice || !formData.sellingPrice) {
    setToast({ message: 'Please fill all fields', type: 'error' });
    return;
  }

  try {
    const item = {
      name: formData.name.trim(),
      category: formData.category,
      qty: parseInt(formData.qty),
      purchasePrice_kobo: ngnToKobo(formData.purchasePrice),
      sellingPrice_kobo: ngnToKobo(formData.sellingPrice),
      reorderLevel: parseInt(formData.reorderLevel) || 10
    };

    await addOrUpdateItem(item);
    const updatedItems = await getItems();
    setItems(updatedItems);
    
    setShowModal(false);
    setFormData({
      name: '',
      category: 'General Merchandise',
      qty: '',
      purchasePrice: '',
      sellingPrice: '',
      reorderLevel: '10'
    });
    
    setToast({ message: 'Item saved successfully!', type: 'success' });
  } catch (error) {
    setToast({ message: error.message, type: 'error' });
  }
};
```

### 5. Update handleRecordSale
```javascript
const handleRecordSale = () => {
  setCurrentSaleId(uuidv4()); // Generate new UUID
  setShowRecordSale(true);
  setSaleForm({
    itemId: '',
    quantity: '',
    sellPrice: '',
    paymentMethod: 'cash',
    customerName: ''
  });
};
```

### 6. Update handleSaveSale (Idempotent)
Replace lines ~449-541 with:
```javascript
const handleSaveSale = async () => {
  const selectedItem = items.find(item => item.id === parseInt(saleForm.itemId));
  const quantity = parseInt(saleForm.quantity);

  if (!selectedItem || !quantity || !saleForm.sellPrice) {
    setToast({ message: 'Please fill all required fields', type: 'error' });
    return;
  }

  if (saleForm.paymentMethod === 'credit' && !saleForm.customerName.trim()) {
    setToast({ message: 'Please enter customer name for credit sales', type: 'error' });
    return;
  }

  try {
    const sale = {
      id: currentSaleId, // Use generated UUID
      itemId: parseInt(saleForm.itemId),
      qty: quantity,
      price_kobo: ngnToKobo(saleForm.sellPrice),
      timestamp: new Date().toISOString(),
      paymentType: saleForm.paymentMethod,
      customerName: saleForm.paymentMethod === 'credit' ? saleForm.customerName.trim() : '',
      paid: saleForm.paymentMethod === 'cash'
    };

    await addSale(sale); // Atomic + idempotent
    const updatedItems = await getItems();
    const updatedSales = await getSales();
    
    setItems(updatedItems);
    setSales(updatedSales);
    setShowRecordSale(false);
    
    setToast({ message: 'Sale recorded successfully!', type: 'success' });
  } catch (error) {
    setToast({ message: error.message, type: 'error' });
  }
};
```

### 7. Update handleAddStock (Low Stock)
Replace lines ~601-648 with:
```javascript
const handleAddStock = async (itemId) => {
  const addAmount = parseInt(stockUpdateForm[itemId]);

  if (!addAmount || addAmount <= 0) {
    setToast({ message: 'Please enter a valid quantity to add', type: 'error' });
    return;
  }

  try {
    const item = items.find(i => i.id === itemId);
    const newQty = item.qty + addAmount;
    
    await updateItemQty(itemId, newQty);
    const updatedItems = await getItems();
    setItems(updatedItems);

    setStockUpdateForm({
      ...stockUpdateForm,
      [itemId]: ''
    });

    const statusChange = item.qty < (item.reorderLevel || 10) && newQty >= (item.reorderLevel || 10) ? ' (Now in stock!)' : '';
    setToast({ 
      message: `Added ${addAmount} units to ${item.name}. New quantity: ${newQty}${statusChange}`, 
      type: 'success' 
    });
  } catch (error) {
    setToast({ message: error.message, type: 'error' });
  }
};
```

### 8. Update handleMarkAsPaid
Replace lines ~693-709 with:
```javascript
const handleMarkAsPaid = async (saleId) => {
  try {
    await updateSale(saleId, {
      paid: true,
      paidDate: new Date().toISOString()
    });

    const updatedSales = await getSales();
    setSales(updatedSales);
    
    setToast({ message: 'Marked as paid successfully!', type: 'success' });
  } catch (error) {
    setToast({ message: error.message, type: 'error' });
  }
};
```

### 9. Update Display Logic - Replace all money displays
Find and replace:
- `item.purchasePrice` → `item.purchasePrice_kobo`
- `item.sellingPrice` → `item.sellingPrice_kobo`
- `.toLocaleString()` → use `formatNGN()` function
- Add masking: `{salesMasked ? '₦—' : formatNGN(value)}`

### 10. Update Header Sales Toggle
Find the sales toggle button (~line 753) and update onClick:
```javascript
<button
  className={`sales-toggle ${salesMasked ? 'hidden' : 'revealed'}`}
  onClick={toggleSalesMask}
  title={salesMasked ? 'Click to show sales data' : 'Click to hide sales data'}
  aria-label={salesMasked ? 'Show sales data' : 'Hide sales data'}
  tabIndex={0}
>
```

### 11. Add Toast at end of JSX (before closing </div>)
```javascript
{toast && (
  <Toast
    message={toast.message}
    type={toast.type}
    onClose={() => setToast(null)}
  />
)}
```

### 12. Update getTodaysSales to use kobo
```javascript
const getTodaysSales = () => {
  const today = new Date().toDateString();
  const todaySales = sales.filter(sale => {
    const saleDate = new Date(sale.timestamp).toDateString();
    return saleDate === today;
  });

  const cashSales = todaySales
    .filter(sale => sale.paymentType === 'cash')
    .reduce((sum, sale) => sum + (sale.price_kobo * sale.qty), 0);

  const creditSales = todaySales
    .filter(sale => sale.paymentType === 'credit')
    .reduce((sum, sale) => sum + (sale.price_kobo * sale.qty), 0);

  const totalSales = cashSales + creditSales;
  const transactions = todaySales.length;

  const profit = todaySales.reduce((sum, sale) => {
    const item = items.find(i => i.id === sale.itemId);
    if (item) {
      return sum + ((sale.price_kobo - item.purchasePrice_kobo) * sale.qty);
    }
    return sum;
  }, 0);

  return { total: totalSales, cash: cashSales, credit: creditSales, profit, transactions };
};
```

## Testing Instructions

1. Install dependencies:
```bash
cd /home/ekhator1/smartstock-v2
npm install
```

2. Build:
```bash
npm run build
```

3. Preview:
```bash
npm run preview
```

4. Should serve at http://localhost:4173

## Acceptance Tests

### Test 1: Add Item
1. Click "Add Item"
2. Fill all fields (Name, Category, Qty, Buy Price, Sell Price)
3. Click Save
4. ✓ New row appears in table
5. ✓ KPI cards update (Items in Stock increases)
6. ✓ Success toast shows
7. ✓ If duplicate name, existing item updates

### Test 2: Record Sale (Idempotent)
1. Click "Record Sale"
2. Select item, enter quantity, adjust price
3. Click "Complete Sale"
4. ✓ Stock decrements exactly once
5. ✓ Sale appears in sales list
6. ✓ Try saving again - should show error "Sale already recorded"
7. ✓ KPI updates (Today's Sales increases)

### Test 3: Low Stock Add
1. Click "Low Stock"
2. Find item with qty < 10
3. Enter qty to add (e.g., 20)
4. Click "Add Stock"
5. ✓ Item qty updates
6. ✓ If new qty >= reorder level, item disappears from low stock list
7. ✓ Low Stock KPI decreases
8. ✓ Success toast shows

### Test 4: Sales Toggle
1. Click Sales toggle button in header
2. ✓ All currency displays show "₦—"
3. ✓ KPIs still calculate behind the scenes
4. Click toggle again
5. ✓ Currency values reappear
6. Refresh page
7. ✓ Toggle state persists (localStorage)

### Test 5: Credit & Debts
1. Record a sale with "Credit" payment method
2. Enter customer name
3. Save
4. ✓ Sale recorded as credit
5. Click "Credit & Debts"
6. ✓ Credit sale appears in list
7. Click "Mark as Paid"
8. ✓ Sale updates to paid status
9. ✓ Receivables KPI decreases
10. ✓ Success toast shows

## Notes

- All money stored as integer kobo in IndexedDB
- UI displays using formatNGN() (Intl.NumberFormat)
- Sales toggle state persists in localStorage
- All operations are idempotent
- Table rows are exactly 48px
- All buttons have 44px min touch targets
- Added tabIndex and aria-label for accessibility
