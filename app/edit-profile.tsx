'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { appAlert } from '@/lib/app-alert';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useAuth } from '@/lib/auth';
import { updateCustomerProfile } from '@/lib/customer-profile-api';
import { useBrandColors } from '@/lib/theme-provider';

function Field({
  label,
  value,
  onChangeText,
  styles,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, token, updateUser } = useAuth();
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const [pending, setPending] = useState(false);

  const [name, setName] = useState('');
  const [alternateMobileNumber, setAlternateMobileNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [shopName, setShopName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [shopPhoneNumber, setShopPhoneNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [legalBusinessName, setLegalBusinessName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [gstRegistrationState, setGstRegistrationState] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [billingLegalName, setBillingLegalName] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingPincode, setBillingPincode] = useState('');
  const [billingGstState, setBillingGstState] = useState('');
  const [shippingLegalName, setShippingLegalName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingState, setShippingState] = useState('');
  const [shippingPincode, setShippingPincode] = useState('');

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setAlternateMobileNumber(user.alternateMobileNumber ?? '');
    setWhatsappNumber(user.whatsappNumber ?? '');
    setShopName(user.shopName ?? '');
    setBusinessType(user.businessType ?? '');
    setAddressLine1(user.addressLine1 ?? '');
    setAddressLine2(user.addressLine2 ?? '');
    setCity(user.city ?? '');
    setState(user.state ?? '');
    setPincode(user.pincode ?? '');
    setBusinessEmail(user.businessEmail ?? '');
    setShopPhoneNumber(user.shopPhoneNumber ?? '');
    setGstNumber(user.gstNumber ?? '');
    setLegalBusinessName(user.legalBusinessName ?? '');
    setTradeName(user.tradeName ?? '');
    setGstRegistrationState(user.gstRegistrationState ?? '');
    setPanNumber(user.panNumber ?? '');
    setBillingLegalName(user.billingLegalName ?? '');
    setBillingAddress(user.billingAddress ?? '');
    setBillingCity(user.billingCity ?? '');
    setBillingState(user.billingState ?? '');
    setBillingPincode(user.billingPincode ?? '');
    setBillingGstState(user.billingGstState ?? '');
    setShippingLegalName(user.shippingLegalName ?? '');
    setShippingAddress(user.shippingAddress ?? '');
    setShippingCity(user.shippingCity ?? '');
    setShippingState(user.shippingState ?? '');
    setShippingPincode(user.shippingPincode ?? '');
  }, [user]);

  async function handleSave() {
    if (!token || !user) {
      router.replace('/login');
      return;
    }
    setPending(true);
    try {
      const result = await updateCustomerProfile({
        name: name.trim() || null,
        alternateMobileNumber: alternateMobileNumber.trim() || null,
        whatsappNumber: whatsappNumber.trim() || null,
        shopName: shopName.trim() || null,
        businessType: businessType.trim() || null,
        addressLine1: addressLine1.trim() || null,
        addressLine2: addressLine2.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        pincode: pincode.trim() || null,
        businessEmail: businessEmail.trim().toLowerCase() || null,
        shopPhoneNumber: shopPhoneNumber.trim() || null,
        gstNumber: gstNumber.trim().toUpperCase() || null,
        legalBusinessName: legalBusinessName.trim() || null,
        tradeName: tradeName.trim() || null,
        gstRegistrationState: gstRegistrationState.trim() || null,
        panNumber: panNumber.trim().toUpperCase() || null,
        billingLegalName: billingLegalName.trim() || null,
        billingAddress: billingAddress.trim() || null,
        billingCity: billingCity.trim() || null,
        billingState: billingState.trim() || null,
        billingPincode: billingPincode.trim() || null,
        billingGstState: billingGstState.trim() || null,
        shippingLegalName: shippingLegalName.trim() || null,
        shippingAddress: shippingAddress.trim() || null,
        shippingCity: shippingCity.trim() || null,
        shippingState: shippingState.trim() || null,
        shippingPincode: shippingPincode.trim() || null,
      });
      updateUser(result.user);
      router.replace({
        pathname: '/pending-approval',
        params: { email: result.user.email },
      });
    } catch (err) {
      appAlert(
        'Update failed',
        err instanceof Error ? err.message : 'Could not save profile.'
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit profile</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.hint}>
            Saving sends your account back for admin approval. Orders stay frozen until approved
            again.
          </Text>

          <Text style={styles.section}>Account</Text>
          <Field label="Name" value={name} onChangeText={setName} styles={styles} />
          <Field
            label="Alternate mobile"
            value={alternateMobileNumber}
            onChangeText={setAlternateMobileNumber}
            styles={styles}
          />
          <Field
            label="WhatsApp"
            value={whatsappNumber}
            onChangeText={setWhatsappNumber}
            styles={styles}
          />

          <Text style={styles.section}>Business</Text>
          <Field label="Shop name" value={shopName} onChangeText={setShopName} styles={styles} />
          <Field
            label="Business type"
            value={businessType}
            onChangeText={setBusinessType}
            styles={styles}
          />
          <Field
            label="Address line 1"
            value={addressLine1}
            onChangeText={setAddressLine1}
            styles={styles}
          />
          <Field
            label="Address line 2"
            value={addressLine2}
            onChangeText={setAddressLine2}
            styles={styles}
          />
          <Field label="City" value={city} onChangeText={setCity} styles={styles} />
          <Field label="State" value={state} onChangeText={setState} styles={styles} />
          <Field label="Pincode" value={pincode} onChangeText={setPincode} styles={styles} />
          <Field
            label="Business email"
            value={businessEmail}
            onChangeText={setBusinessEmail}
            styles={styles}
          />
          <Field
            label="Shop phone"
            value={shopPhoneNumber}
            onChangeText={setShopPhoneNumber}
            styles={styles}
          />

          <Text style={styles.section}>GST</Text>
          <Field label="GSTIN" value={gstNumber} onChangeText={setGstNumber} styles={styles} />
          <Field
            label="Legal business name"
            value={legalBusinessName}
            onChangeText={setLegalBusinessName}
            styles={styles}
          />
          <Field label="Trade name" value={tradeName} onChangeText={setTradeName} styles={styles} />
          <Field
            label="GST registration state"
            value={gstRegistrationState}
            onChangeText={setGstRegistrationState}
            styles={styles}
          />
          <Field label="PAN" value={panNumber} onChangeText={setPanNumber} styles={styles} />

          <Text style={styles.section}>Billing</Text>
          <Field
            label="Legal name"
            value={billingLegalName}
            onChangeText={setBillingLegalName}
            styles={styles}
          />
          <Field
            label="Address"
            value={billingAddress}
            onChangeText={setBillingAddress}
            styles={styles}
          />
          <Field label="City" value={billingCity} onChangeText={setBillingCity} styles={styles} />
          <Field
            label="State"
            value={billingState}
            onChangeText={setBillingState}
            styles={styles}
          />
          <Field
            label="PIN"
            value={billingPincode}
            onChangeText={setBillingPincode}
            styles={styles}
          />
          <Field
            label="GST state"
            value={billingGstState}
            onChangeText={setBillingGstState}
            styles={styles}
          />

          <Text style={styles.section}>Shipping</Text>
          <Field
            label="Legal name"
            value={shippingLegalName}
            onChangeText={setShippingLegalName}
            styles={styles}
          />
          <Field
            label="Address"
            value={shippingAddress}
            onChangeText={setShippingAddress}
            styles={styles}
          />
          <Field
            label="City"
            value={shippingCity}
            onChangeText={setShippingCity}
            styles={styles}
          />
          <Field
            label="State"
            value={shippingState}
            onChangeText={setShippingState}
            styles={styles}
          />
          <Field
            label="PIN"
            value={shippingPincode}
            onChangeText={setShippingPincode}
            styles={styles}
          />

          <Pressable
            style={[styles.saveButton, pending && styles.saveDisabled]}
            onPress={() => void handleSave()}
            disabled={pending}
          >
            {pending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>Save & resubmit for approval</Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    safeArea: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: { color: c.text, fontSize: 18, fontWeight: '700' },
    content: { padding: 16, paddingBottom: 40, gap: 10 },
    hint: { color: c.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 8 },
    section: {
      color: c.primary,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginTop: 12,
    },
    field: { gap: 6 },
    label: { color: c.label, fontSize: 12, fontWeight: '600' },
    input: {
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: c.text,
      fontSize: 15,
    },
    saveButton: {
      marginTop: 20,
      backgroundColor: c.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    saveDisabled: { opacity: 0.7 },
    saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
