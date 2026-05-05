import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
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
  // Voice handoff: when user picks "Изменить" in VoiceConfirmSheet, the
  // recognized values land here through the store. AddExpenseSheet reads
  // them on open, prefills its fields, then clears the slot so a manual
  // "+" tap right after won't re-fill stale values.
  const voicePending = useStore((s) => s.voicePending);
  const setVoicePending = useStore((s) => s.setVoicePending);

  const fallbackId = categories[0]?.id ?? FALLBACK_CATEGORY.id;
  const [amount, setAmount] = useState('');
  const [selCat, setSelCat] = useState<string>(fallbackId);
  const [comment, setComment] = useState('');
  const [date, setDate] = useState<Date>(() => new Date());
  const [catSheetOpen, setCatSheetOpen] = useState(false);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);

  const amountRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!open) return;

    // Reset form. Then, if there's a voicePending handoff in the store,
    // overlay its values on top of the defaults — and clear the store.
    let initialAmount = '';
    let initialComment = '';
    let initialDate = new Date();
    let initialCat = fallbackId;

    if (voicePending) {
      if (voicePending.amount !== null) initialAmount = String(voicePending.amount);
      if (voicePending.name) initialComment = voicePending.name;
      if (voicePending.date) initialDate = localMidnightFromIso(voicePending.date);
      if (voicePending.cat && categories.find((c) => c.id === voicePending.cat)) {
        initialCat = voicePending.cat;
      }
      setVoicePending(null); // one-shot
    }

    setAmount(initialAmount);
    setComment(initialComment);
    setDate(initialDate);
    setSelCat(initialCat);
    setCatSheetOpen(false);
    setDateSheetOpen(false);

    const t = setTimeout(() => amountRef.current?.focus(), FOCUS_DELAY);
    return () => clearTimeout(t);
    // We deliberately depend only on `open` and `fallbackId` — voicePending
    // is consumed on the same tick as `open` flips to true and isn't a
    // continuous source of updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              style={[amountInputStyle, webMinShrinkStyle]}
            />
            <Text style={amountSuffixStyle}>₽</Text>
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
          style={[commentInputStyle, webNoZoomFontSize]}
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

// Build a Date for local midnight from a YYYY-MM-DD string. Using
// `new Date('2026-05-03')` would give UTC midnight — fine for ISO sorting
// but wrong for displaying a "day". `setHours(0,0,0,0)` keeps us in the
// user's TZ so the day shown matches the day they spoke.
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

// On web, HTML <input> has intrinsic min-width: auto, which prevents flex
// shrinking and pushes adjacent siblings (the ₽ suffix) outside the box.
// minWidth: 0 lets the input shrink so ₽ stays visible.
const webMinShrinkStyle: TextStyle | null =
  Platform.OS === 'web' ? { minWidth: 0 } : null;

// iOS Safari auto-zooms when an input is focused with font-size < 16px.
// Forcing 16px on web avoids the zoom while keeping native font-size intact.
const webNoZoomFontSize: TextStyle | null =
  Platform.OS === 'web' ? { fontSize: 16 } : null;

const amountSuffixStyle: TextStyle = {
  fontFamily: FontFamily.light,
  fontSize: 22,
  color: Colors.textMuted,
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
