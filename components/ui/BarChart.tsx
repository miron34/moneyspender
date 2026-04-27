import { useEffect } from 'react';
import { Text, View, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import type { Category, CategoryStat } from '@/types';
import { Colors, withAlpha } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { FALLBACK_CATEGORY } from '@/constants/categories';
import { fmt } from '@/utils/format';

const BAR_DURATION = 650;
const BAR_STAGGER = 55;
const BAR_EASING = Easing.bezier(0.16, 1, 0.3, 1);

interface BarChartProps {
  stats: CategoryStat[];
  categories: Category[];
  maxAmount: number;
  showPct?: boolean;
  total?: number;
  /**
   * Optional reset key. When the value changes, all bars re-animate from 0 to their target.
   * Useful when the same chart is reused across periods.
   */
  resetKey?: string | number;
}

export function BarChart({
  stats,
  categories,
  maxAmount,
  showPct = false,
  total,
  resetKey,
}: BarChartProps) {
  return (
    <View style={containerStyle}>
      {stats.map((stat, index) => {
        const cat =
          categories.find((c) => c.id === stat.id) ?? { ...FALLBACK_CATEGORY, label: stat.id };
        const targetPct = Math.max((stat.total / Math.max(maxAmount, 1)) * 100, 2);
        return (
          <BarRow
            key={`${resetKey ?? 'k'}-${stat.id}`}
            label={cat.label}
            icon={cat.icon}
            color={cat.color}
            amount={stat.total}
            targetPct={targetPct}
            index={index}
            showPct={showPct}
            total={total}
          />
        );
      })}
    </View>
  );
}

interface BarRowProps {
  label: string;
  icon: string;
  color: string;
  amount: number;
  targetPct: number;
  index: number;
  showPct: boolean;
  total?: number;
}

function BarRow({
  label,
  icon,
  color,
  amount,
  targetPct,
  index,
  showPct,
  total,
}: BarRowProps) {
  const pct = useSharedValue(0);

  useEffect(() => {
    pct.value = withDelay(
      index * BAR_STAGGER,
      withTiming(targetPct, { duration: BAR_DURATION, easing: BAR_EASING }),
    );
  }, [pct, targetPct, index]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${pct.value}%`,
  }));

  return (
    <View style={rowStyle}>
      <Text style={iconStyle}>{icon}</Text>
      <View style={rowMainStyle}>
        <View style={rowHeaderStyle}>
          <Text style={labelStyle}>{label}</Text>
          <Text style={amountStyle}>
            {fmt(amount)}
            {showPct && total ? (
              <Text style={pctStyle}> · {Math.round((amount / total) * 100)}%</Text>
            ) : null}
          </Text>
        </View>
        <View style={trackStyle}>
          <Animated.View style={[fillContainerStyle, fillStyle]}>
            <LinearGradient
              colors={[withAlpha(color, 0.44), color]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={gradientStyle}
            />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const containerStyle: ViewStyle = {
  flexDirection: 'column',
  gap: 11,
};

const rowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
};

const iconStyle: TextStyle = {
  fontSize: FontSize.lg,
  width: 22,
  textAlign: 'center',
  flexShrink: 0,
};

const rowMainStyle: ViewStyle = {
  flex: 1,
  minWidth: 0,
};

const rowHeaderStyle: ViewStyle = {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 5,
};

const labelStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: FontSize.sm,
  color: Colors.textDim,
};

const amountStyle: TextStyle = {
  fontFamily: FontFamily.medium,
  fontSize: FontSize.sm,
  color: Colors.textDim,
};

const pctStyle: TextStyle = {
  color: Colors.textMuted,
};

const trackStyle: ViewStyle = {
  height: 4,
  backgroundColor: 'rgba(255,255,255,0.07)',
  borderRadius: 10,
  overflow: 'hidden',
};

const fillContainerStyle: ViewStyle = {
  height: '100%',
  borderRadius: 10,
  overflow: 'hidden',
};

const gradientStyle: ViewStyle = {
  flex: 1,
};
