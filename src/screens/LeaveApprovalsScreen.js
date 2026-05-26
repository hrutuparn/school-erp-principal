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
  ActivityIndicator
} from 'react-native';
import { supabase } from '../services/supabase';

const colors = {
  background: '#F5F0E8',
  white: '#FFFFFF',
  text: '#2C3E50',
  orange: '#F39C12',
  teal: '#1ABC9C',
  green: '#27AE60',
  gray: '#95A5A6',
  lightGray: '#ECF0F1',
  red: '#E74C3C'
};

export default function LeaveApprovalsScreen({ onBack, lang }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  async function fetchLeaveRequests() {
    setLoading(true);
    try {
      // 1. Get current logged in principal
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated.');

      const { data: principalData } = await supabase
        .from('principals')
        .select('school_id')
        .eq('principal_id', user.id)
        .single();

      if (!principalData) throw new Error('Principal school profile not found.');

      // 2. Fetch pending teacher leave requests
      const { data, error } = await supabase
        .from('document_requests')
        .select('*')
        .eq('school_id', principalData.school_id)
        .eq('type', 'teacher_leave')
        .order('requested_on', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  // Parse leave details stored in the note JSON field
  const parseLeaveDetails = (noteString) => {
    try {
      return JSON.parse(noteString);
    } catch (e) {
      return {
        teacher_name: 'Unknown Teacher',
        start_date: 'N/A',
        end_date: 'N/A',
        reason: noteString || 'No reason specified'
      };
    }
  };

  const generateDateRange = (startDateStr, endDateStr) => {
    const dates = [];
    let current = new Date(startDateStr);
    const end = new Date(endDateStr);
    
    // Safety check to prevent infinite loop
    let count = 0;
    while (current <= end && count < 60) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
      count++;
    }
    return dates;
  };

  const handleProcessRequest = async (requestId, status, details) => {
    setProcessingId(requestId);
    try {
      // 1. Resolve school_id
      const { data: { user } } = await supabase.auth.getUser();
      const { data: principalData } = await supabase
        .from('principals')
        .select('school_id')
        .eq('principal_id', user.id)
        .single();
      
      const schoolId = principalData ? principalData.school_id : 'SCH_MH_27430012';

      // 2. Update status in document_requests
      const { error: updateError } = await supabase
        .from('document_requests')
        .update({
          status: status,
          resolved_on: new Date().toISOString()
        })
        .eq('request_id', requestId);

      if (updateError) throw updateError;

      // 3. If approved, automatically log 'leave' in staff_attendance
      if (status === 'approved' && details.teacher_id && details.start_date && details.end_date) {
        const leaveDates = generateDateRange(details.start_date, details.end_date);
        
        const attendanceInserts = leaveDates.map(dateStr => ({
          person_id: parseInt(details.teacher_id),
          person_type: 'teacher',
          school_id: schoolId,
          date: dateStr,
          status: 'leave',
          marked_by: 'principal'
        }));

        if (attendanceInserts.length > 0) {
          const { error: attendError } = await supabase
            .from('staff_attendance')
            .insert(attendanceInserts);

          if (attendError) {
            console.log('Error logging auto-attendance leaves:', attendError.message);
          }
        }
      }

      Alert.alert('Success', `Leave request has been ${status}.`);
      fetchLeaveRequests();
    } catch (e) {
      Alert.alert('Process Failed', e.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📝 Leave Approvals</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={{ marginTop: 15, color: colors.gray }}>Loading leave requests...</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={item => item.request_id.toString()}
          contentContainerStyle={{ padding: 15 }}
          renderItem={({ item }) => {
            const details = parseLeaveDetails(item.note);
            const isPending = item.status === 'pending';
            
            return (
              <View style={styles.requestCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.teacherName}>{details.teacher_name}</Text>
                  <View style={[
                    styles.statusBadge,
                    item.status === 'approved' && { backgroundColor: colors.green + '15' },
                    item.status === 'rejected' && { backgroundColor: colors.red + '15' },
                    item.status === 'pending' && { backgroundColor: colors.orange + '15' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      item.status === 'approved' && { color: colors.green },
                      item.status === 'rejected' && { color: colors.red },
                      item.status === 'pending' && { color: colors.orange }
                    ]}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.dateInfoBox}>
                  <Text style={styles.dateLabel}>LEAVE PERIOD:</Text>
                  <Text style={styles.dateRangeText}>
                    📅 {details.start_date}   to   {details.end_date}
                  </Text>
                </View>

                <Text style={styles.reasonLabel}>REASON FOR LEAVE:</Text>
                <Text style={styles.reasonText}>{details.reason}</Text>

                {isPending && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleProcessRequest(item.request_id, 'rejected', details)}
                      disabled={processingId !== null}
                    >
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleProcessRequest(item.request_id, 'approved', details)}
                      disabled={processingId !== null}
                    >
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🍃</Text>
              <Text style={styles.emptyText}>No teacher leave requests found.</Text>
            </View>
          }
        />
      )}
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  dateInfoBox: {
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.gray,
    marginBottom: 3,
  },
  dateRangeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  reasonLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.gray,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    marginBottom: 15,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
    paddingTop: 12,
  },
  actionBtn: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectBtn: {
    borderWidth: 1,
    borderColor: colors.red,
  },
  rejectBtnText: {
    color: colors.red,
    fontWeight: 'bold',
  },
  approveBtn: {
    backgroundColor: colors.green,
  },
  approveBtnText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 14,
    color: colors.gray,
  },
});
