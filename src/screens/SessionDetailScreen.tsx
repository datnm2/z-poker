import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useSessionDetail } from '../hooks/useSession';
import { supabase } from '../lib/supabase';
import { Player } from '../types/database';

export default function SessionDetailScreen({ route }: any) {
  const { sessionId } = route.params;
  const { player: me } = useAuth();
  const { session, players, loading, reload } = useSessionDetail(sessionId);
  const [chipInputs, setChipInputs] = useState<Record<string, string>>({});
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);

  const buyIn = session?.buy_in || 1000;
  const isLocked = session?.is_locked || false;

  const totalChips = useMemo(() => {
    return players.reduce((sum, p) => {
      const val = chipInputs[p.player_id] !== undefined
        ? parseInt(chipInputs[p.player_id]) || 0
        : p.chips_end || 0;
      return sum + val;
    }, 0);
  }, [players, chipInputs]);

  const expectedTotal = buyIn * players.length;
  const isValid = totalChips === expectedTotal && players.length >= 2;

  async function updateChips(playerId: string, value: string) {
    setChipInputs(prev => ({ ...prev, [playerId]: value }));
    const chips = parseInt(value);
    if (!isNaN(chips)) {
      await supabase
        .from('session_players')
        .update({ chips_end: chips })
        .eq('session_id', sessionId)
        .eq('player_id', playerId);
    }
  }

  async function lockAndCalculate() {
    if (!isValid) return;
    const { error } = await supabase.rpc('calculate_session_elo', { p_session_id: sessionId });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      reload();
    }
  }

  async function loadAvailablePlayers() {
    if (!me) return;
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('domain', me.domain);
    const existing = new Set(players.map(p => p.player_id));
    setAllPlayers((data || []).filter(p => !existing.has(p.id)));
    setShowAddPlayer(true);
  }

  async function addPlayer(p: Player) {
    await supabase.from('session_players').insert({
      session_id: sessionId,
      player_id: p.id,
      elo_before: p.elo,
    });
    setShowAddPlayer(false);
    reload();
  }

  const lockDeadline = new Date();
  lockDeadline.setHours(14, 0, 0, 0);
  const canEdit = !isLocked && new Date() < lockDeadline;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Session {session?.played_date || ''}</Text>
        <View style={[styles.badge, isLocked ? styles.badgeLocked : styles.badgeEditable]}>
          <Text style={styles.badgeText}>{isLocked ? 'Locked' : 'Editable until 14:00'}</Text>
        </View>
      </View>

      <View style={styles.validationBar}>
        <Text style={[styles.validationText, isValid ? styles.valid : styles.invalid]}>
          Chips: {totalChips} / {expectedTotal}
          {isValid ? ' OK' : ` (${totalChips > expectedTotal ? '+' : ''}${totalChips - expectedTotal})`}
        </Text>
      </View>

      <FlatList
        data={players}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => {
          const chips = chipInputs[item.player_id] !== undefined
            ? parseInt(chipInputs[item.player_id]) || 0
            : item.chips_end || 0;
          const delta = chips - buyIn;
          return (
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.name}>{item.player.name}</Text>
                {item.elo_after != null && (
                  <Text style={[styles.eloChange, (item.elo_after - item.elo_before) >= 0 ? styles.positive : styles.negative]}>
                    Elo: {item.elo_before} → {item.elo_after} ({(item.elo_after - item.elo_before) >= 0 ? '+' : ''}{item.elo_after - item.elo_before})
                  </Text>
                )}
              </View>
              {canEdit ? (
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={chipInputs[item.player_id] ?? String(item.chips_end ?? '')}
                  onChangeText={(v) => updateChips(item.player_id, v)}
                  placeholder="chips"
                  placeholderTextColor="#475569"
                />
              ) : (
                <Text style={styles.chipsFixed}>{item.chips_end ?? '-'}</Text>
              )}
              <Text style={[styles.delta, delta >= 0 ? styles.positive : styles.negative]}>
                {delta >= 0 ? '+' : ''}{delta}
              </Text>
            </View>
          );
        }}
        ListFooterComponent={
          canEdit ? (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.addBtn} onPress={loadAvailablePlayers}>
                <Text style={styles.addBtnText}>+ Add Player</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.lockBtn, !isValid && styles.lockBtnDisabled]}
                onPress={lockAndCalculate}
                disabled={!isValid}
              >
                <Text style={styles.lockBtnText}>Lock & Calculate Elo</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {showAddPlayer && (
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Add Player</Text>
          {allPlayers.map(p => (
            <TouchableOpacity key={p.id} style={styles.modalRow} onPress={() => addPlayer(p)}>
              <Text style={styles.modalName}>{p.name}</Text>
              <Text style={styles.modalElo}>{p.elo}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setShowAddPlayer(false)}>
            <Text style={styles.modalClose}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 20, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#f1f5f9' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  badgeEditable: { backgroundColor: '#166534' },
  badgeLocked: { backgroundColor: '#991b1b' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  validationBar: { marginHorizontal: 20, padding: 12, backgroundColor: '#1e293b', borderRadius: 10, marginBottom: 8 },
  validationText: { textAlign: 'center', fontWeight: '700', fontSize: 16 },
  valid: { color: '#22c55e' },
  invalid: { color: '#ef4444' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  rowInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#f1f5f9' },
  eloChange: { fontSize: 12, marginTop: 2 },
  input: { backgroundColor: '#1e293b', color: '#f1f5f9', fontSize: 18, fontWeight: '700', width: 80, textAlign: 'center', borderRadius: 8, padding: 8 },
  chipsFixed: { fontSize: 18, fontWeight: '700', color: '#f1f5f9', width: 80, textAlign: 'center' },
  delta: { fontSize: 16, fontWeight: '700', width: 60, textAlign: 'right' },
  positive: { color: '#22c55e' },
  negative: { color: '#ef4444' },
  actions: { padding: 20, gap: 12 },
  addBtn: { backgroundColor: '#1e293b', padding: 14, borderRadius: 10, alignItems: 'center' },
  addBtnText: { color: '#f59e0b', fontWeight: '700', fontSize: 16 },
  lockBtn: { backgroundColor: '#f59e0b', padding: 16, borderRadius: 12, alignItems: 'center' },
  lockBtnDisabled: { opacity: 0.4 },
  lockBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 16 },
  modal: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#1e293b', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#f1f5f9', marginBottom: 16 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#334155' },
  modalName: { fontSize: 16, color: '#f1f5f9' },
  modalElo: { fontSize: 16, color: '#64748b' },
  modalClose: { color: '#f59e0b', textAlign: 'center', marginTop: 16, fontSize: 16, fontWeight: '600' },
});
