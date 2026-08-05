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
              <Text style={styles.continueTitle} numberOfLines={1}>
                Continue last order
              </Text>
              <Text style={styles.continueSubtitle} numberOfLines={1} ellipsizeMode="tail">
                {lastOrder.label}
              </Text>
            </View>
            <View style={styles.continueChevron}>
              <MaterialIcons name="arrow-forward" size={14} color={colors.primaryText} />
            </View>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.rightCol, { width: circleSize + 8 }]}>
        <View
          style={[
            styles.heroCircle,
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

        <View style={styles.weatherChip} pointerEvents="none">
          <View style={styles.weatherChipRow}>
            <MaterialIcons name={timeChipIcon(greeting)} size={13} color={colors.primary} />
            <Text style={styles.weatherChipTemp}>28°C</Text>
          </View>
          <Text style={styles.weatherChipCity}>New Delhi</Text>
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
      gap: 8,
      minHeight: 44,
      paddingVertical: 7,
      paddingLeft: 10,
      paddingRight: 7,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(240, 161, 50, 0.45)',
      backgroundColor: 'rgba(18, 18, 20, 0.92)',
      maxWidth: '100%',
    },
    continueTextCol: {
      flex: 1,
      minWidth: 0,
      marginRight: 2,
    },
    continueTitle: {
      color: c.primary,
      fontSize: 11,
      fontWeight: '700',
    },
    continueSubtitle: {
      color: c.textMuted,
      fontSize: 9,
      marginTop: 1,
      lineHeight: 12,
    },
    continueChevron: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    rightCol: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    heroCircle: {
      overflow: 'hidden',
      backgroundColor: c.background,
    },
    weatherChip: {
      position: 'absolute',
      top: -8,
      right: -6,
      alignItems: 'flex-start',
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: 'rgba(12, 12, 14, 0.9)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(240, 161, 50, 0.45)',
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    weatherChipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    weatherChipTemp: {
      color: c.text,
      fontSize: 11,
      fontWeight: '700',
    },
    weatherChipCity: {
      color: c.textMuted,
      fontSize: 8,
      marginTop: 1,
    },
  });
