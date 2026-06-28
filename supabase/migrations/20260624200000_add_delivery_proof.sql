-- =============================================
-- Add delivery proof + bucket
-- =============================================

ALTER TABLE delivery_schedules ADD COLUMN IF NOT EXISTS proof_image_url TEXT;

-- Storage bucket: delivery-proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-proofs', 'delivery-proofs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Delivery proofs are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'delivery-proofs');

CREATE POLICY "Authenticated users can upload delivery proof"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'delivery-proofs'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own delivery proof"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'delivery-proofs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own delivery proof"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'delivery-proofs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
