import * as Linking from 'expo-linking';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase, WashRecord } from '@/utils/supabase';

export default function PendingScreen() {
  const [records, setRecords] = useState<WashRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('wash_records')
      .select('*, wash_contacts(*)')
      .eq('payment_status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRecords(data as WashRecord[]);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchPending();
    }, [])
  );

  const markPaid = async (record: WashRecord) => {
    Alert.alert(
      'Mark as Paid',
      `Mark ₹${record.amount} from ${record.vehicle_number} as paid?\nAlso send WhatsApp receipt?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Paid + WhatsApp',
          onPress: () => doMarkPaid(record, true),
        },
        {
          text: 'Mark Paid Only',
          onPress: () => doMarkPaid(record, false),
        },
      ]
    );
  };

  const doMarkPaid = async (record: WashRecord, sendWhatsApp: boolean) => {
    setMarkingId(record.id);
    const { error } = await supabase
      .from('wash_records')
      .update({ payment_status: 'paid' })
      .eq('id', record.id);

    setMarkingId(null);

    if (error) {
      Alert.alert('Error', 'Could not update. Please try again.');
      return;
    }

    setRecords(prev => prev.filter(r => r.id !== record.id));

    if (sendWhatsApp) {
      const vehicleName = (record as any).vehicle_type ?? 'Vehicle Wash';
      const message =
        `🚗 *Payment Received - Thank You!*\n\n` +
        `Vehicle: *${record.vehicle_number}*\n` +
        `Service: ${vehicleName}\n` +
        `Amount Paid: *₹${record.amount}*\n\n` +
        `🙏 Thank you for choosing our service!`;

      const url = `https://wa.me/91${record.mobile_number}?text=${encodeURIComponent(message)}`;
      Linking.openURL(url).catch(() => {});
    }
  };

  const totalPending = records.reduce((sum, r) => sum + r.amount, 0);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Pending Payments</Text>
        <Text style={styles.screenSubtitle}>{records.length} pending</Text>
      </View>

      {records.length > 0 && (
        <View style={styles.totalBanner}>
          <Text style={styles.totalBannerLabel}>Total Pending Amount</Text>
          <Text style={styles.totalBannerValue}>₹{totalPending}</Text>
        </View>
      )}

      {records.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>All Clear!</Text>
          <Text style={styles.emptyText}>No pending payments right now.</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.vehicleNumber}>{item.vehicle_number}</Text>
                <Text style={styles.amount}>₹{item.amount}</Text>
              </View>
              {item.wash_contacts?.[0] ? (
                <Text style={styles.customerName}>{item.wash_contacts[0].customer_name}</Text>
              ) : null}
              <Text style={styles.vehicleType}>{(item as any).vehicle_type ?? 'Vehicle Wash'}</Text>
              <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.whatsappBtn}
                  onPress={() => {
                    const url = `https://wa.me/91${item.mobile_number}`;
                    Linking.openURL(url).catch(() => {});
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.whatsappBtnText}>📱 WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.markPaidBtn, markingId === item.id && styles.btnDisabled]}
                  onPress={() => markPaid(item)}
                  disabled={markingId === item.id}
                  activeOpacity={0.85}
                >
                  {markingId === item.id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.markPaidBtnText}>✅ Mark Paid</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 48, paddingBottom: 8 },
  screenTitle: { fontSize: 28, fontWeight: '800', color: '#1a1a1a' },
  screenSubtitle: { fontSize: 14, color: '#888', marginTop: 2 },
  totalBanner: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#fff8e1',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#f0c040',
  },
  totalBannerLabel: { fontSize: 14, color: '#7a6000', fontWeight: '600' },
  totalBannerValue: { fontSize: 24, fontWeight: '800', color: '#c67c00' },
  listContent: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#f0c040',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vehicleNumber: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  amount: { fontSize: 22, fontWeight: '800', color: '#c67c00' },
  customerName: { fontSize: 14, color: '#1a73e8', fontWeight: '600', marginTop: 2 },
  vehicleType: { fontSize: 13, color: '#666', marginTop: 1 },
  cardDate: { fontSize: 12, color: '#aaa', marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  whatsappBtn: {
    flex: 1,
    backgroundColor: '#f0fff5',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#25D366',
  },
  whatsappBtnText: { color: '#1a7a3a', fontSize: 14, fontWeight: '700' },
  markPaidBtn: {
    flex: 1,
    backgroundColor: '#1a73e8',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  markPaidBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#333', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#888' },
});
