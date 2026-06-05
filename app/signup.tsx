'use client';

import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAwareScroll } from '@/components/keyboard-aware-scroll';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { useSystemBrandColors, useSystemThemedStyles } from '@/hooks/use-system-themed-styles';
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
  const colors = useSystemBrandColors();
  const statusBarStyle = useStatusBarStyle();
  const styles = useSystemThemedStyles(createStyles);

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
      <StatusBar style={statusBarStyle} />
      <KeyboardAwareScroll style={styles.root} contentContainerStyle={styles.container} centerContent>
          <View style={styles.card}>
            <Text style={styles.heading}>Create account</Text>
            <Text style={styles.subheading}>Join DrishX to shop and track orders</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
                placeholderTextColor={colors.placeholder}
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
                placeholderTextColor={colors.placeholder}
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
                placeholderTextColor={colors.placeholder}
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
                placeholderTextColor={colors.placeholder}
                secureTextEntry
                autoCapitalize="none"
                style={styles.input}
                returnKeyType="done"
              />
            </View>

            {message ? <Text style={styles.message}>{message}</Text> : null}

            <Pressable style={styles.button} onPress={handleSignup} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <Text style={styles.buttonText}>Sign up</Text>
              )}
            </Pressable>

            <Link href="/login" style={styles.backLink}>
              <Text style={styles.linkText}>Already have an account? Log in</Text>
            </Link>
          </View>
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.background,
    },
    root: {
      flex: 1,
      backgroundColor: c.background,
    },
    container: {
      padding: 24,
      minHeight: '100%',
    },
    card: {
      borderRadius: 20,
      padding: 24,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    heading: {
      color: c.text,
      fontSize: 28,
      fontWeight: '800',
      marginBottom: 6,
    },
    subheading: {
      color: c.textMuted,
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
      color: c.label,
    },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    message: {
      marginBottom: 16,
      color: c.success,
      fontSize: 15,
      fontWeight: '600',
    },
    button: {
      marginTop: 8,
      borderRadius: 16,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
    },
    buttonText: {
      color: c.primaryText,
      fontSize: 16,
      fontWeight: '800',
    },
    backLink: {
      marginTop: 18,
      alignItems: 'center',
    },
    linkText: {
      color: c.link,
      fontSize: 15,
      fontWeight: '600',
    },
  });
