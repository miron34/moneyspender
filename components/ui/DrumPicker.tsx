import { useEffect, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/constants/colors';
import { FontFamily, Radius } from '@/constants/typography';

export const DRUM_ITEM_HEIGHT = 42;
export const DRUM_VISIBLE_ITEMS = 4;
export const DRUM_HEIGHT = DRUM_ITEM_HEIGHT * DRUM_VISIBLE_ITEMS;
const DRUM_FADE = DRUM_ITEM_HEIGHT + DRUM_ITEM_HEIGHT / 2;
const DRUM_PADDING = (DRUM_HEIGHT - DRUM_ITEM_HEIGHT) / 2;

interface DrumColumnProps {
  items: readonly string[];
  value: string;
  onChange: (value: string) => void;
}

export function DrumColumn({ items, value, onChange }: DrumColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const idx = items.indexOf(value);

  useEffect(() => {
    if (idx >= 0) {
      scrollRef.current?.scrollTo({ y: idx * DRUM_ITEM_HEIGHT, animated: false });
    }
  }, [idx]);

  const handleEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const i = Math.round(y / DRUM_ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(i, items.length - 1));
    if (items[clamped] !== value) onChange(items[clamped]);
  };

  return (
    <View style={columnContainerStyle}>
      <View style={highlightStyle} pointerEvents="none" />
      <LinearGradient
        colors={[Colors.surfaceHigh, 'rgba(19,25,41,0)']}
        style={[fadeStyle, fadeTopStyle]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(19,25,41,0)', Colors.surfaceHigh]}
        style={[fadeStyle, fadeBottomStyle]}
        pointerEvents="none"
      />
      <ScrollView
        ref={scrollRef}
        snapToInterval={DRUM_ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: DRUM_PADDING }}
        onMomentumScrollEnd={handleEnd}>
        {items.map((item, i) => {
          const active = item === value;
          return (
            <Pressable
              key={item}
              onPress={() => {
                scrollRef.current?.scrollTo({ y: i * DRUM_ITEM_HEIGHT, animated: true });
                if (item !== value) onChange(item);
              }}
              style={itemStyle}>
              <Text
                style={[
                  itemTextStyle,
                  {
                    color: active ? Colors.text : Colors.textMuted,
                    fontFamily: active ? FontFamily.medium : FontFamily.light,
                  },
                ]}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'] as const;
const COLUMN_LABELS = ['день', 'месяц', 'год', 'час', 'мин'] as const;

const pad2 = (n: number) => String(n).padStart(2, '0');
const range = (n: number, start = 0) => Array.from({ length: n }, (_, i) => String(i + start));
const rangePadded = (n: number) => Array.from({ length: n }, (_, i) => pad2(i));

const DAY_ITEMS = range(31, 1);
const HOUR_ITEMS = rangePadded(24);
const MIN_ITEMS = rangePadded(60);

interface DrumPickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

export function DrumPicker({ value, onChange }: DrumPickerProps) {
  const currentYear = new Date().getFullYear();
  const yearItems = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

  const update = (field: 'day' | 'month' | 'year' | 'hour' | 'min', raw: string) => {
    const d = new Date(value);
    if (field === 'day') d.setDate(parseInt(raw, 10));
    if (field === 'month') {
      const monthIdx = MONTHS.indexOf(raw as (typeof MONTHS)[number]);
      if (monthIdx >= 0) d.setMonth(monthIdx);
    }
    if (field === 'year') d.setFullYear(parseInt(raw, 10));
    if (field === 'hour') d.setHours(parseInt(raw, 10));
    if (field === 'min') d.setMinutes(parseInt(raw, 10));
    onChange(d);
  };

  return (
    <View>
      <View style={drumRowStyle}>
        <DrumColumn
          items={DAY_ITEMS}
          value={String(value.getDate())}
          onChange={(v) => update('day', v)}
        />
        <DrumColumn
          items={MONTHS}
          value={MONTHS[value.getMonth()]}
          onChange={(v) => update('month', v)}
        />
        <DrumColumn
          items={yearItems}
          value={String(value.getFullYear())}
          onChange={(v) => update('year', v)}
        />
        <View style={dividerStyle} />
        <DrumColumn
          items={HOUR_ITEMS}
          value={pad2(value.getHours())}
          onChange={(v) => update('hour', v)}
        />
        <DrumColumn
          items={MIN_ITEMS}
          value={pad2(value.getMinutes())}
          onChange={(v) => update('min', v)}
        />
      </View>
      <View style={labelsRowStyle}>
        {COLUMN_LABELS.map((l) => (
          <Text key={l} style={labelStyle}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

const columnContainerStyle: ViewStyle = {
  flex: 1,
  position: 'relative',
};

const highlightStyle: ViewStyle = {
  position: 'absolute',
  top: '50%',
  left: 0,
  right: 0,
  height: DRUM_ITEM_HEIGHT,
  marginTop: -DRUM_ITEM_HEIGHT / 2,
  backgroundColor: 'rgba(59,91,219,0.12)',
  borderRadius: Radius.md,
  zIndex: 1,
};

const fadeStyle: ViewStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  height: DRUM_FADE,
  zIndex: 2,
};

const fadeTopStyle: ViewStyle = {
  top: 0,
};

const fadeBottomStyle: ViewStyle = {
  bottom: 0,
};

const itemStyle: ViewStyle = {
  height: DRUM_ITEM_HEIGHT,
  alignItems: 'center',
  justifyContent: 'center',
};

const itemTextStyle: TextStyle = {
  fontSize: 17,
};

const drumRowStyle: ViewStyle = {
  flexDirection: 'row',
  height: DRUM_HEIGHT,
  borderRadius: Radius.lg,
  overflow: 'hidden',
  backgroundColor: Colors.surface,
};

const dividerStyle: ViewStyle = {
  width: 1,
  backgroundColor: Colors.border,
};

const labelsRowStyle: ViewStyle = {
  flexDirection: 'row',
  marginTop: 8,
  paddingHorizontal: 8,
};

const labelStyle: TextStyle = {
  flex: 1,
  textAlign: 'center',
  fontFamily: FontFamily.regular,
  fontSize: 10,
  color: Colors.textMuted,
};
