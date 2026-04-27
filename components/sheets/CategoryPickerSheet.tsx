import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';

import type { Category } from '@/types';
import { Colors, withAlpha } from '@/constants/colors';
import { FontFamily, FontSize, Radius } from '@/constants/typography';
import { BottomSheet } from '@/components/ui/BottomSheet';

interface CategoryPickerSheetProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  selected: string | null;
  onSelect: (id: string) => void;
  title?: string;
  /**
   * If provided, a "Сбросить" button is shown at the bottom of the sheet.
   */
  onClear?: () => void;
  clearLabel?: string;
  zIndex?: number;
}

export function CategoryPickerSheet({
  open,
  onClose,
  categories,
  selected,
  onSelect,
  title = 'Категория',
  onClear,
  clearLabel = 'Сбросить фильтр',
  zIndex,
}: CategoryPickerSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title} zIndex={zIndex}>
      <View style={gridStyle}>
        {categories.map((c) => {
          const active = selected === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => onSelect(c.id)}
              style={[
                cellStyle,
                {
                  backgroundColor: active ? withAlpha(c.color, 0.13) : Colors.surface,
                  borderColor: active ? withAlpha(c.color, 0.33) : Colors.border,
                },
              ]}>
              <Text style={cellIconStyle}>{c.icon}</Text>
              <Text
                style={[cellLabelStyle, { color: active ? c.color : Colors.textMuted }]}
                numberOfLines={2}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {onClear ? (
        <Pressable onPress={onClear} style={clearButtonStyle}>
          <Text style={clearTextStyle}>{clearLabel}</Text>
        </Pressable>
      ) : null}
    </BottomSheet>
  );
}

const gridStyle: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
};

const CELL_WIDTH_PCT = '23.5%' as const;

const cellStyle: ViewStyle = {
  width: CELL_WIDTH_PCT,
  borderRadius: Radius.lg,
  paddingTop: 12,
  paddingBottom: 10,
  paddingHorizontal: 4,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  borderWidth: 1.5,
};

const cellIconStyle: TextStyle = {
  fontSize: 22,
};

const cellLabelStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: 10,
  lineHeight: 12,
  textAlign: 'center',
};

const clearButtonStyle: ViewStyle = {
  marginTop: 14,
  backgroundColor: Colors.surface,
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: Radius.lg,
  paddingVertical: 12,
  alignItems: 'center',
};

const clearTextStyle: TextStyle = {
  fontFamily: FontFamily.medium,
  fontSize: FontSize.md,
  color: Colors.textDim,
};
