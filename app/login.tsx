'use client';

import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
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
import { getCustomerNextRoute, mapApiUser } from '@/lib/auth-api';
import { useAuth } from '@/lib/auth';
import { BACKEND_BASE_URL } from '@/lib/api-config';

const LOGIN_URL = `${BACKEND_BASE_URL}/api/auth/login`;

export const options = {
  headerShown: false,
};

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (params.email && typeof params.email === 'string') {
      setEmail(params.email);
    }
  }, [params.email]);

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
        if (response.status === 403 && result?.user) {
          Alert.alert(
            'Account rejected',
            result?.rejectionReason || result?.error || 'Your account was rejected by admin.'
          );
          router.replace({
            pathname: '/pending-approval',
            params: {
              email: email.trim().toLowerCase(),
              rejected: '1',
              reason: result?.rejectionReason || '',
            },
          });
          return;
        }
        const errorMessage = result?.error || 'Login failed. Please try again.';
        Alert.alert('Login failed', errorMessage);
        return;
      }

      const mapped = mapApiUser(result.user as Record<string, unknown>);
      setEmail('');
      setPassword('');
      signIn(result.token, mapped);

      const nextRoute = getCustomerNextRoute(mapped);
      if (nextRoute === '/gst-details') {
        router.replace({
          pathname: '/gst-details',
          params: { userId: mapped.id, email: mapped.email },
        });
      } else {
        router.replace(nextRoute);
      }
    } catch {
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
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 24 })}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.heading}>Login</Text>
            <Text style={styles.subheading}>Welcome back to DrishX</Text>

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
                returnKeyType="done"
              />
            </View>

            {message ? <Text style={styles.message}>{message}</Text> : null}

            <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={BrandColors.primaryText} />
              ) : (
                <Text style={styles.buttonText}>Log in</Text>
              )}
            </Pressable>

            <Link href="/signup" style={styles.backLink}>
              <Text style={styles.linkText}>Create account</Text>
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
