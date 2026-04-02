-- ================================================
-- PHASE 2: SLUG ROUTING FIX VERIFICATION TEST
-- Run this in Supabase SQL Editor to verify slug routing is working
-- Date: March 26, 2024
-- ================================================

-- ================================================
-- TEST 1: VERIFY STORE_SLUG COLUMN EXISTS
-- ================================================
SELECT
  'Column Check' as test_type,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ store_slug column exists'
    ELSE '❌ store_slug column NOT FOUND'
  END as result
FROM information_schema.columns
WHERE table_name = 'stores'
AND column_name = 'store_slug';

-- ================================================
-- TEST 2: GET A REAL STORE BY SLUG (SUCCESS CASE)
-- ================================================
DO $$
DECLARE
  v_store_slug TEXT;
  v_store_name TEXT;
  v_whatsapp TEXT;
  v_fallback_mins INTEGER;
  v_store_id UUID;
BEGIN
  -- First, get an actual store that has a slug
  SELECT
    store_slug,
    business_name,
    whatsapp_number,
    wa_fallback_minutes,
    id
  INTO
    v_store_slug,
    v_store_name,
    v_whatsapp,
    v_fallback_mins,
    v_store_id
  FROM stores
  WHERE store_slug IS NOT NULL
  AND is_public = true
  LIMIT 1;

  IF v_store_slug IS NOT NULL THEN
    RAISE NOTICE '✅ TEST 2 PASSED: Found store by slug';
    RAISE NOTICE '  Store Name: %', v_store_name;
    RAISE NOTICE '  Store Slug: %', v_store_slug;
    RAISE NOTICE '  Store ID: %', v_store_id;
    RAISE NOTICE '  WhatsApp: %', COALESCE(v_whatsapp, 'Not configured');
    RAISE NOTICE '  Fallback Minutes: %', COALESCE(v_fallback_mins::text, '5 (default)');
    RAISE NOTICE '';
    RAISE NOTICE '📝 BROWSER TEST URL: https://smartstock-v2.vercel.app/store/%', v_store_slug;
  ELSE
    RAISE NOTICE '⚠️ No public stores with slugs found. Please create a store first.';
  END IF;
END $$;

-- ================================================
-- TEST 3: QUERY WITH FAKE SLUG (SHOULD RETURN NOTHING)
-- ================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM stores
  WHERE store_slug = 'this-fake-slug-should-not-exist-xyz123'
  AND is_public = true;

  IF v_count = 0 THEN
    RAISE NOTICE '✅ TEST 3 PASSED: Fake slug returns no results (expected)';
  ELSE
    RAISE NOTICE '❌ TEST 3 FAILED: Fake slug returned % results (should be 0)', v_count;
  END IF;
END $$;

-- ================================================
-- TEST 4: SIMULATE THE EXACT QUERY FROM AICHATWIDGET
-- This mimics what AIChatWidget.tsx does at line 398
-- ================================================
DO $$
DECLARE
  v_test_slug TEXT;
  v_store_data RECORD;
BEGIN
  -- Get a real slug to test with
  SELECT store_slug INTO v_test_slug
  FROM stores
  WHERE store_slug IS NOT NULL
  AND is_public = true
  LIMIT 1;

  IF v_test_slug IS NOT NULL THEN
    -- Simulate the exact query from AIChatWidget (after our fix)
    SELECT
      id,
      whatsapp_number,
      wa_fallback_minutes
    INTO v_store_data
    FROM stores
    WHERE store_slug = v_test_slug
    LIMIT 1;

    IF v_store_data.id IS NOT NULL THEN
      RAISE NOTICE '✅ TEST 4 PASSED: AIChatWidget query simulation successful';
      RAISE NOTICE '  Retrieved store ID: %', v_store_data.id;
      RAISE NOTICE '  WhatsApp available: %', CASE WHEN v_store_data.whatsapp_number IS NOT NULL THEN 'Yes' ELSE 'No' END;
    ELSE
      RAISE NOTICE '❌ TEST 4 FAILED: Could not retrieve store data';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ Skipping Test 4: No stores with slugs found';
  END IF;
END $$;

-- ================================================
-- TEST 5: LIST ALL STORES WITH SLUGS (FOR REFERENCE)
-- ================================================
SELECT
  '📋 Available Store Slugs' as info,
  business_name,
  store_slug,
  CASE
    WHEN whatsapp_number IS NOT NULL THEN '✅ WhatsApp configured'
    ELSE '❌ No WhatsApp'
  END as whatsapp_status,
  COALESCE(wa_fallback_minutes::text, '5') || ' minutes' as fallback_time,
  CASE
    WHEN is_public THEN '🌐 Public'
    ELSE '🔒 Private'
  END as visibility
FROM stores
WHERE store_slug IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- ================================================
-- MANUAL BROWSER TEST CHECKLIST
-- ================================================
/*
🧪 BROWSER TESTING CHECKLIST
============================

Prerequisites:
- Ensure you have at least one public store with a store_slug
- Note the store_slug from the test results above

Test Steps:

1. VISIT THE STORE URL:
   - Go to: https://smartstock-v2.vercel.app/store/{store_slug}
   - Replace {store_slug} with an actual slug from Test 2 above
   - For local testing: http://localhost:5173/store/{store_slug}

2. WHAT YOU SHOULD SEE (IF FIX IS WORKING):
   ✅ Store page loads successfully
   ✅ Store name and products are displayed
   ✅ Chat widget appears in bottom-right corner
   ✅ Chat widget shows "Chat with us" or similar
   ✅ Opening the chat widget allows you to send messages
   ✅ Console shows: "[AIChatWidget] Store data loaded successfully"
   ✅ If WhatsApp is configured, fallback timer should work

3. WHAT YOU WOULD SEE (IF STILL BROKEN):
   ❌ Store page might load but chat widget fails
   ❌ Console error: "Store not found" or similar
   ❌ Console shows: "[AIChatWidget] Failed to fetch store data"
   ❌ Chat widget might appear but not function properly
   ❌ WhatsApp fallback won't work (no store data)
   ❌ Messages might not save to the correct store

4. DEVELOPER CONSOLE CHECKS:
   - Open browser DevTools (F12)
   - Go to Network tab
   - Look for Supabase requests to 'stores' table
   - Should see query parameter: store_slug=yourslug
   - Should NOT see: slug=yourslug (this was the bug)

5. ADDITIONAL VERIFICATION:
   - Send a test message in the chat
   - Check Supabase dashboard → ai_chat_messages table
   - Verify the store_id matches the correct store
   - Verify conversation has correct store_id

6. WHATSAPP FALLBACK TEST (if configured):
   - Send a message as customer
   - Wait for fallback timeout (default 5 minutes)
   - Should see WhatsApp prompt if no agent responds
   - Click WhatsApp button should open WhatsApp with pre-filled message

COMMON ISSUES:
- If slug not found: Check store has is_public = true
- If chat not working: Check browser console for errors
- If WhatsApp not working: Ensure whatsapp_number is configured

TEST COMPLETE! 🎉
If all checks pass, the slug routing fix is working correctly.
*/

-- ================================================
-- FINAL SUMMARY
-- ================================================
SELECT
  '🎯 SLUG ROUTING TEST COMPLETE' as status,
  'Check the NOTICE messages above for detailed results' as instructions,
  'Use the Browser Testing Checklist to verify in production' as next_step;