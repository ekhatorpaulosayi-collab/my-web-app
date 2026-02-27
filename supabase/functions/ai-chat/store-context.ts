// Store Context Service - RAG Retrieval with Guardrails
// Protects against spam, off-topic questions, and excessive chatting

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface StoreContext {
  profile: {
    businessName: string;
    aboutUs?: string;
    address?: string;
    whatsappNumber?: string;
    businessHours?: string;
  };
  policies: {
    delivery: {
      areas?: string;
      time?: string;
    };
    returns?: string;
    payment_methods: Array<{
      provider: string;
      account_name: string;
      account_number: string;
    }>;
  };
  products: Array<{
    id: string;
    name: string;
    selling_price: number;
    quantity: number;
    description?: string;
    category?: string;
    specifications?: Record<string, any>;
  }>;
  faq: Array<{
    question: string;
    answer: string;
  }>;
}

// Conversation state tracking (in-memory for visitors)
interface ConversationState {
  messageCount: number;
  lastMessageTime: number;
  offTopicCount: number;
  warningCount: number;
  isBlocked: boolean;
}

const conversationStates = new Map<string, ConversationState>();

//=============================================================================
// GUARDRAIL 1: OFF-TOPIC DETECTION (Block irrelevant questions)
//=============================================================================

/**
 * Detect if question is off-topic (not about shopping/business)
 * STRATEGY: AI-FIRST detection + Pattern fallbacks
 * Examples to BLOCK: "What did Arsenal play?", "Who is the president?", "Tell me a joke"
 */
