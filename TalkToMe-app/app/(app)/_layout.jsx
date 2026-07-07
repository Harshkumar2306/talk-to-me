import { Stack } from 'expo-router';
import IncomingCallModal from '../../components/Call/IncomingCallModal';
import CallWindow from '../../components/Call/CallWindow';

export default function AppLayout() {
  return (
    <>
      <IncomingCallModal />
      <CallWindow />
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
    </>
  );
}
