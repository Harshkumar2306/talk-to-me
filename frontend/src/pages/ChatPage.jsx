import React, { useState } from 'react';
import { ChatState } from '../Context/ChatProvider';
import { useTheme } from '../Context/ThemeProvider';
import Sidebar from '../components/Sidebar';
import MyChats from '../components/MyChats';
import ChatBox from '../components/ChatBox';
import IncomingCallModal from '../components/Call/IncomingCallModal';
import CallWindow from '../components/Call/CallWindow';

const ChatPage = () => {
  const { user, selectedChat } = ChatState();
  const { isDark } = useTheme();

  return (
    <div
      className={`flex h-screen h-[100dvh] overflow-hidden w-full relative transition-colors duration-300 ${
        isDark ? 'bg-[#0f172a] text-white' : 'bg-gray-100 text-gray-900'
      }`}
    >
      <IncomingCallModal />
      <CallWindow />
      {user && <Sidebar />}

      {/* pb-16 md:pb-0 clears the mobile bottom nav bar */}
      <div className="flex flex-1 overflow-hidden pb-16 md:pb-0">
        {user && (
          <div
            className={`
              flex flex-col border-r
              ${isDark ? 'border-white/10 bg-[#1e293b]' : 'border-black/10 bg-white'}
              ${selectedChat
                ? 'hidden md:flex md:w-1/3 md:min-w-[280px] md:max-w-[380px]'
                : 'flex w-full md:w-1/3 md:min-w-[280px] md:max-w-[380px]'
              }
            `}
          >
            <MyChats />
          </div>
        )}

        {user && (
          <div
            className={`
              flex-col relative overflow-hidden
              ${selectedChat ? 'flex flex-1' : 'hidden md:flex md:flex-1'}
            `}
          >
            <ChatBox />
          </div>
        )}
      </div>
    </div>

  );
};

export default ChatPage;
