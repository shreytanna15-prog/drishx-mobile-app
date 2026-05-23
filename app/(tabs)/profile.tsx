'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';

function formatRoleLabel(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrator';
    case 'EMPLOYEE':
      return 'Employee';
    case 'CUSTOMER':
      return 'Customer';
    default:
      return role;
  }
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileRow}>
      <ThemedText style={styles.profileLabel}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.profileValue}>
        {value}
      </ThemedText>
    </View>
  );
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;
  const router = useRouter();
  const { user, signOut } = useAuth();

  if (!user) {
    return null;
  }

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          signOut();
          router.replace('/login');
        },
      },
    ]);
  }

  const displayName = user.name?.trim() || '—';
  const shortId = user.id.slice(-8).toUpperCase();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.screenTitle}>
            Profile
          </ThemedText>
          <ThemedText style={styles.subtitle}>Your employee account</ThemedText>
        </View>

        <View style={styles.content}>
          <View style={styles.avatarBlock}>
            <View style={[styles.avatarCircle, { backgroundColor: `${tint}22` }]}>
              <MaterialIcons name="person" size={40} color={tint} />
            </View>
            <ThemedText type="subtitle" style={styles.avatarName}>
              {displayName !== '—' ? displayName : user.email}
            </ThemedText>
            <View style={styles.roleBadge}>
              <ThemedText style={styles.roleBadgeText}>{formatRoleLabel(user.role)}</ThemedText>
            </View>
          </View>

          <View style={styles.card}>
            <ProfileRow label="Name" value={displayName} />
            <View style={styles.divider} />
            <ProfileRow label="Email" value={user.email} />
            <View style={styles.divider} />
            <ProfileRow label="Employee ID" value={shortId} />
            <View style={styles.divider} />
            <ProfileRow label="Role" value={formatRoleLabel(user.role)} />
          </View>

          <Pressable style={[styles.signOutButton, { borderColor: tint }]} onPress={handleSignOut}>
            <MaterialIcons name="logout" size={20} color={tint} />
            <ThemedText style={[styles.signOutText, { color: tint }]}>Sign out</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  screenTitle: { fontSize: 28, lineHeight: 34 },
  subtitle: { marginTop: 4, fontSize: 14, color: '#64748b' },
  content: { paddingHorizontal: 16, gap: 20 },
  avatarBlock: { alignItems: 'center', paddingVertical: 8, gap: 10 },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarName: { fontSize: 20, textAlign: 'center' },
  roleBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '700', color: '#0a7ea4', textTransform: 'uppercase' },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    padding: 16,
  },
  profileRow: { gap: 4 },
  profileLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileValue: { fontSize: 16 },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 14 },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 8,
  },
  signOutText: { fontSize: 16, fontWeight: '700' },
});
