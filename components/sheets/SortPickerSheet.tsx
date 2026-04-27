import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Colors, withAlpha } from '@/constants/colors';
import { FontFamily, FontSize, Radius } from '@/constants/typography';
import { BottomSheet } from '@/components/ui/BottomSheet';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

export interface SortPickerOption<T extends string = string> {
  id: T;
  label: string;
  emoji?: string;
  icon?: FeatherName;
}

interface SortPickerSheetProps<T extends string = string> {
  open: boolean;
  onClose: () => void;
  options: SortPickerOption<T>[];
  value: T;
  onChange: (id: T) => void;
  title?: string;
  zIndex?: number;
}

export function SortPickerSheet<T extends string = string>({
  open,
  onClose,
  options,
  value,
  onChange,
  title = 'Сортировка',
  zIndex,
}: SortPickerSheetProps<T>) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title} zIndex={zIndex}>
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            onPress={() => {
              onChange(opt.id);
              onClose();
            }}
            style={[
              rowStyle,
              {
                backgroundColor: active ? withAlpha(Colors.accent, 0.09) : Colors.surface,
                borderColor: active ? withAlpha(Colors.accent, 0.27) : Colors.border,
              },
            ]}>
            {opt.emoji ? (
              <Text style={emojiStyle}>{opt.emoji}</Text>
            ) : opt.icon ? (
              <Feather
                name={opt.icon}
                size={18}
                color={active ? Colors.accent : Colors.textDim}
              />
            ) : null}
            <Text style={[labelStyle, { color: active ? Colors.accent : Colors.textDim }]}>
              {opt.label}
            </Text>
            {active ? (
              <Feather name="check" size={16} color={Colors.accent} />
            ) : (
              <View style={checkPlaceholderStyle} />
            )}
          </Pressable>
        );
      })}
    </BottomSheet>
  );
}

const rowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  borderRadius: Radius.rowCompact,
  borderWidth: 1,
  paddingVertical: 13,
  paddingHorizontal: 16,
  marginBottom: 8,
};

const emojiStyle: TextStyle = {
  fontSize: 18,
};

const labelStyle: TextStyle = {
  flex: 1,
  fontFamily: FontFamily.regular,
  fontSize: FontSize.md,
};

const checkPlaceholderStyle: ViewStyle = {
  width: 16,
  height: 16,
};
