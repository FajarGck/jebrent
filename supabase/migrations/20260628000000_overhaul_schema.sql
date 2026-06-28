-- Remove unnecessary tables
DROP TABLE IF EXISTS booking_addons CASCADE;
DROP TABLE IF EXISTS addons CASCADE;

-- Make driver_id nullable in delivery_schedules since driver role is deleted/optional
ALTER TABLE delivery_schedules ALTER COLUMN driver_id DROP NOT NULL;

-- Add payment_type to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) DEFAULT 'dp';

-- Add delivery coordinates and usage radius to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_latitude DECIMAL(10, 8);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_longitude DECIMAL(11, 8);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS usage_radius INTEGER DEFAULT 10;
