/**
 * Supabase Edge Function: Send Daily WhatsApp Reports
 * Sends automated business reports to Storehouse users via WhatsApp
 * Triggered by cron job daily at 6 PM Nigerian time (WAT - UTC+1)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!
const TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM')! // whatsapp:+14155238886 for sandbox

interface ReportSettings {
  enabled: boolean
  deliveryTime: string // "18:00"
  includeProfit: boolean
  includeStockAlerts: boolean
  includeDebts: boolean
  recipients: string[] // WhatsApp numbers
}

interface DailyMetrics {
  salesCount: number
  revenue: number
  profit: number
  profitMargin: number
  cashSales: number
  creditSales: number
  transferSales: number
  posSales: number
  topProducts: Array<{ name: string; units: number; profit: number }>
  lowStockItems: Array<{ name: string; quantity: number }>
  debtsCollected: number
  yesterdayRevenue: number
}

serve(async (req) => {
  try {
    // ============================================================
    // CRON SECRET CHECK — added 2026-05-01 to close M12 in security audit.
    // This function is meant to be triggered only by the Supabase scheduler
    // (or another trusted cron). Without this gate, any caller could iterate
    // every business with reports enabled and burn Twilio credits.
    //
    // The caller must send `x-cron-secret: <value>` matching the env var
    // CRON_SECRET. Configure with:
    //   supabase secrets set CRON_SECRET="<random-strong-value>" \
    //     --project-ref yzlniqwzqlsftxrtapdl
    // and configure your scheduler/cron to send the same value.
    // ============================================================
    const expectedSecret = Deno.env.get('CRON_SECRET')
    const providedSecret = req.headers.get('x-cron-secret')
    if (!expectedSecret) {
      console.error('[DailyReports] CRON_SECRET env var is not configured — refusing all requests')
      return new Response(
        JSON.stringify({ error: 'Server not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    if (!providedSecret || providedSecret !== expectedSecret) {
      console.warn('[DailyReports] Missing or invalid x-cron-secret header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🚀 Starting daily report generation...')

    // Get today's date in Nigerian timezone (WAT = UTC+1)
    const now = new Date()
    const nigerianTime = new Date(now.getTime() + (1 * 60 * 60 * 1000)) // Add 1 hour for WAT
    const today = nigerianTime.toISOString().split('T')[0]
    const currentHour = nigerianTime.getHours() // Get current hour in Nigerian time (0-23)
    const currentTime = `${String(currentHour).padStart(2, '0')}:00` // Format as "18:00"

    console.log(`📅 Generating reports for: ${today} (Nigerian time: ${nigerianTime.toLocaleTimeString('en-NG')})`)
    console.log(`⏰ Current hour in Nigeria: ${currentTime}`)

    // Get all users (businesses) with daily reports enabled AND matching delivery time
    const { data: allBusinesses, error: businessError } = await supabase
      .from('users')
      .select('id, business_name, phone_number, report_settings')
      .eq('report_settings->enabled', true)

    if (businessError) {
      throw new Error(`Failed to fetch businesses: ${businessError.message}`)
    }

    if (!allBusinesses || allBusinesses.length === 0) {
      console.log('ℹ️ No businesses with reports enabled')
      return new Response(JSON.stringify({ message: 'No businesses have reports enabled' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log(`📊 Found ${allBusinesses.length} businesses with reports enabled`)

    // Filter to only businesses whose delivery time matches current hour
    const businesses = allBusinesses.filter(business => {
      const settings = business.report_settings as ReportSettings
      const deliveryTime = settings.deliveryTime || '18:00'
      return deliveryTime === currentTime
    })

    if (businesses.length === 0) {
      console.log(`ℹ️ No businesses scheduled for ${currentTime} (Nigerian time)`)
      return new Response(JSON.stringify({
        message: `No reports scheduled for ${currentTime}`,
        currentTime,
        totalEnabled: allBusinesses.length
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log(`📤 Sending reports to ${businesses.length} businesses scheduled for ${currentTime}`)

    let successCount = 0
    let errorCount = 0

    // Process each business
    for (const business of businesses) {
      try {
        console.log(`\n📦 Processing: ${business.business_name} (${business.id})`)

        // Generate report
        const metrics = await generateDailyMetrics(supabase, business.id, today)
        const message = formatReportMessage(business.business_name, metrics, today)

        // Get recipients from settings
        const settings = business.report_settings as ReportSettings
        const recipients = settings.recipients || []

        if (recipients.length === 0) {
          console.log(`⚠️ No recipients configured for ${business.business_name}`)
          continue
        }

        // Send to each recipient
        for (const recipient of recipients) {
          try {
            await sendWhatsAppMessage(recipient, message)
            console.log(`✅ Sent report to ${recipient}`)
            successCount++
          } catch (error) {
            console.error(`❌ Failed to send to ${recipient}:`, error)
            errorCount++
          }
        }
      } catch (error) {
        console.error(`❌ Error processing ${business.business_name}:`, error)
        errorCount++
      }
    }

    const summary = {
      message: 'Daily reports processing complete',
      date: today,
      businessesProcessed: businesses.length,
      messagesSent: successCount,
      errors: errorCount,
    }

    console.log('\n📈 Summary:', summary)

    return new Response(JSON.stringify(summary), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('💥 Critical error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

/**
 * Generate daily metrics for a business
 */
