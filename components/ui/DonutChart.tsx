import { useEffect } from 'react';
import {
  Pressable,
  Text,
  View,
  type GestureResponderEvent,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withDelay,
  type SharedValue,
} from 'react-native-reanimated';

import type { Category, CategoryStat } from '@/types';
import { Colors } from '@/constants/colors';
import { FALLBACK_CATEGORY } from '@/constants/categories';
import { FontFamily, FontSize } from '@/constants/typography';
import { fmtK } from '@/utils/format';
import { lightTap } from '@/lib/haptics';

const SIZE = 152;
const RADIUS = 64;
const CENTER = SIZE / 2;
const STROKE_WIDTH = 22;
const MAX_SLICES = 6;

const SLICE_DURATION = 650;
const SLICE_STAGGER = 55;
const SLICE_EASING = Easing.bezier(0.16, 1, 0.3, 1);

const PULSE_UP = 120;
const PULSE_DOWN = 180;
const PULSE_SCALE = 1.06;
const NAVIGATE_DELAY = 140;

const HIT_INNER_RADIUS = RADIUS - STROKE_WIDTH / 2;
const HIT_OUTER_RADIUS = RADIUS + STROKE_WIDTH / 2;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface DonutChartProps {
  stats: CategoryStat[];
  categories: Category[];
  /**
   * When this value changes, all slices re-animate from 0 to their target lengths.
   */
  resetKey?: string | number;
  /** Drill-down: invoked after the press-pulse settles. Receives the category id. */
  onSelect?: (catId: string) => void;
}

interface SliceMeta {
  id: string;
  color: string;
  label: string;
  total: number;
  pct: number;
  dash: number;
  dashOffset: number;
  /** Cumulative angle in radians at which this slice starts (0 = top, going clockwise). */
  startAngle: number;
  /** Cumulative angle in radians at which this slice ends. */
  endAngle: number;
}

export function DonutChart({ stats, categories, resetKey, onSelect }: DonutChartProps) {
  const total = stats.reduce((s, c) => s + c.total, 0) || 1;
  const circumference = 2 * Math.PI * RADIUS;

  const slices: SliceMeta[] = [];
  let cumulativeOffset = 0;
  let cumulativeAngle = 0;
  for (const s of stats.slice(0, MAX_SLICES)) {
    const cat = categories.find((c) => c.id === s.id) ?? { ...FALLBACK_CATEGORY, label: s.id };
    const fraction = s.total / total;
    const dash = fraction * circumference;
    const dashOffset = circumference - cumulativeOffset;
    const arc = fraction * 2 * Math.PI;
    slices.push({
      id: s.id,
      color: cat.color,
      label: cat.label,
      total: s.total,
      pct: Math.round(fraction * 100),
      dash,
      dashOffset,
      startAngle: cumulativeAngle,
      endAngle: cumulativeAngle + arc,
    });
    cumulativeOffset += dash;
    cumulativeAngle += arc;
  }

  // Pulse animation lives on the legend row, not the donut slice — tapping
  // a segment briefly scales the matching legend entry up and back.
  const legendScale = useSharedValue(1);
  const boostedId = useSharedValue<string | null>(null);

  const triggerSlice = (id: string) => {
    if (!onSelect) return;
    lightTap();
    boostedId.value = id;
    legendScale.value = withSequence(
      withTiming(PULSE_SCALE, { duration: PULSE_UP, easing: SLICE_EASING }),
      withTiming(1, { duration: PULSE_DOWN, easing: SLICE_EASING }, () => {
        boostedId.value = null;
      }),
    );
    setTimeout(() => onSelect(id), NAVIGATE_DELAY);
  };

  const handleSvgPress = (e: GestureResponderEvent) => {
    if (!onSelect) return;
    const { locationX, locationY } = e.nativeEvent;
    const dx = locationX - CENTER;
    const dy = locationY - CENTER;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < HIT_INNER_RADIUS || dist > HIT_OUTER_RADIUS) return;
    // SVG starts at 12 o'clock and goes clockwise (rotate -90 in render).
    // atan2 returns angle from +x axis, so we rotate frame by +90°.
    let angle = Math.atan2(dy, dx) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;
    const hit = slices.find((s) => angle >= s.startAngle && angle < s.endAngle);
    if (hit) triggerSlice(hit.id);
  };

  const SvgContent = (
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
  );

  return (
    <View style={containerStyle}>
      <View style={svgWrapperStyle}>
        {onSelect ? (
          <Pressable onPress={handleSvgPress}>{SvgContent}</Pressable>
        ) : (
          SvgContent
        )}
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
          <LegendRow
            key={s.id}
            id={s.id}
            color={s.color}
            label={s.label}
            pct={s.pct}
            onPress={onSelect ? () => triggerSlice(s.id) : undefined}
            scale={legendScale}
            boostedId={boostedId}
          />
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

interface LegendRowProps {
  id: string;
  color: string;
  label: string;
  pct: number;
  onPress?: () => void;
  scale: SharedValue<number>;
  boostedId: SharedValue<string | null>;
}

function LegendRow({ id, color, label, pct, onPress, scale, boostedId }: LegendRowProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: boostedId.value === id ? scale.value : 1 }],
  }));

  const content = (
    <Animated.View style={[legendRowStyle, animatedStyle]}>
      <View style={[dotStyle, { backgroundColor: color }]} />
      <Text style={legendLabelStyle} numberOfLines={1}>
        {label}
      </Text>
      <Text style={legendPctStyle}>{pct}%</Text>
    </Animated.View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} hitSlop={4}>
      {content}
    </Pressable>
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
