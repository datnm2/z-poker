-- Profile page queries session_players by player_id (was missing index)
create index if not exists idx_session_players_player on session_players(player_id);
