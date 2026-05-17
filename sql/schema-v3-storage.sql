-- Criar bucket publico para imagens de produtos
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true);

-- Policy: qualquer um pode ver (bucket publico)
create policy "product_images_public_read"
on storage.objects for select
using (bucket_id = 'product-images');

-- Policy: upload com service_role (admin via JS com service key)
-- Na pratica, vamos usar anon key com policy permissiva pra insert
create policy "product_images_upload"
on storage.objects for insert
with check (bucket_id = 'product-images');

-- Policy: delete
create policy "product_images_delete"
on storage.objects for delete
using (bucket_id = 'product-images');
