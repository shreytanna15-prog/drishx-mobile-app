'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
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

function PendingLineCard({ line, onRemove }: { line: StockIntakeLine; onRemove: () => void }) {
  const styles = useThemedStyles(createStyles);
  const colors = useBrandColors();
  return (
    <View style={styles.pendingCard}>
      <View style={styles.pendingIconWrap}>
        <MaterialIcons name="inventory-2" size={18} color={colors.primary} />
      </View>
      <View style={styles.pendingCardBody}>
        <Text style={styles.pendingTitle} numberOfLines={2}>
          {formatLensSummary(line.lens)}
        </Text>
        <Text style={styles.pendingMeta}>
          +{line.quantityAdded} units · ₹{line.amount} paid · cost ₹{line.costPrice}/unit · sell ₹
          {line.sellingPrice}
        </Text>
      </View>
      <Pressable onPress={onRemove} hitSlop={8} style={styles.deleteBtn}>
        <MaterialIcons name="delete-outline" size={20} color={colors.danger} />
      </Pressable>
    </View>
  );
}

function HistoryCard({ item }: { item: ProcurementRecord }) {
  const styles = useThemedStyles(createStyles);
  const amount = Number(item.amount);
  const by = item.user?.name?.trim() || item.user?.email || 'Staff';

  return (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyAmount}>₹{amount}</Text>
        <View style={styles.historyRefPill}>
          <Text style={styles.historyRef}>{item.reference}</Text>
        </View>
      </View>
      <Text style={styles.historyDesc} numberOfLines={3}>
        {item.description || 'Procurement'}
      </Text>
      <Text style={styles.historyMeta}>
        {by} ·{' '}
        {new Date(item.createdAt).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.formLabel}>{label}</Text>
      {children}
    </View>
  );
}

