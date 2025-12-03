// AI Chat - Intelligent Onboarding & Help System
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ChatRequest {
  message: string;
  sessionId?: string;
  contextType?: 'onboarding' | 'help' | 'storefront';
  storeSlug?: string; // For storefront widget
  appContext?: any; // NEW: User's app state (products, sales, etc.)
  relevantDocs?: any[]; // NEW: Documentation search results (RAG)
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    let userId: string | null = null;
    let ipAddress = req.headers.get('x-forwarded-for') || 'unknown';

    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    // Parse request
    const body: ChatRequest = await req.json();
    const {
      message,
      sessionId = 'default',
      contextType = 'onboarding',
      storeSlug,
      appContext = {},     // NEW: User's app state
      relevantDocs = []    // NEW: Documentation search results (RAG)
    } = body;

    // Validation
    if (!message || message.trim().length === 0) {
      return jsonResponse({ error: 'Message is required' }, 400);
    }

    if (message.length > 500) {
      return jsonResponse({ error: 'Message too long (max 500 characters)' }, 400);
    }

    // Check for spam patterns
    if (isSpam(message)) {
      return jsonResponse({ error: 'Message blocked by spam filter' }, 400);
    }

    // Rate limiting (10 messages per hour per IP)
    const rateLimitIdentifier = userId || ipAddress;
    const { data: rateLimitOk } = await supabase.rpc('check_rate_limit', {
      p_identifier: rateLimitIdentifier,
      p_max_per_hour: userId ? 20 : 10, // Higher limit for logged-in users
    });

    if (!rateLimitOk) {
      return jsonResponse({
        error: 'Too many messages. Please try again in 1 hour.',
        retryAfter: 3600,
      }, 429);
    }

    // Check chat quota (for logged-in users)
    let quotaInfo = null;
    if (userId) {
      const { data: quota } = await supabase.rpc('check_chat_quota', {
        p_user_id: userId,
        p_context_type: contextType, // Pass context type for quota tracking
      });

      quotaInfo = quota;

      if (!quota?.allowed) {
        return jsonResponse({
          error: quota?.message || 'Chat limit exceeded',
          chatsUsed: quota?.chats_used,
          chatLimit: quota?.chat_limit,
          upgradeRequired: true,
        }, 429);
      }
    }

    // Get user context (for personalization)
    let userContext: any = {};
    if (userId) {
      const { data: context } = await supabase.rpc('get_user_context', {
        p_user_id: userId,
      });
      userContext = context || {};
    }

    // Handle storefront context (different logic)
    if (contextType === 'storefront' && storeSlug) {
      return await handleStorefrontChat(supabase, message, storeSlug);
    }

    // Get or create conversation
    const { data: conversation } = await supabase
      .from('ai_chat_conversations')
      .upsert({
        user_id: userId,
        session_id: sessionId,
        context_type: contextType,
        user_type: userContext.business_type || 'unknown',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,session_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (!conversation) {
      throw new Error('Failed to create conversation');
    }

    // Save user message
    await supabase.from('ai_chat_messages').insert({
      conversation_id: conversation.id,
      role: 'user',
      content: message,
    });

    // Get conversation history (last 10 messages)
    const { data: history } = await supabase
      .from('ai_chat_messages')
      .select('role, content')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(10);

    // Generate AI response with RAG
    const { response: aiResponse, confidence } = await generateAIResponse(
      message,
      history || [],
      userContext,
      contextType,
      relevantDocs  // NEW: Pass documentation
    );

    // Save AI response
    await supabase.from('ai_chat_messages').insert({
      conversation_id: conversation.id,
      role: 'assistant',
      content: aiResponse,
    });

    // Update user preferences based on conversation
    if (userId) {
      await updateUserPreferences(supabase, userId, message, userContext);
    }

    return jsonResponse({
      response: aiResponse,
      confidence: confidence,  // NEW: For escalation logic
      quotaInfo: quotaInfo,
      context: {
        productCount: userContext.product_count,
        salesCount: userContext.sales_count,
        currentStep: userContext.current_step,
      },
    });

  } catch (error) {
    console.error('Chat error:', error);
    return jsonResponse({
      error: 'Failed to process message',
      details: error.message,
    }, 500);
  }
});