export function isOffTopic(message: string): { isOffTopic: boolean; reason?: string } {
  const lower = message.toLowerCase();

  // ============================================================================
  // SMART FILTER: Shopping-Related Keywords (ALLOW these immediately)
  // ============================================================================
  const shoppingKeywords = [
    // Product queries (use word boundaries for precision)
    '\\bproduct\\b', '\\bitem\\b', '\\bphone\\b', '\\blaptop\\b', '\\bclothes\\b', '\\bshoe\\b', '\\bbag\\b', '\\bwatch\\b',
    '\\bcamera\\b', '\\bspeaker\\b', '\\bheadphone\\b', '\\bcharger\\b', '\\baccessory\\b', '\\belectronics\\b',
    '\\bfashion\\b', '\\bfood\\b', '\\bdrink\\b', '\\bfurniture\\b', '\\bappliance\\b', '\\bgadget\\b',

    // Shopping actions
    '\\bbuy\\b', '\\bpurchase\\b', '\\border\\b', '\\bprice\\b', '\\bcost\\b', 'how much', '\\bavailable\\b',
    'in stock', '\\bsell\\b', '\\bselling\\b', 'show me', 'looking for', '\\bneed\\b', '\\bwant\\b',
    '\\brecommend\\b', '\\bsuggest\\b', '\\bbest\\b', '\\bcheapest\\b', '\\baffordable\\b', '\\bbudget\\b',

    // Store/business queries
    '\\bdeliver\\b', '\\bdelivery\\b', '\\bshipping\\b', '\\bship\\b', '\\bpayment\\b', '\\bpay\\b', '\\bcash\\b',
    '\\btransfer\\b', '\\breturn\\b', '\\brefund\\b', '\\bwarranty\\b', '\\bguarantee\\b', '\\bpolicy\\b',
    '\\bopen\\b', '\\bclose\\b', '\\bhours\\b', '\\blocation\\b', '\\baddress\\b', '\\bcontact\\b', '\\bwhatsapp\\b',
    '\\bstore\\b', '\\bshop\\b', '\\bbusiness\\b', '\\bmerchant\\b'
  ];

  const hasShoppingKeyword = shoppingKeywords.some(keyword => new RegExp(keyword, 'i').test(lower));

  // If message contains shopping keywords, it's likely valid - skip strict checks
  if (hasShoppingKeyword) {
    // Still check for OBVIOUS off-topic (even with shopping keywords)
    // e.g., "I want to know about Arsenal football team"
    if (!/(football|soccer|arsenal|chelsea|politics|president|movie|celebrity|joke|poem)/i.test(lower)) {
      return { isOffTopic: false }; // Likely shopping-related, allow it
    }
  }

  // CATEGORY 1: Sports & Entertainment
  if (/\b(football|soccer|arsenal|chelsea|manchester|liverpool|barcelona|champions league|premier league|la liga|match|goal|player|team|score)\b/i.test(lower)) {
    return { isOffTopic: true, reason: 'sports' };
  }

  if (/\b(movie|film|actor|actress|celebrity|song|music|album|concert|show|netflix|tv series)\b/i.test(lower)) {
    return { isOffTopic: true, reason: 'entertainment' };
  }

  // CATEGORY 2: Politics & Current Events
  if (/\b(president|governor|election|vote|政|party|politics|minister|senator|buhari|tinubu|atiku)\b/i.test(lower)) {
    return { isOffTopic: true, reason: 'politics' };
  }

  if (/\b(news|headline|breaking|happened today|what's happening|current events)\b/i.test(lower)) {
    return { isOffTopic: true, reason: 'news' };
  }

  // CATEGORY 3: General Knowledge (not about store)
  // Includes: Famous people, historical facts, math calculations, definitions
  if (/\b(capital of|president of|who is|when was|history of|explain|define|what does.*mean)\b/i.test(lower)) {
    // Exception: Allow "what does this product do?" type questions
    if (!/\b(product|item|this|that)\b/i.test(lower)) {
      return { isOffTopic: true, reason: 'general_knowledge' };
    }
  }

  // Famous people questions (Bill Gates, Elon Musk, etc.)
  if (/\b(bill gates?|elon musk|jeff bezos|mark zuckerberg|warren buffett?|steve jobs|how rich is|net worth of|richest person)\b/i.test(lower)) {
    return { isOffTopic: true, reason: 'general_knowledge' };
  }

  // Math calculations (unless about pricing)
  if (/\b(\d+\s*(times|multiplied by|divided by|\+|-|\*|\/|plus|minus)\s*\d+|calculate|solve.*equation)\b/i.test(lower)) {
    // Exception: Allow price-related math like "how much is 2 phones"
    if (!/\b(price|cost|total|how much|naira|₦)\b/i.test(lower)) {
      return { isOffTopic: true, reason: 'homework' };
    }
  }

  // CATEGORY 4: Personal Advice (medical, legal, relationship)
  if (/\b(medical advice|doctor|disease|sick|symptom|cure|treatment|medication|prescription)\b/i.test(lower)) {
    return { isOffTopic: true, reason: 'medical' };
  }

  if (/\b(legal advice|lawyer|court|sue|lawsuit|rights|contract)\b/i.test(lower)) {
    return { isOffTopic: true, reason: 'legal' };
  }

  if (/\b(relationship|dating|boyfriend|girlfriend|marriage|divorce|breakup)\b/i.test(lower)) {
    return { isOffTopic: true, reason: 'personal' };
  }

  // CATEGORY 5: Homework/Education
  if (/\b(homework|assignment|solve this|equation|formula|essay|write about|research)\b/i.test(lower)) {
    return { isOffTopic: true, reason: 'homework' };
  }

  // CATEGORY 6: Code/Technical Help (not about store)
  if (/\b(write code|python|javascript|programming|debug|error in code|algorithm)\b/i.test(lower)) {
    return { isOffTopic: true, reason: 'coding' };
  }

  // CATEGORY 7: Jokes/Entertainment Requests
  if (/\b(tell.*joke|make.*laugh|funny|story|poem|riddle|sing)\b/i.test(lower)) {
    return { isOffTopic: true, reason: 'entertainment_request' };
  }

  // CATEGORY 8: Weather/Location (not store-related)
  if (/\b(weather|temperature|rain|sunny|forecast)\b/i.test(lower)) {
    // Exception: Allow delivery-related weather questions
    if (!/\b(deliver|delivery|ship|shipping)\b/i.test(lower)) {
      return { isOffTopic: true, reason: 'weather' };
    }
  }

  // CATEGORY 9: Competitor/Other Businesses
  if (/\b(jumia|konga|amazon|shopify|aliexpress|jiji|other store|another shop)\b/i.test(lower)) {
    return { isOffTopic: true, reason: 'competitor' };
  }

  // CATEGORY 10: Store Owner's Personal Info (privacy violation)
  if (/\b(owner.*salary|how much.*owner.*make|profit margin|owner.*phone|owner.*address|owner.*bank)\b/i.test(lower)) {
    return { isOffTopic: true, reason: 'privacy_violation' };
  }

  // ============================================================================
  // CATCH-ALL: AI-Powered Intent Classification (FINAL FILTER)
  // ============================================================================
  // If we got here, the message passed all specific pattern checks
  // Use a LIGHTWEIGHT heuristic classifier to catch edge cases

  // Check if message is a QUESTION but has NO shopping intent
  const isQuestion = /^(what|when|where|who|why|how|is|are|do|does|did|can|could|would|should|will)/i.test(message.trim());

  if (isQuestion) {
    // If it's a question WITHOUT any shopping context, it's likely off-topic
    const hasProductContext = /\b(this|that|these|those|it)\b/i.test(lower); // Removed "your" and "the" - too broad
    const hasGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening)/i.test(lower);

    // EXCEPTION: "Do you have..." is ALWAYS shopping-related
    const isAvailabilityQuestion = /^(do you have|does your store have|you got|you get)\b/i.test(lower);

    if (!hasShoppingKeyword && !hasProductContext && !hasGreeting && !isAvailabilityQuestion) {
      // It's a question about something completely unrelated
      // Examples: "What is photosynthesis?", "Who invented the telephone?"
      return { isOffTopic: true, reason: 'general_knowledge' };
    }
  }

  // AGGRESSIVE: Block questions with question words at the END (unusual for shopping)
  // Examples: "The capital of Nigeria is what?", "The president is who?"
  if (/\s+(what|who|when|where|why|how)\?*$/i.test(lower) && !hasShoppingKeyword) {
    return { isOffTopic: true, reason: 'general_knowledge' };
  }

  // Block pure math expressions (no shopping context)
  if (/^\s*\d+\s*[\+\-\*\/×÷]\s*\d+\s*=?\s*$/i.test(message)) {
    return { isOffTopic: true, reason: 'homework' };
  }

  // Block "what is" questions without shopping context
  // Examples: "what is democracy", "what is photosynthesis"
  if (/^what is\b/i.test(lower) && !hasShoppingKeyword && !hasProductContext) {
    return { isOffTopic: true, reason: 'general_knowledge' };
  }

  // Block "who is/was/invented/created" questions without shopping context
  // Examples: "who is the president", "who was nelson mandela", "who invented the telephone"
  if (/^who (is|was|are|invented|created|made|discovered)\b/i.test(lower) && !hasShoppingKeyword && !hasProductContext) {
    return { isOffTopic: true, reason: 'general_knowledge' };
  }

  return { isOffTopic: false };
}

