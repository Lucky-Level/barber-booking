-- Barber Booking v2 - Products & Orders + Client Cancellation
-- Execute no SQL Editor do Supabase (owkvgdjcobmuacnztzee)

-- Tabela de produtos (perfumes, etc)
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price decimal(10,2) not null,
  image_url text,
  active boolean default true,
  created_at timestamptz default now()
);

-- Encomendas de produtos
create table orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  client_name text not null,
  client_phone text not null,
  status text default 'pending' check (status in ('pending', 'paid', 'delivered', 'cancelled')),
  notes text,
  created_at timestamptz default now()
);

-- Adicionar campo de cancelamento ao appointments
alter table appointments add column cancelled_by_client boolean default false;

-- RLS
alter table products enable row level security;
alter table orders enable row level security;

-- Products: public read
create policy "products_public_read" on products for select using (true);

-- Orders: public insert + read own (by phone)
create policy "orders_public_insert" on orders for insert with check (true);
create policy "orders_public_read" on orders for select using (true);

-- Funcao: admin gerenciar produtos
create or replace function admin_manage_product(
  pwd text,
  action text,
  p_id uuid default null,
  p_name text default null,
  p_description text default null,
  p_price decimal default null,
  p_image_url text default null,
  p_active boolean default true
)
returns json
language plpgsql security definer
as $$
declare
  result json;
begin
  if not verify_admin_password(pwd) then
    return json_build_object('error', 'Senha incorreta');
  end if;

  case action
    when 'insert' then
      insert into products (name, description, price, image_url, active)
      values (p_name, p_description, p_price, p_image_url, p_active)
      returning json_build_object('id', id, 'name', name) into result;
    when 'update' then
      update products set
        name = coalesce(p_name, name),
        description = coalesce(p_description, description),
        price = coalesce(p_price, price),
        image_url = coalesce(p_image_url, image_url),
        active = coalesce(p_active, active)
      where id = p_id;
      result := json_build_object('updated', p_id);
    when 'delete' then
      delete from products where id = p_id;
      result := json_build_object('deleted', p_id);
    else
      result := json_build_object('error', 'Acao invalida');
  end case;

  return result;
end;
$$;

-- Funcao: admin gerenciar orders
create or replace function admin_manage_order(
  pwd text,
  action text,
  o_id uuid,
  o_status text default null
)
returns json
language plpgsql security definer
as $$
begin
  if not verify_admin_password(pwd) then
    return json_build_object('error', 'Senha incorreta');
  end if;

  case action
    when 'update_status' then
      update orders set status = o_status where id = o_id;
    when 'delete' then
      delete from orders where id = o_id;
    else
      return json_build_object('error', 'Acao invalida');
  end case;

  return json_build_object('success', true);
end;
$$;

-- Funcao: cliente cancelar agendamento (max 1 vez por telefone)
create or replace function client_cancel_appointment(apt_id uuid, phone text)
returns json
language plpgsql security definer
as $$
declare
  cancel_count int;
  apt_record record;
begin
  -- Verificar se o agendamento existe e pertence ao cliente
  select * into apt_record from appointments
    where id = apt_id and client_phone = phone and status = 'confirmed';

  if apt_record is null then
    return json_build_object('error', 'Agendamento nao encontrado ou ja cancelado');
  end if;

  -- Contar cancelamentos anteriores deste telefone
  select count(*) into cancel_count from appointments
    where client_phone = phone and cancelled_by_client = true;

  if cancel_count >= 1 then
    return json_build_object('error', 'Limite de cancelamento atingido. Voce so pode cancelar 1 vez.');
  end if;

  -- Cancelar
  update appointments set status = 'cancelled', cancelled_by_client = true
    where id = apt_id;

  return json_build_object('success', true, 'message', 'Agendamento cancelado com sucesso');
end;
$$;
