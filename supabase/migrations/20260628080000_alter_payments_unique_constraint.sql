-- =============================================
-- Migration: Alter Payments Unique Constraint, System Settings, & User Deletion Function
-- =============================================

-- 1. Alter Payments Unique Constraint
-- Drop old unique constraint on booking_id
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_booking_id_key;

-- Add new unique constraint on (booking_id, payment_type)
ALTER TABLE payments ADD CONSTRAINT payments_booking_id_type_key UNIQUE (booking_id, payment_type);

-- 2. Create System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default auto_delivery_hour
INSERT INTO system_settings (key, value)
VALUES ('auto_delivery_hour', '7')
ON CONFLICT (key) DO NOTHING;

-- 3. Create User Deletion Function (Admin Bypass)
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(p_user_id uuid)
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
