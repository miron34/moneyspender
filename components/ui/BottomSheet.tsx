import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type DimensionValue,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { FontFamily, FontSize, Radius } from '@/constants/typography';
import { useTabBarHeight } from '@/components/navigation/TabBar';
import { usePhoneFramePortal } from './PhoneFramePortal';

const ENTER_DURATION = 320;
const EXIT_DURATION = 220;
const OVERLAY_DURATION = 200;
const SHEET_EASING = Easing.bezier(0.16, 1, 0.3, 1);
// iOS keyboard uses UIViewAnimationCurve.keyboardDefault (~ easeInOut bezier).
// This curve matches the system slide so our sheet rides exactly with the keyboard.
const KEYBOARD_EASING = Easing.bezier(0.17, 0.59, 0.4, 0.77);
const KEYBOARD_FALLBACK_DURATION = 250;

const DRAG_CLOSE_DISTANCE = 120;
const DRAG_CLOSE_VELOCITY = 800;
const DRAG_ACTIVE_OFFSET = 4;
const DRAG_FADE_DISTANCE = 250;
const DRAG_SPRING = { damping: 26, stiffness: 320, mass: 0.8 } as const;

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  maxHeight?: DimensionValue;
  children: React.ReactNode;
  zIndex?: number;
  /**
   * Optional banner rendered just above the sheet (outside the sheet
   * surface itself). Useful for inline toasts/errors that should appear
   * close to the sheet but not crowd the content. Because the wrapper
   * uses flex-end column layout, putting the banner before the sheet
   * in the tree naturally stacks it directly above the sheet's top edge.
   */
  topBanner?: React.ReactNode;
  /**
   * Wrap children in a vertical ScrollView. Use when the sheet content
   * exceeds the sheet height (e.g. forms with many fields). The handle
   * row stays sticky at top so drag-to-close keeps working — only the
   * inner content scrolls.
   *
   * Pair with a higher `maxHeight` like '92%' so users see most of the
   * form at once and only need to scroll for the long tail.
   */
  scrollable?: boolean;
}

