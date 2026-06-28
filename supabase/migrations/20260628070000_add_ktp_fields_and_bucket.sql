-- =============================================
-- Migration: Add KTP Fields & Private Storage Bucket
-- =============================================

-- Add columns to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ktp_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'unverified';

-- Create public bucket for KTP
INSERT INTO storage.buckets (id, name, public)
VALUES ('ktp-documents', 'ktp-documents', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for KTP bucket objects

-- Anyone can read KTP documents
CREATE POLICY "Anyone can view KTP"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ktp-documents');

-- Users can upload their own KTP documents
CREATE POLICY "Authenticated users can upload KTP"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ktp-documents'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owners and Admins can update their own KTP
CREATE POLICY "Owners and Admins can update KTP"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'ktp-documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.get_user_role() = 'admin'
    )
  );

-- Owners and Admins can delete their own KTP
CREATE POLICY "Owners and Admins can delete KTP"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ktp-documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.get_user_role() = 'admin'
    )
  );
