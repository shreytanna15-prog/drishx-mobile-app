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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import { sanitizePositiveIntegerInput, sanitizeSignedNumericInput, formatPowerLabel, parseNumericInput } from '@/lib/cart-utils';
import { useCart } from '@/lib/cart';
import { useOrderMode } from '@/lib/order-mode';
import { piecesFromDisplayQuantity } from '@/lib/order-quantity';
import { buildPowerList, parseStep, powerKey, type WholesaleGridMode } from '@/lib/wholesale-powers';
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

function qtyKeyCompound(sph: number, cyl: number) {
  return `${powerKey(sph)}|${powerKey(cyl)}`;
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

  const [pairsDefault, setPairsDefault] = useState('1');
  const [qtyMap, setQtyMap] = useState<QtyMap>({});

  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

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

  const title = item ? `${item.brand || 'Lens'} • Wholesale` : 'Wholesale';

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
      const next: QtyMap = {};
      for (const sph of sphList) {
        next[powerKey(sph)] = String(defaultPairs);
      }
      setQtyMap(next);
      setGenerating(false);
      return;
    }

    if (mode === 'cyl-only') {
      if (cylList.length === 0) {
        setError('Enter a valid CYL range and step.');
        setGenerating(false);
        return;
      }
      const next: QtyMap = {};
      for (const cyl of cylList) {
        next[powerKey(cyl)] = String(defaultPairs);
      }
      setQtyMap(next);
      setGenerating(false);
      return;
    }

    // compound
    if (sphList.length === 0 || cylList.length === 0) {
      setError('Enter valid SPH and CYL ranges and steps.');
      setGenerating(false);
      return;
    }
    if (sphList.length * cylList.length > 350) {
      setError('Grid is too large. Reduce ranges or increase step.');
      setGenerating(false);
      return;
    }
    const next: QtyMap = {};
    for (const sph of sphList) {
      for (const cyl of cylList) {
        next[qtyKeyCompound(sph, cyl)] = String(defaultPairs);
      }
    }
    setQtyMap(next);
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

    const entries: { sph: number; cyl: number | null; pairs: number }[] = [];

    if (mode === 'sph-only') {
      for (const sph of sphList) {
        const pairsText = qtyMap[powerKey(sph)];
        const pairs = Number(pairsText);
        if (Number.isInteger(pairs) && pairs >= 1) {
          entries.push({ sph, cyl: null, pairs });
        }
      }
    } else if (mode === 'cyl-only') {
      for (const cyl of cylList) {
        const pairsText = qtyMap[powerKey(cyl)];
        const pairs = Number(pairsText);
        if (Number.isInteger(pairs) && pairs >= 1) {
          // If user chooses CYL-only, we keep SPH 0.00.
          entries.push({ sph: 0, cyl, pairs });
        }
      }
    } else {
      for (const sph of sphList) {
        for (const cyl of cylList) {
          const pairsText = qtyMap[qtyKeyCompound(sph, cyl)];
          const pairs = Number(pairsText);
          if (Number.isInteger(pairs) && pairs >= 1) {
            entries.push({ sph, cyl, pairs });
          }
        }
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
        add: null,
        axis: null,
        eye: undefined,
      };

      const lineId = `${cartItem.id}:${cartItem.sph}:${cartItem.cyl ?? ''}:${cartItem.add ?? ''}`;
      const existing = cartItems.find((x) => x.cartLineId === lineId);
      try {
        if (existing) {
          await updateQuantity(lineId, pieces);
        } else {
          await addToCart(cartItem, pieces);
        }
        success += 1;
      } catch (err) {
        failures.push(`${formatPowerLabel(entry.sph)} / ${entry.cyl == null ? '—' : formatPowerLabel(entry.cyl)}: ${err instanceof Error ? err.message : 'Failed'}`);
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
          ) : mode === 'compound' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.gridWrap}>
                <View style={styles.gridHeaderRow}>
                  <View style={[styles.gridCell, styles.gridHeaderCell, styles.gridCornerCell]}>
                    <Text style={styles.gridHeaderText}>CYL \ SPH</Text>
                  </View>
                  {sphList.map((sph) => (
                    <View key={powerKey(sph)} style={[styles.gridCell, styles.gridHeaderCell]}>
                      <Text style={styles.gridHeaderText}>{formatPowerLabel(sph)}</Text>
                    </View>
                  ))}
                </View>
                {cylList.map((cyl) => (
                  <View key={powerKey(cyl)} style={styles.gridRow}>
                    <View style={[styles.gridCell, styles.gridHeaderCell]}>
                      <Text style={styles.gridHeaderText}>{formatPowerLabel(cyl)}</Text>
                    </View>
                    {sphList.map((sph) => {
                      const key = qtyKeyCompound(sph, cyl);
                      return (
                        <View key={key} style={styles.gridCell}>
                          <TextInput
                            value={qtyMap[key] ?? ''}
                            onChangeText={(t) =>
                              setQtyMap((cur) => ({ ...cur, [key]: normalizePairsText(t) }))
                            }
                            keyboardType="number-pad"
                            style={styles.gridInput}
                            placeholder="0"
                            placeholderTextColor={colors.placeholder}
                          />
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.listGrid}>
              {(mode === 'sph-only' ? sphList : cylList).map((v) => {
                const key = powerKey(v);
                return (
                  <View key={key} style={styles.listRow}>
                    <Text style={styles.listPower}>{formatPowerLabel(v)}</Text>
                    <View style={styles.listQtyBox}>
                      <TextInput
                        value={qtyMap[key] ?? ''}
                        onChangeText={(t) => setQtyMap((cur) => ({ ...cur, [key]: normalizePairsText(t) }))}
                        keyboardType="number-pad"
                        style={styles.listQtyInput}
                        placeholder="0"
                        placeholderTextColor={colors.placeholder}
                      />
                      <Text style={styles.listQtySuffix}>pairs</Text>
                    </View>
                  </View>
                );
              })}
            </View>
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
    gridWrap: {
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: c.card,
    },
    gridHeaderRow: { flexDirection: 'row' },
    gridRow: { flexDirection: 'row' },
    gridCell: {
      width: 86,
      height: 46,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
    },
    gridHeaderCell: { backgroundColor: c.menuRowAlt },
    gridCornerCell: { width: 110 },
    gridHeaderText: { color: c.text, fontSize: 11, fontWeight: '800' },
    gridInput: {
      width: '100%',
      height: '100%',
      textAlign: 'center',
      color: c.text,
      fontWeight: '900',
      fontSize: 13,
      padding: 0,
      backgroundColor: c.inputBg,
    },
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
    listPower: { color: c.text, fontSize: 14, fontWeight: '900' },
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

