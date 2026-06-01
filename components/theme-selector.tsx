'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { type ThemePreference, useTheme } from '@/lib/theme-provider';

const OPTIONS: {
  key: ThemePreference;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { key: 'light', label: 'Light', icon: 'light-mode' },
  { key: 'dark', label: 'Dark', icon: 'dark-mode' },
  { key: 'system', label: 'System', icon: 'settings-brightness' },
];

export function ThemeSelector() {
  const { preference, setPreference } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Appearance</Text>
      <Text style={styles.subtitle}>Choose light, dark, or match your device</Text>
      <View style={styles.row}>
        {OPTIONS.map((option) => {
          const active = preference === option.key;
          return (
            <Pressable
              key={option.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setPreference(option.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}>
              <MaterialIcons
                name={option.icon}
                size={20}
                color={active ? styles.chipIconActive.color : styles.chipIcon.color}
              />
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    card: {
      borderRadius: 14,
      backgroundColor: c.cardElevated,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 14,
      gap: 8,
    },
    title: { color: c.text, fontSize: 16, fontWeight: '800' },
    subtitle: { color: c.textMuted, fontSize: 13, lineHeight: 18 },
    row: { flexDirection: 'row', gap: 8, marginTop: 4 },
    chip: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.menuRow,
    },
    chipActive: {
      borderColor: c.primary,
      backgroundColor: 'rgba(240, 161, 50, 0.14)',
    },
    chipIcon: { color: c.textMuted },
    chipIconActive: { color: c.primary },
    chipLabel: { color: c.textMuted, fontSize: 12, fontWeight: '700' },
    chipLabelActive: { color: c.primary },
  });
