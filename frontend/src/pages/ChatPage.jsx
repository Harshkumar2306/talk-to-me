import React from 'react';
import { ChatState } from '../Context/ChatProvider';
import { useTheme } from '../Context/ThemeProvider';
import Sidebar from '../components/Sidebar';
import MyChats from '../components/MyChats';
import ChatBox from '../components/ChatBox';
import IncomingCallModal from '../components/Call/IncomingCallModal';
import CallWindow from '../components/Call/CallWindow';

const ChatPage = () => {
  const { user } = ChatState();
  const { isDark } = useTheme();

  return (
    <div
      className={`flex h-screen overflow-hidden w-full relative transition-colors duration-300 ${
        isDark ? 'bg-[#0f172a] text-white' : 'bg-gray-100 text-gray-900'
      }`}
    >
      <IncomingCallModal />
      <CallWindow />
      {user && <Sidebar />}

      <div className="flex flex-1 overflow-hidden">
        {user && (
          <div className={`w-1/3 min-w-[300px] max-w-[380px] border-r flex flex-col ${
            isDark ? 'border-white/10 bg-[#1e293b]' : 'border-black/10 bg-white'
          }`}>
            <MyChats />
          </div>
        )}

        {user && (
          <div className="flex-1 flex flex-col relative overflow-hidden">
            <ChatBox />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
