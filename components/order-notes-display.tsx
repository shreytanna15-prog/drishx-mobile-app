'use client';

import { StyleSheet, Text, View } from 'react-native';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { parseColorHexFromNotesLine } from '@/lib/color-lens-notes';

type OrderNotesDisplayProps = {
  notes: string;
};

export function OrderNotesDisplay({ notes }: OrderNotesDisplayProps) {
  const styles = useThemedStyles(createStyles);
  const lines = notes.split('\n');

  return (
    <View style={styles.wrap}>
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return null;
        }

        const colorHex = parseColorHexFromNotesLine(trimmed);
        if (colorHex) {
          return (
            <View key={`${index}-${trimmed}`} style={styles.colorLine}>
              <View style={[styles.colorSwatch, { backgroundColor: colorHex }]} />
              <Text style={styles.lineText}>{trimmed}</Text>
            </View>
          );
        }

        return (
          <Text key={`${index}-${trimmed}`} style={styles.lineText}>
            {trimmed}
          </Text>
        );
      })}
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    wrap: {
      gap: 4,
    },
    colorLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    colorSwatch: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(0, 0, 0, 0.12)',
    },
    lineText: {
      flex: 1,
      fontSize: 14,
      color: c.text,
      lineHeight: 20,
    },
  });
