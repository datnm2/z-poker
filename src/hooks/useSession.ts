import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, SessionPlayer, Player } from '../types/database';

export interface SessionPlayerWithName extends SessionPlayer {
  player: Pick<Player, 'name' | 'email' | 'elo'>;
}

export function useSessionDetail(sessionId: string) {
  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<SessionPlayerWithName[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: s }, { data: sp }] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', sessionId).single(),
      supabase
        .from('session_players')
        .select('*, player:players(name, email, elo)')
        .eq('session_id', sessionId)
        .order('chips_end', { ascending: false, nullsFirst: false }),
    ]);
    setSession(s);
    setPlayers((sp as any) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_players', filter: `session_id=eq.${sessionId}` }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  return { session, players, loading, reload: load };
}

export function useTodaySession(domain: string) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!domain) return;
    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('sessions')
      .select('*')
      .eq('domain', domain)
      .eq('played_date', today)
      .single()
      .then(({ data }) => {
        setSession(data);
        setLoading(false);
      });
  }, [domain]);

  return { session, loading };
}
