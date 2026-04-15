import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import WashDetailModal from '@/components/WashDetailModal';
import { supabase, WashRecord } from '@/utils/supabase';

type Filter = 'all' | 'paid' | 'pending';

export default function RecordsScreen() {
  const [records, setRecords] = useState<WashRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedRecord, setSelectedRecord] = useState<WashRecord | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('wash_records')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setRecords(data as WashRecord[]);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { fetchRecords(); }, []));

  const filtered = filter === 'all' ? records : records.filter(r => r.payment_status === filter);
  const totalShown = filtered.reduce((sum, r) => sum + r.amount, 0);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const handleUpdated = (updated: WashRecord) => {
    setSelectedRecord(updated);
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a73e8" /></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Records</Text>
        <Text style={styles.screenSubtitle}>{records.length} total washes</Text>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'paid', 'pending'] as Filter[]).map(f => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)} activeOpacity={0.8}>
            <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
              {f === 'all' ? 'All' : f === 'paid' ? '✅ Paid' : '⏳ Pending'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</Text>
          <Text style={styles.summaryAmount}>₹{totalShown}</Text>
        </View>
      )}

      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No Records</Text>
          <Text style={styles.emptyText}>{filter === 'all' ? 'No wash records yet.' : `No ${filter} records.`}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, item.payment_status === 'pending' && styles.cardPending]}
              onPress={() => setSelectedRecord(item)}
              activeOpacity={0.85}
            >
              <View style={styles.cardRow}>
                <View style={styles.cardLeft}>
                  <Text style={styles.vehicleNumber}>{item.vehicle_number}</Text>
                  {item.customer_name ? <Text style={styles.customerName}>{item.customer_name}</Text> : null}
                  <Text style={styles.vehicleType}>{item.vehicle_type ?? 'Wash'}</Text>
                  <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.amount}>₹{item.amount}</Text>
                  <View style={[styles.badge, item.payment_status === 'paid' ? styles.badgePaid : styles.badgePending]}>
                    <Text style={styles.badgeText}>{item.payment_status === 'paid' ? 'Paid' : 'Pending'}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <WashDetailModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onUpdated={handleUpdated}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 48, paddingBottom: 8 },
  screenTitle: { fontSize: 28, fontWeight: '800', color: '#1a1a1a' },
  screenSubtitle: { fontSize: 14, color: '#888', marginTop: 2 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginTop: 16 },
  filterBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1.5, borderColor: '#e0e0e0' },
  filterBtnActive: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  filterBtnText: { fontSize: 13, fontWeight: '700', color: '#666' },
  filterBtnTextActive: { color: '#fff' },
  summaryBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  summaryText: { fontSize: 13, color: '#888', fontWeight: '600' },
  summaryAmount: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  cardPending: { borderColor: '#f0c040', borderWidth: 1.5 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  vehicleNumber: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  customerName: { fontSize: 14, color: '#1a73e8', fontWeight: '600', marginTop: 2 },
  vehicleType: { fontSize: 13, color: '#666', marginTop: 1 },
  cardDate: { fontSize: 12, color: '#aaa', marginTop: 4 },
  amount: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgePaid: { backgroundColor: '#e6f9f0' },
  badgePending: { backgroundColor: '#fff8e1' },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#333' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#333', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#888' },
});
