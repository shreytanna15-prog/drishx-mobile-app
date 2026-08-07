import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useTimeOfDay, type TimeOfDay } from '@/hooks/use-time-of-day';
import { useBrandColors } from '@/lib/theme-provider';
import {
  getTimeOfDayAccentIcon,
  getTimeOfDayGreetingFromBucket,
  getTimeOfDayTaglineFromBucket,
  TIME_OF_DAY_HERO_IMAGES,
} from '@/lib/home-greeting';
import type { LastOrderSummary } from '@/lib/last-order-summary';

const CROSSFADE_MS = 500;
const BUCKETS: TimeOfDay[] = ['morning', 'afternoon', 'evening'];

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
  const styles = useThemedStyles(createStyles);
  const bucket = useTimeOfDay(date);
  const greeting = getTimeOfDayGreetingFromBucket(bucket);
  const tagline = getTimeOfDayTaglineFromBucket(bucket);
  const accentIcon = getTimeOfDayAccentIcon(bucket);

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

  return (
    <View style={styles.card}>
      <View style={styles.imagePane} pointerEvents="none">
        {BUCKETS.map((key) => (
          <Animated.View
            key={key}
            style={[styles.imageLayer, { opacity: opacities[key] }]}
          >
            <Image
              source={TIME_OF_DAY_HERO_IMAGES[key]}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="center"
            />
          </Animated.View>
        ))}
        <View style={styles.vignetteLeft} />
        <View style={styles.vignetteBottom} />
      </View>

      <View style={styles.content}>
        <View style={styles.greetingRow}>
          <Text style={styles.greetingScript} numberOfLines={1}>
            {greeting}
          </Text>
          <MaterialIcons name={accentIcon} size={18} color={colors.primary} />
        </View>

        <Text style={styles.customerName} numberOfLines={2}>
          {companyName}
        </Text>

        <Text style={styles.tagline} numberOfLines={2}>
          {tagline}
        </Text>

        {lastOrder ? (
          <Pressable
            style={styles.continuePill}
            onPress={onContinueLastOrder}
            accessibilityRole="button"
            accessibilityLabel={`Continue last order: ${lastOrder.label}`}
          >
            <MaterialIcons name="schedule" size={16} color={colors.primary} />
            <View style={styles.continueTextCol}>
              <Text style={styles.continueTitle} numberOfLines={1}>
                Continue last order
              </Text>
              <Text style={styles.continueSubtitle} numberOfLines={1} ellipsizeMode="tail">
                {lastOrder.label}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    card: {
      position: 'relative',
      minHeight: 210,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    imagePane: {
      ...StyleSheet.absoluteFillObject,
      left: '36%',
    },
    imageLayer: {
      ...StyleSheet.absoluteFillObject,
      borderTopLeftRadius: 100,
      borderBottomLeftRadius: 28,
      overflow: 'hidden',
    },
    vignetteLeft: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: 56,
      backgroundColor: 'rgba(11, 15, 20, 0.55)',
    },
    vignetteBottom: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '38%',
      backgroundColor: 'rgba(11, 15, 20, 0.28)',
    },
    content: {
      zIndex: 2,
      paddingTop: 18,
      paddingBottom: 16,
      paddingHorizontal: 16,
      maxWidth: '58%',
    },
    greetingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    greetingScript: {
      color: c.primary,
      fontSize: 28,
      lineHeight: 34,
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
      color: c.text,
      fontSize: 26,
      fontWeight: '800',
      marginTop: 4,
      letterSpacing: -0.4,
      lineHeight: 32,
    },
    tagline: {
      color: c.textMuted,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 6,
    },
    continuePill: {
      marginTop: 14,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      maxWidth: '100%',
      paddingVertical: 8,
      paddingLeft: 10,
      paddingRight: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(240, 161, 50, 0.45)',
      backgroundColor: 'rgba(11, 15, 20, 0.78)',
    },
    continueTextCol: {
      flexShrink: 1,
      minWidth: 0,
      maxWidth: 150,
    },
    continueTitle: {
      color: c.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    continueSubtitle: {
      color: c.textMuted,
      fontSize: 11,
      marginTop: 1,
      lineHeight: 14,
    },
  });
