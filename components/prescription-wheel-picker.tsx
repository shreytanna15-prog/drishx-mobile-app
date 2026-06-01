import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { BrandColors } from '@/constants/brand-colors';
import { formatPowerLabel } from '@/lib/cart-utils';

const ITEM_HEIGHT = 44;
const VISIBLE_COUNT = 3;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;
type PrescriptionWheelPickerProps = {
  options: number[];
  value: number | null;
  onChange: (value: number) => void;
};

function findOptionIndex(options: number[], value: number | null): number {
  if (value === null) return 0;
  const index = options.findIndex((option) => Math.abs(option - value) < 0.001);
  return index >= 0 ? index : 0;
}

type PickerRowProps = {
  index: number;
  label: string;
  scrollY: SharedValue<number>;
  onPress: () => void;
};

function PickerRow({ index, label, scrollY, onPress }: PickerRowProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(scrollY.value - index * ITEM_HEIGHT);
    const opacity = interpolate(distance, [0, ITEM_HEIGHT * 1.1], [1, 0.18], Extrapolation.CLAMP);
    const scale = interpolate(distance, [0, ITEM_HEIGHT * 1.1], [1, 0.9], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <Pressable onPress={onPress} style={styles.optionRow}>
      <Animated.View style={[styles.optionInner, animatedStyle]}>
        <Text style={styles.optionText}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export function PrescriptionWheelPicker({ options, value, onChange }: PrescriptionWheelPickerProps) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const lastIndexRef = useRef(findOptionIndex(options, value));

  const snapOffsets = useMemo(() => options.map((_, index) => index * ITEM_HEIGHT), [options]);
  const centerPadding = (PICKER_HEIGHT - ITEM_HEIGHT) / 2;

  const emitSelection = useCallback(
    (index: number, haptic: boolean) => {
      const clamped = Math.max(0, Math.min(index, options.length - 1));
      if (clamped === lastIndexRef.current) return;
      lastIndexRef.current = clamped;
      const next = options[clamped];
      if (next !== undefined) {
        onChange(next);
        if (haptic) {
          void Haptics.selectionAsync();
        }
      }
    },
    [onChange, options]
  );

  const scrollToIndex = useCallback(
    (index: number, animated: boolean) => {
      const y = index * ITEM_HEIGHT;
      scrollY.value = y;
      scrollRef.current?.scrollTo({ y, animated });
    },
    [scrollRef, scrollY]
  );

  useEffect(() => {
    const index = findOptionIndex(options, value);
    lastIndexRef.current = index;
    scrollToIndex(index, false);
  }, [options, value, scrollToIndex]);

  const settleAt = useCallback(
    (offsetY: number) => {
      const index = Math.max(0, Math.min(Math.round(offsetY / ITEM_HEIGHT), options.length - 1));
      scrollToIndex(index, true);
      emitSelection(index, true);
    },
    [emitSelection, options.length, scrollToIndex]
  );

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
    onEndDrag: (event) => {
      const velocityY = event.velocity?.y ?? 0;
      if (Math.abs(velocityY) < 0.2) {
        runOnJS(settleAt)(event.contentOffset.y);
      }
    },
    onMomentumEnd: (event) => {
      runOnJS(settleAt)(event.contentOffset.y);
    },
  });

  if (options.length === 0) {
    return (
      <View style={styles.pickerShell}>
        <Text style={styles.emptyText}>—</Text>
      </View>
    );
  }

  if (options.length === 1) {
    const only = options[0]!;
    return (
      <View style={styles.pickerShell}>
        <View style={styles.optionRow}>
          <Text style={styles.singleValue}>{formatPowerLabel(only)}</Text>
        </View>
        <View style={styles.focusRail} pointerEvents="none" />
      </View>
    );
  }

  return (
    <View style={styles.pickerShell}>
      <View style={styles.focusRail} pointerEvents="none" />

      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToOffsets={snapOffsets}
        decelerationRate={Platform.OS === 'ios' ? 0.99 : 0.985}
        nestedScrollEnabled
        overScrollMode="never"
        bounces={false}
        scrollEventThrottle={1}
        onScroll={onScroll}
        contentContainerStyle={{ paddingVertical: centerPadding }}
        style={styles.scroll}>
        {options.map((option, index) => (
          <PickerRow
            key={`${option}-${index}`}
            index={index}
            label={formatPowerLabel(option)}
            scrollY={scrollY}
            onPress={() => {
              scrollToIndex(index, true);
              emitSelection(index, true);
            }}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pickerShell: {
    height: PICKER_HEIGHT,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  optionRow: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    color: BrandColors.text,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
  singleValue: {
    color: BrandColors.text,
    fontSize: 17,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  emptyText: {
    color: BrandColors.textMuted,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  focusRail: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: (PICKER_HEIGHT - ITEM_HEIGHT) / 2,
    height: ITEM_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(240, 161, 50, 0.35)',
    zIndex: 2,
  },
});
