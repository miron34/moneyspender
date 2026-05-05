import { Platform, Pressable, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { Colors, withAlpha } from '@/constants/colors';
import { lightTap, mediumTap } from '@/lib/haptics';

// Geometry of the floating bar — also exported via `useTabBarHeight()`
// so screens can reserve scroll-content padding equal to the bar's
// footprint without each screen guessing the value independently.
export const TAB_BAR_SIDE_MARGIN = 16;
// Pushed down to the safe-area edge (was 6) so the bar reads as
// "resting on the bottom" rather than floating with extra air below.
// VoiceFab no longer follows this — it's now fixed on its own absolute
// offset (see _layout.tsx VOICE_FAB_BOTTOM_FROM_SAFE_AREA), so lowering
// the bar makes the mic visually pop up further above it.
const BOTTOM_MARGIN = 0;
// Approximate visible height of the pill — used by `useTabBarHeight()`.
// Pill = 10 (paddingV) + 36 (icon row) + 10 (paddingV) ≈ 56px. We add a
// bit of extra slack (8px) so screen content doesn't kiss the bar's
// upper edge.
const PILL_VISIBLE_HEIGHT = 56;

type FeatherName = React.ComponentProps<typeof Feather>['name'];

interface TabMeta {
  icon: FeatherName;
}

const TAB_META: Record<string, TabMeta> = {
  index: { icon: 'home' },
  history: { icon: 'clock' },
  analytics: { icon: 'bar-chart-2' },
  profile: { icon: 'user' },
};

const TAB_ORDER = ['index', 'history', 'analytics', 'profile'] as const;

const TAB_ICON_SIZE = 24;
const FAB_SIZE = 52;
const PILL_PAD_H = 8; // active-tab pill horizontal padding around icon

export interface TabBarProps extends BottomTabBarProps {
  /** Tap handler for the central "+" FAB — opens AddExpenseSheet. */
  onAddPress: () => void;
}

export function TabBar({ state, navigation, onAddPress }: TabBarProps) {
  const activeName = state.routes[state.index]?.name;
  const insets = useSafeAreaInsets();
  // Bottom inset = home-indicator height on iPhone, 0 on web. We sit
  // above it with our own margin.
  const bottom = (Platform.OS === 'web' ? 0 : insets.bottom) + BOTTOM_MARGIN;

  const renderTab = (routeName: string) => {
    const meta = TAB_META[routeName];
    if (!meta) return null;
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) return null;

    const isActive = activeName === routeName;
    const iconColor = isActive ? Colors.accent : Colors.textMuted;

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
        <View
          style={[
            iconPillStyle,
            isActive && {
              backgroundColor: withAlpha(Colors.accent, 0.14),
            },
          ]}>
          <Feather name={meta.icon} size={TAB_ICON_SIZE} color={iconColor} />
        </View>
      </Pressable>
    );
  };

  // BlurView gives the pill its frosted-glass feel on native iOS. On
  // web `expo-blur` falls back to backdrop-filter via CSS — supported
  // by all modern browsers we care about. We pass tint='dark' so the
  // bar reads against either the bright or dim app background.
  //
  // The bar floats absolutely so screens scroll *underneath* it — gives
  // the floating-island effect without forcing every screen to add
  // bottom padding. Side and bottom margins create the gap from the
  // screen edges.
  return (
    <View
      style={[
        outerStyle,
        { left: TAB_BAR_SIDE_MARGIN, right: TAB_BAR_SIDE_MARGIN, bottom },
      ]}
      pointerEvents="box-none">
      <BlurView intensity={60} tint="dark" style={pillStyle}>
        {/*
          Slight surface tint *on top* of the blur so the bar reads even
          on screens where the blurred content underneath is dim
          (transparent blur over near-black bg ≈ invisible bar).
        */}
        <View style={pillTintStyle}>
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
                style={fabFillStyle}>
                <Feather name="plus" size={22} color="#ffffff" strokeWidth={2.5} />
              </LinearGradient>
            </Pressable>
          </View>
          {renderTab(TAB_ORDER[2])}
          {renderTab(TAB_ORDER[3])}
        </View>
      </BlurView>
    </View>
  );
}

// ---- Styles ----------------------------------------------------------

// Outer wrapper is absolutely positioned at the bottom of the screen
// so screen content scrolls underneath the bar (floating-island look).
// Concrete left/right/bottom values are computed in the component body
// from safe-area insets.
const outerStyle: ViewStyle = {
  position: 'absolute',
  alignItems: 'stretch',
};

// The frosted pill itself. borderRadius 36 → fully rounded for any
// height ≤ 72px. overflow: hidden is required so the BlurView clips
// to the rounded shape on iOS (without it the blur leaks to a square
// on some iOS versions).
const pillStyle: ViewStyle = {
  borderRadius: 36,
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: withAlpha('#ffffff', 0.08),
  // Drop shadow for the floating-island feel. boxShadow works on both
  // RN-Web and native (RN 0.76+).
  boxShadow: '0 12px 28px rgba(0,0,0,0.55)',
};

// Tint laid over the blur to keep contrast usable. ~60% surface = nice
// darkened-glass look. The blur underneath shows through enough to
// give depth.
const pillTintStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 10,
  paddingHorizontal: 8,
  // Web: backdrop-filter blur leaves the surface fully transparent,
  // which can look washed-out. Use a slightly heavier tint there for
  // legibility. Native gets a lighter tint so the BlurView dominates.
  backgroundColor:
    Platform.OS === 'web' ? withAlpha(Colors.surface, 0.7) : withAlpha(Colors.surface, 0.4),
};

const tabStyle: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 6,
};

// Pill behind the active tab's icon — Apple Music / iOS 17 style. Only
// the active tab gets the tinted backgroundColor; inactive ones leave
// the pill style as a clear frame so the icon centers identically and
// switching tabs doesn't shift layout.
const iconPillStyle: ViewStyle = {
  paddingHorizontal: PILL_PAD_H + 4,
  paddingVertical: 6,
  borderRadius: 18,
};

const fabSlotStyle: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
};

const fabPressableStyle: ViewStyle = {
  width: FAB_SIZE,
  height: FAB_SIZE,
  borderRadius: FAB_SIZE / 2,
  // Lift so it pops slightly above the bar surface without breaking out
  // of the pill outline.
  transform: [{ translateY: -4 }],
  boxShadow: '0 6px 18px rgba(59,91,219,0.5)',
};

const fabFillStyle: ViewStyle = {
  width: FAB_SIZE,
  height: FAB_SIZE,
  borderRadius: FAB_SIZE / 2,
  alignItems: 'center',
  justifyContent: 'center',
};

// =============================================================================
// useTabBarHeight — total vertical footprint of the floating bar from the
// bottom of the screen, including safe-area inset. Screens use this to
// pad their scroll content so it doesn't slide under the bar.
// =============================================================================

export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  const safeBottom = Platform.OS === 'web' ? 0 : insets.bottom;
  return safeBottom + BOTTOM_MARGIN + PILL_VISIBLE_HEIGHT;
}
