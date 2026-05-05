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
import {
  COLOR_OPTIONS,
  COLOR_OPTIONS_COMPACT_COUNT,
  ICON_OPTIONS,
  ICON_OPTIONS_COMPACT_COUNT,
  MAX_CATEGORY_DESCRIPTION_LEN,
} from '@/constants/categories';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { success, warning } from '@/lib/haptics';

const DEFAULT_ICON = '📌';
const DEFAULT_COLOR = '#78909c';

export interface CategoryDraft {
  label: string;
  icon: string;
  color: string;
  /**
   * Optional voice-parser hint. Empty string means clear (becomes NULL
   * in the DB column). The CategoryEditSheet validates length, but the
   * underlying useStore.updateCategory just passes through.
   */
  description?: string;
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
  const [description, setDescription] = useState(initial?.description ?? '');
  const [iconsExpanded, setIconsExpanded] = useState(false);
  const [colorsExpanded, setColorsExpanded] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.label ?? '');
      setIcon(initial?.icon ?? DEFAULT_ICON);
      setColor(initial?.color ?? DEFAULT_COLOR);
      setDescription(initial?.description ?? '');
      // Auto-expand if the current icon/color isn't in the compact set —
      // user already picked a "rare" choice, hiding it on re-open would
      // be confusing.
      const currentIcon = initial?.icon ?? DEFAULT_ICON;
      const currentColor = initial?.color ?? DEFAULT_COLOR;
      const compactIcons = ICON_OPTIONS.slice(0, ICON_OPTIONS_COMPACT_COUNT);
      const compactColors = COLOR_OPTIONS.slice(0, COLOR_OPTIONS_COMPACT_COUNT);
      setIconsExpanded(!compactIcons.includes(currentIcon));
      setColorsExpanded(!compactColors.includes(currentColor));
    }
  }, [open, initial]);

  const visibleIcons = iconsExpanded
    ? ICON_OPTIONS
    : ICON_OPTIONS.slice(0, ICON_OPTIONS_COMPACT_COUNT);
  const visibleColors = colorsExpanded
    ? COLOR_OPTIONS
    : COLOR_OPTIONS.slice(0, COLOR_OPTIONS_COMPACT_COUNT);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0;

  // Description state — clamp to MAX_CATEGORY_DESCRIPTION_LEN. Counter
  // shown under the field. Empty trimmed → undefined so the store sees
  // "clear" instead of "set to empty string".
  const trimmedDescription = description.trim();
  const remainingChars =
    MAX_CATEGORY_DESCRIPTION_LEN - description.length;

  const handleSubmit = () => {
    if (!canSubmit) return;
    success();
    onSubmit({
      label: trimmed,
      icon,
      color,
      description: trimmedDescription || undefined,
    });
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
      title={isEdit ? 'Редактировать категорию' : 'Новая категория'}
      maxHeight="92%"
      scrollable>
      <Text style={fieldLabelStyle}>Название</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Название категории"
        placeholderTextColor={Colors.textMuted}
        style={[inputStyle, webNoZoomFontSize]}
      />

      <Text style={fieldLabelStyle}>Иконка</Text>
      <View style={iconGridStyle}>
        {visibleIcons.map((ic, idx) => {
          const active = ic === icon;
          return (
            // Composite key — emoji alone isn't a guaranteed-unique
            // primary key (we briefly shipped a duplicate 🏥). Index
            // disambiguates if we ever ship another typo.
            <Pressable
              key={`${ic}-${idx}`}
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
      {ICON_OPTIONS.length > ICON_OPTIONS_COMPACT_COUNT && (
        <Pressable
          onPress={() => setIconsExpanded((v) => !v)}
          style={iconsToggleStyle}>
          <Text style={iconsToggleTextStyle}>
            {iconsExpanded
              ? 'Свернуть иконки'
              : `Ещё иконки (${ICON_OPTIONS.length - ICON_OPTIONS_COMPACT_COUNT}) ↓`}
          </Text>
        </Pressable>
      )}

      <View style={descriptionLabelRowStyle}>
        <Text style={fieldLabelStyle}>Подсказка для голоса (необязательно)</Text>
        <Text
          style={[
            counterStyle,
            remainingChars < 0 && counterOverflowStyle,
          ]}>
          {description.length}/{MAX_CATEGORY_DESCRIPTION_LEN}
        </Text>
      </View>
      <TextInput
        value={description}
        onChangeText={(t) =>
          setDescription(t.slice(0, MAX_CATEGORY_DESCRIPTION_LEN))
        }
        placeholder="Например: дрель, фрезер, шуруповёрт, столярка"
        placeholderTextColor={Colors.textMuted}
        multiline
        maxLength={MAX_CATEGORY_DESCRIPTION_LEN}
        style={[descriptionInputStyle, webNoZoomFontSize]}
      />
      <Text style={hintStyle}>
        Помогает голосу понимать, что относится к этой категории. Например, если
        сказать «учебник 500», голос знает что это «Образование» именно благодаря
        подсказке.
      </Text>

      <Text style={fieldLabelStyle}>Цвет</Text>
      <View style={colorGridStyle}>
        {visibleColors.map((cl) => {
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
      {COLOR_OPTIONS.length > COLOR_OPTIONS_COMPACT_COUNT && (
        <Pressable
          onPress={() => setColorsExpanded((v) => !v)}
          style={iconsToggleStyle}>
          <Text style={iconsToggleTextStyle}>
            {colorsExpanded
              ? 'Свернуть цвета'
              : `Ещё цвета (${COLOR_OPTIONS.length - COLOR_OPTIONS_COMPACT_COUNT}) ↓`}
          </Text>
        </Pressable>
      )}

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

// iOS Safari auto-zooms when input font-size < 16px. Force 16px on web only.
const webNoZoomFontSize: TextStyle | null =
  Platform.OS === 'web' ? { fontSize: 16 } : null;

const iconGridStyle: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  // space-between distributes icons evenly across the row regardless of
  // sheet width, so 8 icons always fill the row without spilling onto
  // the next line. Gaps are computed by flex, not fixed.
  justifyContent: 'space-between',
  rowGap: 10,
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
  fontSize: 22,
};

const iconsToggleStyle: ViewStyle = {
  alignSelf: 'flex-start',
  paddingVertical: 6,
  paddingHorizontal: 2,
  marginTop: -6,
  marginBottom: 14,
};

const iconsToggleTextStyle: TextStyle = {
  fontFamily: FontFamily.medium,
  fontSize: FontSize.sm,
  color: Colors.accent,
};

const descriptionLabelRowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 8,
};

const counterStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: FontSize.xs,
  color: Colors.textMuted,
};

const counterOverflowStyle: TextStyle = {
  color: Colors.negative,
};

const descriptionInputStyle: TextStyle = {
  width: '100%',
  minHeight: 64,
  backgroundColor: Colors.surface,
  borderWidth: 1,
  borderColor: Colors.borderMid,
  borderRadius: Radius.md,
  paddingVertical: 10,
  paddingHorizontal: 14,
  color: Colors.text,
  fontFamily: FontFamily.regular,
  fontSize: FontSize.md,
  marginBottom: 8,
  textAlignVertical: 'top',
};

const hintStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: FontSize.xs,
  color: Colors.textMuted,
  lineHeight: 16,
  marginBottom: 14,
};

const colorGridStyle: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  rowGap: 10,
  marginBottom: 18,
};

const colorSwatchStyle: ViewStyle = {
  width: 36,
  height: 36,
  borderRadius: 18,
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
