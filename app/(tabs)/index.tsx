import WashDetailModal from '@/components/WashDetailModal';
import { C } from '@/constants/theme';
import { supabase, WashRecord } from '@/utils/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const router = useRouter();
  const [todayCount, setTodayCount] = useState(0);
  const [todayIncome, setTodayIncome] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [todayRecords, setTodayRecords] = useState<WashRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<WashRecord | null>(null);

  const loadData = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from('wash_records')
      .select('*, wash_contacts(*)')
      .order('created_at', { ascending: false });

    if (error || !data) { setLoading(false); setRefreshing(false); return; }

    const records = data as WashRecord[];
    const todayAll = records.filter(r => new Date(r.created_at) >= today);

    setTodayCount(todayAll.length);
    setTodayIncome(todayAll.filter(r => r.payment_status === 'paid').reduce((s, r) => s + r.amount, 0));
    setPendingAmount(records.filter(r => r.payment_status === 'pending').reduce((s, r) => s + r.amount, 0));
    setTodayRecords(todayAll.slice(0, 5));
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { setLoading(true); loadData(); }, []));

  const handleUpdated = (updated: WashRecord) => {
    setSelectedRecord(updated);
    setTodayRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
    loadData();
  };

  const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={C.accent} /></View>;
  }

  return (
    <>
      <SafeAreaView style={{ backgroundColor: C.primary }} edges={['top']} />
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={C.accent} />}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Akash Water Services</Text>
          <Text style={s.headerSub}>Dashboard</Text>
        </View>

        {/* Stat cards */}
        <View style={s.statsRow}>
          <StatCard label="Today's Washes" value={String(todayCount)} color={C.accent} bg="#EBF5FF" />
          <StatCard label="Today's Income" value={`₹${todayIncome}`} color={C.success} bg={C.successBg} />
        </View>

        {/* Pending */}
        <View style={s.pendingBanner}>
          <View>
            <Text style={s.pendingLabel}>Pending Amount</Text>
            <Text style={s.pendingValue}>₹{pendingAmount}</Text>
          </View>
          <TouchableOpacity style={s.pendingBtn} onPress={() => router.push('/(tabs)/records?filter=pending')} activeOpacity={0.85}>
            <Text style={s.pendingBtnText}>View →</Text>
          </TouchableOpacity>
        </View>

        {/* Add Wash CTA */}
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/(tabs)/add-wash')} activeOpacity={0.85}>
          <Text style={s.addBtnText}>+ Add New Wash</Text>
        </TouchableOpacity>

        {/* Today's records */}
        {todayRecords.length > 0 && (
          <>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Today's Washes</Text>
              {todayCount > 5 && (
                <TouchableOpacity onPress={() => router.push('/(tabs)/records')} activeOpacity={0.8}>
                  <Text style={s.viewAll}>View all {todayCount} →</Text>
                </TouchableOpacity>
              )}
            </View>
            {todayRecords.map(item => (
              <TouchableOpacity key={item.id} style={[s.card, item.payment_status === 'pending' && s.cardPending]} onPress={() => setSelectedRecord(item)} activeOpacity={0.85}>
                <View style={s.cardRow}>
                  <View style={s.cardLeft}>
                    <Text style={s.cardVehicle}>{item.vehicle_number}</Text>
                    {item.wash_contacts?.[0] && <Text style={s.cardCustomer}>{item.wash_contacts[0].customer_name}</Text>}
                    <Text style={s.cardType}>{item.vehicle_type ?? ''}</Text>
                  </View>
                  <View style={s.cardRight}>
                    <Text style={s.cardAmount}>₹{item.amount}</Text>
                    <View style={[s.badge, item.payment_status === 'paid' ? s.badgePaid : s.badgePending]}>
                      <Text style={[s.badgeText, item.payment_status === 'paid' ? s.badgeTextPaid : s.badgeTextPending]}>
                        {item.payment_status === 'paid' ? 'Paid' : 'Pending'}
                      </Text>
                    </View>
                    <Text style={s.cardTime}>{formatTime(item.created_at)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {todayRecords.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>No washes today yet.</Text>
          </View>
        )}
      </ScrollView>

      <WashDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} onUpdated={handleUpdated} />
    </>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <View style={[s.statCard, { backgroundColor: bg }]}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  header: { backgroundColor: C.primary, paddingTop: 20, paddingBottom: 24, paddingHorizontal: 20 },
  headerTitle: { fontSize: C.fontSize.xxl, fontWeight: '800', color: C.white },
  headerSub: { fontSize: C.fontSize.sm, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  statsRow: { flexDirection: 'row', gap: 12, padding: 16 },
  statCard: { flex: 1, borderRadius: 14, padding: 16 },
  statValue: { fontSize: C.fontSize.xxxl, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: C.fontSize.sm, fontWeight: '600', color: C.textSec },
  pendingBanner: {
    marginHorizontal: 16, borderRadius: 14, backgroundColor: C.dangerBg,
    borderWidth: 1.5, borderColor: '#FECACA',
    padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pendingLabel: { fontSize: C.fontSize.sm, fontWeight: '700', color: C.danger },
  pendingValue: { fontSize: 30, fontWeight: '800', color: C.danger, marginTop: 2 },
  pendingBtn: { backgroundColor: C.danger, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  pendingBtnText: { color: C.white, fontWeight: '700', fontSize: C.fontSize.md },
  addBtn: { margin: 16, backgroundColor: C.accent, borderRadius: 14, height: 54, justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: C.white, fontSize: C.fontSize.xl, fontWeight: '800', letterSpacing: 0.3 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontSize: C.fontSize.lg, fontWeight: '800', color: C.primary },
  viewAll: { fontSize: C.fontSize.sm, fontWeight: '700', color: C.accent },
  card: { marginHorizontal: 16, marginBottom: 10, backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border },
  cardPending: { borderColor: '#FCA5A5', borderWidth: 1.5, backgroundColor: '#FFFBFB' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end', gap: 5 },
  cardVehicle: { fontSize: C.fontSize.xl, fontWeight: '800', color: C.primary },
  cardCustomer: { fontSize: C.fontSize.md, fontWeight: '600', color: C.accent, marginTop: 2 },
  cardType: { fontSize: C.fontSize.sm, color: C.textSec, marginTop: 1 },
  cardAmount: { fontSize: C.fontSize.xl, fontWeight: '800', color: C.primary },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgePaid: { backgroundColor: C.successBg },
  badgePending: { backgroundColor: C.dangerBg },
  badgeText: { fontSize: C.fontSize.xs, fontWeight: '700' },
  badgeTextPaid: { color: C.success },
  badgeTextPending: { color: C.danger },
  cardTime: { fontSize: C.fontSize.xs, color: C.textMuted },
  emptyBox: { margin: 16, backgroundColor: C.card, borderRadius: 14, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  emptyText: { fontSize: C.fontSize.md, color: C.textMuted, textAlign: 'center' },
});
