# Chat Translation Feature Implementation

## Overview
Add auto-translation during human takeover so store owners and customers can communicate across languages. Translation ONLY activates during `human_active` conversation state.

## Status: READY FOR IMPLEMENTATION
- Database migration file created: `supabase/migrations/20260331_add_translation_columns.sql`
- Code changes documented below
- Ready to deploy once database columns are added

## Step 1: Database Migration (CREATED)
File: `supabase/migrations/20260331_add_translation_columns.sql`

```sql
-- Add translation columns to ai_chat_messages
ALTER TABLE ai_chat_messages
ADD COLUMN IF NOT EXISTS detected_language TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS translated_text TEXT DEFAULT NULL;
```

**TO APPLY:** Run this in Supabase SQL Editor or via migration tools.

## Step 2: Edge Function Updates

### Location 1: Customer Message Translation (Line ~2425-2435)
**File:** `supabase/functions/ai-chat/index.ts`

**REPLACE** (around line 2425-2435):
```typescript
// Save user message
const messageData = {
  conversation_id: conversation.id,
  store_id: store.id,
  role: 'user',
  content: message,
};

console.log('[StorefrontChat] Saving user message:', messageData);

const { error: msgError } = await supabase.from('ai_chat_messages').insert(messageData);
```

**WITH:**
```typescript
// Check if conversation has active human takeover
let detectedLanguage = null;
let translatedText = null;

// Only translate during human takeover
const { data: convState } = await supabase
  .from('ai_chat_conversations')
  .select('is_agent_active')
  .eq('id', conversation.id)
  .single();

if (convState?.is_agent_active) {
  console.log('[Translation] Human active - detecting language and translating');

  // Use GPT-4o Mini for translation
  try {
    const translationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a language detector and translator. Given a message, respond with ONLY a JSON object (no markdown, no backticks):
{"detected_language": "language_name", "is_english": true/false, "translated_text": "english translation here"}

If the message is already in English, set is_english to true and translated_text to the original message.
Supported languages: English, Pidgin, Igbo, Hausa, Yoruba, French. If unsure, default to English.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 200,
        temperature: 0
      })
    });

    const translationData = await translationResponse.json();
    const translationText = translationData.choices[0].message.content.trim();

    const parsed = JSON.parse(translationText);
    detectedLanguage = parsed.detected_language;
    // Only store translation if message is NOT English
    if (!parsed.is_english) {
      translatedText = parsed.translated_text;
    }
  } catch (e) {
    console.error('[Translation] Error:', e);
    // Continue without translation if it fails
  }
}

// Save user message with translation
const messageData = {
  conversation_id: conversation.id,
  store_id: store.id,
  role: 'user',
  content: message,
  detected_language: detectedLanguage,
  translated_text: translatedText
};

console.log('[StorefrontChat] Saving user message with translation:', messageData);

const { error: msgError } = await supabase.from('ai_chat_messages').insert(messageData);
```

