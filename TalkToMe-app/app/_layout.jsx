import 'react-native-gesture-handler';
import { registerGlobals } from 'react-native-webrtc';
registerGlobals();

import { Stack } from 'expo-router';
import ChatProvider from '../context/ChatProvider';
import { CallProvider } from '../context/CallProvider';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <ChatProvider>
      <CallProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          {/* Auth Route */}
          <Stack.Screen name="index" />
          {/* Protected App Routes */}
          <Stack.Screen name="(app)" />
        </Stack>
      </CallProvider>
    </ChatProvider>
  );
}
