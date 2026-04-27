import { View, type ViewStyle, type StyleProp } from 'react-native';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/typography';

type CardSize = 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  size?: CardSize;
  style?: StyleProp<ViewStyle>;
}

const RADIUS_BY_SIZE: Record<CardSize, number> = {
  sm: Radius.rowCompact,
  md: Radius.card,
  lg: Radius.cardLg,
};

const PADDING_BY_SIZE: Record<CardSize, number> = {
  sm: Spacing.cardPadding - 2,
  md: Spacing.cardPadding,
  lg: Spacing.cardPaddingLg,
};

export function Card({ children, size = 'lg', style }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: Colors.surface,
          borderWidth: 1,
          borderColor: Colors.border,
          borderRadius: RADIUS_BY_SIZE[size],
          padding: PADDING_BY_SIZE[size],
        },
        style,
      ]}>
      {children}
    </View>
  );
}
