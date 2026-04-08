import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useTodaySession } from '../hooks/useSession';
import { supabase } from '../lib/supabase';
import { Player } from '../types/database';

export default function HomeScreen({ navigation }: any) {
  const { player } = useAuth();
  const domain = player?.domain || '';
  const { session: todaySession } = useTodaySession(domain);
  const [players, setPlayers] = useState<Player[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    if (!domain) return;
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('domain', domain)
      .order('elo', { ascending: false });
    setPlayers(data || []);
  }, [domain]);

  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };

  async function createSession() {
    if (!player) return;
    const { data } = await supabase
      .from('sessions')
      .insert({ domain, created_by: player.id })
      .select()
      .single();
    if (data) navigation.navigate('SessionDetail', { sessionId: data.id });
  }

  function goToSession() {
    if (todaySession) navigation.navigate('SessionDetail', { sessionId: todaySession.id });
    else createSession();
  }

  const topPlayer = players[0];
  const totalGames = players.reduce((sum, p) => sum + p.games_played, 0) / Math.max(players.length, 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <TouchableOpacity style={styles.sessionBtn} onPress={goToSession}>
          <Text style={styles.sessionBtnText}>{todaySession ? "Today's Game" : '+ New Session'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{players.length}</Text>
          <Text style={styles.statLabel}>Players</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{Math.round(totalGames)}</Text>
          <Text style={styles.statLabel}>Avg Games</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{topPlayer?.elo || '-'}</Text>
          <Text style={styles.statLabel}>Top Elo</Text>
        </View>
      </View>

      <FlatList
        data={players}
        keyExtractor={(p) => p.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[styles.row, index === 0 && styles.topRow]}
            onPress={() => navigation.navigate('Profile', { playerId: item.id })}
          >
            <Text style={[styles.rank, index === 0 && styles.topText]}>#{index + 1}</Text>
            <View style={styles.rowInfo}>
              <Text style={[styles.name, index === 0 && styles.topText]}>{item.name}</Text>
              <Text style={styles.games}>{item.games_played} games</Text>
            </View>
            <Text style={[styles.elo, index === 0 && styles.topText]}>{item.elo}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#f1f5f9' },
  sessionBtn: { backgroundColor: '#f59e0b', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  sessionBtnText: { fontWeight: '700', color: '#0f172a', fontSize: 14 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: '#f1f5f9' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  topRow: { backgroundColor: '#1e293b' },
  rank: { fontSize: 16, fontWeight: '700', color: '#64748b', width: 40 },
  topText: { color: '#f59e0b' },
  rowInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#f1f5f9' },
  games: { fontSize: 12, color: '#64748b', marginTop: 2 },
  elo: { fontSize: 20, fontWeight: '700', color: '#f1f5f9' },
});
