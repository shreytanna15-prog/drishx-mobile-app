'use client';

import { memo, useCallback, useMemo } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import type { WholesaleMatrixRow, WholesaleMatrixSpec } from '@/lib/wholesale-matrix';

type WholesaleQtyMatrixProps = {
  spec: WholesaleMatrixSpec;
  visibleRows: WholesaleMatrixRow[];
  visibleCols: number[];
  qtyMap: Record<string, string>;
  onQtyChange: (key: string, value: string) => void;
};

type MatrixRowItem = {
  row: WholesaleMatrixRow;
  rowIndex: number;
  showPrimaryLabel: boolean;
};

const ROW_HEIGHT = 52;

export function WholesaleQtyMatrix({
  spec,
  visibleRows,
  visibleCols,
  qtyMap,
  onQtyChange,
}: WholesaleQtyMatrixProps) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const rowLabelWidth = 72;
  const colWidth = visibleCols.length > 4 ? 88 : 76;

  const rowItems = useMemo((): MatrixRowItem[] => {
    return visibleRows.map((row, rowIndex) => ({
      row,
      rowIndex,
      showPrimaryLabel: rowIndex === 0 || row.label !== visibleRows[rowIndex - 1]?.label,
    }));
  }, [visibleRows]);

  const renderRow = useCallback(
    ({ item }: { item: MatrixRowItem }) => (
      <View style={[styles.dataRow, item.rowIndex === visibleRows.length - 1 && styles.dataRowLast]}>
        <View style={[styles.rowHeaderCell, { width: rowLabelWidth }]}>
          {item.showPrimaryLabel ? (
            <Text style={styles.rowHeaderText} numberOfLines={2}>
              {item.row.label}
            </Text>
          ) : null}
          {item.row.subLabel ? (
            <Text
              style={[styles.rowSubLabel, !item.showPrimaryLabel && styles.rowSubLabelOnly]}
              numberOfLines={1}>
              {item.row.subLabel}
            </Text>
          ) : null}
        </View>
        {visibleCols.map((col) => {
          const cells = spec.cellsAt(item.row, col);
          const cell = cells[0];
          if (!cell) {
            return (
              <View key={`${item.row.id}-${col}`} style={[styles.emptyCell, { width: colWidth }]}>
                <Text style={styles.emptyCellText}>—</Text>
              </View>
            );
          }
          return (
            <MatrixCell
              key={`${item.row.id}-${col}`}
              width={colWidth}
              cellKey={cell.key}
              value={qtyMap[cell.key] ?? ''}
              onQtyChange={onQtyChange}
              placeholderColor={colors.placeholder}
              styles={styles}
            />
          );
        })}
      </View>
    ),
    [colWidth, colors.placeholder, onQtyChange, qtyMap, rowLabelWidth, spec, styles, visibleCols, visibleRows.length]
  );

  const keyExtractor = useCallback((item: MatrixRowItem) => item.row.id, []);

  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator bounces={false}>
        <View>
          <View style={styles.headerRow}>
            <View style={[styles.cornerCell, { width: rowLabelWidth }]}>
              <Text style={styles.cornerTop}>{spec.rowHeader}</Text>
              <Text style={styles.cornerBottom}>{spec.colHeader}</Text>
            </View>
            {visibleCols.map((col) => (
              <View key={`col-${col}`} style={[styles.colHeaderCell, { width: colWidth }]}>
                <Text style={styles.colHeaderText} numberOfLines={2}>
                  {spec.formatCol(col)}
                </Text>
              </View>
            ))}
          </View>

          <FlatList
            data={rowItems}
            keyExtractor={keyExtractor}
            renderItem={renderRow}
            scrollEnabled={false}
            initialNumToRender={10}
            maxToRenderPerBatch={8}
            windowSize={5}
            removeClippedSubviews
            getItemLayout={(_data, index) => ({
              length: ROW_HEIGHT,
              offset: ROW_HEIGHT * index,
              index,
            })}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const MatrixCell = memo(
  function MatrixCell({
    width,
    cellKey,
    value,
    onQtyChange,
    placeholderColor,
    styles,
  }: {
    width: number;
    cellKey: string;
    value: string;
    onQtyChange: (key: string, value: string) => void;
    placeholderColor: string;
    styles: ReturnType<typeof createStyles>;
  }) {
    return (
      <View style={[styles.cellGroup, { width }]}>
        <TextInput
          value={value}
          onChangeText={(text) => onQtyChange(cellKey, text)}
          keyboardType="number-pad"
          style={styles.qtyInput}
          placeholder="0"
          placeholderTextColor={placeholderColor}
        />
      </View>
    );
  },
  (prev, next) => prev.cellKey === next.cellKey && prev.value === next.value
);

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    wrapper: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      overflow: 'hidden',
    },
    headerRow: {
      flexDirection: 'row',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.cardBorder,
      backgroundColor: c.menuRowAlt,
    },
    cornerCell: {
      paddingHorizontal: 6,
      paddingVertical: 8,
      justifyContent: 'center',
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: c.cardBorder,
    },
    cornerTop: {
      fontSize: 9,
      fontWeight: '700',
      color: c.label,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    cornerBottom: {
      fontSize: 9,
      fontWeight: '700',
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 2,
    },
    colHeaderCell: {
      paddingHorizontal: 4,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: c.cardBorder,
    },
    colHeaderText: {
      fontSize: 11,
      fontWeight: '800',
      color: c.text,
      textAlign: 'center',
    },
    dataRow: {
      flexDirection: 'row',
      minHeight: ROW_HEIGHT,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.cardBorder,
    },
    dataRowLast: {
      borderBottomWidth: 0,
    },
    rowHeaderCell: {
      paddingHorizontal: 6,
      paddingVertical: 6,
      justifyContent: 'center',
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: c.cardBorder,
      backgroundColor: c.menuRowAlt,
    },
    rowHeaderText: {
      fontSize: 11,
      fontWeight: '800',
      color: c.text,
      textAlign: 'center',
    },
    rowSubLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: c.textMuted,
      textAlign: 'center',
      marginTop: 2,
    },
    rowSubLabelOnly: {
      fontSize: 11,
      fontWeight: '800',
      color: c.text,
      marginTop: 0,
    },
    cellGroup: {
      paddingHorizontal: 4,
      paddingVertical: 6,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: c.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyInput: {
      width: '100%',
      minWidth: 52,
      maxWidth: 72,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 8,
      paddingHorizontal: 4,
      paddingVertical: 6,
      fontSize: 13,
      fontWeight: '900',
      color: c.text,
      backgroundColor: c.inputBg,
      textAlign: 'center',
    },
    emptyCell: {
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: c.cardBorder,
    },
    emptyCellText: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
  });
