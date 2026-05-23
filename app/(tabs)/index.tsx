'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { fetchLensesPage } from '@/lib/lenses-api';

const BRAND_TEAL = '#0a7ea4';
const BRAND_TEAL_DARK = '#065f7a';

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDisplayName(name: string | null | undefined, email: string): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed.split(' ')[0];
  const local = email.split('@')[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

type QuickAction = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  route: string;
  accent: string;
  accentBg: string;
};

function QuickActionCard({
  action,
  onPress,
  isDark,
}: {
  action: QuickAction;
  onPress: () => void;
  isDark: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionCard,
        isDark && styles.actionCardDark,
        pressed && styles.actionCardPressed,
      ]}
      onPress={onPress}>
      <View style={[styles.actionIconWrap, { backgroundColor: action.accentBg }]}>
        <MaterialIcons name={action.icon} size={26} color={action.accent} />
      </View>
      <View style={styles.actionTextBlock}>
        <ThemedText type="defaultSemiBold" style={styles.actionTitle}>
          {action.title}
        </ThemedText>
        <ThemedText style={styles.actionSubtitle}>{action.subtitle}</ThemedText>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={isDark ? '#64748b' : '#94a3b8'} />
    </Pressable>
  );
}

function StatPill({
  label,
  value,
  icon,
  style,
}: {
  label: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.statPill, style]}>
      <MaterialIcons name={icon} size={18} color="rgba(255,255,255,0.9)" />
      <View>
        <ThemedText style={styles.statValue}>{value}</ThemedText>
        <ThemedText style={styles.statLabel}>{label}</ThemedText>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const tint = Colors[colorScheme].tint;
  const { user, isStaff } = useAuth();
  const { itemCount } = useCart();
  const [productCount, setProductCount] = useState<number | null>(null);

  const displayName = user ? getDisplayName(user.name, user.email) : 'there';
  const greeting = getTimeGreeting();

  const loadProductCount = useCallback(async () => {
    try {
      const data = await fetchLensesPage({ page: 1, limit: 1, type: 'All', search: '' });
      setProductCount(data.total);
    } catch {
      setProductCount(null);
    }
  }, []);

  useEffect(() => {
    if (!isStaff) {
      loadProductCount();
    }
  }, [isStaff, loadProductCount]);

  const customerActions: QuickAction[] = [
    {
      id: 'shop',
      title: 'Shop lenses',
      subtitle: 'Browse Kryptok, Progressive & Single Vision',
      icon: 'shopping-bag',
      route: '/shop',
      accent: BRAND_TEAL,
      accentBg: '#e0f2fe',
    },
    {
      id: 'orders',
      title: 'My orders',
      subtitle: 'Track status from pending to delivery',
      icon: 'assignment',
      route: '/my-orders',
      accent: '#7c3aed',
      accentBg: '#ede9fe',
    },
    {
      id: 'products',
      title: 'All products',
      subtitle: 'Explore the full lens catalog',
      icon: 'visibility',
      route: '/shop',
      accent: '#059669',
      accentBg: '#d1fae5',
    },
  ];

  const staffActions: QuickAction[] = [
    {
      id: 'orders',
      title: 'Customer orders',
      subtitle: 'View and update order fulfillment',
      icon: 'assignment',
      route: '/orders',
      accent: BRAND_TEAL,
      accentBg: '#e0f2fe',
    },
    {
      id: 'purchase',
      title: 'Purchase stock',
      subtitle: 'Procurement and inventory intake',
      icon: 'shopping-cart',
      route: '/purchase-stock',
      accent: '#d97706',
      accentBg: '#fef3c7',
    },
    {
      id: 'profile',
      title: 'My profile',
      subtitle: 'Account details and sign out',
      icon: 'person',
      route: '/profile',
      accent: '#7c3aed',
      accentBg: '#ede9fe',
    },
  ];

  const quickActions = isStaff ? staffActions : customerActions;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroGlow} />
            <View style={styles.heroInner}>
              <View style={styles.brandRow}>
                <View style={styles.brandMark}>
                  <MaterialIcons name="remove-red-eye" size={22} color="#fff" />
                </View>
                <ThemedText style={styles.brandName}>DrishX</ThemedText>
              </View>

              <ThemedText style={styles.greetingLine}>{greeting},</ThemedText>
              <ThemedText style={styles.nameLine}>{displayName}</ThemedText>
              <ThemedText style={styles.heroSubtitle}>
                {isStaff
                  ? 'Manage lens orders and inventory from one place.'
                  : 'Your trusted optical lens store — order prescription lenses in minutes.'}
              </ThemedText>

              {!isStaff && (
                <View style={styles.statsRow}>
                  <StatPill
                    label="Products"
                    value={productCount === null ? '—' : String(productCount)}
                    icon="inventory-2"
                  />
                  <StatPill
                    label="In cart"
                    value={String(itemCount)}
                    icon="shopping-cart"
                    style={styles.statPillSpaced}
                  />
                </View>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              {isStaff ? 'Quick actions' : 'What would you like to do?'}
            </ThemedText>
            <ThemedText style={styles.sectionHint}>
              {isStaff ? 'Jump to your daily workflows' : 'Tap an option below to get started'}
            </ThemedText>

            <View style={styles.actionList}>
              {quickActions.map((action) => (
                <QuickActionCard
                  key={action.id}
                  action={action}
                  isDark={isDark}
                  onPress={() => router.push(action.route as '/shop')}
                />
              ))}
            </View>
          </View>

          {!isStaff && (
            <Pressable
              style={[styles.promoBanner, isDark && styles.promoBannerDark]}
              onPress={() => router.push('/shop')}>
              <View style={styles.promoContent}>
                <ThemedText type="defaultSemiBold" style={styles.promoTitle}>
                  New to DrishX?
                </ThemedText>
                <ThemedText style={styles.promoText}>
                  Search by SPH, CYL, brand, or coating — add to cart and place your order securely.
                </ThemedText>
              </View>
              <View style={[styles.promoCta, { backgroundColor: tint }]}>
                <ThemedText style={styles.promoCtaText}>Shop now</ThemedText>
                <MaterialIcons name="arrow-forward" size={18} color="#fff" />
              </View>
            </Pressable>
          )}

          {!isStaff && productCount === null && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={tint} />
              <ThemedText style={styles.loadingText}>Loading catalog…</ThemedText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingBottom: 32,
  },
  hero: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: BRAND_TEAL,
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroInner: {
    padding: 24,
    paddingBottom: 22,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  greetingLine: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  nameLine: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginTop: 4,
    lineHeight: 38,
  },
  heroSubtitle: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.88)',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  statPillSpaced: {},
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionHint: {
    marginTop: 4,
    fontSize: 14,
    color: '#64748b',
  },
  actionList: {
    marginTop: 16,
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 14,
  },
  actionCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  actionCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  actionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextBlock: {
    flex: 1,
    gap: 3,
  },
  actionTitle: {
    fontSize: 16,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  promoBanner: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    gap: 14,
  },
  promoBannerDark: {
    backgroundColor: '#0c4a6e22',
    borderColor: '#0a7ea444',
  },
  promoContent: {
    gap: 6,
  },
  promoTitle: {
    fontSize: 16,
    color: BRAND_TEAL_DARK,
  },
  promoText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
  },
  promoCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  promoCtaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
  },
});
