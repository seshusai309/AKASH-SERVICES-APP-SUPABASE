import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import WashDetailModal from '@/components/WashDetailModal';
import { supabase, WashRecord } from '@/utils/supabase';

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
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const records = data as WashRecord[];
    const todayAll = records.filter(r => new Date(r.created_at) >= today);

    setTodayCount(todayAll.length);
    setTodayIncome(todayAll.filter(r => r.payment_status === 'paid').reduce((s, r) => s + r.amount, 0));
    setPendingAmount(records.filter(r => r.payment_status === 'pending').reduce((s, r) => s + r.amount, 0));
    setTodayRecords(todayAll.slice(0, 5));

    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadData();
  }, []));

  const handleUpdated = (updated: WashRecord) => {
    setSelectedRecord(updated);
    setTodayRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
    // refresh stats
    loadData();
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a73e8" /></View>;
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Good day!</Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>

        {/* Stats */}
        <Text style={styles.sectionTitle}>Today</Text>
        <View style={styles.row}>
          <StatCard label="Washes Done" value={String(todayCount)} icon="🚗" color="#e3f0ff" />
          <StatCard label="Today's Income" value={`₹${todayIncome}`} icon="💰" color="#e6f9f0" />
        </View>

        <View style={styles.pendingCard}>
          <Text style={styles.pendingIcon}>🔴</Text>
          <View>
            <Text style={styles.pendingAmount}>₹{pendingAmount}</Text>
            <Text style={styles.pendingLabel}>Total Pending Amount</Text>
          </View>
        </View>

        {/* Add Wash button */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/(tabs)/add-wash')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>➕  Add New Wash</Text>
        </TouchableOpacity>

        {/* Today's Records */}
        {todayRecords.length > 0 && (
          <>
            <View style={styles.recordsHeader}>
              <Text style={styles.sectionTitle}>Today's Washes</Text>
              {todayCount > 5 && (
                <TouchableOpacity onPress={() => router.push('/(tabs)/records')} activeOpacity={0.8}>
                  <Text style={styles.viewAll}>View all {todayCount} →</Text>
                </TouchableOpacity>
              )}
            </View>

            {todayRecords.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, item.payment_status === 'pending' && styles.cardPending]}
                onPress={() => setSelectedRecord(item)}
                activeOpacity={0.85}
              >
                <View style={styles.cardRow}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.vehicleNumber}>{item.vehicle_number}</Text>
                    {item.customer_name ? <Text style={styles.customerName}>{item.customer_name}</Text> : null}
                    <Text style={styles.vehicleType}>{item.vehicle_type ?? 'Wash'}</Text>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={styles.cardAmount}>₹{item.amount}</Text>
                    <View style={[styles.badge, item.payment_status === 'paid' ? styles.badgePaid : styles.badgePending]}>
                      <Text style={styles.badgeText}>{item.payment_status === 'paid' ? 'Paid' : 'Pending'}</Text>
                    </View>
                    <Text style={styles.cardTime}>{formatTime(item.created_at)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {todayRecords.length === 0 && (
          <View style={styles.emptyToday}>
            <Text style={styles.emptyTodayText}>No washes yet today. Tap Add New Wash to start.</Text>
          </View>
        )}
      </ScrollView>

      <WashDetailModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onUpdated={handleUpdated}
      />
    </>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginTop: 48, marginBottom: 20 },
  greeting: { fontSize: 28, fontWeight: '800', color: '#1a1a1a' },
  date: { fontSize: 14, color: '#888', marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 16 },
  row: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'flex-start' },
  statIcon: { fontSize: 24, marginBottom: 8 },
  statValue: { fontSize: 26, fontWeight: '800', color: '#1a1a1a' },
  statLabel: { fontSize: 13, color: '#555', marginTop: 2 },
  pendingCard: { backgroundColor: '#fce8e8', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 },
  pendingIcon: { fontSize: 28 },
  pendingAmount: { fontSize: 30, fontWeight: '800', color: '#c62828' },
  pendingLabel: { fontSize: 13, color: '#b71c1c', marginTop: 2, fontWeight: '600' },
  primaryBtn: { backgroundColor: '#1a73e8', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 16 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  recordsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewAll: { fontSize: 13, color: '#1a73e8', fontWeight: '700', marginTop: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  cardPending: { borderColor: '#f0c040', borderWidth: 1.5 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  vehicleNumber: { fontSize: 17, fontWeight: '800', color: '#1a1a1a' },
  customerName: { fontSize: 14, color: '#1a73e8', fontWeight: '600', marginTop: 2 },
  vehicleType: { fontSize: 13, color: '#666', marginTop: 1 },
  cardAmount: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgePaid: { backgroundColor: '#e6f9f0' },
  badgePending: { backgroundColor: '#fff8e1' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#333' },
  cardTime: { fontSize: 11, color: '#aaa', marginTop: 2 },
  emptyToday: { marginTop: 20, backgroundColor: '#fff', borderRadius: 14, padding: 24, alignItems: 'center' },
  emptyTodayText: { fontSize: 14, color: '#aaa', textAlign: 'center', lineHeight: 22 },
});
