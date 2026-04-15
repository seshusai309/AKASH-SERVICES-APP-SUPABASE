import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase, WashRecord } from '@/utils/supabase';

type ProfileStats = {
  totalIncome: number;
  totalPendingAmount: number;
  totalWashes: number;
  totalPaidWashes: number;
};

export default function ProfileScreen() {
  const [stats, setStats] = useState<ProfileStats>({
    totalIncome: 0,
    totalPendingAmount: 0,
    totalWashes: 0,
    totalPaidWashes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    const { data, error } = await supabase.from('wash_records').select('*');
    if (error || !data) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const records = data as WashRecord[];
    setStats({
      totalIncome: records
        .filter(r => r.payment_status === 'paid')
        .reduce((sum, r) => sum + r.amount, 0),
      totalPendingAmount: records
        .filter(r => r.payment_status === 'pending')
        .reduce((sum, r) => sum + r.amount, 0),
      totalWashes: records.length,
      totalPaidWashes: records.filter(r => r.payment_status === 'paid').length,
    });
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadStats();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStats(); }} />}
      >
        <View style={styles.header}>
          <Text style={styles.avatarText}>🏪</Text>
          <Text style={styles.shopName}>Wash Track</Text>
          <Text style={styles.shopSub}>Business Overview</Text>
        </View>

        {/* Total Income */}
        <View style={styles.incomeCard}>
          <Text style={styles.incomeLabel}>Total Lifetime Income</Text>
          <Text style={styles.incomeValue}>₹{stats.totalIncome}</Text>
        </View>

        {/* Pending */}
        <View style={styles.pendingCard}>
          <Text style={styles.pendingLabel}>Total Pending Amount</Text>
          <Text style={styles.pendingValue}>₹{stats.totalPendingAmount}</Text>
        </View>

        {/* Stats grid */}
        <Text style={styles.sectionTitle}>All Time</Text>
        <View style={styles.grid}>
          <View style={[styles.gridCard, { backgroundColor: '#e3f0ff' }]}>
            <Text style={styles.gridIcon}>🚗</Text>
            <Text style={styles.gridValue}>{stats.totalWashes}</Text>
            <Text style={styles.gridLabel}>Total Washes</Text>
          </View>
          <View style={[styles.gridCard, { backgroundColor: '#e6f9f0' }]}>
            <Text style={styles.gridIcon}>✅</Text>
            <Text style={styles.gridValue}>{stats.totalPaidWashes}</Text>
            <Text style={styles.gridLabel}>Paid Washes</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 48 },
  header: { alignItems: 'center', paddingTop: 32, paddingBottom: 28 },
  avatarText: { fontSize: 56 },
  shopName: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', marginTop: 8 },
  shopSub: { fontSize: 14, color: '#888', marginTop: 4 },
  incomeCard: {
    backgroundColor: '#1a73e8',
    borderRadius: 20,
    padding: 24,
    marginBottom: 12,
    alignItems: 'center',
  },
  incomeLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  incomeValue: { fontSize: 40, fontWeight: '800', color: '#fff', marginTop: 6 },
  pendingCard: {
    backgroundColor: '#fce8e8',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#f5c6c6',
  },
  pendingLabel: { fontSize: 14, color: '#b71c1c', fontWeight: '600' },
  pendingValue: { fontSize: 36, fontWeight: '800', color: '#c62828', marginTop: 6 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  grid: { flexDirection: 'row', gap: 12 },
  gridCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'flex-start' },
  gridIcon: { fontSize: 24, marginBottom: 8 },
  gridValue: { fontSize: 28, fontWeight: '800', color: '#1a1a1a' },
  gridLabel: { fontSize: 13, color: '#555', marginTop: 2 },
});