async function generateDailyMetrics(
  supabase: any,
  userId: string,
  date: string
): Promise<DailyMetrics> {
  // Get today's sales
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('product_name, quantity, unit_price, final_amount, payment_method, product_id')
    .eq('user_id', userId)
    .eq('sale_date', date)

  if (salesError) throw salesError

  // Get product cost prices for profit calculation
  const productIds = sales?.map(s => s.product_id).filter(Boolean) || []
  const { data: products } = await supabase
    .from('products')
    .select('id, cost_price')
    .in('id', productIds)

  const costPriceMap = new Map(products?.map(p => [p.id, p.cost_price]) || [])

  // Calculate metrics (convert from kobo to naira by dividing by 100)
  const salesCount = sales?.length || 0
  const revenue = (sales?.reduce((sum, sale) => sum + (sale.final_amount || 0), 0) || 0) / 100

  // Calculate profit
  let profit = 0
  sales?.forEach(sale => {
    const costPrice = costPriceMap.get(sale.product_id) || 0
    const saleProfit = ((sale.unit_price - costPrice) * sale.quantity) / 100
    profit += saleProfit
  })

  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0

  // Payment breakdown (convert from kobo to naira)
  // Case-insensitive compare — writer is inconsistent (capital 'Cash' from RecordSaleModal vs lowercase from syncOfflineSales). Approach B patch.
  const cashSales = (sales?.filter(s => (s.payment_method || '').toLowerCase() === 'cash')
    .reduce((sum, sale) => sum + sale.final_amount, 0) || 0) / 100
  const creditSales = (sales?.filter(s => (s.payment_method || '').toLowerCase() === 'credit')
    .reduce((sum, sale) => sum + sale.final_amount, 0) || 0) / 100
  const transferSales = (sales?.filter(s => (s.payment_method || '').toLowerCase() === 'transfer')
    .reduce((sum, sale) => sum + sale.final_amount, 0) || 0) / 100
  const posSales = (sales?.filter(s => (s.payment_method || '').toLowerCase() === 'card')
    .reduce((sum, sale) => sum + sale.final_amount, 0) || 0) / 100

  // Top products
  const productMap = new Map()
  sales?.forEach(sale => {
    const existing = productMap.get(sale.product_name) || { units: 0, profit: 0 }
    const costPrice = costPriceMap.get(sale.product_id) || 0
    const saleProfit = ((sale.unit_price - costPrice) * sale.quantity) / 100

    productMap.set(sale.product_name, {
      name: sale.product_name,
      units: existing.units + sale.quantity,
      profit: existing.profit + saleProfit,
    })
  })
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 3)

  // Low stock items
  const { data: lowStock } = await supabase
    .from('products')
    .select('name, quantity, low_stock_threshold')
    .eq('user_id', userId)
    .lte('quantity', supabase.raw('low_stock_threshold'))
    .order('quantity', { ascending: true })
    .limit(5)

  const lowStockItems = lowStock?.map(p => ({
    name: p.name,
    quantity: p.quantity,
  })) || []

  // Debts collected today (if debt_payments table exists)
  let debtsCollected = 0
  try {
    const { data: payments } = await supabase
      .from('debt_payments')
      .select('amount')
      .eq('user_id', userId)
      .eq('payment_date', date)

    debtsCollected = (payments?.reduce((sum, p) => sum + p.amount, 0) || 0) / 100
  } catch {
    // Table might not exist, ignore
  }

  // Yesterday's revenue for comparison
  const yesterday = new Date(date)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayDate = yesterday.toISOString().split('T')[0]

  const { data: yesterdaySales } = await supabase
    .from('sales')
    .select('final_amount')
    .eq('user_id', userId)
    .eq('sale_date', yesterdayDate)

  const yesterdayRevenue = (yesterdaySales?.reduce((sum, s) => sum + s.final_amount, 0) || 0) / 100

  return {
    salesCount,
    revenue,
    profit,
    profitMargin,
    cashSales,
    creditSales,
    transferSales,
    posSales,
    topProducts,
    lowStockItems,
    debtsCollected,
    yesterdayRevenue,
  }
}

