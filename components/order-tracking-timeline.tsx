'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand-colors';
import {
  getMainStepIndex,
  isSpecialStatus,
  MAIN_TRACKING_STEPS,
  normalizeOrderStatus,
  SPECIAL_STATUS_CONFIG,
  TERMINAL_STATUS_CONFIG,
} from '@/lib/order-tracking';

type OrderTrackingTimelineProps = {
  status: string;
};

const GOLD = BrandColors.primary;

export function OrderTrackingTimeline({ status: rawStatus }: OrderTrackingTimelineProps) {
  const status = normalizeOrderStatus(rawStatus);
  const activeMainIndex = getMainStepIndex(status);

  if (status === 'CANCELLED') {
    const config = TERMINAL_STATUS_CONFIG.CANCELLED;
    return (
      <View style={[styles.specialBanner, styles.specialBannerCard]}>
        <MaterialIcons name="cancel" size={22} color={config.color} />
        <View style={styles.specialTextBlock}>
          <Text style={[styles.specialTitle, { color: config.color }]}>{config.label}</Text>
          <Text style={styles.specialDescription}>{config.description}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {MAIN_TRACKING_STEPS.map((step, index) => {
        const isDone = status === 'COMPLETED' || index < activeMainIndex;
        const isCurrent = status === step.key;
        const isLast = index === MAIN_TRACKING_STEPS.length - 1;

        return (
          <View key={step.key} style={styles.stepRow}>
            <View style={styles.stepIndicatorCol}>
              <View
                style={[
                  styles.dot,
                  isDone && styles.dotDone,
                  isCurrent && styles.dotCurrent,
                ]}>
                {isDone ? <MaterialIcons name="check" size={14} color={BrandColors.primaryText} /> : null}
              </View>
              {!isLast && <View style={[styles.line, isDone && styles.lineDone]} />}
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepLabel, isCurrent && styles.stepLabelCurrent, isDone && styles.stepLabelDone]}>
                {step.label}
              </Text>
              {(isCurrent || (status === 'COMPLETED' && index === MAIN_TRACKING_STEPS.length - 1)) && (
                <Text style={styles.stepDescription}>{step.description}</Text>
              )}
            </View>
          </View>
        );
      })}

      {status === 'COMPLETED' && (
        <View style={[styles.specialBanner, styles.specialBannerCard]}>
          <MaterialIcons name="check-circle" size={22} color={TERMINAL_STATUS_CONFIG.COMPLETED.color} />
          <View style={styles.specialTextBlock}>
            <Text style={[styles.specialTitle, { color: TERMINAL_STATUS_CONFIG.COMPLETED.color }]}>
              {TERMINAL_STATUS_CONFIG.COMPLETED.label}
            </Text>
            <Text style={styles.specialDescription}>{TERMINAL_STATUS_CONFIG.COMPLETED.description}</Text>
          </View>
        </View>
      )}

      {isSpecialStatus(status) && (
        <View
          style={[
            styles.specialBanner,
            styles.specialBannerCard,
          ]}>
          <MaterialIcons
            name={status === 'PARTIALLY_FULFILLED' ? 'inventory' : 'schedule'}
            size={22}
            color={SPECIAL_STATUS_CONFIG[status].color}
          />
          <View style={styles.specialTextBlock}>
            <Text style={[styles.specialTitle, { color: SPECIAL_STATUS_CONFIG[status].color }]}>
              {SPECIAL_STATUS_CONFIG[status].label}
            </Text>
            <Text style={styles.specialDescription}>{SPECIAL_STATUS_CONFIG[status].description}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    paddingTop: 4,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 56,
  },
  stepIndicatorCol: {
    width: 28,
    alignItems: 'center',
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BrandColors.textMuted,
    backgroundColor: BrandColors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  dotCurrent: {
    borderColor: GOLD,
    borderWidth: 3,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: BrandColors.cardBorder,
    marginVertical: 4,
  },
  lineDone: {
    backgroundColor: GOLD,
  },
  stepContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 16,
  },
  stepLabel: {
    fontSize: 15,
    color: BrandColors.textMuted,
    fontWeight: '600',
  },
  stepLabelCurrent: {
    color: GOLD,
  },
  stepLabelDone: {
    color: BrandColors.text,
  },
  stepDescription: {
    marginTop: 4,
    fontSize: 13,
    color: BrandColors.textMuted,
    lineHeight: 18,
  },
  specialBanner: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  specialBannerCard: {
    backgroundColor: BrandColors.background,
    borderWidth: 1,
    borderColor: BrandColors.cardBorder,
  },
  specialTextBlock: {
    flex: 1,
  },
  specialTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  specialDescription: {
    fontSize: 13,
    color: BrandColors.textMuted,
    lineHeight: 18,
  },
});
