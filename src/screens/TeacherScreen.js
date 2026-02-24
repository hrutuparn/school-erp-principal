import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
  Modal,
  SafeAreaView
} from 'react-native';
import { supabase } from '../services/supabase';
import colors from '../components/colors';

export default function TeacherScreen({ onBack }) {
  const [teachers, setTeachers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  
  // Class picker states
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [selectedStandard, setSelectedStandard] = useState('10th');
  const [selectedDivision, setSelectedDivision] = useState('A');
  const [assignedClasses, setAssignedClasses] = useState([]);

  const standards = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
  const divisions = ['A', 'B', 'C', 'D', 'E'];

  // Load teachers on screen open
  useEffect(() => {
    fetchTeachers();
  }, []);

  async function fetchTeachers() {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.log('Error fetching teachers:', error.message);
    }
  }

  const addClass = () => {
    const stdNumber = selectedStandard.replace('th', '').replace('rd', '').replace('nd', '').replace('st', '');
    const newClass = stdNumber + selectedDivision;
    
    if (!assignedClasses.includes(newClass)) {
      setAssignedClasses([...assignedClasses, newClass]);
    } else {
      Alert.alert('Info', 'Class already added');
    }
    setShowClassPicker(false);
  };

  const removeClass = (classToRemove) => {
    setAssignedClasses(assignedClasses.filter(c => c !== classToRemove));
  };

  async function addTeacher() {
    if (!name || !email || !subject || assignedClasses.length === 0) {
      Alert.alert('Error', 'Please fill in all fields and assign at least one class');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teachers')
        .insert([
          { 
            name,
            email,
            phone,
            subject,
            classes: assignedClasses,
            created_at: new Date()
          }
        ])
        .select();

      if (error) throw error;
      
      Alert.alert('Success', 'Teacher added successfully!');
      setShowForm(false);
      
      // Clear form
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setAssignedClasses([]);
      
      fetchTeachers();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Teachers</Text>
        <TouchableOpacity 
          onPress={() => setShowForm(!showForm)} 
          style={[styles.addButton, { backgroundColor: colors.teal }]}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Add Teacher Form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Add New Teacher</Text>
            
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Mrs. Priya Patil"
              value={name}
              onChangeText={setName}
              placeholderTextColor={colors.gray}
            />
            
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="teacher@school.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              placeholderTextColor={colors.gray}
            />
            
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="9876543210"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor={colors.gray}
            />
            
            <Text style={styles.label}>Subject *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Mathematics"
              value={subject}
              onChangeText={setSubject}
              placeholderTextColor={colors.gray}
            />
            
            <Text style={styles.label}>Assigned Classes *</Text>
            <TouchableOpacity
              style={styles.classPickerButton}
              onPress={() => setShowClassPicker(true)}
            >
              <Text style={styles.classPickerText}>
                {assignedClasses.length > 0 
                  ? `${assignedClasses.length} class(es) selected` 
                  : 'Tap to select classes'}
              </Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>

            {/* Show selected classes as chips */}
            {assignedClasses.length > 0 && (
              <View style={styles.chipContainer}>
                {assignedClasses.map((cls, index) => (
                  <View key={index} style={styles.chip}>
                    <Text style={styles.chipText}>Class {cls}</Text>
                    <TouchableOpacity onPress={() => removeClass(cls)}>
                      <Text style={styles.chipRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.orange }]}
              onPress={addTeacher}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Adding...' : 'Add Teacher'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Class Picker Modal */}
        <Modal visible={showClassPicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Class</Text>
              
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

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.gray }]}
                  onPress={() => setShowClassPicker(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.teal }]}
                  onPress={addClass}
                >
                  <Text style={styles.modalButtonText}>Add Class</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Teachers List */}
        <Text style={styles.listTitle}>Current Teachers ({teachers.length})</Text>
        
        {teachers.map((teacher) => (
          <View key={teacher.id} style={styles.teacherCard}>
            <Text style={styles.teacherName}>{teacher.name}</Text>
            <Text style={styles.teacherSubject}>{teacher.subject}</Text>
            <Text style={styles.teacherEmail}>{teacher.email}</Text>
            
            {teacher.classes && teacher.classes.length > 0 && (
              <View style={styles.teacherClasses}>
                <Text style={styles.classesLabel}>Classes: </Text>
                {teacher.classes.map((cls, index) => (
                  <View key={index} style={styles.teacherClassChip}>
                    <Text style={styles.teacherClassText}>{cls}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
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
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
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
  classPickerButton: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
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
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.teal + '20',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 12,
    color: colors.teal,
    marginRight: 5,
  },
  chipRemove: {
    fontSize: 12,
    color: colors.teal,
    fontWeight: 'bold',
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
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 0.48,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  teacherCard: {
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  teacherSubject: {
    fontSize: 14,
    color: colors.teal,
    marginTop: 2,
  },
  teacherEmail: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  teacherClasses: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  classesLabel: {
    fontSize: 12,
    color: colors.text,
    marginRight: 5,
  },
  teacherClassChip: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 5,
    marginBottom: 3,
  },
  teacherClassText: {
    fontSize: 10,
    color: colors.text,
  },
});