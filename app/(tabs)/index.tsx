import { useState } from 'react';
import {
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Colors, withAlpha } from '@/constants/colors';
import { FontFamily, FontSize, Radius, Spacing } from '@/constants/typography';
import { useStore } from '@/store/useStore';
import { byPeriod } from '@/utils/date';
import { catStats, sumAmount } from '@/utils/analytics';
import { fmt } from '@/utils/format';
import type { Period } from '@/types';

import { Card } from '@/components/ui/Card';
import { ExpenseRow } from '@/components/ui/ExpenseRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { PeriodSwitcher, type PeriodOption } from '@/components/ui/PeriodSwitcher';
import { BarChart } from '@/components/ui/BarChart';
import { DonutChart } from '@/components/ui/DonutChart';
import { SwipeableRow } from '@/components/ui/SwipeableRow';

type HomePeriod = Extract<Period, 'day' | 'week' | 'month'>;
type ChartMode = 'bar' | 'donut';

const PERIODS: PeriodOption<HomePeriod>[] = [
  { id: 'day', label: 'День' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
];

const PERIOD_HINT: Record<HomePeriod, string> = {
  day: 'сегодня',
  week: 'за неделю',
  month: 'за месяц',
};

export default function HomeScreen() {
  const router = useRouter();
  const expenses = useStore((s) => s.expenses);
  const categories = useStore((s) => s.categories);
  const userName = useStore((s) => s.userName);
  const deleteExpense = useStore((s) => s.deleteExpense);
  const setPendingDelete = useStore((s) => s.setPendingDelete);

  const [period, setPeriod] = useState<HomePeriod>('month');
  const [mode, setMode] = useState<ChartMode>('bar');

  const filtered = byPeriod(expenses, period);
  const total = sumAmount(filtered);
  const stats = catStats(filtered);
  const maxAmount = stats[0]?.total ?? 1;

  // Home is non-scrollable. We measure the actual height of the recent-list
  // area at runtime and render only as many rows as fully fit. Whatever
  // doesn't fit is omitted — the user sees everything on the History tab.
  const [recentAreaHeight, setRecentAreaHeight] = useState(0);
  const ROW_HEIGHT = 54; // ExpenseRow compact: paddingV 10 + icon 34 + paddingV 10
  const ROW_GAP = 7;
  const recentLimit =
    recentAreaHeight > 0
      ? Math.max(0, Math.floor((recentAreaHeight + ROW_GAP) / (ROW_HEIGHT + ROW_GAP)))
      : 0;
  const sortedRecent = [...expenses].sort((a, b) => b.date.getTime() - a.date.getTime());
  const recent = sortedRecent.slice(0, recentLimit);

  return (
    <View style={scrollStyle}>
      <View style={scrollContentStyle}>
      <View style={headerStyle}>
        <View>
          <Text style={captionStyle}>Добро пожаловать</Text>
          <Text style={nameStyle}>{userName}</Text>
        </View>
        <PeriodSwitcher options={PERIODS} value={period} onChange={setPeriod} />
      </View>

      <View style={totalStyle}>
        <Text style={captionStyle}>Расходы {PERIOD_HINT[period]}</Text>
        <Text style={totalNumberStyle}>{fmt(total)}</Text>
      </View>

      {stats.length > 0 ? (
        <Card size="lg" style={chartCardStyle}>
          <View style={chartHeaderStyle}>
            <Text style={cardTitleStyle}>По категориям</Text>
            <View style={chartToggleStyle}>
              <ChartModeButton
                active={mode === 'bar'}
                icon="align-justify"
                onPress={() => setMode('bar')}
              />
              <ChartModeButton
                active={mode === 'donut'}
                icon="pie-chart"
                onPress={() => setMode('donut')}
              />
            </View>
          </View>
          <View
            style={[
              chartViewportStyle,
              mode === 'donut' && chartViewportCenteredStyle,
            ]}>
            {mode === 'bar' ? (
              <BarChart
                stats={stats.slice(0, 5)}
                categories={categories}
                maxAmount={maxAmount}
                resetKey={`${period}-bar`}
                onSelect={(catId) =>
                  router.push({ pathname: '/history', params: { cat: catId } })
                }
              />
            ) : (
              <DonutChart
                stats={stats}
                categories={categories}
                resetKey={`${period}-donut`}
                onSelect={(catId) =>
                  router.push({ pathname: '/history', params: { cat: catId } })
                }
              />
            )}
          </View>
          <Pressable onPress={() => router.push('/analytics')} style={chartLinkStyle}>
            <Text style={linkTextStyle}>Подробнее →</Text>
          </Pressable>
        </Card>
      ) : (
        <Card size="md" style={chartCardCompactStyle}>
          <Text style={cardTitleStyle}>По категориям</Text>
          <Text style={chartEmptyTextStyle}>Нет данных</Text>
        </Card>
      )}

      {sortedRecent.length > 0 ? (
        <>
          <View style={recentHeaderStyle}>
            <Text style={cardTitleStyle}>Последние траты</Text>
            <Pressable onPress={() => router.push('/history')}>
              <Text style={linkTextStyle}>Все →</Text>
            </Pressable>
          </View>
          <View
            style={recentListStyle}
            onLayout={(e: LayoutChangeEvent) =>
              setRecentAreaHeight(e.nativeEvent.layout.height)
            }>
            {recent.map((e) => (
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
        </>
      ) : (
        <View style={emptyAreaStyle}>
          <EmptyState
            title="Нет трат"
            hint="Нажмите + внизу, чтобы добавить первую"
            icon="inbox"
            arrowDown
          />
        </View>
      )}
      </View>
    </View>
  );
}

interface ChartModeButtonProps {
  active: boolean;
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
}

function ChartModeButton({ active, icon, onPress }: ChartModeButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        chartToggleButtonStyle,
        {
          backgroundColor: active ? withAlpha(Colors.accent, 0.16) : Colors.surfaceHigh,
        },
      ]}>
      <Feather name={icon} size={14} color={active ? Colors.accent : Colors.textMuted} />
    </Pressable>
  );
}

const scrollStyle: ViewStyle = {
  flex: 1,
  backgroundColor: Colors.bg,
};

const scrollContentStyle: ViewStyle = {
  flex: 1,
  paddingHorizontal: Spacing.screenH,
  paddingTop: Spacing.screenV,
  paddingBottom: 12,
};

const headerStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  marginBottom: 16,
};