// Generate AI response using GPT-4o Mini with RAG support
async function generateAIResponse(
  userMessage: string,
  history: any[],
  userContext: any,
  contextType: string,
  relevantDocs: any[] = []  // NEW: Documentation context
): Promise<{ response: string; confidence: number }> {
  if (!OPENAI_API_KEY) {
    return {
      response: "Sorry, AI is currently unavailable. Please try again later.",
      confidence: 0
    };
  }

  // Build system prompt with documentation (RAG)
  const systemPrompt = buildSystemPrompt(userContext, contextType, relevantDocs);

  // Build messages array
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (data.choices && data.choices[0]?.message?.content) {
      // Calculate confidence based on documentation match
      let confidence = 0.5; // Default medium confidence
      if (relevantDocs.length > 0) {
        const topScore = relevantDocs[0].score || 0;
        if (topScore > 80) confidence = 0.9;
        else if (topScore > 50) confidence = 0.7;
        else if (topScore > 20) confidence = 0.5;
        else confidence = 0.3;
      } else {
        confidence = 0.3; // Low confidence if no docs matched
      }

      return {
        response: data.choices[0].message.content.trim(),
        confidence: confidence
      };
    } else {
      throw new Error('Invalid response from OpenAI');
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    return {
      response: getFallbackResponse(userMessage, userContext),
      confidence: 0.3
    };
  }
}

