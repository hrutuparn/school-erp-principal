import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Alert
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import TeacherScreen from './src/screens/TeacherScreen';
import { supabase } from './src/services/supabase';

const colors = {
  background: '#F5F0E8',
  white: '#FFFFFF',
  text: '#2C3E50',
  orange: '#F39C12',
  teal: '#1ABC9C',
  green: '#27AE60',
  gray: '#95A5A6',
  lightGray: '#ECF0F1'
};

// Dashboard Component (Main Screen)
function Dashboard({ onLogout, onNavigate }) {
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
    if (hours < 12) setCurrentTime('Morning');
    else if (hours < 17) setCurrentTime('Afternoon');
    else setCurrentTime('Evening');

    // Fetch teacher count
    fetchTeacherCount();
  }, []);

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
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
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
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>🚪</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>Good {currentTime},</Text>
          <Text style={styles.greetingName}>Principal! 👋</Text>
          <Text style={styles.subGreeting}>Here's your school at a glance</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={[styles.statCard, styles.statCardLeft]}
            onPress={() => Alert.alert('Coming Soon', 'Student management coming soon!')}
          >
            <Text style={styles.statNumber}>{stats.students}</Text>
            <Text style={styles.statLabel}>Students</Text>
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
            <Text style={styles.statLabel}>Teachers</Text>
            <View style={styles.trendContainer}>
              <Text style={styles.trendUp}>▲</Text>
              <Text style={styles.trendText}>5%</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={[styles.statCard, styles.statCardLeft]}
            onPress={() => Alert.alert('Coming Soon', 'Attendance tracking coming soon!')}
          >
            <Text style={styles.statNumber}>{stats.attendance}%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
            <View style={styles.trendContainer}>
              <Text style={styles.trendDown}>▼</Text>
              <Text style={styles.trendText}>2%</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statCard, styles.statCardRight]}
            onPress={() => Alert.alert('Coming Soon', 'Document requests coming soon!')}
          >
            <Text style={styles.statNumber}>{stats.requests}</Text>
            <Text style={styles.statLabel}>Requests</Text>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{stats.requests} Urgent</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => onNavigate('teachers')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.teal }]}>
              <Text style={styles.actionIconText}>👥</Text>
            </View>
            <Text style={styles.actionLabel}>Teachers</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => Alert.alert('Coming Soon', 'Students section coming soon!')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.orange }]}>
              <Text style={styles.actionIconText}>📚</Text>
            </View>
            <Text style={styles.actionLabel}>Students</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => Alert.alert('Coming Soon', 'Attendance coming soon!')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.green }]}>
              <Text style={styles.actionIconText}>✅</Text>
            </View>
            <Text style={styles.actionLabel}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => Alert.alert('Coming Soon', 'Salary calculator coming soon!')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.teal }]}>
              <Text style={styles.actionIconText}>💰</Text>
            </View>
            <Text style={styles.actionLabel}>Salary</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activities */}
        <View style={styles.activitiesCard}>
          <Text style={styles.activitiesTitle}>Recent Activities</Text>
          
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
            <Text style={[styles.navText, styles.navTextActive]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navItem}
            onPress={() => onNavigate('teachers')}
          >
            <Text style={styles.navIcon}>👥</Text>
            <Text style={styles.navText}>Teachers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>📚</Text>
            <Text style={styles.navText}>Classes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>💰</Text>
            <Text style={styles.navText}>Fees</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>⚙️</Text>
            <Text style={styles.navText}>Settings</Text>
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

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNavigate = (screen) => {
    setCurrentScreen(screen);
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  // Show different screens based on navigation
  switch(currentScreen) {
    case 'teachers':
      return <TeacherScreen onBack={() => setCurrentScreen('dashboard')} />;
    default:
      return <Dashboard 
        onLogout={() => setIsAuthenticated(false)} 
        onNavigate={handleNavigate}
      />;
  }
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
    fontSize: 12,
    color: colors.text,
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
});