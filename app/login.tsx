'use client';

import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAwareScroll } from '@/components/keyboard-aware-scroll';
import { appAlert } from '@/lib/app-alert';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { useSystemBrandColors, useSystemThemedStyles } from '@/hooks/use-system-themed-styles';
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
  const colors = useSystemBrandColors();
  const statusBarStyle = useStatusBarStyle();
  const styles = useSystemThemedStyles(createStyles);

  useEffect(() => {
    if (params.email && typeof params.email === 'string') {
      setEmail(params.email);
    }
  }, [params.email]);

  async function handleLogin() {
    setMessage('');

    if (!email.trim() || !password.trim()) {
      appAlert('Missing fields', 'Email and password are required.');
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
          appAlert(
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
        appAlert('Login failed', errorMessage);
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
      appAlert(
        'Network error',
        `Unable to connect to the login backend at ${LOGIN_URL}. Make sure the Drishx-admin-and-backend server is running and reachable from this device.`
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
            <Text style={styles.heading}>Login</Text>
            <Text style={styles.subheading}>Welcome back to DrishX</Text>
            {__DEV__ ? (
              <Text style={styles.devApiHint} selectable>
                API: {BACKEND_BASE_URL}
              </Text>
            ) : null}

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
                returnKeyType="done"
              />
            </View>

            {message ? <Text style={styles.message}>{message}</Text> : null}

            <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <Text style={styles.buttonText}>Log in</Text>
              )}
            </Pressable>

            <Link href="/signup" style={styles.backLink}>
              <Text style={styles.linkText}>Create account</Text>
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
      marginBottom: 8,
    },
    devApiHint: {
      color: c.textMuted,
      fontSize: 11,
      marginBottom: 24,
      fontFamily: 'monospace',
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
