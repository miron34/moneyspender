import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import type { Category } from '@/types';
import { Colors, withAlpha } from '@/constants/colors';
import { FontFamily, FontSize, Radius } from '@/constants/typography';
import { COLOR_OPTIONS, ICON_OPTIONS } from '@/constants/categories';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { success, warning } from '@/lib/haptics';

const DEFAULT_ICON = '📌';
const DEFAULT_COLOR = '#78909c';

export interface CategoryDraft {
  label: string;
  icon: string;
  color: string;
}

interface CategoryEditSheetProps {
  open: boolean;
  onClose: () => void;
  /** When provided, sheet runs in edit mode. Pass null/undefined for create mode. */
  initial?: Category | null;
  onSubmit: (draft: CategoryDraft) => void;
  /** When provided in edit mode, shows the destructive "Удалить категорию" button. */
  onDelete?: () => void;
}

export function CategoryEditSheet({
  open,
  onClose,
  initial,
  onSubmit,
  onDelete,
}: CategoryEditSheetProps) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.label ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? DEFAULT_ICON);
  const [color, setColor] = useState(initial?.color ?? DEFAULT_COLOR);

  useEffect(() => {
    if (open) {
      setName(initial?.label ?? '');
      setIcon(initial?.icon ?? DEFAULT_ICON);
      setColor(initial?.color ?? DEFAULT_COLOR);
    }
  }, [open, initial]);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    success();
    onSubmit({ label: trimmed, icon, color });
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' && window.confirm('Удалить категорию?');
      if (ok) {
        warning();
        onDelete();
      }
    } else {
      Alert.alert('Удалить категорию?', 'Это действие нельзя отменить.', [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            warning();
            onDelete();
          },
        },
      ]);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isEdit ? 'Редактировать категорию' : 'Новая категория'}>
      <Text style={fieldLabelStyle}>Название</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Название категории"
        placeholderTextColor={Colors.textMuted}
        style={inputStyle}
      />

      <Text style={fieldLabelStyle}>Иконка</Text>
      <View style={iconGridStyle}>
        {ICON_OPTIONS.map((ic) => {
          const active = ic === icon;
          return (
            <Pressable
              key={ic}
              onPress={() => setIcon(ic)}
              style={[
                iconButtonStyle,
                {
                  borderColor: active ? withAlpha(Colors.accent, 0.4) : Colors.border,
                  backgroundColor: active ? withAlpha(Colors.accent, 0.09) : Colors.surface,
                },
              ]}>
              <Text style={iconCharStyle}>{ic}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={fieldLabelStyle}>Цвет</Text>
      <View style={colorGridStyle}>
        {COLOR_OPTIONS.map((cl) => {
          const active = cl === color;
          return (
            <Pressable
              key={cl}
              onPress={() => setColor(cl)}
              style={[
                colorSwatchStyle,
                {
                  backgroundColor: cl,
                  borderColor: active ? '#ffffff' : 'transparent',
                },
              ]}
            />
          );
        })}
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={[
          submitButtonStyle,
          {
            backgroundColor: canSubmit ? Colors.accent : Colors.surfaceTop,
            borderColor: canSubmit ? Colors.accent : Colors.border,
          },
        ]}>
        <Text
          style={[
            submitTextStyle,
            { color: canSubmit ? '#ffffff' : Colors.textMuted },
          ]}>
          {isEdit ? 'Сохранить' : 'Создать'}
        </Text>
      </Pressable>

      {isEdit && onDelete ? (
        <Pressable onPress={handleDelete} style={deleteButtonStyle}>
          <Text style={deleteTextStyle}>Удалить категорию</Text>
        </Pressable>
      ) : null}
    </BottomSheet>
  );
}

const fieldLabelStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: FontSize.sm,
  color: Colors.textMuted,
  marginBottom: 8,
};

const inputStyle: TextStyle = {
  width: '100%',
  backgroundColor: Colors.surface,
  borderWidth: 1,
  borderColor: Colors.borderMid,
  borderRadius: Radius.md,
  paddingVertical: 10,
  paddingHorizontal: 14,
  color: Colors.text,
  fontFamily: FontFamily.regular,
  fontSize: FontSize.md,
  marginBottom: 14,
};

const iconGridStyle: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 14,
};

const iconButtonStyle: ViewStyle = {
  width: 40,
  height: 40,
  borderRadius: Radius.md,
  borderWidth: 1.5,
  alignItems: 'center',
  justifyContent: 'center',
};

const iconCharStyle: TextStyle = {
  fontSize: 20,
};

const colorGridStyle: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 18,
};

const colorSwatchStyle: ViewStyle = {
  width: 34,
  height: 34,
  borderRadius: 17,
  borderWidth: 2,
};

const submitButtonStyle: ViewStyle = {
  width: '100%',
  borderRadius: Radius.lg,
  borderWidth: 1,
  paddingVertical: 13,
  alignItems: 'center',
  marginBottom: 8,
};

const submitTextStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.md,
};

const deleteButtonStyle: ViewStyle = {
  width: '100%',
  backgroundColor: 'rgba(255,87,87,0.1)',
  borderWidth: 1,
  borderColor: 'rgba(255,87,87,0.3)',
  borderRadius: Radius.lg,
  paddingVertical: 13,
  alignItems: 'center',
};

const deleteTextStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.md,
  color: Colors.negative,
};
