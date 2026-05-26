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
  TextInput,
  Modal
} from 'react-native';
import { supabase } from '../services/supabase';
import colors from '../components/colors';

export default function DocumentsScreen({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  
  // Update Modal details
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [updatedValue, setUpdatedValue] = useState(''); // New name or new DOB

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_requests')
        .select(`
          *,
          students ( id, first_name, last_name, birth_date, class, roll_number, gr_number, parent_name, parent_phone )
        `)
        .order('requested_on', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load requests: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (request, actionStatus) => {
    if (actionStatus === 'rejected') {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('document_requests')
          .update({
            status: 'rejected',
            resolved_on: new Date()
          })
          .eq('request_id', request.request_id);

        if (error) throw error;
        Alert.alert('Success', 'Request has been rejected.');
        fetchRequests();
      } catch (error) {
        Alert.alert('Error', error.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // If approved, trigger specific database modifications
    setSelectedRequest(request);
    setUpdatedValue('');
    
    if (request.type === 'leaving_cert') {
      Alert.alert(
        'Approve Leaving Certificate',
        `Are you sure you want to issue the Leaving Certificate for ${request.students?.first_name} ${request.students?.last_name}? (This will mark the student as inactive).`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Approve', 
            onPress: () => executeLeavingCert(request) 
          }
        ]
      );
    } else {
      // For name change and DOB change, open modal to input/verify the new values
      setShowApprovalModal(true);
    }
  };

  const executeLeavingCert = async (request) => {
    setLoading(true);
    try {
      // 1. Mark student as inactive
      const { error: studentErr } = await supabase
        .from('students')
        .update({ is_active: false })
        .eq('id', request.student_id);

      if (studentErr) throw studentErr;

      // 2. Mark request as approved
      const { error: reqErr } = await supabase
        .from('document_requests')
        .update({
          status: 'approved',
          resolved_on: new Date()
        })
        .eq('request_id', request.request_id);

      if (reqErr) throw reqErr;

      Alert.alert('Success', 'Leaving Certificate Approved. Student marked as Inactive.');
      fetchRequests();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const executeDataUpdate = async () => {
    if (!updatedValue.trim()) {
      Alert.alert('Error', 'Please enter the updated value.');
      return;
    }

    setLoading(true);
    try {
      let updatePayload = {};
      if (selectedRequest.type === 'name_change') {
        const parts = updatedValue.trim().split(' ');
        const first = parts[0] || '';
        const last = parts.slice(1).join(' ') || '';
        updatePayload = { first_name: first, last_name: last, student_name_full: updatedValue.trim() };
      } else if (selectedRequest.type === 'dob_change') {
        updatePayload = { birth_date: updatedValue.trim() };
      }

      // 1. Update Student Table
      const { error: studentErr } = await supabase
        .from('students')
        .update(updatePayload)
        .eq('id', selectedRequest.student_id);

      if (studentErr) throw studentErr;

      // 2. Update Request Table
      const { error: reqErr } = await supabase
        .from('document_requests')
        .update({
          status: 'approved',
          resolved_on: new Date(),
          note: `${selectedRequest.note || ''} (Resolved value: ${updatedValue.trim()})`
        })
        .eq('request_id', selectedRequest.request_id);

      if (reqErr) throw reqErr;

      Alert.alert('Success', 'Request approved and student details updated successfully!');
      setShowApprovalModal(false);
      fetchRequests();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getRequestTypeName = (type) => {
    switch (type) {
      case 'leaving_cert': return 'Leaving Certificate';
      case 'name_change': return 'Name Correction';
      case 'dob_change': return 'DOB Correction';
      default: return type;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Document Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && requests.length === 0 ? (
        <ActivityIndicator size="large" color={colors.teal} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={item => item.request_id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const student = item.students;
            const parent = student ? { name: student.parent_name, phone: student.parent_phone } : null;
            const isPending = item.status === 'pending';

            return (
              <View style={styles.reqCard}>
                <View style={styles.reqHeader}>
                  <Text style={styles.reqType}>{getRequestTypeName(item.type)}</Text>
                  <View style={[
                    styles.statusBadge,
                    item.status === 'approved' && { backgroundColor: colors.green + '20' },
                    item.status === 'rejected' && { backgroundColor: '#E74C3C20' },
                    item.status === 'pending' && { backgroundColor: colors.orange + '20' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      item.status === 'approved' && { color: colors.green },
                      item.status === 'rejected' && { color: '#E74C3C' },
                      item.status === 'pending' && { color: colors.orange }
                    ]}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Details */}
                <View style={styles.reqBody}>
                  <Text style={styles.detailLabel}>Student: <Text style={styles.detailVal}>{student?.first_name} {student?.last_name} ({student?.class})</Text></Text>
                  <Text style={styles.detailLabel}>GR Number: <Text style={styles.detailVal}>{student?.gr_number || 'N/A'}</Text></Text>
                  <Text style={styles.detailLabel}>Current Value: <Text style={styles.detailVal}>{item.type === 'name_change' ? `${student?.first_name} ${student?.last_name}` : (item.type === 'dob_change' ? student?.birth_date : 'Active Student')}</Text></Text>
                  <Text style={styles.detailLabel}>Parent: <Text style={styles.detailVal}>{parent?.name || 'Unknown'} (📞 {parent?.phone})</Text></Text>
                  <Text style={styles.detailLabel}>Requested Change/Note: <Text style={[styles.detailVal, { fontStyle: 'italic', color: colors.teal }]}>"{item.note || 'No description'}"</Text></Text>
                  <Text style={styles.dateLabel}>Applied on: {new Date(item.requested_on).toLocaleDateString()}</Text>
                </View>

                {isPending && (
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: '#E74C3C' }]}
                      onPress={() => handleResolve(item, 'rejected')}
                    >
                      <Text style={[styles.btnText, { color: '#E74C3C' }]}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.green, borderColor: colors.green }]}
                      onPress={() => handleResolve(item, 'approved')}
                    >
                      <Text style={[styles.btnText, { color: colors.white }]}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 50 }}>📂</Text>
              <Text style={styles.emptyText}>No requests from parents yet.</Text>
            </View>
          }
        />
      )}

      {/* Approval Input Modal */}
      <Modal visible={showApprovalModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Approve Request & Save Changes</Text>
            <Text style={styles.modalSub}>
              Apply the requested correction to the Student Database.
            </Text>

            <Text style={styles.inputLabel}>
              {selectedRequest?.type === 'name_change' ? 'Correct Full Name' : 'Correct Date of Birth (DD-MM-YYYY)'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={selectedRequest?.type === 'name_change' ? 'e.g. Rahul Suresh Sharma' : 'e.g. 14-08-2010'}
              value={updatedValue}
              onChangeText={setUpdatedValue}
              placeholderTextColor={colors.gray}
            />

            <TouchableOpacity
              style={[styles.modalBtnPrimary, { backgroundColor: colors.green }]}
              onPress={executeDataUpdate}
              disabled={loading}
            >
              <Text style={styles.modalBtnText}>✓ Approve and Update Database</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtnPrimary, { backgroundColor: colors.gray, marginTop: 10 }]}
              onPress={() => setShowApprovalModal(false)}
            >
              <Text style={styles.modalBtnText}>Cancel</Text>
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
  list: { padding: 20 },
  reqCard: { backgroundColor: colors.white, padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: colors.lightGray },
  reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.lightGray, paddingBottom: 10, marginBottom: 10 },
  reqType: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  reqBody: { paddingHorizontal: 2 },
  detailLabel: { fontSize: 13, color: colors.gray, marginBottom: 4 },
  detailVal: { color: colors.text, fontWeight: '500' },
  dateLabel: { fontSize: 11, color: colors.gray, marginTop: 10 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  actionBtn: { width: '48%', paddingVertical: 10, borderRadius: 6, borderWidth: 1, alignItems: 'center' },
  btnText: { fontSize: 14, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 50, marginTop: 50 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: colors.gray, marginTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.white, borderRadius: 15, padding: 20, width: '90%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, textAlign: 'center' },
  modalSub: { fontSize: 13, color: colors.gray, textAlign: 'center', marginVertical: 8 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: colors.text, marginTop: 15, marginBottom: 5 },
  modalInput: { backgroundColor: colors.lightGray, padding: 12, borderRadius: 8, fontSize: 15, color: colors.text, marginBottom: 20 },
  modalBtnPrimary: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  modalBtnText: { color: colors.white, fontSize: 15, fontWeight: 'bold' }
});
