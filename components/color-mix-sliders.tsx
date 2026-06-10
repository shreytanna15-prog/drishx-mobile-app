'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { clamp, hslToHex } from '@/lib/color-utils';
import {
  lightnessFromTouchYWorklet,
  thumbTopFromLightnessWorklet,
} from '@/lib/color-wheel-worklets';
import type { WheelColor } from '@/components/color-wheel-picker';

const LIGHTNESS_THUMB_SIZE = 26;
const LIGHTNESS_TRACK_HEIGHT = 200;
const LIGHTNESS_RAIL_WIDTH = 36;
const TINT_THUMB_SIZE = 24;

type LightnessSliderProps = {
  color: WheelColor;
  label?: string;
  onChange: (nextLightness: number) => void;
};

export function LightnessSlider({ color, label = 'Brightness', onChange }: LightnessSliderProps) {
  const styles = useThemedStyles(createStyles);
  const onChangeRef = useRef(onChange);
  const isDraggingRef = useRef(false);
  const [displayPercent, setDisplayPercent] = useState(color.l);

  const trackHeightSV = useSharedValue(LIGHTNESS_TRACK_HEIGHT);
  const lightnessSV = useSharedValue(color.l);
  const thumbTopSV = useSharedValue(
    thumbTopFromLightnessWorklet(color.l, LIGHTNESS_TRACK_HEIGHT, LIGHTNESS_THUMB_SIZE)
  );

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (isDraggingRef.current) return;
    lightnessSV.value = color.l;
    thumbTopSV.value = thumbTopFromLightnessWorklet(
      color.l,
      trackHeightSV.value,
      LIGHTNESS_THUMB_SIZE
    );
    setDisplayPercent(color.l);
  }, [color.l, lightnessSV, thumbTopSV, trackHeightSV]);

  const topColor = hslToHex({ h: color.h, s: color.s, l: 92 });
  const bottomColor = hslToHex({ h: color.h, s: color.s, l: 8 });

  const setDragging = useCallback((dragging: boolean) => {
    isDraggingRef.current = dragging;
  }, []);

  const finishDrag = useCallback((lightness: number) => {
    isDraggingRef.current = false;
    const next = Math.round(lightness);
    setDisplayPercent(next);
    onChangeRef.current(next);
  }, []);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .activeOffsetX([-12, 12])
        .shouldCancelWhenOutside(false)
        .onBegin((event) => {
          runOnJS(setDragging)(true);
          const next = lightnessFromTouchYWorklet(
            event.y,
            trackHeightSV.value,
            LIGHTNESS_THUMB_SIZE
          );
          lightnessSV.value = next;
          thumbTopSV.value = thumbTopFromLightnessWorklet(
            next,
            trackHeightSV.value,
            LIGHTNESS_THUMB_SIZE
          );
        })
        .onUpdate((event) => {
          const next = lightnessFromTouchYWorklet(
            event.y,
            trackHeightSV.value,
            LIGHTNESS_THUMB_SIZE
          );
          lightnessSV.value = next;
          thumbTopSV.value = thumbTopFromLightnessWorklet(
            next,
            trackHeightSV.value,
            LIGHTNESS_THUMB_SIZE
          );
        })
        .onEnd(() => {
          runOnJS(finishDrag)(lightnessSV.value);
        })
        .onFinalize(() => {
          runOnJS(setDragging)(false);
        }),
    [finishDrag, lightnessSV, setDragging, thumbTopSV, trackHeightSV]
  );

  const thumbStyle = useAnimatedStyle(() => ({
    top: thumbTopSV.value,
  }));

  return (
    <View style={styles.lightnessColumn}>
      <Text style={styles.lightnessLabel}>{label}</Text>
      <GestureDetector gesture={panGesture}>
        <View
          style={[styles.lightnessTrackTouch, { height: LIGHTNESS_TRACK_HEIGHT }]}
          onLayout={(event) => {
            trackHeightSV.value = event.nativeEvent.layout.height;
          }}>
          <View style={[styles.lightnessTrackRail, { height: LIGHTNESS_TRACK_HEIGHT }]}>
            <Svg
              width={LIGHTNESS_RAIL_WIDTH}
              height={LIGHTNESS_TRACK_HEIGHT}
              style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id={`lightness-${color.id}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={topColor} />
                  <Stop offset="1" stopColor={bottomColor} />
                </LinearGradient>
              </Defs>
              <Rect
                x="0"
                y="0"
                width={LIGHTNESS_RAIL_WIDTH}
                height={LIGHTNESS_TRACK_HEIGHT}
                rx="18"
                fill={`url(#lightness-${color.id})`}
              />
            </Svg>
          </View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.lightnessThumb,
              thumbStyle,
              { borderColor: color.hex },
            ]}>
            <View style={[styles.lightnessThumbInner, { backgroundColor: color.hex }]} />
          </Animated.View>
        </View>
      </GestureDetector>
      <Text style={styles.lightnessValue}>{displayPercent}%</Text>
    </View>
  );
}

type TintStrengthSliderProps = {
  value: number;
  accentHex: string;
  onChange: (value: number) => void;
};

