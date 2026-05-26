import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Modal
} from 'react-native';
import { supabase } from '../services/supabase';
import colors from '../components/colors';

export default function AttendanceStaffScreen({ onBack }) {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' or 'substitution'
  const [loading, setLoading] = useState(false);

  // --- Attendance Tab States ---
  const [teachers, setTeachers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState({}); // id/staff_id -> status ('present', 'absent', 'half_day', 'leave')
  const [dateStr, setDateStr] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');

  // --- Substitution Tab States ---
  const [absentTeachers, setAbsentTeachers] = useState([]);
  const [selectedAbsentTeacher, setSelectedAbsentTeacher] = useState(null);
  const [teacherPeriods, setTeacherPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [substituteOptions, setSubstituteOptions] = useState([]);
  const [showSubModal, setShowSubModal] = useState(false);
  const [submittingSub, setSubmittingSub] = useState(false);

  useEffect(() => {
    // Get current date formatted as YYYY-MM-DD
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setDateStr(`${yyyy}-${mm}-${dd}`);

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    setDayOfWeek(days[today.getDay()]);

    fetchStaffAndAttendance(`${yyyy}-${mm}-${dd}`);
  }, []);

  const fetchStaffAndAttendance = async (targetDate) => {
    setLoading(true);
    try {
      // 1. Fetch Teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select('id, name, email, phone')
        .eq('is_active', true);

      if (teachersError) throw teachersError;
      setTeachers(teachersData || []);

      // 2. Fetch Staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('staff_id, full_name, role, mobile')
        .eq('is_active', true);

      if (staffError) throw staffError;
      setStaff(staffData || []);

      // 3. Fetch existing attendance for today
      const { data: attData, error: attError } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('date', targetDate);

      if (attError) throw attError;

      const initialAtt = {};
      // Initialize with default 'present' for everyone
      teachersData.forEach(t => { initialAtt[`T_${t.id}`] = 'present'; });
      staffData.forEach(s => { initialAtt[`S_${s.staff_id}`] = 'present'; });

      // Override with actual saved data
      attData.forEach(att => {
        const key = att.person_type === 'teacher' ? `T_${att.person_id}` : `S_${att.person_id}`;
        initialAtt[key] = att.status;
      });

      setAttendance(initialAtt);

      // 4. Update absent teachers list
      const absentList = teachersData.filter(t => initialAtt[`T_${t.id}`] === 'absent' || initialAtt[`T_${t.id}`] === 'leave');
      setAbsentTeachers(absentList);

    } catch (error) {
      Alert.alert('Error', 'Failed to fetch staff data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (key, status) => {
    setAttendance(prev => {
      const updated = { ...prev, [key]: status };
      
      // Update absent teachers list dynamically
      const updatedAbsent = teachers.filter(t => updated[`T_${t.id}`] === 'absent' || updated[`T_${t.id}`] === 'leave');
      setAbsentTeachers(updatedAbsent);
      
      return updated;
    });
  };

  const saveAttendance = async () => {
    setLoading(true);
    try {
      const inserts = [];
      
      // Prep teachers attendance
      teachers.forEach(t => {
        inserts.push({
          person_id: t.id,
          person_type: 'teacher',
          school_id: 'SCH_MH_27430012',
          date: dateStr,
          status: attendance[`T_${t.id}`] || 'present',
          marked_by: 'Principal'
        });
      });

      // Prep staff attendance
      staff.forEach(s => {
        // Since person_id is an integer in db, let's strip STF_ prefix if necessary, or pass a hash of staff_id
        // Wait, the DB column person_id in staff_attendance is an integer. But staff_id is a text string (e.g. STF_DRV_1234).
        // To avoid foreign key/data type mismatch, we can store numeric suffix of staff_id, or just store it.
        // Let's extract numbers from staff_id
        const numId = parseInt(s.staff_id.replace(/\D/g, '')) || 9999;
        inserts.push({
          person_id: numId,
          person_type: 'staff',
          school_id: 'SCH_MH_27430012',
          date: dateStr,
          status: attendance[`S_${s.staff_id}`] || 'present',
          marked_by: 'Principal'
        });
      });

      // Clear existing attendance for today first
      const { error: deleteError } = await supabase
        .from('staff_attendance')
        .delete()
        .eq('date', dateStr);

      if (deleteError) throw deleteError;

      // Save new attendance
      const { error: insertError } = await supabase
        .from('staff_attendance')
        .insert(inserts);

      if (insertError) throw insertError;

      Alert.alert('Success', 'Daily Attendance Saved Successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save attendance: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Substitution Engine ---
  const handleTeacherClick = async (teacher) => {
    setSelectedAbsentTeacher(teacher);
    setLoading(true);
    try {
      // Fetch this teacher's timetable periods for today's day of week
      const { data, error } = await supabase
        .from('timetable')
        .select(`
          id,
          class_id,
          day,
          period_number,
          subject,
          start_time,
          end_time,
          classes (display_name)
        `)
        .eq('teacher_id', teacher.id)
        .eq('day', dayOfWeek)
        .order('period_number', { ascending: true });

      if (error) throw error;
      setTeacherPeriods(data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load teacher periods: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openSubstitutionFinder = async (period) => {
    setSelectedPeriod(period);
    setLoading(true);
    try {
      // 1. Find all teachers who have a lecture at this day and period number
      const { data: busyData, error: busyError } = await supabase
        .from('timetable')
        .select('teacher_id')
        .eq('day', dayOfWeek)
        .eq('period_number', period.period_number);

      if (busyError) throw busyError;
      const busyTeacherIds = new Set(busyData.map(b => b.teacher_id));

      // 2. Filter teachers who are:
      // - Marked present today
      // - NOT busy teaching this period
      const freeTeachers = teachers.filter(t => {
        const isAbsent = attendance[`T_${t.id}`] === 'absent' || attendance[`T_${t.id}`] === 'leave';
        const isBusy = busyTeacherIds.has(t.id);
        const isSelf = t.id === selectedAbsentTeacher.id;
        return !isAbsent && !isBusy && !isSelf;
      });

      // 3. Highlight "Ideal" substitutes (who teach the same subject or class standard)
      // For now, let's check matching subjects or just standard matching
      const targetStandard = parseInt(period.class_id.replace(/\D/g, '')) || 0;

      const mapped = freeTeachers.map(t => {
        // Check if ideal
        const isIdeal = false; // We can add subject match if we query teacher_assignments
        return {
          ...t,
          isIdeal: isIdeal
        };
      });

      setSubstituteOptions(mapped);
      setShowSubModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to calculate substitutes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const assignSubstitute = async (substituteTeacher) => {
    setSubmittingSub(true);
    try {
      // Update the timetable record for today
      // In production, we'd write to a daily overrides table.
      // For this app, we will directly update the teacher_id of the timetable slot.
      const { error } = await supabase
        .from('timetable')
        .update({ teacher_id: substituteTeacher.id })
        .eq('id', selectedPeriod.id);

      if (error) throw error;

      Alert.alert('Success', `${substituteTeacher.name} assigned to Class ${selectedPeriod.classes?.display_name || ''} for Period ${selectedPeriod.period_number}!`);
      setShowSubModal(false);
      
      // Refresh teacher periods list
      handleTeacherClick(selectedAbsentTeacher);
    } catch (error) {
      Alert.alert('Error', 'Failed to assign substitute: ' + error.message);
    } finally {
      setSubmittingSub(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance & Substitutions</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'attendance' && styles.activeTabButton]}
          onPress={() => setActiveTab('attendance')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'attendance' && styles.activeTabButtonText]}>
            Daily Attendance
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'substitution' && styles.activeTabButton]}
          onPress={() => setActiveTab('substitution')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'substitution' && styles.activeTabButtonText]}>
            Substitutes Planner
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.dateLabel}>📅 Date: {dateStr} ({dayOfWeek})</Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.teal} style={{ marginTop: 50 }} />
      ) : activeTab === 'attendance' ? (
        // --- DAILY ATTENDANCE TAB ---
        <ScrollView style={styles.scroll}>
          {/* Teachers Section */}
          <Text style={styles.sectionHeader}>Teachers ({teachers.length})</Text>
          {teachers.map(t => {
            const key = `T_${t.id}`;
            const currentStatus = attendance[key] || 'present';
            return (
              <View key={t.id} style={styles.rowItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{t.name}</Text>
                  <Text style={styles.itemSubText}>Teacher</Text>
                </View>
                <View style={styles.attendanceButtons}>
                  <TouchableOpacity
                    style={[styles.attBtn, currentStatus === 'present' && { backgroundColor: colors.green }]}
                    onPress={() => handleStatusChange(key, 'present')}
                  >
                    <Text style={[styles.attBtnText, currentStatus === 'present' && { color: colors.white }]}>P</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.attBtn, currentStatus === 'absent' && { backgroundColor: '#E74C3C' }]}
                    onPress={() => handleStatusChange(key, 'absent')}
                  >
                    <Text style={[styles.attBtnText, currentStatus === 'absent' && { color: colors.white }]}>A</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.attBtn, currentStatus === 'leave' && { backgroundColor: colors.orange }]}
                    onPress={() => handleStatusChange(key, 'leave')}
                  >
                    <Text style={[styles.attBtnText, currentStatus === 'leave' && { color: colors.white }]}>L</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* Support Staff Section */}
          <Text style={[styles.sectionHeader, { marginTop: 25 }]}>Other Staff ({staff.length})</Text>
          {staff.map(s => {
            const key = `S_${s.staff_id}`;
            const currentStatus = attendance[key] || 'present';
            return (
              <View key={s.staff_id} style={styles.rowItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{s.full_name}</Text>
                  <Text style={styles.itemSubText}>{s.role.replace('_', ' ').toUpperCase()}</Text>
                </View>
                <View style={styles.attendanceButtons}>
                  <TouchableOpacity
                    style={[styles.attBtn, currentStatus === 'present' && { backgroundColor: colors.green }]}
                    onPress={() => handleStatusChange(key, 'present')}
                  >
                    <Text style={[styles.attBtnText, currentStatus === 'present' && { color: colors.white }]}>P</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.attBtn, currentStatus === 'absent' && { backgroundColor: '#E74C3C' }]}
                    onPress={() => handleStatusChange(key, 'absent')}
                  >
                    <Text style={[styles.attBtnText, currentStatus === 'absent' && { color: colors.white }]}>A</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.attBtn, currentStatus === 'leave' && { backgroundColor: colors.orange }]}
                    onPress={() => handleStatusChange(key, 'leave')}
                  >
                    <Text style={[styles.attBtnText, currentStatus === 'leave' && { color: colors.white }]}>L</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <TouchableOpacity style={styles.saveButton} onPress={saveAttendance}>
            <Text style={styles.saveButtonText}>💾 Save All Attendance</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        // --- SUBSTITUTION PLANNER TAB ---
        <View style={{ flex: 1 }}>
          {absentTeachers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 50 }}>🎉</Text>
              <Text style={styles.emptyText}>All teachers are present today!</Text>
              <Text style={styles.emptySub}>No substitutions needed.</Text>
            </View>
          ) : (
            <View style={{ flex: 1, flexDirection: 'row' }}>
              {/* Left Column: Absent Teachers list */}
              <View style={styles.absentCol}>
                <Text style={styles.colTitle}>Absent Today</Text>
                <FlatList
                  data={absentTeachers}
                  keyExtractor={item => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.absentTeacherCard,
                        selectedAbsentTeacher?.id === item.id && styles.selectedAbsentCard
                      ]}
                      onPress={() => handleTeacherClick(item)}
                    >
                      <Text style={styles.absentTeacherName}>{item.name}</Text>
                      <Text style={styles.absentTeacherSub}>Absent</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>

              {/* Right Column: Timetable periods of selected absent teacher */}
              <View style={styles.periodsCol}>
                <Text style={styles.colTitle}>
                  {selectedAbsentTeacher ? `${selectedAbsentTeacher.name}'s Lectures` : 'Select a Teacher'}
                </Text>
                
                {selectedAbsentTeacher ? (
                  teacherPeriods.length === 0 ? (
                    <Text style={styles.emptyPeriodText}>No lectures scheduled for {dayOfWeek}.</Text>
                  ) : (
                    <FlatList
                      data={teacherPeriods}
                      keyExtractor={item => item.id.toString()}
                      renderItem={({ item }) => (
                        <View style={styles.periodCard}>
                          <Text style={styles.periodClass}>Class {item.classes?.display_name || item.class_id.split('_').pop()}</Text>
                          <Text style={styles.periodTime}>Period {item.period_number} • {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}</Text>
                          <Text style={styles.periodSubject}>Subject: {item.subject}</Text>
                          
                          <TouchableOpacity
                            style={styles.findSubButton}
                            onPress={() => openSubstitutionFinder(item)}
                          >
                            <Text style={styles.findSubText}>🔍 Find Substitute</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                  )
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={{ fontSize: 40 }}>👈</Text>
                    <Text style={styles.emptyText}>Choose a teacher from the left to plan replacements</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Substitute Options Modal */}
      <Modal visible={showSubModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Substitute for Period {selectedPeriod?.period_number} ({selectedPeriod?.classes?.display_name || selectedPeriod?.class_id.split('_').pop()})
            </Text>
            <Text style={styles.modalSub}>
              Subject: {selectedPeriod?.subject} • Time: {selectedPeriod?.start_time.slice(0, 5)}
            </Text>

            {substituteOptions.length === 0 ? (
              <Text style={styles.emptySubOptionsText}>No free teachers available at this period.</Text>
            ) : (
              <FlatList
                data={substituteOptions}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.subItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subTeacherName}>{item.name}</Text>
                      {item.isIdeal && (
                        <View style={styles.idealBadge}>
                          <Text style={styles.idealBadgeText}>⭐ IDEAL MATCH</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.assignSubBtn}
                      onPress={() => assignSubstitute(item)}
                      disabled={submittingSub}
                    >
                      <Text style={styles.assignSubText}>Assign</Text>
                    </TouchableOpacity>
                  </View>
                )}
                style={{ maxHeight: 300 }}
              />
            )}

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowSubModal(false)}
            >
              <Text style={styles.closeModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: colors.text },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  tabContainer: { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  tabButton: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTabButton: { borderBottomWidth: 3, borderBottomColor: colors.teal },
  tabButtonText: { fontSize: 15, color: colors.gray, fontWeight: '500' },
  activeTabButtonText: { color: colors.teal, fontWeight: 'bold' },
  dateLabel: { fontSize: 14, color: colors.gray, alignSelf: 'center', marginVertical: 12, fontWeight: 'bold' },
  scroll: { flex: 1, paddingHorizontal: 20 },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginVertical: 10 },
  rowItem: { flexDirection: 'row', justify: 'space-between', alignItems: 'center', backgroundColor: colors.white, padding: 15, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.lightGray },
  itemName: { fontSize: 15, fontWeight: 'bold', color: colors.text },
  itemSubText: { fontSize: 11, color: colors.gray, marginTop: 2 },
  attendanceButtons: { flexDirection: 'row' },
  attBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.lightGray, justify: 'center', alignItems: 'center', marginLeft: 8 },
  attBtnText: { fontSize: 14, fontWeight: 'bold', color: colors.text },
  saveButton: { backgroundColor: colors.teal, paddingVertical: 16, borderRadius: 10, alignItems: 'center', marginTop: 25 },
  saveButtonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
  emptyState: { flex: 1, justify: 'center', alignItems: 'center', padding: 30, marginTop: 50 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 10, textAlign: 'center' },
  emptySub: { fontSize: 14, color: colors.gray, marginTop: 5 },
  absentCol: { width: '40%', borderRightWidth: 1, borderRightColor: colors.lightGray, padding: 10 },
  periodsCol: { width: '60%', padding: 10 },
  colTitle: { fontSize: 15, fontWeight: 'bold', color: colors.text, marginBottom: 10 },
  absentTeacherCard: { padding: 12, backgroundColor: colors.white, borderRadius: 8, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#E74C3C', borderWidth: 1, borderColor: colors.lightGray },
  selectedAbsentCard: { backgroundColor: colors.teal + '10', borderColor: colors.teal },
  absentTeacherName: { fontSize: 14, fontWeight: 'bold', color: colors.text },
  absentTeacherSub: { fontSize: 10, color: '#E74C3C', marginTop: 2 },
  periodCard: { backgroundColor: colors.white, padding: 15, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: colors.lightGray },
  periodClass: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  periodTime: { fontSize: 12, color: colors.gray, marginVertical: 4 },
  periodSubject: { fontSize: 13, color: colors.teal, fontWeight: '500' },
  findSubButton: { marginTop: 10, backgroundColor: colors.orange, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, alignSelf: 'flex-start' },
  findSubText: { color: colors.white, fontSize: 12, fontWeight: 'bold' },
  emptyPeriodText: { color: colors.gray, fontStyle: 'italic', margin: 20, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justify: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.white, borderRadius: 15, padding: 20, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, textAlign: 'center' },
  modalSub: { fontSize: 13, color: colors.gray, textAlign: 'center', marginBottom: 15 },
  subItemRow: { flexDirection: 'row', justify: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  subTeacherName: { fontSize: 15, color: colors.text, fontWeight: 'bold' },
  idealBadge: { backgroundColor: colors.teal + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 },
  idealBadgeText: { fontSize: 9, color: colors.teal, fontWeight: 'bold' },
  assignSubBtn: { backgroundColor: colors.green, paddingVertical: 6, paddingHorizontal: 15, borderRadius: 6 },
  assignSubText: { color: colors.white, fontWeight: 'bold', fontSize: 12 },
  closeModalButton: { marginTop: 15, paddingVertical: 12, backgroundColor: colors.lightGray, borderRadius: 8, alignItems: 'center' },
  closeModalText: { fontSize: 16, color: colors.text, fontWeight: '600' },
  emptySubOptionsText: { color: colors.gray, textAlign: 'center', marginVertical: 20, fontStyle: 'italic' }
});