const captionStyle: TextStyle = {
  fontFamily: FontFamily.light,
  fontSize: FontSize.xs,
  color: Colors.textMuted,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
};

const nameStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.h1,
  color: Colors.text,
  letterSpacing: -0.5,
};

const totalStyle: ViewStyle = {
  marginBottom: 14,
};

const totalNumberStyle: TextStyle = {
  fontFamily: FontFamily.light,
  fontSize: FontSize.hero,
  color: Colors.text,
  letterSpacing: -2,
  lineHeight: 46,
  marginTop: 3,
};

const chartCardStyle: ViewStyle = {
  marginBottom: 12,
};

const chartCardCompactStyle: ViewStyle = {
  marginBottom: 12,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const chartEmptyTextStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: FontSize.sm,
  color: Colors.textMuted,
};

const emptyAreaStyle: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
};

const chartHeaderStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 14,
};

const cardTitleStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.base,
  color: Colors.text,
};

const chartToggleStyle: ViewStyle = {
  flexDirection: 'row',
  gap: 4,
};

const chartToggleButtonStyle: ViewStyle = {
  width: 28,
  height: 28,
  borderRadius: Radius.sm,
  alignItems: 'center',
  justifyContent: 'center',
};

const CHART_VIEWPORT_HEIGHT = 180;

const chartViewportStyle: ViewStyle = {
  height: CHART_VIEWPORT_HEIGHT,
  justifyContent: 'flex-start',
};

const chartViewportCenteredStyle: ViewStyle = {
  justifyContent: 'center',
};

const chartLinkStyle: ViewStyle = {
  marginTop: 12,
  alignSelf: 'flex-start',
};

const linkTextStyle: TextStyle = {
  fontFamily: FontFamily.medium,
  fontSize: FontSize.sm,
  color: Colors.accent,
};

const recentHeaderStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 10,
};

const recentListStyle: ViewStyle = {
  flex: 1,
  flexDirection: 'column',
  gap: 7,
  overflow: 'hidden',
};
