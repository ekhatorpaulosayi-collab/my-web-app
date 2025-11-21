/**
 * Invoice Service Layer
 * Handles all invoice operations, payment tracking, and Paystack integration
 */

import { supabase } from '../lib/supabase';

// ============================================
// TYPES & INTERFACES
// ============================================

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'cancelled';
export type PaymentTerms = 'DUE_ON_RECEIPT' | 'NET_7' | 'NET_15' | 'NET_30' | 'NET_60' | 'CUSTOM';
export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'paystack' | 'pos' | 'cheque' | 'other';
export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface InvoiceItem {
  id?: string;
  productId?: string;
  productName: string;
  description?: string;
  quantity: number;
  unitPriceKobo: number;
  totalKobo: number;
  lineOrder?: number;
}

export interface InvoicePayment {
  id?: string;
  amountKobo: number;
  paymentMethod: PaymentMethod;
  paymentDate?: Date;
  reference?: string;
  paystackTransactionId?: string;
  notes?: string;
  recordedByUserId?: string;
  recordedByStaffName?: string;
}

export interface Invoice {
  id?: string;
  userId: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  invoiceNumber?: string;
  issueDate: Date;
  dueDate: Date;
  paymentTerms: PaymentTerms;
  subtotalKobo: number;
  discountKobo?: number;
  vatKobo?: number;
  vatPercentage?: number;
  totalKobo: number;
  amountPaidKobo?: number;
  balanceDueKobo?: number;
  status?: InvoiceStatus;
  paymentLink?: string;
  paystackReference?: string;
  notes?: string;
  termsConditions?: string;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringStartDate?: Date;
  recurringEndDate?: Date;
  parentInvoiceId?: string;
  items: InvoiceItem[];
}

// ============================================
// INVOICE CRUD OPERATIONS
// ============================================

/**
 * Create a new invoice with auto-generated invoice number
 */
