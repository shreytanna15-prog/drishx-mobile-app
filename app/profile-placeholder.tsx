'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand-colors';

const GOLD = BrandColors.primary;
const BG = BrandColors.background;
const BORDER = BrandColors.cardBorder;

export default function ProfilePlaceholderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ title?: string }>();
  const title = params.title?.trim() || 'Details';

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={22} color={GOLD} />
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.content}>
          <MaterialIcons name="construction" size={44} color={GOLD} />
          <Text style={styles.messageTitle}>Coming soon</Text>
          <Text style={styles.messageText}>This section will be available in a future update.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: { color: BrandColors.text, fontSize: 18, fontWeight: '700' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  messageTitle: { color: BrandColors.text, fontSize: 22, fontWeight: '800' },
  messageText: { color: BrandColors.textMuted, fontSize: 14, textAlign: 'center' },
});
