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
    <Pressable
      style={styles.banner}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Place wholesale order"
    >
      <View style={styles.glowOrbA} pointerEvents="none" />
      <View style={styles.glowOrbB} pointerEvents="none" />
      <View style={styles.glowTrail} pointerEvents="none" />

      <View style={styles.content}>
        <View style={styles.textCol}>
          <Text style={styles.title}>Place wholesale order</Text>
          <Text style={styles.subtitle}>
            Choose from 1000+ products and get best wholesale prices
          </Text>
        </View>

        <View style={styles.ctaCircle}>
          <MaterialIcons name="arrow-forward" size={22} color={colors.primaryText} />
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    banner: {
      position: 'relative',
      overflow: 'hidden',
      minHeight: 96,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      marginBottom: 22,
      paddingVertical: 18,
      paddingHorizontal: 18,
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
    },
    glowOrbA: {
      position: 'absolute',
      right: -20,
      top: -30,
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: 'rgba(240, 161, 50, 0.18)',
    },
    glowOrbB: {
      position: 'absolute',
      right: 40,
      bottom: -50,
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: 'rgba(240, 161, 50, 0.1)',
    },
    glowTrail: {
      position: 'absolute',
      right: 70,
      top: 10,
      width: 90,
      height: 90,
      borderRadius: 45,
      borderWidth: 1,
      borderColor: 'rgba(240, 161, 50, 0.22)',
      backgroundColor: 'transparent',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      zIndex: 1,
    },
    textCol: {
      flex: 1,
      minWidth: 0,
      paddingRight: 4,
    },
    title: {
      color: c.text,
      fontSize: 20,
      fontWeight: '700',
      fontStyle: 'italic',
      letterSpacing: 0.2,
      lineHeight: 26,
    },
    subtitle: {
      color: c.textMuted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 6,
      maxWidth: 240,
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
