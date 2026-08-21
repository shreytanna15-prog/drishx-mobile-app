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
import { getDraftForUser, saveRegistrationDraft } from '@/lib/registration-draft';

const SIGNUP_URL = `${BACKEND_BASE_URL}/api/auth/signup`;

export const options = {
  headerShown: false,
};

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [alternateMobileNumber, setAlternateMobileNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const colors = useSystemBrandColors();
  const statusBarStyle = useStatusBarStyle();
  const styles = useSystemThemedStyles(createStyles);

  async function handleSignup() {
    if (
      !name.trim() ||
      !businessName.trim() ||
      !mobileNumber.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      appAlert(
        'Missing fields',
        'Full name, business name, mobile, email, and password are required.'
      );
      return;
    }

    if (password !== confirmPassword) {
      appAlert('Password mismatch', 'Please make sure both passwords match.');
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await fetch(SIGNUP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          businessName: businessName.trim(),
          mobileNumber: mobileNumber.trim(),
          alternateMobileNumber: alternateMobileNumber.trim() || undefined,
          whatsappNumber: whatsappNumber.trim() || undefined,
          email: normalizedEmail,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        appAlert('Signup failed', result?.error || 'Signup failed. Please try again.');
        return;
      }

      const userId = result?.user?.id;
      if (!userId) {
        appAlert('Signup failed', 'Account was created but user id was missing.');
        return;
      }

      await saveRegistrationDraft(await getDraftForUser(userId, normalizedEmail));

      router.replace({
        pathname: '/business-info',
        params: { userId, email: normalizedEmail },
      });
    } catch {
      appAlert(
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
          <View style={styles.steps}>
            <View style={[styles.step, styles.stepActive]} />
            <View style={styles.step} />
            <View style={styles.step} />
            <View style={styles.step} />
            <View style={styles.step} />
          </View>

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

          <Field label="Business name" colors={colors} styles={styles}>
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

          <Field label="Email" colors={colors} styles={styles}>
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

          <Field label="Password" colors={colors} styles={styles}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.placeholder}
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />
          </Field>

          <Field label="Confirm password" colors={colors} styles={styles}>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              placeholderTextColor={colors.placeholder}
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />
          </Field>

          <Pressable style={styles.button} onPress={handleSignup} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
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
    backLink: { marginTop: 18, alignItems: 'center' },
    linkText: { color: c.link, fontSize: 15, fontWeight: '600' },
  });
