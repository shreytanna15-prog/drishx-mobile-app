'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WholesaleQtyMatrix } from '@/components/wholesale-qty-matrix';
import { WholesaleRangePicker } from '@/components/wholesale-range-picker';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import {
  buildCartLineId,
  sanitizePositiveIntegerInput,
  formatPowerLabel,
} from '@/lib/cart-utils';
import { formatAxisValue, formatLensItemCoatingSummary } from '@/lib/lens-display';
import { useCart } from '@/lib/cart';
import { useOrderMode } from '@/lib/order-mode';
import { piecesFromDisplayQuantity } from '@/lib/order-quantity';
import { resolveSelectableRange } from '@/lib/prescription-range';
import {
  getDefaultRangeEndpoints,
  resolveWholesaleBoundOptions,
} from '@/lib/wholesale-range-options';
import {
  buildWholesaleMatrixSpec,
  buildWholesaleQtyMap,
  countMatrixCells,
  countVisibleMatrixCells,
  MATRIX_INITIAL_COLS,
  MATRIX_INITIAL_ROWS,
  MATRIX_LOAD_MORE_COLS,
  MATRIX_LOAD_MORE_ROWS,
  resolveGridEntryFromKey,
  yieldToUi,
  type BuildMatrixParams,
} from '@/lib/wholesale-matrix';
import { buildPowerList, type WholesaleGridMode } from '@/lib/wholesale-powers';
import type { LensItem } from '@/lib/types/lens';

function parseLensPayload(rawPayload: string | string[] | undefined): LensItem | null {
  if (!rawPayload) return null;
  const single = Array.isArray(rawPayload) ? rawPayload[0] : rawPayload;
  try {
    return JSON.parse(decodeURIComponent(single)) as LensItem;
  } catch {
    return null;
  }
}

type QtyMap = Record<string, string>;

const BIFOCAL_AXIS_VALUES = [45, 90, 135, 180] as const;

type WholesaleEyeOption = 'LEFT' | 'RIGHT' | 'BOTH';

const PROGRESSIVE_EYE_OPTIONS: { id: WholesaleEyeOption; label: string }[] = [
  { id: 'LEFT', label: 'Left eye' },
  { id: 'RIGHT', label: 'Right eye' },
  { id: 'BOTH', label: 'Both eyes' },
];

function progressiveCartEyes(selected: WholesaleEyeOption): Array<'LEFT' | 'RIGHT'> {
  if (selected === 'BOTH') return ['LEFT', 'RIGHT'];
  return [selected];
}

function normalizePairsText(text: string): string {
  const sanitized = sanitizePositiveIntegerInput(text);
  if (sanitized === '') return '';
  const n = Number(sanitized);
  if (!Number.isInteger(n) || n < 1) return '';
  return String(n);
}

