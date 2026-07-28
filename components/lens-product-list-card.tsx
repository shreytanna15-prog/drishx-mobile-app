import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { formatLensProductCardDetail, formatLensProductCardTitle } from '@/lib/lens-display';
import { LENS_PRICE_PER_PAIR_LABEL } from '@/lib/lens-pricing';
import { formatProgressiveEyeLabel } from '@/lib/progressive-eye';
import type { LensItem } from '@/lib/types/lens';

type LensProductListCardProps = {
  item: LensItem;
  onPress?: () => void;
  /** @deprecated Lens type is included in the card detail line. */
  showLensType?: boolean;
};

export function LensProductListCard({ item, onPress }: LensProductListCardProps) {
  const styles = useThemedStyles(createStyles);
  const title = formatLensProductCardTitle(item);
  const detailLine = formatLensProductCardDetail(item);
  const eyeLabel = formatProgressiveEyeLabel(item.eye);

  const content = (
    <View style={styles.row}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]} />
      )}
      <View style={styles.compactTopRow}>
        <View style={styles.compactTopLeft}>
          <View style={styles.titleRow}>
            <Text style={styles.brandText} numberOfLines={2}>
              {title}
            </Text>
            {eyeLabel ? (
              <View style={styles.eyeBadge}>
                <Text style={styles.eyeBadgeText}>{eyeLabel}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.powerText} numberOfLines={2}>
            {detailLine}
          </Text>
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
    thumb: {
      width: 56,
      height: 56,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: 'rgba(240, 161, 50, 0.1)',
    },
    thumbFallback: {
      backgroundColor: 'rgba(240, 161, 50, 0.14)',
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
    titleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
    },
    brandText: {
      fontSize: 15,
      color: c.text,
      fontWeight: '700',
      lineHeight: 20,
      flexShrink: 1,
    },
    eyeBadge: {
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'rgba(240, 161, 50, 0.35)',
      backgroundColor: 'rgba(240, 161, 50, 0.14)',
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    eyeBadgeText: {
      color: c.primary,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    powerText: {
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
