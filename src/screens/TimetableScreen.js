import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { supabase } from '../services/supabase';
import colors from '../components/colors';

export default function TimetableScreen({ onBack }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Fetch all distinct classes from teacher_assignments
  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('teacher_assignments')
        .select('class_name')
        .order('class_name', { ascending: true });

      if (error) throw error;

      // Extract unique class names
      const uniqueClasses = [...new Map(data.map(item => [item.class_name, item])).values()];
      setClasses(uniqueClasses.map(item => item.class_name));
    } catch (error) {
      Alert.alert('Error', 'Could not fetch classes');
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchTimetable = async (className) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teacher_assignments')
        .select(`
          subject,
          teachers (name)
        `)
        .eq('class_name', className);

      if (error) throw error;

      // Format data for display
      const formatted = data.map(item => ({
        subject: item.subject,
        teacherName: item.teachers?.name || 'Unknown'
      }));
      setSubjects(formatted);
    } catch (error) {
      Alert.alert('Error', 'Could not fetch timetable');
    } finally {
      setLoading(false);
    }
  };

  const handleClassSelect = (className) => {
    setSelectedClass(className);
    fetchTimetable(className);
  };

  const renderClassItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.classCard,
        selectedClass === item && styles.selectedClassCard
      ]}
      onPress={() => handleClassSelect(item)}
    >
      <Text style={[
        styles.classText,
        selectedClass === item && styles.selectedClassText
      ]}>{item}</Text>
    </TouchableOpacity>
  );

  const renderSubjectItem = ({ item }) => (
    <View style={styles.subjectRow}>
      <Text style={styles.subjectName}>{item.subject}</Text>
      <Text style={styles.teacherName}>{item.teacherName}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Timetable Viewer</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Select Class</Text>
        {loadingClasses ? (
          <ActivityIndicator size="large" color={colors.teal} />
        ) : (
          <FlatList
            data={classes}
            keyExtractor={(item) => item}
            renderItem={renderClassItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.classList}
          />
        )}

        {selectedClass && (
          <>
            <Text style={styles.sectionTitle}>Timetable for {selectedClass}</Text>
            {loading ? (
              <ActivityIndicator size="large" color={colors.teal} />
            ) : subjects.length === 0 ? (
              <Text style={styles.emptyText}>No subjects found for this class</Text>
            ) : (
              <FlatList
                data={subjects}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderSubjectItem}
                contentContainerStyle={styles.timetableList}
              />
            )}
          </>
        )}
      </View>
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
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  classList: {
    paddingBottom: 15,
  },
  classCard: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  selectedClassCard: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  classText: {
    fontSize: 16,
    color: colors.text,
  },
  selectedClassText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  timetableList: {
    marginTop: 10,
  },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  teacherName: {
    fontSize: 14,
    color: colors.gray,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.gray,
    marginTop: 30,
  },
});