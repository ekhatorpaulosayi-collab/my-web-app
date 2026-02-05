// Enhanced FAQ System with Intent Detection & Smart Escalation
// Zero AI cost, maximum intelligence

interface ConversationState {
  messageCount: number;
  matchedCategories: string[];
  intentScores: {
    buying: number;      // 0-10
    technical: number;   // 0-10
    skeptical: number;   // 0-10
  };
  averageConfidence: number;
  hasSeenCTA: boolean;
}

interface FAQResponse {
  response: string;
  confidence: number;
  category?: string;
  escalation?: {
    type: 'signup_cta' | 'email_support' | 'human_contact' | 'need_help';
    message: string;
  };
}

// ============================================================================
// INTENT DETECTION - Understand what user really wants
// ============================================================================

function detectIntent(message: string, conversationState: ConversationState) {
  const lower = message.toLowerCase();
  let buying = conversationState.intentScores.buying;
  let technical = conversationState.intentScores.technical;
  let skeptical = conversationState.intentScores.skeptical;

  // BUYING SIGNALS (ready to convert)
  if (/start|begin|try|sign.?up|get started|how (do i|to) (start|begin)|ready|let'?s go|create account/i.test(lower)) {
    buying += 4;
  }
  if (/want to|i'?d like to|can i start|show me how/i.test(lower)) {
    buying += 3;
  }
  // Progression: pricing → features = buying journey
  if (conversationState.matchedCategories.includes('pricing') &&
      /feature|what (can|does)|capability/i.test(lower)) {
    buying += 3;
  }
  // After free plan question + feature question = ready
  if (conversationState.matchedCategories.includes('free') &&
      conversationState.messageCount >= 2) {
    buying += 2;
  }

  // TECHNICAL COMPLEXITY (needs expert help)
  if (/api|webhook|integration|sync|export|import|migrate|transfer|bulk|batch/i.test(lower)) {
    technical += 5;
  }
  if (/database|sql|backend|server|infrastructure/i.test(lower)) {
    technical += 4;
  }
  if (/currently using|migrating from|switching from|moving from/i.test(lower)) {
    technical += 3;
  }
  if (/can it (do|handle)|does it support|is there a way to/i.test(lower)) {
    technical += 1; // Slight complexity
  }

  // SKEPTICISM (needs reassurance)
  if (/trust|legit|scam|fake|real|honest|actually|really sure|guarantee/i.test(lower)) {
    skeptical += 4;
  }
  if (/safe|secure|reliable|stable|protection|backup/i.test(lower)) {
    skeptical += 2;
  }
  if (/what if|concern|worry|afraid|hesitant|unsure|doubt/i.test(lower)) {
    skeptical += 3;
  }
  if (/proof|evidence|show me|prove|demonstrate/i.test(lower)) {
    skeptical += 2;
  }

  // Cap scores at 10
  return {
    buying: Math.min(buying, 10),
    technical: Math.min(technical, 10),
    skeptical: Math.min(skeptical, 10)
  };
}

// ============================================================================
// SMART ESCALATION - Right message, right time
// ============================================================================

