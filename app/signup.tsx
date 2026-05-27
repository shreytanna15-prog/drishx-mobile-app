'use client';

import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand-colors';
import { BACKEND_BASE_URL } from '@/lib/api-config';

const SIGNUP_URL = `${BACKEND_BASE_URL}/api/auth/signup`;

export const options = {
  headerShown: false,
};

export default function SignupScreen() {
  const router = useRouter();
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

      const userId = result?.user?.id;
      if (!userId) {
        Alert.alert('Signup failed', 'Account was created but user id was missing.');
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');

      router.replace({
        pathname: '/gst-details',
        params: { userId, email: normalizedEmail },
      });
    } catch {
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
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 24 })}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.heading}>Create account</Text>
            <Text style={styles.subheading}>Join DrishX to shop and track orders</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
                placeholderTextColor={BrandColors.placeholder}
                style={styles.input}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={BrandColors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={styles.input}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={BrandColors.placeholder}
                secureTextEntry
                autoCapitalize="none"
                style={styles.input}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                placeholderTextColor={BrandColors.placeholder}
                secureTextEntry
                autoCapitalize="none"
                style={styles.input}
                returnKeyType="done"
              />
            </View>

            {message ? <Text style={styles.message}>{message}</Text> : null}

            <Pressable style={styles.button} onPress={handleSignup} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={BrandColors.primaryText} />
              ) : (
                <Text style={styles.buttonText}>Sign up</Text>
              )}
            </Pressable>

            <Link href="/login" style={styles.backLink}>
              <Text style={styles.linkText}>Already have an account? Log in</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  root: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    padding: 24,
    backgroundColor: BrandColors.card,
    borderWidth: 1,
    borderColor: BrandColors.cardBorder,
  },
  heading: {
    color: BrandColors.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  subheading: {
    color: BrandColors.textMuted,
    fontSize: 14,
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.label,
  },
  input: {
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: BrandColors.text,
    backgroundColor: BrandColors.inputBg,
  },
  message: {
    marginBottom: 16,
    color: BrandColors.success,
    fontSize: 15,
    fontWeight: '600',
  },
  button: {
    marginTop: 8,
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primary,
  },
  buttonText: {
    color: BrandColors.primaryText,
    fontSize: 16,
    fontWeight: '800',
  },
  backLink: {
    marginTop: 18,
    alignItems: 'center',
  },
  linkText: {
    color: BrandColors.link,
    fontSize: 15,
    fontWeight: '600',
  },
});
