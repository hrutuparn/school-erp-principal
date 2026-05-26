import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Alert,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import StudentScreen from './src/screens/StudentScreen';
import TimetableScreen from './src/screens/TimetableScreen';
import TeacherScreen from './src/screens/TeacherScreen';
import ClassTeacherScreen from './src/screens/ClassTeacherScreen';
import ImportTeachersScreen from './src/screens/ImportTeachersScreen';
import AttendanceStaffScreen from './src/screens/AttendanceStaffScreen';
import SalaryCalculatorScreen from './src/screens/SalaryCalculatorScreen';
import DocumentsScreen from './src/screens/DocumentsScreen';
import SaralScreen from './src/screens/SaralScreen';
import SubjectsScreen from './src/screens/SubjectsScreen';
import StaffScreen from './src/screens/StaffScreen';
import MealManagementScreen from './src/screens/MealManagementScreen';
import TeacherChatScreen from './src/screens/TeacherChatScreen';
import LeaveApprovalsScreen from './src/screens/LeaveApprovalsScreen';
import { supabase } from './src/services/supabase';
import { t } from './src/services/i18n';

const colors = {
  background: '#F5F0E8',
  white: '#FFFFFF',
  text: '#2C3E50',
  orange: '#F39C12',
  teal: '#1ABC9C',
  green: '#27AE60',
  gray: '#95A5A6',
  lightGray: '#ECF0F1',
  purple: '#9B59B6'
};

