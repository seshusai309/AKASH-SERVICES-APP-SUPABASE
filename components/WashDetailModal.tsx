import { C } from '@/constants/theme';
import { supabase, WashContact, WashRecord } from '@/utils/supabase';
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

const WHATSAPP_MESSAGE = (record: WashRecord, contactName?: string, customerType?: string) =>
  `*AKASH WATER SERVICES*\n` +
  `Golagamudi Road, Opp. Vengamamba Daba\n\n` +
  `*Vehicle Wash Completed*\n\n` +
  `${customerType ? customerType.charAt(0).toUpperCase() + customerType.slice(1) + ': ' : 'Customer: '}${contactName ?? ''}\n` +
  `Vehicle: ${record.vehicle_number}\n` +
  `Service: ${record.vehicle_type ?? ''}\n` +
  `Amount Paid: ₹${record.amount}\n\n` +
  `Location: https://maps.app.goo.gl/sxL4zJv9EDkGtxUr9\n\n` +
  `Thanks for coming.\n` +
  `Make sure to visit us again!`;

type Props = {
  record: WashRecord | null;
  onClose: () => void;
  onUpdated: (updated: WashRecord) => void;
};

export default function WashDetailModal({ record, onClose, onUpdated }: Props) {
  const [contacts, setContacts] = useState<WashContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editAmount, setEditAmount] = useState('');
  const [editingAmount, setEditingAmount] = useState(false);

  const [showAddContact, setShowAddContact] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'owner' | 'driver'>('owner');
  const [newPhone, setNewPhone] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  // Slide-up animation — sheet only, overlay is static
  const slideY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (record) {
      setEditAmount(String(record.amount));
      setEditingAmount(false);
      setShowAddContact(false);
      fetchContacts(record.id);
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
            .from('wash_records').update({ payment_status: 'paid' }).eq('id', record.id);
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
            .from('wash_records').update({ amount: newAmt }).eq('id', record.id);
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
    const msg = WHATSAPP_MESSAGE(record, contact.customer_name, contact.customer_type);
    Linking.openURL(`https://wa.me/91${contact.phone_number}?text=${encodeURIComponent(msg)}`);
  };

  const deleteContact = (contact: WashContact) => {
    Alert.alert('Delete Contact', `Remove ${contact.customer_name} from this record?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('wash_contacts').delete().eq('id', contact.id);
          if (error) { Alert.alert('Error', error.message); return; }
          setContacts(prev => prev.filter(c => c.id !== contact.id));
        },
      },
    ]);
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
    const msg = WHATSAPP_MESSAGE(record, saved.customer_name, saved.customer_type);
    Linking.openURL(`https://wa.me/91${saved.phone_number}?text=${encodeURIComponent(msg)}`);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <Modal visible={!!record} animationType="none" transparent onRequestClose={onClose}>
      {/* Static dark overlay */}
      <View style={s.overlay}>
        {/* Animated sheet only */}
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideY }] }]}>
          <View style={s.handle} />

          {showAddContact ? (
            /* ── Add / Send to Other Person ── */
            <>
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>Send to Other Person</Text>
                <TouchableOpacity onPress={() => setShowAddContact(false)} style={s.closeBtn}>
                  <Text style={s.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.inputLabel}>Customer Name</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Ravi Kumar"
                placeholderTextColor={C.textMuted}
                value={newName}
                onChangeText={setNewName}
                autoCapitalize="words"
              />

              <Text style={s.inputLabel}>Type</Text>
              <View style={s.typeRow}>
                <TouchableOpacity
                  style={[s.typeBtn, newType === 'owner' && s.typeBtnOwner]}
                  onPress={() => setNewType('owner')}
                  activeOpacity={0.8}
                >
                  <Text style={[s.typeBtnText, newType === 'owner' && s.typeBtnTextActive]}>Owner</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.typeBtn, newType === 'driver' && s.typeBtnDriver]}
                  onPress={() => setNewType('driver')}
                  activeOpacity={0.8}
                >
                  <Text style={[s.typeBtnText, newType === 'driver' && s.typeBtnTextActiveDriver]}>Driver</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.inputLabel}>Phone Number</Text>
              <View style={s.phoneRow}>
                <View style={s.phonePrefix}><Text style={s.phonePrefixText}>+91</Text></View>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  placeholder="10-digit number"
                  placeholderTextColor={C.textMuted}
                  value={newPhone}
                  onChangeText={t => setNewPhone(t.replace(/\D/g, '').slice(0, 10))}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              <TouchableOpacity
                style={[s.primaryBtn, savingContact && s.btnDisabled]}
                onPress={saveAndSendContact}
                disabled={savingContact}
                activeOpacity={0.85}
              >
                {savingContact
                  ? <ActivityIndicator color={C.white} />
                  : <Text style={s.primaryBtnText}>Save & Send WhatsApp</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            /* ── Main details view ── */
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>Wash Details</Text>
                <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                  <Text style={s.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {record && (
                <>
                  {/* Status badge */}
                  <View style={[s.statusBadge, record.payment_status === 'paid' ? s.statusPaid : s.statusPending]}>
                    <Text style={[s.statusText, record.payment_status === 'paid' ? s.statusTextPaid : s.statusTextPending]}>
                      {record.payment_status === 'paid' ? 'Paid' : 'Pending'}
                    </Text>
                  </View>

                  <Row label="Customer" value={contacts[0]?.customer_name || '—'} />
                  <Row label="Vehicle" value={record.vehicle_number} />
                  <Row label="Type" value={record.vehicle_type || '—'} />
                  <Row label="Mobile" value={`+91 ${record.mobile_number}`} />
                  <Row label="Date" value={formatDate(record.created_at)} />

                  {/* Amount row with edit */}
                  <View style={s.amountRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.detailLabel}>Amount</Text>
                      {editingAmount
                        ? <TextInput
                            style={s.amountInput}
                            value={editAmount}
                            onChangeText={t => setEditAmount(t.replace(/\D/g, ''))}
                            keyboardType="numeric"
                            autoFocus
                          />
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
                        <Text style={s.editBtnText}>Edit</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {record.payment_status === 'pending' && (
                    <TouchableOpacity
                      style={[s.primaryBtn, saving && s.btnDisabled]}
                      onPress={markAsPaid}
                      disabled={saving}
                      activeOpacity={0.85}
                    >
                      {saving
                        ? <ActivityIndicator color={C.white} />
                        : <Text style={s.primaryBtnText}>Mark as Paid</Text>
                      }
                    </TouchableOpacity>
                  )}

                  {/* Contacts */}
                  <View style={s.contactsHeader}>
                    <Text style={s.contactsTitle}>Contacts</Text>
                    <TouchableOpacity
                      style={s.addContactBtn}
                      onPress={() => { setNewName(''); setNewType('owner'); setNewPhone(''); setShowAddContact(true); }}
                      activeOpacity={0.8}
                    >
                      <Text style={s.addContactBtnText}>+ Send to Other</Text>
                    </TouchableOpacity>
                  </View>

                  {loadingContacts
                    ? <ActivityIndicator color={C.accent} style={{ marginVertical: 12 }} />
                    : contacts.length === 0
                      ? <Text style={s.noContacts}>No contacts yet.</Text>
                      : contacts.map(c => (
                        <View key={c.id} style={s.contactCard}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.contactName}>{c.customer_name}</Text>
                            <View style={s.contactMeta}>
                              <View style={[s.typePill, c.customer_type === 'owner' ? s.typePillOwner : s.typePillDriver]}>
                                <Text style={[s.typePillText, c.customer_type === 'owner' ? s.typePillTextOwner : s.typePillTextDriver]}>
                                  {c.customer_type === 'owner' ? 'Owner' : 'Driver'}
                                </Text>
                              </View>
                              <Text style={s.contactPhone}>+91 {c.phone_number}</Text>
                            </View>
                          </View>
                          <View style={s.contactActions}>
                            <TouchableOpacity style={s.waBtn} onPress={() => sendToContact(c)} activeOpacity={0.8}>
                              <Text style={s.waBtnText}>Send</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.deleteBtn} onPress={() => deleteContact(c)} activeOpacity={0.8}>
                              <Text style={s.deleteBtnText}>Del</Text>
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 52,
    maxHeight: '92%',
  },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: C.primary },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 16, color: C.textSec, fontWeight: '800' },

  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  statusPaid: { backgroundColor: C.successBg },
  statusPending: { backgroundColor: C.dangerBg },
  statusText: { fontSize: 13, fontWeight: '800' },
  statusTextPaid: { color: C.success },
  statusTextPending: { color: C.danger },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  detailLabel: { fontSize: 13, color: C.textMuted, fontWeight: '600' },
  detailValue: { fontSize: 15, fontWeight: '700', color: C.primary, flex: 1, textAlign: 'right', marginLeft: 16 },

  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  amountValue: { fontSize: 28, fontWeight: '800', color: C.accent, marginTop: 2 },
  amountInput: {
    fontSize: 28,
    fontWeight: '800',
    color: C.accent,
    borderBottomWidth: 2,
    borderBottomColor: C.accent,
    minWidth: 100,
    paddingVertical: 2,
  },
  amountBtns: { flexDirection: 'row', gap: 8 },
  amountSave: { backgroundColor: C.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  amountSaveText: { color: C.white, fontWeight: '700', fontSize: 13 },
  amountCancel: { backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.border },
  amountCancelText: { color: C.textSec, fontWeight: '700', fontSize: 13 },
  editBtn: { backgroundColor: '#EBF5FF', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  editBtnText: { color: C.accent, fontWeight: '700', fontSize: 13 },

  primaryBtn: { backgroundColor: C.accent, borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  btnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: C.white, fontSize: 16, fontWeight: '800' },

  contactsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  contactsTitle: { fontSize: 15, fontWeight: '800', color: C.primary },
  addContactBtn: { backgroundColor: '#EBF5FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  addContactBtnText: { color: C.accent, fontSize: 13, fontWeight: '700' },
  noContacts: { fontSize: 13, color: C.textMuted, textAlign: 'center', paddingVertical: 12 },

  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  contactName: { fontSize: 15, fontWeight: '700', color: C.primary },
  contactMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  typePillOwner: { backgroundColor: '#EBF5FF' },
  typePillDriver: { backgroundColor: C.successBg },
  typePillText: { fontSize: 11, fontWeight: '700' },
  typePillTextOwner: { color: C.accent },
  typePillTextDriver: { color: C.success },
  contactPhone: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  contactActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  waBtn: { backgroundColor: C.successBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  waBtnText: { color: C.success, fontSize: 13, fontWeight: '700' },
  deleteBtn: { backgroundColor: C.dangerBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  deleteBtnText: { color: C.danger, fontSize: 13, fontWeight: '700' },

  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.textSec,
    marginTop: 16,
    marginBottom: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
    color: C.primary,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
  },
  typeBtnOwner: { backgroundColor: '#EBF5FF', borderColor: C.accent },
  typeBtnDriver: { backgroundColor: C.successBg, borderColor: C.success },
  typeBtnText: { fontSize: 15, fontWeight: '700', color: C.textSec },
  typeBtnTextActive: { color: C.accent },
  typeBtnTextActiveDriver: { color: C.success },
  phoneRow: { flexDirection: 'row', gap: 8 },
  phonePrefix: {
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
  },
  phonePrefixText: { fontSize: 16, color: C.textSec, fontWeight: '700' },
});
