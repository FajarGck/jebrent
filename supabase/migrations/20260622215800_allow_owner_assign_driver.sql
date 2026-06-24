-- =============================================
-- RLS Fix: Allow owner to assign driver
-- Owner bisa insert delivery_schedules untuk booking kendaraan miliknya
-- =============================================

CREATE POLICY "Delivery: owner can create for own vehicles"
  ON delivery_schedules FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'owner'
    AND EXISTS (
      SELECT 1 FROM bookings
      JOIN vehicles ON vehicles.id = bookings.vehicle_id
      WHERE bookings.id = delivery_schedules.booking_id
      AND vehicles.owner_id = auth.uid()
    )
  );
