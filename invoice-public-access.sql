-- Allow public read access to invoices and invoice items
-- This enables customers to view invoices without logging in

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view invoices" ON invoices;
DROP POLICY IF EXISTS "Public can view invoice items" ON invoice_items;

-- Allow anyone to view invoices (for customer access)
CREATE POLICY "Public can view invoices"
  ON invoices FOR SELECT
  USING (true);

-- Allow anyone to view invoice items (for customer access)
CREATE POLICY "Public can view invoice items"
  ON invoice_items FOR SELECT
  USING (true);

-- Note: Other operations (INSERT, UPDATE, DELETE) still require authentication
-- and are protected by the existing user-specific policies
