'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand-colors';
import { useAuth } from '@/lib/auth';
import { fetchHomeCategoryCards, type HomeCategoryCard } from '@/lib/home-categories-api';
import { computeCustomerOrderOverview } from '@/lib/home-order-stats';
import { fetchOrders, type OrderRecord } from '@/lib/orders-api';
import { fetchMyTasks, type TaskRecord } from '@/lib/tasks-api';
import type { FilterOption } from '@/lib/types/lens';

const GOLD = BrandColors.primary;
const BG = BrandColors.background;
const CARD = BrandColors.card;
const BORDER = BrandColors.cardBorder;
const STAFF_PENDING_STATUSES = ['PENDING', 'PICKING', 'PACKED', 'DISPATCHED', 'PARTIALLY_FULFILLED', 'AWAITING_PROCUREMENT'];

const DEFAULT_CATEGORIES: HomeCategoryCard[] = [
  { id: 'all-1', label: 'All lenses', filter: 'All' },
  { id: 'sv-1', label: 'Single Vision', filter: 'Single Vision' },
  { id: 'kr-1', label: 'Kryptok', filter: 'Kryptok' },
  { id: 'pr-1', label: 'Progressive', filter: 'Progressive' },
  { id: 'sv-2', label: 'Blue Cut', filter: 'Single Vision' },
  { id: 'sv-3', label: 'Photo Grey', filter: 'Single Vision' },
  { id: 'kr-2', label: 'Kryptok HMC', filter: 'Kryptok' },
  { id: 'pr-2', label: 'Premium Progressive', filter: 'Progressive' },
  { id: 'pr-3', label: 'Digital Progressive', filter: 'Progressive' },
  { id: 'sv-4', label: 'Regular SV', filter: 'Single Vision' },
];

function mergeUniqueCategories(...lists: HomeCategoryCard[][]): HomeCategoryCard[] {
  const merged: HomeCategoryCard[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const card of list) {
      const key = card.label.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(card);
    }
  }

  const allIndex = merged.findIndex((card) => card.label.trim().toLowerCase() === 'all lenses');
  if (allIndex > 0) {
    const allCard = merged.splice(allIndex, 1)[0];
    merged.unshift(allCard);
  } else if (allIndex < 0) {
    merged.unshift({ id: 'all-lenses-fallback', label: 'All lenses', filter: 'All' });
  }
  return merged;
}

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

