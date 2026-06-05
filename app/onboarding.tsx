'use client';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { useSystemBrandColors, useSystemThemedStyles } from '@/hooks/use-system-themed-styles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Feature = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
};

type OnboardingPage = {
  id: string;
  features: Feature[];
};

const PAGES: OnboardingPage[] = [
  {
    id: 'features-1',
    features: [
      {
        icon: 'shopping-search',
        title: 'Explore Products',
        description: 'Wide range of lenses, coatings and optical solutions.',
      },
      {
        icon: 'map-marker-path',
        title: 'Track in Real Time',
        description: 'Stay updated with every step of your order.',
      },
      {
        icon: 'clipboard-list-outline',
        title: 'Order History',
        description: 'View past orders and reorder quickly anytime.',
      },
    ],
  },
  {
    id: 'features-2',
    features: [
      {
        icon: 'shield-check-outline',
        title: 'Secure & Reliable',
        description: 'Your data and transactions are always safe with us.',
      },
      {
        icon: 'clock-fast',
        title: 'Faster Checkout',
        description: 'Build your cart and place orders in seconds.',
      },
      {
        icon: 'account-check-outline',
        title: 'Role Based Access',
        description: 'Customers and staff get screens tailored to their work.',
      },
    ],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const colors = useSystemBrandColors();
  const statusBarStyle = useStatusBarStyle();
  const styles = useSystemThemedStyles(createStyles);

  const canGoNext = index < PAGES.length - 1;

  const dots = useMemo(() => Array.from({ length: PAGES.length }, (_, i) => i), []);

  const handleFinish = useCallback(() => {
    router.replace('/signup');
  }, [router]);

  const handleSkip = useCallback(() => {
    handleFinish();
  }, [handleFinish]);

  const handleNext = useCallback(() => {
    if (!canGoNext) {
      handleFinish();
      return;
    }
    const next = index + 1;
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    setIndex(next);
  }, [canGoNext, handleFinish, index]);

  const onMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(x / SCREEN_WIDTH);
    setIndex(Math.max(0, Math.min(PAGES.length - 1, nextIndex)));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style={statusBarStyle} />
      <View style={styles.root}>
        <View style={styles.topBar}>
          <View />
          <Pressable onPress={handleSkip} hitSlop={12} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          contentContainerStyle={styles.pagerContent}>
          {PAGES.map((page) => (
            <View key={page.id} style={styles.page}>
              <View style={styles.cards}>
                {page.features.map((f) => (
                  <View key={f.title} style={styles.card}>
                    <View style={styles.iconWrap}>
                      <MaterialCommunityIcons name={f.icon} size={22} color={colors.primary} />
                    </View>
                    <View style={styles.cardText}>
                      <Text style={styles.cardTitle}>{f.title}</Text>
                      <Text style={styles.cardDesc}>{f.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {dots.map((d) => (
              <View
                key={d}
                style={[styles.dot, d === index ? styles.dotActive : styles.dotIdle]}
              />
            ))}
          </View>

          <Pressable onPress={handleNext} style={styles.primaryBtn}>
            <Text style={styles.primaryText}>{canGoNext ? 'Next' : 'Get Started'}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: c.background,
    },
    root: {
      flex: 1,
      backgroundColor: c.background,
    },
    topBar: {
      height: 44,
      paddingHorizontal: 18,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    skipBtn: {
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    skipText: {
      color: c.label,
      fontSize: 14,
      fontWeight: '600',
    },
    pagerContent: {
      alignItems: 'center',
    },
    page: {
      width: SCREEN_WIDTH,
      paddingHorizontal: 18,
      justifyContent: 'center',
      minHeight: SCREEN_HEIGHT * 0.62,
    },
    cards: {
      gap: 14,
    },
    card: {
      flexDirection: 'row',
      gap: 14,
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(240, 161, 50, 0.12)',
    },
    cardText: {
      flex: 1,
    },
    cardTitle: {
      color: c.text,
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 4,
    },
    cardDesc: {
      color: c.textMuted,
      fontSize: 12.5,
      lineHeight: 18,
    },
    footer: {
      paddingHorizontal: 18,
      paddingBottom: 18,
      gap: 14,
    },
    dots: {
      alignSelf: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    dotIdle: {
      backgroundColor: c.textMuted,
      opacity: 0.35,
    },
    dotActive: {
      width: 18,
      backgroundColor: c.primary,
      opacity: 1,
    },
    primaryBtn: {
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
    },
    primaryText: {
      color: c.primaryText,
      fontSize: 16,
      fontWeight: '800',
    },
  });
