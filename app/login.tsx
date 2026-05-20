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

const DEFAULT_HOST = Platform.OS === 'android' ? 'http://192.168.10.115:3000' : 'http://localhost:3000';
const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || DEFAULT_HOST;
if (process.env.EXPO_PUBLIC_BACKEND_BASE_URL?.includes('localhost') && Platform.OS !== 'web') {
  console.warn(
    'EXPO_PUBLIC_BACKEND_BASE_URL uses localhost on a native device. Use a LAN IP or emulator host alias instead of localhost.'
  );
}
const LOGIN_URL = `${BACKEND_BASE_URL}/api/auth/login`;
console.log('Login backend URL:', LOGIN_URL);

export const options = {
  headerShown: false,
};

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleLogin() {
    setMessage('');

    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Email and password are required.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result?.error || 'Login failed. Please try again.';
        Alert.alert('Login failed', errorMessage);
        return;
      }

      setEmail('');
      setPassword('');
      signIn();
      router.replace('/');
    } catch (error) {
      Alert.alert(
        'Network error',
        `Unable to connect to the login backend at ${LOGIN_URL}. Make sure the Drishx-admin-and-backend server is running and reachable from this device.`
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
              Login
            </ThemedText>

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
                returnKeyType="done"
              />
            </View>

            {message ? <ThemedText style={styles.message}>{message}</ThemedText> : null}

            <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText style={styles.buttonText}>Log in</ThemedText>
              )}
            </Pressable>

            <Link href="/signup" style={styles.backLink}>
              <ThemedText type="link">Create account</ThemedText>
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