export default function PurchaseStockScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
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
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerIconWrap}>
              <MaterialIcons name="shopping-cart" size={22} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.screenTitle}>Purchase Stock</Text>
              <Text style={styles.subtitle}>Procurement and stock intake</Text>
            </View>
          </View>
        </View>

        <View style={styles.modeRow}>
          {modeTabs.map((tab) => {
            const active = mode === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.modeChip, active && styles.modeChipActive]}
                onPress={() => setMode(tab.key)}>
                <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>{tab.label}</Text>
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
                <View style={styles.sectionCard}>
                  <View style={styles.pendingHeader}>
                    <Text style={styles.sectionTitle}>Purchase list ({pendingLines.length})</Text>
                    <Pressable onPress={handleClearBatch}>
                      <Text style={styles.clearLink}>Clear all</Text>
                    </Pressable>
                  </View>
                  <View style={styles.pendingList}>
                    {pendingLines.map((line) => (
                      <PendingLineCard key={line.lineId} line={line} onRemove={() => handleRemoveLine(line.lineId)} />
                    ))}
                  </View>
                  <View style={styles.batchSummary}>
                    <Text style={styles.batchSummaryLabel}>Batch total</Text>
                    <Text style={styles.batchSummaryValue}>
                      ₹{batchTotal} · {batchUnits} units
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>
                  {pendingLines.length > 0 ? 'Add another product' : 'Add product'}
                </Text>

                <FormField label="Lens product">
                  <Pressable style={styles.selectButton} onPress={() => setPickerOpen(true)}>
                    <View style={styles.selectButtonContent}>
                      {selectedLens ? (
                        <>
                          <Text style={styles.selectTitle} numberOfLines={2}>
                            {formatLensSummary(selectedLens)}
                          </Text>
                          <Text style={styles.selectMeta}>
                            Current stock: {selectedLens.quantity}
                            {selectedLens.costPrice !== null
                              ? ` · Cost ₹${selectedLens.costPrice}/unit`
                              : ''}
                            {selectedLens.price > 0 ? ` · Sell ₹${selectedLens.price}` : ''}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.selectPlaceholder}>Tap to select a lens product</Text>
                      )}
                    </View>
                    <MaterialIcons name="unfold-more" size={22} color={colors.primary} />
                  </Pressable>
                </FormField>

                <FormField label="Quantity to add">
                  <TextInput
                    value={quantity}
                    onChangeText={handleQuantityChange}
                    keyboardType="number-pad"
                    placeholder="e.g. 10"
                    placeholderTextColor={colors.placeholder}
                    style={styles.input}
                  />
                </FormField>

                <View style={styles.priceRow}>
                  <View style={styles.priceCol}>
                    <FormField label="Cost / unit (₹)">
                      <TextInput
                        value={costPrice}
                        onChangeText={handleCostPriceChange}
                        keyboardType="decimal-pad"
                        placeholder="Per unit"
                        placeholderTextColor={colors.placeholder}
                        style={styles.input}
                      />
                    </FormField>
                  </View>
                  <View style={styles.priceCol}>
                    <FormField label="Total cost (₹)">
                      <TextInput
                        value={totalPrice}
                        onChangeText={handleTotalPriceChange}
                        keyboardType="decimal-pad"
                        placeholder="Line total"
                        placeholderTextColor={colors.placeholder}
                        style={styles.input}
                      />
                    </FormField>
                  </View>
                </View>

                {quantity && costPrice ? (
                  <Text style={styles.priceHint}>
                    {quantity} × ₹{costPrice} = ₹
                    {formatMoneyInput((parseNumericInput(costPrice) ?? 0) * Number(quantity))}
                  </Text>
                ) : null}

                <FormField label="Selling price (₹)">
                  <TextInput
                    value={sellingPrice}
                    onChangeText={(t) => setSellingPrice(sanitizePositiveDecimalInput(t))}
                    keyboardType="decimal-pad"
                    placeholder={
                      selectedLens && selectedLens.price > 0
                        ? `Current sell price: ₹${selectedLens.price}`
                        : 'Customer price in shop'
                    }
                    placeholderTextColor={colors.placeholder}
                    style={styles.input}
                  />
                </FormField>

                {pendingLines.length === 0 && (
                  <FormField label="Notes (optional)">
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Supplier, invoice no., etc."
                      placeholderTextColor={colors.placeholder}
                      style={[styles.input, styles.inputMultiline]}
                      multiline
                    />
                  </FormField>
                )}

                <Pressable style={styles.secondaryButton} onPress={handleAddLineToBatch}>
                  <MaterialIcons name="add" size={20} color={colors.primary} />
                  <Text style={styles.secondaryButtonText}>Add to purchase list</Text>
                </Pressable>
              </View>

              {pendingLines.length > 0 && (
                <View style={styles.sectionCard}>
                  <FormField label="Batch notes (optional)">
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Supplier, invoice no., etc."
                      placeholderTextColor={colors.placeholder}
                      style={[styles.input, styles.inputMultiline]}
                      multiline
                    />
                  </FormField>

                  <Pressable
                    style={[styles.submitButton, submitting && styles.disabled]}
                    onPress={handleSubmitBatch}
                    disabled={submitting}>
                    {submitting ? (
                      <ActivityIndicator color={colors.primaryText} />
                    ) : (
                      <>
                        <MaterialIcons name="inventory-2" size={20} color={colors.primaryText} />
                        <Text style={styles.submitText}>
                          Submit {pendingLines.length} product{pendingLines.length === 1 ? '' : 's'} · ₹{batchTotal}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
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
                tintColor={colors.primary}
              />
            }
            ListHeaderComponent={
              isAdmin && manualHistory.length > 0 ? (
                <View style={styles.manualHistoryBlock}>
                  <Text style={styles.sectionTitle}>Recent manual expenses</Text>
                  {manualHistory.slice(0, 3).map((item) => (
                    <HistoryCard key={item.id} item={item} />
                  ))}
                  <Text style={[styles.sectionTitle, styles.sectionGap]}>Procurement / stock</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              loadingHistory ? (
                <ActivityIndicator style={styles.loader} color={colors.primary} />
              ) : (
                <View style={styles.emptyBlock}>
                  <MaterialIcons name="receipt-long" size={48} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>No purchases yet</Text>
                  <Text style={styles.emptyText}>Stock intake records will appear here.</Text>
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
              <View style={styles.sectionCard}>
                <Text style={styles.manualIntro}>
                  Record non-inventory business expenses (rent, utilities, etc.). These do not add lens stock.
                </Text>
                <FormField label="Amount (₹)">
                  <TextInput
                    value={manualAmount}
                    onChangeText={setManualAmount}
                    keyboardType="decimal-pad"
                    placeholder="Expense amount"
                    placeholderTextColor={colors.placeholder}
                    style={styles.input}
                  />
                </FormField>
                <FormField label="Description">
                  <TextInput
                    value={manualDescription}
                    onChangeText={setManualDescription}
                    placeholder="What was this expense for?"
                    placeholderTextColor={colors.placeholder}
                    style={[styles.input, styles.inputMultiline]}
                    multiline
                  />
                </FormField>
                <Pressable
                  style={[styles.submitButton, submittingManual && styles.disabled]}
                  onPress={handleSubmitManual}
                  disabled={submittingManual}>
                  {submittingManual ? (
                    <ActivityIndicator color={colors.primaryText} />
                  ) : (
                    <>
                      <MaterialIcons name="receipt" size={20} color={colors.primaryText} />
                      <Text style={styles.submitText}>Record manual expense</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
          <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select lens</Text>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={8} style={styles.modalCloseBtn}>
                <MaterialIcons name="close" size={22} color={colors.primary} />
              </Pressable>
            </View>

            <View style={styles.modalSearchWrap}>
              <MaterialIcons name="search" size={20} color={colors.textMuted} />
              <TextInput
                value={lensSearch}
                onChangeText={setLensSearch}
                placeholder="Search brand, SPH, coating…"
                placeholderTextColor={colors.placeholder}
                style={styles.modalSearchInput}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {FILTER_OPTIONS.map((filter) => {
                const active = lensFilter === filter;
                return (
                  <Pressable
                    key={filter}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setLensFilter(filter)}>
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {loadingLenses ? (
              <ActivityIndicator style={styles.loader} color={colors.primary} />
            ) : (
              <FlatList
                data={lenses}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.pickerList}
                renderItem={({ item }) => (
                  <Pressable style={styles.pickerItem} onPress={() => handleSelectLens(item)}>
                    <View style={styles.flex}>
                      <Text style={styles.pickerTitle} numberOfLines={2}>
                        {formatLensSummary(item)}
                      </Text>
                      <Text style={styles.selectMeta}>
                        Stock: {item.quantity}
                        {item.costPrice !== null ? ` · Cost ₹${item.costPrice}` : ''}
                        {item.price > 0 ? ` · Sell ₹${item.price}` : ''}
                      </Text>
                    </View>
                    <MaterialIcons name="add-circle-outline" size={24} color={colors.primary} />
                  </Pressable>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No lenses match your search.</Text>}
              />
            )}
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(240, 161, 50, 0.12)',
    borderWidth: 1,
    borderColor: c.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  screenTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: c.text,
  },
  subtitle: { marginTop: 4, fontSize: 14, color: c.textMuted },
  modeRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  modeChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
  },
  modeChipActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  modeChipText: { fontSize: 13, fontWeight: '700', color: c.textMuted },
  modeChipTextActive: { color: c.primaryText },
  formContent: { padding: 16, paddingBottom: 32, gap: 14 },
  sectionCard: {
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.cardBorder,
    padding: 16,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: c.text,
    marginBottom: 8,
  },
  fieldWrap: { marginTop: 4 },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: c.label,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.inputBorder,
    backgroundColor: c.inputBg,
  },
  selectButtonContent: { flex: 1, paddingRight: 8 },
  selectTitle: { color: c.text, fontSize: 15, fontWeight: '700' },
  selectPlaceholder: { color: c.placeholder, fontSize: 15 },
  selectMeta: { fontSize: 12, color: c.textMuted, marginTop: 4, lineHeight: 17 },
  input: {
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: c.text,
    backgroundColor: c.inputBg,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  priceRow: { flexDirection: 'row', gap: 10 },
  priceCol: { flex: 1 },
  priceHint: {
    fontSize: 12,
    color: c.primary,
    marginTop: 2,
    marginBottom: 4,
    fontWeight: '600',
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clearLink: { fontSize: 13, fontWeight: '700', color: c.primary },
  pendingList: { gap: 8 },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  pendingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(240, 161, 50, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingCardBody: { flex: 1, gap: 4 },
  pendingTitle: { color: c.text, fontSize: 14, fontWeight: '700' },
  pendingMeta: { fontSize: 12, color: c.textMuted, lineHeight: 17 },
  deleteBtn: { padding: 4 },
  batchSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: 'rgba(240, 161, 50, 0.1)',
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  batchSummaryLabel: { fontSize: 13, color: c.textMuted, fontWeight: '600' },
  batchSummaryValue: { fontSize: 16, color: c.primary, fontWeight: '800' },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: c.primary,
    backgroundColor: 'rgba(240, 161, 50, 0.08)',
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '700', color: c.primary },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: c.primary,
  },
  submitText: {
    color: c.primaryText,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    flexShrink: 1,
  },
  disabled: { opacity: 0.65 },
  listContent: { padding: 16, paddingBottom: 24, flexGrow: 1 },
  historyCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyAmount: { fontSize: 18, fontWeight: '800', color: c.primary },
  historyRefPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  historyRef: { fontSize: 10, color: c.textMuted, fontWeight: '600' },
  historyDesc: { fontSize: 14, lineHeight: 20, marginBottom: 6, color: c.text },
  historyMeta: { fontSize: 12, color: c.textMuted },
  separator: { height: 10 },
  loader: { marginTop: 40 },
  emptyBlock: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: c.text },
  emptyText: { fontSize: 14, color: c.textMuted, textAlign: 'center' },
  manualIntro: {
    fontSize: 14,
    color: c.textMuted,
    lineHeight: 21,
    marginBottom: 8,
  },
  manualHistoryBlock: { marginBottom: 8, gap: 10 },
  sectionGap: { marginTop: 16 },
  modalSafe: { flex: 1, backgroundColor: c.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: c.text },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  modalSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    color: c.text,
    padding: 0,
  },
  filterScroll: { maxHeight: 44, marginBottom: 8, paddingHorizontal: 12 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    marginHorizontal: 4,
  },
  filterChipActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  filterChipText: { fontSize: 13, fontWeight: '700', color: c.textMuted },
  filterChipTextActive: { color: c.primaryText },
  pickerList: { paddingHorizontal: 16, paddingBottom: 24 },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  pickerTitle: { color: c.text, fontSize: 14, fontWeight: '700' },
});
