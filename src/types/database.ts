export interface Player {
  id: string;
  email: string;
  name: string;
  domain: string;
  elo: number;
  games_played: number;
  created_at: string;
}

export interface Session {
  id: string;
  played_date: string;
  buy_in: number;
  domain: string;
  created_by: string;
  is_locked: boolean;
  locked_at: string | null;
  created_at: string;
}

export interface SessionPlayer {
  id: string;
  session_id: string;
  player_id: string;
  chips_end: number | null;
  elo_before: number;
  elo_after: number | null;
  updated_at: string;
}
