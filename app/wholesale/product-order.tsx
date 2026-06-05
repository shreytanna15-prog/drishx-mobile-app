'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import {
  buildCartLineId,
  sanitizePositiveIntegerInput,
  sanitizeSignedNumericInput,
  formatPowerLabel,
  parseNumericInput,
} from '@/lib/cart-utils';
import { formatAxisValue } from '@/lib/lens-display';
import { useCart } from '@/lib/cart';
import { useOrderMode } from '@/lib/order-mode';
import { piecesFromDisplayQuantity } from '@/lib/order-quantity';
import {
  buildPowerList,
  isAllowedCompoundCombo,
  parseStep,
  powerKey,
  type WholesaleGridMode,
} from '@/lib/wholesale-powers';
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

const KRYPTOK_AXIS_VALUES = [45, 90, 135, 180] as const;
const GRID_PAGE_SIZE = 10;

type GridEntry = {
  key: string;
  label: string;
  sph: number;
  cyl: number | null;
  add: number | null;
  sphAdd: number | null;
  cylAdd: number | null;
  axis: number | null;
};

function qtyKeyCompound(sph: number, cyl: number) {
  return `${powerKey(sph)}|${powerKey(cyl)}`;
}

function qtyKeySphAdd(sph: number, add: number) {
  return `${powerKey(sph)}|add:${powerKey(add)}`;
}

function qtyKeyCylAxisAdd(cyl: number, axis: number, add: number) {
  return `${powerKey(cyl)}|axis:${axis}|add:${powerKey(add)}`;
}

