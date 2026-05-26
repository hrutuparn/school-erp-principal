import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
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
  purple: '#9B59B6'
};

export default function TeacherChatScreen({ onBack, lang }) {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [principalUid, setPrincipalUid] = useState(null);

  // 1. Fetch current principal's auth UUID & all teachers
  useEffect(() => {
    fetchPrincipalAndTeachers();
  }, []);

  async function fetchPrincipalAndTeachers() {
    setLoading(true);
    try {
      // Get logged-in principal's UUID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Not authenticated.');
        onBack();
        return;
      }
      setPrincipalUid(user.id);

      // Fetch principal's school_id
      const { data: principalData, error: princError } = await supabase
        .from('principals')
        .select('school_id')
        .eq('principal_id', user.id)
        .single();

      if (princError || !principalData) throw new Error('Principal profile not found.');

      // Fetch teachers in this school
      const { data: teachersData, error: teachError } = await supabase
        .from('teachers')
        .select('id, name, email, phone, is_active')
        .eq('school_id', principalData.school_id)
        .order('name', { ascending: true });

      if (teachError) throw teachError;
      setTeachers(teachersData || []);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to retrieve teachers list.');
    } finally {
      setLoading(false);
    }
  }

  // 2. Fetch chat history for selected teacher
  const fetchMessages = async (teacherId) => {
    if (!principalUid) return;
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${principalUid},receiver_id.eq.${teacherId}),and(sender_id.eq.${teacherId},receiver_id.eq.${principalUid})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.log('Error fetching messages:', error.message);
    }
  };

  // 3. Real-time changes subscription
  useEffect(() => {
    if (!selectedTeacher || !principalUid) return;

    fetchMessages(selectedTeacher.id.toString());

    // Listen for new messages coming from the teacher to the principal
    const subscription = supabase
      .channel(`chat-principal-${selectedTeacher.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `receiver_id=eq.${principalUid},sender_id=eq.${selectedTeacher.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [selectedTeacher, principalUid]);

  // 4. Send Message
  const sendMessage = async () => {
    if (!inputText.trim() || !selectedTeacher || !principalUid) return;

    const newMessage = {
      sender_id: principalUid,
      sender_type: 'principal',
      receiver_id: selectedTeacher.id.toString(),
      message: inputText.trim(),
      command: '/chat',
      is_read: false,
      created_at: new Date()
    };

    setInputText('');
    // Optimistic update
    setMessages(prev => [...prev, { ...newMessage, id: Date.now() }]);

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([newMessage]);

      if (error) throw error;
    } catch (error) {
      Alert.alert('Send Failed', error.message);
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== newMessage.id));
    }
  };

  const formatTime = (ts) => {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.purple} />
          <Text style={{ marginTop: 15, color: colors.gray }}>Loading teacher profiles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render Teachers list
  if (!selectedTeacher) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>💬 Teacher Chats</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={teachers}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.teacherItem} 
              onPress={() => setSelectedTeacher(item)}
            >
              <View style={styles.teacherRowHeader}>
                <Text style={styles.teacherName}>{item.name}</Text>
                <View style={[styles.statusBadge, item.is_active ? styles.statusActive : styles.statusInactive]}>
                  <Text style={styles.statusText}>{item.is_active ? 'ACTIVE' : 'PENDING'}</Text>
                </View>
              </View>
              <Text style={styles.teacherSub}>{item.email} • {item.phone}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No teachers registered in your school yet.</Text>
          }
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      </SafeAreaView>
    );
  }

  // Render Chat view
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSelectedTeacher(null)} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{selectedTeacher.name}</Text>
          <Text style={styles.headerSubtitle}>Classroom Instructor</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => {
            const isPrincipal = item.sender_type === 'principal';
            return (
              <View style={[styles.messageRow, isPrincipal ? styles.principalRow : styles.teacherRow]}>
                <View style={[styles.messageBubble, isPrincipal ? styles.principalBubble : styles.teacherBubble]}>
                  <Text style={[styles.messageText, isPrincipal ? styles.principalText : styles.teacherText]}>
                    {item.message}
                  </Text>
                  <Text style={[styles.messageTime, isPrincipal ? styles.timePrincipal : styles.timeTeacher]}>
                    {formatTime(item.created_at)}
                  </Text>
                </View>
              </View>
            );
          }}
          contentContainerStyle={{ padding: 15 }}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message to teacher..."
            value={inputText}
            onChangeText={setInputText}
            placeholderTextColor={colors.gray}
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 10,
    color: colors.gray,
    marginTop: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teacherItem: {
    backgroundColor: colors.white,
    padding: 15,
    marginHorizontal: 15,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  teacherRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  teacherSub: {
    fontSize: 12,
    color: colors.gray,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  statusActive: {
    backgroundColor: colors.green + '15',
  },
  statusInactive: {
    backgroundColor: colors.orange + '15',
  },
  statusText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: colors.gray,
    fontSize: 14,
  },
  messageRow: {
    marginBottom: 12,
  },
  principalRow: {
    alignItems: 'flex-end',
  },
  teacherRow: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  principalBubble: {
    backgroundColor: colors.purple,
    borderBottomRightRadius: 2,
  },
  teacherBubble: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  principalText: {
    color: colors.white,
  },
  teacherText: {
    color: colors.text,
  },
  messageTime: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timePrincipal: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timeTeacher: {
    color: colors.gray,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 80,
    color: colors.text,
  },
  sendButton: {
    marginLeft: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    justifyContent: 'center',
    backgroundColor: colors.purple,
  },
  sendButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
