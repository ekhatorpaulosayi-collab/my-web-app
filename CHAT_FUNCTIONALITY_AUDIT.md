# COMPREHENSIVE CHAT FUNCTIONALITY SEARCH RESULTS
## SmartStock V2 Codebase Analysis

### EXECUTIVE SUMMARY
The codebase contains a fully-featured **AI Chat Widget System** with multiple components, database schemas, Edge Functions, and integrations. The system supports 4 chat contexts and handles usage quotas, rate limiting, and abuse prevention.

---

## 1. CHAT COMPONENTS (React/TypeScript)

### Primary Chat Widget Files

#### `/home/ekhator1/smartstock-v2/src/components/AIChatWidget.tsx` (1,425 lines)
**Purpose:** Main intelligent chat widget component with multi-context support
**Features:**
- 4 context types: onboarding, help, storefront, business-advisory
- User type detection: visitor, shopper, authenticated user
- Real-time quota tracking (ai_chat_usage tracking)
- Message history with markdown rendering
- Quick action buttons and suggested questions
- Smart bubble positioning and animations
- Desktop/mobile responsive design
- Modal detection for smart positioning
- Chat analytics tracking
- Conversation state management
- Idle detection and pulsing animations

**Key Props:**
```typescript
interface AIChatWidgetProps {
  contextType?: 'onboarding' | 'help' | 'storefront' | 'business-advisory';
  storeSlug?: string;
  autoOpen?: boolean;
  persistentBubble?: boolean;
  storeInfo?: StoreInfoObject;
}
```

**Message Structure:**
```typescript
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  docReferences?: string[];
  quickActions?: QuickAction[];
}
```

#### Alternative/Variant Chat Widget Files
- `/home/ekhator1/smartstock-v2/src/components/AIChatWidget-enhanced-bubble.tsx` - Enhanced bubble version
- `/home/ekhator1/smartstock-v2/src/components/AIChatWidget.enhanced.tsx` - Enhanced features
- `/home/ekhator1/smartstock-v2/src/components/AIChatWidget-fixed.tsx` - Bug fixes version
- `/home/ekhator1/smartstock-v2/src/components/AIChatWidget-quota-fix.tsx` - Quota handling fixes

---

## 2. CHAT INTEGRATION POINTS

### Pages Using Chat Widget
1. **`/src/App.jsx`** - Root level integration
   - Context: "help" mode
   - persistentBubble: true
   - Appears throughout entire dashboard

2. **`/src/pages/StorefrontPage.tsx`** - Public store pages
   - Context: "storefront" 
   - Specialized for customer inquiries
   - Store-specific product information

3. **`/src/pages/LandingPage.tsx`** - Marketing pages
   - Context: "visitor" mode
   - Auto-opens after 5 seconds for new visitors
   - Marketing-focused prompts

4. **`/src/components/BusinessTipsWidget.tsx`** - Business advisory
   - Context: "business-advisory"
   - Marketing and business growth tips

---

## 3. CHAT SERVICES & UTILITIES

### AI Usage Service
**File:** `/home/ekhator1/smartstock-v2/src/services/aiUsageService.ts`

**Functions:**
- `getAIUsage(userId)` - Get current usage stats
- `incrementAIUsage(userId)` - Increment usage counter
- `getUpgradeBenefits(tier)` - Show upgrade benefits
- `calculateUpgradeROI(tier, sales)` - Calculate ROI

**Tracked Metrics:**
- chatsUsed / chatsRemaining / totalLimit
- percentageUsed
- tierName (Free, Starter, Pro, Business)
- isApproachingLimit flag

**Tier Limits:**
- Free: 30 chats/month
- Starter: 500 chats/month
- Pro: 1,500 chats/month
- Business: 10,000 chats/month

### Documentation Search Service
**File:** `/src/utils/docSearch.ts` (imported in AIChatWidget)
- Searches product documentation for relevant guides
- Hybrid keyword + vector search (RAG - Retrieval Augmented Generation)
- Returns top 3 matching docs with scores

---

## 4. SUPABASE DATABASE SCHEMA

### Chat-Related Tables

#### 1. **ai_chat_usage** (User Monthly Quota Tracking)
```sql
- id (UUID, PK)
- user_id (UUID FK → auth.users)
- store_id (UUID FK → stores)
- month (DATE - first day of month)
- chats_used (INTEGER)
- created_at, updated_at (TIMESTAMPTZ)
- UNIQUE(user_id, month)
```
**Purpose:** Track monthly AI chat usage per user
**Indexes:** idx_ai_chat_usage_user_month

