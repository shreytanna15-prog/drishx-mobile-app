import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaskedView from '@react-native-masked-view/masked-view';
import { Image } from 'expo-image';
import { useId, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors, useResolvedColorScheme } from '@/lib/theme-provider';

type CategoryLensBleedProps = {
  source: ImageSourcePropType;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Photorealistic lens, fully visible and centered.
 * Mask only feathers the outer corners so the square photo bound disappears.
 */
export function CategoryLensBleed({
  source,
  size = 112,
  style,
}: CategoryLensBleedProps) {
  const colorScheme = useResolvedColorScheme();
  const isDark = colorScheme === 'dark';
  const maskGradientId = `categoryLensFade-${useId().replace(/:/g, '')}`;
  const glowGradientId = `categoryLensGlow-${useId().replace(/:/g, '')}`;
  const [layout, setLayout] = useState({ width: size, height: size });
  const w = layout.width || size;
  const h = layout.height || size;

  const glowWhiteOpacity = isDark ? 0.08 : 0;
  const glowOrangeOpacity = isDark ? 0.1 : 0.07;

  return (
    <View
      style={[
        { width: size, height: size, overflow: 'hidden', backgroundColor: 'transparent' },
        style,
      ]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width > 0 && height > 0) {
          setLayout((prev) =>
            prev.width === width && prev.height === height
              ? prev
              : { width, height }
          );
        }
      }}
      pointerEvents="none"
    >
      {!isDark ? (
        <View
          style={{
            position: 'absolute',
            width: w * 0.9,
            height: h * 0.9,
            borderRadius: (w * 0.9) / 2,
            top: h * 0.05,
            left: w * 0.05,
            backgroundColor: '#F6F1E8',
            borderWidth: 1,
            borderColor: 'rgba(240, 161, 50, 0.22)',
          }}
        />
      ) : null}

      <Svg
        width={w}
        height={h}
        style={{ position: 'absolute', top: 0, left: 0 }}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient
            id={glowGradientId}
            cx="0.5"
            cy="0.48"
            rx="0.42"
            ry="0.42"
            gradientUnits="objectBoundingBox"
          >
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={glowWhiteOpacity} />
            <Stop offset="45%" stopColor="#F0A132" stopOpacity={glowOrangeOpacity} />
            <Stop offset="100%" stopColor="#F0A132" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={w} height={h} fill={`url(#${glowGradientId})`} />
      </Svg>

      <MaskedView
        style={{ width: w, height: h }}
        maskElement={
          <Svg width={w} height={h}>
            <Defs>
              <RadialGradient
                id={maskGradientId}
                cx="0.5"
                cy="0.48"
                rx="0.48"
                ry="0.48"
                gradientUnits="objectBoundingBox"
              >
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                <Stop offset="72%" stopColor="#FFFFFF" stopOpacity="1" />
                <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={w} height={h} fill={`url(#${maskGradientId})`} />
          </Svg>
        }
      >
        <Image
          source={source}
          style={{ width: w, height: h, backgroundColor: 'transparent' }}
          contentFit="contain"
        />
      </MaskedView>
    </View>
  );
}

type ShopCategoryCardProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  imageSource?: ImageSourcePropType | null;
  productCount?: number | null;
  onPress: () => void;
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ShopCategoryCard({
  title,
  subtitle,
  icon,
  imageSource,
  productCount,
  onPress,
  footer,
  style,
}: ShopCategoryCardProps) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createCardStyles);

  const countLabel =
    productCount == null
      ? null
      : `${productCount} Product${productCount === 1 ? '' : 's'}`;

  return (
    <Pressable style={[styles.card, style]} onPress={onPress}>
      <View style={styles.mediaWrap}>
        {imageSource ? (
          <CategoryLensBleed source={imageSource} size={108} style={styles.lens} />
        ) : (
          <View style={styles.iconFallback}>
            <MaterialIcons name={icon} size={26} color={colors.primary} />
          </View>
        )}

        <View style={styles.iconBadge}>
          <MaterialIcons name={icon} size={16} color={colors.primary} />
        </View>

        <View style={styles.chevronCircle}>
          <MaterialIcons name="chevron-right" size={16} color={colors.textMuted} />
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {footer ??
        (countLabel ? (
          <View style={styles.footer}>
            <Text style={styles.footerCount}>{countLabel}</Text>
            <MaterialIcons name="arrow-forward" size={18} color={colors.primary} />
          </View>
        ) : (
          <View style={styles.footer}>
            <Text style={styles.footerCount}>Browse</Text>
            <MaterialIcons name="arrow-forward" size={18} color={colors.primary} />
          </View>
        ))}
    </Pressable>
  );
}

const createCardStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    card: {
      width: '48%',
      backgroundColor: c.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 14,
      paddingBottom: 12,
      minHeight: 236,
      overflow: 'hidden',
    },
    mediaWrap: {
      height: 118,
      marginBottom: 4,
      position: 'relative',
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    lens: {
      alignSelf: 'center',
    },
    iconFallback: {
      width: 56,
      height: 56,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: 'rgba(240, 161, 50, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBadge: {
      position: 'absolute',
      left: 0,
      bottom: 4,
      width: 34,
      height: 34,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.primary,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    chevronCircle: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(240, 161, 50, 0.1)',
      borderWidth: 1,
      borderColor: c.cardBorder,
      zIndex: 2,
    },
    title: {
      color: c.text,
      fontSize: 17,
      fontWeight: '800',
      marginTop: 8,
    },
    subtitle: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 3,
    },
    footer: {
      marginTop: 'auto',
      paddingTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    footerCount: {
      color: c.primary,
      fontSize: 13,
      fontWeight: '700',
    },
  });
