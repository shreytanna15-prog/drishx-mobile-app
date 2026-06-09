import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { formatAddAxisLabel, formatLensItemLabel, formatSphCylSlash } from '@/lib/lens-display';
import { LENS_PRICE_PER_PAIR_LABEL } from '@/lib/lens-pricing';
import type { LensItem } from '@/lib/types/lens';

type LensProductListCardProps = {
  item: LensItem;
  onPress?: () => void;
  showLensType?: boolean;
};

export function LensProductListCard({ item, onPress, showLensType = false }: LensProductListCardProps) {
  const styles = useThemedStyles(createStyles);
  const lensType = item.lensType ?? 'Progressive';
  const brand = item.brand?.trim() ? item.brand.trim() : 'Lens';
  const itemName = formatLensItemLabel(item);
  const sphCyl = formatSphCylSlash(item);
  const addAxis = formatAddAxisLabel(item);

  const content = (
    <>
      <View style={styles.compactTopRow}>
        <View style={styles.compactTopLeft}>
          <Text style={styles.brandText} numberOfLines={2}>
            {brand}
          </Text>
          <Text style={styles.powerText}>{sphCyl}</Text>
          <Text style={styles.powerMetaText}>{addAxis}</Text>
        </View>
        <View style={styles.priceBlock}>
          <Text style={styles.priceAmount}>
            <Text style={styles.priceCurrency}>₹</Text>
            {item.price}
            <Text style={styles.priceUnit}>{LENS_PRICE_PER_PAIR_LABEL}</Text>
          </Text>
        </View>
      </View>

      {showLensType ? <Text style={styles.categoryText}>{lensType}</Text> : null}
      <Text style={styles.itemText} numberOfLines={2}>
        {itemName}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable style={styles.productCard} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.productCard}>{content}</View>;
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    productCard: {
      padding: 12,
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    compactTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 6,
      gap: 8,
    },
    compactTopLeft: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    brandText: {
      fontSize: 15,
      color: c.text,
      fontWeight: '700',
      lineHeight: 20,
    },
    powerText: {
      fontSize: 15,
      color: c.text,
      fontWeight: '800',
      lineHeight: 20,
    },
    powerMetaText: {
      fontSize: 12,
      color: c.textMuted,
      fontWeight: '600',
      lineHeight: 16,
    },
    priceBlock: {
      alignItems: 'flex-end',
      flexShrink: 0,
      maxWidth: 88,
    },
    priceAmount: {
      fontSize: 15,
      fontWeight: '800',
      color: c.primary,
      lineHeight: 20,
      textAlign: 'right',
    },
    priceCurrency: {
      fontSize: 13,
      fontWeight: '700',
      color: c.primary,
    },
    priceUnit: {
      fontSize: 10,
      fontWeight: '700',
      color: c.textMuted,
    },
    categoryText: {
      fontSize: 12,
      color: c.text,
      fontWeight: '700',
      marginBottom: 2,
    },
    itemText: {
      fontSize: 11,
      color: c.textMuted,
      fontWeight: '600',
      lineHeight: 15,
    },
  });
