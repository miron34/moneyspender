import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

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
import { DateRangeSheet } from '@/components/sheets/DateRangeSheet';

type SortMode = 'date' | 'amount';

const SORT_OPTIONS: SortPickerOption<SortMode>[] = [
  { id: 'date', label: 'По дате', emoji: '📅' },
  { id: 'amount', label: 'По сумме', emoji: '💰' },
];

export default function HistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ cat?: string }>();

  const expenses = useStore((s) => s.expenses);
  const categories = useStore((s) => s.categories);
  const deleteExpense = useStore((s) => s.deleteExpense);
  const setPendingDelete = useStore((s) => s.setPendingDelete);

  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const [catSheetOpen, setCatSheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [rangeSheetOpen, setRangeSheetOpen] = useState(false);

  // Drill-down: incoming `cat` query param presets the category filter,
  // then we clear the URL so future tab switches don't re-apply it.
  useEffect(() => {
    if (params.cat) {
      setFilterCat(params.cat);
      router.setParams({ cat: undefined });
    }
  }, [params.cat, router]);

  const filtered = useMemo(() => {
    let list = expenses;
    if (filterCat) list = list.filter((e) => e.cat === filterCat);
    if (dateFrom) {
      const fromMs = dateFrom.getTime();
      list = list.filter((e) => e.date.getTime() >= fromMs);
    }
    if (dateTo) {
      const toMs = dateTo.getTime();
      list = list.filter((e) => e.date.getTime() <= toMs);
    }
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((e) => e.name.toLowerCase().includes(q));
    return [...list].sort((a, b) =>
      sortMode === 'amount' ? b.amount - a.amount : b.date.getTime() - a.date.getTime(),
    );
  }, [expenses, filterCat, dateFrom, dateTo, query, sortMode]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const totalAmount = useMemo(() => sumAmount(filtered), [filtered]);
  const filterActive =
    filterCat !== null || dateFrom !== null || dateTo !== null || query.trim().length > 0;

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

  const toggleSearch = () => {
    if (searchOpen) {
      setSearchOpen(false);
      setQuery('');
    } else {
      setSearchOpen(true);
    }
  };

  return (
    <View style={containerStyle}>
      <View style={headerStyle}>
        <View style={titleRowStyle}>
          <Text style={titleStyle}>История</Text>
          <View style={iconsRowStyle}>
            <IconButton
              icon="search"
              active={searchOpen}
              onPress={toggleSearch}
              accessibilityLabel="Поиск"
            />
            <IconButton
              icon={sortMode === 'amount' ? 'bar-chart-2' : 'clock'}
              active={sortMode !== 'date'}
              onPress={() => setSortSheetOpen(true)}
              accessibilityLabel="Сортировка"
            />
          </View>
        </View>

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
            onPress={() => setRangeSheetOpen(true)}
            style={[
              pillStyle,
              dateFrom || dateTo
                ? {
                    backgroundColor: withAlpha(Colors.accent, 0.13),
                    borderColor: withAlpha(Colors.accent, 0.33),
                  }
                : null,
            ]}>
            {dateFrom || dateTo ? (
              <>
                <Text style={pillEmojiStyle}>📅</Text>
                <Text style={[pillLabelStyle, { color: Colors.accent }]}>
                  {formatRange(dateFrom, dateTo)}
                </Text>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setDateFrom(null);
                    setDateTo(null);
                  }}
                  hitSlop={6}>
                  <Text style={pillCloseStyle}>✕</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={pillEmojiStyle}>📅</Text>
                <Text style={[pillLabelStyle, { color: Colors.textDim }]}>Период</Text>
                <Text style={pillChevronStyle}>▾</Text>
              </>
            )}
          </Pressable>
        </View>

        {searchOpen ? (
          <View style={searchBoxStyle}>
            <Feather name="search" size={14} color={Colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Поиск по названию"
              placeholderTextColor={Colors.textMuted}
              autoFocus
              style={[searchInputStyle, webNoZoomFontSize]}
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={6}>
                <Feather name="x" size={14} color={Colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {filterActive && totalAmount > 0 ? (
          <Text style={statsTextStyle}>
            {filtered.length} · {fmt(totalAmount)}
          </Text>
        ) : null}

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
              hint="Попробуйте сменить фильтр или поиск"
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

      <DateRangeSheet
        open={rangeSheetOpen}
        onClose={() => setRangeSheetOpen(false)}
        from={dateFrom}
        to={dateTo}
        onChange={(f, t) => {
          setDateFrom(f);
          setDateTo(t);
        }}
      />
    </View>
  );
}

interface IconButtonProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  active: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}

function IconButton({ icon, active, onPress, accessibilityLabel }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={[
        iconButtonStyle,
        active
          ? {
              backgroundColor: withAlpha(Colors.accent, 0.16),
              borderColor: withAlpha(Colors.accent, 0.33),
            }
          : null,
      ]}>
      <Feather
        name={icon}
        size={16}
        color={active ? Colors.accent : Colors.textDim}
      />
    </Pressable>
  );
}

function formatRange(from: Date | null, to: Date | null): string {
  const fmtShort = (d: Date) =>
    d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  if (from && to) return `${fmtShort(from)} – ${fmtShort(to)}`;
  if (from) return `с ${fmtShort(from)}`;
  if (to) return `по ${fmtShort(to)}`;
  return 'Период';
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

const titleRowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 12,
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
};

const iconsRowStyle: ViewStyle = {
  flexDirection: 'row',
  gap: 6,
};

const iconButtonStyle: ViewStyle = {
  width: 32,
  height: 32,
  borderRadius: 10,
  backgroundColor: Colors.surfaceHigh,
  borderWidth: 1,
  borderColor: Colors.border,
  alignItems: 'center',
  justifyContent: 'center',
};

const filterRowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
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

const searchBoxStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginTop: 10,
  paddingHorizontal: 12,
  paddingVertical: 8,
  backgroundColor: Colors.surfaceHigh,
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: Radius.pill,
};

const searchInputStyle: TextStyle = {
  flex: 1,
  fontFamily: FontFamily.regular,
  fontSize: FontSize.sm,
  color: Colors.text,
  paddingVertical: 0,
};

// iOS Safari auto-zooms when input font-size < 16px. Force 16px on web only.
const webNoZoomFontSize: TextStyle | null =
  Platform.OS === 'web' ? { fontSize: 16 } : null;

const statsTextStyle: TextStyle = {
  marginTop: 8,
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
