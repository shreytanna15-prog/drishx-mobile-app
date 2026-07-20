'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { appAlert } from '@/lib/app-alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  sanitizePairQuantityInput,
  formatPowerRangeLabel,
} from '@/lib/cart-utils';
import {
  formatAddAxisLabel,
  formatAxisValue,
  formatLensItemCoatingSummary,
  formatLensProductCardTitle,
  formatSphCylSlash,
} from '@/lib/lens-display';
import { useCart } from '@/lib/cart';
import { useOrderMode } from '@/lib/order-mode';
import { LENS_PRICE_PER_PAIR_LABEL } from '@/lib/lens-pricing';
import { isValidPairQuantity, piecesFromDisplayQuantity } from '@/lib/order-quantity';
import { resolveSelectableRange } from '@/lib/prescription-range';
import {
  getDefaultRangeEndpoints,
  resolveWholesaleBoundOptions,
} from '@/lib/wholesale-range-options';
import {
  buildWholesaleMatrixSpec,
  buildWholesaleQtyMap,
  collectQtyEntriesFromSpec,
  countMatrixCells,
  countVisibleMatrixCells,
  MATRIX_INITIAL_COLS,
  MATRIX_INITIAL_ROWS,
  MATRIX_LOAD_MORE_COLS,
  MATRIX_LOAD_MORE_ROWS,
  yieldToUi,
  type BuildMatrixParams,
} from '@/lib/wholesale-matrix';
import { resolveCrossPowerMeta } from '@/lib/cross-power';
import { buildWholesaleSpecFromOrderState } from '@/lib/wholesale-cart';
import {
  buildPowerList,
  defaultWholesaleGridMode,
  resolveWholesalePowerProfile,
} from '@/lib/wholesale-powers';
import { toApiLensType } from '@/lib/types/lens';
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

function normalizePairsText(text: string): string {
  return sanitizePairQuantityInput(text);
}

