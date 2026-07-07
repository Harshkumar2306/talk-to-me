import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="chats/index" 
        options={{ 
          title: 'TalkToMe',
          headerStyle: { backgroundColor: '#1e293b' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' }
        }} 
      />
      <Stack.Screen 
        name="chats/[id]" 
        options={{ headerShown: false }} 
      />
    </Stack>
  );
}
