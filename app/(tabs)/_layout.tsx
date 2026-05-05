import { useEffect, useRef, useState } from 'react';
import { Platform, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Colors, withAlpha } from '@/constants/colors';
import { FontFamily, FontSize, Radius } from '@/constants/typography';
import { TabBar, TAB_BAR_SIDE_MARGIN, useTabBarHeight } from '@/components/navigation/TabBar';
import { VoiceFab } from '@/components/navigation/VoiceFab';
import { AddExpenseSheet } from '@/components/sheets/AddExpenseSheet';
import { VoiceConfirmSheet } from '@/components/sheets/VoiceConfirmSheet';
import { UndoToast } from '@/components/ui/UndoToast';
import { ErrorToast } from '@/components/ui/ErrorToast';
import { lightTap, success, warning } from '@/lib/haptics';
import { VoiceCaptureSession, MAX_DURATION_MS } from '@/lib/voice';
import { useStore } from '@/store/useStore';
import type { ParsedExpense } from '@/types/voice';

const WEB_VOICE_NOTICE = 'Только в приложении на iPhone';
const VOICE_TOAST_DURATION = 3000;

// VoiceFab is pinned to a fixed offset above the safe-area bottom,
// independent of the TabBar's own bottom margin. This way we can lower
// the TabBar later (or raise it) without the mic following — and
// dropping the bar produces the desired "mic visibly perches above the
// bar" effect.
//
// Value derived from the previous geometry (BOTTOM_MARGIN=6 + bar
// height 56 − 12 overlap = 50) so the FAB position visually doesn't
// shift when this refactor lands. Lower BOTTOM_MARGIN → bar drops →
// mic now sits higher above bar → bigger visible "perch".
const VOICE_FAB_BOTTOM_FROM_SAFE_AREA = 50;

type VoiceState = 'idle' | 'recording' | 'processing';

