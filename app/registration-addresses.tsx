'use client';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAwareScroll } from '@/components/keyboard-aware-scroll';
import { appAlert } from '@/lib/app-alert';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { useSystemBrandColors, useSystemThemedStyles } from '@/hooks/use-system-themed-styles';
import { mapApiUser, submitGstDetails } from '@/lib/auth-api';
import { resolveAuthTokens, useAuth } from '@/lib/auth';
import {
  clearRegistrationDraft,
  EMPTY_BUSINESS_INFO,
  EMPTY_GST_INFO,
  getDraftForUser,
} from '@/lib/registration-draft';

export default function RegistrationAddressesScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{ userId?: string; email?: string }>();
  const userId = params.userId ? String(params.userId) : '';
  const email = params.email ? String(params.email) : '';

  const [billingLegalName, setBillingLegalName] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingPincode, setBillingPincode] = useState('');
  const [billingGstState, setBillingGstState] = useState('');
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [shippingLegalName, setShippingLegalName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingState, setShippingState] = useState('');
  const [shippingPincode, setShippingPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const colors = useSystemBrandColors();
  const statusBarStyle = useStatusBarStyle();
  const styles = useSystemThemedStyles(createStyles);

  async function finalize(includeAddresses: boolean) {
    if (!userId) {
      appAlert('Missing account', 'Please sign up again to continue.');
      router.replace('/signup');
      return;
    }

    const draft = await getDraftForUser(userId, email);
    const business = draft.business ?? EMPTY_BUSINESS_INFO;
    const gst = draft.gst ?? EMPTY_GST_INFO;

    const billing = includeAddresses
      ? {
          billingLegalName: billingLegalName.trim() || undefined,
          billingAddress: billingAddress.trim() || undefined,
          billingCity: billingCity.trim() || undefined,
          billingState: billingState.trim() || undefined,
          billingPincode: billingPincode.trim() || undefined,
          billingGstState: billingGstState.trim() || undefined,
        }
      : {};

    const shipping = includeAddresses
      ? sameAsBilling
        ? {
            shippingLegalName: billingLegalName.trim() || undefined,
            shippingAddress: billingAddress.trim() || undefined,
            shippingCity: billingCity.trim() || undefined,
            shippingState: billingState.trim() || undefined,
            shippingPincode: billingPincode.trim() || undefined,
          }
        : {
            shippingLegalName: shippingLegalName.trim() || undefined,
            shippingAddress: shippingAddress.trim() || undefined,
            shippingCity: shippingCity.trim() || undefined,
            shippingState: shippingState.trim() || undefined,
            shippingPincode: shippingPincode.trim() || undefined,
          }
      : {};

    setLoading(true);
    try {
      const result = await submitGstDetails({
        userId,
        shopName: business.shopName || undefined,
        businessType: business.businessType || undefined,
        addressLine1: business.addressLine1 || undefined,
        addressLine2: business.addressLine2 || undefined,
        city: business.city || undefined,
        state: business.state || undefined,
        pincode: business.pincode || undefined,
        businessEmail: business.businessEmail || undefined,
        shopPhoneNumber: business.shopPhoneNumber || undefined,
        gstNumber: gst.gstNumber || undefined,
        legalBusinessName: gst.legalBusinessName || undefined,
        tradeName: gst.tradeName || undefined,
        gstRegistrationState: gst.gstRegistrationState || undefined,
        panNumber: gst.panNumber || undefined,
        ...billing,
        ...shipping,
      });

      const mapped = mapApiUser(result.user as unknown as Record<string, unknown>);
      const { accessToken, refreshToken } = resolveAuthTokens(result);
      signIn(accessToken, mapped, refreshToken);
      await clearRegistrationDraft();

      router.replace({
        pathname: '/pending-approval',
        params: { email, userId },
      });
    } catch (error) {
      appAlert('Submission failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style={statusBarStyle} />
      <KeyboardAwareScroll style={styles.root} contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.heading}>Billing & shipping</Text>
          <Text style={styles.subheading}>
            Addresses are optional. Skip to submit your registration for admin review.
          </Text>
          <View style={styles.steps}>
            <View style={[styles.step, styles.stepActive]} />
            <View style={[styles.step, styles.stepActive]} />
            <View style={[styles.step, styles.stepActive]} />
            <View style={[styles.step, styles.stepActive]} />
            <View style={styles.step} />
          </View>

          <Text style={styles.sectionTitle}>Billing address</Text>
          <Field label="Legal name (optional)" styles={styles}>
            <TextInput
              value={billingLegalName}
              onChangeText={setBillingLegalName}
              placeholder="Legal name"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </Field>
          <Field label="Address (optional)" styles={styles}>
            <TextInput
              value={billingAddress}
              onChangeText={setBillingAddress}
              placeholder="Billing address"
              placeholderTextColor={colors.placeholder}
              multiline
              style={[styles.input, styles.textArea]}
            />
          </Field>
          <Field label="City (optional)" styles={styles}>
            <TextInput
              value={billingCity}
              onChangeText={setBillingCity}
              placeholder="City"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </Field>
          <Field label="State (optional)" styles={styles}>
            <TextInput
              value={billingState}
              onChangeText={setBillingState}
              placeholder="State"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </Field>
          <Field label="PIN (optional)" styles={styles}>
            <TextInput
              value={billingPincode}
              onChangeText={setBillingPincode}
              placeholder="PIN code"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
              style={styles.input}
            />
          </Field>
          <Field label="GST state (optional)" styles={styles}>
            <TextInput
              value={billingGstState}
              onChangeText={setBillingGstState}
              placeholder="GST state"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </Field>

          <Text style={styles.sectionTitle}>Shipping / delivery address</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Same as billing address</Text>
            <Switch
              value={sameAsBilling}
              onValueChange={setSameAsBilling}
              trackColor={{ false: colors.inputBorder, true: colors.primary }}
              thumbColor={colors.primaryText}
            />
          </View>

          {!sameAsBilling ? (
            <>
              <Field label="Legal name (optional)" styles={styles}>
                <TextInput
                  value={shippingLegalName}
                  onChangeText={setShippingLegalName}
                  placeholder="Legal name"
                  placeholderTextColor={colors.placeholder}
                  style={styles.input}
                />
              </Field>
              <Field label="Address (optional)" styles={styles}>
                <TextInput
                  value={shippingAddress}
                  onChangeText={setShippingAddress}
                  placeholder="Shipping address"
                  placeholderTextColor={colors.placeholder}
                  multiline
                  style={[styles.input, styles.textArea]}
                />
              </Field>
              <Field label="City (optional)" styles={styles}>
                <TextInput
                  value={shippingCity}
                  onChangeText={setShippingCity}
                  placeholder="City"
                  placeholderTextColor={colors.placeholder}
                  style={styles.input}
                />
              </Field>
              <Field label="State (optional)" styles={styles}>
                <TextInput
                  value={shippingState}
                  onChangeText={setShippingState}
                  placeholder="State"
                  placeholderTextColor={colors.placeholder}
                  style={styles.input}
                />
              </Field>
              <Field label="PIN (optional)" styles={styles}>
                <TextInput
                  value={shippingPincode}
                  onChangeText={setShippingPincode}
                  placeholder="PIN code"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </Field>
            </>
          ) : null}

          <Pressable
            style={styles.button}
            onPress={() => void finalize(true)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text style={styles.buttonText}>Submit for approval</Text>
            )}
          </Pressable>
          <Pressable
            style={styles.skipButton}
            onPress={() => void finalize(false)}
            disabled={loading}
          >
            <Text style={styles.skipText}>Skip addresses and submit</Text>
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
    sectionTitle: {
      color: c.primary,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 12,
      marginTop: 4,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      gap: 12,
    },
    switchLabel: { color: c.label, fontSize: 14, fontWeight: '600', flex: 1 },
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
    textArea: { minHeight: 90, textAlignVertical: 'top' },
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
