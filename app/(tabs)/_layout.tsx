import { useState } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { TabBar } from '@/components/navigation/TabBar';
import { AddExpenseSheet } from '@/components/sheets/AddExpenseSheet';
import { UndoToast } from '@/components/ui/UndoToast';
import { ErrorToast } from '@/components/ui/ErrorToast';

export default function TabsLayout() {
  const [addOpen, setAddOpen] = useState(false);
  const insets = useSafeAreaInsets();

  // On web our PhoneFrame already includes a mock status bar — no extra padding needed.
  const topPadding = Platform.OS === 'web' ? 0 : insets.top;

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
      <AddExpenseSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </View>
  );
}

const containerStyle: ViewStyle = {
  flex: 1,
  backgroundColor: Colors.bg,
};
