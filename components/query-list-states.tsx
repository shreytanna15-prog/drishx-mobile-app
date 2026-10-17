import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useBrandColors } from '@/lib/theme-provider';

/** Compact error + retry for list screens (RW-11 Phase D). */
export function QueryErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const colors = useBrandColors();
  return (
    <View
      style={[
        styles.box,
        { borderColor: colors.danger, backgroundColor: 'rgba(239,68,68,0.08)' },
      ]}
      accessibilityRole="alert">
      <Text style={[styles.message, { color: colors.danger }]}>{message}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={[styles.btn, { borderColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Retry">
          <Text style={[styles.btnText, { color: colors.primary }]}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function QueryEmptyState({ message }: { message: string }) {
  const colors = useBrandColors();
  return (
    <View style={[styles.box, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
      <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
    </View>
  );
}

export function QueryLoadMoreFooter({
  hasMore,
  loading,
}: {
  hasMore: boolean;
  loading?: boolean;
}) {
  const colors = useBrandColors();
  if (!hasMore) return null;
  if (!loading) return <View style={styles.spacer} />;
  return (
    <View style={styles.footer}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 28,
    alignItems: 'center',
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  btn: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  btnText: { fontSize: 14, fontWeight: '700' },
  footer: { paddingVertical: 16, alignItems: 'center' },
  spacer: { height: 8 },
});
