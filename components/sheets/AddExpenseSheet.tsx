import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Colors, withAlpha } from '@/constants/colors';
import { FontFamily, FontSize, Radius } from '@/constants/typography';
import { FALLBACK_CATEGORY } from '@/constants/categories';
import { useStore } from '@/store/useStore';
import { fmtDatePill } from '@/utils/format';
import { success } from '@/lib/haptics';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { CategoryPickerSheet } from './CategoryPickerSheet';
import { DatePickerSheet } from './DatePickerSheet';

// 400ms gives the sheet enter-animation (320ms) time to fully settle before
// the soft keyboard starts sliding up — prevents both animations interfering.
const FOCUS_DELAY = 400;
// When dismissing the keyboard before opening a nested sheet, give the
// keyboard a beat to start sliding away so the nested sheet rides up cleanly
// instead of being pushed by simultaneous translate animations.
const NESTED_OPEN_DELAY = 60;
const NESTED_Z_INDEX = 500;

interface AddExpenseSheetProps {
  open: boolean;
  onClose: () => void;
}

export function AddExpenseSheet({ open, onClose }: AddExpenseSheetProps) {
  const categories = useStore((s) => s.categories);
  const addExpense = useStore((s) => s.addExpense);

  const fallbackId = categories[0]?.id ?? FALLBACK_CATEGORY.id;
  const [amount, setAmount] = useState('');
  const [selCat, setSelCat] = useState<string>(fallbackId);
  const [comment, setComment] = useState('');
  const [date, setDate] = useState<Date>(() => new Date());
  const [catSheetOpen, setCatSheetOpen] = useState(false);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);

  const amountRef = useRef<TextInput>(null);

  useEffect(() => {
    if (open) {
      setAmount('');
      setComment('');
      setDate(new Date());
      setSelCat(fallbackId);
      setCatSheetOpen(false);
      setDateSheetOpen(false);
      const t = setTimeout(() => amountRef.current?.focus(), FOCUS_DELAY);
      return () => clearTimeout(t);
    }
  }, [open, fallbackId]);

  const cat =
    categories.find((c) => c.id === selCat) ?? categories[0] ?? FALLBACK_CATEGORY;

  const parsed = parseFloat(amount.replace(',', '.'));
  const canSubmit = !Number.isNaN(parsed) && parsed > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    addExpense({
      cat: selCat,
      name: comment.trim() || cat.label,
      amount: parsed,
      date: new Date(date),
    });
    success();
    onClose();
  };

  return (
    <>
      <BottomSheet open={open} onClose={onClose}>
        <View style={amountRowStyle}>
          <View style={amountInputBoxStyle}>
            <TextInput
              ref={amountRef}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              inputMode="decimal"
              style={amountInputStyle}
            />
            <Text style={amountSuffixStyle}>₽</Text>
          </View>
          <View style={micButtonStyle}>
            <Feather name="mic" size={18} color={Colors.textMuted} />
          </View>
        </View>

        <View style={pillsRowStyle}>
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setTimeout(() => setCatSheetOpen(true), NESTED_OPEN_DELAY);
            }}
            style={[
              catPillStyle,
              {
                backgroundColor: withAlpha(cat.color, 0.13),
                borderColor: withAlpha(cat.color, 0.27),
              },
            ]}>
            <Text style={pillEmojiStyle}>{cat.icon}</Text>
            <Text style={[pillLabelStyle, { color: Colors.text }]}>{cat.label}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setTimeout(() => setDateSheetOpen(true), NESTED_OPEN_DELAY);
            }}
            style={datePillStyle}>
            <Feather name="calendar" size={13} color={Colors.textMuted} />
            <Text style={[pillLabelStyle, { color: Colors.textDim }]}>
              {fmtDatePill(date)}
            </Text>
          </Pressable>
        </View>

        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Комментарий..."
          placeholderTextColor={Colors.textMuted}
          style={commentInputStyle}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

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
            Добавить
          </Text>
        </Pressable>
      </BottomSheet>

      <CategoryPickerSheet
        open={catSheetOpen}
        onClose={() => setCatSheetOpen(false)}
        categories={categories}
        selected={selCat}
        onSelect={(id) => {
          setSelCat(id);
          setCatSheetOpen(false);
        }}
        title="Категория"
        zIndex={NESTED_Z_INDEX}
      />

      <DatePickerSheet
        open={dateSheetOpen}
        onClose={() => setDateSheetOpen(false)}
        value={date}
        onChange={setDate}
        zIndex={NESTED_Z_INDEX}
      />
    </>
  );
}

const amountRowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  marginBottom: 14,
};

const amountInputBoxStyle: ViewStyle = {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: Colors.surfaceTop,
  borderRadius: Radius.lg,
  paddingHorizontal: 14,
  paddingVertical: 10,
  gap: 6,
};

const amountInputStyle: TextStyle = {
  flex: 1,
  fontFamily: FontFamily.light,
  fontSize: 32,
  letterSpacing: -1,
  color: Colors.text,
  paddingVertical: 0,
};

const amountSuffixStyle: TextStyle = {
  fontFamily: FontFamily.light,
  fontSize: 22,
  color: Colors.textMuted,
};

const micButtonStyle: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: Colors.surfaceTop,
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0.6,
};

const pillsRowStyle: ViewStyle = {
  flexDirection: 'row',
  gap: 8,
  marginBottom: 12,
};

const pillBaseStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 7,
  borderRadius: Radius.pill,
  paddingHorizontal: 14,
  paddingVertical: 7,
  borderWidth: 1,
};

const catPillStyle: ViewStyle = {
  ...pillBaseStyle,
};

const datePillStyle: ViewStyle = {
  ...pillBaseStyle,
  backgroundColor: Colors.surfaceTop,
  borderColor: Colors.border,
  gap: 6,
};

const pillEmojiStyle: TextStyle = {
  fontSize: 13,
};

const pillLabelStyle: TextStyle = {
  fontFamily: FontFamily.medium,
  fontSize: FontSize.base,
};

const commentInputStyle: TextStyle = {
  width: '100%',
  backgroundColor: Colors.surfaceTop,
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: Radius.lg,
  paddingHorizontal: 14,
  paddingVertical: 11,
  color: Colors.text,
  fontFamily: FontFamily.regular,
  fontSize: FontSize.md,
  marginBottom: 14,
};

const submitButtonStyle: ViewStyle = {
  width: '100%',
  borderRadius: Radius.lg,
  borderWidth: 1,
  paddingVertical: 14,
  alignItems: 'center',
};

const submitTextStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.lg,
};
