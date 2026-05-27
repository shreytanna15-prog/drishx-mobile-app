'use client';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
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
                      <MaterialCommunityIcons name={f.icon} size={22} color="#F0A132" />
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0B0F14',
  },
  root: {
    flex: 1,
    backgroundColor: '#0B0F14',
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
    color: '#B9C0CC',
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
    backgroundColor: '#0F1620',
    borderWidth: 1,
    borderColor: 'rgba(240, 161, 50, 0.18)',
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
    color: '#EAF0FA',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    color: '#AAB2C0',
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
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  dotActive: {
    width: 18,
    backgroundColor: '#F0A132',
  },
  primaryBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0A132',
  },
  primaryText: {
    color: '#0B0F14',
    fontSize: 16,
    fontWeight: '800',
  },
});