export async function createInvoice(
  userId: string,
  invoice: Invoice
): Promise<{ success: boolean; invoice?: any; error?: string }> {
  try {
    // Generate invoice number
    const { data: invoiceNumber, error: numberError } = await supabase
      .rpc('generate_invoice_number', { p_user_id: userId });

    if (numberError) throw numberError;

    // Calculate totals
    const totals = calculateInvoiceTotals(
      invoice.items,
      invoice.discountKobo || 0,
      invoice.vatPercentage || 0
    );

    // Insert invoice
    const { data: newInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id: userId,
        customer_id: invoice.customerId,
        customer_name: invoice.customerName,
        customer_email: invoice.customerEmail,
        customer_phone: invoice.customerPhone,
        customer_address: invoice.customerAddress,
        invoice_number: invoiceNumber,
        issue_date: invoice.issueDate,
        due_date: invoice.dueDate,
        payment_terms: invoice.paymentTerms,
        subtotal_kobo: totals.subtotalKobo,
        discount_kobo: invoice.discountKobo || 0,
        vat_kobo: totals.vatKobo,
        vat_percentage: invoice.vatPercentage || 0,
        total_kobo: totals.totalKobo,
        amount_paid_kobo: 0,
        balance_due_kobo: totals.totalKobo,
        status: invoice.status || 'draft',
        notes: invoice.notes,
        terms_conditions: invoice.termsConditions,
        is_recurring: invoice.isRecurring || false,
        recurring_frequency: invoice.recurringFrequency,
        recurring_start_date: invoice.recurringStartDate,
        recurring_end_date: invoice.recurringEndDate,
        parent_invoice_id: invoice.parentInvoiceId,
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Insert invoice items
    const itemsToInsert = invoice.items.map((item, index) => ({
      invoice_id: newInvoice.id,
      product_id: item.productId,
      product_name: item.productName,
      description: item.description,
      quantity: item.quantity,
      unit_price_kobo: item.unitPriceKobo,
      total_kobo: item.totalKobo,
      line_order: item.lineOrder || index,
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    return { success: true, invoice: newInvoice };
  } catch (error: any) {
    console.error('[createInvoice] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a single invoice with all items and payments
 */
export async function getInvoice(
  invoiceId: string,
  userId: string
): Promise<{ success: boolean; invoice?: any; error?: string }> {
  try {
    // Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .single();

    if (invoiceError) throw invoiceError;

    // Get items
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('line_order', { ascending: true });

    if (itemsError) throw itemsError;

    // Get payments
    const { data: payments, error: paymentsError } = await supabase
      .from('invoice_payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false });

    if (paymentsError) throw paymentsError;

    return {
      success: true,
      invoice: {
        ...invoice,
        items: items || [],
        payments: payments || [],
      },
    };
  } catch (error: any) {
    console.error('[getInvoice] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all invoices for a user with optional filters
 */
export async function getInvoices(
  userId: string,
  filters?: {
    status?: InvoiceStatus;
    customerId?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
  }
): Promise<{ success: boolean; invoices?: any[]; error?: string }> {
  try {
    let query = supabase
      .from('invoices')
      .select('*, invoice_items(count)')
      .eq('user_id', userId);

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }

    if (filters?.startDate) {
      query = query.gte('issue_date', filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      query = query.lte('issue_date', filters.endDate.toISOString());
    }

    if (filters?.search) {
      query = query.or(
        `invoice_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,customer_email.ilike.%${filters.search}%`
      );
    }

    const { data: invoices, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, invoices: invoices || [] };
  } catch (error: any) {
    console.error('[getInvoices] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update an existing invoice
 */
export async function updateInvoice(
  invoiceId: string,
  userId: string,
  updates: Partial<Invoice>
): Promise<{ success: boolean; invoice?: any; error?: string }> {
  try {
    // Recalculate totals if items changed
    let totals;
    if (updates.items) {
      totals = calculateInvoiceTotals(
        updates.items,
        updates.discountKobo || 0,
        updates.vatPercentage || 0
      );
    }

    const updateData: any = {};

    // Map updates to database columns
    if (updates.customerName) updateData.customer_name = updates.customerName;
    if (updates.customerEmail) updateData.customer_email = updates.customerEmail;
    if (updates.customerPhone) updateData.customer_phone = updates.customerPhone;
    if (updates.customerAddress) updateData.customer_address = updates.customerAddress;
    if (updates.dueDate) updateData.due_date = updates.dueDate;
    if (updates.paymentTerms) updateData.payment_terms = updates.paymentTerms;
    if (updates.notes) updateData.notes = updates.notes;
    if (updates.termsConditions) updateData.terms_conditions = updates.termsConditions;
    if (updates.status) updateData.status = updates.status;

    if (totals) {
      updateData.subtotal_kobo = totals.subtotalKobo;
      updateData.vat_kobo = totals.vatKobo;
      updateData.total_kobo = totals.totalKobo;
      updateData.balance_due_kobo = totals.totalKobo - (updates.amountPaidKobo || 0);
    }

    // Update invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Update items if provided
    if (updates.items) {
      // Delete existing items
      await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);

      // Insert new items
      const itemsToInsert = updates.items.map((item, index) => ({
        invoice_id: invoiceId,
        product_id: item.productId,
        product_name: item.productName,
        description: item.description,
        quantity: item.quantity,
        unit_price_kobo: item.unitPriceKobo,
        total_kobo: item.totalKobo,
        line_order: item.lineOrder || index,
      }));

      await supabase.from('invoice_items').insert(itemsToInsert);
    }

    return { success: true, invoice };
  } catch (error: any) {
    console.error('[updateInvoice] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete/Cancel an invoice
 */
export async function deleteInvoice(
  invoiceId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('[deleteInvoice] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel an invoice (soft delete)
 */
export async function cancelInvoice(
  invoiceId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('[cancelInvoice] Error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// PAYMENT TRACKING
// ============================================

/**
 * Record a payment against an invoice
 * Automatically updates invoice status
 */
export async function recordPayment(
  invoiceId: string,
  userId: string,
  payment: InvoicePayment
): Promise<{ success: boolean; payment?: any; error?: string }> {
  try {
    // Insert payment
    const { data: newPayment, error: paymentError } = await supabase
      .from('invoice_payments')
      .insert({
        invoice_id: invoiceId,
        amount_kobo: payment.amountKobo,
        payment_method: payment.paymentMethod,
        payment_date: payment.paymentDate || new Date(),
        reference: payment.reference,
        paystack_transaction_id: payment.paystackTransactionId,
        notes: payment.notes,
        recorded_by_user_id: userId,
        recorded_by_staff_name: payment.recordedByStaffName,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Trigger status update (handled by database trigger)
    // But we can also call the function directly to ensure it runs
    await supabase.rpc('update_invoice_status', { p_invoice_id: invoiceId });

    return { success: true, payment: newPayment };
  } catch (error: any) {
    console.error('[recordPayment] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all payments for an invoice
 */
export async function getInvoicePayments(
  invoiceId: string
): Promise<{ success: boolean; payments?: any[]; error?: string }> {
  try {
    const { data: payments, error } = await supabase
      .from('invoice_payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false });

    if (error) throw error;

    return { success: true, payments: payments || [] };
  } catch (error: any) {
    console.error('[getInvoicePayments] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate Paystack payment link for an invoice
 */
export async function generatePaystackLink(
  invoiceId: string,
  userId: string,
  paystackSecretKey: string
): Promise<{ success: boolean; paymentLink?: string; error?: string }> {
  try {
    // Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .single();

    if (invoiceError) throw invoiceError;

    // Generate unique reference
    const reference = `INV-${invoice.invoice_number}-${Date.now()}`;

    // Call Paystack API to create payment link
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: invoice.customer_email,
        amount: invoice.balance_due_kobo / 100, // Convert kobo to naira for Paystack
        reference: reference,
        metadata: {
          invoice_id: invoiceId,
          invoice_number: invoice.invoice_number,
          customer_name: invoice.customer_name,
        },
        callback_url: `${window.location.origin}/invoices/${invoiceId}/payment-success`,
      }),
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Failed to create payment link');
    }

    // Update invoice with payment link
    await supabase
      .from('invoices')
      .update({
        payment_link: data.data.authorization_url,
        paystack_reference: reference,
      })
      .eq('id', invoiceId);

    return {
      success: true,
      paymentLink: data.data.authorization_url,
    };
  } catch (error: any) {
    console.error('[generatePaystackLink] Error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// STATUS MANAGEMENT
// ============================================

/**
 * Mark invoice as sent
 */
export async function sendInvoice(
  invoiceId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('[sendInvoice] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark invoice as paid
 */
export async function markAsPaid(
  invoiceId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('[markAsPaid] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark overdue invoices (run daily via cron)
 */
export async function markOverdueInvoices(): Promise<{ success: boolean; error?: string }> {
  try {
    await supabase.rpc('mark_overdue_invoices');
    return { success: true };
  } catch (error: any) {
    console.error('[markOverdueInvoices] Error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate invoice totals (subtotal, VAT, total)
 */
export function calculateInvoiceTotals(
  items: InvoiceItem[],
  discountKobo: number = 0,
  vatPercentage: number = 0
): {
  subtotalKobo: number;
  vatKobo: number;
  totalKobo: number;
} {
  const subtotalKobo = items.reduce((sum, item) => sum + item.totalKobo, 0);
  const afterDiscount = subtotalKobo - discountKobo;
  const vatKobo = Math.round((afterDiscount * vatPercentage) / 100);
  const totalKobo = afterDiscount + vatKobo;

  return {
    subtotalKobo,
    vatKobo,
    totalKobo,
  };
}

/**
 * Get invoice summary/analytics
 */
export async function getInvoiceSummary(
  userId: string
): Promise<{
  success: boolean;
  summary?: {
    totalInvoices: number;
    paidInvoices: number;
    unpaidInvoices: number;
    overdueInvoices: number;
    totalAmountKobo: number;
    paidAmountKobo: number;
    unpaidAmountKobo: number;
    overdueAmountKobo: number;
  };
  error?: string;
}> {
  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('status, total_kobo, amount_paid_kobo, balance_due_kobo')
      .eq('user_id', userId)
      .neq('status', 'cancelled');

    if (error) throw error;

    const summary = {
      totalInvoices: invoices.length,
      paidInvoices: invoices.filter((i) => i.status === 'paid').length,
      unpaidInvoices: invoices.filter((i) => i.status !== 'paid').length,
      overdueInvoices: invoices.filter((i) => i.status === 'overdue').length,
      totalAmountKobo: invoices.reduce((sum, i) => sum + i.total_kobo, 0),
      paidAmountKobo: invoices.reduce((sum, i) => sum + i.amount_paid_kobo, 0),
      unpaidAmountKobo: invoices.reduce((sum, i) => sum + i.balance_due_kobo, 0),
      overdueAmountKobo: invoices
        .filter((i) => i.status === 'overdue')
        .reduce((sum, i) => sum + i.balance_due_kobo, 0),
    };

    return { success: true, summary };
  } catch (error: any) {
    console.error('[getInvoiceSummary] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get invoices due within X days
 */
export async function getDueInvoices(
  userId: string,
  daysAhead: number = 7
): Promise<{ success: boolean; invoices?: any[]; error?: string }> {
  try {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['sent', 'viewed', 'partial'])
      .gte('due_date', today.toISOString())
      .lte('due_date', futureDate.toISOString())
      .order('due_date', { ascending: true });

    if (error) throw error;

    return { success: true, invoices: invoices || [] };
  } catch (error: any) {
    console.error('[getDueInvoices] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate WhatsApp message for invoice
 */
export function generateInvoiceWhatsAppMessage(invoice: any): string {
  const totalNaira = (invoice.total_kobo / 100).toLocaleString('en-NG', {
    style: 'currency',
    currency: 'NGN',
  });

  const dueDate = new Date(invoice.due_date).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `📄 *INVOICE ${invoice.invoice_number}*

Hello ${invoice.customer_name},

Here's your invoice for recent purchase:

💰 Amount: *${totalNaira}*
📅 Due Date: ${dueDate}

${invoice.payment_link ? `\n🔗 Pay Online: ${invoice.payment_link}\n` : ''}
View full invoice: ${window.location.origin}/invoice/${invoice.id}

Thank you for your business! 🙏`;
}

/**
 * Calculate payment terms due date
 */
export function calculateDueDate(issueDate: Date, paymentTerms: PaymentTerms): Date {
  const dueDate = new Date(issueDate);

  switch (paymentTerms) {
    case 'DUE_ON_RECEIPT':
      return dueDate; // Same day
    case 'NET_7':
      dueDate.setDate(dueDate.getDate() + 7);
      break;
    case 'NET_15':
      dueDate.setDate(dueDate.getDate() + 15);
      break;
    case 'NET_30':
      dueDate.setDate(dueDate.getDate() + 30);
      break;
    case 'NET_60':
      dueDate.setDate(dueDate.getDate() + 60);
      break;
    default:
      return dueDate;
  }

  return dueDate;
}

/**
 * Format currency (kobo to naira)
 */
export function formatCurrency(kobo: number): string {
  return (kobo / 100).toLocaleString('en-NG', {
    style: 'currency',
    currency: 'NGN',
  });
}
