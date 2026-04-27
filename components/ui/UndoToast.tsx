import { useEffect } from 'react';
import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { FontFamily, FontSize, Radius } from '@/constants/typography';
import { useStore } from '@/store/useStore';

const VISIBLE_DURATION = 3500;
const ANIM_DURATION = 220;
const ANIM_EASING = Easing.bezier(0.16, 1, 0.3, 1);

export function UndoToast() {
  const pendingDelete = useStore((s) => s.pendingDelete);
  const setPendingDelete = useStore((s) => s.setPendingDelete);
  const restoreExpense = useStore((s) => s.restoreExpense);
  const commitDelete = useStore((s) => s.commitDelete);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    if (pendingDelete) {
      opacity.value = withTiming(1, { duration: ANIM_DURATION, easing: ANIM_EASING });
      translateY.value = withTiming(0, { duration: ANIM_DURATION, easing: ANIM_EASING });
      const id = pendingDelete.id;
      const t = setTimeout(() => {
        commitDelete(id);
        setPendingDelete(null);
      }, VISIBLE_DURATION);
      return () => clearTimeout(t);
    }
    opacity.value = withTiming(0, { duration: ANIM_DURATION });
    translateY.value = withTiming(20, { duration: ANIM_DURATION });
  }, [pendingDelete, opacity, translateY, setPendingDelete, commitDelete]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!pendingDelete) return null;

  const handleUndo = () => {
    restoreExpense(pendingDelete);
    setPendingDelete(null);
  };

  return (
    <View style={containerStyle} pointerEvents="box-none">
      <Animated.View style={[toastStyle, animatedStyle]}>
        <Feather name="trash-2" size={16} color={Colors.textDim} />
        <Text style={messageStyle}>Удалено</Text>
        <Pressable onPress={handleUndo} style={undoButtonStyle} hitSlop={8}>
          <Text style={undoTextStyle}>Отменить</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const containerStyle: ViewStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 88,
  alignItems: 'center',
  zIndex: 200,
};

const toastStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  backgroundColor: Colors.surfaceTop,
  borderWidth: 1,
  borderColor: Colors.borderMid,
  borderRadius: Radius.lg,
  paddingHorizontal: 16,
  paddingVertical: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
};

const messageStyle: TextStyle = {
  fontFamily: FontFamily.medium,
  fontSize: FontSize.md,
  color: Colors.text,
};

const undoButtonStyle: ViewStyle = {
  paddingLeft: 6,
  paddingVertical: 2,
};

const undoTextStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.md,
  color: Colors.accent,
};