function getEscalation(conversationState: ConversationState): FAQResponse['escalation'] | null {
  const { buying, technical, skeptical } = conversationState.intentScores;
  const { messageCount, averageConfidence, hasSeenCTA } = conversationState;

  // PATH 1: STRONG BUYING INTENT → Free Signup CTA
  if (buying >= 7 && !hasSeenCTA) {
    return {
      type: 'signup_cta',
      message: `---

🎉 **You're ready to transform your business!**

**Setup takes just 3 minutes:**
1️⃣ Add your first product (1 min)
2️⃣ Record a test sale (1 min)
3️⃣ Create your online store (1 min)

[**Start Free - No Credit Card Required →**](https://www.storehouse.ng/signup)

💬 Questions? Keep asking - I'm here to help!`
    };
  }

  // PATH 2: HIGH TECHNICAL COMPLEXITY → Email Support
  if (technical >= 7) {
    return {
      type: 'email_support',
      message: `---

📧 **This needs our technical team!**

For detailed migration/integration help:
→ **Email:** support@storehouse.ng
→ **Response time:** Under 2 hours
→ **We'll walk you through step-by-step**

Don't want to wait? **Test it yourself:**
[**Try Free Trial →**](https://www.storehouse.ng/signup)`
    };
  }

  // PATH 3: HIGH SKEPTICISM → Human Contact + Social Proof
  if (skeptical >= 6 && messageCount >= 4) {
    return {
      type: 'human_contact',
      message: `---

🤝 **Talk to a real person?**

We get it - choosing the right tool is important!

**Real proof first:**
• ✅ **5,000+ Nigerian businesses** use Storehouse daily
• ✅ **99.9% uptime** (same infrastructure as banks)
• ✅ **You own your data** (export anytime, no lock-in)

**Want to talk?**
📞 Book 5-min call: [calendly.com/storehouse](https://calendly.com/storehouse)
💬 WhatsApp: [+234-XXX-XXX-XXXX](https://wa.me/234XXXXXXXXX)
📧 Email: hello@storehouse.ng

**Or test risk-free:**
[**Start Free for 30 Days →**](https://www.storehouse.ng/signup)`
    };
  }

  // PATH 4: LOST/CONFUSED → Need Help
  if (messageCount >= 8 && averageConfidence < 0.6) {
    return {
      type: 'need_help',
      message: `---

🧭 **Let me help you find exactly what you need!**

**Most people want to know:**

📺 **[Watch 3-Minute Demo Video →](https://youtube.com/storehouse-demo)**
See Storehouse in action

💬 **[Chat with Founder →](https://wa.me/234XXXXXXXXX)**
Get answers directly via WhatsApp

🚀 **[Just Try It Free →](https://www.storehouse.ng/signup)**
Explore yourself (no credit card)

**What sounds best for you?**`
    };
  }

  return null;
}

// ============================================================================
// ENHANCED FAQ HANDLER - Smarter matching with synonyms
// ============================================================================

