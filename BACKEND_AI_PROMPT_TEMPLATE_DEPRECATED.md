# Enhanced AI Chat Backend - Supabase Edge Function

This document contains the enhanced system prompt and logic for your `ai-chat` Supabase Edge Function.

## File Location
Update this file: `supabase/functions/ai-chat/index.ts`

## Complete Implementation

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// Enhanced system prompt with RAG support
function buildSystemPrompt(appContext: any, relevantDocs: any[]) {
  const userContextSummary = `
USER CONTEXT:
- Current page: ${appContext.currentPage || 'dashboard'}
- Has products: ${appContext.hasProducts ? 'Yes' : 'No'} ${appContext.hasProducts ? `(${appContext.productCount} products)` : ''}
- Has sales: ${appContext.hasSales ? 'Yes' : 'No'} ${appContext.hasSales ? `(${appContext.salesCount} sales)` : ''}
- Has staff: ${appContext.hasStaff ? 'Yes' : 'No'} ${appContext.hasStaff ? `(${appContext.staffCount} staff)` : ''}
- User plan: ${appContext.userPlan || 'FREE'}
- Account age: ${appContext.accountAge || 0} days ${appContext.isNewUser ? '(NEW USER)' : ''}
- Onboarding complete: ${appContext.hasCompletedOnboarding ? 'Yes' : 'No'}
  `.trim();

  const documentationContext = relevantDocs.length > 0
    ? `
RELEVANT DOCUMENTATION (Use this to answer):
${relevantDocs.map((doc, idx) => `
${idx + 1}. ${doc.title}
${doc.description}

${doc.content}

---
`).join('\n')}
    `.trim()
    : 'No specific documentation found for this query.';

  return `You are the Storehouse AI Assistant, helping Nigerian shop owners manage their inventory and grow their business.

${userContextSummary}

${documentationContext}

RESPONSE RULES:
1. **Always use the documentation above to answer** - If the answer is in the docs, cite it: "According to the [${relevantDocs[0]?.title || 'guide'}]..."
2. **Keep responses under 100 words** unless explaining a multi-step process
3. **Use friendly, encouraging tone** - Nigerian English is fine! ("No wahala", "Sharp sharp", etc.)
4. **Be action-oriented** - Give clear, numbered steps when possible
5. **Context-aware responses:**
   - If user has no products: Gently guide them to add first product
   - If user is new (< 7 days): Extra supportive, assume they're learning
   - If on specific page: Give relevant help for that page

6. **Escalation triggers:**
   - If documentation doesn't cover the question, say: "I don't have detailed documentation for that yet. Would you like to contact support?"
   - If user seems frustrated (asking same thing multiple times), suggest support
   - For account-specific issues (billing, access), recommend support

7. **Troubleshooting priority:**
   - Common issues: "Edit button missing" → Explain staff mode
   - Sync issues → Explain offline/online sync
   - Performance → Clear cache, refresh

8. **Never make up features** - Only mention what Storehouse actually has

9. **End with encouragement** when appropriate:
   - "You're making great progress! 🚀"
   - "Keep it up! You'll be a pro in no time 💪"
   - "Any other questions? I'm here to help!"

TONE EXAMPLES:
- Formal: ❌ "To add a product, navigate to the dashboard and click the Add Item button."
- Better: ✅ "Let me show you! Tap '+ Add Item' on your dashboard → Fill in the details → Save. Done! 🎉"

NIGERIAN ENGLISH (When appropriate):
- "No wahala at all!" instead of "No problem"
- "Sharp sharp" for "quickly"
- "You don cam far!" for "You've made great progress"

CONFIDENCE SCORE:
- Return a confidence score (0-1) based on documentation match
- High confidence (0.8-1.0): Answer is directly in docs
- Medium confidence (0.5-0.7): Partial match, some inference
- Low confidence (0-0.4): Not in docs, trigger escalation`;
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    })

    // Get user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Not authenticated')
    }

    // Parse request
    const {
      message,
      contextType,
      storeSlug,
      appContext = {},
      relevantDocs = [],
    } = await req.json()

    // Check quota (FREE: 10/month, STARTER: 50/month, BUSINESS: unlimited)
    const userPlan = appContext.userPlan || 'FREE'
    const chatLimits = {
      FREE: 10,
      STARTER: 50,
      BUSINESS: 999999,
    }

    // Get user's chat count this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('ai_chat_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString())

    const chatLimit = chatLimits[userPlan as keyof typeof chatLimits] || 10
    const remaining = chatLimit - (count || 0)

    if (remaining <= 0 && userPlan !== 'BUSINESS') {
      return new Response(
        JSON.stringify({
          error: `You've reached your monthly chat limit (${chatLimit} for ${userPlan} plan). Upgrade to get more!`,
          quotaInfo: { chat_limit: chatLimit, remaining: 0 },
        }),
        {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          status: 429,
        }
      )
    }

    // Build enhanced system prompt with RAG
    const systemPrompt = buildSystemPrompt(appContext, relevantDocs)

    // Call OpenAI (or Anthropic Claude)
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // or 'gpt-4' for better quality (more expensive)
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    })

    const aiData = await openaiResponse.json()

    if (!openaiResponse.ok) {
      throw new Error(aiData.error?.message || 'AI request failed')
    }

    const aiResponse = aiData.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    // Calculate confidence based on documentation match
    let confidence = 0.5 // Default medium confidence
    if (relevantDocs.length > 0) {
      const topScore = relevantDocs[0].score || 0
      if (topScore > 80) confidence = 0.9
      else if (topScore > 50) confidence = 0.7
      else if (topScore > 20) confidence = 0.5
      else confidence = 0.3
    } else {
      confidence = 0.3 // Low confidence if no docs matched
    }

    // Log the conversation
    await supabase.from('ai_chat_logs').insert({
      user_id: user.id,
      message: message,
      response: aiResponse,
      context_type: contextType,
      confidence: confidence,
      relevant_docs: relevantDocs.map(d => d.id),
      app_context: appContext,
    })

    return new Response(
      JSON.stringify({
        response: aiResponse,
        confidence: confidence,
        quotaInfo: {
          chat_limit: chatLimit,
          remaining: remaining - 1,
        },
      }),
      {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    )
  } catch (error: any) {
    console.error('Chat error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 500,
      }
    )
  }
})
```

## Database Schema

Create this table to log AI conversations:

```sql
CREATE TABLE ai_chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  context_type TEXT,
  confidence DECIMAL(3,2),
  relevant_docs JSONB,
  app_context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_chat_logs_user_id ON ai_chat_logs(user_id);
