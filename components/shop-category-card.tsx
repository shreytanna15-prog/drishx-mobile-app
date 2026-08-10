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
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';

const BLEED_SCALE = 1.28;

type CategoryLensBleedProps = {
  source: ImageSourcePropType;
  /** Visible viewport size (image is scaled larger and bled top-right). */
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Lens art with a true alpha radial fade (MaskedView).
 * Source should be a transparent PNG (lens highlights only) so the fade
 * reveals the themed card background in both light and dark mode.
 */
export function CategoryLensBleed({
  source,
  size = 72,
  style,
}: CategoryLensBleedProps) {
  const gradientId = `categoryLensFade-${useId().replace(/:/g, '')}`;
  const [layout, setLayout] = useState({ width: size, height: size });
  const w = layout.width || size;
  const h = layout.height || size;
  const imgW = w * BLEED_SCALE;
  const imgH = h * BLEED_SCALE;

  return (
    <View
      style={[{ width: size, height: size, overflow: 'visible' }, style]}
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
        style={{ width: w, height: h }}
        maskElement={
          <Svg width={w} height={h}>
            <Defs>
              <RadialGradient
                id={gradientId}
                cx="0.68"
                cy="0.32"
                rx="0.62"
                ry="0.62"
                gradientUnits="objectBoundingBox"
              >
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                <Stop offset="42%" stopColor="#FFFFFF" stopOpacity="0.92" />
                <Stop offset="72%" stopColor="#FFFFFF" stopOpacity="0.35" />
                <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={w} height={h} fill={`url(#${gradientId})`} />
          </Svg>
        }
      >
        <View style={{ width: w, height: h, overflow: 'hidden' }}>
          <Image
            source={source}
            style={{
              position: 'absolute',
              width: imgW,
              height: imgH,
              // Bleed toward top-right so the soft edge dissolves into the card.
              top: -(imgH - h) * 0.62,
              left: -(imgW - w) * 0.18,
            }}
            contentFit="contain"
          />
        </View>
      </MaskedView>
    </View>
  );
}

type ShopCategoryCardProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  imageSource?: ImageSourcePropType | null;
  onPress: () => void;
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ShopCategoryCard({
  title,
  subtitle,
  icon,
  imageSource,
  onPress,
  footer,
  style,
}: ShopCategoryCardProps) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createCardStyles);

  return (
    <Pressable style={[styles.card, style]} onPress={onPress}>
      <View style={styles.mediaRow}>
        {imageSource ? (
          <CategoryLensBleed source={imageSource} size={78} />
        ) : (
          <View style={styles.iconFallback}>
            <MaterialIcons name={icon} size={22} color={colors.primary} />
          </View>
        )}
        <View style={styles.chevronCircle}>
          <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {footer}
    </Pressable>
  );
}

const createCardStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    card: {
      width: '48%',
      backgroundColor: c.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 14,
      minHeight: 168,
      overflow: 'hidden',
    },
    mediaRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      minHeight: 78,
    },
    iconFallback: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: 'rgba(240, 161, 50, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    chevronCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(240, 161, 50, 0.08)',
    },
    title: {
      color: c.text,
      fontSize: 16,
      fontWeight: '800',
      marginTop: 10,
    },
    subtitle: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
    },
  });