// Build context-aware system prompt
function buildSystemPrompt(userContext: any, contextType: string, relevantDocs: any[] = []): string {
  const productCount = userContext.product_count || 0;
  const tier = userContext.tier || 'free';
  const productLimit = userContext.product_limit || 50;
  const daysSinceSignup = userContext.days_since_signup || 0;

  // NEW: Build documentation context for RAG
  const documentationContext = relevantDocs.length > 0
    ? `
RELEVANT DOCUMENTATION (Use this to answer accurately):
${relevantDocs.map((doc, idx) => `
${idx + 1}. ${doc.title}
${doc.description}

${doc.content || ''}

---
`).join('\n')}

IMPORTANT: Base your answer on the documentation above. Cite the guide name when relevant.
If the documentation doesn't fully answer the question, say so and offer to connect them with support.
    `.trim()
    : '';

  const basePrompt = `You are Storehouse's AI Guide - friendly, helpful, and excited about helping Nigerian businesses succeed.

${documentationContext ? documentationContext + '\n\n' : ''}

YOUR MISSION:
1. Help users get set up and succeed quickly
2. Discover what they need and guide them to the RIGHT features
3. Subtly showcase premium features when relevant (without being pushy)
4. Create "aha moments" that make them love Storehouse

CONVERSATION STYLE:
- Warm and conversational (like a helpful friend, not a robot)
- Ask ONE question at a time to understand their business
- Use 1-2 emojis max (keep it professional but friendly)
- Keep responses under 100 words
- Celebrate their wins ("That's awesome! 🎉")

CURRENT USER:
- Products: ${productCount}/${productLimit}
- Plan: ${tier}
- Business type: ${userContext.business_type || 'unknown'}
- Days active: ${daysSinceSignup}
- Sales: ${userContext.sales_count || 0}
- Has store: ${userContext.has_store ? 'Yes' : 'No'}

FEATURE INTRODUCTION RULES:
- Only suggest features AFTER understanding their need
- Frame features as solutions to THEIR specific problem
- Show, don't tell (guide them to click the button, don't do it for them)
- Use tier-appropriate language:
  * Free users: "You can do X right now!"
  * When mentioning premium: "When you're ready to scale, [Premium Feature] helps with..."

NEVER DO THIS:
- Don't push upgrades aggressively
- Don't say "I can add products for you" (you can't - guide them to the button)
- Don't mention features they don't need yet
- Don't use salesy language ("Act now!" "Limited time!")
- Don't discuss topics outside Storehouse

ALWAYS DO THIS:
- Guide them to complete ONE task successfully
- Celebrate small wins
- Ask if they need help with next steps
- Remember context from earlier in conversation
- Be genuinely helpful (users can smell fake)
`;

  if (contextType === 'onboarding') {
    const onboardingPrompt = basePrompt + `
CONTEXT: NEW USER ONBOARDING (${daysSinceSignup} days old)

DISCOVERY QUESTIONS (First conversation):
1. "What type of products do you sell?"
2. "Do you sell online, in-store, or both?"
3. "How do you currently track inventory?" (pen & paper / Excel / other app)
4. "What's your biggest challenge right now?" (Learn their pain point)

PRIORITY BASED ON STATUS:
${productCount === 0 ? '- NO PRODUCTS YET: Help them add first product. Ask: "What product should we start with?"' : ''}
${productCount > 0 && productCount < 5 ? `- FEW PRODUCTS (${productCount}): Encourage first sale or add more products` : ''}
${productCount >= 5 ? `- PRODUCTS ADDED (${productCount}): Introduce sales tracking and advanced features` : ''}

SUBTLE UPGRADE TRIGGERS (Use sparingly, only when relevant):
${productCount >= 40 && tier === 'free' ? `
- Product limit warning: "You're growing fast! 📈 You have ${50 - productCount} product slots left on Free. When you hit 50, Starter gives you 200 products + team access for ₦5k/month."
` : ''}
${userContext.asking_about_profit && tier === 'free' ? `
- Profit tracking: "Right now you're seeing revenue. Want to see actual profit? Starter plan shows cost vs revenue breakdown automatically for ₦5k/month. For now, you can manually calculate: Selling Price - Cost Price = Profit."
` : ''}
${userContext.mentioning_team && tier === 'free' ? `
- Team access: "Currently it's just you. Need to add a staff member? Starter lets you add 1 teammate for ₦5k/month."
` : ''}

EXAMPLE GOOD RESPONSES:
User: "I sell shoes"
You: "Nice! Are these sneakers, formal shoes, or a mix? Knowing this helps me show you the best way to organize your inventory 👟"

User: "How do I add products?"
You: "Easy! Click the big '+ Add Item' button at the top right. I'll walk you through it - start with your best-selling product first! What's that one item everyone asks for?"

User: "Can you add products for me?"
You: "I can't add them directly, but I can guide you step-by-step! It's super quick - click '+ Add Item' and I'll help you fill it out. What product should we start with?"

User: "I have 45 products to add"
You: "That's a solid inventory! 💪 You're at ${productCount}/50 products on Free plan. ${productCount >= 45 ? "When you cross 50, Starter plan gives you 200 product slots + team member for ₦5k/month. " : ""}Let's get your first few items in - which one's most important?"`;

    return onboardingPrompt;
  }

  if (contextType === 'help') {
    const helpPrompt = basePrompt + `
CONTEXT: EXISTING USER - DAILY HELP

AVAILABLE FEATURES:
- Product management (add/edit/delete)
- Sales tracking & history
- Customer management
- Financial reports (EOD, profit tracking*)
- Online storefront (free for all)
- Professional invoicing
- Staff management* (paid plans)
- Credit/debt tracking

*Premium features

INTELLIGENT RESPONSES:
${productCount > 10 && !userContext.has_cost_prices ? `
💡 Quick Win: "Add cost prices to see which products make you the most profit. Takes 2 mins!"
` : ''}
${userContext.products_without_images > 5 ? `
📸 Tip: "${userContext.products_without_images} products don't have images yet. Products with photos sell 3× better!"
` : ''}
${productCount >= 45 && tier === 'free' ? `
🚀 Growth Alert: "You're at ${productCount}/50 products! Growing fast. Starter plan gives you 200 product slots when you're ready."
` : ''}

UPGRADE EXAMPLES (Only when relevant to their question):
User: "How do I track profit?"
You: "Great question! Right now you're seeing total sales (revenue). To track actual profit, you'd need to enter cost prices too. The Starter plan (₦5k/month) has a Profit Dashboard that automatically calculates margins. For now, want me to show you how to add cost to your products manually?"

User: "My staff keeps asking me for prices"
You: "Ah, I can help! Quick fix: You can export your inventory and share it. Even better: On Starter plan (₦5k/month), you can add 1 team member with their own login. They can check prices, record sales, and add products. Saves you the back-and-forth. Want to try the export option first?"`;

    return helpPrompt;
  }

  return basePrompt;
}

