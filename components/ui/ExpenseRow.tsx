import { Text, View, type TextStyle, type ViewStyle } from 'react-native';
import type { Category, Expense } from '@/types';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize, Radius } from '@/constants/typography';
import { FALLBACK_CATEGORY } from '@/constants/categories';
import { fmt, fmtLabel } from '@/utils/format';
import { withAlpha } from '@/constants/colors';

interface ExpenseRowProps {
  expense: Expense;
  categories: Category[];
  compact?: boolean;
}

export function ExpenseRow({ expense, categories, compact = false }: ExpenseRowProps) {
  const cat = categories.find((c) => c.id === expense.cat) ?? FALLBACK_CATEGORY;

  const iconSize = compact ? 34 : 38;
  const iconRadius = compact ? 10 : 12;
  const iconFont = compact ? 15 : 17;
  const rowRadius = compact ? Radius.rowCompact : Radius.card;
  const rowPaddingV = compact ? 10 : 12;
  const rowPaddingH = compact ? 12 : 14;
  const nameSize = compact ? FontSize.base : FontSize.md;
  const amountSize = compact ? FontSize.base : FontSize.md;

  return (
    <View
      style={[
        rowContainerStyle,
        {
          borderRadius: rowRadius,
          paddingVertical: rowPaddingV,
          paddingHorizontal: rowPaddingH,
        },
      ]}>
      <View
        style={[
          iconContainerStyle,
          {
            width: iconSize,
            height: iconSize,
            borderRadius: iconRadius,
            backgroundColor: withAlpha(cat.color, 0.1),
          },
        ]}>
        <Text style={{ fontSize: iconFont }}>{cat.icon}</Text>
      </View>
      <View style={textContainerStyle}>
        <Text style={[nameStyle, { fontSize: nameSize }]} numberOfLines={1}>
          {expense.name}
        </Text>
        <Text style={dateStyle}>{fmtLabel(expense.date)}</Text>
      </View>
      <Text style={[amountStyle, { fontSize: amountSize }]} numberOfLines={1}>
        −{fmt(expense.amount)}
      </Text>
    </View>
  );
}

const rowContainerStyle: ViewStyle = {
  backgroundColor: Colors.surface,
  borderWidth: 1,
  borderColor: Colors.border,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
};

const iconContainerStyle: ViewStyle = {
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const textContainerStyle: ViewStyle = {
  flex: 1,
  minWidth: 0,
};

const nameStyle: TextStyle = {
  fontFamily: FontFamily.medium,
  color: Colors.text,
  marginBottom: 2,
};

const dateStyle: TextStyle = {
  fontFamily: FontFamily.regular,
  fontSize: FontSize.xs,
  color: Colors.textMuted,
};

const amountStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  color: Colors.negative,
  flexShrink: 0,
};
