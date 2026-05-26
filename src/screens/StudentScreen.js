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

export default function AddStudentScreen({ onBack, lang }) {
  const [students, setStudents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [class_, setClass_] = useState('10A');
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [standard, setStandard] = useState('10th');
  const [division, setDivision] = useState('A');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [udiseNumber, setUdiseNumber] = useState('');

  // Load students on screen open
  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.log('Error fetching students:', error.message);
    } finally {
      setLoading(false);
    }
  }

  // Open form to edit a student
  const openEditForm = (student) => {
    setEditingStudent(student);
    setIsEditing(true);
    setFirstName(student.first_name || '');
    setLastName(student.last_name || '');
    setRollNumber(student.roll_number || '');
    setClass_(student.class || '10A');
    setParentName(student.parent_name || '');
    setParentPhone(student.parent_phone || '');
    const udise = student.unique_id ? student.unique_id.replace('ID:', '') : '';
    setUdiseNumber(udise);
    
    // Set standard and division from class
    const match = (student.class || '10A').match(/(\d+)([A-Z])/);
    if (match) {
      const stdNum = match[1];
      setStandard(`${stdNum}th`);
      setDivision(match[2]);
    }
    setShowForm(true);
  };

  const clearForm = () => {
    setFirstName('');
    setLastName('');
    setRollNumber('');
    setClass_('10A');
    setParentName('');
    setParentPhone('');
    setUdiseNumber('');
    setEditingStudent(null);
    setIsEditing(false);
  };

  async function saveStudent() {
    if (!firstName || !lastName || !rollNumber || !class_ || !parentName || !parentPhone || !udiseNumber) {
      Alert.alert(t('error', lang), 'Please fill in all fields, including UDISE Number');
      return;
    }

    const fullUdiseId = `ID:${udiseNumber}`;

    setLoading(true);
    try {
      if (isEditing && editingStudent) {
        // UPDATE existing student
        const { error } = await supabase
          .from('students')
          .update({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            roll_number: rollNumber.trim(),
            class: class_,
            parent_name: parentName.trim(),
            parent_phone: parentPhone.trim(),
            unique_id: fullUdiseId,
          })
          .eq('id', editingStudent.id);

        if (error) throw error;
        Alert.alert(t('success', lang), 'Student updated successfully!');
      } else {
        // INSERT new student – check duplicate roll number in same class
        const { data: existing } = await supabase
          .from('students')
          .select('id')
          .eq('class', class_)
          .eq('roll_number', rollNumber.trim());

        if (existing && existing.length > 0) {
          Alert.alert(t('error', lang), 'Roll number already exists in this class!');
          setLoading(false);
          return;
        }

        // Check for duplicate UDISE ID
        const { data: existingUdise } = await supabase
          .from('students')
          .select('id')
          .eq('unique_id', fullUdiseId);

        if (existingUdise && existingUdise.length > 0) {
          Alert.alert(t('error', lang), 'This UDISE Number is already registered');
          setLoading(false);
          return;
        }

        const { error } = await supabase
          .from('students')
          .insert([{
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            unique_id: fullUdiseId,
            roll_number: rollNumber.trim(),
            class: class_,
            parent_name: parentName.trim(),
            parent_phone: parentPhone.trim(),
            created_at: new Date()
          }]);

        if (error) throw error;
        Alert.alert(t('success', lang), 'Student added successfully!');
      }

      setShowForm(false);
      clearForm();
      fetchStudents();
    } catch (error) {
      Alert.alert(t('error', lang), error.message);
    } finally {
      setLoading(false);
    }
  }

  const renderForm = () => (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>
        {isEditing ? t('edit_student', lang) : t('add_new_student', lang)}
      </Text>
      
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>{t('first_name', lang)}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., John"
            value={firstName}
            onChangeText={setFirstName}
            placeholderTextColor={colors.gray}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>{t('last_name', lang)}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Doe"
            value={lastName}
            onChangeText={setLastName}
            placeholderTextColor={colors.gray}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>{t('roll_number', lang)}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 15"
            value={rollNumber}
            onChangeText={setRollNumber}
            keyboardType="numeric"
            placeholderTextColor={colors.gray}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>{t('class', lang)}</Text>
          <TouchableOpacity 
            style={styles.classPickerButton}
            onPress={() => setShowClassPicker(true)}
          >
            <Text style={styles.classPickerText}>{class_}</Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.label}>{t('parent_name', lang)}</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Mr. John Doe Sr."
        value={parentName}
        onChangeText={setParentName}
        placeholderTextColor={colors.gray}
      />

      <Text style={styles.label}>{t('parent_phone', lang)}</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 9876543210"
        value={parentPhone}
        onChangeText={setParentPhone}
        keyboardType="phone-pad"
        maxLength={10}
        placeholderTextColor={colors.gray}
      />

      <Text style={styles.label}>{t('udise_number', lang)}</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 2024271909001120002"
        value={udiseNumber}
        onChangeText={setUdiseNumber}
        keyboardType="numeric"
        maxLength={19}
        placeholderTextColor={colors.gray}
      />

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.orange }]}
        onPress={saveStudent}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>
          {loading ? t('loading', lang) : (isEditing ? t('save_changes', lang) : t('save', lang))}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.cancelButton, { marginTop: 10 }]}
        onPress={() => {
          setShowForm(false);
          clearForm();
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
        <Text style={styles.headerTitle}>{t('manage_students', lang)}</Text>
        <TouchableOpacity 
          onPress={() => {
            clearForm();
            setShowForm(true);
          }} 
          style={[styles.addButton, { backgroundColor: colors.teal }]}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Add Student Form (Only shown at the top when not editing) */}
        {showForm && !isEditing && renderForm()}

        {/* Class Picker Modal */}
        <Modal visible={showClassPicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Class</Text>
              
              <Text style={styles.modalSubTitle}>Standard</Text>
              <View style={styles.modalRow}>
                {['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'].map((std) => (
                  <TouchableOpacity
                    key={std}
                    style={[
                      styles.modalChip,
                      standard === std && { backgroundColor: colors.teal }
                    ]}
                    onPress={() => setStandard(std)}
                  >
                    <Text style={[
                      styles.modalChipText,
                      standard === std && { color: colors.white }
                    ]}>{std}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalSubTitle}>Division</Text>
              <View style={styles.modalRow}>
                {['A','B','C','D','E'].map((div) => (
                  <TouchableOpacity
                    key={div}
                    style={[
                      styles.modalChip,
                      division === div && { backgroundColor: colors.teal }
                    ]}
                    onPress={() => setDivision(div)}
                  >
                    <Text style={[
                      styles.modalChipText,
                      division === div && { color: colors.white }
                    ]}>Div {div}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.modalDoneButton}
                onPress={() => {
                  const stdNumber = standard.replace('th', '').replace('rd', '').replace('nd', '').replace('st', '');
                  setClass_(stdNumber + division);
                  setShowClassPicker(false);
                }}
              >
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
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

        {/* Students List */}
        {(() => {
          const filteredStudents = students.filter(student => {
            const fullName = `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase();
            const q = searchQuery.toLowerCase();
            return fullName.includes(q) ||
                   (student.class || '').toLowerCase().includes(q) ||
                   (student.roll_number || '').toString().includes(q) ||
                   (student.unique_id || '').toLowerCase().includes(q) ||
                   (student.parent_phone || '').includes(q) ||
                   (student.parent_name || '').toLowerCase().includes(q);
          });
          return (
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={styles.listTitle}>
                {searchQuery ? `${t('search_results', lang)} (${filteredStudents.length})` : `${t('your_students', lang)} (${students.length})`}
              </Text>
              
              {filteredStudents.map((student) => (
                <View key={student.id}>
                  <View style={styles.studentCard}>
                    <View style={styles.studentHeader}>
                      <View>
                        <Text style={styles.studentName}>
                          {student.first_name} {student.last_name}
                        </Text>
                        <Text style={styles.studentClass}>Class {student.class} | Roll: {student.roll_number}</Text>
                      </View>
                      <View style={[styles.uniqueIdBadge, { backgroundColor: colors.teal }]}>
                        <Text style={styles.uniqueIdBadgeText}>
                          ID: {student.unique_id ? student.unique_id.replace('ID:', '') : ''}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.parentInfo}>
                      <Text style={styles.parentText}>👪 {student.parent_name}</Text>
                      <Text style={styles.parentText}>📞 {student.parent_phone}</Text>
                    </View>
                    
                    {/* Edit Button */}
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => openEditForm(student)}
                    >
                      <Text style={styles.editButtonText}>✏️ {t('edit', lang)}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Inline edit form directly below edited card */}
                  {showForm && isEditing && editingStudent && editingStudent.id === student.id && (
                    <View style={{ marginBottom: 15, marginTop: -8 }}>
                      {renderForm()}
                    </View>
                  )}
                </View>
              ))}
              
              {filteredStudents.length === 0 && searchQuery.length > 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>🔍</Text>
                  <Text style={styles.emptyText}>No matching students found</Text>
                </View>
              )}
            </View>
          );
        })()}
        
        {students.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyText}>No students yet</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 24,
    color: colors.text,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: colors.white,
    fontWeight: 'bold',
  },
  formCard: {
    backgroundColor: colors.white,
    marginVertical: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  label: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 14,
    color: colors.text,
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.lightGray,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 15,
  },
  studentCard: {
    backgroundColor: colors.white,
    marginBottom: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    paddingBottom: 10,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  studentClass: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  uniqueIdBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  uniqueIdBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  parentInfo: {
    marginTop: 5,
  },
  parentText: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 3,
  },
  editButton: {
    marginTop: 12,
    backgroundColor: colors.teal + '15',
    borderWidth: 1,
    borderColor: colors.teal + '35',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyEmoji: {
    fontSize: 50,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.gray,
  },
  classPickerButton: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classPickerText: {
    fontSize: 14,
    color: colors.text,
  },
  dropdownIcon: {
    fontSize: 12,
    color: colors.gray,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalSubTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 10,
    marginBottom: 10,
  },
  modalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  modalChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: colors.lightGray,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  modalChipText: {
    fontSize: 14,
    color: colors.text,
  },
  modalDoneButton: {
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: colors.teal,
    borderRadius: 8,
  },
  modalDoneText: {
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  searchInput: {
    backgroundColor: colors.white,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.lightGray,
    fontSize: 14,
    color: colors.text,
    marginTop: 15,
  },
  sectionDividerText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.teal,
    marginTop: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    paddingBottom: 5,
  },
});