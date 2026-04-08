import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Player, SessionPlayer } from '../types/database';

interface SessionHistory extends SessionPlayer {
  session: { played_date: string; buy_in: number };
}

export default function ProfileScreen({ route }: any) {
  const { player: me } = useAuth();
  const playerId = route?.params?.playerId || me?.id;
  const [player, setPlayer] = useState<Player | null>(null);
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [rank, setRank] = useState(0);

  useEffect(() => {
    if (!playerId) return;

    supabase.from('players').select('*').eq('id', playerId).single()
      .then(({ data }) => setPlayer(data));

    supabase
      .from('session_players')
      .select('*, session:sessions(played_date, buy_in)')
      .eq('player_id', playerId)
      .not('elo_after', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setHistory((data as any) || []));
  }, [playerId]);

  useEffect(() => {
    if (!player) return;
    supabase
      .from('players')
      .select('id')
      .eq('domain', player.domain)
      .gte('elo', player.elo)
      .then(({ data }) => setRank(data?.length || 0));
  }, [player]);

  const wins = history.filter(h => h.chips_end! > h.session.buy_in).length;
  const winRate = history.length > 0 ? Math.round((wins / history.length) * 100) : 0;

  const screenWidth = Dimensions.get('window').width - 40;
  const eloPoints = history.slice().reverse().map(h => h.elo_after!);
  const minElo = Math.min(...eloPoints, 1100);
  const maxElo = Math.max(...eloPoints, 1300);
  const eloRange = maxElo - minElo || 1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{player?.name || '...'}</Text>
        <Text style={styles.email}>{player?.email}</Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{player?.elo || '-'}</Text>
          <Text style={styles.metricLabel}>Elo</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{winRate}%</Text>
          <Text style={styles.metricLabel}>Win Rate</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>#{rank}</Text>
          <Text style={styles.metricLabel}>Rank</Text>
        </View>
      </View>

      {eloPoints.length > 1 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Elo History</Text>
          <View style={[styles.chart, { width: screenWidth }]}>
            {eloPoints.map((elo, i) => {
              const x = (i / (eloPoints.length - 1)) * (screenWidth - 20);
              const y = 80 - ((elo - minElo) / eloRange) * 80;
              return (
                <View
                  key={i}
                  style={[styles.dot, { left: x + 6, top: y + 4 }]}
                />
              );
            })}
          </View>
          <View style={styles.chartLabels}>
            <Text style={styles.chartLabel}>{minElo}</Text>
            <Text style={styles.chartLabel}>{maxElo}</Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Recent Sessions</Text>
      <FlatList
        data={history}
        keyExtractor={(h) => h.id}
        renderItem={({ item }) => {
          const delta = (item.chips_end || 0) - item.session.buy_in;
          const eloDelta = (item.elo_after || 0) - item.elo_before;
          return (
            <View style={styles.row}>
              <Text style={styles.date}>{item.session.played_date}</Text>
              <View style={styles.rowRight}>
                <Text style={[styles.chipDelta, delta >= 0 ? styles.positive : styles.negative]}>
                  {delta >= 0 ? '+' : ''}{delta} chips
                </Text>
                <Text style={[styles.eloDelta, eloDelta >= 0 ? styles.positive : styles.negative]}>
                  {eloDelta >= 0 ? '+' : ''}{eloDelta} elo
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 20, paddingTop: 60, alignItems: 'center' },
  name: { fontSize: 28, fontWeight: '800', color: '#f1f5f9' },
  email: { fontSize: 14, color: '#64748b', marginTop: 4 },
  metricsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  metric: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 16, alignItems: 'center' },
  metricValue: { fontSize: 24, fontWeight: '700', color: '#f59e0b' },
  metricLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  chartContainer: { marginHorizontal: 20, marginBottom: 20 },
  chartTitle: { fontSize: 16, fontWeight: '700', color: '#f1f5f9', marginBottom: 8 },
  chart: { height: 92, backgroundColor: '#1e293b', borderRadius: 12, position: 'relative' },
  dot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  chartLabel: { fontSize: 11, color: '#64748b' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9', paddingHorizontal: 20, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  date: { fontSize: 14, color: '#94a3b8' },
  rowRight: { alignItems: 'flex-end' },
  chipDelta: { fontSize: 14, fontWeight: '600' },
  eloDelta: { fontSize: 12, marginTop: 2 },
  positive: { color: '#22c55e' },
  negative: { color: '#ef4444' },
});
