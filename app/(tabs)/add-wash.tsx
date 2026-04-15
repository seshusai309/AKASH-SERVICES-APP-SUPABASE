import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/utils/supabase';

export default function AddWashScreen() {
  const [customerName, setCustomerName] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [mobile, setMobile] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setCustomerName('');
    setVehicleType('');
    setVehicleNumber('');
    setMobile('');
    setAmount('');
    setPaymentStatus('paid');
  };

  const handleSave = async () => {
    if (!customerName.trim()) {
      Alert.alert('Missing', 'Enter the customer name.');
      return;
    }
    if (!vehicleType.trim()) {
      Alert.alert('Missing', 'Enter vehicle type (e.g. Hatchback, SUV).');
      return;
    }
    if (!vehicleNumber.trim()) {
      Alert.alert('Missing', 'Enter the vehicle number.');
      return;
    }
    if (!mobile.trim() || mobile.length < 10) {
      Alert.alert('Missing', 'Enter a valid 10-digit mobile number.');
      return;
    }
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Missing', 'Enter a valid amount.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('wash_records').insert([
      {
        customer_name: customerName.trim(),
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        vehicle_type: vehicleType.trim(),
        mobile_number: mobile.trim(),
        amount: Number(amount),
        payment_status: paymentStatus,
      },
    ]);
    setSaving(false);

    if (error) {
      Alert.alert('Error', 'Could not save. Please try again.\n\n' + error.message);
      return;
    }

    if (paymentStatus === 'paid') {
      sendWhatsApp(customerName.trim(), vehicleNumber.trim().toUpperCase(), vehicleType.trim(), Number(amount), mobile.trim());
    } else {
      Alert.alert('Saved!', 'Wash record added. Payment is pending.');
      resetForm();
    }
  };

  const sendWhatsApp = (name: string, vNum: string, vType: string, amt: number, mobileNum: string) => {
    const message =
      `*AKASH WATER SERVICES*\n` +
      `Golagamudi, Opp. Vengamamba Daba\n\n` +
      `*Vehicle Wash Completed*\n\n` +
      `Customer: ${name}\n` +
      `Vehicle: ${vNum}\n` +
      `Type: ${vType}\n` +
      `Amount Paid: ₹${amt}\n\n` +
      `Location: https://maps.app.goo.gl/sxL4zJv9EDkGtxUr9\n\n` +
      `Thank you for your business.\n` +
      `We appreciate your support.`;

    const url = `https://wa.me/91${mobileNum}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url)
      .then(() => {
        Alert.alert('Saved & Sent!', 'WhatsApp opened with receipt.', [
          { text: 'OK', onPress: resetForm },
        ]);
      })
      .catch(() => {
        Alert.alert('Saved!', 'Record saved. Could not open WhatsApp.', [
          { text: 'OK', onPress: resetForm },
        ]);
      });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.screenTitle}>Add Wash</Text>
        <Text style={styles.screenSubtitle}>Fill in the details below</Text>

        <Text style={styles.label}>Customer Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Ravi Kumar"
          placeholderTextColor="#aaa"
          value={customerName}
          onChangeText={setCustomerName}
          autoCapitalize="words"
          returnKeyType="next"
        />

        <Text style={styles.label}>Vehicle Type</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Hatchback, Sedan, SUV, Auto"
          placeholderTextColor="#aaa"
          value={vehicleType}
          onChangeText={setVehicleType}
          returnKeyType="next"
        />

        <Text style={styles.label}>Vehicle Number</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. TS09AB1234"
          placeholderTextColor="#aaa"
          value={vehicleNumber}
          onChangeText={setVehicleNumber}
          autoCapitalize="characters"
          returnKeyType="next"
        />

        <Text style={styles.label}>Mobile Number</Text>
        <View style={styles.mobileRow}>
          <View style={styles.mobilePrefix}>
            <Text style={styles.mobilePrefixText}>+91</Text>
          </View>
          <TextInput
            style={[styles.input, styles.mobileInput]}
            placeholder="10-digit number"
            placeholderTextColor="#aaa"
            value={mobile}
            onChangeText={t => setMobile(t.replace(/\D/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            maxLength={10}
            returnKeyType="next"
          />
        </View>

        <Text style={styles.label}>Amount (₹)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 300"
          placeholderTextColor="#aaa"
          value={amount}
          onChangeText={t => setAmount(t.replace(/\D/g, ''))}
          keyboardType="numeric"
          returnKeyType="done"
        />

        <Text style={styles.label}>Payment</Text>
        <View style={styles.paymentRow}>
          <TouchableOpacity
            style={[styles.paymentBtn, paymentStatus === 'paid' && styles.paymentBtnPaid]}
            onPress={() => setPaymentStatus('paid')}
            activeOpacity={0.8}
          >
            <Text style={[styles.paymentBtnText, paymentStatus === 'paid' && styles.paymentBtnTextActive]}>
              ✅  Paid
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.paymentBtn, paymentStatus === 'pending' && styles.paymentBtnPending]}
            onPress={() => setPaymentStatus('pending')}
            activeOpacity={0.8}
          >
            <Text style={[styles.paymentBtnText, paymentStatus === 'pending' && styles.paymentBtnTextActive]}>
              ⏳  Pending
            </Text>
          </TouchableOpacity>
        </View>

        {amount.trim() !== '' && Number(amount) > 0 && (
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amountValue}>₹{amount}</Text>
            {paymentStatus === 'paid' && (
              <Text style={styles.whatsappHint}>WhatsApp receipt will open automatically</Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>
              {paymentStatus === 'paid' ? '💾  Save & Send WhatsApp' : '💾  Save Record'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9fa' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  screenTitle: { fontSize: 28, fontWeight: '800', color: '#1a1a1a', marginTop: 8 },
  screenSubtitle: { fontSize: 14, color: '#888', marginBottom: 28, marginTop: 4 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    marginBottom: 6,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    flex: 1,
  },
  mobileRow: { flexDirection: 'row', gap: 8 },
  mobilePrefix: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  mobilePrefixText: { fontSize: 16, color: '#555', fontWeight: '600' },
  mobileInput: { flex: 1 },
  paymentRow: { flexDirection: 'row', gap: 12 },
  paymentBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  paymentBtnPaid: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  paymentBtnPending: { backgroundColor: '#f0a500', borderColor: '#f0a500' },
  paymentBtnText: { fontSize: 15, fontWeight: '700', color: '#555' },
  paymentBtnTextActive: { color: '#fff' },
  amountCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  amountLabel: { fontSize: 13, color: '#888', fontWeight: '600' },
  amountValue: { fontSize: 36, fontWeight: '800', color: '#1a73e8', marginTop: 4 },
  whatsappHint: { fontSize: 12, color: '#25D366', marginTop: 6, fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#1a73e8',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
