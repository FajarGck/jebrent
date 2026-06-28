-- Enable RLS updates for renters on their own unpaid or rejected payments
CREATE POLICY "Payments: renter can update own unpaid or rejected"
  ON payments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = payments.booking_id AND bookings.renter_id = auth.uid()
    )
    AND status IN ('unpaid', 'rejected')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = payments.booking_id AND bookings.renter_id = auth.uid()
    )
    AND status = 'pending_confirmation'
  );
