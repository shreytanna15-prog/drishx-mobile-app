import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CategoryLensBleed } from '@/components/shop-category-card';
import { CoatingDot } from '@/components/coating-dot';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { catalogImageSourceForLensType } from '@/lib/catalog-images-api';
import { getCoatingDotColor } from '@/lib/coating-color';
import { formatLensProductCardDetail, formatLensProductCardTitle } from '@/lib/lens-display';
import { LENS_PRICE_PER_PAIR_LABEL } from '@/lib/lens-pricing';
import { useResolvedColorScheme } from '@/lib/theme-provider';
import type { LensItem } from '@/lib/types/lens';

type LensProductListCardProps = {
  item: LensItem;
  onPress?: () => void;
  /** @deprecated Lens type is included in the card detail line. */
  showLensType?: boolean;
};

export function LensProductListCard({ item, onPress }: LensProductListCardProps) {
  const styles = useThemedStyles(createStyles);
  const colorScheme = useResolvedColorScheme();
  const title = formatLensProductCardTitle(item);
  const detailLine = formatLensProductCardDetail(item);
  const coatingColor = getCoatingDotColor(item.coating);
  const imageSource = catalogImageSourceForLensType(item.lensType, colorScheme);

  const content = (
    <View style={styles.row}>
      {imageSource ? (
        <CategoryLensBleed source={imageSource} size={56} />
      ) : (
        <View style={styles.thumbFallback} />
      )}
      <View style={styles.compactTopRow}>
        <View style={styles.compactTopLeft}>
          <Text style={styles.brandText} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.detailRow}>
            {coatingColor ? (
              <View style={styles.coatingDotWrap}>
                <CoatingDot coating={item.coating} size={6} />
              </View>
            ) : null}
            <Text style={styles.powerText} numberOfLines={2}>
              {detailLine}
            </Text>
          </View>
        </View>
        <View style={styles.priceBlock}>
          <Text style={styles.priceAmount}>
            <Text style={styles.priceCurrency}>₹</Text>
            {item.price}
            <Text style={styles.priceUnit}>{LENS_PRICE_PER_PAIR_LABEL}</Text>
          </Text>
        </View>
      </View>
    </View>
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
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    thumbFallback: {
      width: 56,
      height: 56,
      backgroundColor: 'transparent',
    },
    compactTopRow: {
      flex: 1,
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
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
    },
    coatingDotWrap: {
      marginTop: 7,
    },
    brandText: {
      fontSize: 15,
      color: c.text,
      fontWeight: '700',
      lineHeight: 20,
      flexShrink: 1,
    },
    powerText: {
      flex: 1,
      fontSize: 15,
      color: c.text,
      fontWeight: '800',
      lineHeight: 20,
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
  });
