-- Replace pairwise Elo with group-average comparison + chip-weighted actual score.
-- Each player gets a single Elo update per session, bounded to ±K points.
-- K raised from 32 to 64 to match the movement velocity of the old pairwise system.

create or replace function calculate_session_elo(p_session_id uuid)
returns void as $$
declare
  v_buy_in int;
  v_total_chips bigint;
  v_expected_chips bigint;
  v_num_players int;
  v_avg_elo float;
  v_k constant int := 64;
  rec record;
  v_expected float;
  v_actual float;
  v_change int;
begin
  select buy_in into v_buy_in from sessions where id = p_session_id;

  select sum(sp.chips_end), count(*), count(*) * v_buy_in, avg(p.elo)
    into v_total_chips, v_num_players, v_expected_chips, v_avg_elo
    from session_players sp
    join players p on p.id = sp.player_id
    where sp.session_id = p_session_id;

  if v_total_chips is null or v_total_chips != v_expected_chips then
    raise exception 'Chip total mismatch: % vs expected %', v_total_chips, v_expected_chips;
  end if;

  if v_num_players < 2 then
    raise exception 'Need at least 2 players';
  end if;

  for rec in
    select sp.player_id, sp.chips_end, p.elo
      from session_players sp
      join players p on p.id = sp.player_id
      where sp.session_id = p_session_id
  loop
    v_expected := 1.0 / (1.0 + power(10.0, (v_avg_elo - rec.elo) / 400.0));
    v_actual   := 0.5 + 0.5 * (rec.chips_end - v_buy_in)::float
                         / (v_buy_in * (v_num_players - 1))::float;
    v_change   := round(v_k * (v_actual - v_expected));

    update session_players
      set elo_before = rec.elo,
          elo_after  = rec.elo + v_change
      where session_id = p_session_id and player_id = rec.player_id;

    update players
      set elo = elo + v_change,
          games_played = games_played + 1
      where id = rec.player_id;
  end loop;

  update sessions
    set is_locked = true, locked_at = now()
    where id = p_session_id;
end;
$$ language plpgsql security definer;
