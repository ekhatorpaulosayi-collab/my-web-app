# Sales Debug Master Guide 🔍

## Common Issues & Solutions

### 1. Sales Disappearing After Logout/Login

#### Symptoms:
- Sales visible when recorded but gone after refresh
- "Today's Sales" showing 0 despite having sales
- Sales history wiped after logout

#### Root Causes & Fixes:

##### A. localStorage vs Supabase Conflict
**Check:** `src/lib/store.ts` - loadSales() function
```javascript
// WRONG - Returns localStorage data
export function loadSales(): SaleRow[] {
  return safeParse<SaleRow[]>(localStorage.getItem("sales"), []);
}

// CORRECT - Should return empty or throw warning
export function loadSales(): SaleRow[] {
  console.warn('[store.ts] loadSales() called - should use Supabase');
  return [];
}
```

##### B. localStorage.setItem Interference
**Check:** Search for `localStorage.setItem('storehouse-sales'`
```bash
grep -r "localStorage.setItem.*sales" src/
```
**Fix:** Remove all localStorage.setItem calls for sales data

##### C. Date Filtering Issues
**Check:** `src/App.jsx` - Sales data mapping
```javascript
// Sales need proper timestamp for "Today's Sales" filtering
const allSales = supabaseSales.map(sale => {
  const saleTimestamp = sale.sale_date ?
    new Date(sale.sale_date).getTime() : Date.now();

  return {
    createdAt: saleTimestamp, // CRITICAL for date filtering
    sellKobo: sale.unit_price * 100, // CRITICAL for Dashboard calculations
    dayKey: sale.sale_date, // For display
    // ... other fields
  };
});
```

##### D. Console.log Suppression
**Check:** `src/main.jsx`
```javascript
// Console.log disabled in production - can't see debug messages!
if (import.meta.env.PROD) {
  const noop = () => {};
  console.log = noop;
  // Comment out to enable debugging
}
```

### 2. User ID Mismatches

#### Quick Check SQL:
```sql
-- Check which user IDs have sales
SELECT DISTINCT user_id, COUNT(*) as sale_count
FROM sales
GROUP BY user_id;

-- Check your actual user ID
SELECT id, email FROM auth.users
WHERE email = 'your-email@example.com';

-- Fix wrong user IDs
UPDATE sales
SET user_id = 'correct-user-id'
WHERE user_id = 'wrong-user-id';
```

### 3. Debug Checklist

#### Step 1: Enable Console Logging
```javascript
// In src/main.jsx - temporarily comment out:
// if (import.meta.env.PROD) {
//   const noop = () => {};
//   console.log = noop;
// }
```

#### Step 2: Add Debug Points
```javascript
// In src/App.jsx useEffect for loading data:
console.log('[App] Auth state:', { currentUser, authLoading });
console.log('[App] Loading sales for user:', currentUser?.uid);
console.log('[App] Sales loaded:', supabaseSales.length);
console.log('[App] Sales dates:', supabaseSales.map(s => s.sale_date));
```

#### Step 3: Check Database
```sql
-- Verify sales exist in database
SELECT COUNT(*) FROM sales WHERE user_id = 'your-user-id';

-- Check today's sales specifically
SELECT * FROM sales
WHERE user_id = 'your-user-id'
AND sale_date = CURRENT_DATE;
```

#### Step 4: Verify Data Flow
1. Check Network tab for Supabase API calls
2. Verify response contains sales data
3. Check Console for debug logs
4. Verify Dashboard receives sales prop

### 4. Common Error Messages

#### "No sales found in cloud"
- Check RLS policies in Supabase
- Verify user_id matches auth.uid()
- Check if sales exist in database

#### "Sales undefined" in Dashboard
- Check if sales prop is passed to Dashboard component
- Verify sales state is initialized as array not null
- Check for race conditions in loading

### 5. Emergency Fixes

#### Clear All Local Storage
```javascript
// Run in browser console
localStorage.clear();
location.reload();
```

#### Force Reload Sales
```javascript
// Add temporary button in App.jsx
<button onClick={async () => {
  const sales = await getSupabaseSales(currentUser.uid);
  console.log('Force loaded sales:', sales);
  setSales(/* mapped sales */);
}}>Force Reload Sales</button>
```

#### Enable Maximum Debugging
```javascript
// In src/App.jsx at component start
useEffect(() => {
  console.log('[RENDER] App rendered with sales:', sales?.length);
}, [sales]);
```

### 6. Prevention Tips

1. **Always use Supabase for sales data** - Never mix localStorage
2. **Ensure proper date formats** - Use timestamps for filtering
3. **Test logout/login cycle** - After any sales-related changes
4. **Keep debug logs** - Until feature is stable
5. **Monitor user IDs** - Ensure consistency across sessions

### 7. Testing Procedure

1. Record a sale
2. Refresh page - sale should persist
3. Logout and login - sale should persist
4. Check "Today's Sales" shows correct amount
5. Check different user accounts separately

### 8. Files to Check When Debugging

- `/src/App.jsx` - Main sales loading logic
- `/src/lib/store.ts` - localStorage functions
- `/src/services/supabaseSales.ts` - Supabase operations
- `/src/components/Dashboard.tsx` - Sales display logic
- `/src/lib/dateUtils.ts` - Date filtering functions
- `/src/main.jsx` - Console.log configuration

### 9. SQL Queries for Verification

```sql
-- Get all sales with dates
SELECT id, user_id, product_name, sale_date, created_at
FROM sales
ORDER BY created_at DESC
LIMIT 20;

-- Check for duplicate sales
SELECT product_name, COUNT(*) as count
FROM sales
GROUP BY product_name, sale_date, user_id
HAVING COUNT(*) > 1;

-- Verify RLS policies
SELECT * FROM pg_policies
WHERE tablename = 'sales';
```

### 10. Contact for Help

If issues persist after following this guide:
1. Check browser console for errors
2. Check Network tab for failed requests
3. Document the exact steps to reproduce
4. Note which user account is affected
5. Include screenshots of console errors

---

Last Updated: March 2024
Issue Fixed: Sales disappearing after logout/login
Solution Applied: Removed localStorage dependency, fixed date filtering