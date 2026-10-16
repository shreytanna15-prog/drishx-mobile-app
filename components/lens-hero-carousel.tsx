import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import {
  catalogImageForHomeCategory,
  type CatalogImagesResponse,
} from '@/lib/catalog-images-api';
import { CLIENT_HOME_CATEGORIES } from '@/lib/home-categories-api';

const CYCLE_MS = 3500;
const FADE_MS = 700;
const PANEL_HEIGHT = 200;

function heroLabel(categoryId: string, fallback: string): string {
  if (categoryId === 'singlevision') return 'Single Vision';
  if (categoryId === 'white') return 'White (Glass)';
  return fallback;
}

type LensHeroCarouselProps = {
  images: CatalogImagesResponse | null;
  onSelectCategory: (categoryId: string) => void;
  /** When false, pauses auto-cycle (e.g. tab unfocused). */
  active?: boolean;
};

export function LensHeroCarousel({
  images,
  onSelectCategory,
  active = true,
}: LensHeroCarouselProps) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);

  const slides = useMemo(
    () =>
      CLIENT_HOME_CATEGORIES.map((category) => ({
        id: category.id,
        label: heroLabel(category.id, category.label),
        url: catalogImageForHomeCategory(images, category.id),
      })),
    [images]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const ambientOpacity = useSharedValue(0.35);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion || !active) {
      ambientOpacity.value = 0.35;
      return;
    }
    ambientOpacity.value = withRepeat(
      withTiming(0.55, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [active, ambientOpacity, reduceMotion]);

  useEffect(() => {
    if (reduceMotion || !active || slides.length <= 1) return;
    const id = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [active, reduceMotion, slides.length]);

  const ambientStyle = useAnimatedStyle(() => ({
    opacity: ambientOpacity.value,
  }));

  const activeSlide = slides[activeIndex] ?? slides[0];

  const onPress = useCallback(() => {
    if (activeSlide) onSelectCategory(activeSlide.id);
  }, [activeSlide, onSelectCategory]);

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.ambientWash, ambientStyle]} pointerEvents="none" />

      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          activeSlide ? `Shop ${activeSlide.label}` : 'Shop lens categories'
        }
        style={[
          styles.panel,
          {
            backgroundColor: colors.background,
            borderColor: colors.cardBorder,
          },
        ]}
      >
        <View style={[styles.media, { backgroundColor: colors.background }]}>
          {slides.map((slide, index) => (
            <SlideImage
              key={slide.id}
              uri={slide.url}
              isActive={index === activeIndex}
              reduceMotion={reduceMotion}
              placeholderColor="rgba(240, 161, 50, 0.1)"
            />
          ))}
        </View>

        {/* Bottom scrim (no expo-linear-gradient — layered fades) */}
        <View style={styles.scrim} pointerEvents="none">
          <View style={styles.scrimMid} />
          <View style={styles.scrimBottom} />
        </View>

        <View style={styles.overlayRow} pointerEvents="none">
          <View style={styles.labelChip}>
            <Text style={styles.labelChipText}>{activeSlide?.label ?? 'Lenses'}</Text>
          </View>
          <View style={styles.dots}>
            {slides.map((slide, index) => {
              const isActive = index === activeIndex;
              return (
                <ProgressDot key={slide.id} isActive={isActive} reduceMotion={reduceMotion} />
              );
            })}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function ProgressDot({
  isActive,
  reduceMotion,
}: {
  isActive: boolean;
  reduceMotion: boolean;
}) {
  const width = useSharedValue(isActive ? 16 : 6);
  const opacity = useSharedValue(isActive ? 1 : 0.35);

  useEffect(() => {
    if (reduceMotion) {
      width.value = isActive ? 16 : 6;
      opacity.value = isActive ? 1 : 0.35;
      return;
    }
    width.value = withTiming(isActive ? 16 : 6, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(isActive ? 1 : 0.35, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
  }, [isActive, opacity, reduceMotion, width]);

  const style = useAnimatedStyle(() => ({
    width: width.value,
    opacity: opacity.value,
  }));

  return <Animated.View style={[stylesDot.dot, style]} />;
}

const stylesDot = StyleSheet.create({
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F0A132',
  },
});

function SlideImage({
  uri,
  isActive,
  reduceMotion,
  placeholderColor,
}: {
  uri: string | null;
  isActive: boolean;
  reduceMotion: boolean;
  placeholderColor: string;
}) {
  const opacity = useSharedValue(isActive ? 1 : 0);
  const scale = useSharedValue(isActive ? 1 : 0.97);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = isActive ? 1 : 0;
      scale.value = 1;
      return;
    }
    opacity.value = withTiming(isActive ? 1 : 0, {
      duration: FADE_MS,
      easing: Easing.out(Easing.cubic),
    });
    scale.value = withTiming(isActive ? 1 : 0.97, {
      duration: FADE_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [isActive, opacity, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]} pointerEvents="none">
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          contentPosition="center"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: placeholderColor }]} />
      )}
    </Animated.View>
  );
}

const createStyles = (_c: BrandColorScheme) =>
  StyleSheet.create({
    wrap: {
      width: '100%',
      position: 'relative',
    },
    ambientWash: {
      position: 'absolute',
      left: 12,
      right: 12,
      top: 10,
      bottom: 4,
      borderRadius: 28,
      backgroundColor: 'rgba(240, 161, 50, 0.14)',
    },
    panel: {
      width: '100%',
      height: PANEL_HEIGHT,
      borderRadius: 22,
      borderWidth: 1,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.28,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
    media: {
      ...StyleSheet.absoluteFill,
    },
    scrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 88,
      justifyContent: 'flex-end',
    },
    scrimMid: {
      ...StyleSheet.absoluteFill,
      top: 20,
      backgroundColor: 'rgba(8, 10, 14, 0.28)',
    },
    scrimBottom: {
      height: 56,
      backgroundColor: 'rgba(8, 10, 14, 0.62)',
    },
    overlayRow: {
      position: 'absolute',
      left: 14,
      right: 14,
      bottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    labelChip: {
      maxWidth: '62%',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(255, 255, 255, 0.14)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255, 255, 255, 0.22)',
    },
    labelChipText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    dots: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
  });
