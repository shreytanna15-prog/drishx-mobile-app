import { StyleSheet, Text, View } from 'react-native';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { formatAddValue, formatAxisValue } from '@/lib/lens-display';
import { formatPowerLabel } from '@/lib/cart-utils';

type PowerBadgesItem = {
  sph?: number | null;
  cyl?: number | null;
  axis?: number | null;
  add?: number | null;
};

type LensPowerBadgesProps = {
  item: PowerBadgesItem;
  /** Include ADD badge (e.g. for Kryptok / Progressive). Default false. */
  showAdd?: boolean;
};

function PowerBadge({
  label,
  value,
  compact,
  styles,
}: {
  label: string;
  value: string;
  compact: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={[styles.badge, compact && styles.badgeCompact]}>
      <Text style={[styles.badgeLabel, compact && styles.badgeLabelCompact]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.badgeValue, compact && styles.badgeValueCompact]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function LensPowerBadges({ item, showAdd = false }: LensPowerBadgesProps) {
  const styles = useThemedStyles(createStyles);
  const compact = showAdd;

  const sphValue =
    item.sph != null && Math.abs(Number(item.sph)) > 1e-9
      ? formatPowerLabel(Number(item.sph))
      : '—';
  const cylValue =
    item.cyl != null && Math.abs(Number(item.cyl)) > 1e-9
      ? formatPowerLabel(Number(item.cyl))
      : '—';
  const axisValue = formatAxisValue(item.axis);

  return (
    <View style={styles.row}>
      <PowerBadge label="SPH" value={sphValue} compact={compact} styles={styles} />
      <PowerBadge label="CYL" value={cylValue} compact={compact} styles={styles} />
      <PowerBadge label="AXIS" value={axisValue} compact={compact} styles={styles} />
      {showAdd ? (
        <PowerBadge
          label="ADD"
          value={formatAddValue(item.add)}
          compact={compact}
          styles={styles}
        />
      ) : null}
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
      alignItems: 'stretch',
      gap: 5,
      marginTop: 8,
      width: '100%',
    },
    badge: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 0,
      paddingVertical: 5,
      paddingHorizontal: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.menuRowAlt,
    },
    badgeCompact: {
      paddingVertical: 4,
      paddingHorizontal: 2,
      borderRadius: 7,
    },
    badgeLabel: {
      fontSize: 8,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: c.textMuted,
      lineHeight: 10,
    },
    badgeLabelCompact: {
      fontSize: 7,
      letterSpacing: 0.4,
      lineHeight: 9,
    },
    badgeValue: {
      fontSize: 12,
      fontWeight: '700',
      color: c.text,
      lineHeight: 15,
      marginTop: 1,
    },
    badgeValueCompact: {
      fontSize: 11,
      lineHeight: 14,
    },
  });
