import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { supabase } from '../services/supabase';
import colors from '../components/colors';
import { t } from '../services/i18n';

export default function TeacherScreen({ onBack, lang }) {
  const [teachers, setTeachers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('');
  const [baseSalary, setBaseSalary] = useState('25000');
  const [bankAccount, setBankAccount] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Subjects and assignments states
  const [subjectsList, setSubjectsList] = useState([]);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [pickerSubject, setPickerSubject] = useState('');

  // Class picker states
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [selectedStandard, setSelectedStandard] = useState('10th');
  const [selectedDivision, setSelectedDivision] = useState('A');

  const standards = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
  const divisions = ['A', 'B', 'C', 'D', 'E'];

  // Load teachers on screen open
  useEffect(() => {
    fetchTeachers();
    fetchSubjectsList();
  }, []);

  async function fetchSubjectsList() {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('name')
        .order('name', { ascending: true });
      if (error) throw error;
      setSubjectsList((data || []).map(d => d.name));
    } catch (e) {
      console.log('Error fetching subjects list:', e.message);
    }
  }

  async function fetchTeachers() {
    setLoading(true);
    try {
      // 1. Fetch Teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select('*')
        .order('created_at', { ascending: false });

      if (teachersError) throw teachersError;

      // 2. Fetch Assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('teacher_assignments')
        .select('*');

      if (assignmentsError) throw assignmentsError;

      // 3. Map assignments to teachers
      const mapped = (teachersData || []).map(t => {
        const tAssignments = (assignmentsData || []).filter(a => a.teacher_id === t.id);
        const subjects = [...new Set(tAssignments.map(a => a.subject))];
        const classes = [...new Set(tAssignments.map(a => a.class_name))];
        
        return {
          ...t,
          subject: subjects.join(', ') || 'No subject assigned',
          classes: classes,
          assignments: tAssignments.map(a => ({ class_name: a.class_name, subject: a.subject }))
        };
      });

      setTeachers(mapped);
    } catch (error) {
      console.log('Error fetching teachers:', error.message);
    } finally {
      setLoading(false);
    }
  }

  const addAssignment = () => {
    const stdNumber = selectedStandard.replace('th', '').replace('rd', '').replace('nd', '').replace('st', '');
    const className = stdNumber + selectedDivision;

    if (!pickerSubject) {
      Alert.alert(t('error', lang), 'Please select a subject first');
      return;
    }

    const exists = assignedSubjects.some(a => a.class_name === className && a.subject === pickerSubject);
    if (!exists) {
      setAssignedSubjects([...assignedSubjects, { class_name: className, subject: pickerSubject }]);
    } else {
      Alert.alert('Info', 'This class and subject assignment already exists');
    }
    setShowClassPicker(false);
  };

  const removeAssignment = (index) => {
    setAssignedSubjects(assignedSubjects.filter((_, idx) => idx !== index));
  };

  const openAddForm = () => {
    setIsEditing(false);
    setEditingTeacher(null);
    setName('');
    setEmail('');
    setPhone('');
    setQualification('');
    setBaseSalary('25000');
    setBankAccount('');
    setEmployeeId('');
    setIsActive(true);
    setAssignedSubjects([]);
    setShowForm(true);
  };

  const openEditForm = (teacher) => {
    setIsEditing(true);
    setEditingTeacher(teacher);
    setName(teacher.name || '');
    setEmail(teacher.email || '');
    setPhone(teacher.phone || '');
    setQualification(teacher.qualification || '');
    setBaseSalary((teacher.base_salary || 25000).toString());
    setBankAccount(teacher.bank_account || '');
    setEmployeeId(teacher.employee_id || '');
    setIsActive(teacher.is_active !== false);
    setAssignedSubjects(teacher.assignments || []);
    setShowForm(true);
  };

  async function saveTeacher() {
    if (!name || !email || assignedSubjects.length === 0) {
      Alert.alert(t('error', lang), 'Please fill in Name, Email, and assign at least one class & subject.');
      return;
    }

    setLoading(true);
    try {
      let teacherId;

      if (isEditing && editingTeacher) {
        // --- UPDATE TEACHER ---
        teacherId = editingTeacher.id;
        const { error: updateError } = await supabase
          .from('teachers')
          .update({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            qualification: qualification.trim(),
            base_salary: parseFloat(baseSalary) || 25000,
            bank_account: bankAccount.trim(),
            employee_id: employeeId.trim(),
            is_active: isActive
          })
          .eq('id', teacherId);

        if (updateError) throw updateError;
      } else {
        // --- INSERT NEW TEACHER ---
        const { data: insertData, error: insertError } = await supabase
          .from('teachers')
          .insert([
            {
              name: name.trim(),
              email: email.trim().toLowerCase(),
              phone: phone.trim(),
              school_id: 'SCH_MH_27430012',
              qualification: qualification.trim(),
              base_salary: parseFloat(baseSalary) || 25000,
              bank_account: bankAccount.trim(),
              employee_id: employeeId.trim(),
              is_active: isActive,
              created_at: new Date()
            }
          ])
          .select();

        if (insertError) throw insertError;
        teacherId = insertData[0].id;
      }

      // --- UPDATE CLASS ASSIGNMENTS ---
      // 1. Delete old assignments
      await supabase
        .from('teacher_assignments')
        .delete()
        .eq('teacher_id', teacherId);

      // 2. Insert new assignments
      const assignmentInserts = assignedSubjects.map(item => ({
        teacher_id: teacherId,
        class_name: item.class_name,
        subject: item.subject.trim(),
        created_at: new Date()
      }));

      const { error: assignError } = await supabase
        .from('teacher_assignments')
        .insert(assignmentInserts);

      if (assignError) throw assignError;

      Alert.alert(t('success', lang), isEditing ? 'Teacher updated successfully!' : 'Teacher added successfully!');
      setShowForm(false);
      fetchTeachers();
    } catch (error) {
      Alert.alert(t('error', lang), error.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteTeacher() {
    if (!editingTeacher) return;

    Alert.alert(
      t('delete', lang) + ' ' + t('teachers', lang),
      `Are you sure you want to delete ${editingTeacher.name} permanently? This will remove all their classroom assignments.`,
      [
        { text: t('cancel', lang), style: 'cancel' },
        {
          text: t('delete', lang),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Cascade delete assignments and advisor roles first
              await supabase.from('teacher_assignments').delete().eq('teacher_id', editingTeacher.id);
              await supabase.from('class_teachers').delete().eq('teacher_id', editingTeacher.id);
              
              // Clear teacher assignments in timetable
              await supabase.from('timetable').update({ teacher_id: null }).eq('teacher_id', editingTeacher.id);
              
              // Clear teacher assignments in classes
              await supabase.from('classes').update({ class_teacher_id: null }).eq('class_teacher_id', editingTeacher.id);

              const { error } = await supabase
                .from('teachers')
                .delete()
                .eq('id', editingTeacher.id);

              if (error) throw error;
              Alert.alert(t('success', lang), 'Teacher deleted successfully.');
              setShowForm(false);
              fetchTeachers();
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
        {isEditing ? t('edit_teacher_details', lang) : t('add_new_teacher', lang)}
      </Text>

      <Text style={styles.sectionDividerText}>👤 {t('manage_teachers', lang)}</Text>

      <Text style={styles.label}>{t('full_name', lang)} *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Mrs. Priya Patil"
        value={name}
        onChangeText={setName}
        placeholderTextColor={colors.gray}
      />

      <Text style={styles.label}>{t('email', lang)} *</Text>
      <TextInput
        style={styles.input}
        placeholder="teacher@school.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholderTextColor={colors.gray}
        editable={!isEditing} // Prevent email edits
      />

      <Text style={styles.label}>{t('phone', lang)}</Text>
      <TextInput
        style={styles.input}
        placeholder="9876543210"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholderTextColor={colors.gray}
      />

      <Text style={styles.label}>{t('employee_id', lang)}</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., EMP021"
        value={employeeId}
        onChangeText={setEmployeeId}
        placeholderTextColor={colors.gray}
      />

      {/* Active Toggle */}
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

      <Text style={styles.sectionDividerText}>🎓 {t('qualification', lang)} & {t('salary', lang)}</Text>

      <Text style={styles.label}>{t('qualification', lang)}</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., B.Ed, M.Sc Maths"
        value={qualification}
        onChangeText={setQualification}
        placeholderTextColor={colors.gray}
      />

      <Text style={styles.label}>{t('base_salary', lang)}</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 35000"
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

      <Text style={styles.sectionDividerText}>📚 {t('class_subject_assignments', lang)}</Text>
      <TouchableOpacity
        style={styles.classPickerButton}
        onPress={() => {
          if (subjectsList.length === 0) {
            Alert.alert('Info', 'Please create some subjects in the "Manage Subjects" screen first!');
            return;
          }
          setPickerSubject(subjectsList[0]);
          setShowClassPicker(true);
        }}
      >
        <Text style={styles.classPickerText}>{t('add_class_subject', lang)}</Text>
        <Text style={styles.dropdownIcon}>➕</Text>
      </TouchableOpacity>

      {/* Selected Assignments Chips */}
      {assignedSubjects.length > 0 && (
        <View style={styles.chipContainer}>
          {assignedSubjects.map((item, index) => (
            <View key={index} style={styles.chip}>
              <Text style={styles.chipText}>{item.class_name} : {item.subject}</Text>
              <TouchableOpacity onPress={() => removeAssignment(index)}>
                <Text style={styles.chipRemove}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.orange }]}
        onPress={saveTeacher}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>
          {loading ? t('loading', lang) : (isEditing ? t('save_changes', lang) : t('save', lang))}
        </Text>
      </TouchableOpacity>

      {isEditing && (
        <TouchableOpacity
          style={[styles.deleteButton, { marginTop: 10 }]}
          onPress={deleteTeacher}
          disabled={loading}
        >
          <Text style={styles.deleteButtonText}>🗑️ {t('delete', lang)} {t('teachers', lang)}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.cancelButton, { marginTop: 10 }]}
        onPress={() => {
          setShowForm(false);
          setEditingTeacher(null);
        }}
      >
        <Text style={styles.cancelButtonText}>{t('cancel', lang)}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('manage_teachers', lang)}</Text>
        <TouchableOpacity
          onPress={openAddForm}
          style={[styles.addButton, { backgroundColor: colors.teal }]}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Add Teacher Form (Only when not editing, rendered at top) */}
        {showForm && !isEditing && renderForm()}

        {/* Class & Subject Picker Modal */}
        <Modal visible={showClassPicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('add_class_subject', lang)}</Text>

              <Text style={styles.modalSubTitle}>Standard</Text>
              <View style={styles.modalRow}>
                {standards.map((std) => (
                  <TouchableOpacity
                    key={std}
                    style={[
                      styles.modalChip,
                      selectedStandard === std && { backgroundColor: colors.teal }
                    ]}
                    onPress={() => setSelectedStandard(std)}
                  >
                    <Text style={[
                      styles.modalChipText,
                      selectedStandard === std && { color: colors.white }
                    ]}>{std}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalSubTitle}>Division</Text>
              <View style={styles.modalRow}>
                {divisions.map((div) => (
                  <TouchableOpacity
                    key={div}
                    style={[
                      styles.modalChip,
                      selectedDivision === div && { backgroundColor: colors.teal }
                    ]}
                    onPress={() => setSelectedDivision(div)}
                  >
                    <Text style={[
                      styles.modalChipText,
                      selectedDivision === div && { color: colors.white }
                    ]}>Div {div}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalSubTitle}>{t('subjects', lang)}</Text>
              <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
                <View style={styles.modalRow}>
                  {subjectsList.map((sub) => (
                    <TouchableOpacity
                      key={sub}
                      style={[
                        styles.modalChip,
                        pickerSubject === sub && { backgroundColor: colors.teal }
                      ]}
                      onPress={() => setPickerSubject(sub)}
                    >
                      <Text style={[
                        styles.modalChipText,
                        pickerSubject === sub && { color: colors.white }
                      ]}>{sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.gray }]}
                  onPress={() => setShowClassPicker(false)}
                >
                  <Text style={styles.modalButtonText}>{t('cancel', lang)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.teal }]}
                  onPress={addAssignment}
                >
                  <Text style={styles.modalButtonText}>{t('add_assignment', lang)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Search Bar */}
        <TextInput
          style={styles.searchInput}
          placeholder={t('search_placeholder', lang)}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.gray}
        />

        {/* Teachers List */}
        <Text style={styles.listTitle}>{t('current_teachers', lang)} ({teachers.length})</Text>

        {loading && teachers.length === 0 ? (
          <ActivityIndicator size="large" color={colors.teal} style={{ marginTop: 25 }} />
        ) : (
          (() => {
            const filteredTeachers = teachers.filter(teacher => {
              const nameMatch = (teacher.name || '').toLowerCase().includes(searchQuery.toLowerCase());
              const emailMatch = (teacher.email || '').toLowerCase().includes(searchQuery.toLowerCase());
              const subjectMatch = (teacher.subject || '').toLowerCase().includes(searchQuery.toLowerCase());
              const classesMatch = teacher.classes ? teacher.classes.some(cls => cls.toLowerCase().includes(searchQuery.toLowerCase())) : false;
              return nameMatch || emailMatch || subjectMatch || classesMatch;
            });
            return (
              <View style={{ paddingHorizontal: 20 }}>
                {filteredTeachers.map((teacher) => (
                  <View key={teacher.id}>
                    <View style={styles.teacherCard}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.teacherName}>{teacher.name}</Text>
                          <Text style={styles.teacherSubject}>{teacher.subject}</Text>
                        </View>
                        <View style={[
                          styles.statusBadge,
                          teacher.is_active !== false ? { backgroundColor: colors.green + '20' } : { backgroundColor: colors.gray + '25' }
                        ]}>
                          <Text style={[
                            styles.statusText,
                            teacher.is_active !== false ? { color: colors.green } : { color: colors.gray }
                          ]}>
                            {teacher.is_active !== false ? t('active', lang) : t('inactive', lang)}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.teacherEmail}>✉️ {teacher.email}  |  📞 {teacher.phone || 'No phone'}</Text>
                      {teacher.employee_id && <Text style={styles.teacherSubInfo}>ID: {teacher.employee_id}  |  Qual: {teacher.qualification || 'N/A'}</Text>}
                      <Text style={styles.teacherSubInfo}>💰 {t('base_salary', lang)}: ₹{teacher.base_salary || 25000} / month</Text>

                      {teacher.assignments && teacher.assignments.length > 0 && (
                        <View style={styles.teacherClasses}>
                          <Text style={styles.classesLabel}>{t('assignments_label', lang)}: </Text>
                          {teacher.assignments.map((item, index) => (
                            <View key={index} style={styles.teacherClassChip}>
                              <Text style={styles.teacherClassText}>{item.class_name} : {item.subject}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      <TouchableOpacity
                        style={styles.cardEditBtn}
                        onPress={() => openEditForm(teacher)}
                      >
                        <Text style={styles.cardEditBtnText}>{t('edit_details_classes', lang)}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Inline edit form directly below edited card */}
                    {showForm && isEditing && editingTeacher && editingTeacher.id === teacher.id && (
                      <View style={{ marginBottom: 15, marginTop: -8 }}>
                        {renderForm()}
                      </View>
                    )}
                  </View>
                ))}

                {filteredTeachers.length === 0 && searchQuery.length > 0 && (
                  <View style={{ alignItems: 'center', justifyContent: 'center', margin: 40 }}>
                    <Text style={{ fontSize: 50, textAlign: 'center' }}>🔍</Text>
                    <Text style={{ textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: colors.text, marginTop: 10 }}>No matching teachers found</Text>
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
  classPickerButton: { backgroundColor: colors.lightGray, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 8, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  classPickerText: { fontSize: 14, color: colors.text },
  dropdownIcon: { fontSize: 12, color: colors.gray },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.teal + '20', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 12, color: colors.teal, marginRight: 5 },
  chipRemove: { fontSize: 12, color: colors.teal, fontWeight: 'bold' },
  saveButton: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  deleteButton: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', backgroundColor: '#E74C3C' },
  deleteButtonText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  cancelButton: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: colors.lightGray },
  cancelButtonText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.white, borderRadius: 20, padding: 20, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 15, textAlign: 'center' },
  modalSubTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 10, marginBottom: 10 },
  modalRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  modalChip: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: colors.lightGray, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  modalChipText: { fontSize: 14, color: colors.text },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  modalButton: { flex: 0.48, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
  listTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 15 },
  teacherCard: { backgroundColor: colors.white, marginBottom: 12, padding: 15, borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, borderWidth: 1, borderColor: colors.lightGray },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: colors.lightGray, paddingBottom: 8, marginBottom: 8 },
  teacherName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  teacherSubject: { fontSize: 13, color: colors.teal, marginTop: 2, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 9, fontWeight: 'bold' },
  teacherEmail: { fontSize: 13, color: colors.text, marginTop: 4 },
  teacherSubInfo: { fontSize: 12, color: colors.gray, marginTop: 4 },
  teacherClasses: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, borderTopWidth: 1, borderTopColor: colors.lightGray, paddingTop: 8 },
  classesLabel: { fontSize: 12, color: colors.text, marginRight: 5, fontWeight: 'bold' },
  teacherClassChip: { backgroundColor: colors.lightGray, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 5, marginBottom: 3 },
  teacherClassText: { fontSize: 10, color: colors.text },
  cardEditBtn: { marginTop: 12, backgroundColor: colors.teal + '15', borderWidth: 1, borderColor: colors.teal + '35', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  cardEditBtnText: { color: colors.teal, fontSize: 13, fontWeight: 'bold' },
  searchInput: { backgroundColor: colors.white, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 10, marginHorizontal: 20, marginBottom: 10, borderWidth: 1, borderColor: colors.lightGray, fontSize: 14, color: colors.text, marginTop: 15 },
  statusToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingVertical: 5 },
  statusToggleBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15 },
  statusToggleText: { color: colors.white, fontSize: 12, fontWeight: 'bold' },
  sectionDividerText: { fontSize: 15, fontWeight: 'bold', color: colors.teal, marginTop: 15, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.lightGray, paddingBottom: 5 }
});