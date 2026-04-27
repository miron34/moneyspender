import { useEffect } from 'react';
import { Text, View, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import type { Category, CategoryStat } from '@/types';
import { Colors } from '@/constants/colors';
import { FALLBACK_CATEGORY } from '@/constants/categories';
import { FontFamily, FontSize } from '@/constants/typography';
import { fmtK } from '@/utils/format';

const SIZE = 152;
const RADIUS = 64;
const CENTER = SIZE / 2;
const STROKE_WIDTH = 22;
const MAX_SLICES = 6;

const SLICE_DURATION = 650;
const SLICE_STAGGER = 55;
const SLICE_EASING = Easing.bezier(0.16, 1, 0.3, 1);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface DonutChartProps {
  stats: CategoryStat[];
  categories: Category[];
  /**
   * When this value changes, all slices re-animate from 0 to their target lengths.
   */
  resetKey?: string | number;
}

interface SliceMeta {
  id: string;
  color: string;
  label: string;
  total: number;
  pct: number;
  dash: number;
  dashOffset: number;
}

export function DonutChart({ stats, categories, resetKey }: DonutChartProps) {
  const total = stats.reduce((s, c) => s + c.total, 0) || 1;
  const circumference = 2 * Math.PI * RADIUS;

  const slices: SliceMeta[] = [];
  let cumulativeOffset = 0;
  for (const s of stats.slice(0, MAX_SLICES)) {
    const cat = categories.find((c) => c.id === s.id) ?? { ...FALLBACK_CATEGORY, label: s.id };
    const dash = (s.total / total) * circumference;
    const dashOffset = circumference - cumulativeOffset;
    cumulativeOffset += dash;
    slices.push({
      id: s.id,
      color: cat.color,
      label: cat.label,
      total: s.total,
      pct: Math.round((s.total / total) * 100),
      dash,
      dashOffset,
    });
  }

  return (
    <View style={containerStyle}>
      <View style={svgWrapperStyle}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={STROKE_WIDTH}
          />
          {slices.map((s, i) => (
            <Slice
              key={`${resetKey ?? 'k'}-${s.id}`}
              color={s.color}
              dash={s.dash}
              dashOffset={s.dashOffset}
              circumference={circumference}
              index={i}
            />
          ))}
        </Svg>
        {/* Center label uses regular Text rather than SvgText so Inter font
            and currency-symbol kerning render the same as everywhere else. */}
        <View style={centerLabelStyle} pointerEvents="none">
          <Text style={centerCaptionStyle}>всего</Text>
          <Text style={centerAmountStyle}>
            {fmtK(total)}
            <Text style={centerCurrencyStyle}> ₽</Text>
          </Text>
        </View>
      </View>
      <View style={legendStyle}>
        {slices.map((s) => (
          <View key={s.id} style={legendRowStyle}>
            <View style={[dotStyle, { backgroundColor: s.color }]} />
            <Text style={legendLabelStyle} numberOfLines={1}>
              {s.label}
            </Text>
            <Text style={legendPctStyle}>{s.pct}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

interface SliceProps {
  color: string;
  dash: number;
  dashOffset: number;
  circumference: number;
  index: number;
}

function Slice({ color, dash, dashOffset, circumference, index }: SliceProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * SLICE_STAGGER,
      withTiming(1, { duration: SLICE_DURATION, easing: SLICE_EASING }),
    );
  }, [progress, dash, index]);

  const animatedProps = useAnimatedProps(() => {
    const visible = dash * progress.value;
    return {
      strokeDasharray: [visible, circumference - visible],
    };
  });

  return (
    <AnimatedCircle
      cx={CENTER}
      cy={CENTER}
      r={RADIUS}
      fill="none"
      stroke={color}
      strokeWidth={STROKE_WIDTH}
      strokeDashoffset={dashOffset}
      transform={`rotate(-90 ${CENTER} ${CENTER})`}
      animatedProps={animatedProps}
    />
  );
}

const containerStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 16,
};

const svgWrapperStyle: ViewStyle = {
  width: SIZE,
  height: SIZE,
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
};

const centerLabelStyle: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  alignItems: 'center',
  justifyContent: 'center',
};

const centerCaptionStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: 11,
  color: Colors.textMuted,
  marginBottom: 2,
};

const centerAmountStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: 18,
  color: Colors.text,
  letterSpacing: -0.3,
};

const centerCurrencyStyle: TextStyle = {
  color: Colors.textDim,
};

const legendStyle: ViewStyle = {
  flex: 1,
  flexDirection: 'column',
  gap: 8,
};

const legendRowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
};

const dotStyle: ViewStyle = {
  width: 8,
  height: 8,
  borderRadius: 4,
  flexShrink: 0,
};

const legendLabelStyle: TextStyle = {
  flex: 1,
  fontFamily: FontFamily.regular,
  fontSize: FontSize.sm,
  color: Colors.textDim,
};

const legendPctStyle: TextStyle = {
  fontFamily: FontFamily.medium,
  fontSize: FontSize.sm,
  color: Colors.textMuted,
  flexShrink: 0,
};
