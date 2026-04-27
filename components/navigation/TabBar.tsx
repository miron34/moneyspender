import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { Colors } from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { lightTap, mediumTap } from '@/lib/haptics';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

interface TabMeta {
  label: string;
  icon: FeatherName;
}

const TAB_META: Record<string, TabMeta> = {
  index: { label: 'Главная', icon: 'home' },
  history: { label: 'История', icon: 'clock' },
  analytics: { label: 'Анализ', icon: 'bar-chart-2' },
  profile: { label: 'Профиль', icon: 'user' },
};

const TAB_ORDER = ['index', 'history', 'analytics', 'profile'] as const;

export interface TabBarProps extends BottomTabBarProps {
  onAddPress: () => void;
}

export function TabBar({ state, navigation, onAddPress }: TabBarProps) {
  const activeName = state.routes[state.index]?.name;

  const renderTab = (routeName: string) => {
    const meta = TAB_META[routeName];
    if (!meta) return null;
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) return null;

    const isActive = activeName === routeName;
    const color = isActive ? Colors.accent : Colors.textMuted;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isActive && !event.defaultPrevented) {
        lightTap();
        navigation.navigate(route.name);
      }
    };

    return (
      <Pressable key={routeName} onPress={onPress} style={tabStyle}>
        <Feather name={meta.icon} size={22} color={color} />
        <Text
          style={[
            tabLabelStyle,
            { color, fontFamily: isActive ? FontFamily.medium : FontFamily.regular },
          ]}>
          {meta.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={containerStyle}>
      {renderTab(TAB_ORDER[0])}
      {renderTab(TAB_ORDER[1])}
      <View style={fabSlotStyle}>
        <Pressable
          onPress={() => {
            mediumTap();
            onAddPress();
          }}
          style={fabPressableStyle}>
          <LinearGradient
            colors={[Colors.accentLight, Colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={fabGradientStyle}>
            <Feather name="plus" size={22} color="#ffffff" strokeWidth={2.5} />
          </LinearGradient>
        </Pressable>
      </View>
      {renderTab(TAB_ORDER[2])}
      {renderTab(TAB_ORDER[3])}
    </View>
  );
}

const containerStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: Colors.surface,
  borderTopWidth: 1,
  borderTopColor: Colors.border,
  paddingTop: 8,
  paddingBottom: 18,
};

const tabStyle: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  paddingVertical: 5,
};

const tabLabelStyle: TextStyle = {
  fontSize: 10,
};

const fabSlotStyle: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
};

const fabPressableStyle: ViewStyle = {
  width: 52,
  height: 52,
  borderRadius: 26,
  transform: [{ translateY: -10 }],
  boxShadow: '0 6px 24px rgba(59,91,219,0.5)',
};

const fabGradientStyle: ViewStyle = {
  width: 52,
  height: 52,
  borderRadius: 26,
  alignItems: 'center',
  justifyContent: 'center',
};
