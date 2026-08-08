'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';

type CatalogSearchBarProps = {
  placeholder?: string;
  initialQuery?: string;
  /** Show trailing filter icon (home hero search). */
  showFilter?: boolean;
  onFilterPress?: () => void;
};

export function CatalogSearchBar({
  placeholder = 'Search lenses, power, coating, brand...',
  initialQuery = '',
  showFilter = false,
  onFilterPress,
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
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    bar: {
      width: '100%',
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
  });
