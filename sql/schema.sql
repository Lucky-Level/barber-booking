-- Barber Booking App - Supabase Schema
-- Execute este SQL no SQL Editor do Supabase (owkvgdjcobmuacnztzee)

-- Tabela de servicos
create table services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_minutes int not null,
  interval_minutes int not null default 10,
  price_note text
);

-- Seed dos servicos
insert into services (name, duration_minutes, interval_minutes, price_note) values
  ('Corte', 30, 10, 'Cash ou IBAN'),
  ('Corte + Barba', 60, 10, 'Cash ou IBAN');

-- Blocos de disponibilidade (admin define por dia)
create table availability (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now()
);

-- Agendamentos
create table appointments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references services(id),
  date date not null,
  start_time time not null,
  end_time time not null,
  client_name text not null,
  client_phone text not null,
  status text default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz default now()
);

-- Config admin (senha)
create table admin_config (
  id int primary key default 1 check (id = 1),
  password_hash text not null
);

-- Senha padrao: "admin123" (TROQUE DEPOIS via painel!)
insert into admin_config (password_hash) values
  ('240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9');

-- RLS
alter table services enable row level security;
alter table availability enable row level security;
alter table appointments enable row level security;
alter table admin_config enable row level security;

-- Policies
create policy "services_public_read" on services for select using (true);
create policy "availability_public_read" on availability for select using (true);
create policy "appointments_public_read" on appointments for select using (true);
create policy "appointments_public_insert" on appointments for insert with check (true);
create policy "admin_config_deny_all" on admin_config for select using (false);

-- Funcao: verificar senha admin
create or replace function verify_admin_password(pwd text)
returns boolean
language plpgsql security definer
as $$
declare
  stored_hash text;
begin
  select password_hash into stored_hash from admin_config where id = 1;
  return stored_hash = encode(sha256(pwd::bytea), 'hex');
end;
$$;

-- Funcao: gerenciar disponibilidade (admin)
create or replace function admin_manage_availability(
  pwd text,
  action text,
  av_id uuid default null,
  av_date date default null,
  av_start time default null,
  av_end time default null
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
      insert into availability (date, start_time, end_time)
      values (av_date, av_start, av_end)
      returning json_build_object('id', id, 'date', date, 'start_time', start_time, 'end_time', end_time) into result;
    when 'delete' then
      delete from availability where id = av_id;
      result := json_build_object('deleted', av_id);
    else
      result := json_build_object('error', 'Acao invalida');
  end case;

  return result;
end;
$$;

-- Funcao: cancelar agendamento (admin)
create or replace function admin_cancel_appointment(pwd text, apt_id uuid)
returns json
language plpgsql security definer
as $$
begin
  if not verify_admin_password(pwd) then
    return json_build_object('error', 'Senha incorreta');
  end if;

  update appointments set status = 'cancelled' where id = apt_id;
  return json_build_object('cancelled', apt_id);
end;
$$;

-- Funcao: alterar senha (admin)
create or replace function admin_change_password(old_pwd text, new_pwd text)
returns json
language plpgsql security definer
as $$
begin
  if not verify_admin_password(old_pwd) then
    return json_build_object('error', 'Senha atual incorreta');
  end if;

  update admin_config set password_hash = encode(sha256(new_pwd::bytea), 'hex') where id = 1;
  return json_build_object('success', true);
end;
$$;
