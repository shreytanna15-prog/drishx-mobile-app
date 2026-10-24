'use client';

import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAwareScroll } from '@/components/keyboard-aware-scroll';
import { appAlert } from '@/lib/app-alert';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { useSystemBrandColors, useSystemThemedStyles } from '@/hooks/use-system-themed-styles';
import { BACKEND_BASE_URL } from '@/lib/api-config';
import { resolveAuthTokens, useAuth } from '@/lib/auth';
import {
  sendEmailOtp,
  sendMobileOtp,
  verifyEmailOtp,
  verifyMobileOtp,
} from '@/lib/otp-api';
import { getDraftForUser, saveRegistrationDraft } from '@/lib/registration-draft';

type Step = 'details' | 'otp' | 'email';

export const options = {
  headerShown: false,
};

export default function SignupScreen() {
  const router = useRouter();
  const { signIn, updateUser } = useAuth();
  const [step, setStep] = useState<Step>('details');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [alternateMobileNumber, setAlternateMobileNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [providerSessionId, setProviderSessionId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailSessionId, setEmailSessionId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const colors = useSystemBrandColors();
  const statusBarStyle = useStatusBarStyle();
  const styles = useSystemThemedStyles(createStyles);

  async function goToWizard(userId: string, userEmail: string) {
    await saveRegistrationDraft(await getDraftForUser(userId, userEmail));
    router.replace({
      pathname: '/business-info',
      params: { userId, email: userEmail },
    });
  }

  async function handleSendMobileOtp() {
    if (!name.trim() || !mobileNumber.trim()) {
      appAlert('Missing fields', 'Full name and mobile number are required.');
      return;
    }
    setLoading(true);
    try {
      const sent = await sendMobileOtp({
        mobileNumber,
        purpose: 'SIGNUP',
      });
      setProviderSessionId(sent.providerSessionId);
      setOtpCode('');
      setStep('otp');
    } catch (err) {
      appAlert(
        'Send OTP failed',
        err instanceof Error
          ? err.message
          : `Unable to reach ${BACKEND_BASE_URL}. Is the backend running?`
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyMobileOtp() {
    if (!otpCode.trim()) {
      appAlert('Missing OTP', 'Enter the OTP sent to your mobile.');
      return;
    }
    setLoading(true);
    try {
      const result = await verifyMobileOtp({
        mobileNumber,
        purpose: 'SIGNUP',
        code: otpCode,
        providerSessionId,
        name,
        businessName: businessName.trim() || undefined,
        alternateMobileNumber: alternateMobileNumber.trim() || undefined,
        whatsappNumber: whatsappNumber.trim() || undefined,
      });
      const { accessToken: token, refreshToken } = resolveAuthTokens(result);
      if (!token || !result.user) {
        appAlert('Signup failed', 'Account was created but session was missing. Please log in.');
        return;
      }
      signIn(token, result.user, refreshToken);
      setAccessToken(token);
      setCreatedUserId(result.user.id);
      setCreatedEmail(result.user.email);
      setStep('email');
    } catch (err) {
      appAlert(
        'Verify failed',
        err instanceof Error ? err.message : 'OTP verification failed.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSendEmailOtp() {
    if (!email.trim()) {
      appAlert('Email required', 'Enter an email, or tap Skip.');
      return;
    }
    setLoading(true);
    try {
      const sent = await sendEmailOtp({
        email,
        purpose: 'SIGNUP',
        accessToken,
      });
      setEmailSessionId(sent.providerSessionId);
      setEmailOtp('');
    } catch (err) {
      appAlert(
        'Send email OTP failed',
        err instanceof Error ? err.message : 'Failed to send email OTP.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyEmailOtp() {
    if (!emailOtp.trim()) {
      appAlert('Missing OTP', 'Enter the email OTP, or tap Skip.');
      return;
    }
    setLoading(true);
    try {
      const result = await verifyEmailOtp({
        email,
        purpose: 'SIGNUP',
        code: emailOtp,
        providerSessionId: emailSessionId,
        accessToken,
      });
      if (result.user) {
        updateUser(result.user);
        await goToWizard(result.user.id, result.user.email);
        return;
      }
      if (createdUserId) {
        await goToWizard(createdUserId, email.trim().toLowerCase());
      }
    } catch (err) {
      appAlert(
        'Email verify failed',
        err instanceof Error ? err.message : 'Email OTP failed.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSkipEmail() {
    if (!createdUserId) {
      appAlert('Signup incomplete', 'Please verify mobile OTP first.');
      return;
    }
    await goToWizard(createdUserId, createdEmail);
  }

  const subtitle =
    step === 'details'
      ? 'Verify your mobile to create an account. Business and GST details are optional next.'
      : step === 'otp'
        ? 'Enter the OTP sent to your mobile.'
        : 'Optional: verify an email now, or skip and continue registration.';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style={statusBarStyle} />
      <KeyboardAwareScroll style={styles.root} contentContainerStyle={styles.container} centerContent>
        <View style={styles.card}>
          <Text style={styles.heading}>Create account</Text>
          <Text style={styles.subheading}>{subtitle}</Text>
          <View style={styles.steps}>
            <View style={[styles.step, styles.stepActive]} />
            <View style={[styles.step, step !== 'details' ? styles.stepActive : null]} />
            <View style={styles.step} />
            <View style={styles.step} />
            <View style={styles.step} />
          </View>

          {step === 'details' && (
            <>
              <Field label="Full name" colors={colors} styles={styles}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="John Doe"
                  placeholderTextColor={colors.placeholder}
                  style={styles.input}
                  autoCapitalize="words"
                />
              </Field>

              <Field label="Business name (optional)" colors={colors} styles={styles}>
                <TextInput
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="Your business name"
                  placeholderTextColor={colors.placeholder}
                  style={styles.input}
                />
              </Field>

              <Field label="Mobile number" colors={colors} styles={styles}>
                <TextInput
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              </Field>

              <Field label="Alternate mobile number (optional)" colors={colors} styles={styles}>
                <TextInput
                  value={alternateMobileNumber}
                  onChangeText={setAlternateMobileNumber}
                  placeholder="Alternate mobile number"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              </Field>

              <Field label="WhatsApp number (optional)" colors={colors} styles={styles}>
                <TextInput
                  value={whatsappNumber}
                  onChangeText={setWhatsappNumber}
                  placeholder="WhatsApp number"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              </Field>

              <Pressable style={styles.button} onPress={handleSendMobileOtp} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={colors.primaryText} />
                ) : (
                  <Text style={styles.buttonText}>Send mobile OTP</Text>
                )}
              </Pressable>
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={styles.hint}>Code sent to {mobileNumber}</Text>
              <Field label="Mobile OTP" colors={colors} styles={styles}>
                <TextInput
                  value={otpCode}
                  onChangeText={setOtpCode}
                  placeholder="6-digit code"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                  style={styles.input}
                  autoComplete="one-time-code"
                />
              </Field>
              <Pressable style={styles.button} onPress={handleVerifyMobileOtp} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={colors.primaryText} />
                ) : (
                  <Text style={styles.buttonText}>Verify & continue</Text>
                )}
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  setStep('details');
                  setOtpCode('');
                }}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>Change mobile number</Text>
              </Pressable>
            </>
          )}

          {step === 'email' && (
            <>
              <Field label="Email (optional)" colors={colors} styles={styles}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={styles.input}
                />
              </Field>
              {emailSessionId ? (
                <>
                  <Field label="Email OTP" colors={colors} styles={styles}>
                    <TextInput
                      value={emailOtp}
                      onChangeText={setEmailOtp}
                      placeholder="6-digit code"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="number-pad"
                      style={styles.input}
                      autoComplete="one-time-code"
                    />
                  </Field>
                </>
              ) : null}
              <Pressable
                style={styles.button}
                onPress={emailSessionId ? handleVerifyEmailOtp : handleSendEmailOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.primaryText} />
                ) : (
                  <Text style={styles.buttonText}>
                    {emailSessionId ? 'Verify email & continue' : 'Send email OTP'}
                  </Text>
                )}
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={handleSkipEmail} disabled={loading}>
                <Text style={styles.secondaryButtonText}>Skip email for now</Text>
              </Pressable>
            </>
          )}

          <Link href="/login" style={styles.backLink}>
            <Text style={styles.linkText}>Already have an account? Log in</Text>
          </Link>
        </View>
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

function Field({
  label,
  children,
  styles,
}: {
  label: string;
  children: React.ReactNode;
  colors: BrandColorScheme;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.background },
    root: { flex: 1, backgroundColor: c.background },
    container: { padding: 24, minHeight: '100%' },
    card: {
      borderRadius: 20,
      padding: 24,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    heading: { color: c.text, fontSize: 28, fontWeight: '800', marginBottom: 6 },
    subheading: { color: c.textMuted, fontSize: 14, marginBottom: 16 },
    hint: { color: c.textMuted, fontSize: 13, marginBottom: 10 },
    steps: { flexDirection: 'row', gap: 8, marginBottom: 24 },
    step: {
      flex: 1,
      height: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(240, 161, 50, 0.18)',
    },
    stepActive: { backgroundColor: c.primary },
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
      backgroundColor: c.card,
    },
    secondaryButtonText: { color: c.link, fontSize: 15, fontWeight: '600' },
    backLink: { marginTop: 18, alignItems: 'center' },
    linkText: { color: c.link, fontSize: 15, fontWeight: '600' },
  });
