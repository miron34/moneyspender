// Standalone voice FAB — separate from TabBar.
//
// Extracted from TabBar in 2026-05-04 polish iteration: voice is the
// headline feature and deserves its own hero button rather than sitting
// crammed next to the regular "+" inside the bar. Now it floats above
// the bottom-right corner, in the natural thumb zone for right-handed
// users, with concentric ripples while recording and a rotating loader
// while processing.
//
// Position is absolute so the parent (`app/(tabs)/_layout.tsx`) can
// freely place it relative to the screen / phone-frame edge. The
// component itself doesn't know about insets — caller decides where it
// sits via the wrapper.

import { useEffect } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/constants/colors';
import { mediumTap } from '@/lib/haptics';

// Slightly smaller than the plus FAB (52) — mic is hero but shouldn't
// dominate over the navigation. With overlap reduced to ~12px (managed
// in _layout.tsx) the FAB now reads as "perched on the bar's corner"
// instead of "covering the profile tab icon".
const FAB_SIZE = 44;
const RIPPLE_DURATION = 1500;
const RIPPLE_DELAY = 750;
const PROCESSING_ROTATE_DURATION = 1100;
const PROCESSING_PULSE_DURATION = 800;

interface VoiceFabProps {
  onPressIn: () => void;
  onPressOut: () => void;
  recording: boolean;
  processing: boolean;
  /**
   * Hides the FAB without unmounting (preserves animation state). Used
   * when AddExpenseSheet or VoiceConfirmSheet are open — we don't want
   * the FAB to peek out behind the sheet.
   */
  visible?: boolean;
}

export function VoiceFab({
  onPressIn,
  onPressOut,
  recording,
  processing,
  visible = true,
}: VoiceFabProps) {
  // Concentric ripples for recording state — two values staggered by
  // half a cycle so the rings emanate continuously instead of pulsing
  // in unison.
  const ripple1 = useSharedValue(0);
  const ripple2 = useSharedValue(0);

  // Processing state animations — rotating loader + breathing scale.
  const rotate = useSharedValue(0);
  const processingPulse = useSharedValue(1);

  useEffect(() => {
    if (recording) {
      ripple1.value = 0;
      ripple2.value = 0;
      ripple1.value = withRepeat(
        withTiming(1, {
          duration: RIPPLE_DURATION,
          easing: Easing.out(Easing.ease),
        }),
        -1,
      );
      ripple2.value = withDelay(
        RIPPLE_DELAY,
        withRepeat(
          withTiming(1, {
            duration: RIPPLE_DURATION,
            easing: Easing.out(Easing.ease),
          }),
          -1,
        ),
      );
    } else {
      cancelAnimation(ripple1);
      cancelAnimation(ripple2);
      ripple1.value = 0;
      ripple2.value = 0;
    }
  }, [recording, ripple1, ripple2]);

  useEffect(() => {
    if (processing) {
      rotate.value = 0;
      rotate.value = withRepeat(
        withTiming(1, {
          duration: PROCESSING_ROTATE_DURATION,
          easing: Easing.linear,
        }),
        -1,
      );
      processingPulse.value = withRepeat(
        withTiming(1.06, {
          duration: PROCESSING_PULSE_DURATION,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true, // reverse — yields a 1 ↔ 1.06 oscillation
      );
    } else {
      cancelAnimation(rotate);
      cancelAnimation(processingPulse);
      rotate.value = 0;
      processingPulse.value = 1;
    }
  }, [processing, rotate, processingPulse]);

  const ripple1Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ripple1.value, [0, 1], [1, 2]) }],
    opacity: interpolate(ripple1.value, [0, 1], [0.6, 0]),
  }));

  const ripple2Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ripple2.value, [0, 1], [1, 2]) }],
    opacity: interpolate(ripple2.value, [0, 1], [0.6, 0]),
  }));

  const processingIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotate.value, [0, 1], [0, 360])}deg` }],
  }));

  const processingFabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: processingPulse.value }],
  }));

  if (!visible) return null;

  return (
    <View style={containerStyle} pointerEvents="box-none">
      {recording && (
        <>
          <Animated.View style={[rippleBaseStyle, ripple1Style]} pointerEvents="none" />
          <Animated.View style={[rippleBaseStyle, ripple2Style]} pointerEvents="none" />
        </>
      )}
      <Pressable
        onPressIn={() => {
          mediumTap();
          onPressIn();
        }}
        onPressOut={onPressOut}
        disabled={processing}
        style={pressableStyle}>
        {processing ? (
          <Animated.View style={[fillStyle, solidFillStyle, processingFabStyle]}>
            <Animated.View style={processingIconStyle}>
              <Feather name="loader" size={20} color="#ffffff" strokeWidth={2.5} />
            </Animated.View>
          </Animated.View>
        ) : recording ? (
          <View style={[fillStyle, solidFillStyle]}>
            <Feather name="mic" size={20} color="#ffffff" strokeWidth={2.5} />
          </View>
        ) : (
          <LinearGradient
            colors={[Colors.accentLight, Colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={fillStyle}>
            <Feather name="mic" size={20} color="#ffffff" strokeWidth={2.5} />
          </LinearGradient>
        )}
      </Pressable>
    </View>
  );
}

// ---- Styles ----------------------------------------------------------

// Container is the positioning anchor for ripples; sized to the FAB so
// rings emanate from its centre. Caller positions this absolute via a
// wrapper in `_layout.tsx`.
const containerStyle: ViewStyle = {
  width: FAB_SIZE,
  height: FAB_SIZE,
  alignItems: 'center',
  justifyContent: 'center',
};

const pressableStyle: ViewStyle = {
  width: FAB_SIZE,
  height: FAB_SIZE,
  borderRadius: FAB_SIZE / 2,
  boxShadow: '0 8px 24px rgba(59,91,219,0.55)',
};

const fillStyle: ViewStyle = {
  width: FAB_SIZE,
  height: FAB_SIZE,
  borderRadius: FAB_SIZE / 2,
  alignItems: 'center',
  justifyContent: 'center',
};

const solidFillStyle: ViewStyle = {
  backgroundColor: Colors.accent,
};

// Concentric ripples — same size as FAB at rest, scale 1 → 2x, fade
// 0.6 → 0. Border-only so they read as expanding waves, not filled
// circles.
const rippleBaseStyle: ViewStyle = {
  position: 'absolute',
  width: FAB_SIZE,
  height: FAB_SIZE,
  borderRadius: FAB_SIZE / 2,
  borderWidth: 2,
  borderColor: Colors.accent,
};
