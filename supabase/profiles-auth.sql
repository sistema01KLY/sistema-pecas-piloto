-- Supabase auth + profiles setup for Sistema Peças Piloto
-- Run this in SQL editor of your Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text,
  admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update set
    email = excluded.email,
    nome = coalesce(excluded.nome, profiles.nome);

  return new;
end;
$$;

create or replace trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.handle_user_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    email = new.email,
    nome = coalesce(new.raw_user_meta_data->>'nome', profiles.nome),
    updated_at = now()
  where id = new.id;

  return new;
end;
$$;

create or replace trigger on_auth_user_updated
after update on auth.users
for each row execute procedure public.handle_user_profile_update();

create or replace function public.touch_profile_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute procedure public.touch_profile_updated_at();

alter table public.profiles enable row level security;

create policy "Usuário pode ver seu próprio perfil"
on public.profiles
for select
using (auth.uid() = id);

create policy "Usuário pode atualizar seu próprio perfil"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Admin pode ver todos os perfis"
on public.profiles
for select
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.admin = true
));

create policy "Admin pode atualizar perfis"
on public.profiles
for update
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.admin = true
));

create or replace view public.profiles_public as
select id, nome, email, admin
from public.profiles;

-- Optional: default admin users can be set manually
-- update public.profiles set admin = true where id = 'SEU_USER_ID';
