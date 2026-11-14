'use client';

import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { isStaffRole, resolveAuthTokens, useAuth, type AuthUser } from '@/lib/auth';
import { BACKEND_BASE_URL } from '@/lib/api-config';
import { sendMobileOtp, verifyMobileOtp } from '@/lib/otp-api';
import {
  authLoginBodySchema,
  otpCodeSchema,
  otpLoginMobileSchema,
} from '@/lib/validation/auth-login';
import { safeParseMessage } from '@/lib/validation/parse';

const LOGIN_URL = `${BACKEND_BASE_URL}/api/auth/login`;

type LoginMode = 'otp' | 'password';

export const options = {
  headerShown: false,
};

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; mobile?: string }>();
  const { signIn } = useAuth();
  const [mode, setMode] = useState<LoginMode>('otp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [providerSessionId, setProviderSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const colors = useSystemBrandColors();
  const statusBarStyle = useStatusBarStyle();
  const styles = useSystemThemedStyles(createStyles);

  useEffect(() => {
    if (params.email && typeof params.email === 'string') {
      setEmail(params.email);
      setMode('password');
    }
    if (params.mobile && typeof params.mobile === 'string') {
      setMobileNumber(params.mobile);
      setMode('otp');
    }
  }, [params.email, params.mobile]);

  function routeAfterLogin(mapped: AuthUser) {
    const nextRoute = getCustomerNextRoute(mapped);
    if (nextRoute === '/business-info') {
      router.replace({
        pathname: '/business-info',
        params: { userId: mapped.id, email: mapped.email },
      });
      return;
    }
    if (nextRoute === '/pending-approval') {
      router.replace({
        pathname: '/pending-approval',
        params: {
          email: mapped.email,
          rejected: mapped.approvalStatus === 'REJECTED' ? '1' : '0',
          reason: mapped.rejectionReason || '',
        },
      });
      return;
    }
    router.replace(nextRoute);
  }

  async function handlePasswordLogin() {
    const loginError = safeParseMessage(authLoginBodySchema, { email, password });
    if (loginError) {
      appAlert('Missing fields', loginError);
      return;
    }
    const parsed = authLoginBodySchema.parse({ email, password });

    setLoading(true);
    try {
      const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client': 'mobile',
        },
        body: JSON.stringify({ email: parsed.email, password: parsed.password }),
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
              email: parsed.email,
              rejected: '1',
              reason: result?.rejectionReason || '',
            },
          });
          return;
        }
        appAlert('Login failed', result?.error || 'Login failed. Please try again.');
        return;
      }

      const mapped = mapApiUser(result.user as Record<string, unknown>);
      const { accessToken, refreshToken } = resolveAuthTokens(result);
      setEmail('');
      setPassword('');
      signIn(accessToken, mapped, refreshToken);
      routeAfterLogin(mapped);
    } catch {
      appAlert(
        'Network error',
        `Unable to connect to the login backend at ${LOGIN_URL}. Make sure the Drishx-admin-and-backend server is running and reachable from this device.`
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    const mobileError = safeParseMessage(otpLoginMobileSchema, mobileNumber);
    if (mobileError) {
      appAlert('Missing mobile', mobileError);
      return;
    }
    const normalizedMobile = otpLoginMobileSchema.parse(mobileNumber);
    setLoading(true);
    try {
      const sent = await sendMobileOtp({
        mobileNumber: normalizedMobile,
        purpose: 'LOGIN',
      });
      setProviderSessionId(sent.providerSessionId);
      setOtpCode('');
      setOtpSent(true);
    } catch (err) {
      appAlert(
        'Send OTP failed',
        err instanceof Error ? err.message : 'Failed to send OTP.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    const mobileError = safeParseMessage(otpLoginMobileSchema, mobileNumber);
    if (mobileError) {
      appAlert('Missing mobile', mobileError);
      return;
    }
    const codeError = safeParseMessage(otpCodeSchema, otpCode);
    if (codeError) {
      appAlert('Missing OTP', codeError);
      return;
    }
    const normalizedMobile = otpLoginMobileSchema.parse(mobileNumber);
    setLoading(true);
    try {
      const result = await verifyMobileOtp({
        mobileNumber: normalizedMobile,
        purpose: 'LOGIN',
        code: otpCode.trim(),
        providerSessionId,
      });
      const { accessToken, refreshToken } = resolveAuthTokens(result);
      if (!accessToken || !result.user) {
        appAlert('Login failed', 'Session was missing after OTP. Try again.');
        return;
      }
      if (isStaffRole(result.user.role)) {
        appAlert('Staff login', 'Staff accounts must sign in with email and password.');
        return;
      }
      signIn(accessToken, result.user, refreshToken);
      setOtpCode('');
      setOtpSent(false);
      routeAfterLogin(result.user);
    } catch (err) {
      appAlert(
        'OTP login failed',
        err instanceof Error ? err.message : 'OTP verification failed.'
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
          <Text style={styles.subheading}>
            {mode === 'otp'
              ? 'Sign in with your registered mobile number'
              : 'Email & password (customers or staff)'}
          </Text>
          {__DEV__ ? (
            <Text style={styles.devApiHint} selectable>
              API: {BACKEND_BASE_URL}
            </Text>
          ) : null}

          <View style={styles.modeRow}>
            <Pressable
              style={[styles.modeButton, mode === 'otp' && styles.modeButtonActive]}
              onPress={() => setMode('otp')}
            >
              <Text style={[styles.modeButtonText, mode === 'otp' && styles.modeButtonTextActive]}>
                Mobile OTP
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeButton, mode === 'password' && styles.modeButtonActive]}
              onPress={() => setMode('password')}
            >
              <Text
                style={[styles.modeButtonText, mode === 'password' && styles.modeButtonTextActive]}
              >
                Email & password
              </Text>
            </Pressable>
          </View>

          {mode === 'otp' ? (
            <>
              <Text style={styles.pathBHint}>
                Admin-created or walk-in accounts: sign in with the registered mobile
                number (OTP). No password required.
              </Text>
              <View style={styles.field}>
                <Text style={styles.label}>Mobile number</Text>
                <TextInput
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              </View>
              {otpSent ? (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>OTP</Text>
                    <TextInput
                      value={otpCode}
                      onChangeText={setOtpCode}
                      placeholder="6-digit code"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="number-pad"
                      style={styles.input}
                      autoComplete="one-time-code"
                    />
                  </View>
                </>
              ) : null}
              <Pressable
                style={styles.button}
                onPress={otpSent ? handleVerifyOtp : handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.primaryText} />
                ) : (
                  <Text style={styles.buttonText}>
                    {otpSent ? 'Verify & sign in' : 'Send OTP'}
                  </Text>
                )}
              </Pressable>
              {otpSent ? (
                <Pressable
                  style={styles.secondaryButton}
                  disabled={loading}
                  onPress={() => {
                    setOtpSent(false);
                    setOtpCode('');
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Change mobile number</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <>
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
              <Pressable style={styles.button} onPress={handlePasswordLogin} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={colors.primaryText} />
                ) : (
                  <Text style={styles.buttonText}>Log in</Text>
                )}
              </Pressable>
            </>
          )}

          <Pressable
            style={styles.backLink}
            hitSlop={12}
            accessibilityRole="link"
            accessibilityLabel="Create account"
            onPress={() => router.push('/signup')}
          >
            <Text style={styles.linkText}>Create account</Text>
          </Pressable>
        </View>
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.background },
    root: { flex: 1, backgroundColor: c.background },
    container: { padding: 24, paddingBottom: 32 },
    card: {
      borderRadius: 20,
      padding: 24,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    heading: { color: c.text, fontSize: 28, fontWeight: '800', marginBottom: 6 },
    subheading: { color: c.textMuted, fontSize: 14, marginBottom: 8 },
    hint: { color: c.textMuted, fontSize: 13, marginBottom: 10 },
    pathBHint: {
      fontSize: 13,
      color: c.textMuted,
      marginBottom: 12,
      lineHeight: 18,
    },
    devApiHint: {
      color: c.textMuted,
      fontSize: 11,
      marginBottom: 16,
      fontFamily: 'monospace',
    },
    modeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    modeButton: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    modeButtonActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    modeButtonText: { color: c.text, fontSize: 13, fontWeight: '700' },
    modeButtonTextActive: { color: c.primaryText },
    field: { marginBottom: 16 },
    label: { marginBottom: 8, fontSize: 14, fontWeight: '600', color: c.label },
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
    button: {
      marginTop: 8,
      borderRadius: 16,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
    },
    buttonText: { color: c.primaryText, fontSize: 16, fontWeight: '800' },
    secondaryButton: {
      marginTop: 10,
      borderRadius: 16,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    secondaryButtonText: { color: c.link, fontSize: 15, fontWeight: '600' },
    backLink: { marginTop: 18, alignItems: 'center' },
    linkText: { color: c.link, fontSize: 15, fontWeight: '600' },
  });
