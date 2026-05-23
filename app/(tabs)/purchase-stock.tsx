'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function PurchaseStockScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.screenTitle}>
            Purchase Stock
          </ThemedText>
          <ThemedText style={styles.subtitle}>Procurement and stock intake</ThemedText>
        </View>

        <View style={styles.centeredState}>
          <MaterialIcons name="shopping-cart" size={56} color="#94a3b8" />
          <ThemedText style={styles.emptyTitle}>Coming soon</ThemedText>
          <ThemedText style={styles.stateText}>
            Purchase stock workflows will be available here. You can continue using the other tabs for now.
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  screenTitle: { fontSize: 28, lineHeight: 34 },
  subtitle: { marginTop: 4, fontSize: 14, color: '#64748b' },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  stateText: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22 },
});