#### 2. **ai_chat_messages** (Chat History)
```sql
- id (UUID, PK)
- user_id (UUID FK)
- store_id (UUID FK)
- session_id (TEXT)
- role (ENUM: user, assistant, system)
- content (TEXT)
- tokens_used (INTEGER)
- context_type (TEXT)
- metadata (JSONB)
- created_at (TIMESTAMPTZ)
```
**Purpose:** Store full chat message history for analytics
**Indexes:** idx_ai_chat_messages_user, idx_ai_chat_messages_session

#### 3. **ai_response_cache** (Response Caching)
```sql
- id (UUID, PK)
- query_hash (TEXT UNIQUE)
- query_text (TEXT)
- response (TEXT)
- context_type (TEXT)
- language (TEXT)
- hit_count (INTEGER)
- last_accessed (TIMESTAMPTZ)
- expires_at (TIMESTAMPTZ, 7-day default)
```
**Purpose:** Cache common chat responses to reduce API costs
**Indexes:** idx_ai_response_cache_hash, idx_ai_response_cache_expires

#### 4. **ai_chat_analytics** (Event Tracking)
```sql
- id (UUID, PK)
- event_type (TEXT)
- user_id (UUID FK)
- store_id (UUID FK)
- session_id (TEXT)
- visitor_ip (TEXT)
- context_type (TEXT)
- response_time_ms (INTEGER)
- tokens_used (INTEGER)
- cache_hit (BOOLEAN)
- error_message (TEXT)
- metadata (JSONB)
- created_at (TIMESTAMPTZ)
```
**Purpose:** Track all chat events for analytics and optimization
**Indexes:** idx_ai_chat_analytics_user, idx_ai_chat_analytics_event, idx_ai_chat_analytics_store

#### 5. **chat_rate_limits** (Visitor Rate Limiting)
```sql
- visitor_ip (TEXT, PK)
- chat_count (INTEGER)
- last_reset (TIMESTAMPTZ)
- blocked_until (TIMESTAMPTZ)
- created_at, updated_at (TIMESTAMPTZ)
```
**Purpose:** Track visitor chat frequency for abuse prevention
**Limits:** 7 chats per 24 hours per IP
**Indexes:** idx_ai_chat_rate_limits_reset

#### 6. **chat_abuse_log** (Abuse Detection)
```sql
- id (UUID, PK)
- user_id (TEXT FK)
- ip_address (TEXT)
- message_type (ENUM: off_topic, jailbreak, spam, suspicious_response)
- message (TEXT)
- blocked (BOOLEAN)
- created_at (TIMESTAMPTZ)
```
**Purpose:** Log suspicious chat attempts for monitoring
**Indexes:** idx_chat_abuse_log_ip, idx_chat_abuse_log_type, idx_chat_abuse_log_user

### Helper Functions & Procedures

#### 1. **check_chat_quota(user_id, context_type)** 
- Returns: `{ allowed, message, chats_used, chat_limit, remaining, tier_id }`
- Auto-increments usage if allowed
- Checks active subscription tier
- Creates monthly usage record if doesn't exist

#### 2. **get_ai_chat_usage(user_id)**
- Returns: `{ chat_count, tier_limit, remaining, percentage_used }`
- Gets current month's usage

#### 3. **increment_ai_chat_usage(user_id, store_id, tier_name, tier_limit)**
- Returns: BOOLEAN (true if under limit)
- Increments counter
- Creates record if doesn't exist

#### 4. **cleanup_visitor_rate_limits()**
- Resets counts older than 24 hours
- Deletes entries older than 7 days

#### 5. **cleanup_expired_cache()**
- Deletes expired cache entries (>7 days)

### Views Created

#### 1. **ai_chat_usage_summary**
- Current month usage across all users
- Shows: user_id, store_id, tier_name, chat_count, tier_limit, remaining, percentage_used

#### 2. **ai_chat_daily_stats**
- Daily analytics aggregation
- Shows: total_chats, unique_users, unique_sessions, avg_tokens, cache_hits, cache_hit_rate

### Database Migrations

1. **create_ai_chat_tracking_tables.sql** - Main schema
2. **20251203_create_chat_abuse_log.sql** - Abuse logging
3. **20251206_create_chat_quota_function.sql** - Quota checking
4. **20250101_chat_analytics.sql** - Analytics table
5. **20250114000001_fix_chat_quota_stale_sessions.sql** - Session fixes

---

## 5. SUPABASE EDGE FUNCTIONS

### Main AI Chat Function
**Location:** `/supabase/functions/ai-chat/index.ts` (100KB+)

**Endpoint:** `POST /functions/v1/ai-chat`

