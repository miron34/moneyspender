import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize, Radius } from '@/constants/typography';

export interface PeriodOption<T extends string = string> {
  id: T;
  label: string;
}

interface PeriodSwitcherProps<T extends string = string> {
  options: PeriodOption<T>[];
  value: T;
  onChange: (id: T) => void;
}

export function PeriodSwitcher<T extends string = string>({
  options,
  value,
  onChange,
}: PeriodSwitcherProps<T>) {
  return (
    <View style={containerStyle}>
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            style={[pillStyle, active && pillActiveStyle]}>
            <Text
              style={[
                pillTextStyle,
                {
                  color: active ? '#ffffff' : Colors.textMuted,
                  fontFamily: FontFamily.medium,
                },
              ]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const containerStyle: ViewStyle = {
  flexDirection: 'row',
  backgroundColor: Colors.surfaceHigh,
  borderRadius: Radius.md,
  padding: 3,
  borderWidth: 1,
  borderColor: Colors.border,
  gap: 2,
};

const pillStyle: ViewStyle = {
  paddingHorizontal: 9,
  paddingVertical: 5,
  borderRadius: 7,
  backgroundColor: 'transparent',
};

const pillActiveStyle: ViewStyle = {
  backgroundColor: Colors.accent,
};

const pillTextStyle: TextStyle = {
  fontSize: FontSize.xs,
};
