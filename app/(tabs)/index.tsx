'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CatalogSearchBar } from '@/components/catalog-search-bar';
import { HomeHero } from '@/components/home-hero';
import { WholesalePromoBanner } from '@/components/wholesale-promo-banner';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import { useAuth } from '@/lib/auth';
import {
  catalogImageForHomeCategory,
  fetchCatalogImages,
  type CatalogImagesResponse,
} from '@/lib/catalog-images-api';
import { CLIENT_HOME_CATEGORIES } from '@/lib/home-categories-api';
import {
  getCompanyDisplayName,
} from '@/lib/home-greeting';
import {
  getLastOrderSummary,
  type LastOrderSummary,
} from '@/lib/last-order-summary';
import {
  computeCustomerOrderOverview,
  computeCustomerOverviewTrends,
  EMPTY_OVERVIEW_TRENDS,
  type OverviewTrend,
} from '@/lib/home-order-stats';
import { computeMostOrderedProducts, type MostOrderedProduct } from '@/lib/most-ordered-products';
import { fetchNotifications } from '@/lib/notifications-api';
import { useOrderMode } from '@/lib/order-mode';
import { fetchOrders, type OrderRecord } from '@/lib/orders-api';
import { normalizeOrderStatus } from '@/lib/order-tracking';
import { fetchMyTasks, type TaskRecord } from '@/lib/tasks-api';
import type { FilterOption } from '@/lib/types/lens';
import { filterToCatalogCategory } from '@/lib/wholesale-navigation';

const STAFF_PENDING_STATUSES = ['PENDING', 'PICKING', 'PACKED', 'DISPATCHED', 'PARTIALLY_FULFILLED', 'AWAITING_PROCUREMENT'];

