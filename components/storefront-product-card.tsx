import { StyleSheet, Text, View } from 'react-native';

import { CoatingDot } from '@/components/coating-dot';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import type { StorefrontShopProduct } from '@/lib/lenses-api';

type StorefrontProductCardProps = {
  item: StorefrontShopProduct;
};

/** Browse-only parent row under a storefront card (buy/detail is a follow-up). */
export function StorefrontProductCard({ item }: StorefrontProductCardProps) {
  const styles = useThemedStyles(createStyles);
  const coating = item.coatingName?.trim() || item.coating?.trim() || null;
  const variants = Math.max(0, Number(item.variantCount) || 0);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.title} numberOfLines={2}>
            {item.name}
          </Text>
          {coating ? (
            <View style={styles.detailRow}>
              <View style={styles.coatingDotWrap}>
                <CoatingDot coating={coating} size={6} />
              </View>
              <Text style={styles.detail} numberOfLines={1}>
                {coating}
              </Text>
            </View>
          ) : null}
          <Text style={styles.meta} numberOfLines={1}>
            {item.familyName}
            {item.baseCode ? ` · ${item.baseCode}` : ''}
          </Text>
        </View>
        <Text style={styles.variants}>
          {variants} variant{variants === 1 ? '' : 's'}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    left: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: c.text,
    },
    detailRow: {
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    coatingDotWrap: {
      marginTop: 1,
    },
    detail: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: c.text,
    },
    meta: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: '500',
      color: c.textMuted,
    },
    variants: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textMuted,
    },
  });
