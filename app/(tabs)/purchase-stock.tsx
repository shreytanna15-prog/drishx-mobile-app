'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import {
  formatMoneyInput,
  parseNumericInput,
  roundMoney,
  sanitizePositiveDecimalInput,
  sanitizePositiveIntegerInput,
} from '@/lib/cart-utils';
import { fetchLensesPage, mapApiLens } from '@/lib/lenses-api';
import {
  fetchManualExpenses,
  fetchProcurementHistory,
  recordManualExpense,
  recordStockIntakeBatch,
  type ProcurementRecord,
} from '@/lib/procurement-api';
import type { FilterOption, LensItem } from '@/lib/types/lens';
import { toApiLensType } from '@/lib/types/lens';

type ScreenMode = 'stock' | 'history' | 'manual';

type StockIntakeLine = {
  lineId: string;
  lens: LensItem;
  quantityAdded: number;
  amount: number;
  costPrice: number;
  sellingPrice: number;
};

function pricesMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01;
}

const FILTER_OPTIONS: FilterOption[] = ['All', 'Kryptok', 'Progressive', 'Single Vision'];

function createLineId() {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatLensSummary(item: LensItem): string {
  const parts = [
    item.lensType,
    item.brand,
    item.coating,
    `SPH ${item.sph}`,
    item.cyl !== null ? `CYL ${item.cyl}` : null,
    item.eye ? item.eye : null,
  ].filter(Boolean);
  return parts.join(' · ');
}

function PendingLineCard({
  line,
  onRemove,
  isDark,
}: {
  line: StockIntakeLine;
  onRemove: () => void;
  isDark: boolean;
}) {
  return (
    <View style={[styles.pendingCard, isDark && styles.pendingCardDark]}>
      <View style={styles.pendingCardBody}>
        <ThemedText type="defaultSemiBold" numberOfLines={2}>
          {formatLensSummary(line.lens)}
        </ThemedText>
        <ThemedText style={styles.selectMeta}>
          +{line.quantityAdded} units · ₹{line.amount} paid · cost ₹{line.costPrice}/unit · sell ₹
          {line.sellingPrice}
        </ThemedText>
      </View>
      <Pressable onPress={onRemove} hitSlop={8}>
        <MaterialIcons name="delete-outline" size={22} color="#ef4444" />
      </Pressable>
    </View>
  );
}

function HistoryCard({ item }: { item: ProcurementRecord }) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const amount = Number(item.amount);
  const by = item.user?.name?.trim() || item.user?.email || 'Staff';

  return (
    <View style={[styles.historyCard, isDark && styles.historyCardDark]}>
      <View style={styles.historyHeader}>
        <ThemedText type="defaultSemiBold">₹{amount}</ThemedText>
        <ThemedText style={styles.historyRef}>{item.reference}</ThemedText>
      </View>
      <ThemedText style={styles.historyDesc} numberOfLines={3}>
        {item.description || 'Procurement'}
      </ThemedText>
      <ThemedText style={styles.historyMeta}>
        {by} ·{' '}
        {new Date(item.createdAt).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </ThemedText>
    </View>
  );
}

export default function PurchaseStockScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;
  const isDark = colorScheme === 'dark';
  const { getAuthHeaders, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [mode, setMode] = useState<ScreenMode>('stock');
  const [history, setHistory] = useState<ProcurementRecord[]>([]);
  const [manualHistory, setManualHistory] = useState<ProcurementRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [lensSearch, setLensSearch] = useState('');
  const [lensFilter, setLensFilter] = useState<FilterOption>('All');
  const [lenses, setLenses] = useState<LensItem[]>([]);
  const [loadingLenses, setLoadingLenses] = useState(false);
  const [selectedLens, setSelectedLens] = useState<LensItem | null>(null);
  const [pendingLines, setPendingLines] = useState<StockIntakeLine[]>([]);

  const [quantity, setQuantity] = useState('1');
  const [costPrice, setCostPrice] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [manualAmount, setManualAmount] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const data = await fetchProcurementHistory(getAuthHeaders());
      setHistory(data);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load history.');
    }
  }, [getAuthHeaders]);

  const loadManualHistory = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await fetchManualExpenses(getAuthHeaders());
      setManualHistory(data);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load manual expenses.');
    }
  }, [getAuthHeaders, isAdmin]);

  const loadLenses = useCallback(async () => {
    setLoadingLenses(true);
    try {
      const data = await fetchLensesPage({
        page: 1,
        limit: 50,
        type: lensFilter,
        search: lensSearch,
      });
      setLenses(data.items.map(mapApiLens));
    } catch {
      setLenses([]);
    } finally {
      setLoadingLenses(false);
    }
  }, [lensFilter, lensSearch]);

  useEffect(() => {
    if (mode === 'history') {
      setLoadingHistory(true);
      Promise.all([loadHistory(), loadManualHistory()]).finally(() => setLoadingHistory(false));
    }
  }, [mode, loadHistory, loadManualHistory]);

  useEffect(() => {
    if (pickerOpen) {
      const timeout = setTimeout(loadLenses, 300);
      return () => clearTimeout(timeout);
    }
  }, [pickerOpen, loadLenses]);

  const batchTotal = useMemo(
    () => pendingLines.reduce((sum, line) => sum + line.amount, 0),
    [pendingLines]
  );

  const batchUnits = useMemo(
    () => pendingLines.reduce((sum, line) => sum + line.quantityAdded, 0),
    [pendingLines]
  );

  function syncTotalFromPerUnit(qty: number, perUnit: string) {
    const per = parseNumericInput(perUnit);
    if (per !== null && per >= 0 && qty > 0) {
      setTotalPrice(formatMoneyInput(per * qty));
    }
  }

  function syncPerUnitFromTotal(qty: number, total: string) {
    const lineTotal = parseNumericInput(total);
    if (lineTotal !== null && lineTotal >= 0 && qty > 0) {
      setCostPrice(formatMoneyInput(lineTotal / qty));
    }
  }

  function applyLensDefaults(item: LensItem) {
    const qty = Math.max(1, Number(quantity) || 1);
    const storedCost =
      item.costPrice !== null && item.costPrice >= 0
        ? formatMoneyInput(item.costPrice)
        : '';
    setCostPrice(storedCost);
    if (storedCost) {
      syncTotalFromPerUnit(qty, storedCost);
    } else {
      setTotalPrice('');
    }
    setSellingPrice(item.price > 0 ? formatMoneyInput(item.price) : '');
  }

  function resetDraftForm() {
    setSelectedLens(null);
    setQuantity('1');
    setCostPrice('');
    setTotalPrice('');
    setSellingPrice('');
  }

  function handleSelectLens(item: LensItem) {
    setSelectedLens(item);
    setPickerOpen(false);
    applyLensDefaults(item);
  }

  function handleQuantityChange(text: string) {
    const sanitized = sanitizePositiveIntegerInput(text) || '';
    setQuantity(sanitized);
    const qty = Number(sanitized);
    if (!Number.isInteger(qty) || qty <= 0) {
      return;
    }
    const perUnit = parseNumericInput(costPrice);
    const total = parseNumericInput(totalPrice);
    if (perUnit !== null && perUnit >= 0) {
      setTotalPrice(formatMoneyInput(perUnit * qty));
    } else if (total !== null && total >= 0) {
      setCostPrice(formatMoneyInput(total / qty));
    }
  }

  function handleCostPriceChange(text: string) {
    const sanitized = sanitizePositiveDecimalInput(text);
    setCostPrice(sanitized);
    const qty = Number(quantity);
    if (Number.isInteger(qty) && qty > 0) {
      syncTotalFromPerUnit(qty, sanitized);
    }
  }

  function handleTotalPriceChange(text: string) {
    const sanitized = sanitizePositiveDecimalInput(text);
    setTotalPrice(sanitized);
    const qty = Number(quantity);
    if (Number.isInteger(qty) && qty > 0) {
      syncPerUnitFromTotal(qty, sanitized);
    }
  }

  function handleAddLineToBatch() {
    if (!selectedLens) {
      Alert.alert('Select a lens', 'Choose the product you are adding to inventory.');
      return;
    }

    const qty = Number(quantity);
    const perUnit = parseNumericInput(costPrice);
    const purchaseTotal = parseNumericInput(totalPrice);
    const sellPrice = parseNumericInput(sellingPrice);

    if (!Number.isInteger(qty) || qty <= 0) {
      Alert.alert('Invalid quantity', 'Enter a whole number greater than 0.');
      return;
    }
    if (perUnit === null || perUnit <= 0) {
      Alert.alert('Invalid price', 'Enter the purchase price per unit.');
      return;
    }
    if (purchaseTotal === null || purchaseTotal <= 0) {
      Alert.alert('Invalid total price', 'Enter the total purchase amount for this line.');
      return;
    }
    if (sellPrice === null || sellPrice <= 0) {
      Alert.alert('Invalid selling price', 'Enter the customer selling price for this product.');
      return;
    }

    const expectedTotal = roundMoney(perUnit * qty);
    if (Math.abs(expectedTotal - roundMoney(purchaseTotal)) > 0.05) {
      Alert.alert(
        'Price mismatch',
        `Price per unit × quantity should equal total (expected ₹${expectedTotal}).`
      );
      return;
    }

    const resolvedCost = roundMoney(perUnit);
    const resolvedSell = roundMoney(sellPrice);
    const resolvedTotal = roundMoney(purchaseTotal);

    setPendingLines((current) => {
      const existing = current.find(
        (line) =>
          line.lens.id === selectedLens.id &&
          pricesMatch(line.costPrice, resolvedCost) &&
          pricesMatch(line.sellingPrice, resolvedSell)
      );
      if (existing) {
        return current.map((line) =>
          line.lineId === existing.lineId
            ? {
                ...line,
                quantityAdded: line.quantityAdded + qty,
                amount: roundMoney(line.amount + resolvedTotal),
              }
            : line
        );
      }
      return [
        ...current,
        {
          lineId: createLineId(),
          lens: selectedLens,
          quantityAdded: qty,
          amount: resolvedTotal,
          costPrice: resolvedCost,
          sellingPrice: resolvedSell,
        },
      ];
    });

    resetDraftForm();
  }

  function handleRemoveLine(lineId: string) {
    setPendingLines((current) => current.filter((line) => line.lineId !== lineId));
  }

  function handleClearBatch() {
    Alert.alert('Clear list', 'Remove all products from this purchase?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => setPendingLines([]),
      },
    ]);
  }

  async function handleSubmitBatch() {
    if (pendingLines.length === 0) {
      Alert.alert('Add products', 'Add at least one product to the list before submitting.');
      return;
    }

    Alert.alert(
      'Confirm purchase',
      `Add stock for ${pendingLines.length} product(s)?\nTotal: ₹${batchTotal} (${batchUnits} units)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setSubmitting(true);
            try {
              const result = await recordStockIntakeBatch(
                {
                  notes: notes.trim() || undefined,
                  items: pendingLines.map((line) => ({
                    lensType: toApiLensType(line.lens.lensType ?? 'Single Vision'),
                    lensId: line.lens.id,
                    quantityAdded: line.quantityAdded,
                    amount: line.amount,
                    costPrice: line.costPrice,
                    sellingPrice: line.sellingPrice,
                  })),
                },
                getAuthHeaders()
              );

              setPendingLines([]);
              setNotes('');
              resetDraftForm();

              Alert.alert(
                'Stock added',
                `Successfully added ${result.itemCount} product(s).\nTotal: ₹${result.totalAmount}\nRef: ${result.batchReference}`
              );
              await loadHistory();
            } catch (err) {
              Alert.alert('Failed', err instanceof Error ? err.message : 'Could not add stock.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  }

  async function handleSubmitManual() {
    const purchaseAmount = Number(manualAmount);
    if (!Number.isFinite(purchaseAmount) || purchaseAmount <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid expense amount.');
      return;
    }
    if (!manualDescription.trim()) {
      Alert.alert('Description required', 'Describe this business expense.');
      return;
    }

    setSubmittingManual(true);
    try {
      await recordManualExpense(
        { amount: purchaseAmount, description: manualDescription.trim() },
        getAuthHeaders()
      );
      setManualAmount('');
      setManualDescription('');
      Alert.alert('Recorded', 'Manual expense saved.');
      await loadManualHistory();
    } catch (err) {
      Alert.alert('Failed', err instanceof Error ? err.message : 'Could not save expense.');
    } finally {
      setSubmittingManual(false);
    }
  }

  const modeTabs: { key: ScreenMode; label: string; adminOnly?: boolean }[] = [
    { key: 'stock', label: 'Add stock' },
    { key: 'history', label: 'History' },
    ...(isAdmin ? [{ key: 'manual' as ScreenMode, label: 'Manual', adminOnly: true }] : []),
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.screenTitle}>
            Purchase Stock
          </ThemedText>
          <ThemedText style={styles.subtitle}>Procurement and stock intake</ThemedText>
        </View>

        <View style={styles.modeRow}>
          {modeTabs.map((tab) => {
            const active = mode === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.modeChip, active && { backgroundColor: tint }]}
                onPress={() => setMode(tab.key)}>
                <ThemedText style={[styles.modeChipText, active && styles.modeChipTextActive]}>
                  {tab.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {mode === 'stock' && (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {pendingLines.length > 0 && (
                <View style={styles.pendingSection}>
                  <View style={styles.pendingHeader}>
                    <ThemedText type="defaultSemiBold">
                      Purchase list ({pendingLines.length})
                    </ThemedText>
                    <Pressable onPress={handleClearBatch}>
                      <ThemedText style={[styles.clearLink, { color: tint }]}>Clear all</ThemedText>
                    </Pressable>
                  </View>
                  {pendingLines.map((line) => (
                    <PendingLineCard
                      key={line.lineId}
                      line={line}
                      isDark={isDark}
                      onRemove={() => handleRemoveLine(line.lineId)}
                    />
                  ))}
                  <View style={[styles.batchSummary, isDark && styles.batchSummaryDark]}>
                    <ThemedText style={styles.batchSummaryLabel}>Batch total</ThemedText>
                    <ThemedText type="defaultSemiBold" style={styles.batchSummaryValue}>
                      ₹{batchTotal} · {batchUnits} units
                    </ThemedText>
                  </View>
                </View>
              )}

              <ThemedText style={styles.sectionDivider}>
                {pendingLines.length > 0 ? 'Add another product' : 'Add product'}
              </ThemedText>

              <ThemedText style={styles.formLabel}>Lens product</ThemedText>
              <Pressable
                style={[styles.selectButton, isDark && styles.selectButtonDark]}
                onPress={() => setPickerOpen(true)}>
                <View style={styles.selectButtonContent}>
                  {selectedLens ? (
                    <>
                      <ThemedText type="defaultSemiBold" numberOfLines={2}>
                        {formatLensSummary(selectedLens)}
                      </ThemedText>
                      <ThemedText style={styles.selectMeta}>
                        Current stock: {selectedLens.quantity}
                        {selectedLens.costPrice !== null
                          ? ` · Cost ₹${selectedLens.costPrice}/unit`
                          : ''}
                        {selectedLens.price > 0 ? ` · Sell ₹${selectedLens.price}` : ''}
                      </ThemedText>
                    </>
                  ) : (
                    <ThemedText style={styles.selectPlaceholder}>Tap to select a lens product</ThemedText>
                  )}
                </View>
                <MaterialIcons name="unfold-more" size={22} color={tint} />
              </Pressable>

              <ThemedText style={styles.formLabel}>Quantity to add</ThemedText>
              <TextInput
                value={quantity}
                onChangeText={handleQuantityChange}
                keyboardType="number-pad"
                placeholder="e.g. 10"
                placeholderTextColor="#94a3b8"
                style={[styles.input, isDark && styles.inputDark]}
              />

              <ThemedText style={styles.formLabel}>Cost price per unit (₹)</ThemedText>
              <TextInput
                value={costPrice}
                onChangeText={handleCostPriceChange}
                keyboardType="decimal-pad"
                placeholder="Purchase cost per unit"
                placeholderTextColor="#94a3b8"
                style={[styles.input, isDark && styles.inputDark]}
              />

              <ThemedText style={styles.formLabel}>Total cost price (₹)</ThemedText>
              <TextInput
                value={totalPrice}
                onChangeText={handleTotalPriceChange}
                keyboardType="decimal-pad"
                placeholder="Total amount paid for this line"
                placeholderTextColor="#94a3b8"
                style={[styles.input, isDark && styles.inputDark]}
              />
              {quantity && costPrice ? (
                <ThemedText style={styles.priceHint}>
                  {quantity} × ₹{costPrice} = ₹
                  {formatMoneyInput((parseNumericInput(costPrice) ?? 0) * Number(quantity))}
                </ThemedText>
              ) : null}

              <ThemedText style={styles.formLabel}>Selling price (₹)</ThemedText>
              <TextInput
                value={sellingPrice}
                onChangeText={(t) => setSellingPrice(sanitizePositiveDecimalInput(t))}
                keyboardType="decimal-pad"
                placeholder={
                  selectedLens && selectedLens.price > 0
                    ? `Current sell price: ₹${selectedLens.price}`
                    : 'Customer price in shop'
                }
                placeholderTextColor="#94a3b8"
                style={[styles.input, isDark && styles.inputDark]}
              />

              {pendingLines.length === 0 && (
                <>
                  <ThemedText style={styles.formLabel}>Notes (optional)</ThemedText>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Supplier, invoice no., etc."
                    placeholderTextColor="#94a3b8"
                    style={[styles.input, styles.inputMultiline, isDark && styles.inputDark]}
                    multiline
                  />
                </> 
              )}

              <Pressable
                style={[styles.secondaryButton, { borderColor: tint }, isDark && styles.secondaryButtonDark]}
                onPress={handleAddLineToBatch}>
                <MaterialIcons name="add" size={22} color={tint} />
                <ThemedText style={[styles.secondaryButtonText, { color: tint }]}>
                  Add to purchase list
                </ThemedText>
              </Pressable>

              {pendingLines.length > 0 && (
                <>
                  <ThemedText style={[styles.formLabel, styles.notesAfterList]}>Batch notes (optional)</ThemedText>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Supplier, invoice no., etc."
                    placeholderTextColor="#94a3b8"
                    style={[styles.input, styles.inputMultiline, isDark && styles.inputDark]}
                    multiline
                  />

                  <Pressable
                    style={[styles.submitButton, { backgroundColor: tint }, submitting && styles.disabled]}
                    onPress={handleSubmitBatch}
                    disabled={submitting}>
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="inventory-2" size={22} color="#fff" />
                        <ThemedText style={styles.submitText}>
                          Submit {pendingLines.length} product{pendingLines.length === 1 ? '' : 's'} · ₹{batchTotal}
                        </ThemedText>
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {mode === 'history' && (
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={async () => {
                  setRefreshing(true);
                  await loadHistory();
                  setRefreshing(false);
                }}
                tintColor={tint}
              />
            }
            ListHeaderComponent={
              isAdmin && manualHistory.length > 0 ? (
                <View style={styles.manualHistoryBlock}>
                  <ThemedText type="defaultSemiBold" style={styles.sectionHeading}>
                    Recent manual expenses
                  </ThemedText>
                  {manualHistory.slice(0, 3).map((item) => (
                    <HistoryCard key={item.id} item={item} />
                  ))}
                  <ThemedText type="defaultSemiBold" style={[styles.sectionHeading, styles.sectionGap]}>
                    Procurement / stock
                  </ThemedText>
                </View>
              ) : null
            }
            ListEmptyComponent={
              loadingHistory ? (
                <ActivityIndicator style={styles.loader} color={tint} />
              ) : (
                <View style={styles.emptyBlock}>
                  <MaterialIcons name="receipt-long" size={48} color="#94a3b8" />
                  <ThemedText style={styles.emptyTitle}>No purchases yet</ThemedText>
                  <ThemedText style={styles.emptyText}>Stock intake records will appear here.</ThemedText>
                </View>
              )
            }
            renderItem={({ item }) => <HistoryCard item={item} />}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        {mode === 'manual' && isAdmin && (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
              <ThemedText style={styles.manualIntro}>
                Record non-inventory business expenses (rent, utilities, etc.). These do not add lens stock.
              </ThemedText>
              <ThemedText style={styles.formLabel}>Amount (₹)</ThemedText>
              <TextInput
                value={manualAmount}
                onChangeText={setManualAmount}
                keyboardType="decimal-pad"
                placeholder="Expense amount"
                placeholderTextColor="#94a3b8"
                style={[styles.input, isDark && styles.inputDark]}
              />
              <ThemedText style={styles.formLabel}>Description</ThemedText>
              <TextInput
                value={manualDescription}
                onChangeText={setManualDescription}
                placeholder="What was this expense for?"
                placeholderTextColor="#94a3b8"
                style={[styles.input, styles.inputMultiline, isDark && styles.inputDark]}
                multiline
              />
              <Pressable
                style={[styles.submitButton, { backgroundColor: tint }, submittingManual && styles.disabled]}
                onPress={handleSubmitManual}
                disabled={submittingManual}>
                {submittingManual ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="receipt" size={22} color="#fff" />
                    <ThemedText style={styles.submitText}>Record manual expense</ThemedText>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
          <SafeAreaView style={[styles.modalSafe, isDark && styles.modalSafeDark]} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Select lens</ThemedText>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={8}>
                <MaterialIcons name="close" size={26} color={isDark ? '#e2e8f0' : '#334155'} />
              </Pressable>
            </View>

            <TextInput
              value={lensSearch}
              onChangeText={setLensSearch}
              placeholder="Search brand, SPH, coating…"
              placeholderTextColor="#94a3b8"
              style={[styles.input, styles.modalSearch, isDark && styles.inputDark]}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {FILTER_OPTIONS.map((filter) => (
                <Pressable
                  key={filter}
                  style={[styles.filterChip, lensFilter === filter && { backgroundColor: tint }]}
                  onPress={() => setLensFilter(filter)}>
                  <ThemedText
                    style={[styles.filterChipText, lensFilter === filter && styles.filterChipTextActive]}>
                    {filter}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>

            {loadingLenses ? (
              <ActivityIndicator style={styles.loader} color={tint} />
            ) : (
              <FlatList
                data={lenses}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.pickerList}
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.pickerItem, isDark && styles.pickerItemDark]}
                    onPress={() => handleSelectLens(item)}>
                    <View style={styles.flex}>
                      <ThemedText type="defaultSemiBold" numberOfLines={2}>
                        {formatLensSummary(item)}
                      </ThemedText>
                      <ThemedText style={styles.selectMeta}>
                        Stock: {item.quantity}
                        {item.costPrice !== null ? ` · Cost ₹${item.costPrice}` : ''}
                        {item.price > 0 ? ` · Sell ₹${item.price}` : ''}
                      </ThemedText>
                    </View>
                    <MaterialIcons name="add-circle-outline" size={24} color={tint} />
                  </Pressable>
                )}
                ListEmptyComponent={
                  <ThemedText style={styles.emptyText}>No lenses match your search.</ThemedText>
                }
              />
            )}
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  screenTitle: { fontSize: 28, lineHeight: 34 },
  subtitle: { marginTop: 4, fontSize: 14, color: '#64748b' },
  modeRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  modeChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  modeChipTextActive: { color: '#fff' },
  formContent: { padding: 16, paddingBottom: 32, gap: 8 },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  selectButtonDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  selectButtonContent: { flex: 1, paddingRight: 8 },
  selectPlaceholder: { color: '#94a3b8', fontSize: 15 },
  selectMeta: { fontSize: 13, color: '#64748b', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  inputDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    color: '#f1f5f9',
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  hintLink: { fontSize: 13, marginTop: 6, marginBottom: 4 },
  priceHint: { fontSize: 12, color: '#64748b', marginTop: 4, marginBottom: 4 },
  pendingSection: { marginBottom: 8, gap: 10 },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearLink: { fontSize: 13, fontWeight: '600' },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  pendingCardDark: {
    backgroundColor: '#0c4a6e33',
    borderColor: '#0a7ea455',
  },
  pendingCardBody: { flex: 1, gap: 4 },
  batchSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
  },
  batchSummaryDark: { backgroundColor: '#0c4a6e44' },
  batchSummaryLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  batchSummaryValue: { fontSize: 16, color: '#0a7ea4' },
  sectionDivider: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  notesAfterList: { marginTop: 16 },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: '#fff',
  },
  secondaryButtonDark: {
    backgroundColor: '#1e293b',
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '700' },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  disabled: { opacity: 0.65 },
  listContent: { padding: 16, paddingBottom: 24, flexGrow: 1 },
  historyCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyRef: { fontSize: 11, color: '#94a3b8' },
  historyDesc: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
  historyMeta: { fontSize: 12, color: '#64748b' },
  separator: { height: 10 },
  loader: { marginTop: 40 },
  emptyBlock: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  manualIntro: { fontSize: 14, color: '#64748b', lineHeight: 21, marginBottom: 8 },
  manualHistoryBlock: { marginBottom: 8, gap: 10 },
  sectionHeading: { fontSize: 15, marginBottom: 4 },
  sectionGap: { marginTop: 16 },
  modalSafe: { flex: 1, backgroundColor: '#f8fafc' },
  modalSafeDark: { backgroundColor: '#0f172a' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalSearch: { marginHorizontal: 16, marginBottom: 8 },
  filterScroll: { maxHeight: 44, marginBottom: 8, paddingHorizontal: 12 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 4,
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  filterChipTextActive: { color: '#fff' },
  pickerList: { paddingHorizontal: 16, paddingBottom: 24 },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerItemDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
});