export function BottomSheet({
  open,
  onClose,
  title,
  maxHeight = '78%',
  children,
  zIndex = 400,
  topBanner,
  scrollable = false,
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(open);
  const phonePortalEl = usePhoneFramePortal();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  // Sheet's paddingBottom must clear:
  //   1. iPhone home indicator (insets.bottom)
  //   2. The floating TabBar
  //   3. The VoiceFab perched on the TabBar's top edge
  // Without this, on a sheet rendered inside a tab screen (e.g.
  // CategoryEditSheet inside Profile) the bottom buttons hide *under*
  // the floating bar/FAB and the user can't scroll past them. We
  // simply reserve `tabBarHeight + 16` so the last interactive element
  // of any sheet sits above the bar with a finger's worth of breathing
  // room. Web (where the bar isn't a layering issue) still benefits —
  // useTabBarHeight returns 0 + 6 + 56 = 62, which is roughly the
  // current 28+34 we'd pick anyway.
  const bottomPad = Math.max(28, insets.bottom + 16, tabBarHeight + 16);
  const overlayOpacity = useSharedValue(0);
  const sheetTranslate = useSharedValue(40);
  const sheetOpacity = useSharedValue(0);
  const keyboardOffset = useSharedValue(0);

  // Push the sheet up when the soft keyboard appears so inputs stay visible.
  // We use the duration delivered by the OS event so the sheet rides exactly
  // in sync with the native keyboard slide animation.
  useEffect(() => {
    if (!mounted) return;
    const isIOS = Platform.OS === 'ios';
    const showEvent = isIOS ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = isIOS ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const h = e.endCoordinates?.height ?? 0;
      const dur = e.duration && e.duration > 0 ? e.duration : KEYBOARD_FALLBACK_DURATION;
      keyboardOffset.value = withTiming(-h, { duration: dur, easing: KEYBOARD_EASING });
    });
    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      const dur = e.duration && e.duration > 0 ? e.duration : KEYBOARD_FALLBACK_DURATION;
      keyboardOffset.value = withTiming(0, { duration: dur, easing: KEYBOARD_EASING });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [mounted, keyboardOffset]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      overlayOpacity.value = withTiming(1, { duration: OVERLAY_DURATION });
      sheetTranslate.value = withTiming(0, { duration: ENTER_DURATION, easing: SHEET_EASING });
      sheetOpacity.value = withTiming(1, { duration: ENTER_DURATION, easing: SHEET_EASING });
    } else if (mounted) {
      overlayOpacity.value = withTiming(0, { duration: EXIT_DURATION });
      // Continue from current translate (in case user dragged sheet down before close)
      sheetTranslate.value = withTiming(sheetTranslate.value + 40, {
        duration: EXIT_DURATION,
      });
      sheetOpacity.value = withTiming(0, { duration: EXIT_DURATION });
      const t = setTimeout(() => setMounted(false), EXIT_DURATION);
      return () => clearTimeout(t);
    }
  }, [open, mounted, overlayOpacity, sheetTranslate, sheetOpacity]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslate.value + keyboardOffset.value }],
    opacity: sheetOpacity.value,
  }));

  // Filler under the sheet — fills the gap between sheet bottom and the
  // top of the soft keyboard, so the gap doesn't show through as the bg color.
  const fillerStyle = useAnimatedStyle(() => ({
    height: Math.max(0, -keyboardOffset.value),
    opacity: sheetOpacity.value,
  }));

  // Pan with low-threshold downward activation so the very first pixel of
  // movement maps 1:1 onto the sheet — no initial jump from a minDistance gate.
  // Direction is filtered inside the worklet (translationY <= 0 ignored).
  const dragGesture = Gesture.Pan()
    .activeOffsetY(DRAG_ACTIVE_OFFSET)
    .onUpdate((e) => {
      'worklet';
      if (e.translationY <= 0) return;
      sheetTranslate.value = e.translationY;
      overlayOpacity.value = Math.max(0, 1 - e.translationY / DRAG_FADE_DISTANCE);
    })
    .onEnd((e) => {
      'worklet';
      const shouldClose =
        e.translationY > DRAG_CLOSE_DISTANCE || e.velocityY > DRAG_CLOSE_VELOCITY;
      if (shouldClose) {
        runOnJS(onClose)();
      } else {
        sheetTranslate.value = withSpring(0, DRAG_SPRING);
        overlayOpacity.value = withTiming(1, { duration: 200 });
      }
    });

  if (!mounted) return null;

  const tree = (
    <View style={[wrapperStyle, { zIndex }]} pointerEvents="box-none">
      <Animated.View style={[overlayBaseStyle, overlayStyle]}>
        <Pressable style={overlayPressStyle} onPress={onClose} />
      </Animated.View>
      {topBanner ? (
        // Flex-end column layout puts this directly above the sheet.
        // pointerEvents="box-none" so the banner doesn't block taps to the
        // overlay behind it (the user can still tap-outside-to-close).
        <Animated.View
          style={[topBannerWrapperStyle, sheetStyle]}
          pointerEvents="box-none">
          {topBanner}
        </Animated.View>
      ) : null}
      <Animated.View
        style={[sheetBaseStyle, { maxHeight, paddingBottom: bottomPad }, sheetStyle]}>
        <GestureDetector gesture={dragGesture}>
          <View style={dragZoneStyle}>
            <View style={handleRowStyle}>
              <View style={handleStyle} />
            </View>
            {title ? <Text style={titleStyle}>{title}</Text> : null}
          </View>
        </GestureDetector>
        {scrollable ? (
          <ScrollView
            style={scrollableContentStyle}
            contentContainerStyle={contentStyle}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={contentStyle}>{children}</View>
        )}
      </Animated.View>
      <Animated.View style={[fillerBaseStyle, fillerStyle]} pointerEvents="none" />
    </View>
  );

  // On web, render via Portal so the sheet escapes any CSS stacking
  // contexts created by parent screens (TabBar etc would otherwise sit
  // above us). Target priority:
  //   1. PhoneFrame's portal target (desktop web with iPhone shell visible)
  //      → keeps the sheet inside the iPhone frame, not covering the
  //      whole window.
  //   2. document.body (mobile web with no shell, or PhoneFrame not yet
  //      mounted) → sheet covers the full viewport, which is correct on
  //      a real phone-sized window.
  // On native we stay in-tree — RN handles z-order via elevation.
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return createPortal(tree, phonePortalEl ?? document.body);
  }
  return tree;
}

const wrapperStyle: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  justifyContent: 'flex-end',
};

const overlayBaseStyle: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.55)',
};

const overlayPressStyle: ViewStyle = {
  flex: 1,
};

const sheetBaseStyle: ViewStyle = {
  backgroundColor: Colors.surfaceHigh,
  borderTopLeftRadius: Radius.sheet,
  borderTopRightRadius: Radius.sheet,
  borderTopWidth: 1,
  borderTopColor: Colors.borderMid,
  // paddingBottom is applied dynamically in the component body using
  // safe-area insets so the sheet content clears the home indicator.
};

const topBannerWrapperStyle: ViewStyle = {
  paddingHorizontal: 14,
  paddingBottom: 10,
  alignItems: 'center',
};

const fillerBaseStyle: ViewStyle = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: Colors.surfaceHigh,
};

const dragZoneStyle: ViewStyle = {
  // Whole top area of the sheet acts as a drag handle — handle bar + title.
  // This is much more forgiving on mobile than a thin 4px stripe.
};

const handleRowStyle: ViewStyle = {
  alignItems: 'center',
  paddingTop: 14,
  paddingBottom: 14,
};

const handleStyle: ViewStyle = {
  width: 44,
  height: 5,
  borderRadius: 3,
  backgroundColor: 'rgba(255,255,255,0.22)',
};

const titleStyle: TextStyle = {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.lg,
  color: Colors.text,
  paddingHorizontal: 20,
  paddingBottom: 14,
};

const contentStyle: ViewStyle = {
  paddingHorizontal: 20,
};

// flexShrink:1 lets the ScrollView take exactly the remaining space
// inside the sheet (between sticky header and the bottom edge), so
// vertical scroll triggers when content is taller than that band —
// which is exactly when we want it to.
const scrollableContentStyle: ViewStyle = {
  flexShrink: 1,
};
