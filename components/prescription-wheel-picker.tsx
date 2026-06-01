import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand-colors';
import { formatPowerLabel } from '@/lib/cart-utils';

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 3;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;

type PrescriptionWheelPickerProps = {
  label: string;
  options: number[];
  value: number | null;
  onChange: (value: number) => void;
};

export function PrescriptionWheelPicker({ label, options, value, onChange }: PrescriptionWheelPickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = value === null ? -1 : options.findIndex((option) => option === value);

  useEffect(() => {
    if (selectedIndex < 0 || !scrollRef.current) {
      return;
    }
    scrollRef.current.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
  }, [selectedIndex, options.length]);

  function handleMomentumScrollEnd(offsetY: number) {
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, options.length - 1));
    const next = options[clamped];
    if (next !== undefined) {
      onChange(next);
      scrollRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true });
    }
  }

  if (options.length === 0) {
    return (
      <View style={styles.column}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.pickerShell, styles.emptyShell]}>
          <Text style={styles.emptyText}>—</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.column}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pickerShell}>
        <View style={styles.selectionBand} pointerEvents="none" />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          nestedScrollEnabled
          contentContainerStyle={{
            paddingVertical: ITEM_HEIGHT,
          }}
          onMomentumScrollEnd={(event) => handleMomentumScrollEnd(event.nativeEvent.contentOffset.y)}
          onScrollEndDrag={(event) => handleMomentumScrollEnd(event.nativeEvent.contentOffset.y)}
          style={styles.scroll}>
          {options.map((option) => {
            const isSelected = value !== null && Math.abs(option - value) < 0.001;
            return (
              <Pressable
                key={option}
                style={styles.optionRow}
                onPress={() => {
                  onChange(option);
                  const index = options.indexOf(option);
                  scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
                }}>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {formatPowerLabel(option)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { flex: 1 },
  label: {
    color: BrandColors.label,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pickerShell: {
    height: PICKER_HEIGHT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.cardBorder,
    backgroundColor: BrandColors.inputBg,
    overflow: 'hidden',
  },
  emptyShell: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: BrandColors.textMuted, fontSize: 16, fontWeight: '600' },
  scroll: { flex: 1 },
  optionRow: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    color: BrandColors.textMuted,
    fontSize: 16,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: BrandColors.text,
    fontWeight: '700',
    fontSize: 17,
  },
  selectionBand: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: ITEM_HEIGHT,
    height: ITEM_HEIGHT,
    borderRadius: 10,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    zIndex: 1,
  },
});