/**
 * Get friendly response for off-topic questions
 */
export function getOffTopicResponse(reason: string, businessName: string, whatsappNumber?: string): string {
  const baseMessage = `I'm ${businessName}'s shopping assistant! 🛍️\n\nI can only help with:\n• Product prices and availability\n• Delivery and payment info\n• Store policies\n• Placing orders`;

  const contactInfo = whatsappNumber
    ? `\n\n📱 For other questions, WhatsApp us: ${whatsappNumber}`
    : '\n\nWhat product are you looking for?';

  const reasonMessages: Record<string, string> = {
    sports: `${baseMessage}\n\n⚽ For sports updates, try Google or sports apps!${contactInfo}`,
    entertainment: `${baseMessage}\n\n🎬 For entertainment info, try IMDb or entertainment sites!${contactInfo}`,
    politics: `${baseMessage}\n\n🗳️ For political news, check news websites!${contactInfo}`,
    news: `${baseMessage}\n\n📰 For news updates, check news apps or websites!${contactInfo}`,
    general_knowledge: `${baseMessage}\n\n🔍 For general questions, try Google or Wikipedia!${contactInfo}`,
    medical: `${baseMessage}\n\n⚕️ For medical advice, please consult a licensed doctor!${contactInfo}`,
    legal: `${baseMessage}\n\n⚖️ For legal advice, please consult a licensed lawyer!${contactInfo}`,
    personal: `${baseMessage}${contactInfo}`,
    homework: `${baseMessage}\n\n📚 For homework help, try educational websites!${contactInfo}`,
    coding: `${baseMessage}\n\n💻 For coding help, try Stack Overflow!${contactInfo}`,
    entertainment_request: `${baseMessage}${contactInfo}`,
    weather: `${baseMessage}\n\n🌤️ For weather, check weather apps!${contactInfo}`,
    competitor: `${baseMessage}\n\nI can only help with products from ${businessName}!${contactInfo}`,
    privacy_violation: `${baseMessage}\n\n🔒 I can't share private business information.${contactInfo}`,
  };

  return reasonMessages[reason] || `${baseMessage}${contactInfo}`;
}

