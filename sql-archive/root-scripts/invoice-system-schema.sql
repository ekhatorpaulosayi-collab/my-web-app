-- Professional Invoice System Database Schema
-- For B2B sales, credit sales, and payment tracking
-- Created: 2025-11-20

-- ============================================
-- INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User & Customer
  user_id TEXT NOT NULL,
  customer_id UUID,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,

  -- Invoice Identification
  invoice_number TEXT UNIQUE NOT NULL, -- INV-001, INV-002

  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  payment_terms TEXT CHECK (payment_terms IN ('DUE_ON_RECEIPT', 'NET_7', 'NET_15', 'NET_30', 'NET_60', 'CUSTOM')),

  -- Amounts (all in kobo)
  subtotal_kobo INTEGER NOT NULL,
  discount_kobo INTEGER DEFAULT 0,
  vat_kobo INTEGER DEFAULT 0,
  vat_percentage DECIMAL(5,2) DEFAULT 0, -- e.g., 7.5 for 7.5%
  total_kobo INTEGER NOT NULL,

  -- Payment tracking
  amount_paid_kobo INTEGER DEFAULT 0,
  balance_due_kobo INTEGER NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled')),

  -- Payment Integration
  payment_link TEXT, -- Paystack payment link
  paystack_reference TEXT UNIQUE,

  -- Additional Info
  notes TEXT, -- Internal notes
  terms_conditions TEXT, -- Terms displayed on invoice

  -- Recurring Invoice
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  recurring_start_date DATE,
  recurring_end_date DATE,
  parent_invoice_id UUID REFERENCES invoices(id), -- If this is auto-generated from recurring

  -- Metadata
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVOICE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  -- Product reference (optional - item might be deleted from inventory)
  product_id UUID,

  -- Item details (snapshot at time of invoice)
  product_name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL,
  unit_price_kobo INTEGER NOT NULL,
  total_kobo INTEGER NOT NULL,

  -- Order for display
  line_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVOICE PAYMENTS TABLE
-- Track partial and full payments
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  -- Payment details
  amount_kobo INTEGER NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'transfer', 'card', 'paystack', 'pos', 'cheque', 'other')),
  payment_date TIMESTAMPTZ DEFAULT NOW(),

  -- Reference
  reference TEXT, -- Bank reference, Paystack reference, etc.
  paystack_transaction_id TEXT,

  -- Notes
  notes TEXT,

  -- Metadata
  recorded_by_user_id TEXT,
  recorded_by_staff_name TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVOICE REMINDERS TABLE
-- Track automated reminders sent
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  -- Reminder details
  reminder_type TEXT CHECK (reminder_type IN ('before_due', 'due_today', 'overdue_3_days', 'overdue_7_days', 'overdue_14_days', 'manual')),
  sent_via TEXT CHECK (sent_via IN ('whatsapp', 'email', 'sms')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),

  -- Message details
  message_content TEXT,

  -- Status
  delivered BOOLEAN DEFAULT false,
  opened BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON invoice_items(product_id);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_date ON invoice_payments(payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_invoice_reminders_invoice ON invoice_reminders(invoice_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_reminders ENABLE ROW LEVEL SECURITY;

-- Users can view their own invoices
CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can create invoices
CREATE POLICY "Users can create invoices"
  ON invoices FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own invoices
CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Users can delete their own invoices
CREATE POLICY "Users can delete own invoices"
  ON invoices FOR DELETE
  USING (auth.uid()::text = user_id);

-- Invoice items policies
CREATE POLICY "Users can view own invoice items"
  ON invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can manage own invoice items"
  ON invoice_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()::text
    )
  );

-- Invoice payments policies
CREATE POLICY "Users can view own invoice payments"
  ON invoice_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_payments.invoice_id
      AND invoices.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can manage own invoice payments"
  ON invoice_payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_payments.invoice_id
      AND invoices.user_id = auth.uid()::text
    )
  );

