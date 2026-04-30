import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/colors';
import { FontFamily, FontSize, Radius } from '@/constants/typography';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DrumColumn } from '@/components/ui/DrumPicker';

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'] as const;

const DAY_ITEMS = Array.from({ length: 31 }, (_, i) => String(i + 1));

interface DateRangeSheetProps {
  open: boolean;
  onClose: () => void;
  from: Date | null;
  to: Date | null;
  onChange: (from: Date | null, to: Date | null) => void;
  zIndex?: number;
}

export function DateRangeSheet({ open, onClose, from, to, onChange, zIndex }: DateRangeSheetProps) {
  const today = new Date();
  const fromValue = from ?? startOfMonth(today);
  const toValue = to ?? endOfDay(today);

  const setFromField = (field: 'day' | 'month' | 'year', raw: string) => {
    const next = applyField(fromValue, field, raw);
    next.setHours(0, 0, 0, 0);
    onChange(next, toValue);
  };

  const setToField = (field: 'day' | 'month' | 'year', raw: string) => {
    const next = applyField(toValue, field, raw);
    next.setHours(23, 59, 59, 999);
    onChange(fromValue, next);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Период" zIndex={zIndex}>
      <Text style={subTitleStyle}>Дата от</Text>
      <DateOnlyDrum value={fromValue} onChange={setFromField} />

      <View style={spacerStyle} />

      <Text style={subTitleStyle}>Дата до</Text>
      <DateOnlyDrum value={toValue} onChange={setToField} />

      <View style={buttonRowStyle}>
        <Pressable
          onPress={() => {
            onChange(null, null);
            onClose();
          }}
          style={resetButtonStyle}>
          <Text style={resetTextStyle}>Сбросить</Text>
        </Pressable>
        <Pressable onPress={onClose} style={doneButtonStyle}>
          <Text style={doneTextStyle}>Готово</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

interface DateOnlyDrumProps {
  value: Date;
  onChange: (field: 'day' | 'month' | 'year', raw: string) => void;
}

function DateOnlyDrum({ value, onChange }: DateOnlyDrumProps) {
  const currentYear = new Date().getFullYear();
  const yearItems = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

  return (
    <View>
      <View style={drumRowStyle}>
        <DrumColumn
          items={DAY_ITEMS}
          value={String(value.getDate())}
          onChange={(v) => onChange('day', v)}
        />
        <DrumColumn
          items={MONTHS}
          value={MONTHS[value.getMonth()]}
          onChange={(v) => onChange('month', v)}
        />
        <DrumColumn
          items={yearItems}
          value={String(value.getFullYear())}
          onChange={(v) => onChange('year', v)}
        />
      </View>
      <View style={labelsRowStyle}>
        <Text style={labelStyle}>день</Text>
        <Text style={labelStyle}>месяц</Text>
        <Text style={labelStyle}>год</Text>
      </View>
    </View>
  );
}

function applyField(d: Date, field: 'day' | 'month' | 'year', raw: string): Date {
  const next = new Date(d);
  if (field === 'day') next.setDate(parseInt(raw, 10));
  if (field === 'month') {
    const idx = MONTHS.indexOf(raw as (typeof MONTHS)[number]);
    if (idx >= 0) next.setMonth(idx);
  }
  if (field === 'year') next.setFullYear(parseInt(raw, 10));
  return next;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

const subTitleStyle: TextStyle = {
  fontFamily: FontFamily.medium,
  fontSize: FontSize.sm,
  color: Colors.textMuted,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 8,
};

const drumRowStyle: ViewStyle = {
  flexDirection: 'row',
  height: 168,
  borderRadius: Radius.lg,
  overflow: 'hidden',
  backgroundColor: Colors.surface,
};

const labelsRowStyle: ViewStyle = {
  flexDirection: 'row',
  marginTop: 6,
};

const labelStyle: TextStyle = {
  flex: 1,
  textAlign: 'center',
  fontFamily: FontFamily.regular,
  fontSize: 11,
  color: Colors.textMuted,
};

const spacerStyle: ViewStyle = {
  height: 14,
};

const buttonRowStyle: ViewStyle = {
  flexDirection: 'row',
  gap: 8,
  marginTop: 18,
};

const resetButtonStyle: ViewStyle = {
  flex: 1,
  backgroundColor: Colors.surface,
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: Radius.lg,
  paddingVertical: 12,
  alignItems: 'center',
};

const resetTextStyle: TextStyle = {
  fontFamily: FontFamily.medium,
  fontSize: FontSize.md,
  color: Colors.textDim,
};

const doneButtonStyle: ViewStyle = {
  flex: 1,
  backgroundColor: Colors.accent,
  borderRadius: Radius.lg,
  paddingVertical: 13,
  alignItems: 'center',
};

const doneTextStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.md,
  color: '#ffffff',
};
