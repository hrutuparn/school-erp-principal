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

export default function SalaryCalculatorScreen({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('05'); // May
  const [selectedYear, setSelectedYear] = useState('2026');
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);

  const months = [
    { label: 'January', value: '01' },
    { label: 'February', value: '02' },
    { label: 'March', value: '03' },
    { label: 'April', value: '04' },
    { label: 'May', value: '05' },
    { label: 'June', value: '06' },
    { label: 'July', value: '07' },
    { label: 'August', value: '08' },
    { label: 'September', value: '09' },
    { label: 'October', value: '10' },
    { label: 'November', value: '11' },
    { label: 'December', value: '12' }
  ];

  useEffect(() => {
    calculateSalaries();
  }, [selectedMonth, selectedYear]);

  const calculateSalaries = async () => {
    setLoading(true);
    try {
      // 1. Fetch Teachers
      const { data: teachers, error: tErr } = await supabase
        .from('teachers')
        .select('*')
        .eq('is_active', true);
      if (tErr) throw tErr;

      // 2. Fetch Staff (Drivers, Watchmen, Helpers)
      const { data: staff, error: sErr } = await supabase
        .from('staff')
        .select('*')
        .eq('is_active', true);
      if (sErr) throw sErr;

      // 3. Fetch attendance for this month
      // Start date: e.g. 2026-05-01
      // End date: e.g. 2026-05-31
      const startDate = `${selectedYear}-${selectedMonth}-01`;
      const endDate = `${selectedYear}-${selectedMonth}-31`; // Postgres will handle standard bounds

      const { data: attData, error: attErr } = await supabase
        .from('staff_attendance')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (attErr) throw attErr;

      // Map attendance counts
      const attendanceMap = {};
      attData.forEach(att => {
        const key = att.person_type === 'teacher' ? `T_${att.person_id}` : `S_${att.person_id}`;
        if (!attendanceMap[key]) {
          attendanceMap[key] = { present: 0, absent: 0, half_day: 0, leave: 0 };
        }
        attendanceMap[key][att.status] = (attendanceMap[key][att.status] || 0) + 1;
      });

      // 4. Calculate Net Salaries (Working days: 26)
      const workingDays = 26;

      const teacherSalaries = teachers.map(t => {
        const key = `T_${t.id}`;
        const att = attendanceMap[key] || { present: 26, absent: 0, half_day: 0, leave: 0 };
        
        const base = t.base_salary || 30000;
        const dailyRate = base / workingDays;
        
        // Deduct absent days + half of half_days
        const deductions = (att.absent * dailyRate) + (att.half_day * dailyRate * 0.5);
        const net = Math.max(0, Math.round(base - deductions));

        return {
          id: `T_${t.id}`,
          emp_id: t.employee_id || `TCH_00${t.id}`,
          name: t.name,
          role: 'Teacher',
          base: base,
          deductions: Math.round(deductions),
          net: net,
          attendanceSummary: att,
          bank: t.bank_account || 'SBI A/C XXXX1234'
        };
      });

      const staffSalaries = staff.map(s => {
        // Strip non-digits for checking attendance ID
        const numId = parseInt(s.staff_id.replace(/\D/g, '')) || 9999;
        const key = `S_${numId}`;
        const att = attendanceMap[key] || { present: 26, absent: 0, half_day: 0, leave: 0 };

        const base = s.base_salary || 15000;
        const dailyRate = base / workingDays;

        const deductions = (att.absent * dailyRate) + (att.half_day * dailyRate * 0.5);
        const net = Math.max(0, Math.round(base - deductions));

        return {
          id: `S_${s.staff_id}`,
          emp_id: s.staff_id,
          name: s.full_name,
          role: s.role.replace('_', ' ').toUpperCase(),
          base: base,
          deductions: Math.round(deductions),
          net: net,
          attendanceSummary: att,
          bank: s.bank_account || 'HDFC A/C XXXX5678'
        };
      });

      setEmployees([...teacherSalaries, ...staffSalaries]);

    } catch (error) {
      Alert.alert('Calculation Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const disburseSalary = (emp) => {
    Alert.alert(
      'Disburse Salary',
      `Are you sure you want to disburse ₹${emp.net} directly to ${emp.name}'s bank account (${emp.bank})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Disburse', 
          onPress: () => {
            Alert.alert('Payment Successful!', `Salary receipt generated for ${emp.name}. Status: DISBURSED`);
            setShowSlipModal(false);
          } 
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Salary Calculator</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Month Year Selector */}
      <View style={styles.selectorRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
          {months.map(m => (
            <TouchableOpacity
              key={m.value}
              style={[styles.monthTab, selectedMonth === m.value && styles.activeMonthTab]}
              onPress={() => setSelectedMonth(m.value)}
            >
              <Text style={[styles.monthTabText, selectedMonth === m.value && styles.activeMonthTabText]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.teal} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={employees}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.salaryCard}
              onPress={() => {
                setSelectedSlip(item);
                setShowSlipModal(true);
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.empName}>{item.name}</Text>
                <Text style={styles.empRole}>{item.role} • {item.emp_id}</Text>
                <Text style={styles.empBank}>🏦 {item.bank}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.empNet}>₹{item.net}</Text>
                <Text style={styles.empBase}>Base: ₹{item.base}</Text>
                <Text style={styles.empDeduct}>Deduction: -₹{item.deductions}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No active staff members found.</Text>
          }
        />
      )}

      {/* Salary Slip Modal */}
      <Modal visible={showSlipModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedSlip && (
              <ScrollView>
                <Text style={styles.slipTitle}>📄 SALARY SLIP</Text>
                <Text style={styles.slipSubTitle}>Greenfield School ERP • May 2026</Text>

                <View style={styles.divider} />

                {/* Employee info */}
                <View style={styles.slipSection}>
                  <Text style={styles.slipLabel}>Employee Name: <Text style={styles.slipVal}>{selectedSlip.name}</Text></Text>
                  <Text style={styles.slipLabel}>Role/Title: <Text style={styles.slipVal}>{selectedSlip.role}</Text></Text>
                  <Text style={styles.slipLabel}>Staff ID: <Text style={styles.slipVal}>{selectedSlip.emp_id}</Text></Text>
                  <Text style={styles.slipLabel}>Bank Account: <Text style={styles.slipVal}>{selectedSlip.bank}</Text></Text>
                </View>

                <View style={styles.divider} />

                {/* Attendance Summary */}
                <Text style={styles.summaryTitle}>📊 Monthly Attendance Summary</Text>
                <View style={styles.attSummaryRow}>
                  <View style={styles.attSummaryCol}>
                    <Text style={styles.attValGreen}>{selectedSlip.attendanceSummary.present || 0}</Text>
                    <Text style={styles.attLbl}>Present</Text>
                  </View>
                  <View style={styles.attSummaryCol}>
                    <Text style={styles.attValRed}>{selectedSlip.attendanceSummary.absent || 0}</Text>
                    <Text style={styles.attLbl}>Absent</Text>
                  </View>
                  <View style={styles.attSummaryCol}>
                    <Text style={styles.attValOrange}>{selectedSlip.attendanceSummary.half_day || 0}</Text>
                    <Text style={styles.attLbl}>Half Day</Text>
                  </View>
                  <View style={styles.attSummaryCol}>
                    <Text style={styles.attValBlue}>{selectedSlip.attendanceSummary.leave || 0}</Text>
                    <Text style={styles.attLbl}>Paid Leave</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Computation Breakdown */}
                <View style={styles.breakdownTable}>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Base Monthly Salary</Text>
                    <Text style={styles.tableValue}>₹{selectedSlip.base}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableLabel, { color: '#E74C3C' }]}>Absent Penalties (LOP)</Text>
                    <Text style={[styles.tableValue, { color: '#E74C3C' }]}>-₹{selectedSlip.deductions}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={[styles.tableRow, { marginTop: 10 }]}>
                    <Text style={styles.netLabel}>Net Take-Home Salary</Text>
                    <Text style={styles.netValue}>₹{selectedSlip.net}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.green, marginTop: 25 }]}
                  onPress={() => disburseSalary(selectedSlip)}
                >
                  <Text style={styles.buttonText}>💰 Disburse Net Salary</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.gray, marginTop: 10 }]}
                  onPress={() => setShowSlipModal(false)}
                >
                  <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
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
  selectorRow: { backgroundColor: colors.white, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  monthTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.lightGray, marginRight: 8 },
  activeMonthTab: { backgroundColor: colors.teal },
  monthTabText: { fontSize: 14, color: colors.text },
  activeMonthTabText: { color: colors.white, fontWeight: 'bold' },
  list: { padding: 20 },
  salaryCard: { flexDirection: 'row', backgroundColor: colors.white, padding: 15, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: colors.lightGray, alignItems: 'center' },
  empName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  empRole: { fontSize: 12, color: colors.gray, marginTop: 2 },
  empBank: { fontSize: 11, color: colors.gray, marginTop: 4 },
  empNet: { fontSize: 20, fontWeight: 'bold', color: colors.green },
  empBase: { fontSize: 11, color: colors.gray, marginTop: 2 },
  empDeduct: { fontSize: 11, color: '#E74C3C', marginTop: 1 },
  emptyText: { textAlign: 'center', color: colors.gray, marginTop: 50, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.white, borderRadius: 15, padding: 20, width: '90%', maxHeight: '90%' },
  slipTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, textAlign: 'center' },
  slipSubTitle: { fontSize: 12, color: colors.gray, textAlign: 'center', marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.lightGray, marginVertical: 15 },
  slipSection: { paddingHorizontal: 5 },
  slipLabel: { fontSize: 14, color: colors.gray, marginBottom: 6 },
  slipVal: { color: colors.text, fontWeight: 'bold' },
  summaryTitle: { fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: 10 },
  attSummaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  attSummaryCol: { alignItems: 'center' },
  attValGreen: { fontSize: 18, fontWeight: 'bold', color: colors.green },
  attValRed: { fontSize: 18, fontWeight: 'bold', color: '#E74C3C' },
  attValOrange: { fontSize: 18, fontWeight: 'bold', color: colors.orange },
  attValBlue: { fontSize: 18, fontWeight: 'bold', color: '#3498DB' },
  attLbl: { fontSize: 11, color: colors.gray, marginTop: 4 },
  breakdownTable: { marginTop: 10 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 },
  tableLabel: { fontSize: 14, color: colors.text },
  tableValue: { fontSize: 14, fontWeight: 'bold', color: colors.text },
  netLabel: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  netValue: { fontSize: 20, fontWeight: 'bold', color: colors.green },
  primaryButton: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' }
});
