// NEW handleStorefrontChat with Guardrails & Multi-Language RAG
// Replace the old function (lines 2124-2658) with this

async function handleStorefrontChat(
  supabase: any,
  message: string,
  storeSlug: string,
  storeInfo?: StoreInfo,
  sessionId: string = 'default'
) {
  console.log('[StorefrontChat] Processing:', { storeSlug, sessionId, messageLength: message.length });

  // ============================================================================
  // GUARDRAIL 1: SPAM DETECTION
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
  // GUARDRAIL 2: RATE LIMITING
  // ============================================================================
  const rateLimitCheck = checkRateLimit(sessionId, 15, 5);
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
  // LOAD STORE CONTEXT (RAG Retrieval)
  // ============================================================================
  const storeContext = await getStoreContext(supabase, storeSlug);

  if (!storeContext) {
    return jsonResponse({
      error: 'Store not found',
      response: 'Sorry, this store is not available right now.',
    }, 404);
  }

  // ============================================================================
  // GUARDRAIL 3: OFF-TOPIC DETECTION
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
  // TIER 1: PATTERN-BASED FAQ (Instant, Free)
  // ============================================================================

  // Greeting
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|abeg|sannu|bawo|kedu)/i.test(message)) {
    const greetings = {
      english: `👋 Welcome to ${businessName}! I'm here to help you find products.\n\n💬 Ask me:\n• "How much is [product]?"\n• "Do you have [product]?"\n• "About delivery"\n\nWhat are you looking for?`,
      pidgin: `👋 Welcome to ${businessName}! I dey here to help you find product.\n\n💬 You fit ask:\n• "How much be [product]?"\n• "You get [product]?"\n• "Delivery info"\n\nWetin you wan buy?`,
      yoruba: `👋 E kaabo si ${businessName}! Mo wa lati ran yin lọwọ lati wa awọn oja.\n\n💬 E le beere:\n• "Elo ni [oja]?"\n• "Ṣe e ni [oja]?"\n\nKini e nwa?`,
      igbo: `👋 Nnọọ na ${businessName}! Anọ m ebe a inyere gị aka ịchọta ngwaahịa.\n\n💬 Ị nwere ike ịjụ:\n• "Ego ole bụ [ngwaahịa]?"\n• "Ị nwere [ngwaahịa]?"\n\nGịnị ka ị na-achọ?`,
      hausa: `👋 Barka da zuwa ${businessName}! Ina nan don in taimake ku nemo kayayyaki.\n\n💬 Kuna iya tambaya:\n• "Nawa ne [kaya]?"\n• "Kuna da [kaya]?"\n\nMe kuke nema?`,
    };

    return jsonResponse({
      response: greetings[language] || greetings.english,
      confidence: 0.95,
      source: 'faq',
      language,
    });
  }

  // About the store
  if (/about|who are you|tell me about|your business|your store|wetin.*do|kedu.*ihe/i.test(lowerMessage)) {
    const fullAbout = storeContext.profile.aboutUs || `Welcome to ${businessName}!`;
    const contact = storeContext.profile.whatsappNumber
      ? `\n\n📱 WhatsApp: ${storeContext.profile.whatsappNumber}`
      : '';

    // Smart truncation for long about_us text
    let displayAbout = fullAbout;
    let readMoreHint = '';

    if (fullAbout.length > 500) {
      // Find a good breaking point (end of sentence)
      const truncateAt = fullAbout.substring(0, 500).lastIndexOf('. ');
      const breakPoint = truncateAt > 300 ? truncateAt + 1 : 500;

      displayAbout = fullAbout.substring(0, breakPoint).trim();
      readMoreHint = '\n\n📖 _[Full details available on our storefront page]_';
    }

    return jsonResponse({
      response: `**About ${businessName}**\n\n${displayAbout}${readMoreHint}${contact}\n\nWhat can I help you find?`,
      confidence: 0.95,
      source: 'faq',
      hasMore: fullAbout.length > 500,  // NEW: Indicates truncated
    });
  }

  // Payment methods
  if (/payment|pay|bank|transfer|opay|moniepoint/i.test(lowerMessage)) {
    if (storeContext.policies.payment_methods.length > 0) {
      const methods = storeContext.policies.payment_methods
        .map(pm => `💳 ${pm.provider} - ${pm.account_name} (${pm.account_number})`)
        .join('\n');

      return jsonResponse({
        response: `**Payment Methods:**\n\n${methods}${storeContext.profile.whatsappNumber ? `\n\n📱 WhatsApp: ${storeContext.profile.whatsappNumber}` : ''}`,
        confidence: 0.95,
        source: 'faq',
      });
    }
  }

  // Delivery
  if (/deliver|delivery|shipping|ship/i.test(lowerMessage)) {
    let deliveryInfo = '';
    if (storeContext.policies.delivery.areas) {
      deliveryInfo += `📍 We deliver to: ${storeContext.policies.delivery.areas}\n\n`;
    }
    if (storeContext.policies.delivery.time) {
      deliveryInfo += `⏰ Delivery time: ${storeContext.policies.delivery.time}\n\n`;
    }
    if (deliveryInfo) {
      return jsonResponse({
        response: `📦 **Delivery Information:**\n\n${deliveryInfo}${storeContext.profile.whatsappNumber ? `📱 WhatsApp: ${storeContext.profile.whatsappNumber}` : ''}`,
        confidence: 0.95,
        source: 'faq',
      });
    }
  }

  // Returns
  if (/return|refund|exchange|warranty/i.test(lowerMessage)) {
    if (storeContext.policies.returns) {
      return jsonResponse({
        response: `🔄 **Return & Refund Policy:**\n\n${storeContext.policies.returns}${storeContext.profile.whatsappNumber ? `\n\n📱 Questions? WhatsApp: ${storeContext.profile.whatsappNumber}` : ''}`,
        confidence: 0.95,
        source: 'faq',
      });
    }
  }

  // Contact
  if (/contact|phone|whatsapp|call/i.test(lowerMessage)) {
    if (storeContext.profile.whatsappNumber) {
      return jsonResponse({
        response: `📱 **Contact Us:**\n\nWhatsApp/Call: ${storeContext.profile.whatsappNumber}`,
        confidence: 0.95,
        source: 'faq',
      });
    }
  }

  // ============================================================================
  // TIER 2: PRODUCT SEARCH (Database RAG)
  // ============================================================================
  const relevantProducts = searchProducts(storeContext.products, message);

  if (relevantProducts.length > 0 && /how much|price|cost|do you have|available|show me|want|need|looking for/i.test(lowerMessage)) {
    console.log('[ProductSearch] Found:', relevantProducts.length);

    const inStock = relevantProducts.filter(p => p.quantity > 0);
    const outOfStock = relevantProducts.filter(p => p.quantity === 0);

    let response = '';

    // Price inquiry
    if (/how much|price|cost/i.test(lowerMessage)) {
      if (inStock.length > 0) {
        response = `Here's what we have:\n\n`;
        inStock.slice(0, 5).forEach(p => {
          const price = Math.floor(p.selling_price / 100);
          response += `✅ ${p.name} - ₦${price.toLocaleString()} (${p.quantity} in stock)\n`;
        });
      }
    }
    // Availability check
    else if (/do you have|available|in stock/i.test(lowerMessage)) {
      if (inStock.length > 0) {
        response = `✅ **Available:**\n`;
        inStock.slice(0, 5).forEach(p => {
          const price = Math.floor(p.selling_price / 100);
          response += `• ${p.name} - ₦${price.toLocaleString()} (${p.quantity} in stock)\n`;
        });
      }
      if (outOfStock.length > 0 && outOfStock.length <= 3) {
        response += `\n❌ **Out of Stock:**\n`;
        outOfStock.forEach(p => {
          response += `• ${p.name}\n`;
        });
      }
    }
    // Buying intent
    else if (/want|need|interested|buy|order/i.test(lowerMessage)) {
      if (inStock.length === 0) {
        response = `Sorry, that product is currently out of stock. 😔\n\n${storeContext.profile.whatsappNumber ? `📱 WhatsApp us: ${storeContext.profile.whatsappNumber} for alternatives!` : ''}`;
      } else {
        const product = inStock[0];
        const price = Math.floor(product.selling_price / 100);
        response = `Great choice! 🎉\n\n**${product.name}** - ₦${price.toLocaleString()} (${product.quantity} in stock)\n\n`;
        if (storeContext.profile.whatsappNumber) {
          response += `📱 **To order:**\nWhatsApp: ${storeContext.profile.whatsappNumber}\nMessage: "I want ${product.name}"`;
        }
      }
    }

    if (response) {
      if (storeContext.profile.whatsappNumber && !response.includes('WhatsApp')) {
        response += `\n\n📱 Ready to order? WhatsApp: ${storeContext.profile.whatsappNumber}`;
      }

      return jsonResponse({
        response,
        confidence: 0.9,
        source: 'product_search',
        productsFound: relevantProducts.length,
      });
    }
  }

  // ============================================================================
  // TIER 3: AI with Full Context (Expensive, Smart)
  // ============================================================================
  console.log('[AI] Routing to AI with full context');

  if (!OPENAI_API_KEY) {
    return jsonResponse({
      response: getLanguageFallback(language, storeContext.profile.whatsappNumber),
      confidence: 0.5,
      source: 'fallback',
    });
  }

  const languageInstruction = getLanguageInstruction(language);

  const systemPrompt = `You are a helpful shopping assistant for ${businessName}.

**LANGUAGE:**
${languageInstruction}

**STORE INFO:**
Business: ${businessName}
${storeContext.profile.aboutUs ? `About: ${storeContext.profile.aboutUs}` : ''}
${storeContext.profile.whatsappNumber ? `WhatsApp: ${storeContext.profile.whatsappNumber}` : ''}

**DELIVERY:**
${storeContext.policies.delivery.areas ? `Areas: ${storeContext.policies.delivery.areas}` : 'Not specified'}
${storeContext.policies.delivery.time ? `Time: ${storeContext.policies.delivery.time}` : ''}

**RETURN POLICY:**
${storeContext.policies.returns || 'Not specified'}

**PAYMENT METHODS:**
${storeContext.policies.payment_methods.map(pm => `${pm.provider}: ${pm.account_name}`).join(', ') || 'Contact us'}

**IN-STOCK PRODUCTS (${storeContext.products.filter(p => p.quantity > 0).length} available):**
${storeContext.products.filter(p => p.quantity > 0).slice(0, 20).map(p => {
  const price = Math.floor(p.selling_price / 100);
  return `- ${p.name}: ₦${price.toLocaleString()} (${p.quantity} in stock)${p.description ? ` - ${p.description.substring(0, 100)}` : ''}`;
}).join('\n')}

**CRITICAL RULES:**
1. ONLY mention products and prices from the list above
2. If product unavailable, say so and suggest alternatives
3. NEVER invent prices or specifications
4. For orders, direct to WhatsApp: ${storeContext.profile.whatsappNumber || 'contact store'}
5. Be friendly, concise (max 4 sentences)
6. Respond in ${language}

Answer based ONLY on the information above.`;

  try {
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
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (data.choices && data.choices[0]?.message?.content) {
      const aiResponse = data.choices[0].message.content.trim();

      // Validate AI response
      const validation = validateStorefrontResponse(
        aiResponse,
        message,
        storeContext.products,
        storeContext.profile
      );

      if (!validation.valid) {
        console.warn('[AI] Validation failed:', validation.reason);
        return jsonResponse({
          response: validation.fixedResponse || getLanguageFallback(language, storeContext.profile.whatsappNumber),
          confidence: 0.5,
          source: 'fallback_validation_failed',
        });
      }

      return jsonResponse({
        response: aiResponse,
        confidence: 0.85,
        source: 'ai',
        language,
      });
    }
  } catch (error) {
    console.error('[AI] Error:', error);
  }

  // Final fallback
  return jsonResponse({
    response: getLanguageFallback(language, storeContext.profile.whatsappNumber),
    confidence: 0.5,
    source: 'fallback',
  });
}
