alter table public.profiles enable row level security;
alter table public.booking enable row level security;
alter table public.pesanan_produk enable row level security;
alter table public.testimoni enable row level security;

create bucket if not exists avatars public;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists booking_select_own on public.booking;
drop policy if exists pesanan_produk_select_own on public.pesanan_produk;
drop policy if exists testimoni_select_approved on public.testimoni;
drop policy if exists testimoni_select_own on public.testimoni;
drop policy if exists testimoni_insert_own on public.testimoni;
drop policy if exists avatars_select_public on storage.objects;
drop policy if exists avatars_insert_own on storage.objects;
drop policy if exists avatars_update_own on storage.objects;

create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy booking_select_own on public.booking for select using (auth.uid() = pelanggan_id);
create policy pesanan_produk_select_own on public.pesanan_produk for select using (auth.uid() = pelanggan_id);

create policy testimoni_select_approved on public.testimoni for select using (is_approved = true);
create policy testimoni_select_own on public.testimoni for select using (auth.uid() = pelanggan_id);
create policy testimoni_insert_own on public.testimoni for insert with check (auth.uid() = pelanggan_id);

create policy avatars_select_public on storage.objects for select using (bucket_id = 'avatars');
create policy avatars_insert_own on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy avatars_update_own on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);