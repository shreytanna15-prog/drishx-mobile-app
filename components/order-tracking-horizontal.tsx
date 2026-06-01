'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import {
  getMainStepIndex,
  isSpecialStatus,
  MAIN_TRACKING_STEPS,
  normalizeOrderStatus,
  SPECIAL_STATUS_CONFIG,
  TERMINAL_STATUS_CONFIG,
  type OrderTrackingStatus,
} from '@/lib/order-tracking';
import { useBrandColors } from '@/lib/theme-provider';

type OrderTrackingHorizontalProps = {
  status: string;
  /** When set, each step dot/label is tappable (employee flow). */
  onStepPress?: (step: OrderTrackingStatus) => void;
  disabled?: boolean;
};

export function OrderTrackingHorizontal({
  status: rawStatus,
  onStepPress,
  disabled = false,
}: OrderTrackingHorizontalProps) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const status = normalizeOrderStatus(rawStatus);
  const activeMainIndex = getMainStepIndex(status);
  const interactive = Boolean(onStepPress) && !disabled;

  if (status === 'CANCELLED') {
    const config = TERMINAL_STATUS_CONFIG.CANCELLED;
    return (
      <View style={styles.specialBanner}>
        <MaterialIcons name="cancel" size={20} color={config.color} />
        <Text style={[styles.specialText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Order tracking</Text>
      {disabled ? (
        <View style={styles.updatingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.updatingText}>Updating...</Text>
        </View>
      ) : null}
      <View style={[styles.trackRow, disabled && styles.trackRowDisabled]}>
        {MAIN_TRACKING_STEPS.map((step, index) => {
          const isDone = status === 'COMPLETED' || index < activeMainIndex;
          const isCurrent = status === step.key || (isSpecialStatus(status) && step.key === 'PENDING');
          const isLast = index === MAIN_TRACKING_STEPS.length - 1;
          const isTarget = status === step.key;

          const stepContent = (
            <>
              <View style={styles.stepTop}>
                <View
                  style={[
                    styles.dot,
                    isDone && styles.dotDone,
                    isCurrent && styles.dotCurrent,
                    interactive && styles.dotInteractive,
                    interactive && isTarget && styles.dotInteractiveTarget,
                  ]}>
                  {isDone ? (
                    <MaterialIcons name="check" size={12} color={colors.primaryText} />
                  ) : null}
                </View>
                {!isLast ? (
                  <View style={[styles.connector, isDone && styles.connectorDone]} />
                ) : null}
              </View>
              <Text
                style={[
                  styles.label,
                  isDone && styles.labelDone,
                  isCurrent && styles.labelCurrent,
                  interactive && styles.labelInteractive,
                ]}
                numberOfLines={1}>
                {step.label}
              </Text>
            </>
          );

          return (
            <View key={step.key} style={styles.stepCol}>
              {interactive ? (
                <Pressable
                  style={({ pressed }) => [styles.stepPressable, pressed && styles.stepPressed]}
                  onPress={() => onStepPress?.(step.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Set tracking to ${step.label}`}
                  hitSlop={6}>
                  {stepContent}
                </Pressable>
              ) : (
                stepContent
              )}
            </View>
          );
        })}
      </View>

      {status === 'COMPLETED' ? (
        <View style={styles.specialBanner}>
          <MaterialIcons
            name="check-circle"
            size={20}
            color={TERMINAL_STATUS_CONFIG.COMPLETED.color}
          />
          <Text style={[styles.specialText, { color: TERMINAL_STATUS_CONFIG.COMPLETED.color }]}>
            {TERMINAL_STATUS_CONFIG.COMPLETED.label}
          </Text>
        </View>
      ) : null}

      {isSpecialStatus(status) ? (
        <View style={styles.specialBanner}>
          <MaterialIcons
            name={status === 'PARTIALLY_FULFILLED' ? 'inventory' : 'schedule'}
            size={20}
            color={SPECIAL_STATUS_CONFIG[status].color}
          />
          <Text style={[styles.specialText, { color: SPECIAL_STATUS_CONFIG[status].color }]}>
            {SPECIAL_STATUS_CONFIG[status].label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    wrap: {
      marginTop: 8,
      paddingTop: 4,
    },
    title: {
      fontSize: 12,
      fontWeight: '700',
      color: c.label,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 14,
    },
    trackRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    stepCol: {
      flex: 1,
      alignItems: 'center',
      minWidth: 0,
    },
    stepTop: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      justifyContent: 'center',
    },
    dot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: c.textMuted,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    dotDone: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    dotCurrent: {
      borderColor: c.primary,
      borderWidth: 3,
    },
    connector: {
      position: 'absolute',
      left: '55%',
      right: '-45%',
      top: 10,
      height: 2,
      backgroundColor: c.cardBorder,
    },
    connectorDone: {
      backgroundColor: c.primary,
    },
    label: {
      marginTop: 8,
      fontSize: 10,
      fontWeight: '600',
      color: c.textMuted,
      textAlign: 'center',
    },
    labelDone: {
      color: c.text,
    },
    labelCurrent: {
      color: c.primary,
      fontWeight: '700',
    },
    specialBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 14,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.background,
    },
    specialText: {
      fontSize: 13,
      fontWeight: '700',
      flex: 1,
    },
    stepPressable: {
      alignItems: 'center',
      width: '100%',
      paddingVertical: 4,
      borderRadius: 8,
    },
    stepPressed: { opacity: 0.75 },
    dotInteractive: {
      borderColor: c.textMuted,
    },
    dotInteractiveTarget: {
      borderColor: c.primary,
      borderWidth: 3,
    },
    labelInteractive: {
      textDecorationLine: 'underline',
      textDecorationColor: 'rgba(240, 161, 50, 0.45)',
    },
    trackRowDisabled: { opacity: 0.55 },
    updatingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    updatingText: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
  });
