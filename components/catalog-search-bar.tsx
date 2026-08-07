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
};

export function CatalogSearchBar({
  placeholder = 'sv, kt, v2, coating, brand, or -0.25/-0.25…',
  initialQuery = '',
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
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    input: { flex: 1, fontSize: 15, color: c.text, padding: 0 },
  });
