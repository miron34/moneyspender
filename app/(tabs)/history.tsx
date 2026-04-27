import { useMemo, useState } from 'react';
import {
  Pressable,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { Colors, withAlpha } from '@/constants/colors';
import { FontFamily, FontSize, Radius, Spacing } from '@/constants/typography';
import { useStore } from '@/store/useStore';
import { groupByDay } from '@/utils/date';
import { sumAmount } from '@/utils/analytics';
import { fmt } from '@/utils/format';
import { FALLBACK_CATEGORY } from '@/constants/categories';

import { ExpenseRow } from '@/components/ui/ExpenseRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { SwipeableRow } from '@/components/ui/SwipeableRow';
import { CategoryPickerSheet } from '@/components/sheets/CategoryPickerSheet';
import {
  SortPickerSheet,
  type SortPickerOption,
} from '@/components/sheets/SortPickerSheet';

type SortMode = 'date' | 'amount';

const SORT_OPTIONS: SortPickerOption<SortMode>[] = [
  { id: 'date', label: 'По дате', emoji: '📅' },
  { id: 'amount', label: 'По сумме', emoji: '💰' },
];

export default function HistoryScreen() {
  const expenses = useStore((s) => s.expenses);
  const categories = useStore((s) => s.categories);
  const deleteExpense = useStore((s) => s.deleteExpense);
  const setPendingDelete = useStore((s) => s.setPendingDelete);

  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [catSheetOpen, setCatSheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    const list = filterCat ? expenses.filter((e) => e.cat === filterCat) : expenses;
    return [...list].sort((a, b) =>
      sortMode === 'amount' ? b.amount - a.amount : b.date.getTime() - a.date.getTime(),
    );
  }, [expenses, filterCat, sortMode]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const totalAmount = useMemo(() => sumAmount(filtered), [filtered]);
  const filterActive = filterCat !== null || sortMode !== 'date';

  const selectedCat = filterCat
    ? categories.find((c) => c.id === filterCat) ?? FALLBACK_CATEGORY
    : null;

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const dividerStyle = useAnimatedStyle(() => ({
    opacity: Math.min(scrollY.value / 8, 1),
  }));

  return (
    <View style={containerStyle}>
      <View style={headerStyle}>
        <Text style={titleStyle}>История</Text>
        <View style={filterRowStyle}>
          <Pressable
            onPress={() => setCatSheetOpen(true)}
            style={[
              pillStyle,
              selectedCat
                ? {
                    backgroundColor: withAlpha(Colors.accent, 0.13),
                    borderColor: withAlpha(Colors.accent, 0.33),
                  }
                : null,
            ]}>
            {selectedCat ? (
              <>
                <Text style={pillEmojiStyle}>{selectedCat.icon}</Text>
                <Text style={[pillLabelStyle, { color: Colors.accent }]}>
                  {selectedCat.label}
                </Text>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setFilterCat(null);
                  }}
                  hitSlop={6}>
                  <Text style={pillCloseStyle}>✕</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={pillEmojiStyle}>📁</Text>
                <Text style={[pillLabelStyle, { color: Colors.textDim }]}>Категория</Text>
                <Text style={pillChevronStyle}>▾</Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => setSortSheetOpen(true)}
            style={[
              pillStyle,
              sortMode !== 'date'
                ? {
                    backgroundColor: withAlpha(Colors.accent, 0.13),
                    borderColor: withAlpha(Colors.accent, 0.33),
                  }
                : null,
            ]}>
            <Text style={pillEmojiStyle}>{sortMode === 'date' ? '📅' : '💰'}</Text>
            <Text
              style={[
                pillLabelStyle,
                { color: sortMode !== 'date' ? Colors.accent : Colors.textDim },
              ]}>
              {sortMode === 'date' ? 'Дата' : 'По сумме'}
            </Text>
            <Text style={pillChevronStyle}>▾</Text>
          </Pressable>

          {filterActive && totalAmount > 0 ? (
            <View style={statsStyle}>
              <Text style={statsTextStyle}>
                {filtered.length} · {fmt(totalAmount)}
              </Text>
            </View>
          ) : null}
        </View>
        <Animated.View style={[dividerLineStyle, dividerStyle]} />
      </View>

      <Animated.ScrollView
        style={scrollStyle}
        contentContainerStyle={scrollContentStyle}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}>
        {groups.length > 0 ? (
          groups.map((g) => (
            <View key={g.label} style={groupStyle}>
              <View style={groupHeaderStyle}>
                <Text style={groupLabelStyle}>{g.label}</Text>
                <Text style={groupTotalStyle}>−{fmt(g.total)}</Text>
              </View>
              <View style={groupItemsStyle}>
                {g.items.map((e) => (
                  <SwipeableRow
                    key={e.id}
                    onDelete={() => {
                      const removed = deleteExpense(e.id);
                      if (removed) setPendingDelete(removed);
                    }}>
                    <ExpenseRow expense={e} categories={categories} compact />
                  </SwipeableRow>
                ))}
              </View>
            </View>
          ))
        ) : expenses.length === 0 ? (
          <View style={emptyAreaStyle}>
            <EmptyState
              title="Нет трат"
              hint="Добавьте первую трату через кнопку + внизу"
              icon="inbox"
              arrowDown
            />
          </View>
        ) : (
          <View style={emptyAreaStyle}>
            <EmptyState
              title="Ничего не найдено"
              hint="Попробуйте сменить фильтр или сортировку"
              icon="search"
            />
          </View>
        )}
      </Animated.ScrollView>

      <CategoryPickerSheet
        open={catSheetOpen}
        onClose={() => setCatSheetOpen(false)}
        title="Фильтр по категории"
        categories={categories}
        selected={filterCat}
        onSelect={(id) => {
          setFilterCat(id);
          setCatSheetOpen(false);
        }}
        onClear={
          filterCat
            ? () => {
                setFilterCat(null);
                setCatSheetOpen(false);
              }
            : undefined
        }
      />

      <SortPickerSheet
        open={sortSheetOpen}
        onClose={() => setSortSheetOpen(false)}
        options={SORT_OPTIONS}
        value={sortMode}
        onChange={setSortMode}
      />
    </View>
  );
}

