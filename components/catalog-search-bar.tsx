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
      <View style={styles.scanBtn}>
        <MaterialIcons name="crop-free" size={15} color={colors.textMuted} />
      </View>
      <Pressable
        style={styles.aiBtn}
        onPress={submit}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Search"
      >
        <MaterialIcons name="auto-awesome" size={16} color={colors.primaryText} />
      </Pressable>
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
    scanBtn: {
      width: 30,
      height: 30,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: c.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    aiBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.primary,
      shadowOpacity: 0.4,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
  });
