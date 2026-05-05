// VoiceConfirmSheet — bottom sheet that shows the model's matched values
// after a successful voice capture. User picks Save (commit directly) or
// Edit (open AddExpenseSheet with the values prefilled for manual tweaking).
//
// This sheet is owned by `app/(tabs)/_layout.tsx` so it sits above the
// TabBar and is independent of AddExpenseSheet — голос больше не часть
// AddExpenseSheet, теперь это отдельная цепочка через mic-FAB на TabBar.

import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Colors, withAlpha } from '@/constants/colors';
import { FontFamily, FontSize, Radius } from '@/constants/typography';
import { dayHeader } from '@/utils/format';
import type { Category } from '@/types';
import type { ParsedExpense } from '@/types/voice';

import { BottomSheet } from '@/components/ui/BottomSheet';

interface VoiceConfirmSheetProps {
  open: boolean;
  onClose: () => void;
  pending: ParsedExpense | null;
  categories: Category[];
  onSave: () => void;
  onEdit: () => void;
}

export function VoiceConfirmSheet({
  open,
  onClose,
  pending,
  categories,
  onSave,
  onEdit,
}: VoiceConfirmSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      {pending ? (
        <ConfirmContent
          pending={pending}
          categories={categories}
          onSave={onSave}
          onEdit={onEdit}
        />
      ) : null}
    </BottomSheet>
  );
}

interface ConfirmContentProps {
  pending: ParsedExpense;
  categories: Category[];
  onSave: () => void;
  onEdit: () => void;
}

function ConfirmContent({ pending, categories, onSave, onEdit }: ConfirmContentProps) {
  const resolvedCat = pending.cat
    ? categories.find((c) => c.id === pending.cat)
    : null;

  const hasAmount = pending.amount !== null && pending.amount > 0;
  const hasMeta = !!resolvedCat || !!pending.name;

  // Show the date row only if the model parsed a date AND it's different
  // from today — no point telling the user "today" when that's the default.
  const dateLabel = pending.date ? formatDateForConfirm(pending.date) : null;

  return (
    <View style={containerStyle}>
      <Text style={titleStyle}>Добавить трату?</Text>

      {hasAmount && <Text style={amountStyle}>{pending.amount} ₽</Text>}

      {hasMeta && (
        <View style={metaRowStyle}>
          {resolvedCat && (
            <View
              style={[
                catChipStyle,
                {
                  backgroundColor: withAlpha(resolvedCat.color, 0.13),
                  borderColor: withAlpha(resolvedCat.color, 0.27),
                },
              ]}>
              <Text style={emojiStyle}>{resolvedCat.icon}</Text>
              <Text style={[chipLabelStyle, { color: Colors.text }]}>
                {resolvedCat.label}
              </Text>
            </View>
          )}
          {pending.name && (
            <Text style={nameStyle} numberOfLines={1}>
              {pending.name}
            </Text>
          )}
        </View>
      )}

      {dateLabel && (
        <View style={dateRowStyle}>
          <Feather name="calendar" size={13} color={Colors.textMuted} />
          <Text style={dateTextStyle}>{dateLabel}</Text>
        </View>
      )}

      <View style={buttonsRowStyle}>
        <Pressable onPress={onEdit} style={editButtonStyle}>
          <Text style={editTextStyle}>Изменить</Text>
        </Pressable>
        <Pressable onPress={onSave} style={saveButtonStyle}>
          <Text style={saveTextStyle}>Сохранить</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Build local-midnight Date from YYYY-MM-DD; identical helper lives in
// AddExpenseSheet but duplicating saves coupling between sheets.
function localMidnightFromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map((s) => parseInt(s, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return new Date();
  }
  const date = new Date();
  date.setFullYear(y, m - 1, d);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateForConfirm(iso: string): string | null {
  const date = localMidnightFromIso(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  if (sameDay) return null;
  return dayHeader(date, today);
}

const containerStyle: ViewStyle = {
  paddingVertical: 6,
};

const titleStyle: TextStyle = {
  fontFamily: FontFamily.medium,
  fontSize: FontSize.md,
  color: Colors.textDim,
  marginBottom: 14,
};

const amountStyle: TextStyle = {
  fontFamily: FontFamily.light,
  fontSize: 40,
  letterSpacing: -1,
  color: Colors.text,
  marginBottom: 10,
};

const metaRowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  marginBottom: 10,
  flexWrap: 'wrap',
};

const catChipStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 7,
  borderRadius: Radius.pill,
  paddingHorizontal: 14,
  paddingVertical: 7,
  borderWidth: 1,
};

const emojiStyle: TextStyle = {
  fontSize: 13,
};

const chipLabelStyle: TextStyle = {
  fontFamily: FontFamily.medium,
  fontSize: FontSize.base,
};

const nameStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: FontSize.md,
  color: Colors.textDim,
  flexShrink: 1,
};

const dateRowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  marginBottom: 18,
};

const dateTextStyle: TextStyle = {
  fontFamily: FontFamily.medium,
  fontSize: FontSize.base,
  color: Colors.textDim,
};

const buttonsRowStyle: ViewStyle = {
  flexDirection: 'row',
  gap: 10,
};

const editButtonStyle: ViewStyle = {
  flex: 1,
  borderRadius: Radius.lg,
  borderWidth: 1,
  borderColor: Colors.border,
  backgroundColor: Colors.surfaceTop,
  paddingVertical: 14,
  alignItems: 'center',
};

const editTextStyle: TextStyle = {
  fontFamily: FontFamily.medium,
  fontSize: FontSize.lg,
  color: Colors.text,
};

const saveButtonStyle: ViewStyle = {
  flex: 1,
  borderRadius: Radius.lg,
  borderWidth: 1,
  borderColor: Colors.accent,
  backgroundColor: Colors.accent,
  paddingVertical: 14,
  alignItems: 'center',
};

const saveTextStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.lg,
  color: '#ffffff',
};