export default function TabsLayout() {
  const [addOpen, setAddOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<ParsedExpense | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceToast, setVoiceToast] = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  const categories = useStore((s) => s.categories);
  const addExpense = useStore((s) => s.addExpense);
  const setVoicePending = useStore((s) => s.setVoicePending);

  const sessionRef = useRef<VoiceCaptureSession | null>(null);
  const pressedRef = useRef(false);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topPadding = Platform.OS === 'web' ? 0 : insets.top;
  const safeBottom = Platform.OS === 'web' ? 0 : insets.bottom;
  // Total height of the floating TabBar (including safe-area). Used by
  // the voice toast to sit just above the bar.
  const tabBarHeight = useTabBarHeight();
  // Fixed VoiceFab position — does NOT follow tabBarHeight, see comment
  // on VOICE_FAB_BOTTOM_FROM_SAFE_AREA above.
  const voiceFabBottom = safeBottom + VOICE_FAB_BOTTOM_FROM_SAFE_AREA;

  useEffect(() => {
    return () => {
      if (voiceToastTimerRef.current) clearTimeout(voiceToastTimerRef.current);
      if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);
      if (sessionRef.current) sessionRef.current.cancel();
    };
  }, []);

  const showVoiceToast = (msg: string) => {
    setVoiceToast(msg);
    if (voiceToastTimerRef.current) clearTimeout(voiceToastTimerRef.current);
    voiceToastTimerRef.current = setTimeout(() => {
      setVoiceToast(null);
      voiceToastTimerRef.current = null;
    }, VOICE_TOAST_DURATION);
  };

  // ---- Voice handlers ------------------------------------------------------

  const handleMicPressIn = async () => {
    if (voiceState !== 'idle') return;

    if (Platform.OS === 'web') {
      showVoiceToast(WEB_VOICE_NOTICE);
      return;
    }

    pressedRef.current = true;
    if (!sessionRef.current) sessionRef.current = new VoiceCaptureSession();
    try {
      await sessionRef.current.start();
      if (!pressedRef.current) {
        sessionRef.current.cancel();
        return;
      }
      setVoiceState('recording');
      lightTap();
      maxDurationTimerRef.current = setTimeout(() => {
        void handleMicPressOut();
      }, MAX_DURATION_MS);
    } catch (e) {
      pressedRef.current = false;
      showVoiceToast(formatVoiceError(e, 'Не удалось начать запись'));
      warning();
      setVoiceState('idle');
    }
  };

  const handleMicPressOut = async () => {
    pressedRef.current = false;
    if (voiceState !== 'recording') return;
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
    setVoiceState('processing');
    try {
      // Read categories fresh — the user might have edited them while
      // speaking (rename, add). VoiceCaptureSession is stateless about
      // categories so this is the right boundary for that snapshot.
      const result = await sessionRef.current!.finish(
        useStore.getState().categories,
      );
      if (!result.parsed) {
        showVoiceToast('Не удалось распознать. Попробуйте ещё раз');
        warning();
        setVoiceState('idle');
        return;
      }
      setPending(result.parsed);
      setVoiceState('idle');
      setConfirmOpen(true);
      success();
    } catch (e) {
      showVoiceToast(formatVoiceError(e, 'Ошибка распознавания'));
      warning();
      setVoiceState('idle');
    }
  };

  // ---- Confirm sheet handlers ---------------------------------------------

  const handleConfirmSave = () => {
    if (!pending) return;
    const finalAmount = pending.amount ?? 0;
    if (finalAmount <= 0) {
      showVoiceToast('Сумма не распознана');
      warning();
      setPending(null);
      setConfirmOpen(false);
      return;
    }
    // Server returns either an id from our `categories[]` payload or null,
    // and lib/parseExpense re-validates client-side. So `pending.cat` is
    // already a real id or null — fallback only handles null (no contextual
    // category match was possible).
    const resolvedCatId = pending.cat ?? categories[0]?.id ?? 'other';
    const resolvedCat =
      categories.find((c) => c.id === resolvedCatId) ??
      categories[0] ??
      { id: resolvedCatId, label: 'Другое', color: '', icon: '' };
    const finalDate = pending.date ? localMidnightFromIso(pending.date) : new Date();
    addExpense({
      cat: resolvedCatId,
      name: pending.name?.trim() || resolvedCat.label,
      amount: finalAmount,
      date: finalDate,
    });
    success();
    setPending(null);
    setConfirmOpen(false);
  };

  const handleConfirmEdit = () => {
    if (!pending) return;
    setVoicePending(pending);
    setPending(null);
    setConfirmOpen(false);
    setTimeout(() => setAddOpen(true), 60);
  };

  const handleConfirmClose = () => {
    setPending(null);
    setConfirmOpen(false);
  };

  // ---- Render --------------------------------------------------------------

  // Hide VoiceFab when any sheet is open — it would otherwise float
  // over the sheet surface.
  const voiceFabVisible = !addOpen && !confirmOpen;

  return (
    <View style={[containerStyle, { paddingTop: topPadding }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: Colors.bg },
        }}
        tabBar={(props) => <TabBar {...props} onAddPress={() => setAddOpen(true)} />}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="history" />
        <Tabs.Screen name="analytics" />
        <Tabs.Screen name="profile" />
      </Tabs>

      <UndoToast />
      <ErrorToast />

      {/*
        Voice toast — sits just above the floating TabBar, in the same
        zone as VoiceFab so user attention stays in the bottom-right.
      */}
      {voiceToast && (
        <View
          style={[voiceToastWrapperStyle, { bottom: tabBarHeight + 24 }]}
          pointerEvents="none">
          <View style={voiceToastStyle}>
            <Feather name="alert-circle" size={16} color={Colors.negative} />
            <Text style={voiceToastTextStyle} numberOfLines={2}>
              {voiceToast}
            </Text>
          </View>
        </View>
      )}

      {/*
        VoiceFab — separate floating mic in the bottom-right thumb zone.
        Lives outside TabBar so the bar stays purely navigational.
      */}
      {/*
        VoiceFab — pinned at a fixed offset from the safe-area bottom
        (independent of TabBar geometry). Right offset places it on the
        bar's right corner. Lowering BOTTOM_MARGIN in TabBar.tsx now
        drops the bar without moving the mic, so the mic appears to
        "perch higher" above the bar.
      */}
      <View
        style={[
          voiceFabWrapperStyle,
          {
            bottom: voiceFabBottom,
            right: TAB_BAR_SIDE_MARGIN + 8,
          },
        ]}
        pointerEvents="box-none">
        <VoiceFab
          onPressIn={handleMicPressIn}
          onPressOut={handleMicPressOut}
          recording={voiceState === 'recording'}
          processing={voiceState === 'processing'}
          visible={voiceFabVisible}
        />
      </View>

      <AddExpenseSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <VoiceConfirmSheet
        open={confirmOpen}
        onClose={handleConfirmClose}
        pending={pending}
        categories={categories}
        onSave={handleConfirmSave}
        onEdit={handleConfirmEdit}
      />
    </View>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function localMidnightFromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map((s) => parseInt(s, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return new Date();
  }
  const date = new Date();
  date.setFullYear(y, m - 1, d);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatVoiceError(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) {
    return e.message.length > 80 ? fallback : e.message;
  }
  return fallback;
}

// =============================================================================
// Styles
// =============================================================================

const containerStyle: ViewStyle = {
  flex: 1,
  backgroundColor: Colors.bg,
};

const voiceFabWrapperStyle: ViewStyle = {
  position: 'absolute',
  zIndex: 11,
};

const voiceToastWrapperStyle: ViewStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  alignItems: 'center',
  zIndex: 250,
};

const voiceToastStyle: ViewStyle = {
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

const voiceToastTextStyle: TextStyle = {
  flex: 1,
  fontFamily: FontFamily.medium,
  fontSize: FontSize.sm,
  color: Colors.text,
};
