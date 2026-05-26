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

export default function SubjectsScreen({ onBack, lang }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states for Add/Edit
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  
  // Form fields
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');

  useEffect(() => {
    fetchSubjects();
  }, []);

  async function fetchSubjects() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      Alert.alert(t('error', lang), 'Could not load subjects: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const openAddModal = () => {
    setIsEditing(false);
    setSelectedSubject(null);
    setSubjectName('');
    setSubjectCode('');
    setModalVisible(true);
  };

  const openEditModal = (subject) => {
    setIsEditing(true);
    setSelectedSubject(subject);
    setSubjectName(subject.name);
    setSubjectCode(subject.code || '');
    setModalVisible(true);
  };

  async function handleSaveSubject() {
    if (!subjectName.trim()) {
      Alert.alert(t('error', lang), 'Subject Name is required');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && selectedSubject) {
        // Update subject
        const { error } = await supabase
          .from('subjects')
          .update({
            name: subjectName.trim(),
            code: subjectCode.trim() || null
          })
          .eq('id', selectedSubject.id);

        if (error) throw error;
        Alert.alert(t('success', lang), 'Subject updated successfully!');
      } else {
        // Insert new subject
        const { error } = await supabase
          .from('subjects')
          .insert([
            {
              name: subjectName.trim(),
              code: subjectCode.trim() || null,
              school_id: 'SCH_MH_27430012' // Default school ID
            }
          ]);

        if (error) throw error;
        Alert.alert(t('success', lang), 'Subject added successfully!');
      }
      setModalVisible(false);
      fetchSubjects();
    } catch (error) {
      if (error.code === '23505') {
        Alert.alert(t('error', lang), 'A subject with this name already exists.');
      } else {
        Alert.alert(t('error', lang), error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSubject(subject) {
    setLoading(true);
    try {
      // 1. Fetch teacher assignments for this subject
      const { data: assignments, error: assignErr } = await supabase
        .from('teacher_assignments')
        .select('teacher_id')
        .eq('subject', subject.name);

      if (assignErr) throw assignErr;

      let warningMessage = `Are you sure you want to delete "${subject.name}" permanently?`;

      if (assignments && assignments.length > 0) {
        // Fetch teacher names
        const teacherIds = [...new Set(assignments.map(a => a.teacher_id))];
        const { data: teachers, error: teacherErr } = await supabase
          .from('teachers')
          .select('name')
          .in('id', teacherIds);

        if (teacherErr) throw teacherErr;

        if (teachers && teachers.length > 0) {
          const names = teachers.map(t => t.name).join(', ');
          warningMessage = `⚠️ WARNING: The following teachers are currently assigned to teach this subject: ${names}.\n\nDeleting "${subject.name}" will permanently unassign it from them. Are you sure you want to proceed?`;
        }
      }

      setLoading(false);

      Alert.alert(
        t('delete', lang) + ' ' + t('subjects', lang),
        warningMessage,
        [
          { text: t('cancel', lang), style: 'cancel' },
          {
            text: t('delete', lang),
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              try {
                // Delete assignments first
                await supabase
                  .from('teacher_assignments')
                  .delete()
                  .eq('subject', subject.name);

                // Delete subject
                const { error } = await supabase
                  .from('subjects')
                  .delete()
                  .eq('id', subject.id);

                if (error) throw error;
                Alert.alert(t('success', lang), 'Subject deleted successfully.');
                fetchSubjects();
              } catch (error) {
                Alert.alert(t('error', lang), error.message);
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (e) {
      setLoading(false);
      Alert.alert(t('error', lang), e.message);
    }
  }

  const filteredSubjects = subjects.filter(sub => {
    const nameMatch = sub.name.toLowerCase().includes(searchQuery.toLowerCase());
    const codeMatch = sub.code ? sub.code.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    return nameMatch || codeMatch;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('manage_subjects', lang)}</Text>
        <TouchableOpacity
          onPress={openAddModal}
          style={[styles.addButton, { backgroundColor: colors.teal }]}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <TextInput
        style={styles.searchInput}
        placeholder={t('search_placeholder', lang)}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor={colors.gray}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.listTitle}>{t('all_subjects', lang)} ({filteredSubjects.length})</Text>

        {loading && subjects.length === 0 ? (
          <ActivityIndicator size="large" color={colors.teal} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.grid}>
            {filteredSubjects.map((sub) => (
              <View key={sub.id} style={styles.subjectCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.bookIconContainer}>
                    <Text style={styles.bookIcon}>📖</Text>
                  </View>
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.subjectName}>{sub.name}</Text>
                    {sub.code && <Text style={styles.subjectCode}>Code: {sub.code}</Text>}
                  </View>
                </View>
                
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() => openEditModal(sub)}
                  >
                    <Text style={styles.editBtnText}>✏️ {t('edit', lang)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDeleteSubject(sub)}
                  >
                    <Text style={styles.deleteBtnText}>🗑️ {t('delete', lang)}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {filteredSubjects.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🧐</Text>
                <Text style={styles.emptyText}>No subjects found</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isEditing ? t('edit_subject', lang) : t('add_new_subject', lang)}</Text>

            <Text style={styles.label}>{t('subject_name', lang)}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Physics"
              value={subjectName}
              onChangeText={setSubjectName}
              placeholderTextColor={colors.gray}
            />

            <Text style={styles.label}>{t('subject_code', lang)}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., PHY101"
              value={subjectCode}
              onChangeText={setSubjectCode}
              placeholderTextColor={colors.gray}
              autoCapitalize="characters"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.modalButton, { backgroundColor: colors.gray }]}
              >
                <Text style={styles.modalButtonText}>{t('cancel', lang)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveSubject}
                style={[styles.modalButton, { backgroundColor: colors.teal }]}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>
                  {loading ? t('loading', lang) : t('save', lang)}
                </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: colors.text },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  addButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  addButtonText: { fontSize: 24, color: colors.white, fontWeight: 'bold' },
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
    marginTop: 15
  },
  scrollContent: { paddingBottom: 30 },
  listTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginHorizontal: 20, marginBottom: 15, marginTop: 5 },
  grid: { paddingHorizontal: 20 },
  subjectCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.lightGray
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  bookIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.teal + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  bookIcon: { fontSize: 20 },
  cardTextContainer: { flex: 1 },
  subjectName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  subjectCode: { fontSize: 12, color: colors.gray, marginTop: 2 },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
    paddingTop: 12
  },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, marginLeft: 10 },
  editBtn: { backgroundColor: colors.teal + '15' },
  editBtnText: { color: colors.teal, fontWeight: 'bold', fontSize: 12 },
  deleteBtn: { backgroundColor: '#E74C3C15' },
  deleteBtnText: { color: '#E74C3C', fontWeight: 'bold', fontSize: 12 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', margin: 40 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 16, color: colors.gray, marginTop: 10, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.white, borderRadius: 16, padding: 20, width: '90%', elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 15, textAlign: 'center' },
  label: { fontSize: 14, color: colors.text, marginBottom: 5, fontWeight: '500' },
  input: { backgroundColor: colors.lightGray, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 8, marginBottom: 15, fontSize: 14, color: colors.text },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalButton: { flex: 0.48, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { color: colors.white, fontSize: 14, fontWeight: 'bold' }
});
