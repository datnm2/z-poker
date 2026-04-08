import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Z-Poker</Text>
      <Text style={styles.subtitle}>Office Poker Elo Tracker</Text>
      <TouchableOpacity style={styles.button} onPress={signInWithGoogle}>
        <Text style={styles.buttonText}>Sign in with Google</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>Use your company email</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', padding: 24 },
  title: { fontSize: 48, fontWeight: '800', color: '#f59e0b', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#94a3b8', marginBottom: 48 },
  button: { backgroundColor: '#f59e0b', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 },
  buttonText: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  hint: { marginTop: 16, color: '#64748b', fontSize: 14 },
});
