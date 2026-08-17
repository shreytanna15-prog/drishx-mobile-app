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
import { useBrandColors } from '@/lib/theme-provider';

type CategoryLensBleedProps = {
  source: ImageSourcePropType;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Photorealistic glass cutout. Studio fill is already punched to alpha in the PNG.
 * Mask only feathers square photo corners.
 */
export function CategoryLensBleed({
  source,
  size = 112,
  style,
}: CategoryLensBleedProps) {
  const maskGradientId = `categoryLensFade-${useId().replace(/:/g, '')}`;
  const [layout, setLayout] = useState({ width: size, height: size });
  const w = layout.width || size;
  const h = layout.height || size;

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
      <MaskedView
        style={{ width: w, height: h, backgroundColor: 'transparent' }}
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
                <Stop offset="88%" stopColor="#FFFFFF" stopOpacity="1" />
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