/**
 * Format the WhatsApp report message
 */
function formatReportMessage(businessName: string, metrics: DailyMetrics, date: string): string {
  const formatCurrency = (amount: number) => `₦${amount.toLocaleString('en-NG')}`

  // Calculate vs yesterday
  const change = metrics.revenue - metrics.yesterdayRevenue
  const changePercent = metrics.yesterdayRevenue > 0
    ? ((change / metrics.yesterdayRevenue) * 100).toFixed(0)
    : '0'
  const changeEmoji = change > 0 ? '↗️' : change < 0 ? '↘️' : '➡️'
  const changeText = change !== 0
    ? `${changePercent}% ${change > 0 ? '(+' + formatCurrency(change) + ')' : '(' + formatCurrency(change) + ')'} ${changeEmoji}`
    : '(Same as yesterday)'

  let message = `🏪 ${businessName.toUpperCase()} DAILY REPORT
📅 ${new Date(date).toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

---------------------------
💰 SALES TODAY
---------------------------
Total Sales: ${metrics.salesCount} transactions
Revenue: ${formatCurrency(metrics.revenue)}
Profit: ${formatCurrency(metrics.profit)} (${metrics.profitMargin.toFixed(1)}% margin)

📊 vs Yesterday: ${changeText}
`

  // Payment breakdown
  if (metrics.cashSales > 0 || metrics.transferSales > 0 || metrics.posSales > 0 || metrics.creditSales > 0) {
    message += `\n💳 PAYMENT BREAKDOWN
---------------------------
`
    if (metrics.cashSales > 0) {
      message += `Cash: ${formatCurrency(metrics.cashSales)} (${((metrics.cashSales/metrics.revenue)*100).toFixed(0)}%)\n`
    }
    if (metrics.transferSales > 0) {
      message += `Transfer: ${formatCurrency(metrics.transferSales)} (${((metrics.transferSales/metrics.revenue)*100).toFixed(0)}%)\n`
    }
    if (metrics.posSales > 0) {
      message += `POS: ${formatCurrency(metrics.posSales)} (${((metrics.posSales/metrics.revenue)*100).toFixed(0)}%)\n`
    }
    if (metrics.creditSales > 0) {
      message += `Credit: ${formatCurrency(metrics.creditSales)} (${((metrics.creditSales/metrics.revenue)*100).toFixed(0)}%)\n`
    }
  }

  // Top products
  if (metrics.topProducts.length > 0) {
    message += `\n⭐ TOP ${metrics.topProducts.length} PRODUCTS SOLD
---------------------------
`
    metrics.topProducts.forEach((product, index) => {
      message += `${index + 1}. ${product.name} x ${product.units}\n   Profit: ${formatCurrency(product.profit)}\n\n`
    })
  }

  // Stock alerts
  if (metrics.lowStockItems.length > 0) {
    message += `📦 STOCK ALERTS
---------------------------
⚠️ LOW STOCK (Reorder Soon):
`
    metrics.lowStockItems.forEach(item => {
      message += `• ${item.name} - ${item.quantity} left\n`
    })
    message += '\n'
  }

  // Debts collected
  if (metrics.debtsCollected > 0) {
    message += `💸 DEBTS COLLECTED
---------------------------
${formatCurrency(metrics.debtsCollected)} received today

`
  }

  // Footer
  message += `---------------------------
${metrics.profit > 0 ? '💚 Great day!' : 'Keep pushing! 💪'}

Powered by Storehouse 🏪
storehouse.ng/reports

---------------------------
💬 Reply STOP to unsubscribe
⚙️ Manage settings: storehouse.ng/settings`

  return message
}

/**
 * Send WhatsApp message via Twilio
 */
async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  // Ensure phone number has country code
  const formattedTo = to.startsWith('+') ? to : `+${to}`
  const whatsappTo = formattedTo.startsWith('whatsapp:') ? formattedTo : `whatsapp:${formattedTo}`

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`

  const body = new URLSearchParams({
    From: TWILIO_WHATSAPP_FROM,
    To: whatsappTo,
    Body: message,
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Twilio API error: ${error}`)
  }

  const result = await response.json()
  console.log(`📤 Message SID: ${result.sid}`)
}
