'use client';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAwareScroll } from '@/components/keyboard-aware-scroll';
import { appAlert } from '@/lib/app-alert';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { useSystemBrandColors, useSystemThemedStyles } from '@/hooks/use-system-themed-styles';
import {
  EMPTY_GST_INFO,
  getDraftForUser,
  saveRegistrationDraft,
  validateOptionalGstinPan,
  type RegistrationGstInfo,
} from '@/lib/registration-draft';

export default function GstDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string; email?: string }>();
  const userId = params.userId ? String(params.userId) : '';
  const email = params.email ? String(params.email) : '';

  const [gstNumber, setGstNumber] = useState('');
  const [legalBusinessName, setLegalBusinessName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [gstRegistrationState, setGstRegistrationState] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const colors = useSystemBrandColors();
  const statusBarStyle = useStatusBarStyle();
  const styles = useSystemThemedStyles(createStyles);

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      const draft = await getDraftForUser(userId, email);
      if (draft.gst) {
        setGstNumber(draft.gst.gstNumber);
        setLegalBusinessName(draft.gst.legalBusinessName);
        setTradeName(draft.gst.tradeName);
        setGstRegistrationState(draft.gst.gstRegistrationState);
        setPanNumber(draft.gst.panNumber);
      }
    })();
  }, [userId, email]);

  async function persistAndContinue(gst: RegistrationGstInfo) {
    if (!userId) {
      appAlert('Missing account', 'Please sign up again to continue.');
      router.replace('/signup');
      return;
    }

    const draft = await getDraftForUser(userId, email);
    await saveRegistrationDraft({ ...draft, gst });
    router.replace({
      pathname: '/registration-addresses',
      params: { userId, email },
    });
  }

  async function handleContinue() {
    const formatError = validateOptionalGstinPan({ gstNumber, panNumber });
    if (formatError) {
      appAlert('Invalid details', formatError);
      return;
    }

    await persistAndContinue({
      gstNumber: gstNumber.trim().toUpperCase(),
      legalBusinessName: legalBusinessName.trim(),
      tradeName: tradeName.trim(),
      gstRegistrationState: gstRegistrationState.trim(),
      panNumber: panNumber.trim().toUpperCase(),
    });
  }

  async function handleSkip() {
    await persistAndContinue(EMPTY_GST_INFO);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style={statusBarStyle} />
      <KeyboardAwareScroll style={styles.root} contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.heading}>GST information</Text>
          <Text style={styles.subheading}>
            GST details are optional. Without GST your account stays incomplete until an admin
            reviews it.
          </Text>
          <View style={styles.steps}>
            <View style={[styles.step, styles.stepActive]} />
            <View style={[styles.step, styles.stepActive]} />
            <View style={[styles.step, styles.stepActive]} />
            <View style={styles.step} />
            <View style={styles.step} />
          </View>

          <Field label="GSTIN (optional)" styles={styles}>
            <TextInput
              value={gstNumber}
              onChangeText={(value) => setGstNumber(value.toUpperCase())}
              placeholder="22AAAAA0000A1Z5"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="characters"
              style={styles.input}
            />
          </Field>
          <Field label="Legal business name (optional)" styles={styles}>
            <TextInput
              value={legalBusinessName}
              onChangeText={setLegalBusinessName}
              placeholder="Legal business name"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </Field>
          <Field label="Trade name (optional)" styles={styles}>
            <TextInput
              value={tradeName}
              onChangeText={setTradeName}
              placeholder="Trade name"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </Field>
          <Field label="GST registration state (optional)" styles={styles}>
            <TextInput
              value={gstRegistrationState}
              onChangeText={setGstRegistrationState}
              placeholder="GST registration state"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </Field>
          <Field label="PAN (optional)" styles={styles}>
            <TextInput
              value={panNumber}
              onChangeText={(value) => setPanNumber(value.toUpperCase())}
              placeholder="ABCDE1234F"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="characters"
              style={styles.input}
            />
          </Field>

          <Pressable style={styles.button} onPress={() => void handleContinue()}>
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
          <Pressable style={styles.skipButton} onPress={() => void handleSkip()}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
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
    container: { padding: 24, paddingTop: 16, minHeight: '100%' },
    card: {
      borderRadius: 20,
      padding: 24,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    heading: { color: c.text, fontSize: 28, fontWeight: '800', marginBottom: 6 },
    subheading: { color: c.textMuted, fontSize: 14, marginBottom: 16, lineHeight: 20 },
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
    skipButton: { marginTop: 16, alignItems: 'center', paddingVertical: 8 },
    skipText: { color: c.link, fontSize: 15, fontWeight: '600' },
  });
