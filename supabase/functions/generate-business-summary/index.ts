// generate-business-summary
//
// Rebuilt 2026-05-03 from scratch. Old file got into a state where the
// Supabase edge runtime BOOT_ERRORed regardless of which line we cut —
// archived as `index.ts.archive-broken-2026-05-03` for reference.
//
// Architecture mirrors send-agent-message and ai-chat: raw fetch() to
// OpenAI (no SDK), unpinned `@supabase/supabase-js@2`, OPTIONS handler
// first, auth before business logic, every Response carries corsHeaders.
//
// No TypeScript type annotations on local variables — the runtime has
// been finicky with TS today, and the working sibling functions also
// keep locals plain.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// WAT (UTC+1) calendar boundaries for a given anchor date.
// Also returns the previous-period boundaries (same length, shifted back)
// so we can compute period-over-period change.
function computePeriod(period, anchorIso) {
  const watOffsetMs = 60 * 60 * 1000;
  const anchor = new Date(anchorIso);
  if (isNaN(anchor.getTime())) {
    throw new Error('period_start is not a valid ISO date');
  }
  const watAnchor = new Date(anchor.getTime() + watOffsetMs);

  let startWat;
  let endWat;
  let prevStartWat;
  let prevEndWat;

  if (period === 'daily') {
    startWat = new Date(watAnchor);
    startWat.setUTCHours(0, 0, 0, 0);
    endWat = new Date(watAnchor);
    endWat.setUTCHours(23, 59, 59, 999);
    prevEndWat = new Date(startWat.getTime() - 1);
    prevStartWat = new Date(prevEndWat);
    prevStartWat.setUTCHours(0, 0, 0, 0);
  } else if (period === 'weekly') {
    const dayOfWeek = watAnchor.getUTCDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startWat = new Date(watAnchor);
    startWat.setUTCDate(startWat.getUTCDate() - daysToMonday);
    startWat.setUTCHours(0, 0, 0, 0);
    endWat = new Date(startWat);
    endWat.setUTCDate(endWat.getUTCDate() + 6);
    endWat.setUTCHours(23, 59, 59, 999);
    prevStartWat = new Date(startWat);
    prevStartWat.setUTCDate(prevStartWat.getUTCDate() - 7);
    prevEndWat = new Date(endWat);
    prevEndWat.setUTCDate(prevEndWat.getUTCDate() - 7);
  } else if (period === 'monthly') {
    startWat = new Date(watAnchor);
    startWat.setUTCDate(1);
    startWat.setUTCHours(0, 0, 0, 0);
    endWat = new Date(startWat);
    endWat.setUTCMonth(endWat.getUTCMonth() + 1);
    endWat.setUTCDate(0);
    endWat.setUTCHours(23, 59, 59, 999);
    prevStartWat = new Date(startWat);
    prevStartWat.setUTCMonth(prevStartWat.getUTCMonth() - 1);
    prevEndWat = new Date(startWat.getTime() - 1);
  } else {
    throw new Error('period must be daily, weekly, or monthly');
  }

  // Convert WAT-anchored boundaries back to UTC instants for DB query.
  return {
    start: new Date(startWat.getTime() - watOffsetMs),
    end: new Date(endWat.getTime() - watOffsetMs),
    previousStart: new Date(prevStartWat.getTime() - watOffsetMs),
    previousEnd: new Date(prevEndWat.getTime() - watOffsetMs),
  };
}

