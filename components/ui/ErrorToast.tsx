import { useEffect } from 'react';
import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

import { Colors, withAlpha } from '@/constants/colors';
import { FontFamily, FontSize, Radius } from '@/constants/typography';
import { useStore } from '@/store/useStore';

const VISIBLE_DURATION = 4500;
const ANIM_DURATION = 220;
const ANIM_EASING = Easing.bezier(0.16, 1, 0.3, 1);

export function ErrorToast() {
  const syncError = useStore((s) => s.syncError);
  const setSyncError = useStore((s) => s.setSyncError);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    if (syncError) {
      opacity.value = withTiming(1, { duration: ANIM_DURATION, easing: ANIM_EASING });
      translateY.value = withTiming(0, { duration: ANIM_DURATION, easing: ANIM_EASING });
      const t = setTimeout(() => setSyncError(null), VISIBLE_DURATION);
      return () => clearTimeout(t);
    }
    opacity.value = withTiming(0, { duration: ANIM_DURATION });
    translateY.value = withTiming(20, { duration: ANIM_DURATION });
  }, [syncError, opacity, translateY, setSyncError]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!syncError) return null;

  return (
    <View style={containerStyle} pointerEvents="box-none">
      <Animated.View style={[toastStyle, animatedStyle]}>
        <Feather name="alert-circle" size={16} color={Colors.negative} />
        <Text style={messageStyle} numberOfLines={2}>
          {syncError}
        </Text>
        <Pressable onPress={() => setSyncError(null)} hitSlop={8} style={dismissStyle}>
          <Feather name="x" size={14} color={Colors.textMuted} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const containerStyle: ViewStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 14,
  alignItems: 'center',
  zIndex: 250,
};

const toastStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  maxWidth: '88%',
  backgroundColor: Colors.surfaceTop,
  borderWidth: 1,
  borderColor: withAlpha(Colors.negative, 0.4),
  borderRadius: Radius.lg,
  paddingHorizontal: 14,
  paddingVertical: 10,
  boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
};

const messageStyle: TextStyle = {
  flex: 1,
  fontFamily: FontFamily.medium,
  fontSize: FontSize.sm,
  color: Colors.text,
};

const dismissStyle: ViewStyle = {
  paddingLeft: 4,
};
