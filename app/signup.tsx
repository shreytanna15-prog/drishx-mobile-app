'use client';

import { Link, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth';
import { BACKEND_BASE_URL } from '@/lib/api-config';

const SIGNUP_URL = `${BACKEND_BASE_URL}/api/auth/signup`;


export const options = {
  headerShown: false,
};

export default function SignupScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSignup() {
    setMessage('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Name, email, and password are required.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Please make sure both passwords match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(SIGNUP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result?.error || 'Signup failed. Please try again.';
        Alert.alert('Signup failed', errorMessage);
        return;
      }

      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      signIn(result.token, result.user);
      router.replace('/');
    } catch (error) {
      Alert.alert(
        'Network error',
        `Unable to connect to the signup backend at ${SIGNUP_URL}. Make sure the Drishx-admin-and-backend server is running and reachable from this device.`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 24 })}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <ThemedView style={styles.card}>
            <ThemedText type="title" style={styles.heading}>
              Signup
            </ThemedText>
          <View style={styles.field}>
            <ThemedText style={styles.label}>Full name</ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="John Doe"
              placeholderTextColor="#8b8b8b"
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#8b8b8b"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={styles.input}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Password</ThemedText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#8b8b8b"
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Confirm password</ThemedText>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              placeholderTextColor="#8b8b8b"
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
              returnKeyType="done"
            />
          </View>

          {message ? <ThemedText style={styles.message}>{message}</ThemedText> : null}

          <Pressable style={styles.button} onPress={handleSignup} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.buttonText}>Sign up</ThemedText>
            )}
          </Pressable>

          <Link href="/login" style={styles.backLink}>
            <ThemedText type="link">Already have an account? Login</ThemedText>
          </Link>
        </ThemedView>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  root: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 24,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    backgroundColor: '#ffffff',
  },
  heading: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 24,
    lineHeight: 22,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  message: {
    marginBottom: 16,
    color: '#0f766e',
    fontSize: 15,
    fontWeight: '600',
  },
  button: {
    marginTop: 8,
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f546d',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  backLink: {
    marginTop: 18,
    alignItems: 'center',
  },
});
