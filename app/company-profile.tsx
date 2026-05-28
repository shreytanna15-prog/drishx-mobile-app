'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand-colors';
import { useAuth } from '@/lib/auth';

const GOLD = BrandColors.primary;
const BG = BrandColors.background;
const CARD = BrandColors.card;
const BORDER = BrandColors.cardBorder;

function DetailRow({ label, value }: { label: string; value?: string | null }) {
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

  if (!user) return null;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={22} color={GOLD} />
          </Pressable>
          <Text style={styles.headerTitle}>Company Profile</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <DetailRow label="Customer Name" value={user.name || user.email} />
            <DetailRow label="Email" value={user.email} />
            <DetailRow label="Client ID" value={user.id} />
            <DetailRow label="Business Name" value={user.businessName} />
            <DetailRow label="GST Number" value={user.gstNumber} />
            <DetailRow label="Business Address" value={user.businessAddress} />
            <DetailRow label="State" value={user.state} />
            <DetailRow label="Pincode" value={user.pincode} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: { color: BrandColors.text, fontSize: 18, fontWeight: '700' },
  content: { padding: 16 },
  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 12,
  },
  row: { gap: 4 },
  rowLabel: { color: BrandColors.label, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  rowValue: { color: BrandColors.text, fontSize: 15, fontWeight: '600' },
});
