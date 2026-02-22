import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
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

function Dashboard({ onLogout }) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const hours = new Date().getHours();
    if (hours < 12) setCurrentTime('Morning');
    else if (hours < 17) setCurrentTime('Afternoon');
    else setCurrentTime('Evening');
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="dark" />
      
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.schoolEmoji}>🏫</Text>
          <View>
            <Text style={styles.schoolName}>Greenfield School</Text>
            <Text style={styles.principalName}>Principal</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>🚪</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>Good {currentTime},</Text>
          <Text style={styles.greetingName}>Principal! 👋</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardLeft]}>
            <Text style={styles.statNumber}>456</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={[styles.statCard, styles.statCardRight]}>
            <Text style={styles.statNumber}>32</Text>
            <Text style={styles.statLabel}>Teachers</Text>
          </View>
        </View>

        <View style={styles.activitiesCard}>
          <Text style={styles.activitiesTitle}>Recent Activities</Text>
          <View style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: colors.green }]}>
              <Text style={styles.activityDotText}>✓</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>5 students marked absent</Text>
              <Text style={styles.activityTime}>2 min ago</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return <Dashboard onLogout={() => setIsAuthenticated(false)} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.white,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  schoolEmoji: { fontSize: 30, marginRight: 10 },
  schoolName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  principalName: { fontSize: 12, color: colors.gray },
  logoutButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.lightGray, justifyContent: 'center', alignItems: 'center',
  },
  logoutText: { fontSize: 20 },
  greetingContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15 },
  greeting: { fontSize: 24, color: colors.text },
  greetingName: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 15 },
  statCard: {
    flex: 1, backgroundColor: colors.white, padding: 15, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  statCardLeft: { marginRight: 7.5 },
  statCardRight: { marginLeft: 7.5 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  statLabel: { fontSize: 14, color: colors.gray },
  activitiesCard: {
    backgroundColor: colors.white, marginHorizontal: 20, padding: 15, borderRadius: 12,
  },
  activitiesTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 15 },
  activityItem: { flexDirection: 'row', marginBottom: 12 },
  activityDot: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  activityDotText: { color: colors.white, fontSize: 12 },
  activityContent: { flex: 1 },
  activityText: { fontSize: 14, color: colors.text },
  activityTime: { fontSize: 10, color: colors.gray },
});