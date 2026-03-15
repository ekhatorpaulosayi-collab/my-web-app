# 🚀 Response Caching Implementation Guide

## Overview

Response caching is already partially implemented in the tracking system. This guide shows how to optimize it further for maximum cost savings.

## Current Implementation

The `ai_response_cache` table is already created with these features:
- Stores common question/answer pairs
- 7-day expiration
- Hit count tracking
- Language-specific caching

## How Caching Works

1. **Query Hashing**: Each message is normalized and hashed with context + language
2. **Cache Check**: Before calling OpenAI, check if we have a cached response
3. **Cache Hit**: Return cached response immediately (saves ₦0.89)
4. **Cache Miss**: Call OpenAI, then save good responses to cache

## Optimization Strategies

### 1. Common Questions Detection

Add a list of common questions that should always be cached:

```typescript
const COMMON_QUESTIONS = [
  // English
  'how much does it cost',
  'what is storehouse',
  'how do i get started',
  'what features do you have',
  'how does it work',

  // Hausa
  'nawa ne kudin',
  'menene storehouse',

  // Yoruba
  'elo ni',
  'kini storehouse',

  // Igbo
  'ego ole',
  'gini bu storehouse'
];

function shouldForceCache(message: string): boolean {
  const normalized = message.toLowerCase();
  return COMMON_QUESTIONS.some(q => normalized.includes(q));
}
```

### 2. FAQ Pre-Responses

For ultra-common questions, return immediately without any API call:

```typescript
const FAQ_RESPONSES = {
  'pricing': {
    en: 'Our plans start at ₦5,000/month for Starter...',
    ha: 'Tsare-tsaren mu sun fara daga ₦5,000/wata...',
    yo: 'Awọn ero wa bẹrẹ ni ₦5,000/oṣu...',
    ig: 'Atụmatụ anyị na-amalite na ₦5,000/ọnwa...'
  },
  'features': {
    en: 'Storehouse includes inventory management, POS, online store...',
    ha: 'Storehouse ya haɗa da sarrafa kaya, POS, kantin kan layi...',
    yo: 'Storehouse pẹlu iṣakoso oja, POS, ile itaja ori ayelujara...',
    ig: 'Storehouse gụnyere njikwa ngwaahịa, POS, ụlọ ahịa ịntanetị...'
  }
};
```

### 3. Cache Warming

Pre-populate cache with common responses:

```sql
-- Run this SQL to warm the cache with common responses
INSERT INTO ai_response_cache (
  query_hash,
  query_text,
  response,
  context_type,
  language,
  hit_count
) VALUES
  -- English pricing
  (
    MD5('help:en:how much does storehouse cost'),
    'how much does storehouse cost',
    'Storehouse offers flexible pricing:\n\n**Free Plan** - ₦0/month\n- 30 products\n- 10 AI chats\n- Basic features\n\n**Starter** - ₦5,000/month\n- 200 products\n- 500 AI chats\n- Remove watermark\n\n**Pro** - ₦10,000/month\n- Unlimited products\n- 1,500 AI chats\n- Custom domain\n\n**Business** - ₦15,000/month\n- Everything in Pro\n- 10,000 AI chats\n- White label\n- Priority support',
    'help',
    'en',
    100  -- Pre-set high hit count
  ),
  -- Hausa pricing
  (
    MD5('help:ha:nawa ne kudin storehouse'),
    'nawa ne kudin storehouse',
    'Storehouse yana ba da farashi mai sauƙi:\n\n**Tsarin Kyauta** - ₦0/wata\n- Kayayyaki 30\n- Tattaunawa ta AI 10\n\n**Mai farawa** - ₦5,000/wata\n- Kayayyaki 200\n- Tattaunawa ta AI 500',
    'help',
    'ha',
    50
  );
```

### 4. Smart Cache Invalidation

Clear outdated entries automatically:

```typescript
// Add to Edge Function
async function cleanupCache(supabase: any): Promise<void> {
  // Remove expired entries
  await supabase
    .from('ai_response_cache')
    .delete()
    .lt('expires_at', new Date().toISOString());

  // Remove low-value entries (hit less than 3 times in 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await supabase
    .from('ai_response_cache')
    .delete()
    .lt('hit_count', 3)
    .lt('created_at', sevenDaysAgo.toISOString());
}
```

## Cost Impact

With proper caching:

| Metric | Without Cache | With Cache | Savings |
|--------|--------------|------------|---------|
| Cost per chat | ₦0.89 | ₦0.62 | 30% |
| Free tier monthly | ₦26.70 | ₦18.60 | ₦8.10 |
| Starter monthly | ₦445 | ₦310 | ₦135 |
| Pro monthly | ₦1,335 | ₦930 | ₦405 |
| Business monthly | ₦8,900 | ₦6,200 | ₦2,700 |

## Monitoring Cache Performance

```sql
-- Check cache hit rate
SELECT
  DATE(created_at) as date,
  COUNT(CASE WHEN cache_hit THEN 1 END) as hits,
  COUNT(*) as total,
  ROUND(COUNT(CASE WHEN cache_hit THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as hit_rate
FROM ai_chat_analytics
WHERE event_type IN ('chat_completion', 'cache_hit')
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Find cacheable patterns
SELECT
  LEFT(metadata->>'message_preview', 50) as question_pattern,
  COUNT(*) as frequency
FROM ai_chat_analytics
WHERE event_type = 'chat_request'
GROUP BY LEFT(metadata->>'message_preview', 50)
HAVING COUNT(*) > 5
ORDER BY frequency DESC;
```

## Implementation Checklist

- [x] Cache table created (`ai_response_cache`)
- [x] Basic caching logic in Edge Function
- [ ] Warm cache with common responses
- [ ] Add FAQ pre-responses
- [ ] Implement cache cleanup job
- [ ] Monitor hit rates
- [ ] Optimize cache key generation

## Next Steps

1. Run cache warming SQL
2. Monitor hit rates for a week
3. Identify top uncached questions
4. Add them to FAQ responses
5. Aim for 40%+ cache hit rate

Remember: Every cached response saves ₦0.89!