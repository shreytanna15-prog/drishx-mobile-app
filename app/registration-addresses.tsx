'use client';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      const draft = await getDraftForUser(userId, email);
      if (!draft.business) {
        router.replace({ pathname: '/business-info', params: { userId, email } });
        return;
      }
      if (!draft.gst) {
        router.replace({ pathname: '/gst-details', params: { userId, email } });
      }
    })();
  }, [userId, email, router]);

  async function handleSubmit() {
    if (!userId) {
      appAlert('Missing account', 'Please sign up again to continue.');
      router.replace('/signup');
      return;
    }

    const draft = await getDraftForUser(userId, email);
    if (!draft.business) {
      router.replace({ pathname: '/business-info', params: { userId, email } });
      return;
    }
    if (!draft.gst) {
      router.replace({ pathname: '/gst-details', params: { userId, email } });
      return;
    }

    if (
      !billingLegalName.trim() ||
      !billingAddress.trim() ||
      !billingCity.trim() ||
      !billingState.trim() ||
      !billingPincode.trim() ||
      !billingGstState.trim()
    ) {
      appAlert('Missing fields', 'Please complete all billing address fields.');
      return;
    }

    const resolvedShipping = sameAsBilling
      ? {
          shippingLegalName: billingLegalName.trim(),
          shippingAddress: billingAddress.trim(),
          shippingCity: billingCity.trim(),
          shippingState: billingState.trim(),
          shippingPincode: billingPincode.trim(),
        }
      : {
          shippingLegalName: shippingLegalName.trim(),
          shippingAddress: shippingAddress.trim(),
          shippingCity: shippingCity.trim(),
          shippingState: shippingState.trim(),
          shippingPincode: shippingPincode.trim(),
        };

    if (
      !resolvedShipping.shippingLegalName ||
      !resolvedShipping.shippingAddress ||
      !resolvedShipping.shippingCity ||
      !resolvedShipping.shippingState ||
      !resolvedShipping.shippingPincode
    ) {
      appAlert('Missing fields', 'Please complete all shipping address fields.');
      return;
    }

    setLoading(true);
    try {
      const result = await submitGstDetails({
        userId,
        ...draft.business,
        addressLine2: draft.business.addressLine2 || undefined,
        ...draft.gst,
        tradeName: draft.gst.tradeName || undefined,
        billingLegalName: billingLegalName.trim(),
        billingAddress: billingAddress.trim(),
        billingCity: billingCity.trim(),
        billingState: billingState.trim(),
        billingPincode: billingPincode.trim(),
        billingGstState: billingGstState.trim(),
        ...resolvedShipping,
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
            Provide billing and delivery addresses for your account.
          </Text>
          <View style={styles.steps}>
            <View style={[styles.step, styles.stepActive]} />
            <View style={[styles.step, styles.stepActive]} />
            <View style={[styles.step, styles.stepActive]} />
            <View style={[styles.step, styles.stepActive]} />
            <View style={styles.step} />
          </View>

          <Text style={styles.sectionTitle}>Billing address</Text>
          <Field label="Legal name" styles={styles}>
            <TextInput
              value={billingLegalName}
              onChangeText={setBillingLegalName}
              placeholder="Legal name"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </Field>
          <Field label="Address" styles={styles}>
            <TextInput
              value={billingAddress}
              onChangeText={setBillingAddress}
              placeholder="Billing address"
              placeholderTextColor={colors.placeholder}
              multiline
              style={[styles.input, styles.textArea]}
            />
          </Field>
          <Field label="City" styles={styles}>
            <TextInput
              value={billingCity}
              onChangeText={setBillingCity}
              placeholder="City"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </Field>
          <Field label="State" styles={styles}>
            <TextInput
              value={billingState}
              onChangeText={setBillingState}
              placeholder="State"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </Field>
          <Field label="PIN" styles={styles}>
            <TextInput
              value={billingPincode}
              onChangeText={setBillingPincode}
              placeholder="PIN code"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
              style={styles.input}
            />
          </Field>
          <Field label="GST state" styles={styles}>
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
              <Field label="Legal name" styles={styles}>
                <TextInput
                  value={shippingLegalName}
                  onChangeText={setShippingLegalName}
                  placeholder="Legal name"
                  placeholderTextColor={colors.placeholder}
                  style={styles.input}
                />
              </Field>
              <Field label="Address" styles={styles}>
                <TextInput
                  value={shippingAddress}
                  onChangeText={setShippingAddress}
                  placeholder="Shipping address"
                  placeholderTextColor={colors.placeholder}
                  multiline
                  style={[styles.input, styles.textArea]}
                />
              </Field>
              <Field label="City" styles={styles}>
                <TextInput
                  value={shippingCity}
                  onChangeText={setShippingCity}
                  placeholder="City"
                  placeholderTextColor={colors.placeholder}
                  style={styles.input}
                />
              </Field>
              <Field label="State" styles={styles}>
                <TextInput
                  value={shippingState}
                  onChangeText={setShippingState}
                  placeholder="State"
                  placeholderTextColor={colors.placeholder}
                  style={styles.input}
                />
              </Field>
              <Field label="PIN" styles={styles}>
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

          <Pressable style={styles.button} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text style={styles.buttonText}>Submit for approval</Text>
            )}
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
  });
