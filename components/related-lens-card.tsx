import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import {
  formatAddAxisLabel,
  formatLensItemLabel,
  formatLensProductCardTitle,
  formatSphCylSlash,
} from '@/lib/lens-display';
import { LENS_PRICE_PER_PAIR_LABEL } from '@/lib/lens-pricing';
import type { LensItem } from '@/lib/types/lens';

export function RelatedLensCard({
  item,
  onPress,
}: {
  item: LensItem;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
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

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.topRow}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.thumb}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]} />
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
    thumb: {
      width: 48,
      height: 48,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: 'rgba(240, 161, 50, 0.08)',
      padding: 3,
    },
    thumbFallback: {
      backgroundColor: 'rgba(240, 161, 50, 0.14)',
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
