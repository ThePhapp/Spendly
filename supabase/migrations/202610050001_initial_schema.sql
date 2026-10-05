create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists users_email_idx on public.users (lower(email));

create table if not exists public.accounts (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  type text not null check (type in ('cash', 'bank', 'wallet', 'credit', 'investment', 'saving')),
  initial_balance numeric(18, 2) not null default 0,
  currency varchar(3) not null default 'VND',
  color varchar(9) not null default '#2563eb',
  icon text not null default 'wallet',
  note text not null default '',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id)
);

create index if not exists accounts_user_status_idx on public.accounts (user_id, status);

create table if not exists public.categories (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users(id) on delete cascade,
  parent_id text,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null check (kind in ('income', 'expense')),
  icon text not null default 'tag',
  color varchar(9) not null default '#64748b',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  constraint categories_parent_owner_fk foreign key (parent_id, user_id) references public.categories(id, user_id) on delete set null (parent_id),
  unique (user_id, kind, name)
);

create index if not exists categories_user_kind_idx on public.categories (user_id, kind);

create table if not exists public.transactions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users(id) on delete cascade,
  account_id text not null,
  category_id text,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount numeric(18, 2) not null check (amount > 0),
  description text not null check (char_length(description) between 2 and 160),
  note text not null default '',
  transaction_date timestamptz not null,
  status text not null default 'completed' check (status in ('completed', 'pending')),
  transfer_id text,
  transfer_direction text check (transfer_direction in ('out', 'in')),
  is_recurring boolean not null default false,
  receipt_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  constraint transactions_account_owner_fk foreign key (account_id, user_id) references public.accounts(id, user_id),
  constraint transactions_category_owner_fk foreign key (category_id, user_id) references public.categories(id, user_id) on delete set null (category_id)
);

create index if not exists transactions_user_date_idx on public.transactions (user_id, transaction_date desc);
create index if not exists transactions_user_type_idx on public.transactions (user_id, type);
create index if not exists transactions_transfer_idx on public.transactions (transfer_id) where transfer_id is not null;

create table if not exists public.budgets (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users(id) on delete cascade,
  category_id text,
  name text not null check (char_length(name) between 1 and 80),
  amount numeric(18, 2) not null check (amount > 0),
  period char(7) not null check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  alert_threshold smallint not null default 70 check (alert_threshold between 1 and 100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint budgets_category_owner_fk foreign key (category_id, user_id) references public.categories(id, user_id) on delete set null (category_id),
  unique (user_id, category_id, period)
);

create index if not exists budgets_user_period_idx on public.budgets (user_id, period);

create table if not exists public.saving_goals (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  target_amount numeric(18, 2) not null check (target_amount > 0),
  deadline date not null,
  icon text not null default 'target',
  color varchar(9) not null default '#8b5cf6',
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id)
);

create index if not exists saving_goals_user_idx on public.saving_goals (user_id);

create table if not exists public.goal_transactions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users(id) on delete cascade,
  goal_id text not null,
  amount numeric(18, 2) not null check (amount <> 0),
  note text not null default '',
  transaction_date date not null default current_date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint goal_transactions_owner_fk foreign key (goal_id, user_id) references public.saving_goals(id, user_id) on delete cascade
);

create index if not exists goal_transactions_goal_date_idx on public.goal_transactions (goal_id, transaction_date desc);

create table if not exists public.recurring_transactions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users(id) on delete cascade,
  account_id text not null,
  category_id text,
  type text not null check (type in ('income', 'expense')),
  amount numeric(18, 2) not null check (amount > 0),
  description text not null check (char_length(description) between 2 and 160),
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly', 'custom')),
  interval_count integer not null default 1 check (interval_count > 0),
  next_run_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint recurring_account_owner_fk foreign key (account_id, user_id) references public.accounts(id, user_id),
  constraint recurring_category_owner_fk foreign key (category_id, user_id) references public.categories(id, user_id) on delete set null (category_id)
);

create index if not exists recurring_user_next_idx on public.recurring_transactions (user_id, next_run_at) where active;

create table if not exists public.tags (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  color varchar(9) not null default '#64748b',
  created_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  unique (user_id, name)
);

create table if not exists public.transaction_tags (
  user_id uuid not null references public.users(id) on delete cascade,
  transaction_id text not null,
  tag_id text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (transaction_id, tag_id),
  constraint transaction_tags_transaction_owner_fk foreign key (transaction_id, user_id) references public.transactions(id, user_id) on delete cascade,
  constraint transaction_tags_owner_fk foreign key (tag_id, user_id) references public.tags(id, user_id) on delete cascade
);

create table if not exists public.notifications (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notifications_user_read_idx on public.notifications (user_id, read, created_at desc);

create table if not exists public.user_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  currency varchar(3) not null default 'VND',
  language varchar(5) not null default 'vi',
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  first_day_of_week smallint not null default 1 check (first_day_of_week between 0 and 6),
  date_format text not null default 'dd/MM/yyyy',
  monthly_starting_day smallint not null default 1 check (monthly_starting_day between 1 and 28),
  budget_alert_percentage smallint not null default 70 check (budget_alert_percentage between 1 and 100),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'Người dùng'), '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    avatar_url = excluded.avatar_url,
    updated_at = timezone('utc', now());

  insert into public.user_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute procedure public.handle_new_user();

do $$
declare
  table_name text;
begin
  foreach table_name in array array['users','accounts','categories','transactions','budgets','saving_goals','goal_transactions','recurring_transactions','tags','transaction_tags','notifications','user_settings']
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users for select using ((select auth.uid()) = id);
drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own" on public.users for insert with check ((select auth.uid()) = id);
drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['accounts','categories','transactions','budgets','saving_goals','goal_transactions','recurring_transactions','tags','transaction_tags','notifications','user_settings']
  loop
    execute format('drop policy if exists "owner_all" on public.%I', table_name);
    execute format('create policy "owner_all" on public.%I for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name);
  end loop;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['users','accounts','categories','transactions','budgets','saving_goals','goal_transactions','recurring_transactions']
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at before update on public.user_settings for each row execute procedure public.set_updated_at();
