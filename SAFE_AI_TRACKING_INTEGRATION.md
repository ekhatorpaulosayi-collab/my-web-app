# 🛡️ Safe AI Chat Tracking Integration Guide

## ⚠️ IMPORTANT: Preserve Existing Features

This guide shows how to ADD tracking to the AI chat WITHOUT breaking:
- ✅ RAG (Retrieval Augmented Generation)
- ✅ Multi-language support (Hausa, Igbo, Yoruba)
- ✅ Intelligent context-aware responses
- ✅ Store context and product search
- ✅ Off-topic and spam detection
- ✅ All existing validation logic

## 📋 Step 1: Run SQL to Create Tracking Tables

```bash
# Go to Supabase SQL Editor:
https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new

# Run the SQL from:
/home/ekhator1/smartstock-v2/supabase/migrations/create_ai_chat_tracking_tables.sql
```

## 📝 Step 2: Add Import at Top of Edge Function

Add this single import to `/supabase/functions/ai-chat/index.ts`:

```typescript
// Add this import at the top (line 3)
import { createHash } from 'https://deno.land/std@0.168.0/crypto/mod.ts';
```

## 🔧 Step 3: Add New Tracking Functions

Add these functions AFTER the existing functions (around line 300), but BEFORE the `serve()` function:

```typescript
// ============================================================================
// NEW TRACKING FUNCTIONS - ADD THESE
// ============================================================================

async function checkMonthlyUsageLimit(
  supabase: any,
  userId: string
): Promise<{ allowed: boolean; remaining: number; tierLimit: number; tierName: string }> {
  try {
    const { data: userStore } = await supabase
      .from('user_stores')
      .select('stores(subscription_tier)')
      .eq('user_id', userId)
      .single();

    const tierName = userStore?.stores?.subscription_tier || 'Free';

    const { data: tier } = await supabase
      .from('subscription_tiers')
      .select('max_ai_chats_monthly')
      .eq('name', tierName)
      .single();

    const tierLimit = tier?.max_ai_chats_monthly || 10;

    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);

    const { data: usage } = await supabase
      .from('ai_chat_usage')
      .select('chat_count')
      .eq('user_id', userId)
      .eq('period_start', periodStart.toISOString().split('T')[0])
      .single();

    const currentCount = usage?.chat_count || 0;
    const remaining = Math.max(0, tierLimit - currentCount);

    return {
      allowed: currentCount < tierLimit,
      remaining,
      tierLimit,
      tierName
    };
  } catch (error) {
    console.error('[checkMonthlyUsageLimit] Error:', error);
    return { allowed: true, remaining: 10, tierLimit: 10, tierName: 'Free' };
  }
}

async function incrementMonthlyUsage(
  supabase: any,
  userId: string,
  storeId: string | null,
  tierName: string,
  tierLimit: number
): Promise<void> {
  try {
    await supabase.rpc('increment_ai_chat_usage', {
      p_user_id: userId,
      p_store_id: storeId,
      p_tier_name: tierName,
      p_tier_limit: tierLimit
    });
  } catch (error) {
    console.error('[incrementMonthlyUsage] Error:', error);
  }
}
```

## 🎯 Step 4: Integration Points in serve() Function

### 4.1 Add Store ID Retrieval (After getting userId, around line 530)

```typescript
// EXISTING CODE:
if (token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (!error && user) {
    userId = user.id;
  }
}

// ADD THIS RIGHT AFTER:
let storeId: string | null = null;
if (userId) {
  const { data: userStore } = await supabase
    .from('user_stores')
    .select('store_id')
    .eq('user_id', userId)
    .single();
  storeId = userStore?.store_id;
}
```

### 4.2 Add Monthly Limit Check (Before visitor rate limiting, around line 550)

