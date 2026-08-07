'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';

type CatalogSearchBarProps = {
  placeholder?: string;
  initialQuery?: string;
  /** Show trailing filter icon (home hero search). */
  showFilter?: boolean;
  /** Show AI Assistant pill beside the search field. */
  showAiAssistant?: boolean;
  onFilterPress?: () => void;
  onAiPress?: () => void;
};

export function CatalogSearchBar({
  placeholder = 'Search lenses, power, coating, brand...',
  initialQuery = '',
  showFilter = false,
  showAiAssistant = false,
  onFilterPress,
  onAiPress,
}: CatalogSearchBarProps) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function submit() {
    const q = query.trim();
    router.push({
      pathname: '/shop/search',
      params: q ? { q } : {},
    } as never);
  }

  function openSearch() {
    router.push({ pathname: '/shop/search' } as never);
  }

  return (
    <View style={styles.row}>
      <View style={styles.bar}>
        <MaterialIcons name="search" size={20} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={submit}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <MaterialIcons name="close" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
        {showFilter ? (
          <Pressable onPress={onFilterPress ?? openSearch} hitSlop={8} accessibilityLabel="Filters">
            <MaterialIcons name="tune" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {showAiAssistant ? (
        <Pressable
          style={styles.aiPill}
          onPress={onAiPress ?? submit}
          accessibilityRole="button"
          accessibilityLabel="AI Assistant"
        >
          <MaterialIcons name="auto-awesome" size={15} color={colors.primary} />
          <Text style={styles.aiText}>AI Assistant</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    bar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 48,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    input: { flex: 1, fontSize: 14, color: c.text, padding: 0 },
    aiPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(240, 161, 50, 0.45)',
      backgroundColor: c.card,
    },
    aiText: {
      color: c.text,
      fontSize: 12,
      fontWeight: '700',
    },
  });
