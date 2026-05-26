import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView
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
  lightGray: '#ECF0F0',
  purple: '#9B59B6'
};

export default function LoginScreen({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1); // 1: School & Principal, 2: Classes & Staff, 3: Teachers
  const [loading, setLoading] = useState(false);

  // --- Step 1 Fields (School & Principal) ---
  const [schoolName, setSchoolName] = useState('');
  const [udiseNumber, setUdiseNumber] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [dob, setDob] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // --- Step 2 Fields (Classes & Staff Counts) ---
  const [totalClasses, setTotalClasses] = useState('5');
  const [totalDrivers, setTotalDrivers] = useState('2');
  const [totalWatchmen, setTotalWatchmen] = useState('2');
  const [totalHelpers, setTotalHelpers] = useState('2');

  // --- Step 3 Fields (Individual Teachers Setup) ---
  const [teachersList, setTeachersList] = useState([]);
  const [tempTeacherName, setTempTeacherName] = useState('');
  const [tempTeacherEmail, setTempTeacherEmail] = useState('');
  const [tempTeacherPhone, setTempTeacherPhone] = useState('');
  const [tempTeacherSubject, setTempTeacherSubject] = useState('');
  const [tempTeacherQual, setTempTeacherQual] = useState('');

  const addTeacherToTempList = () => {
    if (!tempTeacherName || !tempTeacherEmail || !tempTeacherSubject) {
      Alert.alert('Error', 'Please fill in Name, Email, and Subject for the teacher');
      return;
    }
    const newTeacher = {
      name: tempTeacherName.trim(),
      email: tempTeacherEmail.trim().toLowerCase(),
      phone: tempTeacherPhone.trim(),
      subject: tempTeacherSubject.trim(),
      qualification: tempTeacherQual.trim()
    };
    setTeachersList([...teachersList, newTeacher]);
    
    // Reset temp fields
    setTempTeacherName('');
    setTempTeacherEmail('');
    setTempTeacherPhone('');
    setTempTeacherSubject('');
    setTempTeacherQual('');
  };

  const removeTeacherFromTempList = (idx) => {
    setTeachersList(teachersList.filter((_, i) => i !== idx));
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) throw error;
      onLogin();
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!schoolName || !udiseNumber || !principalName || !email || !password) {
      Alert.alert('Error', 'Please make sure School Name, UDISE, Principal Name, Email, and Password are filled in Step 1.');
      return;
    }

    setLoading(true);
    try {
      // 1. Register Auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (authError) throw authError;

      // 2. Insert School
      const schoolId = `SCH_MH_${udiseNumber.trim()}`;
      const { error: schoolError } = await supabase
        .from('schools')
        .insert([{
          school_id: schoolId,
          name: schoolName.trim(),
          udise_number: udiseNumber.trim(),
          address: schoolAddress.trim(),
          email: email.trim().toLowerCase(),
          phone: mobile.trim(),
          plan: 'free',
          bus_facility: true,
          midday_meal: true
        }]);

      if (schoolError) throw schoolError;

      // 3. Insert Principal
      const { error: principalError } = await supabase
        .from('principals')
        .insert([{
          principal_id: `PRI_${Math.floor(100 + Math.random() * 900)}`,
          school_id: schoolId,
          full_name: principalName.trim(),
          mobile: mobile.trim(),
          email: email.trim().toLowerCase(),
          date_of_birth: dob.trim() || null,
          password_hash: 'auth_managed'
        }]);

      if (principalError) throw principalError;

      // 4. Insert Drivers/Watchmen/Helpers into Staff
      const staffInserts = [];
      const numDrivers = parseInt(totalDrivers) || 0;
      for (let i = 1; i <= numDrivers; i++) {
        staffInserts.push({
          staff_id: `STF_DRV_${Math.floor(1000 + Math.random() * 9000)}`,
          school_id: schoolId,
          full_name: `Driver ${i}`,
          role: 'bus_driver',
          is_active: true,
          base_salary: 15000
        });
      }
      const numWatchmen = parseInt(totalWatchmen) || 0;
      for (let i = 1; i <= numWatchmen; i++) {
        staffInserts.push({
          staff_id: `STF_WCH_${Math.floor(1000 + Math.random() * 9000)}`,
          school_id: schoolId,
          full_name: `Watchman ${i}`,
          role: 'watchman',
          is_active: true,
          base_salary: 12000
        });
      }
      const numHelpers = parseInt(totalHelpers) || 0;
      for (let i = 1; i <= numHelpers; i++) {
        staffInserts.push({
          staff_id: `STF_HLP_${Math.floor(1000 + Math.random() * 9000)}`,
          school_id: schoolId,
          full_name: `Helper ${i}`,
          role: 'helper',
          is_active: true,
          base_salary: 10000
        });
      }

      if (staffInserts.length > 0) {
        const { error: staffError } = await supabase.from('staff').insert(staffInserts);
        if (staffError) console.log('Staff insert warnings:', staffError.message);
      }

      // 5. Insert Initial Teachers
      if (teachersList.length > 0) {
        const teacherInserts = teachersList.map((t, idx) => ({
          name: t.name,
          email: t.email,
          phone: t.phone || null,
          school_id: schoolId,
          qualification: t.qualification || null,
          base_salary: 25000,
          is_active: true
        }));

        const { error: teacherError } = await supabase.from('teachers').insert(teacherInserts);
        if (teacherError) console.log('Teacher insert warnings:', teacherError.message);
      }

      Alert.alert(
        'Success',
        'School Registered Successfully! Please login using your email and password.',
        [
          { text: 'OK', onPress: () => {
            setIsLogin(true);
            setStep(1);
          }}
        ]
      );
    } catch (error) {
      Alert.alert('Registration Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {isLogin ? (
            // --- LOGIN VIEW ---
            <View style={styles.formContainer}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoEmoji}>🏫</Text>
                <Text style={styles.logoText}>School ERP</Text>
                <Text style={styles.logoSubtext}>Principal Admin Dashboard</Text>
              </View>

              <Text style={styles.welcomeText}>Welcome Back!</Text>
              <Text style={styles.subText}>Sign in to manage teachers, calculate salaries, and export SARAL files.</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Professional Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="principal@school.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={colors.gray}
                />

                <Text style={styles.inputLabel}>Secret Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholderTextColor={colors.gray}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.orange }]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.buttonText}>{loading ? 'Signing In...' : 'LOG IN'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsLogin(false)}
                style={styles.toggleButton}
              >
                <Text style={styles.toggleText}>
                  New Principal? <Text style={styles.toggleHighlight}>Register your School</Text>
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // --- REGISTER MULTI-STEP VIEW ---
            <View style={styles.formContainer}>
              {/* Progress Indicator */}
              <View style={styles.progressRow}>
                <View style={[styles.progressStep, step >= 1 && styles.stepActive]}>
                  <Text style={styles.stepText}>1</Text>
                </View>
                <View style={[styles.progressLine, step >= 2 && styles.lineActive]} />
                <View style={[styles.progressStep, step >= 2 && styles.stepActive]}>
                  <Text style={styles.stepText}>2</Text>
                </View>
                <View style={[styles.progressLine, step >= 3 && styles.lineActive]} />
                <View style={[styles.progressStep, step >= 3 && styles.stepActive]}>
                  <Text style={styles.stepText}>3</Text>
                </View>
              </View>

              {step === 1 && (
                // --- STEP 1: SCHOOL & PRINCIPAL ---
                <View>
                  <Text style={styles.welcomeText}>Step 1: School & Boss Info</Text>
                  <Text style={styles.subText}>Tell us about your school and yourself.</Text>

                  <Text style={styles.inputLabel}>School Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Delhi Public School"
                    value={schoolName}
                    onChangeText={setSchoolName}
                    placeholderTextColor={colors.gray}
                  />

                  <Text style={styles.inputLabel}>School UDISE Number (8 Digits) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="27430012"
                    value={udiseNumber}
                    onChangeText={setUdiseNumber}
                    keyboardType="numeric"
                    maxLength={8}
                    placeholderTextColor={colors.gray}
                  />

                  <Text style={styles.inputLabel}>School Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123 Main Road, Pune"
                    value={schoolAddress}
                    onChangeText={setSchoolAddress}
                    placeholderTextColor={colors.gray}
                  />

                  <Text style={styles.inputLabel}>Principal's Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Mr. Rajesh Kumar"
                    value={principalName}
                    onChangeText={setPrincipalName}
                    placeholderTextColor={colors.gray}
                  />

                  <Text style={styles.inputLabel}>Date of Birth (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1970-03-14"
                    value={dob}
                    onChangeText={setDob}
                    placeholderTextColor={colors.gray}
                  />

                  <Text style={styles.inputLabel}>Mobile Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="9876543210"
                    value={mobile}
                    onChangeText={setMobile}
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholderTextColor={colors.gray}
                  />

                  <Text style={styles.inputLabel}>Login Email Address *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="principal@school.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={colors.gray}
                  />

                  <Text style={styles.inputLabel}>Login Password *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Choose a strong password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholderTextColor={colors.gray}
                  />

                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: colors.teal }]}
                    onPress={() => {
                      if (!schoolName || !udiseNumber || !principalName || !email || !password) {
                        Alert.alert('Error', 'Please fill in all starred (*) fields to continue');
                        return;
                      }
                      setStep(2);
                    }}
                  >
                    <Text style={styles.buttonText}>Continue to Step 2 →</Text>
                  </TouchableOpacity>
                </View>
              )}

              {step === 2 && (
                // --- STEP 2: CLASSES & HELPER COUNTS ---
                <View>
                  <Text style={styles.welcomeText}>Step 2: Classrooms & Helpers</Text>
                  <Text style={styles.subText}>Tell us how many classes and helper staff you have.</Text>

                  <Text style={styles.inputLabel}>Total Number of Classes</Text>
                  <TextInput
                    style={styles.input}
                    value={totalClasses}
                    onChangeText={setTotalClasses}
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray}
                  />

                  <Text style={styles.inputLabel}>Total Bus Drivers</Text>
                  <TextInput
                    style={styles.input}
                    value={totalDrivers}
                    onChangeText={setTotalDrivers}
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray}
                  />

                  <Text style={styles.inputLabel}>Total Watchmen / Security</Text>
                  <TextInput
                    style={styles.input}
                    value={totalWatchmen}
                    onChangeText={setTotalWatchmen}
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray}
                  />

                  <Text style={styles.inputLabel}>Total Helpers / Cleaning Staff</Text>
                  <TextInput
                    style={styles.input}
                    value={totalHelpers}
                    onChangeText={setTotalHelpers}
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray}
                  />

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.halfButton, { backgroundColor: colors.gray }]}
                      onPress={() => setStep(1)}
                    >
                      <Text style={styles.buttonText}>← Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.halfButton, { backgroundColor: colors.teal }]}
                      onPress={() => setStep(3)}
                    >
                      <Text style={styles.buttonText}>Continue →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {step === 3 && (
                // --- STEP 3: INDIVIDUAL TEACHERS ---
                <View>
                  <Text style={styles.welcomeText}>Step 3: Setup Teachers</Text>
                  <Text style={styles.subText}>You can add teachers one by one below. They will be added to your school roster.</Text>

                  {/* Teachers Roster List */}
                  {teachersList.length > 0 && (
                    <View style={styles.rosterCard}>
                      <Text style={styles.rosterTitle}>Teachers added ({teachersList.length}):</Text>
                      {teachersList.map((t, idx) => (
                        <View key={idx} style={styles.rosterItem}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.rosterName}>{t.name} ({t.subject})</Text>
                            <Text style={styles.rosterEmail}>{t.email}</Text>
                          </View>
                          <TouchableOpacity onPress={() => removeTeacherFromTempList(idx)}>
                            <Text style={styles.rosterRemove}>✕ Remove</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Add Teacher Form */}
                  <View style={styles.miniForm}>
                    <Text style={styles.miniFormTitle}>Add a Teacher</Text>

                    <Text style={styles.inputLabel}>Teacher's Full Name *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Mrs. Sunita Patil"
                      value={tempTeacherName}
                      onChangeText={setTempTeacherName}
                      placeholderTextColor={colors.gray}
                    />

                    <Text style={styles.inputLabel}>Email Address *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="sunita@school.com"
                      value={tempTeacherEmail}
                      onChangeText={setTempTeacherEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor={colors.gray}
                    />

                    <Text style={styles.inputLabel}>Mobile Phone</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="9765432109"
                      value={tempTeacherPhone}
                      onChangeText={setTempTeacherPhone}
                      keyboardType="phone-pad"
                      placeholderTextColor={colors.gray}
                    />

                    <Text style={styles.inputLabel}>Subject Taught *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Mathematics"
                      value={tempTeacherSubject}
                      onChangeText={setTempTeacherSubject}
                      placeholderTextColor={colors.gray}
                    />

                    <Text style={styles.inputLabel}>Qualification (e.g. B.Ed, M.Sc)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="B.Ed, M.Sc Maths"
                      value={tempTeacherQual}
                      onChangeText={setTempTeacherQual}
                      placeholderTextColor={colors.gray}
                    />

                    <TouchableOpacity
                      style={[styles.primaryButton, { backgroundColor: colors.teal, marginVertical: 10 }]}
                      onPress={addTeacherToTempList}
                    >
                      <Text style={styles.buttonText}>+ Add to List</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.halfButton, { backgroundColor: colors.gray }]}
                      onPress={() => setStep(2)}
                    >
                      <Text style={styles.buttonText}>← Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.halfButton, { backgroundColor: colors.green }]}
                      onPress={handleRegister}
                      disabled={loading}
                    >
                      <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Finish Setup 🚀'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <TouchableOpacity
                onPress={() => setIsLogin(true)}
                style={[styles.toggleButton, { marginTop: 20 }]}
              >
                <Text style={styles.toggleText}>
                  Already have an account? <Text style={styles.toggleHighlight}>Login instead</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  formContainer: {
    paddingHorizontal: 25,
    paddingVertical: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoEmoji: {
    fontSize: 60,
    marginBottom: 5,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  logoSubtext: {
    fontSize: 14,
    color: colors.gray,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.white,
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.lightGray,
    fontSize: 15,
    color: colors.text,
    marginBottom: 10,
  },
  primaryButton: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleButton: {
    alignItems: 'center',
    marginTop: 15,
  },
  toggleText: {
    fontSize: 14,
    color: colors.text,
  },
  toggleHighlight: {
    color: colors.teal,
    fontWeight: 'bold',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActive: {
    backgroundColor: colors.teal,
  },
  stepText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  progressLine: {
    width: 60,
    height: 4,
    backgroundColor: colors.lightGray,
  },
  lineActive: {
    backgroundColor: colors.teal,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  halfButton: {
    width: '48%',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  rosterCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  rosterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.text,
  },
  rosterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  rosterName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  rosterEmail: {
    fontSize: 12,
    color: colors.gray,
  },
  rosterRemove: {
    color: '#E74C3C',
    fontSize: 12,
    fontWeight: 'bold',
  },
  miniForm: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.lightGray,
    marginBottom: 10,
  },
  miniFormTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.teal,
    marginBottom: 10,
  }
});