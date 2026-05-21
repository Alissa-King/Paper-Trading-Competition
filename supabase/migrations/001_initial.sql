-- Players (extends Supabase auth.users)
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Virtual portfolio per user (starts with $100k)
create table if not exists public.portfolios (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade unique not null,
  balance numeric(18, 2) default 100000.00 not null,
  starting_balance numeric(18, 2) default 100000.00 not null,
  updated_at timestamptz default now()
);

-- Every trade placed
create table if not exists public.trades (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  asset text not null,
  asset_type text not null default 'stock', -- 'stock' | 'crypto'
  direction text not null,                   -- 'long' | 'short'
  quantity numeric(18, 8) not null,
  entry_price numeric(18, 8) not null,
  exit_price numeric(18, 8),
  pnl numeric(18, 2) default 0,
  status text default 'open' not null,       -- 'open' | 'closed'
  is_bot_trade boolean default false,
  created_at timestamptz default now(),
  closed_at timestamptz
);

-- Price history cache (populated by API, used for charts + bot MA)
create table if not exists public.price_history (
  id bigserial primary key,
  asset text not null,
  price numeric(18, 8) not null,
  recorded_at timestamptz default now()
);

create index if not exists price_history_asset_time on public.price_history(asset, recorded_at desc);

-- Leaderboard view (auto-calculates % return)
create or replace view public.leaderboard as
  select
    u.id as user_id,
    u.username,
    u.avatar_url,
    p.balance,
    p.starting_balance,
    round(((p.balance - p.starting_balance) / p.starting_balance) * 100, 2) as pct_return,
    count(t.id) filter (where t.status = 'closed') as closed_trades,
    count(t.id) filter (where t.status = 'open') as open_trades,
    coalesce(sum(t.pnl), 0) as total_pnl
  from public.users u
  join public.portfolios p on p.user_id = u.id
  left join public.trades t on t.user_id = u.id
  group by u.id, u.username, u.avatar_url, p.balance, p.starting_balance
  order by pct_return desc;

-- Row Level Security
alter table public.users enable row level security;
alter table public.portfolios enable row level security;
alter table public.trades enable row level security;
alter table public.price_history enable row level security;

-- Policies: users can read all public data, only write their own
create policy "Users are publicly viewable" on public.users for select using (true);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

create policy "Portfolios are publicly viewable" on public.portfolios for select using (true);
create policy "Users can update own portfolio" on public.portfolios for update using (auth.uid() = user_id);
create policy "Users can insert own portfolio" on public.portfolios for insert with check (auth.uid() = user_id);

create policy "Trades are publicly viewable" on public.trades for select using (true);
create policy "Users can insert own trades" on public.trades for insert with check (auth.uid() = user_id);
create policy "Users can update own trades" on public.trades for update using (auth.uid() = user_id);

create policy "Price history publicly viewable" on public.price_history for select using (true);
create policy "Service role can insert price history" on public.price_history for insert with check (true);

-- Auto-create portfolio when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  insert into public.portfolios (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
