import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CategoryLensBleed } from '@/components/shop-category-card';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { catalogImageSourceForLensType } from '@/lib/catalog-images-api';
import { LensPowerBadges } from '@/components/lens-power-badges';
import { formatLensProductCardTitle } from '@/lib/lens-display';
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
          <LensPowerBadges
            item={item}
            showAdd={item.lensType === 'Kryptok' || item.lensType === 'Progressive'}
          />
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
    price: {
      color: c.primary,
      fontSize: 14,
      fontWeight: '700',
      flexShrink: 0,
    },
  });
