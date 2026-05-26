import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { supabase } from '../services/supabase';
import colors from '../components/colors';
import { t } from '../services/i18n';

export default function StaffScreen({ onBack, lang }) {
  const [staffList, setStaffList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form fields
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState('watchman');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [baseSalary, setBaseSalary] = useState('18000');
  const [bankAccount, setBankAccount] = useState('');
  const [isActive, setIsActive] = useState(true);

  const roles = [
    { label: t('security_guard', lang), value: 'watchman' },
    { label: t('cleaning_staff', lang), value: 'peon' },
    { label: t('bus_driver', lang), value: 'bus_driver' },
    { label: t('helper', lang), value: 'helper' },
    { label: t('other', lang), value: 'other' }
  ];

  // Load staff on screen open
  useEffect(() => {
    fetchStaff();
  }, []);

  async function fetchStaff() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaffList(data || []);
    } catch (error) {
      console.log('Error fetching staff:', error.message);
    } finally {
      setLoading(false);
    }
  }

  const openAddForm = () => {
    setIsEditing(false);
    setEditingStaff(null);
    setFullName('');
    setMobile('');
    setRole('watchman');
    setDateOfBirth('1985-01-01');
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setBaseSalary('18000');
    setBankAccount('');
    setIsActive(true);
    setShowForm(true);
  };

  const openEditForm = (staff) => {
    setIsEditing(true);
    setEditingStaff(staff);
    setFullName(staff.full_name || '');
    setMobile(staff.mobile || '');
    setRole(staff.role || 'watchman');
    setDateOfBirth(staff.date_of_birth || '');
    setJoiningDate(staff.joining_date || '');
    setBaseSalary((staff.base_salary || 18000).toString());
    setBankAccount(staff.bank_account || '');
    setIsActive(staff.is_active !== false);
    setShowForm(true);
  };

  async function saveStaff() {
    if (!fullName || !mobile || !joiningDate) {
      Alert.alert(t('error', lang), 'Please fill in Name, Phone, and Joining Date.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && editingStaff) {
        // --- UPDATE STAFF ---
        const { error: updateError } = await supabase
          .from('staff')
          .update({
            full_name: fullName.trim(),
            mobile: mobile.trim(),
            role: role,
            date_of_birth: dateOfBirth || null,
            joining_date: joiningDate,
            base_salary: parseFloat(baseSalary) || 18000,
            bank_account: bankAccount.trim(),
            is_active: isActive
          })
          .eq('staff_id', editingStaff.staff_id);

        if (updateError) throw updateError;
        Alert.alert(t('success', lang), 'Staff updated successfully!');
      } else {
        // --- INSERT NEW STAFF ---
        // 1. Get next staff ID
        const { data: currentStaff, error: fetchErr } = await supabase
          .from('staff')
          .select('staff_id');
        if (fetchErr) throw fetchErr;

        // Generate safe next index
        const nextIdx = (currentStaff || []).length + 1;
        const nextId = `STF_${String(nextIdx).padStart(5, '0')}`;

        const { error: insertError } = await supabase
          .from('staff')
          .insert([
            {
              staff_id: nextId,
              school_id: 'SCH_MH_27430012',
              full_name: fullName.trim(),
              mobile: mobile.trim(),
              role: role,
              date_of_birth: dateOfBirth || null,
              joining_date: joiningDate,
              base_salary: parseFloat(baseSalary) || 18000,
              bank_account: bankAccount.trim(),
              is_active: isActive,
              created_at: new Date()
            }
          ]);

        if (insertError) throw insertError;
        Alert.alert(t('success', lang), 'Staff added successfully!');
      }

      setShowForm(false);
      setEditingStaff(null);
      fetchStaff();
    } catch (error) {
      Alert.alert(t('error', lang), error.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteStaff() {
    if (!editingStaff) return;

    Alert.alert(
      t('delete', lang) + ' ' + t('staff', lang),
      `Are you sure you want to delete ${editingStaff.full_name} permanently? This will remove their salary records.`,
      [
        { text: t('cancel', lang), style: 'cancel' },
        {
          text: t('delete', lang),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Delete staff attendance logs first
              await supabase.from('staff_attendance').delete().eq('person_id', editingStaff.staff_id);
              
              // Clear staff driver links in buses
              await supabase.from('buses').update({ driver_id: null }).eq('driver_id', editingStaff.staff_id);

              const { error } = await supabase
                .from('staff')
                .delete()
                .eq('staff_id', editingStaff.staff_id);

              if (error) throw error;
              Alert.alert(t('success', lang), 'Staff deleted successfully.');
              setShowForm(false);
              setEditingStaff(null);
              fetchStaff();
            } catch (error) {
              Alert.alert(t('error', lang), error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }

  const renderForm = () => (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>
        {isEditing ? t('edit_staff_details', lang) : t('add_new_staff', lang)}
      </Text>

      <Text style={styles.sectionDividerText}>👤 {t('full_name', lang)}</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Ramesh Yadav"
        value={fullName}
        onChangeText={setFullName}
        placeholderTextColor={colors.gray}
      />

      <Text style={styles.label}>{t('phone', lang)} *</Text>
      <TextInput
        style={styles.input}
        placeholder="98XXXXXXXX"
        value={mobile}
        onChangeText={setMobile}
        keyboardType="phone-pad"
        placeholderTextColor={colors.gray}
      />

      <Text style={styles.label}>{t('role', lang)}</Text>
      <View style={styles.rolePickerRow}>
        {roles.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[styles.roleChip, role === r.value && { backgroundColor: colors.teal }]}
            onPress={() => setRole(r.value)}
          >
            <Text style={[styles.roleChipText, role === r.value && { color: colors.white }]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionDividerText}>🎓 {t('base_salary', lang)} & {t('settings', lang)}</Text>

      <Text style={styles.label}>{t('base_salary', lang)} (₹)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 18000"
        value={baseSalary}
        onChangeText={setBaseSalary}
        keyboardType="numeric"
        placeholderTextColor={colors.gray}
      />

      <Text style={styles.label}>{t('bank_account', lang)}</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., SBI A/C XXXXXXXXXX"
        value={bankAccount}
        onChangeText={setBankAccount}
        placeholderTextColor={colors.gray}
      />

      <Text style={styles.label}>{t('date_of_birth', lang)} (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        placeholder="1982-11-05"
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        placeholderTextColor={colors.gray}
      />

      <Text style={styles.label}>{t('joining_date', lang)} (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        placeholder="2020-01-10"
        value={joiningDate}
        onChangeText={setJoiningDate}
        placeholderTextColor={colors.gray}
      />

      <View style={styles.statusToggleRow}>
        <Text style={styles.label}>{t('active_status', lang)}</Text>
        <TouchableOpacity
          style={[styles.statusToggleBtn, isActive ? { backgroundColor: colors.green } : { backgroundColor: colors.gray }]}
          onPress={() => setIsActive(!isActive)}
        >
          <Text style={styles.statusToggleText}>
            {isActive ? t('active', lang) : t('inactive', lang)}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.orange }]}
        onPress={saveStaff}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>
          {loading ? t('loading', lang) : (isEditing ? t('save_changes', lang) : t('add_new_staff', lang))}
        </Text>
      </TouchableOpacity>

      {isEditing && (
        <TouchableOpacity
          style={[styles.deleteButton, { marginTop: 10 }]}
          onPress={deleteStaff}
          disabled={loading}
        >
          <Text style={styles.deleteButtonText}>🗑️ {t('delete', lang)} {t('staff', lang)}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.cancelButton, { marginTop: 10 }]}
        onPress={() => {
          setShowForm(false);
          setEditingStaff(null);
        }}
      >
        <Text style={styles.cancelButtonText}>{t('cancel', lang)}</Text>
      </TouchableOpacity>
    </View>
  );

  const getRoleLabel = (roleVal) => {
    const found = roles.find(r => r.value === roleVal);
    return found ? found.label : roleVal.toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('manage_staff', lang)}</Text>
        <TouchableOpacity
          onPress={openAddForm}
          style={[styles.addButton, { backgroundColor: colors.teal }]}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Add Staff Form (Only when adding new, not inline editing) */}
        {showForm && !isEditing && renderForm()}

        {/* Search Bar */}
        <TextInput
          style={styles.searchInput}
          placeholder={t('search_placeholder', lang)}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.gray}
        />

        <Text style={styles.listTitle}>{t('current_staff', lang)} ({staffList.length})</Text>

        {loading && staffList.length === 0 ? (
          <ActivityIndicator size="large" color={colors.teal} style={{ marginTop: 25 }} />
        ) : (
          (() => {
            const filteredStaff = staffList.filter(s => {
              const nameMatch = (s.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
              const phoneMatch = (s.mobile || '').includes(searchQuery);
              const roleMatch = (s.role || '').toLowerCase().includes(searchQuery.toLowerCase());
              return nameMatch || phoneMatch || roleMatch;
            });

            return (
              <View style={{ paddingHorizontal: 20 }}>
                {filteredStaff.map((staff) => (
                  <View key={staff.staff_id}>
                    <View style={styles.staffCard}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.staffName}>{staff.full_name}</Text>
                          <Text style={styles.staffRole}>💼 {getRoleLabel(staff.role)}</Text>
                        </View>
                        <View style={[
                          styles.statusBadge,
                          staff.is_active !== false ? { backgroundColor: colors.green + '20' } : { backgroundColor: colors.gray + '25' }
                        ]}>
                          <Text style={[
                            styles.statusText,
                            staff.is_active !== false ? { color: colors.green } : { color: colors.gray }
                          ]}>
                            {staff.is_active !== false ? t('active', lang) : t('inactive', lang)}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.staffDetail}>📞 {staff.mobile}</Text>
                      <Text style={styles.staffDetail}>ID: {staff.staff_id}  |  💰 ₹{staff.base_salary} / month</Text>
                      {staff.bank_account && <Text style={styles.staffDetail}>🏦 {staff.bank_account}</Text>}

                      <TouchableOpacity
                        style={styles.cardEditBtn}
                        onPress={() => openEditForm(staff)}
                      >
                        <Text style={styles.cardEditBtnText}>✏️ {t('edit', lang)}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Inline Form under the edited card */}
                    {showForm && isEditing && editingStaff && editingStaff.staff_id === staff.staff_id && (
                      <View style={{ marginBottom: 15, marginTop: -8 }}>
                        {renderForm()}
                      </View>
                    )}
                  </View>
                ))}

                {filteredStaff.length === 0 && searchQuery.length > 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>🔍</Text>
                    <Text style={styles.emptyText}>No staff matches found</Text>
                  </View>
                )}
              </View>
            );
          })()
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: colors.text },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  addButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  addButtonText: { fontSize: 24, color: colors.white, fontWeight: 'bold' },
  formCard: { backgroundColor: colors.white, marginVertical: 15, padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, borderWidth: 1, borderColor: colors.lightGray },
  formTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 15 },
  label: { fontSize: 14, color: colors.text, marginBottom: 5, fontWeight: '500' },
  input: { backgroundColor: colors.lightGray, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 8, marginBottom: 15, fontSize: 14, color: colors.text },
  rolePickerRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  roleChip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.lightGray, borderRadius: 15, marginRight: 8, marginBottom: 8 },
  roleChipText: { fontSize: 12, color: colors.text },
  saveButton: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  deleteButton: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', backgroundColor: '#E74C3C' },
  deleteButtonText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  cancelButton: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: colors.lightGray },
  cancelButtonText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  searchInput: { backgroundColor: colors.white, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 10, marginHorizontal: 20, marginBottom: 10, borderWidth: 1, borderColor: colors.lightGray, fontSize: 14, color: colors.text, marginTop: 15 },
  listTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginHorizontal: 20, marginBottom: 15 },
  staffCard: { backgroundColor: colors.white, marginBottom: 15, padding: 15, borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, borderWidth: 1, borderColor: colors.lightGray },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: colors.lightGray, paddingBottom: 8, marginBottom: 8 },
  staffName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  staffRole: { fontSize: 13, color: colors.teal, marginTop: 2, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 9, fontWeight: 'bold' },
  staffDetail: { fontSize: 13, color: colors.text, marginTop: 4 },
  cardEditBtn: { marginTop: 12, backgroundColor: colors.teal + '15', borderWidth: 1, borderColor: colors.teal + '35', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  cardEditBtnText: { color: colors.teal, fontSize: 13, fontWeight: 'bold' },
  statusToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingVertical: 5 },
  statusToggleBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15 },
  statusToggleText: { color: colors.white, fontSize: 12, fontWeight: 'bold' },
  sectionDividerText: { fontSize: 15, fontWeight: 'bold', color: colors.teal, marginTop: 15, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.lightGray, paddingBottom: 5 },
  emptyState: { alignItems: 'center', justifyContent: 'center', margin: 40 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 16, color: colors.gray, marginTop: 10, fontWeight: 'bold' }
});