export function TintStrengthSlider({ value, accentHex, onChange }: TintStrengthSliderProps) {
  const styles = useThemedStyles(createStyles);
  const onChangeRef = useRef(onChange);
  const isDraggingRef = useRef(false);

  const trackWidthSV = useSharedValue(0);
  const valueSV = useSharedValue(value);
  const thumbLeftSV = useSharedValue(0);
  const fillWidthSV = useSharedValue(0);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (isDraggingRef.current) return;
    valueSV.value = value;
    const usable = Math.max(trackWidthSV.value - TINT_THUMB_SIZE, 1);
    const left = (clamp(value, 0, 100) / 100) * usable;
    thumbLeftSV.value = left;
    fillWidthSV.value = left + TINT_THUMB_SIZE / 2;
  }, [fillWidthSV, thumbLeftSV, trackWidthSV, value, valueSV]);

  const setDragging = useCallback((dragging: boolean) => {
    isDraggingRef.current = dragging;
  }, []);

  const finishDrag = useCallback((nextValue: number) => {
    isDraggingRef.current = false;
    onChangeRef.current(Math.round(nextValue));
  }, []);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .activeOffsetY([-12, 12])
        .shouldCancelWhenOutside(false)
        .onBegin((event) => {
          runOnJS(setDragging)(true);
          const usable = Math.max(trackWidthSV.value - TINT_THUMB_SIZE, 1);
          const adjustedX = Math.min(
            Math.max(event.x - TINT_THUMB_SIZE / 2, 0),
            usable
          );
          const next = (adjustedX / usable) * 100;
          valueSV.value = next;
          thumbLeftSV.value = adjustedX;
          fillWidthSV.value = adjustedX + TINT_THUMB_SIZE / 2;
        })
        .onUpdate((event) => {
          const usable = Math.max(trackWidthSV.value - TINT_THUMB_SIZE, 1);
          const adjustedX = Math.min(
            Math.max(event.x - TINT_THUMB_SIZE / 2, 0),
            usable
          );
          const next = (adjustedX / usable) * 100;
          valueSV.value = next;
          thumbLeftSV.value = adjustedX;
          fillWidthSV.value = adjustedX + TINT_THUMB_SIZE / 2;
        })
        .onEnd(() => {
          runOnJS(finishDrag)(valueSV.value);
        })
        .onFinalize(() => {
          runOnJS(setDragging)(false);
        }),
    [fillWidthSV, finishDrag, setDragging, thumbLeftSV, trackWidthSV, valueSV]
  );

  const thumbStyle = useAnimatedStyle(() => ({
    left: thumbLeftSV.value,
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: fillWidthSV.value,
  }));

  return (
    <View style={styles.tintTrackWrap}>
      <GestureDetector gesture={panGesture}>
        <View
          style={styles.tintTrack}
          onLayout={(event) => {
            const width = event.nativeEvent.layout.width;
            trackWidthSV.value = width;
            const usable = Math.max(width - TINT_THUMB_SIZE, 1);
            const left = (clamp(value, 0, 100) / 100) * usable;
            thumbLeftSV.value = left;
            fillWidthSV.value = left + TINT_THUMB_SIZE / 2;
          }}>
          <View style={styles.tintTrackRail} />
          <Animated.View
            style={[styles.tintFill, fillStyle, { backgroundColor: accentHex }]}
          />
          <Animated.View
            pointerEvents="none"
            style={[styles.tintThumb, thumbStyle, { borderColor: accentHex }]}
          />
        </View>
      </GestureDetector>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    lightnessColumn: {
      alignItems: 'center',
      gap: 8,
      width: 52,
    },
    lightnessLabel: {
      color: c.textMuted,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    lightnessTrackTouch: {
      width: 52,
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    lightnessTrackRail: {
      width: LIGHTNESS_RAIL_WIDTH,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: c.menuRow,
    },
    lightnessThumb: {
      position: 'absolute',
      left: (52 - LIGHTNESS_THUMB_SIZE) / 2,
      width: LIGHTNESS_THUMB_SIZE,
      height: LIGHTNESS_THUMB_SIZE,
      borderRadius: LIGHTNESS_THUMB_SIZE / 2,
      backgroundColor: '#FFFFFF',
      borderWidth: 3,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 4,
      elevation: 3,
    },
    lightnessThumbInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    lightnessValue: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    tintTrackWrap: {
      minHeight: 44,
      justifyContent: 'center',
      paddingVertical: 10,
    },
    tintTrack: {
      height: 44,
      justifyContent: 'center',
      overflow: 'visible',
    },
    tintTrackRail: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: (44 - 8) / 2,
      height: 8,
      borderRadius: 999,
      backgroundColor: c.menuRow,
    },
    tintFill: {
      position: 'absolute',
      left: 0,
      top: (44 - 8) / 2,
      height: 8,
      borderRadius: 999,
      opacity: 0.9,
    },
    tintThumb: {
      position: 'absolute',
      top: (44 - TINT_THUMB_SIZE) / 2,
      width: TINT_THUMB_SIZE,
      height: TINT_THUMB_SIZE,
      borderRadius: TINT_THUMB_SIZE / 2,
      backgroundColor: '#FFFFFF',
      borderWidth: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 2,
    },
  });