serve(async (req) => {
  // 1) OPTIONS preflight — first, before anything else.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[BusinessSummary] Missing Supabase env vars');
      return jsonResponse({ error: 'Server not configured' }, 500);
    }
    if (!OPENAI_API_KEY) {
      console.error('[BusinessSummary] Missing OPENAI_API_KEY');
      return jsonResponse({ error: 'Server not configured' }, 500);
    }

    // 2) Auth — verify Bearer token, extract user_id.
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    const token = authHeader.replace(/^Bearer\s+/i, '');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.warn('[BusinessSummary] Invalid token:', authError && authError.message);
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    const userId = user.id;

    // Parse body.
    let body;
    try {
      body = await req.json();
    } catch (_e) {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }
    const { store_id, period, period_start } = body || {};
    if (!store_id || !period || !period_start) {
      return jsonResponse({ error: 'store_id, period, and period_start are required' }, 400);
    }
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return jsonResponse({ error: 'period must be daily, weekly, or monthly' }, 400);
    }

    // 3) Store lookup + ownership check (stores.user_id is TEXT).
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, user_id')
      .eq('id', store_id)
      .maybeSingle();

    if (storeError || !store) {
      console.warn('[BusinessSummary] Store not found:', storeError && storeError.message);
      return jsonResponse({ error: 'Store not found' }, 404);
    }
    if (String(store.user_id) !== String(userId)) {
      console.warn('[BusinessSummary] Caller does not own store', {
        authUser: userId,
        storeOwner: store.user_id,
      });
      return jsonResponse({ error: 'Forbidden — not store owner' }, 403);
    }

    // 4) Tier check — Pro or Business only.
    const { data: subRow } = await supabase
      .from('user_subscriptions')
      .select('tier_id')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: tierRow } = await supabase
      .from('subscription_tiers')
      .select('name')
      .eq('id', (subRow && subRow.tier_id) || 'free')
      .maybeSingle();

    const tierName = (tierRow && tierRow.name) || 'Free';
    if (!['Pro', 'Business'].includes(tierName)) {
      return jsonResponse(
        { error: 'This feature requires a Pro subscription', tier: tierName },
        403
      );
    }

    // 5) Compute date range.
    let range;
    try {
      range = computePeriod(period, period_start);
    } catch (rangeErr) {
      return jsonResponse({ error: rangeErr.message }, 400);
    }

    // 6) Query sales for the period (sales.user_id is TEXT, money in kobo
    // per migration 20260530_sales_units_to_kobo; divided to naira for AI
    // prompt readability so the model sees ₦-scale numbers).
    const { data: salesRows, error: salesError } = await supabase
      .from('sales')
      .select('total_amount, created_at, payment_method, product_name, quantity')
      .eq('user_id', userId)
      .gte('created_at', range.start.toISOString())
      .lte('created_at', range.end.toISOString());

    if (salesError) {
      console.error('[BusinessSummary] Sales query failed:', salesError);
      return jsonResponse({ error: 'Sales query failed', details: salesError.message }, 500);
    }
    const sales = salesRows || [];

    // 7) Totals — convert kobo → naira at read time so downstream display
    // values stay in naira (matches the old shape).
    let total = 0;
    const byMethod = { cash: 0, card: 0, transfer: 0, credit: 0, other: 0 };
    for (const s of sales) {
      const amt = (s.total_amount || 0) / 100;
      total += amt;
      const m = (s.payment_method || 'other').toLowerCase();
      if (byMethod[m] !== undefined) {
        byMethod[m] += amt;
      } else {
        byMethod.other += amt;
      }
    }
    const totalSales = total;
    const byPaymentMethod = {
      cash: byMethod.cash,
      card: byMethod.card,
      transfer: byMethod.transfer,
      credit: byMethod.credit,
      other: byMethod.other,
    };

    // 8) Top products from denormalized sales rows.
    const productMap = new Map();
    for (const s of sales) {
      const name = (s.product_name || '').trim();
      if (!name) continue;
      const prev = productMap.get(name) || { name, quantity: 0, revenue: 0 };
      prev.quantity += s.quantity || 0;
      prev.revenue += (s.total_amount || 0) / 100;
      productMap.set(name, prev);
    }
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);

    // 8b) Previous-period sales for change comparison (totals only).
    const { data: prevSalesRows } = await supabase
      .from('sales')
      .select('total_amount')
      .eq('user_id', userId)
      .gte('created_at', range.previousStart.toISOString())
      .lte('created_at', range.previousEnd.toISOString());

    let prevTotal = 0;
    for (const s of prevSalesRows || []) {
      prevTotal += (s.total_amount || 0) / 100;
    }
    const previousTotalSales = prevTotal;
    // change is a string (matches old shape: renderer parses with parseFloat).
    // Null when prior period had zero sales — avoids divide-by-zero / Infinity.
    const change = previousTotalSales > 0
      ? (((totalSales - previousTotalSales) / previousTotalSales) * 100).toFixed(1)
      : null;

    // 9) Low stock from products (column is `quantity`, not `stock`).
    const { data: lowStockRows } = await supabase
      .from('products')
      .select('name, quantity')
      .eq('user_id', userId)
      .lt('quantity', 5)
      .order('quantity', { ascending: true })
      .limit(10);

    const lowStock = (lowStockRows || []).map(p => ({ name: p.name, stock: p.quantity }));

    // 9b) Chat insights — counts the renderer reads + a topTopics array
    // for the LLM prompt. Renderer needs totalConversations, humanTakeovers,
    // whatsappRedirects (see BusinessInsights.tsx:323-328).
    const { data: convRows } = await supabase
      .from('ai_chat_conversations')
      .select('id, takeover_status, chat_status')
      .eq('store_id', store_id)
      .gte('created_at', range.start.toISOString())
      .lte('created_at', range.end.toISOString());

    const conversations = convRows || [];
    const totalConversations = conversations.length;
    const humanTakeovers = conversations.filter(c =>
      c.takeover_status === 'requested' ||
      c.takeover_status === 'agent' ||
      c.takeover_status === 'agent_active'
    ).length;
    const whatsappRedirects = conversations.filter(c =>
      c.chat_status === 'moved_to_whatsapp'
    ).length;

    let topTopics = [];
    if (conversations.length > 0) {
      const convIds = conversations.map(c => c.id);
      const { data: msgRows } = await supabase
        .from('ai_chat_messages')
        .select('content')
        .in('conversation_id', convIds)
        .eq('role', 'user');

      const topicCount = new Map();
      for (const m of msgRows || []) {
        const content = (m.content || '').toLowerCase();
        if (content.includes('price') || content.includes('cost')) {
          topicCount.set('pricing', (topicCount.get('pricing') || 0) + 1);
        }
        if (content.includes('delivery') || content.includes('ship')) {
          topicCount.set('delivery', (topicCount.get('delivery') || 0) + 1);
        }
        if (content.includes('stock') || content.includes('available')) {
          topicCount.set('availability', (topicCount.get('availability') || 0) + 1);
        }
        if (content.includes('discount') || content.includes('offer') || content.includes('sale')) {
          topicCount.set('discounts', (topicCount.get('discounts') || 0) + 1);
        }
        if (content.includes('return') || content.includes('refund')) {
          topicCount.set('returns', (topicCount.get('returns') || 0) + 1);
        }
      }
      topTopics = Array.from(topicCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(entry => entry[0]);
    }

    const chatInsights = {
      totalConversations,
      humanTakeovers,
      whatsappRedirects,
      topTopics,
    };

    // 10) Build snapshot. All amounts in naira (DB is kobo per migration
    // 20260530; converted at read time in step 7 + step 8b).
    const dataSnapshot = {
      period: {
        type: period,
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      },
      sales: {
        total: totalSales,
        count: sales.length,
        byPaymentMethod,
        previousTotal: previousTotalSales,
        change,
      },
      topProducts,
      lowStock,
      chatInsights,
    };

    // 11) Generate summary via OpenAI raw fetch.
    const systemPrompt =
      'You are a Nigerian small-business analyst. Write a short, factual ' +
      'summary of the data the user provides. Direct, plain English, no ' +
      'flattery, no motivational fluff, no exclamation marks. Use ₦ for ' +
      'currency. 4-6 short sentences max. End with one concrete next step ' +
      'the owner can take based on the data.';

    const breakdownLines = [];
    if (byPaymentMethod.cash > 0) breakdownLines.push(`cash ₦${byPaymentMethod.cash.toLocaleString()}`);
    if (byPaymentMethod.transfer > 0) breakdownLines.push(`transfer ₦${byPaymentMethod.transfer.toLocaleString()}`);
    if (byPaymentMethod.card > 0) breakdownLines.push(`card ₦${byPaymentMethod.card.toLocaleString()}`);
    if (byPaymentMethod.credit > 0) breakdownLines.push(`credit ₦${byPaymentMethod.credit.toLocaleString()}`);
    if (byPaymentMethod.other > 0) breakdownLines.push(`other ₦${byPaymentMethod.other.toLocaleString()}`);

    const previousLabel = period === 'daily' ? 'yesterday' : period === 'weekly' ? 'last week' : 'last month';
    const changeLine = change === null
      ? `No sales in the comparable previous ${period.replace('ly', '')} period.`
      : `Change vs ${previousLabel}: ${change}% (previous total ₦${previousTotalSales.toLocaleString()}).`;

    const chatLine = totalConversations === 0
      ? 'No customer chats this period.'
      : `Customer chats: ${totalConversations} total, ${humanTakeovers} requested human help, ${whatsappRedirects} moved to WhatsApp` +
        (topTopics.length > 0 ? `; top topics: ${topTopics.join(', ')}.` : '.');

    const userPrompt =
      `Period: ${period} (${range.start.toISOString().slice(0, 10)} to ${range.end.toISOString().slice(0, 10)}).\n` +
      `Total sales: ₦${totalSales.toLocaleString()} across ${sales.length} transaction(s).\n` +
      `${changeLine}\n` +
      `Payment mix: ${breakdownLines.join(', ') || 'none'}.\n` +
      `Top products: ${topProducts.length === 0 ? 'none' : topProducts.map(p => `${p.name} (${p.quantity} sold, ₦${p.revenue.toLocaleString()})`).join('; ')}.\n` +
      `Low-stock items: ${lowStock.length === 0 ? 'none' : lowStock.slice(0, 5).map(i => `${i.name} (${i.stock} left)`).join('; ')}.\n` +
      `${chatLine}`;

    let summaryText = 'Summary unavailable (AI request failed).';
    try {
      const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.4,
          max_tokens: 400,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
      if (!openaiResp.ok) {
        const errText = await openaiResp.text();
        console.error('[BusinessSummary] OpenAI error', openaiResp.status, errText);
      } else {
        const completion = await openaiResp.json();
        const text = completion && completion.choices && completion.choices[0]
          && completion.choices[0].message && completion.choices[0].message.content;
        if (text && typeof text === 'string') {
          summaryText = text.trim();
        }
      }
    } catch (openaiErr) {
      console.error('[BusinessSummary] OpenAI fetch threw:', openaiErr);
    }

    // 12) Upsert into business_summaries.
    const periodStartIso = range.start.toISOString().slice(0, 10);
    const periodEndIso = range.end.toISOString().slice(0, 10);

    const { data: saved, error: saveError } = await supabase
      .from('business_summaries')
      .upsert(
        {
          store_id,
          period,
          period_start: periodStartIso,
          period_end: periodEndIso,
          summary_text: summaryText,
          data_snapshot: dataSnapshot,
        },
        { onConflict: 'store_id,period,period_start' }
      )
      .select()
      .maybeSingle();

    if (saveError) {
      console.error('[BusinessSummary] Save failed:', saveError);
      // Still return the generated summary so the UI shows something.
    }

    // 13) Return result.
    return jsonResponse({
      summary_text: summaryText,
      data_snapshot: dataSnapshot,
      id: (saved && saved.id) || null,
    }, 200);

  } catch (err) {
    console.error('[BusinessSummary] Unhandled error:', err);
    return jsonResponse(
      { error: (err && err.message) || 'Internal server error' },
      500
    );
  }
});