**Request Body:**
```typescript
{
  message: string;
  contextType?: 'onboarding' | 'help' | 'storefront' | 'business-advisory';
  storeSlug?: string;
  userType?: 'visitor' | 'shopper' | 'user';
  appContext?: any;
  relevantDocs?: Array<{id, title, description, content, score}>;
  storeInfo?: StoreInfo;
  conversationHistory?: Array<{role, content}>;
}
```

**Response:**
```typescript
{
  response: string;
  confidence: number;
  quotaInfo?: {chatsUsed, chatLimit, remaining, isGrandfathered};
  docReferences?: string[];
  cacheHit?: boolean;
  responseTime?: number;
  tokensUsed?: number;
}
```

**Key Features:**
1. **Language Detection** - Auto-detects user language
2. **Off-Topic Detection** - Prevents out-of-scope questions
3. **Spam Detection** - Blocks spam/malicious content
4. **Rate Limiting** - Enforces 7 messages/24hr per IP
5. **Abuse Logging** - Tracks jailbreak/suspicious attempts
6. **RAG Integration** - Uses documentation for context
7. **Store Context** - Product search and store info
8. **Quota Enforcement** - Checks user's monthly limit
9. **Response Caching** - Caches common responses
10. **Conversation Tracking** - Stores message history

### Related Edge Functions
- `handleStorefrontChat-NEW.ts` - Storefront-specific logic
- `handleStorefrontChat-QUALITY.ts` - Quality-focused version
- `store-context.ts` - Helper functions for store data
- `add-tracking-patch.ts` - Adds tracking to responses

---

## 6. GUARDRAILS & SAFETY

### Context-Specific System Prompts

#### Onboarding Mode:
- Only helps with setup tasks (products, sales, payments, features)
- Rejects off-topic questions
- Encourages completion of setup checklist

#### Help Mode:
- Answers product management, sales, customers, invoices, reports
- Uses RAG (documentation search) for accurate answers
- Shows relevant Help Center links

#### Storefront Mode:
- Shopping assistant for customers
- Answers about products, prices, availability, delivery
- Never discusses personal opinions or other businesses
- Blocks payment processing questions (security)

#### Business Advisory:
- Nigerian business consultant
- Marketing strategies, sales techniques, pricing
- Customer retention, inventory management

### Abuse Prevention Mechanisms

1. **Rate Limiting**
   - Max 7 messages per 24 hours per IP
   - Resets automatically
   - Blocks with 429 status code

2. **Spam Detection**
   - Blocks URLs and links (http/https)
   - Detects crypto/scam keywords
   - Blocks messages with repeated characters
   - Max 500 character limit

3. **Off-Topic Detection**
   - Detects unrelated questions
   - Pattern matching for jailbreak attempts
   - "Ignore previous instructions" detection
   - Logs attempts to abuse_log table

4. **Profanity Filtering**
   - Filters offensive content
   - Nigerian context-aware

5. **Cost Limits**
   - Per-user monthly quota enforcement
   - Tier-based limits (Free: 30, Starter: 500, Pro: 1500, Business: 10k)
   - 429 response when exhausted

6. **Context Injection Prevention**
   - Detects prompt injection attempts
   - Blocks manipulation patterns
   - Logs suspicious messages

---

## 7. CHAT ANALYTICS

### Tracked Events
- chat_opened
- chat_closed
- message_sent
- message_received
- quota_exceeded
- rate_limit_hit
- off_topic_attempt
- spam_detected
- link_clicked
- support_escalated

### Analytics Views
- Daily usage trends
- Cache hit rates
- Response times
- Error tracking
- Per-user usage
- Per-store usage
- IP-based patterns

---

## 8. CONVERSATION STATE MANAGEMENT

### In-Memory Visitor Tracking
```typescript
interface ConversationState {
  messageCount: number;
  matchedCategories: string[];
  intentScores: {
    buying: number;
    technical: number;
    skeptical: number;
  };
  averageConfidence: number;
  hasSeenCTA: boolean;
}
```

### Persistent User Sessions
- Stored in ai_chat_messages table
- session_id tracks conversation continuity
- Can retrieve full conversation history

---

## 9. DOCUMENTATION & GUIDES

### Implementation Guides (Root Directory)
1. **SIMPLE_CHAT_WIDGET_PLAN.md** - Architecture and cost analysis
2. **CHAT_WIDGET_PRICING_STRATEGY.md** - Pricing tiers and strategy
3. **AI_CHAT_IMPLEMENTATION_GUIDE.md** - Feature-by-feature walkthrough
4. **AI_CHAT_DEPLOYMENT_GUIDE.md** - Deployment instructions
5. **AI_CHAT_WIDGET_TEST_SCENARIOS.md** - Testing procedures

