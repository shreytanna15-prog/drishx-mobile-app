'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useAuth } from '@/lib/auth';
import { useBrandColors } from '@/lib/theme-provider';

type CompanyProfileStyles = ReturnType<typeof createStyles>;

function DetailRow({
  label,
  value,
  styles,
}: {
  label: string;
  value?: string | null;
  styles: CompanyProfileStyles;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value?.trim() ? value : '—'}</Text>
    </View>
  );
}

function Section({
  title,
  children,
  styles,
}: {
  title: string;
  children: React.ReactNode;
  styles: CompanyProfileStyles;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function CompanyProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);

  if (!user) return null;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Company Profile</Text>
          <Pressable onPress={() => router.push('/edit-profile')} hitSlop={8}>
            <Text style={styles.editLink}>Edit</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Section title="Account" styles={styles}>
            <DetailRow label="Customer Name" value={user.name || user.email} styles={styles} />
            <DetailRow label="Email" value={user.email} styles={styles} />
            <DetailRow label="Client ID" value={user.id} styles={styles} />
            <DetailRow label="Mobile" value={user.mobileNumber} styles={styles} />
            <DetailRow label="Alternate mobile" value={user.alternateMobileNumber} styles={styles} />
            <DetailRow label="WhatsApp" value={user.whatsappNumber} styles={styles} />
          </Section>

          <Section title="Business info" styles={styles}>
            <DetailRow label="Business Name" value={user.businessName} styles={styles} />
            <DetailRow label="Shop name" value={user.shopName} styles={styles} />
            <DetailRow label="Business type" value={user.businessType} styles={styles} />
            <DetailRow label="Address line 1" value={user.addressLine1} styles={styles} />
            <DetailRow label="Address line 2" value={user.addressLine2} styles={styles} />
            <DetailRow label="City" value={user.city} styles={styles} />
            <DetailRow label="State" value={user.state} styles={styles} />
            <DetailRow label="Pincode" value={user.pincode} styles={styles} />
            <DetailRow label="Business email" value={user.businessEmail} styles={styles} />
            <DetailRow label="Shop phone" value={user.shopPhoneNumber} styles={styles} />
          </Section>

          <Section title="GST information" styles={styles}>
            <DetailRow label="GST Number" value={user.gstNumber} styles={styles} />
            <DetailRow label="Legal business name" value={user.legalBusinessName} styles={styles} />
            <DetailRow label="Trade name" value={user.tradeName} styles={styles} />
            <DetailRow
              label="GST registration state"
              value={user.gstRegistrationState}
              styles={styles}
            />
            <DetailRow label="PAN" value={user.panNumber} styles={styles} />
          </Section>

          <Section title="Billing address" styles={styles}>
            <DetailRow label="Legal name" value={user.billingLegalName} styles={styles} />
            <DetailRow label="Address" value={user.billingAddress} styles={styles} />
            <DetailRow label="City" value={user.billingCity} styles={styles} />
            <DetailRow label="State" value={user.billingState} styles={styles} />
            <DetailRow label="PIN" value={user.billingPincode} styles={styles} />
            <DetailRow label="GST state" value={user.billingGstState} styles={styles} />
          </Section>

          <Section title="Shipping address" styles={styles}>
            <DetailRow label="Legal name" value={user.shippingLegalName} styles={styles} />
            <DetailRow label="Address" value={user.shippingAddress} styles={styles} />
            <DetailRow label="City" value={user.shippingCity} styles={styles} />
            <DetailRow label="State" value={user.shippingState} styles={styles} />
            <DetailRow label="PIN" value={user.shippingPincode} styles={styles} />
          </Section>
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
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    headerTitle: { color: c.text, fontSize: 18, fontWeight: '700' },
    editLink: { color: c.primary, fontSize: 14, fontWeight: '700' },
    content: { padding: 16, gap: 12 },
    card: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 14,
      gap: 12,
    },
    sectionTitle: {
      color: c.primary,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    row: { gap: 4 },
    rowLabel: { color: c.label, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    rowValue: { color: c.text, fontSize: 15, fontWeight: '600' },
  });