CREATE INDEX idx_ai_chat_logs_created_at ON ai_chat_logs(created_at);
```

## Alternative: Use Anthropic Claude (Better for Nigerian English!)

Replace OpenAI with Claude for better Nigerian context understanding:

```typescript
// Replace the OpenAI call with:
const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-3-haiku-20240307', // Cheapest and fastest
    // model: 'claude-3-sonnet-20240229', // Better quality
    max_tokens: 300,
    messages: [
      { role: 'user', content: message },
    ],
    system: systemPrompt,
  }),
})

const claudeData = await anthropicResponse.json()
const aiResponse = claudeData.content[0]?.text || 'Sorry, I could not generate a response.'
```

## Environment Variables

Add these to your Supabase project settings:

```
OPENAI_API_KEY=sk-...
# OR
ANTHROPIC_API_KEY=sk-ant-...
```

## Cost Optimization

1. **Use GPT-3.5-turbo** (cheapest) for most queries: ~$0.002 per conversation
2. **Cache responses** for common questions (store in Supabase table)
3. **Limit context size** - Only send top 3 docs, not all 30
4. **Set max_tokens** to 300 (keeps responses concise and costs low)

## Testing

Test the enhanced prompt:

1. User asks: "How do I add a product?"
2. Frontend sends: `{ message: "How do I add a product?", appContext: { hasProducts: false }, relevantDocs: [{...}] }`
3. Backend uses RAG prompt above
4. AI responds with documentation-based answer
5. User sees quick action button: "📖 View Full Guide: Add Your First Product"

## Success!

Your AI chat is now:
- ✅ Context-aware (knows user state)
- ✅ Documentation-powered (RAG)
- ✅ Escalation-ready (low confidence → support)
- ✅ Cost-optimized (cheap model + smart prompting)
- ✅ Nigerian-friendly (understands local English)