// Handle storefront chat (customer inquiries)
async function handleStorefrontChat(supabase: any, message: string, storeSlug: string) {
  // Get store owner
  const { data: store } = await supabase
    .from('store_settings')
    .select('user_id, business_name')
    .eq('slug', storeSlug)
    .single();

  if (!store) {
    return jsonResponse({ error: 'Store not found' }, 404);
  }

  // Search products
  const { data: products } = await supabase
    .from('products')
    .select('name, price, quantity')
    .eq('user_id', store.user_id)
    .ilike('name', `%${message}%`)
    .limit(5);

  // Generate response
  const systemPrompt = `You are a shop assistant for ${store.business_name}.

ONLY answer questions about:
1. Product prices
2. Product availability
3. Store information

Products available:
${products?.map((p: any) => `- ${p.name}: ₦${p.price.toLocaleString()} (${p.quantity > 0 ? 'In stock' : 'Out of stock'})`).join('\n') || 'No products found'}

If asked about unrelated topics:
"I can only help with product information. What product are you interested in?"`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: 150,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  const aiResponse = data.choices?.[0]?.message?.content || 'Sorry, I could not process your request.';

  return jsonResponse({ response: aiResponse });
}

// Update user preferences based on conversation
async function updateUserPreferences(supabase: any, userId: string, message: string, userContext: any) {
  const lowercaseMessage = message.toLowerCase();

  // Detect business type from keywords
  let businessType = userContext.business_type;
  let productsSell: string[] = [];

  if (lowercaseMessage.includes('online') || lowercaseMessage.includes('ecommerce') || lowercaseMessage.includes('website')) {
    businessType = 'ecommerce';
  } else if (lowercaseMessage.includes('wholesale') || lowercaseMessage.includes('b2b') || lowercaseMessage.includes('bulk')) {
    businessType = 'wholesale';
  } else if (lowercaseMessage.includes('branch') || lowercaseMessage.includes('location') || lowercaseMessage.includes('multiple')) {
    businessType = 'multilocation';
  } else if (lowercaseMessage.includes('shop') || lowercaseMessage.includes('store') || lowercaseMessage.includes('retail')) {
    businessType = 'retail';
  }

  // Detect products they sell
  const productKeywords = ['phone', 'fashion', 'clothing', 'food', 'electronics', 'furniture', 'cosmetics', 'shoes'];
  productKeywords.forEach(keyword => {
    if (lowercaseMessage.includes(keyword)) {
      productsSell.push(keyword);
    }
  });

  // Update preferences
  await supabase.from('user_onboarding_preferences').upsert({
    user_id: userId,
    business_type: businessType,
    products_sell: productsSell.length > 0 ? productsSell : null,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'user_id',
    ignoreDuplicates: false,
  });
}

// Spam detection
function isSpam(message: string): boolean {
  const spamPatterns = [
    /buy.*crypto/i,
    /click.*here/i,
    /congratulations.*won/i,
    /viagra|cialis/i,
    /\$\$\$/,
    /(.)\1{15,}/, // Repeated characters
    /http[s]?:\/\//,  // URLs
  ];

  return spamPatterns.some(pattern => pattern.test(message));
}

// Fallback response if AI fails
function getFallbackResponse(message: string, userContext: any): string {
  const lowerMessage = message.toLowerCase();

  if (userContext.product_count === 0) {
    return "Let's add your first product! Click the 'Add Product' button in the top right corner. What type of products do you sell?";
  }

  if (lowerMessage.includes('product') || lowerMessage.includes('add') || lowerMessage.includes('item')) {
    return "To add a product, click 'Add Product' in the top right. You'll need the name, purchase price, and selling price. Need help?";
  }

  if (lowerMessage.includes('sale') || lowerMessage.includes('sell')) {
    return "To record a sale, click the 'Sell' button next to any product. This tracks your revenue and reduces stock automatically!";
  }

  if (lowerMessage.includes('store') || lowerMessage.includes('online')) {
    return "Want an online store? Go to Settings → Online Store. You'll get a free storefront where customers can browse your products!";
  }

  return "I'm here to help! Ask me about adding products, recording sales, or setting up your online store. What would you like to do?";
}

// JSON response helper
function jsonResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
