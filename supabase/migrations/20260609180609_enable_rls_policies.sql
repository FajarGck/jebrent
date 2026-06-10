-- =====================
-- ROW LEVEL SECURITY
-- =====================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_schedules ENABLE ROW LEVEL SECURITY;

-- Helper function (in public schema, NOT auth)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- PROFILES ----
CREATE POLICY "Profiles: viewable by authenticated"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Profiles: update own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles: admin update any"
  ON profiles FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin');

-- ---- VEHICLES ----
CREATE POLICY "Vehicles: viewable by everyone"
  ON vehicles FOR SELECT USING (true);

CREATE POLICY "Vehicles: owner can insert"
  ON vehicles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id AND public.get_user_role() IN ('owner', 'admin'));

CREATE POLICY "Vehicles: owner/admin can update"
  ON vehicles FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.get_user_role() = 'admin');

CREATE POLICY "Vehicles: owner/admin can delete"
  ON vehicles FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.get_user_role() = 'admin');

-- ---- VEHICLE IMAGES ----
CREATE POLICY "Vehicle images: viewable by everyone"
  ON vehicle_images FOR SELECT USING (true);

CREATE POLICY "Vehicle images: owner can manage"
  ON vehicle_images FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = vehicle_images.vehicle_id
      AND (vehicles.owner_id = auth.uid() OR public.get_user_role() = 'admin')
    )
  );

-- ---- ADDONS ----
CREATE POLICY "Addons: viewable by everyone"
  ON addons FOR SELECT USING (true);

CREATE POLICY "Addons: admin can manage"
  ON addons FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin');

-- ---- BOOKINGS ----
CREATE POLICY "Bookings: viewable by related users"
  ON bookings FOR SELECT TO authenticated
  USING (
    auth.uid() = renter_id
    OR public.get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = bookings.vehicle_id AND vehicles.owner_id = auth.uid()
    )
  );

CREATE POLICY "Bookings: renter can create"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = renter_id);

CREATE POLICY "Bookings: authorized can update"
  ON bookings FOR UPDATE TO authenticated
  USING (
    auth.uid() = renter_id
    OR public.get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = bookings.vehicle_id AND vehicles.owner_id = auth.uid()
    )
  );

-- ---- PAYMENTS ----
CREATE POLICY "Payments: viewable by related users"
  ON payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id
      AND (bookings.renter_id = auth.uid() OR public.get_user_role() = 'admin'
        OR EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = bookings.vehicle_id AND vehicles.owner_id = auth.uid()))
    )
  );

CREATE POLICY "Payments: renter can insert"
  ON payments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.renter_id = auth.uid()
    )
  );

CREATE POLICY "Payments: admin/owner can update"
  ON payments FOR UPDATE TO authenticated
  USING (
    public.get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM bookings JOIN vehicles ON vehicles.id = bookings.vehicle_id
      WHERE bookings.id = payments.booking_id AND vehicles.owner_id = auth.uid()
    )
  );

-- ---- BOOKING ADDONS ----
CREATE POLICY "Booking addons: viewable by related"
  ON booking_addons FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings WHERE bookings.id = booking_addons.booking_id
      AND (bookings.renter_id = auth.uid() OR public.get_user_role() = 'admin')
    )
  );

CREATE POLICY "Booking addons: renter can insert"
  ON booking_addons FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings WHERE bookings.id = booking_addons.booking_id AND bookings.renter_id = auth.uid()
    )
  );

-- ---- REVIEWS ----
CREATE POLICY "Reviews: viewable by everyone"
  ON reviews FOR SELECT USING (true);

CREATE POLICY "Reviews: renter can insert after completed"
  ON reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM bookings WHERE bookings.id = reviews.booking_id
      AND bookings.renter_id = auth.uid() AND bookings.status = 'completed'
    )
  );

CREATE POLICY "Reviews: reviewer can update own"
  ON reviews FOR UPDATE TO authenticated USING (auth.uid() = reviewer_id);

CREATE POLICY "Reviews: reviewer can delete own"
  ON reviews FOR DELETE TO authenticated USING (auth.uid() = reviewer_id);

-- ---- DELIVERY SCHEDULES ----
CREATE POLICY "Delivery: viewable by related"
  ON delivery_schedules FOR SELECT TO authenticated
  USING (
    auth.uid() = driver_id
    OR public.get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM bookings WHERE bookings.id = delivery_schedules.booking_id AND bookings.renter_id = auth.uid()
    )
  );

CREATE POLICY "Delivery: admin can create"
  ON delivery_schedules FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "Delivery: admin/driver can update"
  ON delivery_schedules FOR UPDATE TO authenticated
  USING (auth.uid() = driver_id OR public.get_user_role() = 'admin');
