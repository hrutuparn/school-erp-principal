import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Modal
} from 'react-native';
import Papa from 'papaparse';
import { supabase } from '../services/supabase';
import colors from '../components/colors';

export default function ImportTeachersScreen({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [teachersData, setTeachersData] = useState([]);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteType, setPasteType] = useState('');

  const parseCSV = (csvString, type) => {
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.errors.length) {
          Alert.alert('CSV Error', 'Invalid CSV format');
          return;
        }
        if (type === 'teachers') {
          setTeachersData(results.data);
          setStep(2);
          Alert.alert('Teachers CSV loaded', `${results.data.length} teachers found. Now upload assignments.`);
        } else {
          await importAssignments(results.data);
        }
      }
    });
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) {
      Alert.alert('Error', 'Please paste CSV content');
      return;
    }
    parseCSV(pasteText, pasteType);
    setShowPasteModal(false);
    setPasteText('');
  };

  const importTeachers = async () => {
    setLoading(true);
    let inserted = 0;
    let failed = 0;
    for (const row of teachersData) {
      let { name, email, phone } = row;
      if (!name || !email) {
        failed++;
        continue;
      }
      email = email.trim();
      phone = phone ? phone.trim() : '';
      const { error } = await supabase
        .from('teachers')
        .upsert([{ name, email, phone }], { onConflict: 'email' });
      if (error) {
        failed++;
      } else {
        inserted++;
      }
    }
    Alert.alert('Teachers Import', `✅ Inserted/updated: ${inserted}\n❌ Failed: ${failed}`);
    setLoading(false);
  };

  const importAssignments = async (assignmentsRows) => {
    setLoading(true);
    const { data: teachers, error: fetchError } = await supabase
      .from('teachers')
      .select('id, email');
    if (fetchError) {
      Alert.alert('Error', 'Could not fetch teachers');
      setLoading(false);
      return;
    }
    const emailToId = {};
    teachers.forEach(t => { emailToId[t.email.trim()] = t.id; });

    let inserted = 0;
    let failed = 0;
    const missingEmails = new Set();
    for (const row of assignmentsRows) {
      let teacherEmail = row.teacher_email ? row.teacher_email.trim() : '';
      const className = row.class_name ? row.class_name.trim() : (row.class ? row.class.trim() : '');
      const subject = row.subject ? row.subject.trim() : '';
      if (!teacherEmail || !className || !subject) {
        failed++;
        continue;
      }
      const teacherId = emailToId[teacherEmail];
      if (!teacherId) {
        missingEmails.add(teacherEmail);
        failed++;
        continue;
      }
      const { error } = await supabase
        .from('teacher_assignments')
        .upsert(
          [{ teacher_id: teacherId, class_name: className, subject }],
          { onConflict: 'teacher_id, class_name, subject' }
        );
      if (error) {
        failed++;
      } else {
        inserted++;
      }
    }
    if (missingEmails.size > 0) {
      Alert.alert('Missing Teachers', `These emails not found:\n${Array.from(missingEmails).slice(0, 10).join('\n')}`);
    }
    Alert.alert('Assignments Import', `✅ Inserted: ${inserted}\n❌ Failed: ${failed}`);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import Teachers & Assignments</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === 1 && (
          <>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>📄 Step 1: teachers.csv</Text>
              <Text style={styles.infoText}>
                Columns: name, email, phone (phone optional).<br/>
                Copy the CSV content (including header row) and paste below.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.importButton, { backgroundColor: colors.teal }]}
              onPress={() => {
                setPasteType('teachers');
                setShowPasteModal(true);
              }}
            >
              <Text style={styles.importButtonText}>📋 Paste teachers.csv content</Text>
            </TouchableOpacity>
            {teachersData.length > 0 && (
              <TouchableOpacity
                style={[styles.importButton, { backgroundColor: colors.green, marginTop: 10 }]}
                onPress={importTeachers}
                disabled={loading}
              >
                <Text style={styles.importButtonText}>🚀 Import Teachers</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>📄 Step 2: assignments.csv</Text>
              <Text style={styles.infoText}>
                Columns: teacher_email, class, subject.<br/>
                Teacher emails must match those in teachers.csv.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.importButton, { backgroundColor: colors.teal }]}
              onPress={() => {
                setPasteType('assignments');
                setShowPasteModal(true);
              }}
            >
              <Text style={styles.importButtonText}>📋 Paste assignments.csv content</Text>
            </TouchableOpacity>
          </>
        )}

        {loading && <ActivityIndicator size="large" color={colors.teal} style={{ marginTop: 20 }} />}
      </ScrollView>

      <Modal visible={showPasteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Paste CSV Content</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={10}
              value={pasteText}
              onChangeText={setPasteText}
              placeholder="Paste your CSV data here (including headers)"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowPasteModal(false)} style={[styles.modalButton, { backgroundColor: colors.gray }]}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePasteSubmit} style={[styles.modalButton, { backgroundColor: colors.teal }]}>
                <Text style={styles.modalButtonText}>Submit</Text>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: colors.text },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, flex: 1, textAlign: 'center' },
  content: { padding: 20 },
  infoCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  infoText: { fontSize: 14, color: colors.gray, lineHeight: 20 },
  importButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  importButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: colors.text,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  modalButton: {
    flex: 0.48,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
});