export default function WholesaleProductOrderScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{ payload?: string }>();
  const item = useMemo(() => parseLensPayload(params.payload), [params.payload]);
  const { addToCart, updateQuantity, items: cartItems } = useCart();
  const { setMode } = useOrderMode();

  const selectableRange = useMemo(() => (item ? resolveSelectableRange(item) : null), [item]);
  const boundOptions = useMemo(
    () => (item ? resolveWholesaleBoundOptions(item) : { sph: [], cyl: [], add: [] }),
    [item]
  );

  useEffect(() => {
    setMode('wholesale');
  }, [setMode]);

  const [mode, setModeState] = useState<WholesaleGridMode>('compound');

  const [sphFrom, setSphFrom] = useState(0);
  const [sphTo, setSphTo] = useState(0);
  const [sphStep, setSphStep] = useState(0.25);

  const [cylFrom, setCylFrom] = useState(0);
  const [cylTo, setCylTo] = useState(0);
  const [cylStep, setCylStep] = useState(0.25);

  const [addFrom, setAddFrom] = useState(1);
  const [addTo, setAddTo] = useState(3);
  const [addStep, setAddStep] = useState(0.25);
  const [selectedAxis, setSelectedAxis] = useState<number>(BIFOCAL_AXIS_VALUES[0]);
  const [selectedEye, setSelectedEye] = useState<WholesaleEyeOption>('LEFT');

  const [pairsDefault, setPairsDefault] = useState('1');
  const [qtyMap, setQtyMap] = useState<QtyMap>({});

  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [visibleRowCount, setVisibleRowCount] = useState(MATRIX_INITIAL_ROWS);
  const [visibleColCount, setVisibleColCount] = useState(MATRIX_INITIAL_COLS);

  useEffect(() => {
    if (!item) {
      return;
    }

    const bounds = resolveWholesaleBoundOptions(item);
    const sph = getDefaultRangeEndpoints(bounds.sph);
    const cyl = getDefaultRangeEndpoints(bounds.cyl);
    const add = getDefaultRangeEndpoints(bounds.add);

    setSphFrom(sph.from);
    setSphTo(sph.to);
    setCylFrom(cyl.from);
    setCylTo(cyl.to);
    setAddFrom(add.from);
    setAddTo(add.to);
    setSphStep(0.25);
    setCylStep(0.25);
    setAddStep(0.25);
    setQtyMap({});
    setError(null);
    setVisibleRowCount(MATRIX_INITIAL_ROWS);
    setVisibleColCount(MATRIX_INITIAL_COLS);
  }, [item?.id]);

  const rangeHint = useMemo(() => {
    if (!selectableRange) {
      return null;
    }
    const sphOpts = selectableRange.sph.options;
    const sphStart = sphOpts[0] ?? selectableRange.sph.min;
    const sphEnd = sphOpts[sphOpts.length - 1] ?? selectableRange.sph.max;
    let hint = `SPH ${formatPowerLabel(sphStart)} to ${formatPowerLabel(sphEnd)}`;
    if (selectableRange.cyl?.options.length) {
      const cylOpts = selectableRange.cyl.options;
      const cylStart = cylOpts[0] ?? selectableRange.cyl.min;
      const cylEnd = cylOpts[cylOpts.length - 1] ?? selectableRange.cyl.max;
      hint += ` · CYL ${formatPowerLabel(cylStart)} to ${formatPowerLabel(cylEnd)}`;
    }
    return hint;
  }, [selectableRange]);

  const sphList = useMemo(() => {
    if (!Number.isFinite(sphStep) || sphStep <= 0) return [];
    return buildPowerList(sphFrom, sphTo, sphStep);
  }, [sphFrom, sphTo, sphStep]);

  const cylList = useMemo(() => {
    if (!Number.isFinite(cylStep) || cylStep <= 0) return [];
    return buildPowerList(cylFrom, cylTo, cylStep);
  }, [cylFrom, cylTo, cylStep]);

  const isKryptok = item?.lensType === 'Kryptok';
  const isProgressive = item?.lensType === 'Progressive';
  const isBifocalLens = isKryptok || isProgressive;
  const isSingleVision = item?.lensType === 'Single Vision';

  const addList = useMemo(() => {
    if (!isBifocalLens) return [];
    if (!Number.isFinite(addStep) || addStep <= 0) return [];
    return buildPowerList(addFrom, addTo, addStep);
  }, [addFrom, addStep, addTo, isBifocalLens]);

  const matrixParams = useMemo(
    (): BuildMatrixParams => ({
      mode,
      isBifocalLens,
      isSingleVision,
      sphList,
      cylList,
      addList,
      selectedAxis,
    }),
    [addList, cylList, isBifocalLens, isSingleVision, mode, selectedAxis, sphList]
  );

  const matrixSpec = useMemo(
    () => buildWholesaleMatrixSpec(matrixParams),
    [matrixParams]
  );

  const hasGeneratedGrid = Object.keys(qtyMap).length > 0;

  const visibleMatrixRows = useMemo(
    () => matrixSpec?.rows.slice(0, visibleRowCount) ?? [],
    [matrixSpec, visibleRowCount]
  );

  const visibleMatrixCols = useMemo(
    () => matrixSpec?.cols.slice(0, visibleColCount) ?? [],
    [matrixSpec, visibleColCount]
  );

  const totalMatrixCells = useMemo(
    () => (hasGeneratedGrid ? Object.keys(qtyMap).length : matrixSpec ? countMatrixCells(matrixSpec) : 0),
    [hasGeneratedGrid, matrixSpec, qtyMap]
  );

  const visibleMatrixCells = useMemo(
    () =>
      matrixSpec
        ? countVisibleMatrixCells(matrixSpec, visibleRowCount, visibleColCount)
        : 0,
    [matrixSpec, visibleColCount, visibleRowCount]
  );

  const hasMoreRows = matrixSpec ? visibleMatrixRows.length < matrixSpec.rows.length : false;
  const hasMoreCols = matrixSpec ? visibleMatrixCols.length < matrixSpec.cols.length : false;

  useEffect(() => {
    setVisibleRowCount(MATRIX_INITIAL_ROWS);
    setVisibleColCount(MATRIX_INITIAL_COLS);
  }, [mode]);

  const title = item ? `${item.brand || 'Lens'} • Wholesale` : 'Wholesale';

  function selectAxis(value: number) {
    setSelectedAxis(value);
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setQtyMap({});

    const defaultPairs = Number(pairsDefault.trim());
    if (!Number.isInteger(defaultPairs) || defaultPairs < 1) {
      setError('Default pairs must be at least 1.');
      setGenerating(false);
      return;
    }

    if (mode === 'sph-only') {
      if (sphList.length === 0) {
        setError('Enter a valid SPH range and step.');
        setGenerating(false);
        return;
      }
      if (isBifocalLens && addList.length === 0) {
        setError('Enter a valid ADD range (+1 to +3) and step.');
        setGenerating(false);
        return;
      }
    } else if (mode === 'cyl-only') {
      if (cylList.length === 0) {
        setError('Enter a valid CYL range and step.');
        setGenerating(false);
        return;
      }
      if (isBifocalLens && addList.length === 0) {
        setError('Enter a valid ADD range (+1 to +3) and step.');
        setGenerating(false);
        return;
      }
    } else {
      if (sphList.length === 0 || cylList.length === 0) {
        setError('Enter valid SPH and CYL ranges and steps.');
        setGenerating(false);
        return;
      }
      if (isBifocalLens && addList.length === 0) {
        setError('Enter a valid ADD range (+1 to +3) and step.');
        setGenerating(false);
        return;
      }
    }

    await yieldToUi();

    const next = await buildWholesaleQtyMap(matrixParams, defaultPairs);
    if (Object.keys(next).length === 0) {
      setError('No valid combinations for the selected ranges.');
      setGenerating(false);
      return;
    }

    setQtyMap(next);
    setVisibleRowCount(MATRIX_INITIAL_ROWS);
    setVisibleColCount(MATRIX_INITIAL_COLS);
    setGenerating(false);
  }

  function handleLoadMoreMatrix() {
    if (!matrixSpec) return;
    setVisibleRowCount((current) =>
      Math.min(current + MATRIX_LOAD_MORE_ROWS, matrixSpec.rows.length)
    );
    setVisibleColCount((current) =>
      Math.min(current + MATRIX_LOAD_MORE_COLS, matrixSpec.cols.length)
    );
  }

  function handleMatrixQtyChange(key: string, text: string) {
    setQtyMap((current) => ({ ...current, [key]: normalizePairsText(text) }));
  }

  function totalPairsSelected(): number {
    return Object.values(qtyMap).reduce((sum, v) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1) return sum;
      return sum + n;
    }, 0);
  }

  async function handleAddAllToCart() {
    if (!item) {
      Alert.alert('Unable to load product', 'Please go back and select a product again.');
      return;
    }

    const entries = Object.entries(qtyMap).flatMap(([key, pairsText]) => {
      const pairs = Number(pairsText);
      if (!Number.isInteger(pairs) || pairs < 1) {
        return [];
      }
      const entry = resolveGridEntryFromKey(key, matrixParams);
      if (!entry) {
        return [];
      }
      return [{ ...entry, pairs }];
    });

    if (entries.length === 0) {
      setError('Enter at least 1 quantity in the grid.');
      return;
    }

    // Wholesale: pairs only -> convert to pieces (2 per pair).
    const failures: string[] = [];
    let success = 0;
    const eyesToAdd = isProgressive ? progressiveCartEyes(selectedEye) : [undefined];

    for (const entry of entries) {
      const pieces = piecesFromDisplayQuantity(entry.pairs, 'pair');

      for (const eye of eyesToAdd) {
        const cartItem: LensItem = {
          ...item,
          sph: entry.sph,
          cyl: entry.cyl,
          add: entry.add,
          cylAdd: entry.cylAdd,
          axis: entry.axis,
          eye,
        };

        const lineId = buildCartLineId(cartItem);
        const existing = cartItems.find((x) => x.cartLineId === lineId);
        try {
          if (existing) {
            await updateQuantity(lineId, pieces);
          } else {
            await addToCart(cartItem, pieces);
          }
          success += 1;
        } catch (err) {
          const parts = [
            eye ? `Eye ${eye}` : null,
            `SPH ${formatPowerLabel(entry.sph)}`,
            entry.cyl != null ? `CYL ${formatPowerLabel(entry.cyl)}` : null,
            entry.axis != null ? `AXIS ${formatAxisValue(entry.axis)}` : null,
            entry.add != null ? `ADD ${formatPowerLabel(entry.add)}` : null,
          ].filter(Boolean);
          failures.push(`${parts.join(' · ')}: ${err instanceof Error ? err.message : 'Failed'}`);
        }
      }
    }

    if (success > 0 && failures.length === 0) {
      Alert.alert('Added to cart', `Added ${success} item(s) to cart.`);
      router.push('/(tabs)/cart');
      return;
    }

    if (success > 0) {
      Alert.alert('Partially added', `${success} item(s) added. Some failed:\n\n${failures.slice(0, 8).join('\n')}`);
      return;
    }

    Alert.alert('Failed', failures.join('\n\n'));
  }

  if (!item) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
            </Pressable>
            <Text style={styles.title}>Wholesale</Text>
            <View style={styles.backBtn} />
          </View>
          <View style={styles.centered}>
            <Text style={styles.errorText}>Unable to load product details.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const totalPairs = totalPairsSelected();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryBrand}>{item.brand || 'Lens'}</Text>
            <Text style={styles.summaryMeta}>{formatLensItemCoatingSummary(item)}</Text>
            <Text style={styles.summaryPrice}>₹{item.price} / pc</Text>
            <Text style={styles.pairsHint}>Wholesale orders are in pairs only.</Text>
          </View>

          <Text style={styles.sectionTitle}>Order type</Text>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, mode === 'sph-only' && styles.toggleBtnActive]}
              onPress={() => setModeState('sph-only')}>
              <Text style={[styles.toggleText, mode === 'sph-only' && styles.toggleTextActive]}>SPH only</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, mode === 'cyl-only' && styles.toggleBtnActive]}
              onPress={() => setModeState('cyl-only')}>
              <Text style={[styles.toggleText, mode === 'cyl-only' && styles.toggleTextActive]}>CYL only</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, mode === 'compound' && styles.toggleBtnActive]}
              onPress={() => setModeState('compound')}>
              <Text style={[styles.toggleText, mode === 'compound' && styles.toggleTextActive]}>Compound</Text>
            </Pressable>
          </View>

          {isProgressive ? (
            <>
              <Text style={styles.sectionTitle}>Eye</Text>
              <View style={styles.eyeRow}>
                {PROGRESSIVE_EYE_OPTIONS.map((option) => {
                  const active = selectedEye === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      style={[styles.eyeChip, active && styles.eyeChipActive]}
                      onPress={() => setSelectedEye(option.id)}>
                      <Text style={[styles.eyeChipText, active && styles.eyeChipTextActive]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Ranges</Text>
          {rangeHint ? <Text style={styles.rangeHint}>{rangeHint}</Text> : null}

          {(mode === 'sph-only' || mode === 'compound') ? (
            <View style={styles.rangeCard}>
              <Text style={styles.rangeTitle}>SPH</Text>
              <WholesaleRangePicker
                from={sphFrom}
                to={sphTo}
                step={sphStep}
                boundOptions={boundOptions.sph}
                onFromChange={setSphFrom}
                onToChange={setSphTo}
                onStepChange={setSphStep}
              />
            </View>
          ) : null}

          {(mode === 'cyl-only' || mode === 'compound') ? (
            <View style={styles.rangeCard}>
              <Text style={styles.rangeTitle}>CYL</Text>
              <WholesaleRangePicker
                from={cylFrom}
                to={cylTo}
                step={cylStep}
                boundOptions={boundOptions.cyl}
                onFromChange={setCylFrom}
                onToChange={setCylTo}
                onStepChange={setCylStep}
              />
              {isBifocalLens ? (
                <View style={styles.axisSection}>
                  <Text style={styles.fieldLabel}>Axis</Text>
                  <View style={styles.axisRow}>
                    {BIFOCAL_AXIS_VALUES.map((axis) => {
                      const active = selectedAxis === axis;
                      return (
                        <Pressable
                          key={axis}
                          style={[styles.axisChip, active && styles.axisChipActive]}
                          onPress={() => selectAxis(axis)}>
                          <Text style={[styles.axisChipText, active && styles.axisChipTextActive]}>
                            {axis}°
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {isBifocalLens ? (
            <View style={styles.rangeCard}>
              <Text style={styles.rangeTitle}>ADD</Text>
              <Text style={styles.addHint}>Common for SPH and CYL</Text>
              <WholesaleRangePicker
                from={addFrom}
                to={addTo}
                step={addStep}
                boundOptions={boundOptions.add}
                onFromChange={setAddFrom}
                onToChange={setAddTo}
                onStepChange={setAddStep}
              />
            </View>
          ) : null}

          <View style={styles.defaultQtyRow}>
            <Text style={styles.defaultQtyLabel}>Default pairs</Text>
            <TextInput
              value={pairsDefault}
              onChangeText={(t) => setPairsDefault(normalizePairsText(t))}
              keyboardType="number-pad"
              style={styles.defaultQtyInput}
              placeholder="1"
              placeholderTextColor={colors.placeholder}
            />
            <Pressable
              style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
              onPress={() => void handleGenerate()}
              disabled={generating}>
              {generating ? (
                <ActivityIndicator size="small" color={colors.primaryText} />
              ) : (
                <MaterialIcons name="grid-view" size={18} color={colors.primaryText} />
              )}
              <Text style={styles.generateBtnText}>{generating ? 'Generating…' : 'Generate'}</Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.sectionTitle}>Quantity matrix</Text>
          {generating ? (
            <View style={styles.matrixLoader}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.matrixLoaderText}>Building quantity matrix…</Text>
            </View>
          ) : !hasGeneratedGrid || !matrixSpec ? (
            <View style={styles.emptyGrid}>
              <Text style={styles.emptyGridText}>Tap “Generate” to create the matrix.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.gridCountHint}>
                Showing {visibleMatrixRows.length} of {matrixSpec.rows.length} row
                {matrixSpec.rows.length === 1 ? '' : 's'} · {visibleMatrixCols.length} of{' '}
                {matrixSpec.cols.length} col
                {matrixSpec.cols.length === 1 ? '' : 's'} · {visibleMatrixCells} visible ·{' '}
                {totalMatrixCells} total pair
                {totalMatrixCells === 1 ? '' : 's'}
              </Text>
              <WholesaleQtyMatrix
                spec={matrixSpec}
                visibleRows={visibleMatrixRows}
                visibleCols={visibleMatrixCols}
                qtyMap={qtyMap}
                onQtyChange={handleMatrixQtyChange}
              />
              <Text style={styles.pairsLegend}>Enter quantities in pairs.</Text>
              {hasMoreRows || hasMoreCols ? (
                <Pressable style={styles.loadMoreBtn} onPress={handleLoadMoreMatrix}>
                  <Text style={styles.loadMoreText}>
                    Load more
                    {hasMoreRows
                      ? ` · ${matrixSpec.rows.length - visibleMatrixRows.length} rows`
                      : ''}
                    {hasMoreCols
                      ? ` · ${matrixSpec.cols.length - visibleMatrixCols.length} cols`
                      : ''}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          <View>
            <Text style={styles.bottomMeta}>{totalPairs} pair{totalPairs === 1 ? '' : 's'} selected</Text>
            <Text style={styles.bottomHint}>
              {isProgressive && selectedEye === 'BOTH'
                ? 'Adds LEFT + RIGHT lines per selection'
                : 'Will add multiple lines to cart'}
            </Text>
          </View>
          <Pressable style={styles.addBtn} onPress={() => void handleAddAllToCart()} disabled={totalPairs < 1}>
            <MaterialIcons name="add-shopping-cart" size={20} color={colors.primaryText} />
            <Text style={styles.addBtnText}>Add to cart</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    safe: { flex: 1 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    title: { color: c.text, fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
    content: { padding: 16, paddingBottom: 110, gap: 12 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    summaryCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 14,
    },
    summaryBrand: { color: c.text, fontSize: 18, fontWeight: '800' },
    summaryMeta: { color: c.textMuted, fontSize: 12, fontWeight: '600', marginTop: 4 },
    summaryPrice: { color: c.primary, fontSize: 16, fontWeight: '900', marginTop: 8 },
    pairsHint: { color: c.primary, fontSize: 12, fontWeight: '700', marginTop: 8 },
    sectionTitle: {
      color: c.label,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 6,
    },
    rangeHint: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 18,
      marginTop: -4,
    },
    toggleRow: {
      flexDirection: 'row',
      gap: 8,
      padding: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    toggleBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toggleBtnActive: { backgroundColor: c.primary },
    toggleText: { color: c.textMuted, fontSize: 13, fontWeight: '800' },
    toggleTextActive: { color: c.primaryText },
    rangeCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 12,
      gap: 10,
    },
    rangeTitle: { color: c.text, fontSize: 14, fontWeight: '800' },
    addHint: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '600',
      marginTop: -4,
      marginBottom: 4,
    },
    fieldLabel: { color: c.textMuted, fontSize: 11, fontWeight: '700' },
    defaultQtyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 12,
    },
    defaultQtyLabel: { color: c.text, fontSize: 13, fontWeight: '800' },
    defaultQtyInput: {
      width: 72,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 10,
      fontSize: 14,
      fontWeight: '800',
      color: c.text,
      backgroundColor: c.inputBg,
      textAlign: 'center',
      marginLeft: 'auto',
    },
    generateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    generateBtnDisabled: { opacity: 0.85 },
    generateBtnText: { color: c.primaryText, fontSize: 13, fontWeight: '900' },
    matrixLoader: {
      paddingVertical: 32,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      alignItems: 'center',
      gap: 12,
    },
    matrixLoaderText: { color: c.textMuted, fontSize: 13, fontWeight: '600' },
    errorText: { color: c.danger, fontSize: 13, fontWeight: '700', textAlign: 'center' },
    emptyGrid: {
      paddingVertical: 18,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      alignItems: 'center',
    },
    emptyGridText: { color: c.textMuted, fontSize: 13, fontWeight: '600' },
    gridCountHint: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
    pairsLegend: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 8,
      textAlign: 'center',
    },
    loadMoreBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    loadMoreText: { color: c.primary, fontSize: 13, fontWeight: '800' },
    addSection: { gap: 10, marginTop: 4 },
    eyeRow: {
      flexDirection: 'row',
      gap: 8,
      padding: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    eyeChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eyeChipActive: { backgroundColor: c.primary },
    eyeChipText: { color: c.textMuted, fontSize: 12, fontWeight: '800', textAlign: 'center' },
    eyeChipTextActive: { color: c.primaryText },
    axisSection: { gap: 8 },
    axisRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    axisChip: {
      minWidth: 58,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
      alignItems: 'center',
    },
    axisChipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    axisChipText: { color: c.textMuted, fontSize: 13, fontWeight: '800' },
    axisChipTextActive: { color: c.primaryText },
    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
      backgroundColor: c.card,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    bottomMeta: { color: c.text, fontSize: 13, fontWeight: '900' },
    bottomHint: { color: c.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      opacity: 1,
    },
    addBtnText: { color: c.primaryText, fontSize: 14, fontWeight: '900' },
  });

