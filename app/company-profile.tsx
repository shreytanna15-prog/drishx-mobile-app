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
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <DetailRow label="Customer Name" value={user.name || user.email} styles={styles} />
            <DetailRow label="Email" value={user.email} styles={styles} />
            <DetailRow label="Client ID" value={user.id} styles={styles} />
            <DetailRow label="Business Name" value={user.businessName} styles={styles} />
            <DetailRow label="GST Number" value={user.gstNumber} styles={styles} />
            <DetailRow label="Business Address" value={user.businessAddress} styles={styles} />
            <DetailRow label="State" value={user.state} styles={styles} />
            <DetailRow label="Pincode" value={user.pincode} styles={styles} />
          </View>
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
    content: { padding: 16 },
    card: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 14,
      gap: 12,
    },
    row: { gap: 4 },
    rowLabel: { color: c.label, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    rowValue: { color: c.text, fontSize: 15, fontWeight: '600' },
  });