function qtyKeyCompoundKryptok(
  sph: number,
  cyl: number,
  axis: number,
  sphAdd: number,
  cylAdd: number
) {
  return `${powerKey(sph)}|${powerKey(cyl)}|axis:${axis}|sphAdd:${powerKey(sphAdd)}|cylAdd:${powerKey(cylAdd)}`;
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

  useEffect(() => {
    setMode('wholesale');
  }, [setMode]);

  const [mode, setModeState] = useState<WholesaleGridMode>('compound');

  const [sphFrom, setSphFrom] = useState('-6.00');
  const [sphTo, setSphTo] = useState('+2.00');
  const [sphStep, setSphStep] = useState('0.25');

  const [cylFrom, setCylFrom] = useState('0.00');
  const [cylTo, setCylTo] = useState('1.50');
  const [cylStep, setCylStep] = useState('0.25');

  const [sphAddFrom, setSphAddFrom] = useState('+1.00');
  const [sphAddTo, setSphAddTo] = useState('+3.00');
  const [sphAddStep, setSphAddStep] = useState('0.25');
  const [cylAddFrom, setCylAddFrom] = useState('+1.00');
  const [cylAddTo, setCylAddTo] = useState('+3.00');
  const [cylAddStep, setCylAddStep] = useState('0.25');
  const [selectedAxis, setSelectedAxis] = useState<number>(KRYPTOK_AXIS_VALUES[0]);

  const [pairsDefault, setPairsDefault] = useState('1');
  const [qtyMap, setQtyMap] = useState<QtyMap>({});

  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [visibleGridCount, setVisibleGridCount] = useState(GRID_PAGE_SIZE);

  const sphList = useMemo(() => {
    const from = parseNumericInput(sphFrom);
    const to = parseNumericInput(sphTo);
    const step = parseStep(sphStep);
    if (from === null || to === null || step === null) return [];
    return buildPowerList(from, to, step);
  }, [sphFrom, sphTo, sphStep]);

  const cylList = useMemo(() => {
    const from = parseNumericInput(cylFrom);
    const to = parseNumericInput(cylTo);
    const step = parseStep(cylStep);
    if (from === null || to === null || step === null) return [];
    return buildPowerList(from, to, step);
  }, [cylFrom, cylTo, cylStep]);

  const isKryptok = item?.lensType === 'Kryptok';
  const isSingleVision = item?.lensType === 'Single Vision';

  const sphAddList = useMemo(() => {
    if (!isKryptok) return [];
    const from = parseNumericInput(sphAddFrom);
    const to = parseNumericInput(sphAddTo);
    const step = parseStep(sphAddStep);
    if (from === null || to === null || step === null) return [];
    return buildPowerList(from, to, step);
  }, [isKryptok, sphAddFrom, sphAddStep, sphAddTo]);

  const cylAddList = useMemo(() => {
    if (!isKryptok) return [];
    const from = parseNumericInput(cylAddFrom);
    const to = parseNumericInput(cylAddTo);
    const step = parseStep(cylAddStep);
    if (from === null || to === null || step === null) return [];
    return buildPowerList(from, to, step);
  }, [cylAddFrom, cylAddStep, cylAddTo, isKryptok]);

  const gridEntries = useMemo((): GridEntry[] => {
    if (Object.keys(qtyMap).length === 0) return [];

    if (isKryptok && mode === 'sph-only') {
      const entries: GridEntry[] = [];
      for (const sph of sphList) {
        for (const sphAdd of sphAddList) {
          const key = qtyKeySphAdd(sph, sphAdd);
          entries.push({
            key,
            label: `SPH ${formatPowerLabel(sph)} · ADD ${formatPowerLabel(sphAdd)}`,
            sph,
            cyl: null,
            add: sphAdd,
            sphAdd,
            cylAdd: null,
            axis: null,
          });
        }
      }
      return entries;
    }

    if (isKryptok && mode === 'cyl-only') {
      const entries: GridEntry[] = [];
      for (const cyl of cylList) {
        for (const cylAdd of cylAddList) {
          const key = qtyKeyCylAxisAdd(cyl, selectedAxis, cylAdd);
          entries.push({
            key,
            label: `CYL ${formatPowerLabel(cyl)} · AXIS ${formatAxisValue(selectedAxis)} · ADD ${formatPowerLabel(cylAdd)}`,
            sph: 0,
            cyl,
            add: cylAdd,
            sphAdd: null,
            cylAdd,
            axis: selectedAxis,
          });
        }
      }
      return entries;
    }

    if (isKryptok && mode === 'compound') {
      const entries: GridEntry[] = [];
      for (const sph of sphList) {
        for (const cyl of cylList) {
          if (!isAllowedCompoundCombo(sph, cyl)) {
            continue;
          }
          for (const sphAdd of sphAddList) {
            for (const cylAdd of cylAddList) {
              const key = qtyKeyCompoundKryptok(sph, cyl, selectedAxis, sphAdd, cylAdd);
              entries.push({
                key,
                label: `SPH ${formatPowerLabel(sph)} ADD ${formatPowerLabel(sphAdd)} · CYL ${formatPowerLabel(cyl)} ADD ${formatPowerLabel(cylAdd)} · AXIS ${formatAxisValue(selectedAxis)}`,
                sph,
                cyl,
                add: sphAdd,
                sphAdd,
                cylAdd,
                axis: selectedAxis,
              });
            }
          }
        }
      }
      return entries;
    }

    if (mode === 'sph-only') {
      return sphList.map((sph) => ({
        key: powerKey(sph),
        label: formatPowerLabel(sph),
        sph,
        cyl: null,
        add: null,
        sphAdd: null,
        cylAdd: null,
        axis: null,
      }));
    }

    if (mode === 'cyl-only') {
      return cylList.map((cyl) => ({
        key: powerKey(cyl),
        label: formatPowerLabel(cyl),
        sph: 0,
        cyl,
        add: null,
        sphAdd: null,
        cylAdd: null,
        axis: null,
      }));
    }

    if (mode === 'compound') {
      const entries: GridEntry[] = [];
      for (const sph of sphList) {
        for (const cyl of cylList) {
          if (isSingleVision && !isAllowedCompoundCombo(sph, cyl)) {
            continue;
          }
          const key = qtyKeyCompound(sph, cyl);
          entries.push({
            key,
            label: `SPH ${formatPowerLabel(sph)} / CYL ${formatPowerLabel(cyl)}`,
            sph,
            cyl,
            add: null,
            sphAdd: null,
            cylAdd: null,
            axis: null,
          });
        }
      }
      return entries;
    }

    return [];
  }, [
    cylAddList,
    cylList,
    isKryptok,
    isSingleVision,
    mode,
    qtyMap,
    selectedAxis,
    sphAddList,
    sphList,
  ]);

  const visibleGridEntries = useMemo(
    () => gridEntries.slice(0, visibleGridCount),
    [gridEntries, visibleGridCount]
  );

  useEffect(() => {
    setVisibleGridCount(GRID_PAGE_SIZE);
  }, [mode]);

  const title = item ? `${item.brand || 'Lens'} • Wholesale` : 'Wholesale';

  function handleContentScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (gridEntries.length <= visibleGridCount) {
      return;
    }
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 160) {
      setVisibleGridCount((current) => Math.min(current + GRID_PAGE_SIZE, gridEntries.length));
    }
  }

  function selectAxis(value: number) {
    setSelectedAxis(value);
  }

  function handleGenerate() {
    setGenerating(true);
    setError(null);

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
      if (isKryptok && sphAddList.length === 0) {
        setError('Enter a valid SPH ADD range (+1 to +3) and step.');
        setGenerating(false);
        return;
      }
      const next: QtyMap = {};
      if (isKryptok) {
        for (const sph of sphList) {
          for (const sphAdd of sphAddList) {
            next[qtyKeySphAdd(sph, sphAdd)] = String(defaultPairs);
          }
        }
      } else {
        for (const sph of sphList) {
          next[powerKey(sph)] = String(defaultPairs);
        }
      }
      setQtyMap(next);
      setVisibleGridCount(GRID_PAGE_SIZE);
      setGenerating(false);
      return;
    }

    if (mode === 'cyl-only') {
      if (cylList.length === 0) {
        setError('Enter a valid CYL range and step.');
        setGenerating(false);
        return;
      }
      if (isKryptok && cylAddList.length === 0) {
        setError('Enter a valid CYL ADD range (+1 to +3) and step.');
        setGenerating(false);
        return;
      }
      const next: QtyMap = {};
      if (isKryptok) {
        for (const cyl of cylList) {
          for (const cylAdd of cylAddList) {
            next[qtyKeyCylAxisAdd(cyl, selectedAxis, cylAdd)] = String(defaultPairs);
          }
        }
      } else {
        for (const cyl of cylList) {
          next[powerKey(cyl)] = String(defaultPairs);
        }
      }
      setQtyMap(next);
      setVisibleGridCount(GRID_PAGE_SIZE);
      setGenerating(false);
      return;
    }

    // compound
    if (sphList.length === 0 || cylList.length === 0) {
      setError('Enter valid SPH and CYL ranges and steps.');
      setGenerating(false);
      return;
    }
    if (isKryptok && (sphAddList.length === 0 || cylAddList.length === 0)) {
      setError('Enter valid SPH ADD and CYL ADD ranges (+1 to +3) and step.');
      setGenerating(false);
      return;
    }
    const next: QtyMap = {};
    if (isKryptok) {
      for (const sph of sphList) {
        for (const cyl of cylList) {
          if (!isAllowedCompoundCombo(sph, cyl)) {
            continue;
          }
          for (const sphAdd of sphAddList) {
            for (const cylAdd of cylAddList) {
              next[qtyKeyCompoundKryptok(sph, cyl, selectedAxis, sphAdd, cylAdd)] =
                String(defaultPairs);
            }
          }
        }
      }
    } else {
      for (const sph of sphList) {
        for (const cyl of cylList) {
          if (isSingleVision && !isAllowedCompoundCombo(sph, cyl)) {
            continue;
          }
          next[qtyKeyCompound(sph, cyl)] = String(defaultPairs);
        }
      }
    }
    if (Object.keys(next).length === 0) {
      setError('No valid combinations for the selected ranges.');
      setGenerating(false);
      return;
    }
    setQtyMap(next);
    setVisibleGridCount(GRID_PAGE_SIZE);
    setGenerating(false);
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

    const entries: {
      sph: number;
      cyl: number | null;
      add: number | null;
      axis: number | null;
      pairs: number;
    }[] = [];

    for (const entry of gridEntries) {
      const pairsText = qtyMap[entry.key];
      const pairs = Number(pairsText);
      if (Number.isInteger(pairs) && pairs >= 1) {
        entries.push({
          sph: entry.sph,
          cyl: entry.cyl,
          add: entry.add,
          axis: entry.axis,
          pairs,
        });
      }
    }

    if (entries.length === 0) {
      setError('Enter at least 1 quantity in the grid.');
      return;
    }

    // Wholesale: pairs only -> convert to pieces (2 per pair).
    const failures: string[] = [];
    let success = 0;

    for (const entry of entries) {
      const pieces = piecesFromDisplayQuantity(entry.pairs, 'pair');
      const cartItem: LensItem = {
        ...item,
        sph: entry.sph,
        cyl: entry.cyl,
        add: entry.add,
        cylAdd: entry.cylAdd,
        axis: entry.axis,
        eye: undefined,
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
          `SPH ${formatPowerLabel(entry.sph)}`,
          entry.sphAdd != null ? `SPH ADD ${formatPowerLabel(entry.sphAdd)}` : null,
          entry.cyl != null ? `CYL ${formatPowerLabel(entry.cyl)}` : null,
          entry.cylAdd != null ? `CYL ADD ${formatPowerLabel(entry.cylAdd)}` : null,
          entry.axis != null ? `AXIS ${formatAxisValue(entry.axis)}` : null,
          entry.add != null && entry.sphAdd == null && entry.cylAdd == null
            ? `ADD ${formatPowerLabel(entry.add)}`
            : null,
        ].filter(Boolean);
        failures.push(`${parts.join(' · ')}: ${err instanceof Error ? err.message : 'Failed'}`);
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

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          onScroll={handleContentScroll}
          scrollEventThrottle={200}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryBrand}>{item.brand || 'Lens'}</Text>
            <Text style={styles.summaryMeta}>{[item.item, item.coating].filter(Boolean).join(' · ') || 'Standard'}</Text>
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

          <Text style={styles.sectionTitle}>Ranges</Text>

          {(mode === 'sph-only' || mode === 'compound') ? (
            <View style={styles.rangeCard}>
              <Text style={styles.rangeTitle}>SPH</Text>
              <View style={styles.rangeRow}>
                <View style={styles.rangeField}>
                  <Text style={styles.fieldLabel}>From</Text>
                  <TextInput
                    value={sphFrom}
                    onChangeText={(t) => setSphFrom(sanitizeSignedNumericInput(t))}
                    keyboardType="numbers-and-punctuation"
                    style={styles.input}
                    placeholder="-6.00"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
                <View style={styles.rangeField}>
                  <Text style={styles.fieldLabel}>To</Text>
                  <TextInput
                    value={sphTo}
                    onChangeText={(t) => setSphTo(sanitizeSignedNumericInput(t))}
                    keyboardType="numbers-and-punctuation"
                    style={styles.input}
                    placeholder="+2.00"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
                <View style={styles.rangeField}>
                  <Text style={styles.fieldLabel}>Step</Text>
                  <TextInput
                    value={sphStep}
                    onChangeText={(t) => setSphStep(sanitizeSignedNumericInput(t))}
                    keyboardType="numbers-and-punctuation"
                    style={styles.input}
                    placeholder="0.25"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
              </View>
              {isKryptok && (mode === 'sph-only' || mode === 'compound') ? (
                <View style={styles.addSection}>
                  <Text style={styles.rangeTitle}>ADD</Text>
                  <View style={styles.rangeRow}>
                    <View style={styles.rangeField}>
                      <Text style={styles.fieldLabel}>From</Text>
                      <TextInput
                        value={sphAddFrom}
                        onChangeText={(t) => setSphAddFrom(sanitizeSignedNumericInput(t))}
                        keyboardType="numbers-and-punctuation"
                        style={styles.input}
                        placeholder="+1.00"
                        placeholderTextColor={colors.placeholder}
                      />
                    </View>
                    <View style={styles.rangeField}>
                      <Text style={styles.fieldLabel}>To</Text>
                      <TextInput
                        value={sphAddTo}
                        onChangeText={(t) => setSphAddTo(sanitizeSignedNumericInput(t))}
                        keyboardType="numbers-and-punctuation"
                        style={styles.input}
                        placeholder="+3.00"
                        placeholderTextColor={colors.placeholder}
                      />
                    </View>
                    <View style={styles.rangeField}>
                      <Text style={styles.fieldLabel}>Step</Text>
                      <TextInput
                        value={sphAddStep}
                        onChangeText={(t) => setSphAddStep(sanitizeSignedNumericInput(t))}
                        keyboardType="numbers-and-punctuation"
                        style={styles.input}
                        placeholder="0.25"
                        placeholderTextColor={colors.placeholder}
                      />
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {(mode === 'cyl-only' || mode === 'compound') ? (
            <View style={styles.rangeCard}>
              <Text style={styles.rangeTitle}>CYL</Text>
              <View style={styles.rangeRow}>
                <View style={styles.rangeField}>
                  <Text style={styles.fieldLabel}>From</Text>
                  <TextInput
                    value={cylFrom}
                    onChangeText={(t) => setCylFrom(sanitizeSignedNumericInput(t))}
                    keyboardType="numbers-and-punctuation"
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
                <View style={styles.rangeField}>
                  <Text style={styles.fieldLabel}>To</Text>
                  <TextInput
                    value={cylTo}
                    onChangeText={(t) => setCylTo(sanitizeSignedNumericInput(t))}
                    keyboardType="numbers-and-punctuation"
                    style={styles.input}
                    placeholder="1.50"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
                <View style={styles.rangeField}>
                  <Text style={styles.fieldLabel}>Step</Text>
                  <TextInput
                    value={cylStep}
                    onChangeText={(t) => setCylStep(sanitizeSignedNumericInput(t))}
                    keyboardType="numbers-and-punctuation"
                    style={styles.input}
                    placeholder="0.25"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
              </View>
              {isKryptok ? (
                <View style={styles.axisSection}>
                  <Text style={styles.fieldLabel}>Axis</Text>
                  <View style={styles.axisRow}>
                    {KRYPTOK_AXIS_VALUES.map((axis) => {
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
              {isKryptok && (mode === 'cyl-only' || mode === 'compound') ? (
                <View style={styles.addSection}>
                  <Text style={styles.rangeTitle}>ADD</Text>
                  <View style={styles.rangeRow}>
                    <View style={styles.rangeField}>
                      <Text style={styles.fieldLabel}>From</Text>
                      <TextInput
                        value={cylAddFrom}
                        onChangeText={(t) => setCylAddFrom(sanitizeSignedNumericInput(t))}
                        keyboardType="numbers-and-punctuation"
                        style={styles.input}
                        placeholder="+1.00"
                        placeholderTextColor={colors.placeholder}
                      />
                    </View>
                    <View style={styles.rangeField}>
                      <Text style={styles.fieldLabel}>To</Text>
                      <TextInput
                        value={cylAddTo}
                        onChangeText={(t) => setCylAddTo(sanitizeSignedNumericInput(t))}
                        keyboardType="numbers-and-punctuation"
                        style={styles.input}
                        placeholder="+3.00"
                        placeholderTextColor={colors.placeholder}
                      />
                    </View>
                    <View style={styles.rangeField}>
                      <Text style={styles.fieldLabel}>Step</Text>
                      <TextInput
                        value={cylAddStep}
                        onChangeText={(t) => setCylAddStep(sanitizeSignedNumericInput(t))}
                        keyboardType="numbers-and-punctuation"
                        style={styles.input}
                        placeholder="0.25"
                        placeholderTextColor={colors.placeholder}
                      />
                    </View>
                  </View>
                </View>
              ) : null}
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
            <Pressable style={styles.generateBtn} onPress={handleGenerate} disabled={generating}>
              <MaterialIcons name="grid-view" size={18} color={colors.primaryText} />
              <Text style={styles.generateBtnText}>Generate</Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.sectionTitle}>Quantity grid</Text>
          {Object.keys(qtyMap).length === 0 ? (
            <View style={styles.emptyGrid}>
              <Text style={styles.emptyGridText}>Tap “Generate” to create the grid.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.gridCountHint}>
                Showing {visibleGridEntries.length} of {gridEntries.length} combination
                {gridEntries.length === 1 ? '' : 's'}
                {visibleGridEntries.length < gridEntries.length ? ' · scroll for more' : ''}
              </Text>
              <View style={styles.listGrid}>
                {visibleGridEntries.map((entry) => (
                  <View key={entry.key} style={styles.listRow}>
                    <Text style={styles.listPower} numberOfLines={2}>
                      {entry.label}
                    </Text>
                    <View style={styles.listQtyBox}>
                      <TextInput
                        value={qtyMap[entry.key] ?? ''}
                        onChangeText={(t) =>
                          setQtyMap((cur) => ({ ...cur, [entry.key]: normalizePairsText(t) }))
                        }
                        keyboardType="number-pad"
                        style={styles.listQtyInput}
                        placeholder="0"
                        placeholderTextColor={colors.placeholder}
                      />
                      <Text style={styles.listQtySuffix}>pairs</Text>
                    </View>
                  </View>
                ))}
              </View>
              {visibleGridEntries.length < gridEntries.length ? (
                <Pressable
                  style={styles.loadMoreBtn}
                  onPress={() =>
                    setVisibleGridCount((current) =>
                      Math.min(current + GRID_PAGE_SIZE, gridEntries.length)
                    )
                  }>
                  <Text style={styles.loadMoreText}>
                    Load more ({gridEntries.length - visibleGridEntries.length} remaining)
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
    rangeRow: { flexDirection: 'row', gap: 10 },
    rangeField: { flex: 1, gap: 6 },
    fieldLabel: { color: c.textMuted, fontSize: 11, fontWeight: '700' },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
      backgroundColor: c.inputBg,
      textAlign: 'center',
    },
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
    generateBtnText: { color: c.primaryText, fontSize: 13, fontWeight: '900' },
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
    listGrid: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      overflow: 'hidden',
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.cardBorder,
    },
    addSection: { gap: 10, marginTop: 4 },
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
    listPower: { color: c.text, fontSize: 14, fontWeight: '900', flex: 1, paddingRight: 8 },
    listQtyBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    listQtyInput: {
      width: 68,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 14,
      fontWeight: '900',
      color: c.text,
      backgroundColor: c.inputBg,
      textAlign: 'center',
    },
    listQtySuffix: { color: c.textMuted, fontSize: 12, fontWeight: '700' },
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

