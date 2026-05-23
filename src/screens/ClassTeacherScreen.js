import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { supabase } from '../services/supabase';
import colors from '../components/colors';

export default function ClassTeacherScreen({ onBack }) {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState({}); // class_name -> teacher_id
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get all distinct class names from teacher_assignments
      const { data: classData, error: classError } = await supabase
        .from('teacher_assignments')
        .select('class_name')
        .order('class_name', { ascending: true });

      if (classError) throw classError;

      const uniqueClasses = [...new Map(classData.map(c => [c.class_name, c])).values()];
      const classList = uniqueClasses.map(c => c.class_name);
      setClasses(classList);

      // Get all teachers
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id, name');

      if (teacherError) throw teacherError;
      setTeachers(teacherData);

      // Get existing assignments
      const { data: existing, error: existingError } = await supabase
        .from('class_teachers')
        .select('class_name, teacher_id');

      if (existingError) throw existingError;

      const assignmentMap = {};
      existing.forEach(item => {
        assignmentMap[item.class_name] = item.teacher_id;
      });
      setAssignments(assignmentMap);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getTeacherName = (teacherId) => {
    if (!teacherId) return 'Not assigned';
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.name : 'Unknown teacher';
  };

  const handleAssignPress = (className) => {
    const currentTeacherId = assignments[className] || null;
    setSelectedClass(className);
    setSelectedTeacherId(currentTeacherId);
    setShowPicker(true);
  };

  const handleSave = async () => {
    if (!selectedClass || !selectedTeacherId) {
      Alert.alert('Error', 'Select a teacher first');
      return;
    }
    try {
      const { error } = await supabase
        .from('class_teachers')
        .upsert([{ class_name: selectedClass, teacher_id: selectedTeacherId }], 
                { onConflict: 'class_name' });
      if (error) throw error;
      Alert.alert('Success', 'Class teacher assigned');
      setShowPicker(false);
      fetchData(); // Refresh list
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const renderClassItem = ({ item: className }) => {
    const teacherId = assignments[className];
    const teacherName = getTeacherName(teacherId);
    const isAssigned = !!teacherId;
    return (
      <View style={styles.classRow}>
        <Text style={styles.className}>{className}</Text>
        <View style={styles.teacherInfo}>
          <Text style={[styles.teacherName, isAssigned && styles.assignedTeacherName]}>
            {teacherName}
          </Text>
          <TouchableOpacity style={styles.assignButton} onPress={() => handleAssignPress(className)}>
            <Text style={styles.assignButtonText}>{isAssigned ? 'Change' : 'Assign'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Class Teachers</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.teal} style={styles.loader} />
      ) : (
        <FlatList
          data={classes}
          keyExtractor={item => item}
          renderItem={renderClassItem}
          contentContainerStyle={styles.list}
        />
      )}

      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Class Teacher for {selectedClass}</Text>
            <FlatList
              data={teachers}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.teacherItem, selectedTeacherId === item.id && styles.selectedTeacher]}
                  onPress={() => setSelectedTeacherId(item.id)}
                >
                  <Text style={styles.teacherName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowPicker(false)} style={[styles.modalButton, { backgroundColor: colors.gray }]}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={[styles.modalButton, { backgroundColor: colors.teal }]}>
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: colors.text },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, flex: 1, textAlign: 'center' },
  loader: { marginTop: 50 },
  list: { padding: 20 },
  classRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.white, padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: colors.lightGray },
  className: { fontSize: 18, fontWeight: '600', color: colors.text },
  teacherInfo: { flexDirection: 'row', alignItems: 'center' },
  teacherName: { fontSize: 14, color: colors.gray, marginRight: 10 },
  assignedTeacherName: { color: colors.green, fontWeight: '500' },
  assignButton: { backgroundColor: colors.teal, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  assignButtonText: { color: colors.white, fontWeight: '600', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.white, borderRadius: 12, padding: 20, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  teacherItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  selectedTeacher: { backgroundColor: colors.teal + '20' },
  teacherName: { fontSize: 16, color: colors.text },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  modalButton: { flex: 0.48, padding: 10, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { color: colors.white, fontWeight: 'bold' },
});