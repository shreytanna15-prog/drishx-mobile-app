'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand-colors';
import { useAuth } from '@/lib/auth';

const GOLD = BrandColors.primary;
const BG = BrandColors.background;
const CARD = BrandColors.card;
const BORDER = BrandColors.cardBorder;

function getInitials(name: string | null | undefined, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function formatRoleLabel(role: string): string {
  if (role === 'ADMIN') return 'Administrator';
  if (role === 'EMPLOYEE') return 'Operations Manager';
  return role.replace(/_/g, ' ');
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  danger,
  variant,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  variant?: 'base' | 'alt';
}) {
  const isDanger = Boolean(danger);
  return (
    <Pressable style={[styles.menuRow, variant === 'alt' && styles.menuRowAlt]} onPress={onPress}>
      <View style={styles.menuLeft}>
        <MaterialIcons name={icon} size={20} color={isDanger ? '#FCA5A5' : BrandColors.textMuted} />
        <Text style={[styles.menuLabel, isDanger && styles.menuLabelDanger]}>{label}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={isDanger ? '#FCA5A5' : BrandColors.textMuted} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, isStaff } = useAuth();

  if (!user) return null;

  function handleStaffLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          signOut();
          router.replace('/login');
        },
      },
    ]);
  }

  if (isStaff) {
    const displayName = user.name?.trim() || 'Employee';
    const initials = getInitials(user.name, user.email);
    const roleLabel = formatRoleLabel(user.role);
    const accountStatus = user.isActive === false ? 'Inactive' : 'Active';

    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ScrollView contentContainerStyle={styles.scrollPad} showsVerticalScrollIndicator={false}>
            <View style={styles.mainContent}>
              <Text style={styles.screenTitle}>Profile</Text>

              <View style={styles.staffProfileCard}>
                <View style={styles.staffAvatarCircle}>
                  <Text style={styles.staffAvatarText}>{initials}</Text>
                </View>
                <Text style={styles.staffName}>{displayName}</Text>
                <Text style={styles.staffRole}>{roleLabel}</Text>
                <Text style={styles.staffEmpId} selectable>
                  EMP ID: {user.id}
                </Text>
              </View>

              <View style={styles.detailsCard}>
                <DetailRow label="Email" value={user.email} />
                <View style={styles.detailDivider} />
                <DetailRow label="Role" value={roleLabel} />
                <View style={styles.detailDivider} />
                <DetailRow label="Account status" value={accountStatus} />
              </View>

              <View style={styles.menuCard}>
                <MenuRow icon="logout" label="Logout" variant="base" danger onPress={handleStaffLogout} />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  const displayName = user.name?.trim() || 'Customer';
  const initials = getInitials(user.name, user.email);

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          signOut();
          router.replace('/login');
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollPad} showsVerticalScrollIndicator={false}>
          <View style={styles.mainContent}>
            <View style={styles.profileHeaderCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.headerText}>
                <Text style={styles.customerName}>{displayName}</Text>
                <Text style={styles.clientId}>Client ID: {user.id}</Text>
              </View>
            </View>

            <View style={styles.menuCard}>
              <MenuRow icon="apartment" label="Company Profile" variant="base" onPress={() => router.push('/company-profile')} />
              <MenuRow
                icon="location-on"
                label="Billing Address"
                variant="alt"
                onPress={() => router.push({ pathname: '/profile-placeholder', params: { title: 'Billing Address' } })}
              />
              <MenuRow
                icon="description"
                label="Invoices"
                variant="base"
                onPress={() => router.push('/invoices' as never)}
              />
              <MenuRow icon="history" label="Recent Orders" variant="alt" onPress={() => router.push('/my-orders')} />
              <MenuRow
                icon="payments"
                label="Outstanding/Payments"
                variant="base"
                onPress={() =>
                  router.push({ pathname: '/profile-placeholder', params: { title: 'Outstanding/Payments' } })
                }
              />
              <MenuRow icon="logout" label="Logout" variant="alt" danger onPress={handleLogout} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safeArea: { flex: 1 },
  scrollPad: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    minHeight: '100%',
  },
  mainContent: {
    minHeight: '84%',
    gap: 12,
  },
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#101A2A',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: GOLD, fontSize: 18, fontWeight: '800' },
  headerText: { flex: 1 },
  customerName: { color: BrandColors.text, fontSize: 20, fontWeight: '800' },
  clientId: { color: BrandColors.textMuted, fontSize: 13, marginTop: 2 },
  menuCard: {
    borderRadius: 14,
    backgroundColor: '#101A2A',
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#111F31',
  },
  menuRowAlt: {
    backgroundColor: '#0D1726',
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuLabel: { color: BrandColors.text, fontSize: 15, fontWeight: '600' },
  menuLabelDanger: { color: '#FCA5A5' },
  logoutButton: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: GOLD,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: { color: BrandColors.primaryText, fontWeight: '800', fontSize: 16 },
  screenTitle: {
    color: BrandColors.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  staffProfileCard: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#101A2A',
    borderWidth: 1,
    borderColor: BORDER,
  },
  staffAvatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: GOLD,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  staffAvatarText: { color: GOLD, fontSize: 28, fontWeight: '800' },
  staffName: {
    color: BrandColors.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  staffRole: {
    color: BrandColors.textMuted,
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  staffEmpId: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 8,
    lineHeight: 17,
  },
  detailsCard: {
    borderRadius: 14,
    backgroundColor: '#101A2A',
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
  },
  detailLabel: {
    color: BrandColors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    flex: 0.9,
  },
  detailValue: {
    color: BrandColors.text,
    fontSize: 13,
    fontWeight: '600',
    flex: 1.4,
    textAlign: 'right',
  },
  detailDivider: {
    height: 1,
    backgroundColor: BORDER,
  },
});
