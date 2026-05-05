// PhoneFrame portal: gives BottomSheet a place to render that escapes
// stacking contexts (Tabs, screens) but stays *inside* the iPhone-frame
// shell on desktop web.
//
// Why this exists:
//   On web we use ReactDOM.createPortal to lift sheets out of the parent
//   stacking context — otherwise the bottom TabBar sits above them. Earlier
//   we portaled into `document.body`, but that meant the sheet covered the
//   entire desktop window, ignoring the PhoneFrame shell. Now PhoneFrame
//   exposes its own portal target via this Context; BottomSheet uses it
//   when present and falls back to `document.body` (mobile web with no
//   frame, or native).
//
// On native this whole module is a no-op — `el` stays null, BottomSheet
// renders inline. The Context provider is still rendered for symmetry but
// adds zero runtime cost.

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform, View, type ViewStyle } from 'react-native';

interface PhoneFramePortalCtxValue {
  el: HTMLElement | null;
}

const PhoneFramePortalContext = createContext<PhoneFramePortalCtxValue>({
  el: null,
});

/**
 * Read the portal target from context. Returns the HTMLElement to portal
 * into, or `null` if no PhoneFrame is active (mobile web, native).
 */
export function usePhoneFramePortal(): HTMLElement | null {
  return useContext(PhoneFramePortalContext).el;
}

interface PhoneFramePortalHostProps {
  children: ReactNode;
}

/**
 * Wraps children and adds an absolutely-positioned `View` that serves as
 * the portal target. The View itself is `pointerEvents="box-none"` so it
 * doesn't intercept touches when no sheet is open.
 *
 * On native: passthrough — no host View, `el` stays null.
 */
export function PhoneFramePortalHost({ children }: PhoneFramePortalHostProps) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  // Typed as View so React Native's ref machinery is happy; on web,
  // react-native-web returns the underlying HTMLDivElement here.
  const ref = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // react-native-web exposes the DOM node directly via the View ref.
    setEl((ref.current as unknown as HTMLElement | null) ?? null);
  }, []);

  if (Platform.OS !== 'web') {
    // Native renderer doesn't understand DOM portals; just pass through.
    return <>{children}</>;
  }

  return (
    <PhoneFramePortalContext.Provider value={{ el }}>
      {children}
      <View ref={ref} style={hostStyle} pointerEvents="box-none" />
    </PhoneFramePortalContext.Provider>
  );
}

const hostStyle: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  // pointerEvents 'box-none' is set via the prop; this style block can't
  // express it because the type isn't part of ViewStyle. Setting it as
  // prop covers both native and web.
};
