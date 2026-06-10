CREATE TYPE user_role AS ENUM ('renter', 'owner', 'admin', 'driver');
CREATE TYPE vehicle_status AS ENUM ('available', 'rented', 'maintenance', 'inactive');
CREATE TYPE vehicle_type AS ENUM ('sedan', 'suv', 'mpv', 'hatchback', 'pickup', 'van');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'paid', 'in_delivery', 'active', 'returning', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('unpaid', 'pending_confirmation', 'confirmed', 'refunded');
CREATE TYPE payment_method AS ENUM ('bank_transfer', 'ewallet', 'cash');
CREATE TYPE delivery_status AS ENUM ('assigned', 'on_the_way', 'delivered', 'completed');
CREATE TYPE rental_duration AS ENUM ('half_day', 'daily', 'weekly');