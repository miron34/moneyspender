import { Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, withAlpha } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

interface EmptyStateProps {
  title?: string;
  hint?: string;
  icon?: FeatherName;
  /** Show a soft circular background behind the icon. Adds visual weight. */
  iconHalo?: boolean;
  /** Show an arrow pointing down (towards the FAB) below the hint. */
  arrowDown?: boolean;
  compact?: boolean;
}

export function EmptyState({
  title = 'Нет данных',
  hint,
  icon,
  iconHalo = true,
  arrowDown = false,
  compact = false,
}: EmptyStateProps) {
  const iconSize = compact ? 22 : 32;

  return (
    <View style={[containerStyle, compact && containerCompactStyle]}>
      {icon ? (
        iconHalo && !compact ? (
          <View style={haloStyle}>
            <Feather name={icon} size={iconSize} color={Colors.textDim} />
          </View>
        ) : (
          <Feather name={icon} size={iconSize} color={Colors.textMuted} />
        )
      ) : null}
      <Text style={[titleStyle, compact && titleCompactStyle]}>{title}</Text>
      {hint ? <Text style={hintStyle}>{hint}</Text> : null}
      {arrowDown ? (
        <View style={arrowSlotStyle}>
          <Feather name="arrow-down" size={20} color={Colors.textMuted} />
        </View>
      ) : null}
    </View>
  );
}

const containerStyle: ViewStyle = {
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 48,
  paddingHorizontal: 24,
  gap: 10,
};

const containerCompactStyle: ViewStyle = {
  paddingVertical: 16,
  paddingHorizontal: 12,
  gap: 4,
};

const haloStyle: ViewStyle = {
  width: 64,
  height: 64,
  borderRadius: 32,
  backgroundColor: withAlpha(Colors.accent, 0.08),
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 4,
};

const titleStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.md,
  color: Colors.textDim,
  textAlign: 'center',
};

const titleCompactStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: FontSize.base,
  color: Colors.textMuted,
};

const hintStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: FontSize.sm,
  color: Colors.textMuted,
  textAlign: 'center',
  maxWidth: 280,
  lineHeight: 18,
};

const arrowSlotStyle: ViewStyle = {
  marginTop: 14,
  opacity: 0.7,
};
