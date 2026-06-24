-- =============================================
-- Storage Bucket: payment-proofs
-- Dev B — Bucket untuk bukti pembayaran
-- =============================================

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do nothing;

-- Semua orang bisa lihat bukti bayar (owner/admin perlu review)
create policy "Payment proofs are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'payment-proofs' );

-- User yang login bisa upload bukti bayar
create policy "Authenticated users can upload payment proof"
  on storage.objects for insert
  with check (
    bucket_id = 'payment-proofs'
    and auth.role() = 'authenticated'
  );

-- User bisa update file miliknya sendiri
create policy "Users can update their own payment proof"
  on storage.objects for update
  using (
    bucket_id = 'payment-proofs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- User bisa hapus file miliknya sendiri
create policy "Users can delete their own payment proof"
  on storage.objects for delete
  using (
    bucket_id = 'payment-proofs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
