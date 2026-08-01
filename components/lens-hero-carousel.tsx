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
const SIZE = 168;

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

  const glowOpacity = useSharedValue(0.55);

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
      glowOpacity.value = 0.55;
      return;
    }
    glowOpacity.value = withRepeat(
      withTiming(0.9, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [active, glowOpacity, reduceMotion]);

  useEffect(() => {
    if (reduceMotion || !active || slides.length <= 1) return;
    const id = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [active, reduceMotion, slides.length]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const activeSlide = slides[activeIndex] ?? slides[0];

  const onPress = useCallback(() => {
    if (activeSlide) onSelectCategory(activeSlide.id);
  }, [activeSlide, onSelectCategory]);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          activeSlide ? `Shop ${activeSlide.label}` : 'Shop lens categories'
        }
        style={styles.pressable}
      >
        <Animated.View
          style={[styles.glow, glowStyle]}
          pointerEvents="none"
        />
        <View style={[styles.ring, { borderColor: `${colors.primary}73` }]}>
          <View style={[styles.imageClip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {slides.map((slide, index) => (
              <SlideImage
                key={slide.id}
                uri={slide.url}
                isActive={index === activeIndex}
                reduceMotion={reduceMotion}
                placeholderColor={`rgba(240, 161, 50, 0.12)`}
              />
            ))}
          </View>
        </View>
      </Pressable>
      <Text style={[styles.label, { color: colors.primary }]}>
        {activeSlide?.label ?? 'Lenses'}
      </Text>
    </View>
  );
}

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
  const scale = useSharedValue(isActive ? 1 : 1.03);

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
    scale.value = withTiming(isActive ? 1 : 1.03, {
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
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: placeholderColor }]} />
      )}
    </Animated.View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    wrap: {
      alignItems: 'center',
      gap: 10,
    },
    pressable: {
      width: SIZE,
      height: SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    glow: {
      position: 'absolute',
      width: SIZE + 36,
      height: SIZE + 36,
      borderRadius: (SIZE + 36) / 2,
      backgroundColor: 'rgba(240, 161, 50, 0.28)',
    },
    ring: {
      width: SIZE,
      height: SIZE,
      borderRadius: SIZE / 2,
      borderWidth: 2,
      padding: 5,
      shadowColor: '#F0A132',
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 0 },
      elevation: 8,
    },
    imageClip: {
      flex: 1,
      borderRadius: SIZE / 2,
      overflow: 'hidden',
      borderWidth: 1,
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.3,
      color: c.primary,
    },
  });
