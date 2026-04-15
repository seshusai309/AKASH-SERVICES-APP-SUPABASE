import WashDetailModal from '@/components/WashDetailModal';
import { C } from '@/constants/theme';
import { supabase, WashRecord } from '@/utils/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Filter = 'paid' | 'pending';

export default function RecordsScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const [records, setRecords] = useState<WashRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('paid');
  const [selectedRecord, setSelectedRecord] = useState<WashRecord | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('wash_records')
      .select('*, wash_contacts(*)')
      .order('created_at', { ascending: false });
    if (!error && data) setRecords(data as WashRecord[]);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { fetchRecords(); }, []));

  useEffect(() => {
    if (params.filter === 'pending') {
      setFilter('pending');
    }
  }, [params.filter]);

  const filtered = records.filter(r => r.payment_status === filter);
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
    return <View style={s.center}><ActivityIndicator size="large" color={C.accent} /></View>;
  }

  return (
    <>
      <SafeAreaView style={{ backgroundColor: C.primary }} edges={['top']} />
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.pageTitle}>Records</Text>
          <Text style={s.pageSub}>{records.length} total washes</Text>
        </View>

        {/* Filter tabs */}
        <View style={s.filterRow}>
          {(['paid', 'pending'] as Filter[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[s.filterBtn, filter === f && (f === 'paid' ? s.filterBtnPaid : s.filterBtnPending)]}
              onPress={() => setFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[s.filterBtnText, filter === f && s.filterBtnTextActive]}>
                {f === 'paid' ? 'Paid' : 'Pending'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary bar */}
        {filtered.length > 0 && (
          <View style={s.summaryBar}>
            <Text style={s.summaryCount}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</Text>
            <Text style={s.summaryAmount}>₹{totalShown}</Text>
          </View>
        )}

        {/* List */}
        {filtered.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyTitle}>No Records</Text>
            <Text style={s.emptyText}>{`No ${filter} records.`}</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            contentContainerStyle={s.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.card, item.payment_status === 'pending' && s.cardPending]}
                onPress={() => setSelectedRecord(item)}
                activeOpacity={0.85}
              >
                <View style={s.cardRow}>
                  <View style={s.cardLeft}>
                    <Text style={s.vehicleNumber}>{item.vehicle_number}</Text>
                    {item.wash_contacts?.[0] && (
                      <Text style={s.customerName}>{item.wash_contacts[0].customer_name}</Text>
                    )}
                    <Text style={s.vehicleType}>{item.vehicle_type ?? 'Wash'}</Text>
                    <Text style={s.cardDate}>{formatDate(item.created_at)}</Text>
                  </View>
                  <View style={s.cardRight}>
                    <Text style={s.amount}>₹{item.amount}</Text>
                    <View style={[s.badge, item.payment_status === 'paid' ? s.badgePaid : s.badgePending]}>
                      <Text style={[s.badgeText, item.payment_status === 'paid' ? s.badgeTextPaid : s.badgeTextPending]}>
                        {item.payment_status === 'paid' ? 'Paid' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      <WashDetailModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onUpdated={handleUpdated}
      />
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  header: {
    backgroundColor: C.primary,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  pageTitle: { fontSize: C.fontSize.xxxl, fontWeight: '800', color: C.white },
  pageSub: { fontSize: C.fontSize.md, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingTop: 14, paddingBottom: 4 },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.card,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
  },
  filterBtnPaid: { backgroundColor: C.success, borderColor: C.success },
  filterBtnPending: { backgroundColor: C.warning, borderColor: C.warning },
  filterBtnText: { fontSize: C.fontSize.sm, fontWeight: '700', color: C.textSec },
  filterBtnTextActive: { color: C.white },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  summaryCount: { fontSize: C.fontSize.sm, color: C.textMuted, fontWeight: '600' },
  summaryAmount: { fontSize: C.fontSize.xl, fontWeight: '800', color: C.primary },
  listContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 4 },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardPending: { borderColor: '#FCA5A5', borderWidth: 1.5, backgroundColor: '#FFFBFB' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  vehicleNumber: { fontSize: C.fontSize.xl, fontWeight: '800', color: C.primary },
  customerName: { fontSize: C.fontSize.md, color: C.accent, fontWeight: '600', marginTop: 2 },
  vehicleType: { fontSize: C.fontSize.sm, color: C.textSec, marginTop: 1 },
  cardDate: { fontSize: C.fontSize.xs, color: C.textMuted, marginTop: 5 },
  amount: { fontSize: C.fontSize.xl, fontWeight: '800', color: C.primary },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgePaid: { backgroundColor: C.successBg },
  badgePending: { backgroundColor: C.dangerBg },
  badgeText: { fontSize: C.fontSize.xs, fontWeight: '700' },
  badgeTextPaid: { color: C.success },
  badgeTextPending: { color: C.danger },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: C.primary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center' },
});
