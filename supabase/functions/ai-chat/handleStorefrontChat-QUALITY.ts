// QUALITY-OPTIMIZED handleStorefrontChat
// Priority: Best responses > Cost savings
// AI-First approach with smart guardrails

async function handleStorefrontChat(
  supabase: any,
  message: string,
  storeSlug: string,
  storeInfo?: StoreInfo,
  sessionId: string = 'default'
) {
  console.log('[StorefrontChat] Processing:', { storeSlug, messageLength: message.length });

  // ============================================================================
  // GUARDRAIL 1: SPAM DETECTION (Keep this - blocks abuse)
  // ============================================================================
  if (isSpam(message)) {
    console.warn('[Guardrail] Spam detected');
    return jsonResponse({
      response: '🚫 Message blocked. Please send a valid shopping question.',
      blocked: true,
      reason: 'spam',
    });
  }

  // ============================================================================
  // GUARDRAIL 2: RATE LIMITING (Keep this - prevents abuse)
  // ============================================================================
  const rateLimitCheck = checkRateLimit(sessionId, 20, 8);  // INCREASED: 20 msgs/session, 8/min
  if (!rateLimitCheck.allowed) {
    console.warn('[Guardrail] Rate limit:', rateLimitCheck.reason);

    const { data: store } = await supabase
      .from('stores')
      .select('business_name, whatsapp_number')
      .eq('store_slug', storeSlug)
      .single();

    return jsonResponse({
      response: getRateLimitResponse(
        rateLimitCheck.reason!,
        store?.business_name || 'our store',
        store?.whatsapp_number,
        rateLimitCheck.waitSeconds
      ),
      blocked: true,
      reason: rateLimitCheck.reason,
    });
  }

  // ============================================================================
  // LOAD STORE CONTEXT (Complete RAG Retrieval)
  // ============================================================================
  const storeContext = await getStoreContext(supabase, storeSlug);

  if (!storeContext) {
    return jsonResponse({
      error: 'Store not found',
      response: 'Sorry, this store is not available right now.',
    }, 404);
  }

  // ============================================================================
  // GUARDRAIL 3: OFF-TOPIC DETECTION (Keep this - focuses conversation)
  // ============================================================================
  const offTopicCheck = isOffTopic(message);
  if (offTopicCheck.isOffTopic) {
    console.warn('[Guardrail] Off-topic:', offTopicCheck.reason);

    const isBlocked = trackOffTopicAttempt(sessionId);

    return jsonResponse({
      response: getOffTopicResponse(
        offTopicCheck.reason!,
        storeContext.profile.businessName,
        storeContext.profile.whatsappNumber
      ),
      blocked: isBlocked,
      reason: 'off_topic',
      offTopicCategory: offTopicCheck.reason,
    });
  }

  // ============================================================================
  // DETECT LANGUAGE (Multi-language support)
  // ============================================================================
  const language = detectLanguage(message);
  console.log('[Language] Detected:', language);

  const lowerMessage = message.toLowerCase();
  const businessName = storeContext.profile.businessName;

  // ============================================================================
  // MINIMAL FAQ: Only for TRIVIAL queries (greetings, contact)
  // Everything else goes to AI for QUALITY
  // ============================================================================

  // Greeting only
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)$/i.test(message.trim())) {
    const greetings = {
      english: `👋 Welcome to ${businessName}! How can I help you today?`,
      pidgin: `👋 Welcome to ${businessName}! Wetin you wan buy?`,
      yoruba: `👋 E kaabo si ${businessName}! Bawo ni MO le ran yin lọwọ?`,
      igbo: `👋 Nnọọ na ${businessName}! Kedu ka m ga-esi nyere gị aka?`,
      hausa: `👋 Barka da zuwa ${businessName}! Yaya zan iya taimaka muku?`,
    };

    return jsonResponse({
      response: greetings[language] || greetings.english,
      confidence: 0.95,
      source: 'faq',
      language,
    });
  }

  // Contact info only (quick lookup)
  if (/^(contact|phone|whatsapp|call)$/i.test(message.trim())) {
    if (storeContext.profile.whatsappNumber) {
      return jsonResponse({
        response: `📱 **Contact Us:**\n\nWhatsApp/Call: ${storeContext.profile.whatsappNumber}`,
        confidence: 0.95,
        source: 'faq',
      });
    }
  }

  // ============================================================================
  // AI-FIRST: Route EVERYTHING else to AI for QUALITY responses
  // ============================================================================
  console.log('[AI] Routing to AI for quality response');

  if (!OPENAI_API_KEY) {
    return jsonResponse({
      response: getLanguageFallback(language, storeContext.profile.whatsappNumber),
      confidence: 0.5,
      source: 'fallback',
    });
  }

  const languageInstruction = getLanguageInstruction(language);

  // Build COMPREHENSIVE system prompt with ALL store data
  const systemPrompt = `You are an expert shopping assistant for ${businessName}.

**LANGUAGE:**
${languageInstruction}

**YOUR ROLE:**
Help customers find perfect products, answer questions intelligently, and drive sales. Be conversational, helpful, and persuasive (but honest).

**STORE PROFILE:**
Business: ${businessName}
${storeContext.profile.aboutUs ? `About: ${storeContext.profile.aboutUs}` : ''}
${storeContext.profile.address ? `Address: ${storeContext.profile.address}` : ''}
${storeContext.profile.whatsappNumber ? `WhatsApp: ${storeContext.profile.whatsappNumber}` : ''}
${storeContext.profile.businessHours ? `Hours: ${storeContext.profile.businessHours}` : ''}

**DELIVERY POLICY:**
${storeContext.policies.delivery.areas ? `Areas: ${storeContext.policies.delivery.areas}` : 'Contact us for delivery info'}
${storeContext.policies.delivery.time ? `Delivery Time: ${storeContext.policies.delivery.time}` : ''}

**RETURN POLICY:**
${storeContext.policies.returns || 'Contact us for return policy'}

**PAYMENT METHODS:**
${storeContext.policies.payment_methods.length > 0
  ? storeContext.policies.payment_methods.map(pm => `${pm.provider}: ${pm.account_name} (${pm.account_number})`).join('\n')
  : 'Contact us for payment options'}

**AVAILABLE PRODUCTS (${storeContext.products.filter(p => p.quantity > 0).length} in stock):**
${storeContext.products.filter(p => p.quantity > 0).slice(0, 30).map(p => {
  const price = Math.floor(p.selling_price / 100);
  const specs = Object.entries(p.specifications || {})
    .map(([key, val]) => `${key}: ${val}`)
    .join(', ');
  return `• ${p.name}: ₦${price.toLocaleString()} (${p.quantity} in stock)${p.description ? ` - ${p.description}` : ''}${specs ? ` | Specs: ${specs}` : ''}`;
}).join('\n')}

${storeContext.products.filter(p => p.quantity === 0).length > 0 ? `\n**OUT OF STOCK:**\n${storeContext.products.filter(p => p.quantity === 0).slice(0, 10).map(p => `• ${p.name}`).join('\n')}` : ''}

**RESPONSE GUIDELINES:**
1. **Be Conversational**: Chat naturally in ${language}, don't sound robotic
2. **Understand Intent**: If customer says "for my mom", recommend accordingly
3. **Compare Options**: When showing multiple products, explain differences
4. **Upsell Smartly**: Suggest combos, upgrades if relevant (but don't be pushy)
5. **Be Specific**: Use exact prices and stock numbers from the list above
6. **NEVER Invent**: Only mention products, prices, and specs from the data above
7. **WhatsApp CTA**: Always end product recommendations with WhatsApp number for ordering
8. **Handle Questions**: If asked about delivery/returns/payment, use the policy data above
9. **Be Brief But Complete**: 3-5 sentences max, but include all key details
10. **Out of Stock**: If product unavailable, suggest similar alternatives from stock

**EXAMPLES OF QUALITY RESPONSES:**

Customer: "I need a phone for my dad"
You: "Great! For dads, I recommend phones with large displays and simple interfaces:

🏆 Samsung Galaxy A14 - ₦98,000
→ 6.6" large display (easy to read)
→ 5000mAh battery (2-3 days use)
→ Simple Android interface

The large screen and long battery mean he won't struggle with small text or constant charging. Perfect for calls, WhatsApp, and family photos!

📱 To order: WhatsApp ${storeContext.profile.whatsappNumber || 'us'}"

Customer: "Cheapest phone?"
You: "Our most affordable smartphone is the Infinix Smart 7 at ₦55,000!

It's budget-friendly but still quality:
✓ Works great for WhatsApp, calls, social media
✓ Decent camera
✓ 5000mAh battery
✓ In stock: 2 units

Want something with more features? The Tecno Spark 10 (₦65,000) has a better camera for just ₦10k more.

📱 Ready to order? WhatsApp: ${storeContext.profile.whatsappNumber || 'us'}"

Customer: "Do you deliver to Lekki?"
You: "${storeContext.policies.delivery.areas?.toLowerCase().includes('lekki') || storeContext.policies.delivery.areas?.toLowerCase().includes('lagos')
  ? `Yes! We deliver to Lekki. Delivery takes ${storeContext.policies.delivery.time || '2-3 business days'}. 📱 WhatsApp ${storeContext.profile.whatsappNumber} to place your order!`
  : `Let me check our delivery areas: ${storeContext.policies.delivery.areas || 'Please WhatsApp us to confirm'}. 📱 ${storeContext.profile.whatsappNumber}`}"

Now answer the customer's question using the store data above. Be helpful, accurate, and conversational!`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',  // Fast and good quality
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 300,  // INCREASED for detailed responses
        temperature: 0.8,  // INCREASED for more natural, conversational tone
      }),
    });

    const data = await response.json();

    if (data.choices && data.choices[0]?.message?.content) {
      const aiResponse = data.choices[0].message.content.trim();

      // Validate AI response (prevent hallucinations)
      const validation = validateStorefrontResponse(
        aiResponse,
        message,
        storeContext.products,
        storeContext.profile
      );

      if (!validation.valid) {
        console.warn('[AI] Validation failed:', validation.reason);

        // For quality-first, return the fixed response but log the issue
        return jsonResponse({
          response: validation.fixedResponse || getLanguageFallback(language, storeContext.profile.whatsappNumber),
          confidence: 0.6,
          source: 'ai_validated',
          validationWarning: validation.reason,
        });
      }

      return jsonResponse({
        response: aiResponse,
        confidence: 0.95,  // HIGH confidence for AI responses
        source: 'ai',
        language,
      });
    }
  } catch (error) {
    console.error('[AI] Error:', error);
  }

  // Final fallback (rare)
  return jsonResponse({
    response: getLanguageFallback(language, storeContext.profile.whatsappNumber),
    confidence: 0.5,
    source: 'fallback',
  });
}
