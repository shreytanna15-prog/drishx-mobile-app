import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { formatAddAxisLabel, formatLensItemLabel, formatSphCylSlash } from '@/lib/lens-display';
import type { LensItem } from '@/lib/types/lens';

export function RelatedLensCard({
  item,
  onPress,
}: {
  item: LensItem;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const brand = item.brand?.trim() || 'Lens';
  const indexLabel =
    item.index != null && item.lensType === 'Single Vision'
      ? `${Number(item.index)} `
      : '';
  const itemLabel = formatLensItemLabel(item);
  const sphCyl = formatSphCylSlash(item);
  const addAxis = formatAddAxisLabel(item);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.topRow}>
        <View style={styles.leftBlock}>
          <Text style={styles.brandText} numberOfLines={2}>
            {`${indexLabel}${brand}`.trim()}
          </Text>
          {itemLabel ? (
            <Text style={styles.itemText} numberOfLines={1}>
              {itemLabel}
            </Text>
          ) : null}
          <Text style={styles.powerText}>{sphCyl}</Text>
          <Text style={styles.metaText}>{addAxis}</Text>
        </View>
        <Text style={styles.price}>₹{item.price}</Text>
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
