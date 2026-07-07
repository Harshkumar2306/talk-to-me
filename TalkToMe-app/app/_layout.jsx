import { Stack } from 'expo-router';
import ChatProvider from '../context/ChatProvider';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <ChatProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Auth Route */}
        <Stack.Screen name="index" />
        {/* Protected App Routes */}
        <Stack.Screen name="(app)" />
      </Stack>
    </ChatProvider>
  );
}
