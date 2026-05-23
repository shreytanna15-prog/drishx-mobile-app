'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
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

export function OrderTrackingTimeline({ status: rawStatus }: OrderTrackingTimelineProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const status = normalizeOrderStatus(rawStatus);
  const activeMainIndex = getMainStepIndex(status);

  if (status === 'CANCELLED') {
    const config = TERMINAL_STATUS_CONFIG.CANCELLED;
    return (
      <View style={[styles.specialBanner, { backgroundColor: isDark ? `${config.color}22` : config.bg }]}>
        <MaterialIcons name="cancel" size={22} color={config.color} />
        <View style={styles.specialTextBlock}>
          <ThemedText style={[styles.specialTitle, { color: config.color }]}>{config.label}</ThemedText>
          <ThemedText style={styles.specialDescription}>{config.description}</ThemedText>
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
                  isDark && styles.dotDark,
                ]}>
                {isDone ? <MaterialIcons name="check" size={14} color="#fff" /> : null}
              </View>
              {!isLast && <View style={[styles.line, isDone && styles.lineDone]} />}
            </View>
            <View style={styles.stepContent}>
              <ThemedText
                type="defaultSemiBold"
                style={[styles.stepLabel, isCurrent && styles.stepLabelCurrent, isDone && styles.stepLabelDone]}>
                {step.label}
              </ThemedText>
              {(isCurrent || (status === 'COMPLETED' && index === MAIN_TRACKING_STEPS.length - 1)) && (
                <ThemedText style={styles.stepDescription}>{step.description}</ThemedText>
              )}
            </View>
          </View>
        );
      })}

      {status === 'COMPLETED' && (
        <View style={[styles.specialBanner, { backgroundColor: isDark ? '#05966922' : TERMINAL_STATUS_CONFIG.COMPLETED.bg }]}>
          <MaterialIcons name="check-circle" size={22} color={TERMINAL_STATUS_CONFIG.COMPLETED.color} />
          <View style={styles.specialTextBlock}>
            <ThemedText style={[styles.specialTitle, { color: TERMINAL_STATUS_CONFIG.COMPLETED.color }]}>
              {TERMINAL_STATUS_CONFIG.COMPLETED.label}
            </ThemedText>
            <ThemedText style={styles.specialDescription}>{TERMINAL_STATUS_CONFIG.COMPLETED.description}</ThemedText>
          </View>
        </View>
      )}

      {isSpecialStatus(status) && (
        <View
          style={[
            styles.specialBanner,
            { backgroundColor: isDark ? `${SPECIAL_STATUS_CONFIG[status].color}22` : SPECIAL_STATUS_CONFIG[status].bg },
          ]}>
          <MaterialIcons
            name={status === 'PARTIALLY_FULFILLED' ? 'inventory' : 'schedule'}
            size={22}
            color={SPECIAL_STATUS_CONFIG[status].color}
          />
          <View style={styles.specialTextBlock}>
            <ThemedText style={[styles.specialTitle, { color: SPECIAL_STATUS_CONFIG[status].color }]}>
              {SPECIAL_STATUS_CONFIG[status].label}
            </ThemedText>
            <ThemedText style={styles.specialDescription}>{SPECIAL_STATUS_CONFIG[status].description}</ThemedText>
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
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDark: {
    backgroundColor: '#1e293b',
    borderColor: '#475569',
  },
  dotDone: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  dotCurrent: {
    borderColor: '#0a7ea4',
    borderWidth: 3,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  lineDone: {
    backgroundColor: '#0a7ea4',
  },
  stepContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 16,
  },
  stepLabel: {
    fontSize: 15,
    color: '#64748b',
  },
  stepLabelCurrent: {
    color: '#0a7ea4',
  },
  stepLabelDone: {
    color: '#0f172a',
  },
  stepDescription: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  specialBanner: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginTop: 4,
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
    color: '#64748b',
    lineHeight: 18,
  },
});
