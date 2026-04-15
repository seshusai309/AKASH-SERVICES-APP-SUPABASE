import * as Linking from 'expo-linking';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase, WashContact, WashRecord } from '@/utils/supabase';

const WHATSAPP_MESSAGE = (record: WashRecord, contactName?: string) =>
  `*AKASH WATER SERVICES*\n` +
  `Golagamudi, Opp. Vengamamba Daba\n\n` +
  `*Vehicle Wash Completed*\n\n` +
  `Customer: ${contactName ?? ''}\n` +
  `Vehicle: ${record.vehicle_number}\n` +
  `Type: ${record.vehicle_type ?? ''}\n` +
  `Amount Paid: ₹${record.amount}\n\n` +
  `Location: https://maps.app.goo.gl/sxL4zJv9EDkGtxUr9\n\n` +
  `Thank you for your business.\n` +
  `We appreciate your support.`;

type Props = {
  record: WashRecord | null;
  onClose: () => void;
  onUpdated: (updated: WashRecord) => void;
};

export default function WashDetailModal({ record, onClose, onUpdated }: Props) {
  const [contacts, setContacts] = useState<WashContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit amount
  const [editAmount, setEditAmount] = useState('');
  const [editingAmount, setEditingAmount] = useState(false);

  // Add contact sheet
  const [showAddContact, setShowAddContact] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'owner' | 'driver'>('owner');
  const [newPhone, setNewPhone] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  // Slide-up animation for sheet only
  const slideY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (record) {
      setEditAmount(String(record.amount));
      setEditingAmount(false);
      setShowAddContact(false);
      fetchContacts(record.id);
      // Slide sheet up
      slideY.setValue(600);
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 20,
      }).start();
    } else {
      setContacts([]);
    }
  }, [record?.id]);

  const fetchContacts = async (id: string) => {
    setLoadingContacts(true);
    const { data } = await supabase
      .from('wash_contacts')
      .select('*')
      .eq('wash_record_id', id)
      .order('created_at', { ascending: true });
    setContacts((data as WashContact[]) ?? []);
    setLoadingContacts(false);
  };

  const markAsPaid = () => {
    if (!record) return;
    Alert.alert('Mark as Paid', `Confirm marking ₹${record.amount} as paid?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm', onPress: async () => {
          setSaving(true);
          const { error } = await supabase
            .from('wash_records')
            .update({ payment_status: 'paid' })
            .eq('id', record.id);
          setSaving(false);
          if (error) { Alert.alert('Error', error.message); return; }
          onUpdated({ ...record, payment_status: 'paid' });
        },
      },
    ]);
  };

  const updateAmount = () => {
    if (!record) return;
    const newAmt = Number(editAmount);
    if (isNaN(newAmt) || newAmt <= 0) { Alert.alert('Invalid', 'Enter a valid amount.'); return; }
    Alert.alert('Update Amount', `Changing ₹${record.amount} → ₹${newAmt}.\n\nAre you sure?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, Update', style: 'destructive', onPress: async () => {
          setSaving(true);
          const { error } = await supabase
            .from('wash_records')
            .update({ amount: newAmt })
            .eq('id', record.id);
          setSaving(false);
          if (error) { Alert.alert('Error', error.message); return; }
          onUpdated({ ...record, amount: newAmt });
          setEditingAmount(false);
        },
      },
    ]);
  };

  const sendToContact = (contact: WashContact) => {
    if (!record) return;
    const msg = WHATSAPP_MESSAGE(record, contact.customer_name);
    Linking.openURL(`https://wa.me/91${contact.phone_number}?text=${encodeURIComponent(msg)}`);
  };

  const deleteContact = (contact: WashContact) => {
    Alert.alert(
      'Delete Contact',
      `Remove ${contact.customer_name} from this record?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            const { error } = await supabase
              .from('wash_contacts')
              .delete()
              .eq('id', contact.id);
            if (error) { Alert.alert('Error', error.message); return; }
            setContacts(prev => prev.filter(c => c.id !== contact.id));
          },
        },
      ]
    );
  };

  const saveAndSendContact = async () => {
    if (!record) return;
    if (!newName.trim()) { Alert.alert('Missing', 'Enter customer name.'); return; }
    if (!newPhone.trim() || newPhone.length < 10) { Alert.alert('Missing', 'Enter a valid 10-digit number.'); return; }

    setSavingContact(true);
    const { data, error } = await supabase
      .from('wash_contacts')
      .insert([{ wash_record_id: record.id, customer_name: newName.trim(), customer_type: newType, phone_number: newPhone.trim() }])
      .select()
      .single();
    setSavingContact(false);

    if (error) { Alert.alert('Error', error.message); return; }
    const saved = data as WashContact;
    setContacts(prev => [...prev, saved]);
    setShowAddContact(false);
    const msg = WHATSAPP_MESSAGE(record, saved.customer_name);
    Linking.openURL(`https://wa.me/91${saved.phone_number}?text=${encodeURIComponent(msg)}`);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <Modal visible={!!record} animationType="none" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideY }] }]}>
          <View style={s.handle} />

          {/* Add contact sub-sheet */}
          {showAddContact ? (
            <>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Send to Other Person</Text>
                <TouchableOpacity onPress={() => setShowAddContact(false)} style={s.closeBtn}>
                  <Text style={s.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.inputLabel}>Customer Name</Text>
              <TextInput style={s.input} placeholder="e.g. Ravi Kumar" placeholderTextColor="#aaa" value={newName} onChangeText={setNewName} autoCapitalize="words" />

              <Text style={s.inputLabel}>Type</Text>
              <View style={s.typeRow}>
                <TouchableOpacity style={[s.typeBtn, newType === 'owner' && s.typeBtnOwner]} onPress={() => setNewType('owner')} activeOpacity={0.8}>
                  <Text style={[s.typeBtnText, newType === 'owner' && s.typeBtnTextActive]}>👤  Owner</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.typeBtn, newType === 'driver' && s.typeBtnDriver]} onPress={() => setNewType('driver')} activeOpacity={0.8}>
                  <Text style={[s.typeBtnText, newType === 'driver' && s.typeBtnTextActive]}>🚘  Driver</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.inputLabel}>Phone Number</Text>
              <View style={s.phoneRow}>
                <View style={s.phonePrefix}><Text style={s.phonePrefixText}>+91</Text></View>
                <TextInput style={[s.input, { flex: 1 }]} placeholder="10-digit number" placeholderTextColor="#aaa" value={newPhone} onChangeText={t => setNewPhone(t.replace(/\D/g, '').slice(0, 10))} keyboardType="phone-pad" maxLength={10} />
              </View>

              <TouchableOpacity style={[s.primaryBtn, savingContact && s.btnDisabled]} onPress={saveAndSendContact} disabled={savingContact} activeOpacity={0.85}>
                {savingContact ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>💾  Save & Send WhatsApp</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Wash Details</Text>
                <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                  <Text style={s.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {record && (
                <>
                  <View style={[s.statusBadge, record.payment_status === 'paid' ? s.statusPaid : s.statusPending]}>
                    <Text style={s.statusText}>{record.payment_status === 'paid' ? '✅ Paid' : '⏳ Pending'}</Text>
                  </View>

                  <Row label="Customer" value={contacts[0]?.customer_name || '—'} />
                  <Row label="Vehicle" value={record.vehicle_number} />
                  <Row label="Type" value={record.vehicle_type || '—'} />
                  <Row label="Mobile" value={`+91 ${record.mobile_number}`} />
                  <Row label="Date" value={formatDate(record.created_at)} />

                  {/* Amount */}
                  <View style={s.amountRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.detailLabel}>Amount</Text>
                      {editingAmount
                        ? <TextInput style={s.amountInput} value={editAmount} onChangeText={t => setEditAmount(t.replace(/\D/g, ''))} keyboardType="numeric" autoFocus />
                        : <Text style={s.amountValue}>₹{record.amount}</Text>
                      }
                    </View>
                    {editingAmount ? (
                      <View style={s.amountBtns}>
                        <TouchableOpacity style={s.amountSave} onPress={updateAmount} disabled={saving}>
                          <Text style={s.amountSaveText}>{saving ? '...' : 'Save'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.amountCancel} onPress={() => { setEditingAmount(false); setEditAmount(String(record.amount)); }}>
                          <Text style={s.amountCancelText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={s.editBtn} onPress={() => setEditingAmount(true)}>
                        <Text style={s.editBtnText}>✏️ Edit</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {record.payment_status === 'pending' && (
                    <TouchableOpacity style={[s.primaryBtn, saving && s.btnDisabled]} onPress={markAsPaid} disabled={saving} activeOpacity={0.85}>
                      {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>✅  Mark as Paid</Text>}
                    </TouchableOpacity>
                  )}

                  {/* Contacts */}
                  <View style={s.contactsHeader}>
                    <Text style={s.contactsTitle}>Other Contacts</Text>
                    <TouchableOpacity style={s.addContactBtn} onPress={() => { setNewName(''); setNewType('owner'); setNewPhone(''); setShowAddContact(true); }} activeOpacity={0.8}>
                      <Text style={s.addContactBtnText}>➕ Send to Other Person</Text>
                    </TouchableOpacity>
                  </View>

                  {loadingContacts
                    ? <ActivityIndicator color="#1a73e8" style={{ marginVertical: 12 }} />
                    : contacts.length === 0
                      ? <Text style={s.noContacts}>No other contacts yet.</Text>
                      : contacts.map(c => (
                        <View key={c.id} style={s.contactCard}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.contactName}>{c.customer_name}</Text>
                            <View style={s.contactMeta}>
                              <View style={[s.typeBadge, c.customer_type === 'owner' ? s.typeBadgeOwner : s.typeBadgeDriver]}>
                                <Text style={s.typeBadgeText}>{c.customer_type === 'owner' ? '👤 Owner' : '🚘 Driver'}</Text>
                              </View>
                              <Text style={s.contactPhone}>+91 {c.phone_number}</Text>
                            </View>
                          </View>
                          <View style={s.contactActions}>
                            <TouchableOpacity style={s.waBtn} onPress={() => sendToContact(c)} activeOpacity={0.8}>
                              <Text style={s.waBtnText}>📱 Send</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.deleteBtn} onPress={() => deleteContact(c)} activeOpacity={0.8}>
                              <Text style={s.deleteBtnText}>🗑️</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                  }
                </>
              )}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48, maxHeight: '92%' },
  handle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  closeBtn: { padding: 4 },
  closeBtnText: { fontSize: 18, color: '#888', fontWeight: '700' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  statusPaid: { backgroundColor: '#e6f9f0' },
  statusPending: { backgroundColor: '#fff8e1' },
  statusText: { fontSize: 14, fontWeight: '700', color: '#333' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  detailLabel: { fontSize: 13, color: '#888', fontWeight: '600' },
  detailValue: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', flex: 1, textAlign: 'right', marginLeft: 16 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  amountValue: { fontSize: 26, fontWeight: '800', color: '#1a73e8', marginTop: 2 },
  amountInput: { fontSize: 26, fontWeight: '800', color: '#1a73e8', borderBottomWidth: 2, borderBottomColor: '#1a73e8', minWidth: 100, paddingVertical: 2 },
  amountBtns: { flexDirection: 'row', gap: 8 },
  amountSave: { backgroundColor: '#1a73e8', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  amountSaveText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  amountCancel: { backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  amountCancelText: { color: '#555', fontWeight: '700', fontSize: 13 },
  editBtn: { backgroundColor: '#f0f4ff', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  editBtnText: { color: '#1a73e8', fontWeight: '700', fontSize: 13 },
  primaryBtn: { backgroundColor: '#1a73e8', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  contactsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  contactsTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
  addContactBtn: { backgroundColor: '#e3f0ff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  addContactBtnText: { color: '#1a73e8', fontSize: 13, fontWeight: '700' },
  noContacts: { fontSize: 13, color: '#aaa', textAlign: 'center', paddingVertical: 12 },
  contactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  contactName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  contactMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  typeBadgeOwner: { backgroundColor: '#e3f0ff' },
  typeBadgeDriver: { backgroundColor: '#e8f5e9' },
  typeBadgeText: { fontSize: 11, fontWeight: '700', color: '#333' },
  contactPhone: { fontSize: 12, color: '#888' },
  contactActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  waBtn: { backgroundColor: '#e8f5e9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  waBtnText: { color: '#2e7d32', fontSize: 13, fontWeight: '700' },
  deleteBtn: { backgroundColor: '#fce8e8', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  deleteBtnText: { fontSize: 15 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#555', marginTop: 16, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 14, fontSize: 16, color: '#1a1a1a', borderWidth: 1.5, borderColor: '#e0e0e0' },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#f8f9fa', alignItems: 'center', borderWidth: 1.5, borderColor: '#e0e0e0' },
  typeBtnOwner: { backgroundColor: '#e3f0ff', borderColor: '#1a73e8' },
  typeBtnDriver: { backgroundColor: '#e8f5e9', borderColor: '#2e7d32' },
  typeBtnText: { fontSize: 15, fontWeight: '700', color: '#555' },
  typeBtnTextActive: { color: '#1a1a1a' },
  phoneRow: { flexDirection: 'row', gap: 8 },
  phonePrefix: { backgroundColor: '#f8f9fa', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1.5, borderColor: '#e0e0e0' },
  phonePrefixText: { fontSize: 16, color: '#555', fontWeight: '600' },
});
