'use client';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAwareScroll } from '@/components/keyboard-aware-scroll';
import { BrandColors } from '@/constants/brand-colors';
import { mapApiUser, submitGstDetails } from '@/lib/auth-api';
import { useAuth } from '@/lib/auth';

export default function GstDetailsScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{ userId?: string; email?: string }>();
  const userId = params.userId ? String(params.userId) : '';
  const email = params.email ? String(params.email) : '';

  const [gstNumber, setGstNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!userId) {
      Alert.alert('Missing account', 'Please sign up again to continue.');
      router.replace('/signup');
      return;
    }

    if (!gstNumber.trim() || !businessName.trim() || !businessAddress.trim()) {
      Alert.alert('Missing fields', 'GST number, business name, and address are required.');
      return;
    }

    setLoading(true);
    try {
      const { user, token } = await submitGstDetails({
        userId,
        gstNumber: gstNumber.trim().toUpperCase(),
        businessName: businessName.trim(),
        businessAddress: businessAddress.trim(),
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
      });

      const mapped = mapApiUser(user as unknown as Record<string, unknown>);
      signIn(token, mapped);

      router.replace({
        pathname: '/pending-approval',
        params: { email, userId },
      });
    } catch (error) {
      Alert.alert('Submission failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <KeyboardAwareScroll style={styles.root} contentContainerStyle={styles.container}>
          <View style={styles.card}>
            <Text style={styles.heading}>GST details</Text>
            <Text style={styles.subheading}>
              Submit your business GST information. Admin will review and approve your account.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>GSTIN</Text>
              <TextInput
                value={gstNumber}
                onChangeText={setGstNumber}
                placeholder="22AAAAA0000A1Z5"
                placeholderTextColor={BrandColors.placeholder}
                autoCapitalize="characters"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Business name</Text>
              <TextInput
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Your business name"
                placeholderTextColor={BrandColors.placeholder}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Business address</Text>
              <TextInput
                value={businessAddress}
                onChangeText={setBusinessAddress}
                placeholder="Street, city, area"
                placeholderTextColor={BrandColors.placeholder}
                multiline
                style={[styles.input, styles.textArea]}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>State</Text>
              <TextInput
                value={state}
                onChangeText={setState}
                placeholder="State"
                placeholderTextColor={BrandColors.placeholder}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Pincode</Text>
              <TextInput
                value={pincode}
                onChangeText={setPincode}
                placeholder="Pincode"
                placeholderTextColor={BrandColors.placeholder}
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>

            <Pressable style={styles.button} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={BrandColors.primaryText} />
              ) : (
                <Text style={styles.buttonText}>Submit for approval</Text>
              )}
            </Pressable>
          </View>
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BrandColors.background },
  root: { flex: 1, backgroundColor: BrandColors.background },
  container: { padding: 24, paddingTop: 16, minHeight: '100%' },
  card: {
    borderRadius: 20,
    padding: 24,
    backgroundColor: BrandColors.card,
    borderWidth: 1,
    borderColor: BrandColors.cardBorder,
  },
  heading: { color: BrandColors.text, fontSize: 28, fontWeight: '800', marginBottom: 6 },
  subheading: { color: BrandColors.textMuted, fontSize: 14, marginBottom: 24, lineHeight: 20 },
  field: { marginBottom: 16 },
  label: { marginBottom: 8, fontSize: 14, fontWeight: '600', color: BrandColors.label },
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
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  button: {
    marginTop: 8,
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primary,
  },
  buttonText: { color: BrandColors.primaryText, fontSize: 16, fontWeight: '800' },
});
