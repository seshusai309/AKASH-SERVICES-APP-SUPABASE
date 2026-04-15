import { C } from '@/constants/theme';
import { supabase } from '@/utils/supabase';
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

export default function AddWashScreen() {
  const [contactName, setContactName] = useState('');
  const [contactType, setContactType] = useState<'owner' | 'driver'>('owner');
  const [contactPhone, setContactPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setContactName('');
    setContactType('owner');
    setContactPhone('');
    setVehicleType('');
    setVehicleNumber('');
    setAmount('');
    setPaymentStatus('paid');
  };

  const handleSave = async () => {
    if (!contactName.trim()) { Alert.alert('Missing', 'Enter customer name.'); return; }
    if (!contactPhone.trim() || contactPhone.length < 10) { Alert.alert('Missing', 'Enter a valid 10-digit phone number.'); return; }
    if (!vehicleType.trim()) { Alert.alert('Missing', 'Enter vehicle type.'); return; }
    if (!vehicleNumber.trim()) { Alert.alert('Missing', 'Enter the vehicle number.'); return; }
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) { Alert.alert('Missing', 'Enter a valid amount.'); return; }

    setSaving(true);

    const { data: washData, error: washError } = await supabase
      .from('wash_records')
      .insert([{
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        vehicle_type: vehicleType.trim(),
        mobile_number: contactPhone.trim(),
        amount: Number(amount),
        payment_status: paymentStatus,
      }])
      .select()
      .single();

    if (washError || !washData) {
      setSaving(false);
      Alert.alert('Error', 'Could not save.\n\n' + washError?.message);
      return;
    }

    await supabase.from('wash_contacts').insert([{
      wash_record_id: washData.id,
      customer_name: contactName.trim(),
      customer_type: contactType,
      phone_number: contactPhone.trim(),
    }]);

    setSaving(false);

    if (paymentStatus === 'paid') {
      sendWhatsApp(contactName.trim(), vehicleNumber.trim().toUpperCase(), vehicleType.trim(), Number(amount), contactPhone.trim());
    } else {
      Alert.alert('Saved!', 'Wash record added. Payment is pending.');
      resetForm();
    }
  };

  const sendWhatsApp = (name: string, vNum: string, vType: string, amt: number, phone: string) => {
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

    Linking.openURL(`https://wa.me/91${phone}?text=${encodeURIComponent(message)}`)
      .then(() => Alert.alert('Saved & Sent!', 'WhatsApp opened with receipt.', [{ text: 'OK', onPress: resetForm }]))
      .catch(() => Alert.alert('Saved!', 'Record saved. Could not open WhatsApp.', [{ text: 'OK', onPress: resetForm }]));
  };

  return (
    <>
      <SafeAreaView style={{ backgroundColor: C.primary }} edges={['top']} />
      <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* Page Header */}
        <View style={s.pageHeader}>
          <Text style={s.pageTitle}>Add Wash</Text>
          <Text style={s.pageSub}>Fill in the details below</Text>
        </View>

        <Text style={s.label}>Customer Name</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. Ravi Kumar"
          placeholderTextColor={C.textMuted}
          value={contactName}
          onChangeText={setContactName}
          autoCapitalize="words"
          returnKeyType="next"
        />

        <Text style={s.label}>Customer Type</Text>
        <View style={s.toggleRow}>
          <TouchableOpacity
            style={[s.toggleBtn, contactType === 'owner' && s.toggleBtnOwner]}
            onPress={() => setContactType('owner')}
            activeOpacity={0.8}
          >
            <Text style={[s.toggleBtnText, contactType === 'owner' && s.toggleBtnTextActive]}>Owner</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, contactType === 'driver' && s.toggleBtnDriver]}
            onPress={() => setContactType('driver')}
            activeOpacity={0.8}
          >
            <Text style={[s.toggleBtnText, contactType === 'driver' && s.toggleBtnTextActive]}>Driver</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.label}>Phone Number</Text>
        <View style={s.phoneRow}>
          <View style={s.phonePrefix}><Text style={s.phonePrefixText}>+91</Text></View>
          <TextInput
            style={[s.input, { flex: 1 }]}
            placeholder="10-digit number"
            placeholderTextColor={C.textMuted}
            value={contactPhone}
            onChangeText={t => setContactPhone(t.replace(/\D/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            maxLength={10}
            returnKeyType="next"
          />
        </View>

        <Text style={s.label}>Vehicle Type</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. Hatchback, Sedan, SUV, Tractor"
          placeholderTextColor={C.textMuted}
          value={vehicleType}
          onChangeText={setVehicleType}
          returnKeyType="next"
        />

        <Text style={s.label}>Vehicle Number</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. TS09AB1234"
          placeholderTextColor={C.textMuted}
          value={vehicleNumber}
          onChangeText={setVehicleNumber}
          autoCapitalize="characters"
          returnKeyType="next"
        />

        <Text style={s.label}>Amount (₹)</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. 300"
          placeholderTextColor={C.textMuted}
          value={amount}
          onChangeText={t => setAmount(t.replace(/\D/g, ''))}
          keyboardType="numeric"
          returnKeyType="done"
        />

        <Text style={s.label}>Payment</Text>
        <View style={s.toggleRow}>
          <TouchableOpacity
            style={[s.toggleBtn, paymentStatus === 'paid' && s.toggleBtnPaid]}
            onPress={() => setPaymentStatus('paid')}
            activeOpacity={0.8}
          >
            <Text style={[s.toggleBtnText, paymentStatus === 'paid' && s.toggleBtnTextActive]}>Paid</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, paymentStatus === 'pending' && s.toggleBtnPending]}
            onPress={() => setPaymentStatus('pending')}
            activeOpacity={0.8}
          >
            <Text style={[s.toggleBtnText, paymentStatus === 'pending' && s.toggleBtnTextActivePending]}>Pending</Text>
          </TouchableOpacity>
        </View>

        {amount.trim() !== '' && Number(amount) > 0 && (
          <View style={s.previewCard}>
            <Text style={s.previewLabel}>Amount</Text>
            <Text style={s.previewValue}>₹{amount}</Text>
            {paymentStatus === 'paid' && (
              <Text style={s.whatsappHint}>WhatsApp receipt will open automatically</Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color={C.white} />
            : <Text style={s.saveBtnText}>{paymentStatus === 'paid' ? 'Save & Send WhatsApp' : 'Save Record'}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 16, paddingBottom: 56 },
  pageHeader: {
    backgroundColor: C.primary,
    marginHorizontal: -16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    marginBottom: 8,
  },
  pageTitle: { fontSize: C.fontSize.xxxl, fontWeight: '800', color: C.white },
  pageSub: { fontSize: C.fontSize.md, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  label: {
    fontSize: C.fontSize.xs,
    fontWeight: '800',
    color: C.textSec,
    marginBottom: 7,
    marginTop: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: C.fontSize.md,
    fontWeight: '600',
    color: C.primary,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  phoneRow: { flexDirection: 'row', gap: 8 },
  phonePrefix: {
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
  },
  phonePrefixText: { fontSize: C.fontSize.md, color: C.textSec, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.card,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
  },
  toggleBtnOwner: { backgroundColor: '#EBF5FF', borderColor: C.accent },
  toggleBtnDriver: { backgroundColor: C.successBg, borderColor: C.success },
  toggleBtnPaid: { backgroundColor: C.accent, borderColor: C.accent },
  toggleBtnPending: { backgroundColor: C.warning, borderColor: C.warning },
  toggleBtnText: { fontSize: C.fontSize.md, fontWeight: '700', color: C.textSec },
  toggleBtnTextActive: { color: C.primary },
  toggleBtnTextActivePending: { color: C.primary },
  previewCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 20,
    marginTop: 22,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
  },
  previewLabel: { fontSize: C.fontSize.sm, color: C.textMuted, fontWeight: '600' },
  previewValue: { fontSize: 42, fontWeight: '800', color: C.accent, marginTop: 4 },
  whatsappHint: { fontSize: C.fontSize.xs, color: '#25D366', marginTop: 8, fontWeight: '700' },
  saveBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: { color: C.white, fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
});