-- Invoice reminders policies
CREATE POLICY "Users can view own invoice reminders"
  ON invoice_reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_reminders.invoice_id
      AND invoices.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can manage own invoice reminders"
  ON invoice_reminders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_reminders.invoice_id
      AND invoices.user_id = auth.uid()::text
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(p_user_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_number TEXT;
BEGIN
  -- Count existing invoices for this user
  SELECT COUNT(*) INTO v_count
  FROM invoices
  WHERE user_id = p_user_id;

  -- Generate invoice number: INV-001, INV-002, etc.
  v_number := 'INV-' || LPAD((v_count + 1)::TEXT, 3, '0');

  -- Check if it already exists (edge case)
  WHILE EXISTS (SELECT 1 FROM invoices WHERE invoice_number = v_number AND user_id = p_user_id) LOOP
    v_count := v_count + 1;
    v_number := 'INV-' || LPAD((v_count + 1)::TEXT, 3, '0');
  END LOOP;

  RETURN v_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update invoice status based on payments
CREATE OR REPLACE FUNCTION update_invoice_status(p_invoice_id UUID)
RETURNS void AS $$
DECLARE
  v_total_paid INTEGER;
  v_invoice_total INTEGER;
  v_due_date DATE;
  v_new_status TEXT;
BEGIN
  -- Get total amount paid
  SELECT COALESCE(SUM(amount_kobo), 0) INTO v_total_paid
  FROM invoice_payments
  WHERE invoice_id = p_invoice_id;

  -- Get invoice total and due date
  SELECT total_kobo, due_date INTO v_invoice_total, v_due_date
  FROM invoices
  WHERE id = p_invoice_id;

  -- Determine new status
  IF v_total_paid = 0 THEN
    IF v_due_date < CURRENT_DATE THEN
      v_new_status := 'overdue';
    ELSE
      v_new_status := 'sent';
    END IF;
  ELSIF v_total_paid >= v_invoice_total THEN
    v_new_status := 'paid';
  ELSE
    v_new_status := 'partial';
  END IF;

  -- Update invoice
  UPDATE invoices
  SET
    amount_paid_kobo = v_total_paid,
    balance_due_kobo = v_invoice_total - v_total_paid,
    status = v_new_status,
    paid_at = CASE WHEN v_new_status = 'paid' THEN NOW() ELSE paid_at END,
    updated_at = NOW()
  WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark overdue invoices
CREATE OR REPLACE FUNCTION mark_overdue_invoices()
RETURNS void AS $$
BEGIN
  UPDATE invoices
  SET status = 'overdue', updated_at = NOW()
  WHERE status IN ('sent', 'viewed', 'partial')
    AND due_date < CURRENT_DATE
    AND balance_due_kobo > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update invoice status after payment
CREATE OR REPLACE FUNCTION trigger_update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_invoice_status(NEW.invoice_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_invoice_payment_insert
AFTER INSERT ON invoice_payments
FOR EACH ROW
EXECUTE FUNCTION trigger_update_invoice_status();

CREATE TRIGGER after_invoice_payment_update
AFTER UPDATE ON invoice_payments
FOR EACH ROW
EXECUTE FUNCTION trigger_update_invoice_status();

CREATE TRIGGER after_invoice_payment_delete
AFTER DELETE ON invoice_payments
FOR EACH ROW
EXECUTE FUNCTION trigger_update_invoice_status();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS (Optional - for analytics)
-- ============================================

-- View: Invoice summary with customer and payment info
CREATE OR REPLACE VIEW invoice_summary AS
SELECT
  i.id,
  i.invoice_number,
  i.user_id,
  i.customer_name,
  i.customer_email,
  i.customer_phone,
  i.issue_date,
  i.due_date,
  i.total_kobo,
  i.amount_paid_kobo,
  i.balance_due_kobo,
  i.status,
  i.payment_link,
  i.created_at,
  -- Days until/since due
  CASE
    WHEN i.due_date >= CURRENT_DATE THEN i.due_date - CURRENT_DATE
    ELSE (CURRENT_DATE - i.due_date) * -1
  END as days_until_due,
  -- Payment progress percentage
  CASE
    WHEN i.total_kobo > 0 THEN (i.amount_paid_kobo::DECIMAL / i.total_kobo * 100)
    ELSE 0
  END as payment_percentage,
  -- Item count
  (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) as item_count,
  -- Payment count
  (SELECT COUNT(*) FROM invoice_payments WHERE invoice_id = i.id) as payment_count
FROM invoices i;

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================
-- Uncomment to test:
/*
INSERT INTO invoices (
  user_id,
  invoice_number,
  customer_name,
  customer_email,
  customer_phone,
  issue_date,
  due_date,
  payment_terms,
  subtotal_kobo,
  total_kobo,
  balance_due_kobo,
  status
) VALUES (
  'test-user-id',
  'INV-001',
  'Adeola Boutique',
  'adeola@boutique.com',
  '+234-XXX-XXX-XXXX',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '15 days',
  'NET_15',
  120000000, -- ₦1,200,000
  120000000,
  120000000,
  'sent'
);
*/

-- ============================================
-- NOTES
-- ============================================
-- Invoice Workflow:
-- 1. Create draft invoice → status: 'draft'
-- 2. Send to customer → status: 'sent', sent_at: NOW()
-- 3. Customer views → status: 'viewed', viewed_at: NOW()
-- 4. Customer pays partially → status: 'partial'
-- 5. Customer pays fully → status: 'paid', paid_at: NOW()
-- 6. Invoice past due → status: 'overdue' (auto-updated)
--
-- Payment Terms:
-- - DUE_ON_RECEIPT: Due immediately
-- - NET_7: Due in 7 days
-- - NET_15: Due in 15 days (standard)
-- - NET_30: Due in 30 days (common for B2B)
-- - NET_60: Due in 60 days (large clients)
-- - CUSTOM: Custom due date
--
-- Status Flow:
-- draft → sent → viewed → partial → paid
--   ↓       ↓       ↓        ↓
-- cancelled overdue overdue  ✓