// Dashboard Component (Main Screen)
function Dashboard({ onLogout, onNavigate, lang, onShowLanguageModal }) {
  const [currentTime, setCurrentTime] = useState('');
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    students: 456,
    teachers: 0,
    attendance: 89,
    requests: 3
  });

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Get current time for greeting
    const hours = new Date().getHours();
    if (hours < 12) setCurrentTime(t('morning', lang));
    else if (hours < 17) setCurrentTime(t('afternoon', lang));
    else setCurrentTime(t('evening', lang));

    // Fetch teacher count
    fetchTeacherCount();
  }, [lang]);

  async function fetchTeacherCount() {
    try {
      const { count, error } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      setStats(prev => ({ ...prev, teachers: count || 0 }));
    } catch (error) {
      console.log('Error fetching teacher count:', error.message);
    }
  }

  const handleLogout = async () => {
    Alert.alert(
      t('logout', lang),
      "Are you sure you want to logout?",
      [
        { text: t('cancel', lang), style: 'cancel' },
        { 
          text: t('logout', lang), 
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (!error) {
              onLogout();
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.schoolEmoji}>🏫</Text>
          <View>
            <Text style={styles.schoolName}>Greenfield School</Text>
            <Text style={styles.principalName}>
              {user?.email?.split('@')[0] || 'Principal'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={onShowLanguageModal} style={styles.langButton}>
            <Text style={styles.langButtonText}>🌐 {lang.toUpperCase()}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>{t('greeting', lang)} {currentTime},</Text>
          <Text style={styles.greetingName}>{t('principal_welcome', lang)}</Text>
          <Text style={styles.subGreeting}>{t('glance', lang)}</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={[styles.statCard, styles.statCardLeft]}
            onPress={() => onNavigate('students')}
          >
            <Text style={styles.statNumber}>{stats.students}</Text>
            <Text style={styles.statLabel}>{t('students', lang)}</Text>
            <View style={styles.trendContainer}>
              <Text style={styles.trendUp}>▲</Text>
              <Text style={styles.trendText}>12%</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statCard, styles.statCardRight]}
            onPress={() => onNavigate('teachers')}
          >
            <Text style={styles.statNumber}>{stats.teachers}</Text>
            <Text style={styles.statLabel}>{t('teachers', lang)}</Text>
            <View style={styles.trendContainer}>
              <Text style={styles.trendUp}>▲</Text>
              <Text style={styles.trendText}>5%</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={[styles.statCard, styles.statCardLeft]}
            onPress={() => onNavigate('attendanceStaff')}
          >
            <Text style={styles.statNumber}>{stats.attendance}%</Text>
            <Text style={styles.statLabel}>{t('attendance', lang)}</Text>
            <View style={styles.trendContainer}>
              <Text style={styles.trendDown}>▼</Text>
              <Text style={styles.trendText}>2%</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statCard, styles.statCardRight]}
            onPress={() => onNavigate('documents')}
          >
            <Text style={styles.statNumber}>{stats.requests}</Text>
            <Text style={styles.statLabel}>{t('requests', lang)}</Text>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{stats.requests} {t('urgent', lang)}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Actions Grid */}
        <Text style={styles.sectionTitle}>{t('quick_actions', lang)}</Text>
        <View style={styles.actionsGrid}>
          {/* Teachers */}
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => onNavigate('teachers')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.teal }]}>
              <Text style={styles.actionIconText}>👥</Text>
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>{t('teachers', lang)}</Text>
          </TouchableOpacity>

          {/* Students */}
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => onNavigate('students')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.orange }]}>
              <Text style={styles.actionIconText}>📚</Text>
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>{t('students', lang)}</Text>
          </TouchableOpacity>

          {/* Manage Staff (New) */}
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => onNavigate('staff')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.orange }]}>
              <Text style={styles.actionIconText}>👷</Text>
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>{t('staff', lang)}</Text>
          </TouchableOpacity>

          {/* Class Teachers */}
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => onNavigate('classTeacher')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.orange }]}>
              <Text style={styles.actionIconText}>🍎</Text>
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>{t('class_teachers', lang)}</Text>
          </TouchableOpacity>

          {/* Attendance */}
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => onNavigate('attendanceStaff')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.green }]}>
              <Text style={styles.actionIconText}>✅</Text>
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>{t('attendance', lang)}</Text>
          </TouchableOpacity>

          {/* Salary */}
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => onNavigate('salary')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.teal }]}>
              <Text style={styles.actionIconText}>💰</Text>
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>{t('salary', lang)}</Text>
          </TouchableOpacity>

          {/* Subjects */}
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => onNavigate('subjects')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.teal }]}>
              <Text style={styles.actionIconText}>📖</Text>
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>{t('subjects', lang)}</Text>
          </TouchableOpacity>

          {/* Timetable */}
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => onNavigate('timetable')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.orange }]}>
              <Text style={styles.actionIconText}>📅</Text>
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>{t('timetable', lang)}</Text>
          </TouchableOpacity>

          {/* SARAL */}
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => onNavigate('saral')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.purple }]}>
              <Text style={styles.actionIconText}>📂</Text>
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>{t('saral_portal', lang)}</Text>
          </TouchableOpacity>

          {/* Import */}
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => onNavigate('importTeachers')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.purple }]}>
              <Text style={styles.actionIconText}>📥</Text>
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>{t('import_teachers', lang)}</Text>
          </TouchableOpacity>

          {/* Mid-Day Meal */}
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => onNavigate('mealsManagement')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.orange }]}>
              <Text style={styles.actionIconText}>🍱</Text>
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>{t('midday_meal', lang)}</Text>
          </TouchableOpacity>

          {/* Teacher Chat */}
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => onNavigate('teacherChat')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.purple }]}>
              <Text style={styles.actionIconText}>💬</Text>
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>{t('teacher_chat', lang)}</Text>
          </TouchableOpacity>

          {/* Leave Requests */}
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => onNavigate('leaveApprovals')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.green }]}>
              <Text style={styles.actionIconText}>📝</Text>
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>{t('leave_requests', lang)}</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activities */}
        <View style={styles.activitiesCard}>
          <Text style={styles.activitiesTitle}>{t('recent_activities', lang)}</Text>
          
          <View style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: colors.green }]}>
              <Text style={styles.activityDotText}>✓</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>Teacher added: Mrs. Priya Patil</Text>
              <Text style={styles.activityTime}>2 min ago</Text>
            </View>
          </View>

          <View style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: colors.teal }]}>
              <Text style={styles.activityDotText}>💰</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>Fee payment received: ₹5000</Text>
              <Text style={styles.activityTime}>15 min ago</Text>
            </View>
          </View>

          <View style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: colors.orange }]}>
              <Text style={styles.activityDotText}>⚠</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>Leave request: Mrs. Patil (Tomorrow)</Text>
              <Text style={styles.activityTime}>1 hour ago</Text>
            </View>
          </View>
        </View>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>🏠</Text>
            <Text style={[styles.navText, styles.navTextActive]}>{t('home', lang)}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navItem}
            onPress={() => onNavigate('teachers')}
          >
            <Text style={styles.navIcon}>👥</Text>
            <Text style={styles.navText}>{t('teachers', lang)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>📚</Text>
            <Text style={styles.navText}>{t('students', lang)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('salary')}>
            <Text style={styles.navIcon}>💰</Text>
            <Text style={styles.navText}>{t('salary', lang)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={onShowLanguageModal}>
            <Text style={styles.navIcon}>⚙️</Text>
            <Text style={styles.navText}>{t('settings', lang)}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Main App Component
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [lang, setLang] = useState('en');
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    // Load persisted language
    AsyncStorage.getItem('app_lang').then((val) => {
      if (val) setLang(val);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNavigate = (screen) => {
    setCurrentScreen(screen);
  };

  const changeLanguage = async (newLang) => {
    setLang(newLang);
    await AsyncStorage.setItem('app_lang', newLang);
    setShowLanguageModal(false);
  };

  const renderLanguageModal = () => (
    <Modal visible={showLanguageModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Language / भाषा निवडा / भाषा चुनें</Text>
          
          <TouchableOpacity 
            onPress={() => changeLanguage('en')} 
            style={[styles.langOption, lang === 'en' && styles.langOptionSelected]}
          >
            <Text style={styles.langOptionText}>🇬🇧 English</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => changeLanguage('hi')} 
            style={[styles.langOption, lang === 'hi' && styles.langOptionSelected]}
          >
            <Text style={styles.langOptionText}>🇮🇳 हिंदी (Hindi)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => changeLanguage('mr')} 
            style={[styles.langOption, lang === 'mr' && styles.langOptionSelected]}
          >
            <Text style={styles.langOptionText}>🇮🇳 मराठी (Marathi)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setShowLanguageModal(false)} 
            style={styles.modalCancelButton}
          >
            <Text style={styles.modalCancelButtonText}>Close / बंद करा / बंद करें</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <View style={{ flex: 1 }}>
      {renderLanguageModal()}
      {(() => {
        // Show different screens based on navigation
        switch(currentScreen) {
          case 'importTeachers':
            return <ImportTeachersScreen lang={lang} onBack={() => setCurrentScreen('dashboard')} />;
          case 'classTeacher':
            return <ClassTeacherScreen lang={lang} onBack={() => setCurrentScreen('dashboard')} />;
          case 'timetable':
            return <TimetableScreen lang={lang} onBack={() => setCurrentScreen('dashboard')} />;
          case 'students':
            return <StudentScreen lang={lang} onBack={() => setCurrentScreen('dashboard')} />;    
          case 'teachers':
            return <TeacherScreen lang={lang} onBack={() => setCurrentScreen('dashboard')} />;
          case 'attendanceStaff':
            return <AttendanceStaffScreen lang={lang} onBack={() => setCurrentScreen('dashboard')} />;
          case 'salary':
            return <SalaryCalculatorScreen lang={lang} onBack={() => setCurrentScreen('dashboard')} />;
          case 'documents':
            return <DocumentsScreen lang={lang} onBack={() => setCurrentScreen('dashboard')} />;
          case 'saral':
            return <SaralScreen lang={lang} onBack={() => setCurrentScreen('dashboard')} />;
          case 'subjects':
            return <SubjectsScreen lang={lang} onBack={() => setCurrentScreen('dashboard')} />;
          case 'staff':
            return <StaffScreen lang={lang} onBack={() => setCurrentScreen('dashboard')} />;
          case 'mealsManagement':
            return <MealManagementScreen lang={lang} onBack={() => setCurrentScreen('dashboard')} />;
          case 'teacherChat':
            return <TeacherChatScreen lang={lang} onBack={() => setCurrentScreen('dashboard')} />;
          case 'leaveApprovals':
            return <LeaveApprovalsScreen lang={lang} onBack={() => setCurrentScreen('dashboard')} />;
          default:
            return <Dashboard 
              lang={lang}
              onShowLanguageModal={() => setShowLanguageModal(true)}
              onLogout={() => setIsAuthenticated(false)} 
              onNavigate={setCurrentScreen}
            />;
        }
      })()}
    </View>
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
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  schoolEmoji: {
    fontSize: 30,
    marginRight: 10,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  principalName: {
    fontSize: 12,
    color: colors.gray,
  },
  langButton: {
    marginRight: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: colors.lightGray,
  },
  langButtonText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 20,
  },
  greetingContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  greeting: {
    fontSize: 24,
    color: colors.text,
  },
  greetingName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  subGreeting: {
    fontSize: 14,
    color: colors.gray,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardLeft: {
    marginRight: 7.5,
  },
  statCardRight: {
    marginLeft: 7.5,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 5,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendUp: {
    color: colors.green,
    fontSize: 12,
    marginRight: 3,
  },
  trendDown: {
    color: colors.orange,
    fontSize: 12,
    marginRight: 3,
  },
  trendText: {
    fontSize: 12,
    color: colors.text,
  },
  badgeContainer: {
    backgroundColor: colors.orange,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginHorizontal: 20,
    marginBottom: 15,
    marginTop: 10,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  actionItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 15,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: 11,
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: 2
  },
  activitiesCard: {
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activitiesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  activityDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityDotText: {
    color: colors.white,
    fontSize: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 10,
    color: colors.gray,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.white,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
    marginBottom: 10,
  },
  navItem: {
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  navText: {
    fontSize: 10,
    color: colors.gray,
  },
  navTextActive: {
    color: colors.orange,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 20,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  langOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    alignItems: 'center',
  },
  langOptionSelected: {
    backgroundColor: colors.lightGray,
    borderRadius: 8,
  },
  langOptionText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  modalCancelButton: {
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: colors.gray,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  }
});