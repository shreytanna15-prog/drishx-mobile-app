import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';

type WholesalePromoBannerProps = {
  onPress: () => void;
};

export function WholesalePromoBanner({ onPress }: WholesalePromoBannerProps) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wrapper}>
      <View style={styles.pillTag} pointerEvents="none">
        <Text style={styles.pillText}>Place wholesale order</Text>
      </View>

      <Pressable
        style={styles.banner}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Place wholesale order"
      >
        <View style={styles.ringOuter} pointerEvents="none" />
        <View style={styles.ringMid} pointerEvents="none" />
        <View style={styles.ringInner} pointerEvents="none" />

        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Choose from 1000+ products and get best wholesale prices
          </Text>

          <View style={styles.ctaCircle}>
            <MaterialIcons name="arrow-forward" size={22} color={colors.primaryText} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    wrapper: {
      position: 'relative',
      marginBottom: 22,
    },
    pillTag: {
      position: 'absolute',
      top: 0,
      left: 18,
      zIndex: 2,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 5,
    },
    pillText: {
      color: '#141414',
      fontSize: 13,
      fontWeight: '700',
      fontStyle: 'italic',
    },
    banner: {
      position: 'relative',
      overflow: 'hidden',
      minHeight: 96,
      marginTop: 15,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      paddingTop: 22,
      paddingBottom: 18,
      paddingHorizontal: 18,
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
    },
    ringOuter: {
      position: 'absolute',
      right: -36,
      top: '50%',
      marginTop: -80,
      width: 160,
      height: 160,
      borderRadius: 80,
      borderWidth: 1,
      borderColor: 'rgba(240, 161, 50, 0.22)',
    },
    ringMid: {
      position: 'absolute',
      right: 6,
      top: '50%',
      marginTop: -46,
      width: 92,
      height: 92,
      borderRadius: 46,
      borderWidth: 1,
      borderColor: 'rgba(240, 161, 50, 0.32)',
    },
    ringInner: {
      position: 'absolute',
      right: 46,
      top: '50%',
      marginTop: -22,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(240, 161, 50, 0.14)',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      zIndex: 1,
    },
    subtitle: {
      flex: 1,
      minWidth: 0,
      color: c.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    ctaCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#F0A132',
      shadowOpacity: 0.45,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
  });
