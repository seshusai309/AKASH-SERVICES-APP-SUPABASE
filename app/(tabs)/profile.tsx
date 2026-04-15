import { C } from '@/constants/theme';
import { supabase, WashRecord } from '@/utils/supabase';
import { useFocusEffect } from '@react-navigation/native';
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
    if (error || !data) { setLoading(false); setRefreshing(false); return; }

    const records = data as WashRecord[];
    setStats({
      totalIncome: records.filter(r => r.payment_status === 'paid').reduce((s, r) => s + r.amount, 0),
      totalPendingAmount: records.filter(r => r.payment_status === 'pending').reduce((s, r) => s + r.amount, 0),
      totalWashes: records.length,
      totalPaidWashes: records.filter(r => r.payment_status === 'paid').length,
    });
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { setLoading(true); loadStats(); }, []));

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={C.accent} /></View>;
  }

  const pendingWashes = stats.totalWashes - stats.totalPaidWashes;

  return (
    <>
      <SafeAreaView style={{ backgroundColor: C.primary }} edges={['top']} />
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadStats(); }}
            tintColor={C.accent}
          />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.shopName}>Akash Water Services</Text>
          <Text style={s.shopSub}>Business Overview</Text>
        </View>

        {/* Lifetime Income */}
        <View style={s.incomeCard}>
          <Text style={s.incomeLabel}>Total Lifetime Income</Text>
          <Text style={s.incomeValue}>₹{stats.totalIncome}</Text>
        </View>

        {/* Pending Amount */}
        <View style={s.pendingCard}>
          <Text style={s.pendingLabel}>Total Pending Amount</Text>
          <Text style={s.pendingValue}>₹{stats.totalPendingAmount}</Text>
        </View>

        {/* Stats grid */}
        <Text style={s.sectionTitle}>All Time Stats</Text>
        <View style={s.grid}>
          <View style={[s.gridCard, { backgroundColor: '#EBF5FF' }]}>
            <Text style={s.gridValue}>{stats.totalWashes}</Text>
            <Text style={s.gridLabel}>Total Washes</Text>
          </View>
          <View style={[s.gridCard, { backgroundColor: C.successBg }]}>
            <Text style={[s.gridValue, { color: C.success }]}>{stats.totalPaidWashes}</Text>
            <Text style={s.gridLabel}>Paid Washes</Text>
          </View>
        </View>
        <View style={[s.grid, { marginTop: 10 }]}>
          <View style={[s.gridCard, { backgroundColor: C.dangerBg }]}>
            <Text style={[s.gridValue, { color: C.danger }]}>{pendingWashes}</Text>
            <Text style={s.gridLabel}>Total Not Paid Washes</Text>
          </View>
          <View style={[s.gridCard, { backgroundColor: C.warningBg }]}>
            <Text style={[s.gridValue, { color: C.warning }]}>
              {stats.totalWashes > 0 ? Math.round((stats.totalPaidWashes / stats.totalWashes) * 100) : 0}%
            </Text>
            <Text style={s.gridLabel}>Collection Rate</Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  content: { paddingBottom: 56 },
  header: {
    backgroundColor: C.primary,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    alignItems: 'center',
  },
  shopName: { fontSize: C.fontSize.xxl, fontWeight: '800', color: C.white },
  shopSub: { fontSize: C.fontSize.md, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  incomeCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: C.accent,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  incomeLabel: { fontSize: C.fontSize.sm, color: 'rgba(255,255,255,0.75)', fontWeight: '700' },
  incomeValue: { fontSize: 46, fontWeight: '800', color: C.white, marginTop: 6 },
  pendingCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: C.dangerBg,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  pendingLabel: { fontSize: C.fontSize.sm, color: C.danger, fontWeight: '700' },
  pendingValue: { fontSize: 40, fontWeight: '800', color: C.danger, marginTop: 6 },
  sectionTitle: {
    fontSize: C.fontSize.xs,
    fontWeight: '800',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 28,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  grid: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
  gridCard: { flex: 1, borderRadius: 16, padding: 18, alignItems: 'flex-start' },
  gridValue: { fontSize: 34, fontWeight: '800', color: C.accent },
  gridLabel: { fontSize: C.fontSize.sm, color: C.textSec, marginTop: 4, fontWeight: '600' },
});