function goToShop(router: ReturnType<typeof useRouter>, filter?: FilterOption) {
  if (filter && filter !== 'All') {
    router.push({ pathname: '/shop', params: { filter } });
  } else {
    router.push({ pathname: '/shop', params: { filter: 'All' } });
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, isStaff, getAuthHeaders } = useAuth();
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
  const [showPendingTasks, setShowPendingTasks] = useState(true);
  const [showPendingOrders, setShowPendingOrders] = useState(true);
  const [categories, setCategories] = useState<HomeCategoryCard[]>(DEFAULT_CATEGORIES);

  const loadOrders = useCallback(async () => {
    if (isStaff || !user) return;
    setOrdersLoading(true);
    try {
      const orders = await fetchOrders(getAuthHeaders());
      setOrderCounts(computeCustomerOrderOverview(orders));
    } catch {
      setOrderCounts({ total: 0, inProgress: 0, readyToShip: 0, completed: 0 });
    } finally {
      setOrdersLoading(false);
    }
  }, [getAuthHeaders, isStaff, user]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!isStaff || !user) return;
    let cancelled = false;
    const loadStaffOverview = async () => {
      setStaffLoading(true);
      try {
        const [orders, tasks] = await Promise.all([fetchOrders(getAuthHeaders()), fetchMyTasks(getAuthHeaders())]);
        const now = new Date();
        const todayOrders = orders.filter((order) => {
          const d = new Date(order.createdAt);
          return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
          );
        });
        const pendingToday = todayOrders.filter((order) => STAFF_PENDING_STATUSES.includes(order.status)).length;
        const pendingOrders = orders.filter((order) => STAFF_PENDING_STATUSES.includes(order.status));
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
        }
      } catch {
        if (!cancelled) {
          setStaffOverview({ tasksAssigned: '0', tasksCompleted: '0', ordersReceived: 0, ordersPending: 0 });
          setStaffPendingOrders([]);
          setStaffPendingTasks([]);
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

  useEffect(() => {
    if (isStaff || !user) return;
    let cancelled = false;
    const loadCategories = async () => {
      try {
        const cards = await fetchHomeCategoryCards();
        if (!cancelled) {
          const merged = mergeUniqueCategories(cards, DEFAULT_CATEGORIES);
          setCategories(merged.slice(0, 12));
        }
      } catch {
        if (!cancelled) {
          setCategories(mergeUniqueCategories(DEFAULT_CATEGORIES).slice(0, 12));
        }
      }
    };
    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, [isStaff, user]);

  const clientId = useMemo(() => (user ? user.id : ''), [user]);
  const comingSoon = () => {
    Alert.alert('Coming soon', 'This feature will be available in a future update.');
  };

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
              <View style={styles.staffAvatarCircle}>
                <Text style={styles.staffAvatarText}>{staffInitials}</Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Today's overview</Text>
              </View>
              {staffLoading ? (
                <View style={styles.overviewLoading}>
                  <ActivityIndicator color={GOLD} />
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
                <MaterialIcons name="task-alt" size={24} color={GOLD} />
                <Text style={styles.staffQuickLabel}>Tasks</Text>
              </Pressable>
              <Pressable style={styles.staffQuickCard} onPress={() => router.push('/orders')}>
                <MaterialIcons name="receipt-long" size={24} color={GOLD} />
                <Text style={styles.staffQuickLabel}>Orders</Text>
              </Pressable>
              <Pressable style={styles.staffQuickCard} onPress={comingSoon}>
                <MaterialIcons name="inventory-2" size={24} color={GOLD} />
                <Text style={styles.staffQuickLabel}>Inventory</Text>
              </Pressable>
              <Pressable style={styles.staffQuickCard} onPress={() => router.push('/purchase-stock')}>
                <MaterialIcons name="shopping-cart" size={24} color={GOLD} />
                <Text style={styles.staffQuickLabel}>Procurement</Text>
              </Pressable>
            </View>

            <Pressable style={styles.dropdownHeader} onPress={() => setShowPendingTasks((value) => !value)}>
              <Text style={styles.dropdownTitle}>Pending tasks</Text>
              <MaterialIcons name={showPendingTasks ? 'expand-less' : 'expand-more'} size={22} color={GOLD} />
            </Pressable>
            {showPendingTasks ? (
              <View style={styles.dropdownBody}>
                {staffPendingTasks.length > 0 ? (
                  <View style={styles.pendingTaskList}>
                    {staffPendingTasks.slice(0, 10).map((task) => (
                      <View key={task.id} style={styles.pendingTaskRow}>
                        <View style={styles.pendingTaskLeft}>
                          <MaterialIcons name="pending-actions" size={16} color={GOLD} />
                          <Text style={styles.pendingTaskText}>{task.title}</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={18} color={BrandColors.textMuted} />
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
              <MaterialIcons name={showPendingOrders ? 'expand-less' : 'expand-more'} size={22} color={GOLD} />
            </Pressable>
            {showPendingOrders ? (
              <View style={styles.dropdownBody}>
                {staffPendingOrders.length > 0 ? (
                  <View style={styles.pendingOrderList}>
                    {staffPendingOrders.slice(0, 8).map((order) => (
                      <Pressable key={order.id} style={styles.pendingOrderRow} onPress={() => router.push('/orders')}>
                        <View style={styles.pendingOrderLeft}>
                          <MaterialIcons name="receipt-long" size={16} color={GOLD} />
                          <View>
                            <Text style={styles.pendingOrderId}>#{order.id.slice(-8).toUpperCase()}</Text>
                            <Text style={styles.pendingOrderMeta}>
                              {order.user?.name?.trim() || order.user?.email || 'Customer'} • {order.status.replaceAll('_', ' ')}
                            </Text>
                          </View>
                        </View>
                        <MaterialIcons name="chevron-right" size={18} color={BrandColors.textMuted} />
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

  const displayName = getDisplayNameFull(user.name, user.email);
  const initials = getInitials(user.name, user.email);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollPad} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextCol}>
              <Text style={styles.helloSmall}>Hello,</Text>
              <Text style={styles.customerName}>{displayName}</Text>
              <Text style={styles.clientId}>Client ID: {clientId}</Text>
            </View>
            <View style={styles.headerIcons}>
              <Pressable style={styles.avatarCircle} onPress={() => router.push('/profile')} hitSlop={8}>
                <Text style={styles.avatarText}>{initials}</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/notifications')} hitSlop={12} style={styles.bellBtn}>
                <MaterialIcons name="notifications-none" size={24} color={GOLD} />
              </Pressable>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Order overview</Text>
              <Pressable onPress={() => router.push('/my-orders')} hitSlop={8}>
                <Text style={styles.viewAll}>View all</Text>
              </Pressable>
            </View>
            {ordersLoading ? (
              <View style={styles.overviewLoading}>
                <ActivityIndicator color={GOLD} />
              </View>
            ) : (
              <View style={styles.overviewRow}>
                <OverviewCell label="Total orders" value={String(orderCounts.total)} highlight={false} />
                <OverviewCell label="In progress" value={String(orderCounts.inProgress)} highlight />
                <OverviewCell label="Ready to ship" value={String(orderCounts.readyToShip)} highlight={false} />
                <OverviewCell label="Completed" value={String(orderCounts.completed)} highlight={false} />
              </View>
            )}
          </View>

          <Text style={styles.sectionTitleOutside}>Quick actions</Text>
          <View style={styles.quickRow}>
            <QuickIcon
              icon="shopping-cart"
              label="Place order"
              onPress={() => goToShop(router)}
            />
            <QuickIcon icon="receipt-long" label="My orders" onPress={() => router.push('/my-orders')} />
            <QuickIcon icon="description" label="Invoices" onPress={() => router.push('/invoices' as never)} />
            <QuickIcon icon="headset-mic" label="Support" onPress={comingSoon} />
          </View>

          <Pressable style={styles.wholesaleBtn} onPress={() => goToShop(router)}>
            <MaterialIcons name="storefront" size={22} color={BrandColors.primaryText} />
            <Text style={styles.wholesaleBtnText}>Place wholesale order</Text>
          </Pressable>

          <Text style={styles.sectionTitleOutside}>Product categories</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                style={styles.categoryCard}
                onPress={() => goToShop(router, cat.filter)}>
                <Text style={styles.categoryCardText} numberOfLines={3}>
                  {cat.label}
                </Text>
                <MaterialIcons name="chevron-right" size={18} color={GOLD} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function OverviewCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.overviewCell}>
      <Text style={[styles.overviewValue, highlight && styles.overviewValueHighlight]}>{value}</Text>
      <Text style={styles.overviewLabel}>{label}</Text>
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
  return (
    <Pressable style={styles.quickItem} onPress={onPress}>
      <View style={styles.quickIconWrap}>
        <MaterialIcons name={icon} size={26} color={GOLD} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safeTop: { flex: 1 },
  scrollPad: { paddingHorizontal: 18, paddingBottom: 32 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 22,
  },
  headerTextCol: { flex: 1, paddingRight: 12 },
  helloSmall: {
    color: BrandColors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  customerName: {
    color: BrandColors.text,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
  },
  clientId: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: GOLD, fontWeight: '800', fontSize: 14 },
  bellBtn: { padding: 4 },
  sectionCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: BrandColors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  sectionTitleOutside: {
    color: BrandColors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  viewAll: { color: GOLD, fontSize: 14, fontWeight: '600' },
  overviewLoading: { paddingVertical: 24, alignItems: 'center' },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  overviewCell: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  overviewValue: {
    color: BrandColors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  overviewValueHighlight: {
    color: GOLD,
  },
  overviewLabel: {
    color: BrandColors.textMuted,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 13,
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
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(240, 161, 50, 0.12)',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickLabel: {
    color: BrandColors.text,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  wholesaleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 24,
  },
  wholesaleBtnText: {
    color: BrandColors.primaryText,
    fontSize: 16,
    fontWeight: '800',
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
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    minHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'space-between',
  },
   categoryCardText: {
    color: BrandColors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  staffHeaderRow: {
    marginTop: 8,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  staffHeaderText: { flex: 1, paddingRight: 10 },
  staffWelcome: { color: BrandColors.textMuted, fontSize: 14 },
  staffName: { color: BrandColors.text, fontSize: 24, fontWeight: '800', marginTop: 4 },
  staffNameLarge: { color: BrandColors.text, fontSize: 32, fontWeight: '800', marginTop: 2 },
  staffAvatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffAvatarText: { color: GOLD, fontSize: 18, fontWeight: '800' },
  staffRole: { color: GOLD, fontSize: 14, marginTop: 6 },
  staffQuickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 8,
  },
  staffQuickCard: {
    width: '23%',
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  staffQuickLabel: { color: BrandColors.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  dropdownHeader: {
    marginTop: 14,
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownTitle: { color: BrandColors.text, fontSize: 16, fontWeight: '700' },
  dropdownBody: {
    marginTop: 8,
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  pendingTaskList: { gap: 8 },
  pendingTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: BG,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  pendingTaskLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 },
  pendingTaskText: { color: BrandColors.text, fontSize: 13, fontWeight: '600' },
  pendingOrderList: { gap: 8 },
  pendingOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: BG,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  pendingOrderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 },
  pendingOrderId: { color: BrandColors.text, fontSize: 13, fontWeight: '700' },
  pendingOrderMeta: { color: BrandColors.textMuted, fontSize: 11, marginTop: 2 },
  emptyDropdownText: { color: BrandColors.textMuted, fontSize: 13 },
});