export default function WholesaleProductOrderScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{ payload?: string }>();
  const item = useMemo(() => parseLensPayload(params.payload), [params.payload]);
  const { addWholesaleBatchToCart } = useCart();
  const { setMode } = useOrderMode();

  const selectableRange = useMemo(() => (item ? resolveSelectableRange(item) : null), [item]);
  const boundOptions = useMemo(
    () => (item ? resolveWholesaleBoundOptions(item) : { sph: [], cyl: [], add: [] }),
    [item]
  );
  const powerProfile = useMemo(
    () => (item ? resolveWholesalePowerProfile(item) : 'compound'),
    [item]
  );
  const gridMode = useMemo(() => defaultWholesaleGridMode(powerProfile), [powerProfile]);
  const crossPowerMeta = useMemo(
    () => (item ? resolveCrossPowerMeta(item) : null),
    [item]
  );
  const showSphRange = powerProfile !== 'cyl-only';
  const showCylRange = powerProfile !== 'sph-only';

  useEffect(() => {
    setMode('wholesale');
  }, [setMode]);

  const [sphFrom, setSphFrom] = useState(0);
  const [sphTo, setSphTo] = useState(0);
  const [sphStep, setSphStep] = useState(0.25);

  const [cylFrom, setCylFrom] = useState(0);
  const [cylTo, setCylTo] = useState(0);
  const [cylStep, setCylStep] = useState(0.25);

  const [addFrom, setAddFrom] = useState(1);
  const [addTo, setAddTo] = useState(3);
  const [addStep, setAddStep] = useState(0.25);

  const [pairsDefault, setPairsDefault] = useState('1');
  const [qtyMap, setQtyMap] = useState<QtyMap>({});

  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
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
    const parts: string[] = [];
    if (powerProfile !== 'cyl-only') {
      const sphOpts = selectableRange.sph.options;
      const sphStart = sphOpts[0] ?? selectableRange.sph.min;
      const sphEnd = sphOpts[sphOpts.length - 1] ?? selectableRange.sph.max;
      parts.push(`SPH ${formatPowerRangeLabel(sphStart, sphEnd)}`);
    }
    if (powerProfile !== 'sph-only' && boundOptions.cyl.length > 0) {
      const cylOpts = boundOptions.cyl;
      const cylStart = cylOpts[0]!;
      const cylEnd = cylOpts[cylOpts.length - 1]!;
      parts.push(`CYL ${formatPowerRangeLabel(cylStart, cylEnd)}`);
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  }, [boundOptions.cyl, powerProfile, selectableRange]);

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
  const productAxis = item?.axis ?? null;

  const addList = useMemo(() => {
    if (!isBifocalLens) return [];
    if (!Number.isFinite(addStep) || addStep <= 0) return [];
    return buildPowerList(addFrom, addTo, addStep);
  }, [addFrom, addStep, addTo, isBifocalLens]);

  const matrixParams = useMemo(
    (): BuildMatrixParams => ({
      mode: gridMode,
      isBifocalLens,
      isSingleVision,
      sphList,
      cylList,
      addList,
      productAxis,
      crossPowerMeta,
    }),
    [addList, crossPowerMeta, cylList, gridMode, isBifocalLens, isSingleVision, productAxis, sphList]
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
  }, [powerProfile]);

  const title = item
    ? `${formatLensProductCardTitle(item)} • Wholesale`
    : 'Wholesale';

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setQtyMap({});

    const defaultPairs = Number(pairsDefault.trim());
    if (!isValidPairQuantity(defaultPairs)) {
      setError('Default pairs must be 0.5, 1, 1.5, … (minimum 0.5).');
      setGenerating(false);
      return;
    }

    if (showSphRange && sphList.length === 0) {
      setError('Enter a valid SPH range and step.');
      setGenerating(false);
      return;
    }
    if (showCylRange && cylList.length === 0) {
      setError('Enter a valid CYL range and step.');
      setGenerating(false);
      return;
    }
    if (isBifocalLens && addList.length === 0) {
      setError('Enter a valid ADD range (+1 to +3) and step.');
      setGenerating(false);
      return;
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
    if (matrixSpec && hasGeneratedGrid) {
      return collectQtyEntriesFromSpec(matrixSpec, qtyMap, matrixParams).reduce(
        (sum, entry) => sum + entry.pairs,
        0
      );
    }
    return Object.values(qtyMap).reduce((sum, v) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1) return sum;
      return sum + n;
    }, 0);
  }

  async function handleAddAllToCart() {
    if (!item || addingToCart) {
      return;
    }

    const entries = matrixSpec
      ? collectQtyEntriesFromSpec(matrixSpec, qtyMap, matrixParams)
      : [];

    if (entries.length === 0) {
      setError('Enter at least 1 quantity in the grid.');
      return;
    }

    const defaultPairs = Number(pairsDefault);
    if (!isValidPairQuantity(defaultPairs)) {
      setError('Enter a valid default pairs value (0.5, 1, 1.5, …).');
      return;
    }

    setAddingToCart(true);
    setError(null);

    const wholesaleSpec = buildWholesaleSpecFromOrderState({
      sphFrom,
      sphTo,
      sphStep,
      cylFrom,
      cylTo,
      cylStep,
      addFrom,
      addTo,
      addStep,
      gridMode,
      defaultPairsPerCell: defaultPairs,
      qtyMap,
      productAxis,
      isBifocalLens,
      isSingleVision,
      crossPower: item.crossPower ?? null,
      showSphRange,
      showCylRange,
    });

    try {
      const { expandedLineCount } = await addWholesaleBatchToCart({
        lensId: item.id,
        lensType: toApiLensType(item.lensType ?? 'Progressive'),
        unitPrice: item.price,
        brand: item.brand,
        coating: item.coating,
        item: item.item,
        lensTypeLabel: item.lensType ?? 'Progressive',
        ranges: wholesaleSpec.ranges,
        gridMode: wholesaleSpec.gridMode,
        defaultPairsPerCell: wholesaleSpec.defaultPairsPerCell,
        qtyOverrides: wholesaleSpec.qtyOverrides,
        productAxis: wholesaleSpec.productAxis,
        isBifocalLens: wholesaleSpec.isBifocalLens,
        isSingleVision: wholesaleSpec.isSingleVision,
        crossPower: wholesaleSpec.crossPower,
      });

      if (expandedLineCount > 0) {
        appAlert('Added to cart', `Added wholesale batch (${expandedLineCount} power lines).`);
        router.push('/(tabs)/cart');
        return;
      }

      appAlert('Failed', 'Could not add wholesale batch to cart.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart.');
      appAlert('Failed', err instanceof Error ? err.message : 'Failed to add to cart.');
    } finally {
      setAddingToCart(false);
    }
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
            <Text style={styles.summaryBrand}>{formatLensProductCardTitle(item)}</Text>
            <Text style={styles.summaryMeta}>{formatLensItemCoatingSummary(item)}</Text>
            <Text style={styles.summaryPower}>{formatSphCylSlash(item)}</Text>
            {isBifocalLens ? (
              <Text style={styles.summaryMeta}>{formatAddAxisLabel(item)}</Text>
            ) : null}
            <Text style={styles.summaryPrice}>
              ₹{item.price}
              {LENS_PRICE_PER_PAIR_LABEL}
            </Text>
            <Text style={styles.pairsHint}>Wholesale orders are in pairs only.</Text>
          </View>

          <Text style={styles.sectionTitle}>Ranges</Text>
          {rangeHint ? <Text style={styles.rangeHint}>{rangeHint}</Text> : null}

          {showSphRange ? (
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

          {showCylRange ? (
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
            <Text style={styles.bottomHint}>Will add multiple lines to cart</Text>
          </View>
          <Pressable
            style={[styles.addBtn, (totalPairs < 1 || addingToCart) && styles.addBtnDisabled]}
            onPress={() => void handleAddAllToCart()}
            disabled={totalPairs < 1 || addingToCart}>
            {addingToCart ? (
              <ActivityIndicator size="small" color={colors.primaryText} />
            ) : (
              <MaterialIcons name="add-shopping-cart" size={20} color={colors.primaryText} />
            )}
            <Text style={styles.addBtnText}>{addingToCart ? 'Adding…' : 'Add to cart'}</Text>
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
    summaryPower: { color: c.text, fontSize: 15, fontWeight: '800', marginTop: 6 },
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
    addBtnDisabled: {
      opacity: 0.6,
    },
    addBtnText: { color: c.primaryText, fontSize: 14, fontWeight: '900' },
  });

