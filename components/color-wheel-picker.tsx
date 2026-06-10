'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, G, Path } from 'react-native-svg';

import {
  clamp,
  hslToHex,
  hueSatToPosition,
  type HslColor,
} from '@/lib/color-utils';
import { touchToHueSatWorklet } from '@/lib/color-wheel-worklets';

const SEGMENTS = 72;
const MAX_THUMBS = 3;
const THUMB_ACTIVE_R = 11;
const THUMB_INACTIVE_R = 9;

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function ringSegmentPath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const startOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
  const endOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
  const startInner = polarToCartesian(cx, cy, innerRadius, endAngle);
  const endInner = polarToCartesian(cx, cy, innerRadius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ');
}

export type WheelColor = HslColor & {
  id: string;
  hex: string;
};

type WheelRingProps = {
  size: number;
  center: number;
  innerRadius: number;
  outerRadius: number;
  centerFill: string;
};

const WheelRing = memo(function WheelRing({
  size,
  center,
  innerRadius,
  outerRadius,
  centerFill,
}: WheelRingProps) {
  const segments = useMemo(() => {
    if (size <= 0) return [];
    const step = 360 / SEGMENTS;
    return Array.from({ length: SEGMENTS }, (_, index) => {
      const start = index * step;
      const end = start + step;
      const hue = start + step / 2;
      return {
        key: index,
        path: ringSegmentPath(center, center, innerRadius, outerRadius, start, end),
        fill: `hsl(${hue}, 100%, 50%)`,
      };
    });
  }, [center, innerRadius, outerRadius, size]);

  return (
    <Svg width={size} height={size}>
      <G>
        {segments.map((segment) => (
          <Path key={segment.key} d={segment.path} fill={segment.fill} />
        ))}
      </G>
      <Circle cx={center} cy={center} r={innerRadius - 6} fill={centerFill} />
    </Svg>
  );
});

type WheelThumbProps = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  radius: number;
  hex: string;
  active: boolean;
};

function WheelThumb({ x, y, radius, hex, active }: WheelThumbProps) {
  const positionStyle = useAnimatedStyle(() => ({
    left: x.value - radius,
    top: y.value - radius,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wheelThumb,
        positionStyle,
        {
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
          backgroundColor: hex,
          borderWidth: active ? 3 : 2,
          borderColor: active ? '#FFFFFF' : 'rgba(255,255,255,0.85)',
        },
      ]}
    />
  );
}

type ColorWheelPickerProps = {
  colors: WheelColor[];
  activeColorId: string;
  onColorChange: (id: string, next: HslColor) => void;
  centerFill?: string;
};

