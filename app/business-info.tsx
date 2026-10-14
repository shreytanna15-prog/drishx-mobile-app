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
  EMPTY_BUSINESS_INFO,
  getDraftForUser,
  saveRegistrationDraft,
  type RegistrationBusinessInfo,
} from '@/lib/registration-draft';

export default function BusinessInfoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string; email?: string }>();
  const userId = params.userId ? String(params.userId) : '';
  const email = params.email ? String(params.email) : '';

  const [shopName, setShopName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [shopPhoneNumber, setShopPhoneNumber] = useState('');
  const colors = useSystemBrandColors();
  const statusBarStyle = useStatusBarStyle();
  const styles = useSystemThemedStyles(createStyles);

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      const draft = await getDraftForUser(userId, email);
      if (draft.business) {
        setShopName(draft.business.shopName);
        setBusinessType(draft.business.businessType);
        setAddressLine1(draft.business.addressLine1);
        setAddressLine2(draft.business.addressLine2);
        setCity(draft.business.city);
        setState(draft.business.state);
        setPincode(draft.business.pincode);
        setBusinessEmail(draft.business.businessEmail);
        setShopPhoneNumber(draft.business.shopPhoneNumber);
      }
    })();
  }, [userId, email]);

  async function persistAndContinue(business: RegistrationBusinessInfo) {
    if (!userId) {
      appAlert('Missing account', 'Please sign up again to continue.');
      router.replace('/signup');
      return;
    }

    const draft = await getDraftForUser(userId, email);
    await saveRegistrationDraft({ ...draft, business });
    router.replace({
      pathname: '/gst-details',
      params: { userId, email },
    });
  }

  async function handleContinue() {
    await persistAndContinue({
      shopName: shopName.trim(),
      businessType: businessType.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      businessEmail: businessEmail.trim().toLowerCase(),
      shopPhoneNumber: shopPhoneNumber.trim(),
    });
  }

  async function handleSkip() {
    await persistAndContinue(EMPTY_BUSINESS_INFO);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style={statusBarStyle} />
      <KeyboardAwareScroll style={styles.root} contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.heading}>Business info</Text>
          <Text style={styles.subheading}>
            Shop details are optional — you can skip and add them later.
          </Text>
          <View style={styles.steps}>
            <View style={[styles.step, styles.stepActive]} />
            <View style={[styles.step, styles.stepActive]} />
            <View style={styles.step} />
            <View style={styles.step} />
            <View style={styles.step} />
          </View>

          <Field label="Shop name (optional)" styles={styles}>
            <TextInput
              value={shopName}
              onChangeText={setShopName}
              placeholder="Shop / store name"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </Field>
          <Field label="Business type (optional)" styles={styles}>
            <TextInput
              value={businessType}
              onChangeText={setBusinessType}
              placeholder="Optical retail, distributor, etc."
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </Field>
          <Field label="Address line 1 (optional)" styles={styles}>
            <TextInput
              value={addressLine1}
              onChangeText={setAddressLine1}
              placeholder="Street address"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </Field>
          <Field label="Address line 2 (optional)" styles={styles}>
            <TextInput
              value={addressLine2}
              onChangeText={setAddressLine2}
              placeholder="Landmark, floor, area"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </Field>
          <Field label="City (optional)" styles={styles}>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="City"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </Field>
          <Field label="State (optional)" styles={styles}>
            <TextInput
              value={state}
              onChangeText={setState}
              placeholder="State"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </Field>
          <Field label="Pin code (optional)" styles={styles}>
            <TextInput
              value={pincode}
              onChangeText={setPincode}
              placeholder="Pincode"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
              style={styles.input}
            />
          </Field>
          <Field label="Business contact email (optional)" styles={styles}>
            <TextInput
              value={businessEmail}
              onChangeText={setBusinessEmail}
              placeholder="business@example.com"
              placeholderTextColor={colors.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
          </Field>
          <Field label="Shop phone number (optional)" styles={styles}>
            <TextInput
              value={shopPhoneNumber}
              onChangeText={setShopPhoneNumber}
              placeholder="Shop phone number"
              placeholderTextColor={colors.placeholder}
              keyboardType="phone-pad"
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
