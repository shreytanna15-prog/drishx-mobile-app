import { Pressable, StyleSheet, Text } from 'react-native';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { formatSphCylSlash } from '@/lib/lens-display';
import type { LensItem } from '@/lib/types/lens';

function buildRelatedTitle(item: LensItem): string {
  const brand = item.brand?.trim() || 'Lens';
  const indexLabel =
    item.index != null && item.lensType === 'Single Vision'
      ? `${Number(item.index)} `
      : '';
  const itemLabel = item.item?.trim() ? `${item.item.trim()} ` : '';
  return `${indexLabel}${brand} ${itemLabel}${formatSphCylSlash(item)}`.replace(/\s+/g, ' ').trim();
}

export function RelatedLensCard({
  item,
  onPress,
}: {
  item: LensItem;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.title} numberOfLines={2}>
        {buildRelatedTitle(item)}
      </Text>
      <Text style={styles.price}>₹{item.price}</Text>
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
    title: {
      color: c.text,
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 21,
    },
    price: {
      color: c.primary,
      fontSize: 14,
      fontWeight: '700',
      marginTop: 6,
    },
  });
