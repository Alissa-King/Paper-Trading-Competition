-- Drop existing policies before recreating (safe to re-run)
drop policy if exists "Users are publicly viewable" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;

drop policy if exists "Portfolios are publicly viewable" on public.portfolios;
drop policy if exists "Users can update own portfolio" on public.portfolios;
drop policy if exists "Users can insert own portfolio" on public.portfolios;

drop policy if exists "Trades are publicly viewable" on public.trades;
drop policy if exists "Users can insert own trades" on public.trades;
drop policy if exists "Users can update own trades" on public.trades;

drop policy if exists "Price history publicly viewable" on public.price_history;
drop policy if exists "Service role can insert price history" on public.price_history;

-- Recreate all policies
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

-- Recreate the trigger (also safe to re-run)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.portfolios (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
