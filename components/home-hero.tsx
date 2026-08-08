import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useTimeOfDay, type TimeOfDay } from '@/hooks/use-time-of-day';
import {
  getTimeOfDayGreetingFromBucket,
  getTimeOfDayTaglineFromBucket,
  TIME_OF_DAY_HERO_IMAGES,
} from '@/lib/home-greeting';
import type { LastOrderSummary } from '@/lib/last-order-summary';
import { useBrandColors, useResolvedColorScheme } from '@/lib/theme-provider';

const CROSSFADE_MS = 500;
const BUCKETS: TimeOfDay[] = ['morning', 'afternoon', 'evening'];
/** Slightly taller than the JPEG frame so the banner feels less cramped. */
const BANNER_ASPECT_RATIO = 1.95;
/**
 * Hero JPEGs ship with a baked-in gold rounded stroke + outer padding.
 * Scale past the container so overflow:hidden clips that frame edge-to-edge.
 */
const IMAGE_BLEED_SCALE = 1.14;

type HomeHeroProps = {
  companyName: string;
  lastOrder?: LastOrderSummary | null;
  onContinueLastOrder?: () => void;
  /** When set, freezes the time bucket (useful for tests / previews). */
  date?: Date;
};

export function HomeHero({
  companyName,
  lastOrder,
  onContinueLastOrder,
  date,
}: HomeHeroProps) {
  const colors = useBrandColors();
  const colorScheme = useResolvedColorScheme();
  const styles = useThemedStyles(createStyles);
  const bucket = useTimeOfDay(date);
  const greeting = getTimeOfDayGreetingFromBucket(bucket);
  const tagline = getTimeOfDayTaglineFromBucket(bucket);
  const [bannerSize, setBannerSize] = useState({ width: 0, height: 0 });

  const opacities = useRef({
    morning: new Animated.Value(bucket === 'morning' ? 1 : 0),
    afternoon: new Animated.Value(bucket === 'afternoon' ? 1 : 0),
    evening: new Animated.Value(bucket === 'evening' ? 1 : 0),
  }).current;

  useEffect(() => {
    Animated.parallel(
      BUCKETS.map((key) =>
        Animated.timing(opacities[key], {
          toValue: key === bucket ? 1 : 0,
          duration: CROSSFADE_MS,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [bucket, opacities]);

  const heroImages = TIME_OF_DAY_HERO_IMAGES[colorScheme];

  const onBannerLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBannerSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height }
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.banner} onLayout={onBannerLayout}>
        {BUCKETS.map((key) => (
          <Animated.View
            key={key}
            style={[styles.imageLayer, { opacity: opacities[key] }]}
          >
            <Image
              source={heroImages[key]}
              style={styles.heroImage}
              contentFit="cover"
              contentPosition="center"
            />
          </Animated.View>
        ))}

        {bannerSize.width > 0 ? (
          <Svg
            pointerEvents="none"
            width={bannerSize.width}
            height={bannerSize.height}
            style={StyleSheet.absoluteFill}
          >
            <Defs>
              <LinearGradient id="heroLeftScrim" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#000000" stopOpacity="0.72" />
                <Stop offset="0.42" stopColor="#000000" stopOpacity="0.28" />
                <Stop offset="0.7" stopColor="#000000" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect
              x={0}
              y={0}
              width={bannerSize.width}
              height={bannerSize.height}
              fill="url(#heroLeftScrim)"
            />
          </Svg>
        ) : null}

        <View style={styles.bannerContent} pointerEvents="none">
          <Text style={styles.greetingScript}>{greeting},</Text>
          <Text style={styles.customerName} numberOfLines={2}>
            {companyName}
          </Text>
        </View>
      </View>

      <Text style={styles.tagline} numberOfLines={2}>
        {tagline.toUpperCase()}
      </Text>

      {lastOrder ? (
        <Pressable
          style={styles.continueCard}
          onPress={onContinueLastOrder}
          accessibilityRole="button"
          accessibilityLabel={`Continue last order: ${lastOrder.label}`}
        >
          <View style={styles.clockRing}>
            <MaterialIcons name="history" size={18} color={colors.primary} />
          </View>
          <View style={styles.continueTextCol}>
            <Text style={styles.continueTitle} numberOfLines={1}>
              Continue last order
            </Text>
            <Text
              style={styles.continueSubtitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {lastOrder.label}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    root: {
      width: '100%',
      gap: 10,
    },
    banner: {
      width: '100%',
      aspectRatio: BANNER_ASPECT_RATIO,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: '#0B0F14',
    },
    imageLayer: {
      ...StyleSheet.absoluteFillObject,
      overflow: 'hidden',
    },
    heroImage: {
      ...StyleSheet.absoluteFillObject,
      transform: [{ scale: IMAGE_BLEED_SCALE }],
    },
    bannerContent: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      paddingHorizontal: 18,
      paddingVertical: 18,
      maxWidth: '52%',
    },
    greetingScript: {
      color: c.primary,
      fontSize: 15,
      lineHeight: 19,
      fontStyle: 'italic',
      fontWeight: '500',
      letterSpacing: 0.2,
      fontFamily: Platform.select({
        ios: 'Georgia',
        android: 'serif',
        default: 'Georgia',
      }),
    },
    customerName: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '700',
      marginTop: 1,
      letterSpacing: -0.2,
      lineHeight: 21,
    },
    tagline: {
      color: c.textMuted,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: '500',
      letterSpacing: 1.4,
      textAlign: 'center',
      paddingHorizontal: 8,
    },
    continueCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.cardElevated,
    },
    clockRing: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(240, 161, 50, 0.4)',
      backgroundColor: 'rgba(240, 161, 50, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    continueTextCol: {
      flex: 1,
      minWidth: 0,
    },
    continueTitle: {
      color: c.primary,
      fontSize: 14,
      fontWeight: '700',
    },
    continueSubtitle: {
      color: c.textMuted,
      fontSize: 12,
      marginTop: 2,
      lineHeight: 16,
    },
  });
