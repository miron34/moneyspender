import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { PhoneFrame } from '@/components/ui/PhoneFrame';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useStore } from '@/store/useStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const dataLoaded = useStore((s) => s.loaded);
  const loadInitial = useStore((s) => s.loadInitial);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (fontsLoaded && dataLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, dataLoaded]);

  const isLoading = !fontsLoaded || !dataLoaded;

  return (
    <GestureHandlerRootView style={rootStyle}>
      <SafeAreaProvider>
        <PhoneFrame>
          {isLoading ? (
            <LoadingScreen />
          ) : (
            <View style={appShell}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: Colors.bg },
                }}>
                <Stack.Screen name="(tabs)" />
              </Stack>
            </View>
          )}
          <StatusBar style="light" />
        </PhoneFrame>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const rootStyle: ViewStyle = {
  flex: 1,
  backgroundColor: Colors.bg,
};

const appShell: ViewStyle = {
  flex: 1,
  backgroundColor: Colors.bg,
};