export function handleVisitorFAQEnhanced(
  message: string,
  conversationState: ConversationState
): FAQResponse {
  const lower = message.toLowerCase();
  let matchedCategory = '';
  let baseResponse = '';
  let confidence = 0.6;

  // Update intent scores
  conversationState.intentScores = detectIntent(message, conversationState);

  // PRICING (expanded keywords)
  if (/how much|cost|price|pricing|pay|fee|expensive|cheap|afford|budget|monthly|yearly|subscription/i.test(lower)) {
    matchedCategory = 'pricing';
    const variants = [
      `**Start completely FREE** - 50 products, unlimited sales tracking, free online store, and 50 AI chats/month. No credit card, no time limit!

When you outgrow the free plan:
• **Starter**: ₦5,000/month (200 products, debt tracking, 500 AI chats)
• **Pro**: ₦10,000/month (UNLIMITED products + WhatsApp AI Assistant)
• **Business**: ₦15,000/month (Everything unlimited + dedicated support)

💰 Pay annually and save 20%: ₦48k, ₦96k, or ₦144k/year.

Most people start free, test it for a few weeks, then upgrade when they see the value.`,

      `Good news! **You can start with ZERO upfront cost!** 🎉

**FREE FOREVER PLAN:**
50 products • Unlimited sales • Free online store • No credit card

**Paid plans (when you grow):**
• ₦5k/month: 200 products + debt tracking
• ₦10k/month: UNLIMITED everything + WhatsApp AI
• ₦15k/month: Business tier + priority support

Save 20% by paying annually! Most shops run perfectly on the FREE plan for months.`,

      `Let me break down our pricing (spoiler: there's a FREE plan!) 💰

**100% FREE:**
✅ 50 products with images
✅ Unlimited sales tracking
✅ Professional invoicing
✅ Full online store
✅ 3 staff members

**Upgrade only when you need:**
• ₦5k/month → 200 products
• ₦10k/month → Unlimited + AI
• ₦15k/month → Business features

Annual plans save you 20%. Try free first!`
    ];
    baseResponse = variants[Math.floor(Math.random() * variants.length)];
    confidence = 0.95;
  }

  // FREE PLAN (expanded)
  else if (/free|trial|demo|test|no cost|without paying/i.test(lower)) {
    matchedCategory = 'free';
    baseResponse = `Yes! **Start free forever** - not a trial, truly free with no time limit! ✨

FREE PLAN INCLUDES:
✅ 50 products with images
✅ Unlimited sales tracking
✅ 3 staff members with roles
✅ Professional invoicing
✅ Free online store
✅ 50 AI assistant chats/month
✅ No credit card required

Upgrade only when you hit your limits. Most small businesses stay on free for months!`;
    confidence = 0.95;
  }

  // FEATURES (expanded)
  else if (/feature|what (can|does)|capability|can i|able to|function|does it (have|support|include)/i.test(lower)) {
    matchedCategory = 'features';
    baseResponse = `Storehouse is your complete business management system! 💼

**Core Features:**
📦 Inventory Management - Track products, stock levels, categories, SKUs
💰 Sales Tracking - Record sales with automatic profit calculation
👥 Customer Management - Track contacts, purchase history, debts
🧾 Professional Invoicing - Generate branded invoices with your logo
🏪 Online Store - Free storefront customers can browse 24/7
👨‍💼 Staff Management - Add team members with different roles
📊 Reports & Analytics - Profit tracking, EOD reports, best sellers

**Nigerian-First Design:**
✅ OPay, Moniepoint, PalmPay integration
✅ All prices in Naira (₦)
✅ WhatsApp ordering for customers
✅ Works offline (syncs when back online)`;
    confidence = 0.9;
  }

  // ONLINE STORE (expanded)
  else if (/online store|website|ecommerce|e-commerce|e commerce|customers (can )?browse|sell online|web store|internet shop/i.test(lower)) {
    matchedCategory = 'online-store';
    baseResponse = `Create your online store in literally 3 minutes! ⚡

**How it works:**
1. Settings → Online Store → Add business name & logo
2. Click "Publish"
3. Done! Your products automatically appear

**What customers get:**
🛍️ Browse your full catalog 24/7
📱 Send WhatsApp orders with one tap
💳 See your payment methods (OPay, Moniepoint, Banks)
🔗 Shareable link for Instagram bio, Facebook, WhatsApp status

**Even FREE plan includes** a fully functional online store!`;
    confidence = 0.95;
  }

  // EXCEL COMPARISON (expanded)
  else if (/excel|spreadsheet|why not|better than|versus|vs|instead of|compared to|difference between/i.test(lower)) {
    matchedCategory = 'comparison';
    baseResponse = `Great question! Excel is powerful, but here's why Storehouse is "Excel on Steroids": 💪

**Excel Problems:**
❌ Lose your phone = lose your data
❌ Manual stock updates after every sale (tedious!)
❌ No online store for customers
❌ Hard to share securely with staff
❌ No automatic profit calculations
❌ Can't send branded invoices

**Storehouse Benefits:**
✅ Cloud-synced (access from any device)
✅ Automatic stock deduction when you record sales
✅ Free online store built-in
✅ Each staff member has their own login
✅ Instant profit tracking (selling price - cost = profit)
✅ Professional invoices with your logo

**Best part?** It feels familiar like Excel, but does the tedious work for you!`;
    confidence = 0.95;
  }

  // PAYMENT METHODS (expanded)
  else if (/payment|pay|opay|moniepoint|palmpay|bank transfer|how (do|will) customers|accept (payment|money)|receive (payment|money)/i.test(lower)) {
    matchedCategory = 'payments';
    baseResponse = `**YOU control payment methods!** 💳

Add your payment details in Settings:
🟢 OPay (instant settlement)
🔵 Moniepoint (business banking)
🟣 PalmPay (youth demographic)
🏦 Bank accounts (any Nigerian bank)
💳 Card payments (Paystack/Flutterwave links)

**How it works:**
1. Customer orders via WhatsApp
2. They see YOUR payment options
3. They pay directly to YOUR account
4. **No middleman, no commission - 100% is yours!**

Most Nigerian customers prefer OPay/Moniepoint (faster, cheaper, no failed transactions).`;
    confidence = 0.95;
  }

  // SECURITY / TRUST (expanded - key for skeptics!)
  else if (/safe|secure|security|data|lose|stolen|hack|trust|legit|scam|reliable|protect|backup/i.test(lower)) {
    matchedCategory = 'security';
    baseResponse = `Your data is **bank-level secure!** 🔒

**Security Measures:**
🔐 256-bit SSL encryption (same as banks)
☁️ Cloud-based (not stored on your phone)
💾 Daily automatic backups
🚫 We NEVER share your data with anyone
📤 Export everything anytime (you own your data)

**What if your phone is stolen?**
✅ Your data is safe on our servers
✅ Log in from ANY device (phone, tablet, computer)
✅ Contact us to revoke stolen device access
✅ Each staff has separate login (easy to disable)

**Infrastructure:**
Hosted on Supabase - same tech powering major Nigerian fintechs. 99.9% uptime guarantee.

**Over 5,000 Nigerian businesses trust us daily.**`;
    confidence = 0.95;
  }

  // STAFF MANAGEMENT (expanded)
  else if (/staff|team|employee|worker|cashier|assistant|multiple (users|people)|add people|manage (team|staff)/i.test(lower)) {
    matchedCategory = 'staff';
    baseResponse = `**Even FREE plan includes 3 staff members!** 👥

**Roles & Permissions:**
👨‍💼 **Manager**: Manage inventory, sales, and customers
💵 **Cashier**: Record sales and view today's sales only

**Benefits:**
✅ Everyone has their own PIN (no password sharing!)
✅ Track who recorded each sale
✅ Remove access when someone leaves
✅ Works on any device

Need more? Business plan gives you 10 staff members.`;
    confidence = 0.95;
  }

  // EASE OF USE (expanded)
  else if (/technical|tech|difficult|hard|easy|simple|learn|complicated|coding|developer|user.?friendly|beginner/i.test(lower)) {
    matchedCategory = 'ease-of-use';
    baseResponse = `**Zero tech skills needed!** If you can use WhatsApp, you can use Storehouse! 📱

**Why it's easy:**
✅ Built for shop owners (not software engineers)
✅ AI assistant guides you step-by-step
✅ Add first product in under 2 minutes
✅ Record sale with 3 taps
✅ Create online store in 3 clicks

**No coding, no website building, no complex setup!**

**First-time user journey:**
1. Sign up (30 seconds)
2. Add your first product (2 minutes)
3. Record a test sale (1 minute)
4. Create your online store (3 minutes)
**Total: 6 minutes to fully operational business!**`;
    confidence = 0.95;
  }

  // "HOW TO START" (buying signal!)
  else if (/how (do i|to|can i) (start|begin|get started|sign up|create account|register)/i.test(lower)) {
    matchedCategory = 'getting-started';
    baseResponse = `Getting started is super easy! 🚀

**3-Minute Setup:**
1. **Sign up** at www.storehouse.ng (30 seconds)
2. **Add first product** - name, price, quantity (2 min)
3. **Record test sale** - see how it works (1 min)
4. **Create online store** - publish in 3 clicks (optional)

**That's it!** You're ready to manage your business.

The AI assistant will guide you through each step. Want to start now?`;
    confidence = 0.98;
    conversationState.intentScores.buying += 5; // Strong signal!
  }

  // DEFAULT FALLBACK (improved!)
  else {
    baseResponse = `I want to give you the perfect answer! 💡

**Are you wondering about:**

🎯 **Pricing** - How much it costs (spoiler: FREE plan available!)
🎯 **Features** - What Storehouse can do for your business
🎯 **Getting Started** - How to set up in 3 minutes
🎯 **Comparison** - How it's better than Excel or competitors
🎯 **Security** - How we keep your data safe
🎯 **Payment** - How customers pay you (OPay, banks, etc.)

**Or type your question differently and I'll understand better!**`;
    confidence = 0.5; // Low confidence = might need help
  }

  // Track category
  if (matchedCategory) {
    conversationState.matchedCategories.push(matchedCategory);
  }

  // Update conversation stats
  conversationState.messageCount++;
  conversationState.averageConfidence = (
    (conversationState.averageConfidence * (conversationState.messageCount - 1) + confidence) /
    conversationState.messageCount
  );

  // Check if we should escalate
  const escalation = getEscalation(conversationState);

  // If escalating, append message
  if (escalation) {
    baseResponse += `\n\n${escalation.message}`;

    // Mark as seen so we don't spam
    if (escalation.type === 'signup_cta') {
      conversationState.hasSeenCTA = true;
    }
  }

  return {
    response: baseResponse,
    confidence,
    category: matchedCategory,
    escalation: escalation || undefined
  };
}