//=============================================================================
// GUARDRAIL 2: SPAM DETECTION
//=============================================================================

/**
 * Detect spam patterns
 */
export function isSpam(message: string): boolean {
  // Too short (likely testing)
  if (message.trim().length < 2) return true;

  // Excessive repetition (e.g., "aaaaaaa", "111111")
  if (/(.)\1{6,}/.test(message)) return true;

  // All caps (shouting/spam)
  if (message.length > 10 && message === message.toUpperCase() && /[A-Z]/.test(message)) {
    return true;
  }

  // URL spam (external links)
  if (/(https?:\/\/|www\.)(?!storehouse\.ng|storehouse\.app)/i.test(message)) {
    return true;
  }

  // Phone number spam (solicitation)
  if (/(?:\+234|0)[0-9]{10}/.test(message) && message.length < 30) {
    return true;
  }

  // Excessive emojis (spam indicator)
  const emojiCount = (message.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  if (emojiCount > 10) return true;

  return false;
}

//=============================================================================
// GUARDRAIL 3: RATE LIMITING (Conversation Limits)
//=============================================================================

/**
 * Check if user is sending too many messages
 */
export function checkRateLimit(
  sessionId: string,
  maxMessagesPerSession: number = 15,
  maxMessagesPerMinute: number = 5
): { allowed: boolean; reason?: string; waitSeconds?: number } {

  const now = Date.now();
  let state = conversationStates.get(sessionId);

  if (!state) {
    // First message - create new state
    state = {
      messageCount: 1,
      lastMessageTime: now,
      offTopicCount: 0,
      warningCount: 0,
      isBlocked: false,
    };
    conversationStates.set(sessionId, state);
    return { allowed: true };
  }

  // Check if blocked
  if (state.isBlocked) {
    return {
      allowed: false,
      reason: 'blocked',
      waitSeconds: 300 // 5 minutes
    };
  }

  // Check messages per minute (prevent rapid spam)
  const timeSinceLastMessage = (now - state.lastMessageTime) / 1000; // seconds
  if (timeSinceLastMessage < 60 / maxMessagesPerMinute) {
    return {
      allowed: false,
      reason: 'too_fast',
      waitSeconds: Math.ceil(60 / maxMessagesPerMinute - timeSinceLastMessage)
    };
  }

  // Check total messages in session (prevent endless chatting)
  if (state.messageCount >= maxMessagesPerSession) {
    return {
      allowed: false,
      reason: 'session_limit',
      waitSeconds: 0
    };
  }

  // Update state
  state.messageCount++;
  state.lastMessageTime = now;

  return { allowed: true };
}

/**
 * Track off-topic attempts and block abusers
 */
export function trackOffTopicAttempt(sessionId: string): boolean {
  const state = conversationStates.get(sessionId);
  if (!state) return false;

  state.offTopicCount++;

  // Block after 3 off-topic attempts
  if (state.offTopicCount >= 3) {
    state.isBlocked = true;
    console.warn('[Guardrail] User blocked for excessive off-topic:', sessionId);
    return true; // User is now blocked
  }

  return false;
}

/**
 * Get rate limit response message
 */
export function getRateLimitResponse(
  reason: string,
  businessName: string,
  whatsappNumber?: string,
  waitSeconds?: number
): string {
  switch (reason) {
    case 'too_fast':
      return `⏱️ Please slow down! Wait ${waitSeconds} seconds before your next message.\n\nTake your time to browse our products. 😊`;

    case 'session_limit':
      return `📱 You've reached the chat limit for this session!\n\n**Ready to order?**\nWhatsApp us directly: ${whatsappNumber || 'Contact us'}\n\n💡 Our team will help you complete your purchase!`;

    case 'blocked':
      return `🚫 Too many off-topic messages detected.\n\nThis chat is for shopping at ${businessName} only.\n\n📱 For assistance, WhatsApp: ${whatsappNumber || 'Contact us'}`;

    default:
      return `Please try again in a moment.`;
  }
}

/**
 * Reset conversation state (for testing or after timeout)
 */
export function resetConversationState(sessionId: string) {
  conversationStates.delete(sessionId);
}

// Clean up old conversation states (every 30 minutes)
setInterval(() => {
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;

  for (const [sessionId, state] of conversationStates.entries()) {
    if (now - state.lastMessageTime > thirtyMinutes) {
      conversationStates.delete(sessionId);
    }
  }
}, 30 * 60 * 1000);

//=============================================================================
// STORE CONTEXT RETRIEVAL (RAG)
//=============================================================================

/**
 * Fetch complete store context by slug
 */
export async function getStoreContext(
  supabase: SupabaseClient,
  storeSlug: string
): Promise<StoreContext | null> {
  console.log('[StoreContext] Fetching context for:', storeSlug);

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('*')
    .eq('store_slug', storeSlug)
    .eq('is_public', true)
    .single();

  if (storeError || !store) {
    console.error('[StoreContext] Store not found:', storeError);
    return null;
  }

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, selling_price, quantity, description, category, specifications')
    .eq('user_id', store.user_id)
    .eq('is_public', true)
    .order('name', { ascending: true });

  if (productsError) {
    console.error('[StoreContext] Products fetch error:', productsError);
  }

  const context: StoreContext = {
    profile: {
      businessName: store.business_name,
      aboutUs: store.about_us,
      address: store.address,
      whatsappNumber: store.whatsapp_number,
      businessHours: store.business_hours,
    },
    policies: {
      delivery: {
        areas: store.delivery_areas,
        time: store.delivery_time,
      },
      returns: store.return_policy,
      payment_methods: store.payment_methods || [],
    },
    products: (products || []).map(p => ({
      id: p.id,
      name: p.name,
      selling_price: p.selling_price,
      quantity: p.quantity,
      description: p.description,
      category: p.category,
      specifications: p.specifications || {},
    })),
    faq: extractFAQFromAboutUs(store.about_us),
  };

  console.log('[StoreContext] Context loaded:', {
    products: context.products.length,
    inStock: context.products.filter(p => p.quantity > 0).length,
  });

  return context;
}

function extractFAQFromAboutUs(aboutUs?: string): Array<{question: string; answer: string}> {
  if (!aboutUs) return [];
  const faq: Array<{question: string; answer: string}> = [];
  const qaPattern = /(?:Q:|Question:)\s*(.+?)\s*(?:A:|Answer:)\s*(.+?)(?=(?:Q:|Question:)|$)/gis;
  const matches = aboutUs.matchAll(qaPattern);
  for (const match of matches) {
    faq.push({ question: match[1].trim(), answer: match[2].trim() });
  }
  return faq;
}

/**
 * Smart text truncation - finds good breaking points
 * Used for displaying long about_us text in chat
 */
export function truncateSmartly(text: string, maxLength: number = 500): {
  truncated: string;
  isTruncated: boolean;
  originalLength: number;
} {
  if (text.length <= maxLength) {
    return {
      truncated: text,
      isTruncated: false,
      originalLength: text.length,
    };
  }

  // Try to break at sentence end (period + space)
  const sentenceBreak = text.substring(0, maxLength).lastIndexOf('. ');

  // Try paragraph break if sentence break not found
  const paragraphBreak = text.substring(0, maxLength).lastIndexOf('\n\n');

  // Choose best break point
  let breakPoint = maxLength;
  if (sentenceBreak > maxLength * 0.6) {
    // Found good sentence break (not too early)
    breakPoint = sentenceBreak + 1;
  } else if (paragraphBreak > maxLength * 0.5) {
    // Found paragraph break
    breakPoint = paragraphBreak + 2;
  }

  return {
    truncated: text.substring(0, breakPoint).trim(),
    isTruncated: true,
    originalLength: text.length,
  };
}

export function searchProducts(products: StoreContext['products'], query: string): StoreContext['products'] {
  const lowerQuery = query.toLowerCase();
  const priceMatch = query.match(/(?:under|below|less than|<)\s*(?:₦|naira|ngn)?\s*([\d,]+)k?/i);
  let maxPrice = Infinity;
  if (priceMatch) {
    const priceValue = parseInt(priceMatch[1].replace(/,/g, ''));
    const hasK = priceMatch[0].toLowerCase().includes('k');
    maxPrice = (hasK ? priceValue * 1000 : priceValue) * 100;
  }

  const results = products.filter(p => {
    if (p.selling_price > maxPrice) return false;
    const nameMatch = p.name.toLowerCase().includes(lowerQuery);
    const descMatch = p.description?.toLowerCase().includes(lowerQuery);
    const categoryMatch = p.category?.toLowerCase().includes(lowerQuery);
    const specMatch = Object.entries(p.specifications || {}).some(([key, value]) => {
      return `${key} ${value}`.toLowerCase().includes(lowerQuery);
    });
    return nameMatch || descMatch || categoryMatch || specMatch;
  });

  return results.sort((a, b) => {
    if (a.quantity > 0 && b.quantity === 0) return -1;
    if (a.quantity === 0 && b.quantity > 0) return 1;
    return a.selling_price - b.selling_price;
  });
}

export function detectLanguage(message: string): string {
  const lower = message.toLowerCase();
  if (/\b(abeg|wetin|how far|i wan|make i|dey|fit|na so)\b/i.test(lower)) return 'pidgin';
  if (/\b(bawo|eku|ese|eni|ni|se|ki|wa)\b/i.test(lower)) return 'yoruba';
  if (/\b(kedu|nnoo|ndewo|maka|biko|ka)\b/i.test(lower)) return 'igbo';
  if (/\b(sannu|yaya|kai|kana|ba|da)\b/i.test(lower)) return 'hausa';
  return 'english';
}

export function getLanguageInstruction(language: string): string {
  const instructions = {
    pidgin: 'Respond in Nigerian Pidgin English. Use "abeg", "wetin", "dey". Be friendly.',
    yoruba: 'Respond in Yoruba language. Be respectful.',
    igbo: 'Respond in Igbo language. Be respectful.',
    hausa: 'Respond in Hausa language. Be respectful.',
    english: 'Respond in clear, simple English.',
  };
  return instructions[language] || instructions.english;
}

export function getLanguageFallback(language: string, whatsappNumber?: string): string {
  const contact = whatsappNumber ? `\n\n📱 WhatsApp: ${whatsappNumber}` : '';
  const fallbacks = {
    english: `I can help with:\n• Product prices\n• Delivery info\n• Payment methods${contact}`,
    pidgin: `I fit help you with:\n• Product price\n• Delivery info\n• How to pay${contact}`,
    yoruba: `Mo le ran yin lọwọ:\n• Iye owo\n• Ifijiṣẹ\n• Isanwo${contact}`,
    igbo: `Enwere m ike:\n• Ọnụ ahịa\n• Nnyefe\n• Ịkwụ ụgwọ${contact}`,
    hausa: `Zan iya:\n• Farashi\n• Isar da\n• Biyan kuɗi${contact}`,
  };
  return fallbacks[language] || fallbacks.english;
}