### Location 2: Add Owner Message Translation Handler
**File:** Create new file `supabase/functions/send-agent-message/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

serve(async (req) => {
  try {
    const { conversationId, message, agentId } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get last customer message language
    const { data: lastCustomerMsg } = await supabase
      .from('ai_chat_messages')
      .select('detected_language')
      .eq('conversation_id', conversationId)
      .eq('role', 'user')
      .not('detected_language', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let translatedText = null;
    const customerLanguage = lastCustomerMsg?.detected_language;

    if (customerLanguage && customerLanguage.toLowerCase() !== 'english') {
      // Translate owner's message to customer's language
      try {
        const reverseTranslation = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `Translate this message to ${customerLanguage}. Respond with ONLY the translated text, nothing else. Keep it natural and conversational.`
              },
              {
                role: 'user',
                content: message
              }
            ],
            max_tokens: 200,
            temperature: 0
          })
        });

        const reverseData = await reverseTranslation.json();
        translatedText = reverseData.choices[0].message.content.trim();
      } catch (e) {
        console.error('[Translation] Error translating owner message:', e);
      }
    }

    // Save owner message with translation
    const { data: savedMessage } = await supabase
      .from('ai_chat_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: message,
        is_agent_message: true,
        agent_id: agentId,
        sender_type: 'agent',
        detected_language: 'english',
        translated_text: translatedText
      })
      .select()
      .single();

    return new Response(JSON.stringify({ success: true, message: savedMessage }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

## Step 3: Frontend Updates

### Update 1: Dashboard Message Display
**File:** `src/components/dashboard/ConversationsSimplifiedFixed.tsx`

**FIND** the message rendering section (around line where messages are displayed) and **ADD** translation display:

```tsx
{/* In the message rendering loop */}
{message.role === 'user' ? (
  <div className="message customer">
    <p>{message.content}</p>
    {message.translated_text && message.detected_language !== 'english' && (
      <div style={{
        fontSize: '12px',
        color: '#666',
        fontStyle: 'italic',
        marginTop: '4px',
        borderTop: '1px solid #eee',
        paddingTop: '4px'
      }}>
        🌐 {message.translated_text}
      </div>
    )}
  </div>
) : (
  <div className="message agent">
    <p>{message.content}</p>
    {message.translated_text && (
      <div style={{
        fontSize: '11px',
        color: '#999',
        marginTop: '2px'
      }}>
        Sent in {message.detected_language === 'english' ? 'customer language' : message.detected_language}
      </div>
    )}
  </div>
)}
```

### Update 2: Customer Widget Message Display
**File:** `src/components/AIChatWidget.tsx`

**FIND** the message rendering section and **UPDATE** to show translated versions:

```tsx
{/* In the message rendering section */}
{message.role === 'assistant' && message.translated_text ? (
  <div className="message assistant">
    <p>{message.translated_text}</p>
    <span style={{
      fontSize: '11px',
      color: '#999',
      marginTop: '2px'
    }}>
      Translated from English
    </span>
  </div>
) : (
  <div className="message {message.role}">
    <p>{message.content}</p>
  </div>
)}
```

### Update 3: Polling Queries
**File:** `src/components/AIChatWidget.tsx`

**FIND** (around line ~819):
```typescript
.select('*')
```

**REPLACE WITH:**
```typescript
.select('*, detected_language, translated_text')
```

**File:** `src/components/dashboard/ConversationsSimplifiedFixed.tsx`

**FIND** message polling query and **UPDATE** select to include:
```typescript
.select('*, detected_language, translated_text')
```

### Update 4: Send Agent Message Hook
**File:** `src/components/dashboard/ConversationsSimplifiedFixed.tsx`

**FIND** the send message function and **REPLACE** with call to new edge function:

```typescript
const sendAgentMessage = async (message: string) => {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-agent-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        conversationId: selectedConversation.id,
        message,
        agentId: user?.id
      })
    });

    const data = await response.json();
    if (data.success) {
      // Message will appear via polling
      setInputMessage('');
    }
  } catch (error) {
    console.error('Failed to send agent message:', error);
  }
};
```

## Step 5: Deployment Steps

1. **Apply database migration:**
   ```bash
   # Via Supabase Dashboard SQL Editor or:
   npx supabase db push
   ```

2. **Deploy edge functions:**
   ```bash
   npx supabase functions deploy ai-chat
   npx supabase functions deploy send-agent-message
   ```

3. **Build and deploy frontend:**
   ```bash
   npm run build
   vercel --prod
   ```

## Testing

1. Customer sends message in Hausa: "Nawa ne iPhone?"
2. Dashboard shows original + translation: "How much is the iPhone?"
3. Owner replies in English: "It's 2 million naira"
4. Customer sees: "Naira miliyan 2 ne" with note "Translated from English"

## Cost Analysis
- GPT-4o Mini: ~$0.015 per 100 translated messages
- Negligible cost for typical usage

## Important Notes
- Translation ONLY during `is_agent_active = true`
- If translation fails, messages still save normally
- No new setMessages calls added
- Maintains existing deduplication logic