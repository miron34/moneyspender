import { useState } from 'react';
import {
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { FontFamily, FontSize, Radius } from '@/constants/typography';
import { warning } from '@/lib/haptics';

const PARTIAL_OPEN = -84;
const FULL_THRESHOLD_RATIO = 0.55;
const ACTIVE_OFFSET = 12;
const COLLAPSE_DURATION = 200;
const COLLAPSE_EASING = Easing.bezier(0.16, 1, 0.3, 1);

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  /** Show "Удалить" label next to the trash icon when partially open. */
  deleteLabel?: string;
}

export function SwipeableRow({ children, onDelete, deleteLabel = 'Удалить' }: SwipeableRowProps) {
  const [width, setWidth] = useState(0);
  const translateX = useSharedValue(0);
  const heightCollapse = useSharedValue(1);

  const handleLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const triggerDelete = () => {
    warning();
    heightCollapse.value = withTiming(0, {
      duration: COLLAPSE_DURATION,
      easing: COLLAPSE_EASING,
    });
    setTimeout(onDelete, COLLAPSE_DURATION);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-ACTIVE_OFFSET, ACTIVE_OFFSET])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      'worklet';
      const next = e.translationX;
      translateX.value = Math.min(0, next);
    })
    .onEnd(() => {
      'worklet';
      const x = translateX.value;
      const fullOpen = -width * FULL_THRESHOLD_RATIO;
      if (x <= fullOpen) {
        translateX.value = withTiming(-width, {
          duration: COLLAPSE_DURATION,
          easing: COLLAPSE_EASING,
        });
        runOnJS(triggerDelete)();
      } else if (x <= PARTIAL_OPEN) {
        translateX.value = withTiming(PARTIAL_OPEN, {
          duration: 180,
          easing: COLLAPSE_EASING,
        });
      } else {
        translateX.value = withTiming(0, { duration: 180, easing: COLLAPSE_EASING });
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const wrapperStyle = useAnimatedStyle(() => ({
    opacity: heightCollapse.value,
    transform: [{ scaleY: heightCollapse.value }],
  }));

  return (
    <Animated.View style={[wrapperBase, wrapperStyle]} onLayout={handleLayout}>
      <View style={backdropStyle}>
        <Pressable
          onPress={() => {
            translateX.value = withTiming(0);
            triggerDelete();
          }}
          style={deleteButtonStyle}>
          <Feather name="trash-2" size={18} color="#ffffff" />
          <Text style={deleteTextStyle}>{deleteLabel}</Text>
        </Pressable>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const wrapperBase: ViewStyle = {
  position: 'relative',
  borderRadius: Radius.rowCompact,
  overflow: 'hidden',
};

const backdropStyle: ViewStyle = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  width: 84,
  backgroundColor: Colors.negative,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: Radius.rowCompact,
};

const deleteButtonStyle: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  width: '100%',
};

const deleteTextStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.xs,
  color: '#ffffff',
};