export function ColorWheelPicker({
  colors,
  activeColorId,
  onColorChange,
  centerFill = 'rgba(15, 22, 32, 0.95)',
}: ColorWheelPickerProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const onColorChangeRef = useRef(onColorChange);
  const colorsRef = useRef(colors);
  const activeColorIdRef = useRef(activeColorId);
  const isDraggingRef = useRef(false);

  const size = Math.min(layout.width, layout.height, 280);
  const center = size / 2;
  const outerRadius = size * 0.46;
  const innerRadius = size * 0.28;

  const wheelSize = useSharedValue(0);
  const wheelCenter = useSharedValue(0);
  const wheelInnerR = useSharedValue(0);
  const wheelOuterR = useSharedValue(0);
  const activeIndexSV = useSharedValue(0);
  const activeLightnessSV = useSharedValue(50);
  const pendingH = useSharedValue(0);
  const pendingS = useSharedValue(0);

  const thumbX0 = useSharedValue(0);
  const thumbX1 = useSharedValue(0);
  const thumbX2 = useSharedValue(0);
  const thumbY0 = useSharedValue(0);
  const thumbY1 = useSharedValue(0);
  const thumbY2 = useSharedValue(0);

  useEffect(() => {
    onColorChangeRef.current = onColorChange;
  }, [onColorChange]);

  useEffect(() => {
    colorsRef.current = colors;
    activeColorIdRef.current = activeColorId;
  }, [colors, activeColorId]);

  const setThumbPosition = useCallback(
    (index: number, x: number, y: number) => {
      if (index === 0) {
        thumbX0.value = x;
        thumbY0.value = y;
      } else if (index === 1) {
        thumbX1.value = x;
        thumbY1.value = y;
      } else if (index === 2) {
        thumbX2.value = x;
        thumbY2.value = y;
      }
    },
    [thumbX0, thumbX1, thumbX2, thumbY0, thumbY1, thumbY2]
  );

  const syncThumbPositions = useCallback(() => {
    if (size <= 0 || isDraggingRef.current) return;

    const activeIndex = colors.findIndex((entry) => entry.id === activeColorId);
    activeIndexSV.value = activeIndex >= 0 ? activeIndex : 0;

    const active = colors[activeIndex >= 0 ? activeIndex : 0];
    if (active) {
      activeLightnessSV.value = active.l;
    }

    colors.slice(0, MAX_THUMBS).forEach((entry, index) => {
      const position = hueSatToPosition(
        entry.h,
        entry.s,
        center,
        center,
        innerRadius,
        outerRadius
      );
      setThumbPosition(index, position.x, position.y);
    });
  }, [
    activeColorId,
    activeIndexSV,
    activeLightnessSV,
    center,
    colors,
    innerRadius,
    outerRadius,
    setThumbPosition,
    size,
  ]);

  useEffect(() => {
    wheelSize.value = size;
    wheelCenter.value = center;
    wheelInnerR.value = innerRadius;
    wheelOuterR.value = outerRadius;
    syncThumbPositions();
  }, [center, innerRadius, outerRadius, size, syncThumbPositions, wheelCenter, wheelInnerR, wheelOuterR, wheelSize]);

  const setDragging = useCallback((dragging: boolean) => {
    isDraggingRef.current = dragging;
  }, []);

  const commitDrag = useCallback((h: number, s: number, l: number) => {
    isDraggingRef.current = false;
    onColorChangeRef.current(activeColorIdRef.current, { h, s, l });
  }, []);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .shouldCancelWhenOutside(false)
        .onBegin((event) => {
          runOnJS(setDragging)(true);
          const picked = touchToHueSatWorklet(
            event.x,
            event.y,
            wheelCenter.value,
            wheelCenter.value,
            wheelInnerR.value,
            wheelOuterR.value
          );
          if (!picked) return;

          pendingH.value = picked.h;
          pendingS.value = picked.s;

          const index = activeIndexSV.value;
          if (index < 0 || index >= MAX_THUMBS) return;

          const radius =
            wheelInnerR.value +
            (picked.s / 100) * (wheelOuterR.value - wheelInnerR.value);
          const angle = ((picked.h - 90) * Math.PI) / 180;
          const nextX = wheelCenter.value + radius * Math.cos(angle);
          const nextY = wheelCenter.value + radius * Math.sin(angle);
          if (index === 0) {
            thumbX0.value = nextX;
            thumbY0.value = nextY;
          } else if (index === 1) {
            thumbX1.value = nextX;
            thumbY1.value = nextY;
          } else {
            thumbX2.value = nextX;
            thumbY2.value = nextY;
          }
        })
        .onUpdate((event) => {
          const picked = touchToHueSatWorklet(
            event.x,
            event.y,
            wheelCenter.value,
            wheelCenter.value,
            wheelInnerR.value,
            wheelOuterR.value
          );
          if (!picked) return;

          pendingH.value = picked.h;
          pendingS.value = picked.s;

          const index = activeIndexSV.value;
          if (index < 0 || index >= MAX_THUMBS) return;

          const radius =
            wheelInnerR.value +
            (picked.s / 100) * (wheelOuterR.value - wheelInnerR.value);
          const angle = ((picked.h - 90) * Math.PI) / 180;
          const nextX = wheelCenter.value + radius * Math.cos(angle);
          const nextY = wheelCenter.value + radius * Math.sin(angle);
          if (index === 0) {
            thumbX0.value = nextX;
            thumbY0.value = nextY;
          } else if (index === 1) {
            thumbX1.value = nextX;
            thumbY1.value = nextY;
          } else {
            thumbX2.value = nextX;
            thumbY2.value = nextY;
          }
        })
        .onEnd(() => {
          runOnJS(commitDrag)(pendingH.value, pendingS.value, activeLightnessSV.value);
        })
        .onFinalize(() => {
          runOnJS(setDragging)(false);
        }),
    [
      activeIndexSV,
      activeLightnessSV,
      commitDrag,
      pendingH,
      pendingS,
      setDragging,
      thumbX0,
      thumbX1,
      thumbX2,
      thumbY0,
      thumbY1,
      thumbY2,
      wheelCenter,
      wheelInnerR,
      wheelOuterR,
    ]
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {size > 0 ? (
        <GestureDetector gesture={panGesture}>
          <View style={[styles.wheelSurface, { width: size, height: size }]}>
            <WheelRing
              size={size}
              center={center}
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              centerFill={centerFill}
            />
            {colors.slice(0, MAX_THUMBS).map((entry, index) => {
              const thumbX = index === 0 ? thumbX0 : index === 1 ? thumbX1 : thumbX2;
              const thumbY = index === 0 ? thumbY0 : index === 1 ? thumbY1 : thumbY2;
              return (
                <WheelThumb
                  key={entry.id}
                  x={thumbX}
                  y={thumbY}
                  radius={entry.id === activeColorId ? THUMB_ACTIVE_R : THUMB_INACTIVE_R}
                  hex={entry.hex}
                  active={entry.id === activeColorId}
                />
              );
            })}
          </View>
        </GestureDetector>
      ) : null}
    </View>
  );
}

export function createWheelColor(id: string, hsl: HslColor): WheelColor {
  const normalized = {
    h: clamp(hsl.h, 0, 360),
    s: clamp(hsl.s, 0, 100),
    l: clamp(hsl.l, 0, 100),
  };
  return {
    id,
    ...normalized,
    hex: hslToHex(normalized),
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 260,
  },
  wheelSurface: {
    position: 'relative',
  },
  wheelThumb: {
    position: 'absolute',
  },
});