### Test Files
- `/test-ai-chat.js` - Unit tests
- `/test-ai-chat-live.js` - Live testing
- `/test-chat-widget.html` - HTML test page
- `/AI_CHAT_TEST_RESULTS.md` - Test results documentation

---

## 10. PRICING TIERS & QUOTAS

| Tier | Price | Monthly Chats | Features |
|------|-------|---------------|----------|
| Free | ₦0 | 30 | Dashboard help only, no storefront |
| Starter | ₦5,000 | 500 | Help + Storefront widget |
| Pro | ₦10,000 | 1,500 | Help + Storefront + Analytics |
| Business | ₦15,000 | 10,000 | Unlimited help + Priority support |

**Cost Structure:**
- Model: GPT-4o Mini (₦0.30/chat) or Claude Haiku (₦0.75/chat)
- Estimated margin: 97-99% on paid tiers
- Free tier cost: ₦9/month per user (₦3k for 1000 users)

---

## 11. STORE OWNER CHAT INTERFACES

### Dashboard Chat (App.jsx)
- Always available in bottom-right corner
- Context: "help" mode
- Persistent bubble
- Page-aware suggestions

### Storefront Chat (StorefrontPage.tsx)
- Green button (shopping context)
- Context: "storefront" mode
- Store-specific product search
- Pre-loaded with store info
- Pulsing ring animation to attract attention

### Landing Page Chat (LandingPage.tsx)
- Auto-opens after 5 seconds
- Context: "visitor" mode (marketing)
- Auto-closes on first visit
- Sales-focused messaging

---

## 12. SUPABASE REALTIME FEATURES

**Note:** Current implementation does NOT use Supabase Realtime subscriptions. Chat is:
- Request/response based (HTTP)
- Single turn conversations (stateless)
- Session tracking via database (not realtime)

Future enhancements could add:
- Realtime message updates
- Live typing indicators
- Persistent session connections

---

## 13. FILE STATISTICS

### Chat Component Files
- Total: 9 component variants
- Primary: AIChatWidget.tsx (1,425 lines)
- Total lines: ~15,000+

### Database Files  
- Migrations: 6 migration files
- Tables: 6 core chat tables
- Views: 2 analytics views
- Functions: 5+ helper functions

### Edge Function Files
- Primary: index.ts (100KB)
- Supporting: 4+ helper files
- Total: ~200KB code

### Documentation
- 9+ markdown guides
- 1000+ lines of planning docs
- Implementation playbooks

---

## 14. INTEGRATION POINTS SUMMARY

```
┌─────────────────────────────────────────────────────────────┐
│                     CHAT ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend Components:                                        │
│  ├── AIChatWidget.tsx (main)                                │
│  ├── StorefrontPage.tsx (public store chat)                 │
│  ├── App.jsx (dashboard chat)                               │
│  ├── LandingPage.tsx (marketing chat)                       │
│  └── BusinessTipsWidget.tsx (advisory)                      │
│                                                               │
│  Services & Utils:                                          │
│  ├── aiUsageService.ts (quota tracking)                     │
│  ├── docSearch.ts (RAG search)                              │
│  └── supabaseSales.ts (store context)                       │
│                                                               │
│  Backend (Supabase):                                        │
│  ├── Edge Function: /ai-chat/index.ts                       │
│  ├── RPC Functions: check_chat_quota()                      │
│  └── Webhooks: (if needed)                                  │
│                                                               │
│  Database:                                                   │
│  ├── ai_chat_usage (quota tracking)                         │
│  ├── ai_chat_messages (history)                             │
│  ├── ai_response_cache (caching)                            │
│  ├── ai_chat_analytics (events)                             │
│  ├── chat_rate_limits (abuse prevention)                    │
│  └── chat_abuse_log (violation logging)                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## KEY FINDINGS

✅ **Comprehensive Chat System** - Fully implemented with multiple contexts
✅ **Quota & Cost Control** - Per-user monthly limits, grandfathered users
✅ **Abuse Prevention** - Rate limiting, spam detection, off-topic blocking
✅ **Analytics Ready** - Full tracking of events, usage, and patterns
✅ **RAG Integration** - Uses documentation search for better answers
✅ **Multi-Context Support** - Onboarding, help, storefront, advisory
✅ **Store-Aware** - Can access store info and product data
✅ **Visitor Tracking** - Anonymous visitor sessions and analytics
✅ **Caching Strategy** - Response caching to reduce API costs
✅ **Well Documented** - Planning guides, implementation docs, test scenarios

⚠️ **Not Using Realtime** - Chat is request/response, not streaming
⚠️ **No WebSocket** - No persistent connections for live updates
⚠️ **No Push Notifications** - No alerting for offline users

