import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import {
  getTimeOfDayGreeting,
  getTimeOfDayHeroImage,
  getTimeOfDayTagline,
  type TimeOfDayGreeting,
} from '@/lib/home-greeting';
import type { LastOrderSummary } from '@/lib/last-order-summary';

type HomeHeroProps = {
  companyName: string;
  lastOrder?: LastOrderSummary | null;
  onContinueLastOrder?: () => void;
  date?: Date;
};

function timeChipIcon(greeting: TimeOfDayGreeting): keyof typeof MaterialIcons.glyphMap {
  if (greeting === 'Good Morning') return 'wb-sunny';
  if (greeting === 'Good Afternoon') return 'wb-sunny';
  return 'nightlight-round';
}

export function HomeHero({
  companyName,
  lastOrder,
  onContinueLastOrder,
  date,
}: HomeHeroProps) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const greeting = getTimeOfDayGreeting(date);
  const tagline = getTimeOfDayTagline(date);
  const source = getTimeOfDayHeroImage(date);

  const circleSize = Math.min(158, Math.max(132, width * 0.38));
  const ringSize = circleSize + 10;

  return (
    <View style={styles.row}>
      <View style={styles.leftCol}>
        <Text style={styles.helloSmall}>{greeting},</Text>
        <Text style={styles.customerName} numberOfLines={2}>
          {companyName}{' '}
          <Text style={styles.wave}>👋</Text>
        </Text>
        <Text style={styles.tagline} numberOfLines={2}>
          {tagline}
        </Text>

        {lastOrder ? (
          <Pressable
            style={styles.continueCard}
            onPress={onContinueLastOrder}
            accessibilityRole="button"
            accessibilityLabel={`Continue last order: ${lastOrder.label}`}
          >
            <View style={styles.continueTextCol}>
              <Text style={styles.continueTitle}>Continue last order</Text>
              <Text style={styles.continueSubtitle} numberOfLines={1}>
                {lastOrder.label}
              </Text>
            </View>
            <View style={styles.continueChevron}>
              <MaterialIcons name="arrow-forward" size={16} color={colors.primaryText} />
            </View>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.rightCol, { width: ringSize + 8 }]}>
        <View
          style={[
            styles.outerRing,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
            },
          ]}
        >
          <View
            style={[
              styles.innerCircle,
              {
                width: circleSize,
                height: circleSize,
                borderRadius: circleSize / 2,
              },
            ]}
            accessibilityRole="image"
            accessibilityLabel={`${greeting} mood image`}
          >
            <Image
              source={source}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="center"
              transition={200}
            />
          </View>
        </View>

        <View style={styles.timeChip} pointerEvents="none">
          <MaterialIcons
            name={timeChipIcon(greeting)}
            size={14}
            color={colors.primary}
          />
        </View>
      </View>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      width: '100%',
    },
    leftCol: {
      flex: 1,
      minWidth: 0,
      paddingRight: 4,
      zIndex: 1,
    },
    helloSmall: {
      color: c.textMuted,
      fontSize: 14,
      fontWeight: '500',
      letterSpacing: 0.2,
    },
    customerName: {
      color: c.text,
      fontSize: 24,
      fontWeight: '800',
      marginTop: 4,
      letterSpacing: -0.3,
      lineHeight: 30,
    },
    wave: {
      fontSize: 20,
    },
    tagline: {
      color: c.textMuted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 6,
    },
    continueCard: {
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 48,
      paddingVertical: 8,
      paddingLeft: 12,
      paddingRight: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(240, 161, 50, 0.55)',
      backgroundColor: 'rgba(18, 18, 20, 0.92)',
    },
    continueTextCol: {
      flex: 1,
      minWidth: 0,
    },
    continueTitle: {
      color: c.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    continueSubtitle: {
      color: c.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
    continueChevron: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rightCol: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    outerRing: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'rgba(240, 161, 50, 0.75)',
      backgroundColor: 'rgba(240, 161, 50, 0.08)',
      shadowColor: '#F0A132',
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 0 },
      elevation: 8,
    },
    innerCircle: {
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'rgba(240, 161, 50, 0.9)',
      backgroundColor: c.background,
    },
    timeChip: {
      position: 'absolute',
      top: 6,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: 'rgba(12, 12, 14, 0.88)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(240, 161, 50, 0.45)',
    },
  });