function getDisplayNameFull(name: string | null | undefined, email: string): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  const local = email.split('@')[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function getInitials(name: string | null | undefined, email: string): string {
  const full = getDisplayNameFull(name, email);
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return full.slice(0, 2).toUpperCase();
}

function goToShop(router: ReturnType<typeof useRouter>, filter: FilterOption = 'All') {
  const category = filterToCatalogCategory(filter);
  if (category) {
    router.navigate({
      pathname: '/shop/items',
      params: { category },
    });
    return;
  }
  router.navigate('/(tabs)/shop');
}

function goToCategory(
  router: ReturnType<typeof useRouter>,
  categoryId: string,
  filter: FilterOption = 'All',
) {
  if (categoryId === 'color') {
    router.push('/color' as never);
    return;
  }
  if (categoryId === 'rx') {
    router.push('/rx' as never);
    return;
  }
  if (categoryId === 'white') {
    router.push('/white' as never);
    return;
  }
  goToShop(router, filter);
}

export default function HomeScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { user, isStaff, getAuthHeaders } = useAuth();
  const { setMode } = useOrderMode();
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderCounts, setOrderCounts] = useState({ total: 0, inProgress: 0, readyToShip: 0, completed: 0 });
  const [staffOverview, setStaffOverview] = useState({
    tasksAssigned: '—',
    tasksCompleted: '—',
    ordersReceived: 0,
    ordersPending: 0,
  });
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffPendingOrders, setStaffPendingOrders] = useState<OrderRecord[]>([]);
  const [staffPendingTasks, setStaffPendingTasks] = useState<TaskRecord[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [overviewTrends, setOverviewTrends] = useState(EMPTY_OVERVIEW_TRENDS);
  const [showPendingTasks, setShowPendingTasks] = useState(true);
  const [showPendingOrders, setShowPendingOrders] = useState(true);
  const [mostOrderedProducts, setMostOrderedProducts] = useState<MostOrderedProduct[]>([]);
  const [catalogImages, setCatalogImages] = useState<CatalogImagesResponse | null>(null);
  const [lastOrderSummary, setLastOrderSummary] = useState<LastOrderSummary | null>(null);

  const loadOrders = useCallback(async () => {
    if (isStaff || !user) return;
    setOrdersLoading(true);
    try {
      const [orders, images] = await Promise.all([
        fetchOrders(getAuthHeaders()),
        fetchCatalogImages().catch(() => null),
      ]);
      setOrderCounts(computeCustomerOrderOverview(orders));
      setOverviewTrends(computeCustomerOverviewTrends(orders));
      setMostOrderedProducts(computeMostOrderedProducts(orders, 5));
      setCatalogImages(images);
      setLastOrderSummary(getLastOrderSummary(orders));
    } catch {
      setOrderCounts({ total: 0, inProgress: 0, readyToShip: 0, completed: 0 });
      setOverviewTrends(EMPTY_OVERVIEW_TRENDS);
      setMostOrderedProducts([]);
      setLastOrderSummary(null);
    } finally {
      setOrdersLoading(false);
    }
  }, [getAuthHeaders, isStaff, user]);

  const refreshUnreadNotificationsCount = useCallback(async () => {
    if (!user) return;
    try {
      const notifications = await fetchNotifications(getAuthHeaders());
      setUnreadNotificationsCount(notifications.filter((item) => !item.isRead).length);
    } catch {
      setUnreadNotificationsCount(0);
    }
  }, [getAuthHeaders, user]);

  useFocusEffect(
    useCallback(() => {
      void refreshUnreadNotificationsCount();
      if (!isStaff && user) {
        void loadOrders();
      }
    }, [refreshUnreadNotificationsCount, loadOrders, isStaff, user])
  );

  useEffect(() => {
    if (!isStaff || !user) return;
    let cancelled = false;
    const loadStaffOverview = async () => {
      setStaffLoading(true);
      try {
        const [orders, tasks, notifications] = await Promise.all([
          fetchOrders(getAuthHeaders()),
          fetchMyTasks(getAuthHeaders()),
          fetchNotifications(getAuthHeaders()),
        ]);
        const now = new Date();
        const todayOrders = orders.filter((order) => {
          const d = new Date(order.createdAt);
          return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
          );
        });
        const pendingToday = todayOrders.filter(
          (order) =>
            STAFF_PENDING_STATUSES.includes(order.status) &&
            normalizeOrderStatus(order.status) !== 'AWAITING_PROCUREMENT'
        ).length;
        const pendingOrders = orders.filter(
          (order) =>
            STAFF_PENDING_STATUSES.includes(order.status) &&
            normalizeOrderStatus(order.status) !== 'AWAITING_PROCUREMENT'
        );
        const todayTasks = tasks.filter((task) => {
          const d = new Date(task.dueDate);
          return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
          );
        });
        const pendingTasks = tasks.filter((task) => task.status === 'PENDING');
        const completedTasksToday = todayTasks.filter((task) => task.status === 'COMPLETED').length;

        if (!cancelled) {
          setStaffOverview({
            tasksAssigned: String(todayTasks.length),
            tasksCompleted: String(completedTasksToday),
            ordersReceived: todayOrders.length,
            ordersPending: pendingToday,
          });
          setStaffPendingOrders(pendingOrders);
          setStaffPendingTasks(pendingTasks);
          setUnreadNotificationsCount(notifications.filter((item) => !item.isRead).length);
        }
      } catch {
        if (!cancelled) {
          setStaffOverview({ tasksAssigned: '0', tasksCompleted: '0', ordersReceived: 0, ordersPending: 0 });
          setStaffPendingOrders([]);
          setStaffPendingTasks([]);
          setUnreadNotificationsCount(0);
        }
      } finally {
        if (!cancelled) {
          setStaffLoading(false);
        }
      }
    };
    void loadStaffOverview();
    return () => {
      cancelled = true;
    };
  }, [getAuthHeaders, isStaff, user]);

  if (isStaff) {
    const staffDisplayName = user ? getDisplayNameFull(user.name, user.email) : 'Team';
    const staffInitials = user ? getInitials(user.name, user.email) : 'ST';
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safeTop} edges={['top']}>
          <ScrollView contentContainerStyle={styles.scrollPad} showsVerticalScrollIndicator={false}>
            <View style={styles.staffHeaderRow}>
              <View style={styles.staffHeaderText}>
                <Text style={styles.staffWelcome}>Welcome back,</Text>
                <Text style={styles.staffNameLarge}>{staffDisplayName}</Text>
                <Text style={styles.staffRole}>Operations Manager</Text>
              </View>
              <View style={styles.staffHeaderIcons}>
                <Pressable style={styles.staffAvatarCircle} onPress={() => router.push('/profile')}>
                  <Text style={styles.staffAvatarText}>{staffInitials}</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/notifications')} hitSlop={12} style={styles.bellBtn}>
                  <MaterialIcons name="notifications-none" size={24} color={colors.primary} />
                  {unreadNotificationsCount > 0 ? (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Today&apos;s overview</Text>
              </View>
              {staffLoading ? (
                <View style={styles.overviewLoading}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : (
                <View style={styles.overviewRow}>
                  <OverviewCell label="Task assigned" value={staffOverview.tasksAssigned} />
                  <OverviewCell label="Task completed" value={staffOverview.tasksCompleted} />
                  <OverviewCell label="Orders received" value={String(staffOverview.ordersReceived)} />
                  <OverviewCell label="Orders pending" value={String(staffOverview.ordersPending)} highlight />
                </View>
              )}
            </View>

            <Text style={styles.sectionTitleOutside}>Quick access</Text>
            <View style={styles.staffQuickGrid}>
              <Pressable style={styles.staffQuickCard} onPress={() => router.push('/my-tasks' as never)}>
                <MaterialIcons name="task-alt" size={24} color={colors.primary} />
                <Text style={styles.staffQuickLabel}>Tasks</Text>
              </Pressable>
              <Pressable style={styles.staffQuickCard} onPress={() => router.push('/orders')}>
                <MaterialIcons name="receipt-long" size={24} color={colors.primary} />
                <Text style={styles.staffQuickLabel}>Orders</Text>
              </Pressable>
              <Pressable style={styles.staffQuickCard} onPress={() => router.push('/inventory' as never)}>
                <MaterialIcons name="inventory-2" size={24} color={colors.primary} />
                <Text style={styles.staffQuickLabel}>Inventory</Text>
              </Pressable>
              <Pressable style={styles.staffQuickCard} onPress={() => router.push('/purchase-stock')}>
                <MaterialIcons name="shopping-cart" size={24} color={colors.primary} />
                <Text style={styles.staffQuickLabel}>Procurement</Text>
              </Pressable>
            </View>

            <Pressable style={styles.dropdownHeader} onPress={() => setShowPendingTasks((value) => !value)}>
              <Text style={styles.dropdownTitle}>Pending tasks</Text>
              <MaterialIcons name={showPendingTasks ? 'expand-less' : 'expand-more'} size={22} color={colors.primary} />
            </Pressable>
            {showPendingTasks ? (
              <View style={styles.dropdownBody}>
                {staffPendingTasks.length > 0 ? (
                  <View style={styles.pendingTaskList}>
                    {staffPendingTasks.slice(0, 10).map((task) => (
                      <View key={task.id} style={styles.pendingTaskRow}>
                        <View style={styles.pendingTaskLeft}>
                          <MaterialIcons name="pending-actions" size={16} color={colors.primary} />
                          <Text style={styles.pendingTaskText}>{task.title}</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyDropdownText}>No pending tasks.</Text>
                )}
              </View>
            ) : null}

            <Pressable style={styles.dropdownHeader} onPress={() => setShowPendingOrders((value) => !value)}>
              <Text style={styles.dropdownTitle}>Pending orders</Text>
              <MaterialIcons name={showPendingOrders ? 'expand-less' : 'expand-more'} size={22} color={colors.primary} />
            </Pressable>
            {showPendingOrders ? (
              <View style={styles.dropdownBody}>
                {staffPendingOrders.length > 0 ? (
                  <View style={styles.pendingOrderList}>
                    {staffPendingOrders.slice(0, 8).map((order) => (
                      <Pressable key={order.id} style={styles.pendingOrderRow} onPress={() => router.push('/orders')}>
                        <View style={styles.pendingOrderLeft}>
                          <MaterialIcons name="receipt-long" size={16} color={colors.primary} />
                          <View>
                            <Text style={styles.pendingOrderId}>#{order.id.slice(-8).toUpperCase()}</Text>
                            <Text style={styles.pendingOrderMeta}>
                              {order.user?.name?.trim() || order.user?.email || 'Customer'} • {order.status.replaceAll('_', ' ')}
                            </Text>
                          </View>
                        </View>
                        <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyDropdownText}>No pending orders.</Text>
                )}
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safeTop} edges={['top']}>
          <Text style={styles.staffName}>Sign in to continue</Text>
        </SafeAreaView>
      </View>
    );
  }

  const companyName = getCompanyDisplayName(user.businessName, user.name, user.email);
  const initials = getInitials(user.name, user.email);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollPad} showsVerticalScrollIndicator={false}>
          <View style={styles.heroBlock}>
            <View style={styles.heroAmbient} pointerEvents="none" />

            <View style={styles.topBrandRow}>
              <View style={styles.topBrandLeft}>
                <MaterialIcons name="menu" size={24} color={colors.text} />
                <View style={styles.topBrandTextCol}>
                  <Text style={styles.topBrandTitle}>DrishX</Text>
                  <Text style={styles.topBrandTagline} numberOfLines={1}>
                    One system. Endless possibilities
                  </Text>
                </View>
              </View>
              <View style={styles.headerIcons}>
                <Pressable onPress={() => router.push('/notifications')} hitSlop={12} style={styles.bellBtn}>
                  <MaterialIcons name="notifications-none" size={24} color={colors.primary} />
                  {unreadNotificationsCount > 0 ? (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
                <Pressable style={styles.avatarCircle} onPress={() => router.push('/profile')} hitSlop={8}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </Pressable>
              </View>
            </View>

            <HomeHero
              companyName={companyName}
              lastOrder={lastOrderSummary}
              onContinueLastOrder={() => router.push('/my-orders')}
            />
          </View>

          <View style={styles.homeSearchWrap}>
            <CatalogSearchBar />
          </View>

          <View style={styles.overviewSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>At a glance</Text>
              <Pressable onPress={() => router.push('/my-orders')} hitSlop={8}>
                <Text style={styles.viewAll}>View all</Text>
              </Pressable>
            </View>
            {ordersLoading ? (
              <View style={styles.overviewLoading}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View style={styles.overviewRow}>
                <OverviewCell
                  label="Total Orders"
                  value={String(orderCounts.total)}
                  icon="inventory-2"
                  accentColor="#5B9BF0"
                  trend={overviewTrends.total}
                />
                <OverviewCell
                  label="In Progress"
                  value={String(orderCounts.inProgress)}
                  icon="trending-up"
                  accentColor="#D782E0"
                  trend={overviewTrends.inProgress}
                />
                <OverviewCell
                  label="Ready to Ship"
                  value={String(orderCounts.readyToShip)}
                  icon="local-shipping"
                  accentColor={colors.primary}
                  trend={overviewTrends.readyToShip}
                />
                <OverviewCell
                  label="Completed"
                  value={String(orderCounts.completed)}
                  icon="task-alt"
                  accentColor="#4CC38A"
                  trend={overviewTrends.completed}
                />
              </View>
            )}
          </View>

          <WholesalePromoBanner
            onPress={() => {
              setMode('wholesale');
              router.push('/wholesale');
            }}
          />

          <Text style={styles.sectionTitleOutside}>Quick actions</Text>
          <View style={styles.quickRow}>
            <QuickIcon
              icon="shopping-cart"
              label="Place order"
              onPress={() => {
                setMode('retail');
                goToShop(router);
              }}
            />
            <QuickIcon icon="receipt-long" label="My orders" onPress={() => router.push('/my-orders')} />
            <QuickIcon icon="description" label="Invoices" onPress={() => router.push('/invoices' as never)} />
            <QuickIcon
              icon="assignment-return"
              label="Returns"
              onPress={() => router.push('/returns' as never)}
            />
          </View>

          <Text style={styles.sectionTitleOutside}>Shop by category</Text>
          <View style={styles.categoryGrid}>
            {CLIENT_HOME_CATEGORIES.map((cat) => {
              const imageUrl = catalogImageForHomeCategory(catalogImages, cat.id);
              const label = cat.id === 'singlevision' ? 'Single Vision' : cat.label;
              return (
                <Pressable
                  key={cat.id}
                  style={[styles.categoryCard, { borderColor: colors.cardBorder }]}
                  onPress={() => goToCategory(router, cat.id, cat.filter)}>
                  <View style={[styles.categoryMedia, { backgroundColor: colors.background }]}>
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.categoryImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.categoryImagePlaceholder} />
                    )}
                  </View>
                  <View style={styles.categoryScrim} pointerEvents="none">
                    <View style={styles.categoryScrimFade} />
                    <View style={styles.categoryLabelRow}>
                      <Text style={styles.categoryCardText} numberOfLines={1}>
                        {label}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.sectionTitleOutside, styles.mostOrderedSectionTitle]}>
            Most ordered products
          </Text>
          {ordersLoading ? (
            <View style={styles.mostOrderedLoading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : mostOrderedProducts.length === 0 ? (
            <View style={styles.mostOrderedEmpty}>
              <Text style={styles.mostOrderedEmptyText}>
                Your top products will appear here after you place orders.
              </Text>
            </View>
          ) : (
            <View style={styles.mostOrderedList}>
              {mostOrderedProducts.map((product, index) => (
                <Pressable
                  key={product.lensId}
                  style={styles.mostOrderedRow}
                  onPress={() => goToShop(router, product.shopFilter)}>
                  <View style={styles.mostOrderedRank}>
                    <Text style={styles.mostOrderedRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.mostOrderedMeta}>
                    <Text style={styles.mostOrderedTitle} numberOfLines={1}>
                      {product.title}
                    </Text>
                    <Text style={styles.mostOrderedSubtitle} numberOfLines={2}>
                      {product.subtitle}
                    </Text>
                    <Text style={styles.mostOrderedStats}>
                      {product.totalQuantity} unit{product.totalQuantity === 1 ? '' : 's'} ·{' '}
                      {product.orderCount} order{product.orderCount === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={colors.primary} />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const normalized = clean.length === 3 ? clean.split('').map((ch) => ch + ch).join('') : clean;
  const value = parseInt(normalized, 16);
  if (Number.isNaN(value)) return hex;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function OverviewCell({
  label,
  value,
  highlight,
  icon,
  accentColor,
  trend,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  icon?: keyof typeof MaterialIcons.glyphMap;
  accentColor?: string;
  trend?: OverviewTrend;
}) {
  const styles = useThemedStyles(createStyles);
  const colors = useBrandColors();
  const tint = accentColor ?? colors.primary;
  return (
    <View style={styles.overviewCell}>
      {icon ? (
        <View style={styles.overviewCellTopRow}>
          <View style={[styles.overviewIconWrap, { backgroundColor: withAlpha(tint, 0.16) }]}>
            <MaterialIcons name={icon} size={15} color={tint} />
          </View>
          <MaterialIcons name="more-vert" size={16} color={colors.textMuted} />
        </View>
      ) : null}
      <Text style={[styles.overviewValue, highlight && styles.overviewValueHighlight]}>{value}</Text>
      <Text style={styles.overviewLabel}>{label}</Text>
      {trend ? (
        <View style={styles.overviewTrendRow}>
          <MaterialIcons
            name={trend.direction === 'down' ? 'arrow-downward' : 'arrow-upward'}
            size={10}
            color={tint}
          />
          <Text style={[styles.overviewTrendText, { color: tint }]}>{trend.percent}%</Text>
          <Text style={styles.overviewTrendMuted} numberOfLines={1}>
            {' '}
            vs yesterday
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function QuickIcon({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const colors = useBrandColors();
  return (
    <Pressable style={styles.quickItem} onPress={onPress}>
      <View style={styles.quickIconWrap}>
        <MaterialIcons name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  safeTop: { flex: 1 },
  scrollPad: { paddingHorizontal: 18, paddingBottom: 32 },
  homeSearchWrap: { marginTop: 18, marginBottom: 16 },
  heroBlock: {
    position: 'relative',
    marginTop: 4,
    gap: 14,
  },
  heroAmbient: {
    position: 'absolute',
    top: -20,
    left: -8,
    right: -8,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(240, 161, 50, 0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 22,
  },
  headerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 1,
  },
  topBrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    zIndex: 1,
  },
  topBrandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  topBrandTextCol: { minWidth: 0 },
  topBrandTitle: {
    color: c.primary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  topBrandTagline: {
    color: c.textMuted,
    fontSize: 9,
    marginTop: 1,
  },
  headerTextCol: { flex: 1, paddingRight: 12 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: c.primary, fontWeight: '800', fontSize: 13 },
  bellBtn: { padding: 4 },
  sectionCard: {
    backgroundColor: c.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.cardBorder,
    padding: 16,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: c.text,
    fontSize: 17,
    fontWeight: '700',
  },
  sectionTitleOutside: {
    color: c.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  viewAll: { color: c.primary, fontSize: 14, fontWeight: '600' },
  overviewSection: { marginBottom: 22 },
  overviewLoading: { paddingVertical: 24, alignItems: 'center' },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  overviewCell: {
    flex: 1,
    minWidth: 0,
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  overviewCellTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  overviewIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewValue: {
    color: c.text,
    fontSize: 19,
    fontWeight: '800',
  },
  overviewValueHighlight: {
    color: c.primary,
  },
  overviewLabel: {
    color: c.textMuted,
    fontSize: 10,
    marginTop: 3,
    lineHeight: 13,
  },
  overviewTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },
  overviewTrendText: {
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 2,
  },
  overviewTrendMuted: {
    color: c.textMuted,
    fontSize: 9,
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  quickItem: {
    alignItems: 'center',
    width: '22%',
  },
  quickIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(240, 161, 50, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickLabel: {
    color: c.text,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    columnGap: 12,
  },
  categoryCard: {
    width: '48%',
    height: 148,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: c.card,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  categoryMedia: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryImagePlaceholder: {
    width: '70%',
    height: '70%',
    borderRadius: 16,
    backgroundColor: 'rgba(240, 161, 50, 0.1)',
  },
  categoryScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
    justifyContent: 'flex-end',
  },
  categoryScrimFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 10, 14, 0.55)',
  },
  categoryLabelRow: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 8,
  },
  categoryCardText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  mostOrderedSectionTitle: {
    marginTop: 8,
  },
  mostOrderedLoading: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  mostOrderedEmpty: {
    backgroundColor: c.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  mostOrderedEmptyText: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  mostOrderedList: {
    gap: 10,
  },
  mostOrderedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  mostOrderedRank: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(240, 161, 50, 0.14)',
    borderWidth: 1,
    borderColor: c.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mostOrderedRankText: {
    color: c.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  mostOrderedMeta: {
    flex: 1,
    minWidth: 0,
  },
  mostOrderedTitle: {
    color: c.text,
    fontSize: 15,
    fontWeight: '700',
  },
  mostOrderedSubtitle: {
    color: c.textMuted,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  mostOrderedStats: {
    color: c.primary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  staffHeaderRow: {
    marginTop: 8,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  staffHeaderText: { flex: 1, paddingRight: 10 },
  staffHeaderIcons: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  staffWelcome: { color: c.textMuted, fontSize: 14 },
  staffName: { color: c.text, fontSize: 24, fontWeight: '800', marginTop: 4 },
  staffNameLarge: { color: c.text, fontSize: 32, fontWeight: '800', marginTop: 2 },
  staffAvatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffAvatarText: { color: c.primary, fontSize: 18, fontWeight: '800' },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: c.primaryText,
    fontSize: 10,
    fontWeight: '800',
  },
  staffRole: { color: c.primary, fontSize: 14, marginTop: 6 },
  staffQuickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 8,
  },
  staffQuickCard: {
    width: '23%',
    backgroundColor: c.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.cardBorder,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  staffQuickLabel: { color: c.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  dropdownHeader: {
    marginTop: 14,
    backgroundColor: c.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownTitle: { color: c.text, fontSize: 16, fontWeight: '700' },
  dropdownBody: {
    marginTop: 8,
    backgroundColor: c.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.cardBorder,
    padding: 12,
  },
  pendingTaskList: { gap: 8 },
  pendingTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.background,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  pendingTaskLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 },
  pendingTaskText: { color: c.text, fontSize: 13, fontWeight: '600' },
  pendingOrderList: { gap: 8 },
  pendingOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.background,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  pendingOrderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 },
  pendingOrderId: { color: c.text, fontSize: 13, fontWeight: '700' },
  pendingOrderMeta: { color: c.textMuted, fontSize: 11, marginTop: 2 },
  emptyDropdownText: { color: c.textMuted, fontSize: 13 },
});