const containerStyle: ViewStyle = {
  flex: 1,
  backgroundColor: Colors.bg,
};

const headerStyle: ViewStyle = {
  paddingHorizontal: Spacing.screenH,
  paddingTop: Spacing.screenV,
  paddingBottom: 10,
};

const dividerLineStyle: ViewStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  height: 1,
  backgroundColor: Colors.border,
};

const titleStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.xxl,
  color: Colors.text,
  letterSpacing: -0.5,
  marginBottom: 12,
};

const filterRowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
};

const pillStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
  backgroundColor: Colors.surfaceHigh,
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: Radius.pill,
  paddingHorizontal: 12,
  paddingVertical: 6,
};

const pillEmojiStyle: TextStyle = {
  fontSize: 13,
};

const pillLabelStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: FontSize.sm,
};

const pillChevronStyle: TextStyle = {
  fontSize: 11,
  color: Colors.textMuted,
};

const pillCloseStyle: TextStyle = {
  fontSize: 11,
  color: Colors.textMuted,
  marginLeft: 2,
};

const statsStyle: ViewStyle = {
  marginLeft: 'auto',
  flexShrink: 0,
};

const statsTextStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: FontSize.sm,
  color: Colors.textMuted,
};

const scrollStyle: ViewStyle = {
  flex: 1,
};

const scrollContentStyle: ViewStyle = {
  flexGrow: 1,
  paddingHorizontal: Spacing.screenH,
  paddingBottom: 16,
};

const emptyAreaStyle: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
};

const groupStyle: ViewStyle = {
  marginBottom: 16,
};

const groupHeaderStyle: ViewStyle = {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 8,
};

const groupLabelStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: FontSize.sm,
  color: Colors.textMuted,
};

const groupTotalStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: FontSize.sm,
  color: Colors.textMuted,
};

const groupItemsStyle: ViewStyle = {
  flexDirection: 'column',
  gap: 6,
};
