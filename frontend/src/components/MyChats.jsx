import React, { useEffect, useState } from 'react';
import { ChatState } from '../Context/ChatProvider';
import { useTheme } from '../Context/ThemeProvider';
import axios from 'axios';
import { Plus, Users, Mic, Image, FileText } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import CreateGroupModal from './Group/CreateGroupModal';

const MyChats = () => {
  const [loggedUser, setLoggedUser] = useState();
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const { selectedChat, setSelectedChat, user, chats, setChats, notification } = ChatState();
  const { isDark } = useTheme();

  const fetchChats = async () => {
    try {
      const { data } = await axios.get('/api/chat', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setChats(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    setLoggedUser(JSON.parse(localStorage.getItem('userInfo')));
    fetchChats();
  }, [chats.length]);

  const getSender = (lu, users) =>
    users[0]?._id === lu?._id ? users[1]?.name : users[0]?.name;

  const getSenderPic = (lu, users) =>
    users[0]?._id === lu?._id ? users[1]?.pic : users[0]?.pic;

  const getLatestPreview = (chat) => {
    if (!chat || !chat.latestMessage) return { text: 'No messages yet' };
    const lm = chat.latestMessage;
    const sender = lm.sender?.name?.split(' ')[0] || 'Someone';
    if (lm.messageType === 'audio') return { text: `${sender}: 🎤 Voice note` };
    if (lm.messageType === 'image') return { text: `${sender}: 📷 Photo` };
    if (lm.messageType === 'file') return { text: `${sender}: 📎 ${lm.fileName || 'File'}` };
    return { text: `${sender}: ${lm.content || ''}` };
  };

  // Count unread notifications per chat
  const getUnreadCount = (chat) =>
    notification.filter((n) => n.chat?._id === chat._id).length;

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-[#1e293b]' : 'bg-white'}`}>
      {/* Header */}
      <div className={`p-4 border-b ${isDark ? 'border-white/10 bg-black/20' : 'border-black/10 bg-gray-50'} flex justify-between items-center`}>
        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Chats</h2>
        <button
          onClick={() => setShowCreateGroup(true)}
          className="p-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-white transition-colors flex items-center gap-1 text-xs font-medium"
        >
          <Plus size={14} /> Group
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {chats.length === 0 ? (
          <div className={`text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            <Users size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No chats yet. Search for someone!</p>
          </div>
        ) : (
          chats.map((chat) => {
            const isSelected = selectedChat?._id === chat._id;
            const preview = getLatestPreview(chat);
            const unreadCount = getUnreadCount(chat);
            return (
              <button
                key={chat._id}
                onClick={() => setSelectedChat(chat)}
                className={`w-full cursor-pointer px-3 py-3 rounded-xl flex items-center gap-3 transition-all duration-150 text-left border ${
                  isSelected
                    ? 'bg-brand-600 border-brand-500 shadow-lg shadow-brand-500/20'
                    : isDark
                      ? 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'
                      : 'bg-transparent border-transparent hover:bg-gray-50 hover:border-black/5'
                }`}
              >
                <div className="relative flex-shrink-0">
                  {!chat.isGroupChat ? (
                    <img
                      src={getSenderPic(loggedUser, chat.users) || 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg'}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Users className="text-white" size={18} />
                    </div>
                  )}
                  <div className={`absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 ${isSelected ? 'border-brand-600' : isDark ? 'border-[#1e293b]' : 'border-white'}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm truncate ${isSelected ? 'text-white' : isDark ? 'text-white' : 'text-gray-900'} ${unreadCount > 0 && !isSelected ? 'font-bold' : ''}`}>
                    {!chat.isGroupChat ? getSender(loggedUser, chat.users) : chat.chatName}
                  </h3>
                  <p className={`text-xs truncate mt-0.5 ${
                    isSelected ? 'text-brand-200'
                    : unreadCount > 0 ? isDark ? 'text-white font-medium' : 'text-gray-900 font-medium'
                    : isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {preview?.text}
                  </p>
                </div>

                {/* Unread Badge */}
                {unreadCount > 0 && !isSelected && (
                  <div className="flex-shrink-0 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default MyChats;
