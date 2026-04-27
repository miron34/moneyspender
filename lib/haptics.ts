import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

const safe = (fn: () => Promise<void> | void) => {
  if (!isNative) return;
  try {
    void fn();
  } catch {
    // noop — haptics are best-effort, never block UX on failure
  }
};

/** Light tap — for tab switches, picker selection, minor toggles. */
export const lightTap = () =>
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

/** Medium tap — for FAB, primary buttons, opening important sheets. */
export const mediumTap = () =>
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

/** Notification: success — for successful save/add. */
export const success = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

/** Notification: warning — for delete/destructive triggers. */
export const warning = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
