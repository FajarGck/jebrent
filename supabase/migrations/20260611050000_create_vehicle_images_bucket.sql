insert into storage.buckets (id, name, public) 
values ('vehicle-images', 'vehicle-images', true) 
on conflict (id) do nothing;

create policy "Images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'vehicle-images' );

create policy "Anyone can upload an image"
  on storage.objects for insert
  with check ( bucket_id = 'vehicle-images' );

create policy "Anyone can update their own image"
  on storage.objects for update
  using ( bucket_id = 'vehicle-images' );

create policy "Anyone can delete their own image"
  on storage.objects for delete
  using ( bucket_id = 'vehicle-images' );
