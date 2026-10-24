-- Staff Accounts System
-- Professional staff management with role-based permissions and activity logging

-- ============================================
-- 1. STAFF TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_owner_uid TEXT NOT NULL, -- Firebase UID of store owner

  -- Staff Information
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,

  -- Authentication
  pin TEXT NOT NULL, -- Hashed 4-6 digit PIN
  role TEXT NOT NULL CHECK (role IN ('manager', 'cashier')),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(store_owner_uid, pin), -- Each owner's staff must have unique PINs
  UNIQUE(store_owner_uid, email) -- Each owner's staff must have unique emails (if provided)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_staff_owner_uid ON staff_members(store_owner_uid);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff_members(store_owner_uid, is_active);

-- ============================================
-- 2. ACTIVITY LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS staff_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_owner_uid TEXT NOT NULL,
  staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,

  -- Activity Details
  action_type TEXT NOT NULL, -- 'sale', 'login', 'logout', 'add_product', etc.
  action_details JSONB, -- Flexible details storage

  -- Context
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_activity_owner ON staff_activity_logs(store_owner_uid);
CREATE INDEX IF NOT EXISTS idx_activity_staff ON staff_activity_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON staff_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_created ON staff_activity_logs(created_at DESC);

-- ============================================
-- 3. UPDATE SALES TABLE TO TRACK STAFF
-- ============================================
-- Add staff tracking to existing sales table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'recorded_by_staff_id'
  ) THEN
    ALTER TABLE sales ADD COLUMN recorded_by_staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_sales_staff ON sales(recorded_by_staff_id);
  END IF;
END $$;

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================
-- Disable RLS for now (using Firebase UID checks in application layer)
ALTER TABLE staff_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_activity_logs DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for staff_members
DROP TRIGGER IF EXISTS update_staff_members_updated_at ON staff_members;
CREATE TRIGGER update_staff_members_updated_at
  BEFORE UPDATE ON staff_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. SAMPLE DATA (FOR TESTING - REMOVE IN PRODUCTION)
-- ============================================
-- You can manually insert test staff after running this script
-- Example:
-- INSERT INTO staff_members (store_owner_uid, name, phone, pin, role)
-- VALUES ('YOUR_FIREBASE_UID', 'John Cashier', '08012345678', 'hashed_1234', 'cashier');

COMMENT ON TABLE staff_members IS 'Store staff members with PIN authentication';
COMMENT ON TABLE staff_activity_logs IS 'Audit trail of all staff actions';
COMMENT ON COLUMN staff_members.pin IS 'Hashed PIN code (use bcrypt in app)';
COMMENT ON COLUMN staff_members.role IS 'manager: can add products | cashier: sales only';
