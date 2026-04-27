import { ActivityIndicator, Text, View, type TextStyle, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/colors';
import { FontSize } from '@/constants/typography';

interface LoadingScreenProps {
  hint?: string;
}

// Note: this screen renders before custom fonts finish loading,
// so we intentionally use the platform's system font everywhere
// to avoid the visible swap from system → Inter on first paint.
export function LoadingScreen({ hint = 'Подключение к облаку…' }: LoadingScreenProps) {
  return (
    <View style={containerStyle}>
      <Text style={titleStyle}>MoneySpender</Text>
      <Text style={hintStyle}>{hint}</Text>
      <ActivityIndicator color={Colors.accent} size="small" style={spinnerStyle} />
    </View>
  );
}

const containerStyle: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: Colors.bg,
};

const titleStyle: TextStyle = {
  fontSize: FontSize.display,
  color: Colors.text,
  letterSpacing: -1,
  fontWeight: '300',
  marginBottom: 8,
};

const hintStyle: TextStyle = {
  fontSize: FontSize.sm,
  color: Colors.textMuted,
  marginBottom: 20,
};

const spinnerStyle: ViewStyle = {
  marginTop: 4,
};
