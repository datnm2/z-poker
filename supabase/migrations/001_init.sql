-- Players (auto-created on first Google OAuth login)
create table players (
  id uuid primary key references auth.users(id),
  email text unique not null,
  name text not null,
  domain text generated always as (split_part(email, '@', 2)) stored,
  elo int not null default 1200,
  games_played int not null default 0,
  created_at timestamptz default now()
);

-- Sessions (one per lunch game)
create table sessions (
  id uuid primary key default gen_random_uuid(),
  played_date date not null default current_date,
  buy_in int not null default 1000,
  domain text not null,
  created_by uuid references players(id),
  is_locked boolean not null default false,
  locked_at timestamptz,
  created_at timestamptz default now(),
  unique(played_date, domain)
);

-- Junction: who played, how many chips left
create table session_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  player_id uuid references players(id),
  chips_end int,
  elo_before int not null,
  elo_after int,
  updated_at timestamptz default now(),
  unique(session_id, player_id)
);

-- Indexes
create index idx_sessions_domain_date on sessions(domain, played_date desc);
create index idx_session_players_session on session_players(session_id);
create index idx_players_domain_elo on players(domain, elo desc);

-- RLS
alter table players enable row level security;
alter table sessions enable row level security;
alter table session_players enable row level security;

-- Players: same domain only
create policy "players_read_same_domain" on players
  for select using (
    domain = split_part(auth.jwt()->>'email', '@', 2)
  );

create policy "players_insert_self" on players
  for insert with check (id = auth.uid());

create policy "players_update_self" on players
  for update using (id = auth.uid());

-- Sessions: same domain
create policy "sessions_read_same_domain" on sessions
  for select using (
    domain = split_part(auth.jwt()->>'email', '@', 2)
  );

create policy "sessions_insert_same_domain" on sessions
  for insert with check (
    domain = split_part(auth.jwt()->>'email', '@', 2)
  );

create policy "sessions_update_unlocked" on sessions
  for update using (
    domain = split_part(auth.jwt()->>'email', '@', 2)
    and not is_locked
  );

-- Session players: same domain via session
create policy "sp_read_same_domain" on session_players
  for select using (
    exists (
      select 1 from sessions s
      where s.id = session_id
        and s.domain = split_part(auth.jwt()->>'email', '@', 2)
    )
  );

create policy "sp_insert" on session_players
  for insert with check (
    exists (
      select 1 from sessions s
      where s.id = session_id
        and s.domain = split_part(auth.jwt()->>'email', '@', 2)
        and not s.is_locked
    )
  );

create policy "sp_update_own_chips" on session_players
  for update using (
    player_id = auth.uid()
    and exists (
      select 1 from sessions s
      where s.id = session_id and not s.is_locked
    )
  );

-- Allow anyone in same domain to update chips (admin mode)
create policy "sp_update_same_domain" on session_players
  for update using (
    exists (
      select 1 from sessions s
      where s.id = session_id
        and s.domain = split_part(auth.jwt()->>'email', '@', 2)
        and not s.is_locked
    )
  );

------------------------------------------------------------
-- Elo calculation function
------------------------------------------------------------
create or replace function calculate_session_elo(p_session_id uuid)
returns void as $$
declare
  v_buy_in int;
  v_total_chips bigint;
  v_expected_chips bigint;
  v_num_players int;
  rec_a record;
  rec_b record;
  v_score float;
  v_expected float;
  v_k constant int := 32;
  v_elo_changes jsonb := '{}';
begin
  select s.buy_in into v_buy_in from sessions s where s.id = p_session_id;

  select sum(sp.chips_end), count(*), count(*) * v_buy_in
    into v_total_chips, v_num_players, v_expected_chips
    from session_players sp where sp.session_id = p_session_id;

  if v_total_chips is null or v_total_chips != v_expected_chips then
    raise exception 'Chip total mismatch: % vs expected %', v_total_chips, v_expected_chips;
  end if;

  -- Init accumulator
  for rec_a in
    select sp.player_id, sp.chips_end, p.elo
    from session_players sp
    join players p on p.id = sp.player_id
    where sp.session_id = p_session_id
  loop
    v_elo_changes := v_elo_changes || jsonb_build_object(rec_a.player_id::text, 0);
  end loop;

  -- Pairwise comparison
  for rec_a in
    select sp.player_id, sp.chips_end, p.elo
    from session_players sp
    join players p on p.id = sp.player_id
    where sp.session_id = p_session_id
  loop
    for rec_b in
      select sp.player_id, sp.chips_end, p.elo
      from session_players sp
      join players p on p.id = sp.player_id
      where sp.session_id = p_session_id
        and sp.player_id > rec_a.player_id
    loop
      v_score := case
        when rec_a.chips_end > rec_b.chips_end then 1.0
        when rec_a.chips_end < rec_b.chips_end then 0.0
        else 0.5
      end;

      v_expected := 1.0 / (1.0 + power(10.0, (rec_b.elo - rec_a.elo)::float / 400.0));

      v_elo_changes := jsonb_set(v_elo_changes,
        array[rec_a.player_id::text],
        to_jsonb(round((v_elo_changes->>rec_a.player_id::text)::numeric + v_k * (v_score - v_expected))));

      v_elo_changes := jsonb_set(v_elo_changes,
        array[rec_b.player_id::text],
        to_jsonb(round((v_elo_changes->>rec_b.player_id::text)::numeric + v_k * ((1.0 - v_score) - (1.0 - v_expected)))));
    end loop;
  end loop;

  -- Apply elo changes
  for rec_a in
    select sp.player_id, p.elo
    from session_players sp
    join players p on p.id = sp.player_id
    where sp.session_id = p_session_id
  loop
    update session_players
      set elo_before = rec_a.elo,
          elo_after = rec_a.elo + (v_elo_changes->>rec_a.player_id::text)::int
    where session_id = p_session_id and player_id = rec_a.player_id;

    update players
      set elo = elo + (v_elo_changes->>rec_a.player_id::text)::int,
          games_played = games_played + 1
    where id = rec_a.player_id;
  end loop;

  -- Lock session
  update sessions
    set is_locked = true, locked_at = now()
  where id = p_session_id;
end;
$$ language plpgsql security definer;

------------------------------------------------------------
-- Auto-lock cron: 14:00 ICT (07:00 UTC) Mon-Fri
------------------------------------------------------------
-- Requires pg_cron extension enabled in Supabase dashboard
-- select cron.schedule(
--   'lock-sessions-daily',
--   '0 7 * * 1-5',
--   $$
--     select calculate_session_elo(id)
--     from sessions
--     where is_locked = false
--       and played_date = current_date
--       and (select count(*) filter (where sp.chips_end is not null)
--            from session_players sp where sp.session_id = sessions.id)
--         = (select count(*) from session_players sp where sp.session_id = sessions.id);
--   $$
-- );
