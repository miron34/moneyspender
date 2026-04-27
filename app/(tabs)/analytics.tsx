import { useMemo, useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { FontFamily, FontSize, Radius, Spacing } from '@/constants/typography';
import { FALLBACK_CATEGORY } from '@/constants/categories';
import { useStore } from '@/store/useStore';
import { byPeriod, byPrevPeriod, periodDays } from '@/utils/date';
import { catStats, comparePeriods, sumAmount, topN } from '@/utils/analytics';
import { fmt, fmtLabel } from '@/utils/format';
import type { Period } from '@/types';

import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PeriodSwitcher, type PeriodOption } from '@/components/ui/PeriodSwitcher';
import { BarChart } from '@/components/ui/BarChart';

type AnalyticsPeriod = Extract<Period, 'week' | 'month' | 'quarter'>;

const PERIODS: PeriodOption<AnalyticsPeriod>[] = [
  { id: 'week', label: 'Нед.' },
  { id: 'month', label: 'Месяц' },
  { id: 'quarter', label: 'Квартал' },
];

export default function AnalyticsScreen() {
  const expenses = useStore((s) => s.expenses);
  const categories = useStore((s) => s.categories);

  const [period, setPeriod] = useState<AnalyticsPeriod>('month');

  const current = useMemo(() => byPeriod(expenses, period), [expenses, period]);
  const previous = useMemo(() => byPrevPeriod(expenses, period), [expenses, period]);
  const compare = useMemo(() => comparePeriods(current, previous), [current, previous]);

  const days = periodDays(period);
  const avgDay = current.length > 0 ? Math.round(compare.current / days) : 0;
  const avgWeek = current.length > 0 ? Math.round(compare.current / (days / 7)) : 0;

  const stats = useMemo(() => catStats(current), [current]);
  const total = compare.current;
  const maxAmount = stats[0]?.total ?? 1;
  const top3 = useMemo(() => topN(current, 3), [current]);

  const positiveDelta = compare.deltaPct > 0;
  const deltaColor = positiveDelta ? Colors.negative : Colors.positive;

  return (
    <ScrollView
      style={scrollStyle}
      contentContainerStyle={scrollContentStyle}
      showsVerticalScrollIndicator={false}>
      <View style={headerStyle}>
        <Text style={titleStyle}>Аналитика</Text>
        <PeriodSwitcher options={PERIODS} value={period} onChange={setPeriod} />
      </View>

      {current.length === 0 ? (
        <Card size="lg">
          <EmptyState
            title="Нет данных"
            hint="За выбранный период трат не было"
            icon="bar-chart-2"
          />
        </Card>
      ) : (
        <>
          <Card size="lg" style={spacedCardStyle}>
            <Text style={cardCaptionStyle}>Сравнение периодов</Text>
            <View style={amountsRowStyle}>
              <View style={amountColStyle}>
                <Text style={subCaptionStyle}>Текущий</Text>
                <Text style={amountCurrentStyle}>{fmt(compare.current)}</Text>
              </View>
              <View style={amountColStyle}>
                <Text style={subCaptionStyle}>Предыдущий</Text>
                <Text style={amountPreviousStyle}>{fmt(compare.previous)}</Text>
              </View>
            </View>
            <Text style={[deltaTextStyle, { color: deltaColor }]} numberOfLines={1}>
              {compare.deltaPct > 0 ? '+' : ''}
              {compare.deltaPct}% ({compare.deltaAmount > 0 ? '+' : ''}
              {fmt(compare.deltaAmount)})
            </Text>
          </Card>

          <View style={miniRowStyle}>
            <Card size="md" style={miniCardStyle}>
              <Text style={miniLabelStyle}>В среднем за день</Text>
              <Text style={miniValueStyle}>{fmt(avgDay)}</Text>
            </Card>
            <Card size="md" style={miniCardStyle}>
              <Text style={miniLabelStyle}>В среднем за неделю</Text>
              <Text style={miniValueStyle}>{fmt(avgWeek)}</Text>
            </Card>
          </View>

          {stats.length > 0 ? (
            <Card size="lg" style={spacedCardStyle}>
              <Text style={cardTitleStyle}>По категориям</Text>
              <BarChart
                stats={stats}
                categories={categories}
                maxAmount={maxAmount}
                showPct
                total={total}
                resetKey={period}
              />
            </Card>
          ) : null}

          {top3.length > 0 ? (
            <Card size="lg" style={spacedCardStyle}>
              <Text style={cardTitleStyle}>Топ-3 трат</Text>
              <View style={topListStyle}>
                {top3.map((e, i) => {
                  const cat = categories.find((c) => c.id === e.cat) ?? FALLBACK_CATEGORY;
                  return (
                    <View key={e.id} style={topRowStyle}>
                      <View style={badgeStyle}>
                        <Text style={badgeTextStyle}>{i + 1}</Text>
                      </View>
                      <Text style={topIconStyle}>{cat.icon}</Text>
                      <View style={topMainStyle}>
                        <Text style={topNameStyle} numberOfLines={1}>
                          {e.name}
                        </Text>
                        <Text style={topDateStyle}>{fmtLabel(e.date)}</Text>
                      </View>
                      <Text style={topAmountStyle} numberOfLines={1}>
                        −{fmt(e.amount)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const scrollStyle: ViewStyle = {
  flex: 1,
  backgroundColor: Colors.bg,
};

const scrollContentStyle: ViewStyle = {
  paddingHorizontal: Spacing.screenH,
  paddingTop: Spacing.screenV,
  paddingBottom: 16,
};

const headerStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 16,
};

const titleStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.xxl,
  color: Colors.text,
  letterSpacing: -0.5,
};

const spacedCardStyle: ViewStyle = {
  marginBottom: 10,
};

const cardCaptionStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: FontSize.xs,
  color: Colors.textMuted,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 10,
};

const cardTitleStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.base,
  color: Colors.text,
  marginBottom: 14,
};

const amountsRowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 12,
  marginBottom: 14,
};

const amountColStyle: ViewStyle = {
  flex: 1,
};

const subCaptionStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: FontSize.xs,
  color: Colors.textMuted,
  marginBottom: 4,
};

const AMOUNT_LINE_HEIGHT = 32;

const amountCurrentStyle: TextStyle = {
  fontFamily: FontFamily.light,
  fontSize: FontSize.display,
  lineHeight: AMOUNT_LINE_HEIGHT,
  color: Colors.text,
  letterSpacing: -1,
};

const amountPreviousStyle: TextStyle = {
  fontFamily: FontFamily.light,
  fontSize: FontSize.h1,
  lineHeight: AMOUNT_LINE_HEIGHT,
  color: Colors.textDim,
  letterSpacing: -1,
};

const deltaTextStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.base,
};

const miniRowStyle: ViewStyle = {
  flexDirection: 'row',
  gap: 8,
  marginBottom: 10,
};

const miniCardStyle: ViewStyle = {
  flex: 1,
};

const miniLabelStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: FontSize.xs,
  color: Colors.textMuted,
  marginBottom: 6,
};

const miniValueStyle: TextStyle = {
  fontFamily: FontFamily.light,
  fontSize: FontSize.xxl,
  color: Colors.text,
  letterSpacing: -0.5,
};

const topListStyle: ViewStyle = {
  flexDirection: 'column',
  gap: 10,
};

const topRowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
};

const badgeStyle: ViewStyle = {
  width: 22,
  height: 22,
  borderRadius: 6,
  backgroundColor: Colors.surfaceTop,
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const badgeTextStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.xs,
  color: Colors.textMuted,
};

const topIconStyle: TextStyle = {
  fontSize: FontSize.lg,
  flexShrink: 0,
};

const topMainStyle: ViewStyle = {
  flex: 1,
  minWidth: 0,
};

const topNameStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: FontSize.base,
  color: Colors.textDim,
};

const topDateStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: FontSize.xs,
  color: Colors.textMuted,
};

const topAmountStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.md,
  color: Colors.negative,
  flexShrink: 0,
};
