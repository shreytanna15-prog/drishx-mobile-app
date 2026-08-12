import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CategoryLensBleed } from '@/components/shop-category-card';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { catalogImageSourceForLensType } from '@/lib/catalog-images-api';
import {
  formatAddAxisLabel,
  formatLensItemLabel,
  formatLensProductCardTitle,
  formatSphCylSlash,
} from '@/lib/lens-display';
import { LENS_PRICE_PER_PAIR_LABEL } from '@/lib/lens-pricing';
import { useResolvedColorScheme } from '@/lib/theme-provider';
import type { LensItem } from '@/lib/types/lens';

export function RelatedLensCard({
  item,
  onPress,
}: {
  item: LensItem;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const colorScheme = useResolvedColorScheme();
  const title = formatLensProductCardTitle(item);
  const indexLabel =
    item.index != null && item.lensType === 'Single Vision'
      ? `${Number(item.index)} `
      : '';
  const itemLabel = formatLensItemLabel(item);
  const showItemLine =
    Boolean(itemLabel) && itemLabel.toLowerCase() !== title.toLowerCase();
  const sphCyl = formatSphCylSlash(item);
  const addAxis = formatAddAxisLabel(item);
  const imageSource = catalogImageSourceForLensType(item.lensType, colorScheme);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.topRow}>
        {imageSource ? (
          <CategoryLensBleed source={imageSource} size={48} />
        ) : (
          <View style={styles.thumbFallback} />
        )}
        <View style={styles.leftBlock}>
          <Text style={styles.brandText} numberOfLines={2}>
            {`${indexLabel}${title}`.trim()}
          </Text>
          {showItemLine ? (
            <Text style={styles.itemText} numberOfLines={1}>
              {itemLabel}
            </Text>
          ) : null}
          <Text style={styles.powerText}>{sphCyl}</Text>
          <Text style={styles.metaText}>{addAxis}</Text>
        </View>
        <Text style={styles.price}>
          ₹{item.price}
          {LENS_PRICE_PER_PAIR_LABEL}
        </Text>
      </View>
    </Pressable>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 10,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
    },
    thumbFallback: {
      width: 48,
      height: 48,
      backgroundColor: 'transparent',
    },
    leftBlock: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    brandText: {
      color: c.text,
      fontSize: 15,
      fontWeight: '700',
      lineHeight: 20,
    },
    itemText: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 16,
    },
    powerText: {
      color: c.text,
      fontSize: 15,
      fontWeight: '800',
      lineHeight: 20,
    },
    metaText: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 16,
    },
    price: {
      color: c.primary,
      fontSize: 14,
      fontWeight: '700',
      flexShrink: 0,
    },
  });
