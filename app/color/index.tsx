'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { COLOR_LENS_FEATURES, COLOR_LENS_MODES } from '@/lib/color-lens';
import { useBrandColors } from '@/lib/theme-provider';

export default function ColorLensScreen() {
  const router = useRouter();
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Color Lens</Text>
            <Text style={styles.subtitle}>Tinted & Fashion Prescription Lens</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Choose Color Mode</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.modeRow}>
            {COLOR_LENS_MODES.map((mode, index) => (
              <Pressable
                key={mode.id}
                style={[styles.modeCard, index === 0 && styles.modeCardHighlighted]}
                onPress={() => router.push(`/color/${mode.id}` as never)}>
                <View style={[styles.modeIconWrap, index === 0 && styles.modeIconWrapHighlighted]}>
                  <MaterialIcons name={mode.icon} size={26} color={colors.primary} />
                </View>
                <Text style={styles.modeTitle}>{mode.title}</Text>
                <Text style={styles.modeDescription}>{mode.description}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>Why choose us?</Text>

          <View style={styles.featureGrid}>
            {COLOR_LENS_FEATURES.map((feature) => (
              <View key={feature.id} style={styles.featureCard}>
                <View style={styles.featureIconWrap}>
                  <MaterialIcons name={feature.icon} size={20} color={colors.primary} />
                </View>
                <Text style={styles.featureLabel} numberOfLines={2}>
                  {feature.label}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.inspirationBanner}>
            <View style={styles.inspirationText}>
              <Text style={styles.inspirationTitle}>Need inspiration?</Text>
              <Text style={styles.inspirationSubtitle}>Explore our color collections</Text>
            </View>
            <Pressable style={styles.exploreBtn} onPress={() => router.push('/color/predefined' as never)}>
              <Text style={styles.exploreBtnText}>Explore</Text>
              <MaterialIcons name="arrow-forward" size={16} color={colors.primaryText} />
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    safe: { flex: 1 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 12,
    },
    backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
    title: { color: c.text, fontSize: 20, fontWeight: '900', textAlign: 'center' },
    subtitle: { color: c.textMuted, fontSize: 12, fontWeight: '600', textAlign: 'center' },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 16 },
    sectionTitle: { color: c.text, fontSize: 17, fontWeight: '800', marginTop: 4 },
    modeRow: { gap: 12, paddingVertical: 4 },
    modeCard: {
      width: 148,
      minHeight: 200,
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 14,
      paddingVertical: 18,
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 10,
    },
    modeCardHighlighted: {
      borderColor: c.primary,
      borderWidth: 1.5,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    modeIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: 'rgba(240, 161, 50, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    modeIconWrapHighlighted: {
      borderColor: c.primary,
      backgroundColor: 'rgba(240, 161, 50, 0.2)',
    },
    modeTitle: { color: c.text, fontSize: 14, fontWeight: '800', textAlign: 'center' },
    modeDescription: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 15,
    },
    featureGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    featureCard: {
      width: '47%',
      flexGrow: 1,
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 12,
      paddingVertical: 14,
      alignItems: 'center',
      gap: 8,
    },
    featureIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(240, 161, 50, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureLabel: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 14,
    },
    inspirationBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.cardElevated,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 16,
      paddingVertical: 16,
      marginTop: 8,
      gap: 12,
    },
    inspirationText: { flex: 1, gap: 2 },
    inspirationTitle: { color: c.text, fontSize: 15, fontWeight: '800' },
    inspirationSubtitle: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
    exploreBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.primary,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
    },
    exploreBtnText: { color: c.primaryText, fontSize: 13, fontWeight: '800' },
  });
