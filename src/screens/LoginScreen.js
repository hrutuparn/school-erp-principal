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
  lightGray: '#ECF0F0'
};

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        
        if (error) throw error;
        Alert.alert('Success', 'Logged in successfully!');
        onLogin();
      } else {
        const { error } = await supabase.auth.signUp({
          email: email,
          password: password,
        });
        
        if (error) throw error;
        Alert.alert('Success', 'Check your email for confirmation!');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🏫</Text>
          <Text style={styles.logoText}>School ERP</Text>
          <Text style={styles.logoSubtext}>Connect • Track • Grow</Text>
        </View>

        {/* Welcome Text */}
        <Text style={styles.welcomeText}>
          {isLogin ? 'Welcome Back!' : 'Create Account'}
        </Text>
        <Text style={styles.subText}>
          {isLogin 
            ? 'Sign in to continue managing your school' 
            : 'Register your school to get started'}
        </Text>

        {/* Input Fields */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={colors.gray}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={colors.gray}
          />
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.authButton, 
            { backgroundColor: colors.orange },
            loading && styles.disabledButton
          ]}
          onPress={handleAuth}
          disabled={loading}
        >
          <Text style={styles.authButtonText}>
            {loading ? 'Please wait...' : (isLogin ? 'LOGIN' : 'REGISTER')}
          </Text>
        </TouchableOpacity>

        {/* Toggle between Login and Register */}
        <TouchableOpacity
          onPress={() => setIsLogin(!isLogin)}
          style={styles.toggleButton}
        >
          <Text style={styles.toggleText}>
            {isLogin 
              ? "New Principal? " 
              : "Already have an account? "}
            <Text style={styles.toggleHighlight}>
              {isLogin ? 'Register School' : 'Login'}
            </Text>
          </Text>
        </TouchableOpacity>

        {/* Forgot Password */}
        {isLogin && (
          <TouchableOpacity>
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 25,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  logoSubtext: {
    fontSize: 14,
    color: colors.gray,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  subText: {
    fontSize: 16,
    color: colors.gray,
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 25,
  },
  input: {
    backgroundColor: colors.white,
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.lightGray,
    fontSize: 16,
    color: colors.text,
  },
  authButton: {
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.7,
  },
  authButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  toggleButton: {
    alignItems: 'center',
    marginBottom: 15,
  },
  toggleText: {
    fontSize: 14,
    color: colors.text,
  },
  toggleHighlight: {
    color: colors.teal,
    fontWeight: 'bold',
  },
  forgotPassword: {
    textAlign: 'center',
    color: colors.teal,
    fontSize: 14,
  },
});