```typescript
// ADD THIS BEFORE THE VISITOR RATE LIMITING:
if (userId) {
  const usageCheck = await checkMonthlyUsageLimit(supabase, userId);
  if (!usageCheck.allowed) {
    console.log('[ai-chat] Monthly limit exceeded for user:', userId);

    return jsonResponse({
      error: 'monthly_limit_exceeded',
      message: `You've reached your ${usageCheck.tierName} tier limit of ${usageCheck.tierLimit} AI chats this month. Upgrade for more!`,
      remaining: 0
    });
  }
}

// EXISTING VISITOR RATE LIMITING CODE STAYS THE SAME
if (userType === 'visitor' && !userId) {
  // ... existing rate limiting code ...
}
```

### 4.3 After Getting AI Response (Around line 900)

Find where the AI response is returned and ADD tracking:

```typescript
// EXISTING CODE:
const content = completion.choices[0]?.message?.content || 'I understand you need help...';

// ADD TRACKING HERE:
if (userId) {
  const usageCheck = await checkMonthlyUsageLimit(supabase, userId);
  await incrementMonthlyUsage(supabase, userId, storeId, usageCheck.tierName, usageCheck.tierLimit);
}

// EXISTING RETURN STAYS THE SAME:
return jsonResponse({
  response: content,
  // ... rest of response
});
```

## ✅ Step 5: Verify Nothing Broke

After adding tracking, test these critical features:

1. **Multi-language**: Send a message in Hausa/Igbo/Yoruba
   - Should still detect language and respond appropriately

2. **RAG**: Ask about documentation
   - Should still use relevantDocs context

3. **Store Context**: Ask about products
   - Should still search and find products

4. **Validation**: Try spam/off-topic messages
   - Should still be blocked

## 🚀 Step 6: Deploy Safely

```bash
# 1. Backup current function
cp supabase/functions/ai-chat/index.ts supabase/functions/ai-chat/index-backup-$(date +%Y%m%d).ts

# 2. Deploy the updated function
supabase functions deploy ai-chat --project-ref yzlniqwzqlsftxrtapdl

# 3. Test immediately
# - Send test messages in different languages
# - Verify tracking in database
# - Check that responses are still intelligent
```

## 📊 Step 7: Monitor After Deployment

Check these tables to verify tracking:

```sql
-- Check usage tracking
SELECT * FROM ai_chat_usage
WHERE created_at > now() - interval '1 hour'
ORDER BY created_at DESC;

-- Check analytics
SELECT * FROM ai_chat_analytics
WHERE created_at > now() - interval '1 hour'
ORDER BY created_at DESC;

-- Check if messages are saved
SELECT * FROM ai_chat_messages
WHERE created_at > now() - interval '1 hour'
ORDER BY created_at DESC;
```

## ⚠️ Rollback Plan

If anything breaks:

```bash
# Restore backup
cp supabase/functions/ai-chat/index-backup-[date].ts supabase/functions/ai-chat/index.ts

# Redeploy original
supabase functions deploy ai-chat --project-ref yzlniqwzqlsftxrtapdl
```

## 🎯 What This Achieves

- ✅ Tracks monthly usage per tier
- ✅ Saves chat history for users
- ✅ Adds basic caching (optional)
- ✅ Enhanced analytics
- ❌ Does NOT touch RAG logic
- ❌ Does NOT modify language detection
- ❌ Does NOT change validation
- ❌ Does NOT alter intelligent responses

## 📝 Testing Checklist

Before considering deployment complete:

- [ ] Hausa message gets Hausa response
- [ ] Igbo message gets Igbo response
- [ ] Yoruba message gets Yoruba response
- [ ] Product questions find products
- [ ] Documentation questions use RAG
- [ ] Off-topic messages are blocked
- [ ] Usage increments in database
- [ ] Free tier limits work (10 chats)
- [ ] Paid tier limits work correctly

## 🆘 If You Need Help

1. Check the backup files first
2. Review `ai_chat_analytics` table for errors
3. Check Supabase Edge Function logs
4. Rollback if needed

Remember: The goal is to ADD tracking without breaking ANYTHING!