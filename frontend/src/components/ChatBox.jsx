import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ChatState } from '../Context/ChatProvider';
import { CallState } from '../Context/CallProvider';
import { GroupCallState } from '../Context/GroupCallProvider';
import { useTheme } from '../Context/ThemeProvider';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react';
import {
  Smile, Paperclip, Mic, Send, Phone, Video, MoreVertical,
  Loader2, MessageSquare, X, Download, FileText, Image,
  StopCircle, Trash2, Copy, Reply, Check, CheckCheck, Users, ChevronLeft
} from 'lucide-react';
import axios from 'axios';
import io from 'socket.io-client';
import GroupInfoModal from './Group/GroupInfoModal';
import MessageToast from './MessageToast';

const ENDPOINT = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? '' : 'http://127.0.0.1:5001');
const CLOUDINARY_CLOUD = 'drnp7fcux';
const CLOUDINARY_PRESET = 'chat-app';
let socket, selectedChatCompare;

// ─── Helper: upload any file to Cloudinary ───
const uploadToCloudinary = async (file, resourceType = 'auto') => {
  const data = new FormData();
  data.append('file', file);
  data.append('upload_preset', CLOUDINARY_PRESET);
  data.append('cloud_name', CLOUDINARY_CLOUD);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`, {
    method: 'POST',
    body: data,
  });
  const json = await res.json();
  if (json.error) throw new Error(`Cloudinary: ${json.error.message}`);
  const url = json.secure_url || json.url;
  if (!url) throw new Error('Upload failed: no URL returned');
  return url;
};

// ─── Message Bubble ───
// ─── Tick Status Helper ───
// readBy is array of user objects (populated). We check if anyone OTHER than sender has read it.
const getTickStatus = (m, currentUserId) => {
  if (!m.readBy || m.readBy.length === 0) return 'sent';
  // If readBy contains only the sender (self), it's delivered but not seen
  const readByOthers = m.readBy.filter((u) => {
    const id = typeof u === 'object' ? u._id : u;
    return id !== currentUserId;
  });
  return readByOthers.length > 0 ? 'seen' : 'delivered';
};

const MessageBubble = ({ m, isMe, isDark, currentUserId }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const tickStatus = isMe ? getTickStatus(m, currentUserId) : null;

  const copyText = () => {
    navigator.clipboard.writeText(m.content);
    setMenuOpen(false);
  };

  const bubbleBase = isMe
    ? 'bg-brand-600 text-white rounded-tr-none'
    : isDark
      ? 'bg-[#1e293b] text-white rounded-tl-none border border-white/5'
      : 'bg-white text-gray-800 rounded-tl-none border border-black/10 shadow-sm';

  const renderContent = () => {
    if (m.messageType === 'image') {
      return (
        <div className="max-w-xs">
          <img
            src={m.fileUrl}
            alt="image"
            className="rounded-xl w-full object-cover cursor-pointer max-h-64"
            onClick={() => window.open(m.fileUrl, '_blank')}
          />
          {m.content && <p className="mt-2 text-sm">{m.content}</p>}
        </div>
      );
    }
    if (m.messageType === 'audio') {
      return (
        <div className="min-w-[200px]">
          <audio controls src={m.fileUrl} className="w-full h-10" />
        </div>
      );
    }
    if (m.messageType === 'file') {
      return (
        <a
          href={m.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 min-w-[180px] group"
        >
          <div className="p-2 bg-white/20 rounded-lg">
            <FileText size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{m.fileName || 'File'}</p>
            <p className="text-xs opacity-60">Tap to download</p>
          </div>
          <Download size={16} className="opacity-60 group-hover:opacity-100 transition-opacity" />
        </a>
      );
    }
    return <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`max-w-[70%] ${isMe ? 'self-end' : 'self-start'} group relative`}
    >
      {/* Sender name for group chats */}
      {!isMe && m.sender?.name && (
        <p className="text-xs text-brand-400 font-medium mb-1 ml-1">{m.sender.name}</p>
      )}

      <div className={`p-3 rounded-2xl ${bubbleBase} relative`}>
        {renderContent()}
      </div>

      {/* Time & ticks */}
      <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end mr-1' : 'ml-1'}`}>
        <span className="text-[10px] text-gray-500">
          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        {isMe && (
          <span className="flex">
            {tickStatus === 'sent' && (
              <Check size={12} className="text-gray-400" />
            )}
            {tickStatus === 'delivered' && (
              <CheckCheck size={12} className="text-gray-400" />
            )}
            {tickStatus === 'seen' && (
              <CheckCheck size={12} className="text-brand-400" />
            )}
          </span>
        )}
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`absolute z-20 ${isMe ? 'right-0' : 'left-0'} bottom-full mb-1 ${isDark ? 'bg-[#1e293b] border-white/10 text-white' : 'bg-white border-black/10 text-gray-800'} border rounded-xl shadow-xl p-1 min-w-[130px]`}
          >
            {m.messageType === 'text' && (
              <button onClick={copyText} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                <Copy size={14} /> Copy
              </button>
            )}
            <button onClick={() => setMenuOpen(false)} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
              <Reply size={14} /> Reply
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Long-press / right-click area */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className={`absolute top-1 ${isMe ? '-left-6' : '-right-6'} opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-400'}`}
      >
        <MoreVertical size={14} />
      </button>
    </motion.div>
  );
};

// ─── Audio Recorder ───
const AudioRecorder = ({ onSend, onCancel, isDark }) => {
  const [seconds, setSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        mediaRef.current = mr;
        chunksRef.current = [];
        mr.ondataavailable = (e) => chunksRef.current.push(e.data);
        mr.start();
        timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      } catch {
        alert('Microphone permission denied');
        onCancel();
      }
    };
    start();
    return () => {
      clearInterval(timerRef.current);
      if (mediaRef.current?.stream) {
        mediaRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleSend = async () => {
    if (!mediaRef.current) return;
    setIsProcessing(true);
    clearInterval(timerRef.current);
    mediaRef.current.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
      try {
        const url = await uploadToCloudinary(file, 'video');
        onSend(url);
      } catch {
        alert('Failed to upload voice note');
        onCancel();
      }
    };
    mediaRef.current.stream.getTracks().forEach((t) => t.stop());
    mediaRef.current.stop();
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={`flex items-center gap-3 px-4 py-2 rounded-2xl ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}
    >
      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
      <span className="text-red-400 font-mono text-sm font-bold">{fmt(seconds)}</span>
      <span className={`text-sm flex-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Recording...</span>
      <button onClick={onCancel} className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"><Trash2 size={16} /></button>
      {isProcessing
        ? <Loader2 size={20} className="animate-spin text-brand-400" />
        : <button onClick={handleSend} className="p-1.5 bg-brand-500 hover:bg-brand-400 rounded-lg transition-colors"><StopCircle size={16} className="text-white" /></button>}
    </motion.div>
  );
};

// ─── Main ChatBox ───
const ChatBox = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [dotMenuOpen, setDotMenuOpen] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [toasts, setToasts] = useState([]);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiRef = useRef(null);
  const { selectedChat, user, setChats, notification, setNotification, setSelectedChat, onlineUsers, setOnlineUsers } = ChatState();
  const { startCall, registerUser } = CallState();
  const { startGroupCall } = GroupCallState();
  const { isDark } = useTheme();

  useEffect(() => {
    if (user) registerUser(user);
  }, [user]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const getSender = (loggedUser, users) =>
    users[0]?._id === loggedUser?._id ? users[1] : users[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Dismiss toast helper
  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Socket init
  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit('setup', user);
    socket.on('connected', () => setSocketConnected(true));
    
    // Online presence tracking
    socket.on('online-users', (users) => setOnlineUsers(users));
    socket.on('user-online', (userId) => setOnlineUsers((prev) => [...new Set([...prev, userId])]));
    socket.on('user-offline', (userId) => setOnlineUsers((prev) => prev.filter(id => id !== userId)));

    socket.on('typing', () => setIsTyping(true));
    socket.on('stop typing', () => setIsTyping(false));
    return () => socket.disconnect();
  }, [user, setOnlineUsers]);

  // Message listener + real-time read receipts
  useEffect(() => {
    const msgHandler = (newMsg) => {
      setChats((prev) => {
        const idx = prev.findIndex((c) => c._id === newMsg.chat._id);
        if (idx > -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], latestMessage: newMsg };
          const moved = updated.splice(idx, 1)[0];
          updated.unshift(moved);
          return updated;
        }
        return prev;
      });
      if (!selectedChatCompare || selectedChatCompare._id !== newMsg.chat._id) {
        if (!notification.find((n) => n._id === newMsg._id)) {
          setNotification([newMsg, ...notification]);
        }
        // Show toast popup
        const toastId = newMsg._id + '_' + Date.now();
        setToasts((prev) => [
          ...prev,
          {
            id: toastId,
            senderName: newMsg.chat?.isGroupChat
              ? `${newMsg.sender?.name} in ${newMsg.chat?.chatName}`
              : newMsg.sender?.name,
            senderPic: newMsg.sender?.pic,
            content: newMsg.content,
            messageType: newMsg.messageType,
            fileName: newMsg.fileName,
            onClick: () => {
              setSelectedChat(newMsg.chat);
              setNotification((n) => n.filter((x) => x._id !== newMsg._id));
            },
          },
        ]);
        // Auto dismiss after 5s
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toastId)), 5000);
      } else {
        setMessages((prev) => [...prev, newMsg]);
        // mark as read since we're viewing this chat
        markReadAPI(newMsg.chat._id);
      }
    };

    // Real-time read receipt: someone read OUR messages
    const seenHandler = ({ chatId, seenBy }) => {
      if (selectedChatCompare?._id === chatId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.sender?._id === user._id && !m.readBy?.some((r) => (typeof r === 'object' ? r._id : r) === seenBy)) {
              return { ...m, readBy: [...(m.readBy || []), { _id: seenBy }] };
            }
            return m;
          })
        );
      }
    };

    socket.on('message recieved', msgHandler);
    socket.on('messages-seen', seenHandler);
    return () => {
      socket.off('message recieved', msgHandler);
      socket.off('messages-seen', seenHandler);
    };
  }, [notification]);

  // Mark messages as read via API + emit socket event to ALL senders
  const markReadAPI = async (chatId) => {
    try {
      const { data: updatedMessages } = await axios.put(`/api/message/read/${chatId}`, {}, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      // Notify every unique sender in real time so their ticks turn blue
      if (socket && chatId) {
        socket.emit('messages-seen', { chatId, seenBy: user._id, senderId: 'broadcast' });
      }
    } catch (e) {
      console.error('markRead failed', e);
    }
  };

  // Fetch messages + mark as read
  const fetchMessages = async () => {
    if (!selectedChat) return;
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/message/${selectedChat._id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setMessages(data);
      setLoading(false);
      socket.emit('join chat', selectedChat._id);
      // Mark all unread messages as read and notify senders
      await markReadAPI(selectedChat._id);
    } catch { setLoading(false); }
  };

  useEffect(() => {
    fetchMessages();
    selectedChatCompare = selectedChat;
    setShowEmoji(false);
    setIsRecording(false);
    
    // Clear notifications for the selected chat so the badge disappears
    if (selectedChat) {
      setNotification((prev) => prev.filter((n) => n.chat?._id !== selectedChat._id));
    }
  }, [selectedChat]);

  // Send text/file message
  const sendMessageAPI = async ({ content = '', messageType = 'text', fileUrl = null, fileName = null }) => {
    if (!content && !fileUrl) return;
    socket.emit('stop typing', selectedChat._id);
    try {
      const { data } = await axios.post(
        '/api/message',
        { content, chatId: selectedChat._id, messageType, fileUrl, fileName },
        { headers: { 'Content-type': 'application/json', Authorization: `Bearer ${user.token}` } }
      );
      socket.emit('new message', data);
      setMessages((prev) => [...prev, data]);
      setChats((prev) => {
        const idx = prev.findIndex((c) => c._id === selectedChat._id);
        if (idx > -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], latestMessage: data };
          const moved = updated.splice(idx, 1)[0];
          updated.unshift(moved);
          return updated;
        }
        return prev;
      });
    } catch (e) { console.error(e); }
  };

  const sendMessage = async (e) => {
    if ((e.key === 'Enter' || e.type === 'click') && newMessage.trim()) {
      const text = newMessage.trim();
      setNewMessage('');
      await sendMessageAPI({ content: text, messageType: 'text' });
    }
  };

  const typingHandler = (e) => {
    setNewMessage(e.target.value);
    if (!socketConnected) return;
    if (!typing) {
      setTyping(true);
      socket.emit('typing', selectedChat._id);
    }
    const lastTime = Date.now();
    setTimeout(() => {
      if (Date.now() - lastTime >= 3000 && typing) {
        socket.emit('stop typing', selectedChat._id);
        setTyping(false);
      }
    }, 3000);
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setUploadingFile(true);
    try {
      const isImage = file.type.startsWith('image/');
      const resourceType = isImage ? 'image' : 'raw';
      const url = await uploadToCloudinary(file, resourceType);
      await sendMessageAPI({
        content: '',
        messageType: isImage ? 'image' : 'file',
        fileUrl: url,
        fileName: file.name,
      });
    } catch { alert('File upload failed. Please try again.'); }
    finally { setUploadingFile(false); }
  };

  const handleVoiceSend = async (audioUrl) => {
    setIsRecording(false);
    await sendMessageAPI({ content: '', messageType: 'audio', fileUrl: audioUrl });
  };

  const sender = selectedChat && !selectedChat.isGroupChat
    ? getSender(user, selectedChat.users)
    : null;

  const bg = isDark ? 'bg-[#0a0f1d]' : 'bg-gray-100';
  const headerBg = isDark ? 'bg-[#1e293b]/90 border-white/10' : 'bg-white/90 border-black/10';
  const inputBg = isDark ? 'bg-[#1e293b] border-white/10' : 'bg-white border-black/10';
  const inputAreaBg = isDark ? 'bg-black/30 border-white/10' : 'bg-gray-50 border-black/10';

  if (!selectedChat) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center ${bg} relative overflow-hidden`}>
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '30px 30px' }}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center z-10"
        >
          <div className="w-28 h-28 mx-auto mb-6 relative">
            <div className="w-28 h-28 bg-brand-500/10 rounded-full flex items-center justify-center animate-pulse absolute inset-0" />
            <div className="w-28 h-28 bg-brand-500/20 rounded-full flex items-center justify-center relative">
              <MessageSquare size={48} className="text-brand-400" />
            </div>
          </div>
          <h2 className={`text-2xl font-semibold mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
            Select a conversation
          </h2>
          <p className={`text-sm max-w-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Search for someone to start chatting with them instantly.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col h-full ${bg} relative`}>
      {/* Dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      {/* ── Header ── */}
      <div className={`px-3 md:px-5 py-3 border-b ${headerBg} backdrop-blur-md flex justify-between items-center z-10 shadow-sm flex-shrink-0`}>
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          {/* Mobile back button */}
          <button
            className={`md:hidden p-1 rounded-lg ${isDark ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-gray-900 hover:bg-black/10'} transition-all flex items-center justify-center flex-shrink-0`}
            onClick={() => setSelectedChat(null)}
          >
            <ChevronLeft size={28} />
          </button>
          <div className="relative flex-shrink-0">
            {selectedChat.isGroupChat ? (
              <button
                onClick={() => setShowGroupInfo(true)}
                className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-purple-500 via-brand-500 to-pink-500 flex items-center justify-center border-2 border-brand-500/40 hover:border-brand-400 transition-colors"
              >
                <Users size={18} className="text-white" />
              </button>
            ) : (
              <>
                <img
                  src={sender?.pic || 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg'}
                  alt="Avatar"
                  className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover border-2 border-brand-500/40"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 bg-green-400 border-2 border-[#1e293b] rounded-full" />
              </>
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h2
              className={`font-bold text-sm md:text-base truncate ${isDark ? 'text-white' : 'text-gray-900'} ${selectedChat.isGroupChat ? 'cursor-pointer hover:text-brand-400 transition-colors' : ''}`}
              onClick={() => selectedChat.isGroupChat && setShowGroupInfo(true)}
            >
              {selectedChat.isGroupChat ? selectedChat.chatName : sender?.name}
            </h2>
            {isTyping ? (
              <p className="text-brand-400 text-xs font-medium animate-pulse flex items-center gap-1">
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                typing...
              </p>
            ) : (
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {selectedChat.isGroupChat
                  ? `${selectedChat.users?.length} members`
                  : onlineUsers.includes(getSender(user, selectedChat.users)?._id) ? (
                      <span className="flex items-center gap-1 text-green-500 font-medium">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        Online
                      </span>
                    ) : 'Offline'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!selectedChat.isGroupChat && (
            <>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => startCall(sender._id, user, 'audio')}
                className="p-2.5 text-brand-400 hover:text-white hover:bg-brand-500/20 rounded-xl transition-colors"
              >
                <Phone size={19} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => startCall(sender._id, user, 'video')}
                className="p-2.5 text-brand-400 hover:text-white hover:bg-brand-500/20 rounded-xl transition-colors"
              >
                <Video size={19} />
              </motion.button>
            </>
          )}

          {selectedChat.isGroupChat && (
            <>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => startGroupCall(selectedChat._id, selectedChat.chatName, 'audio', selectedChat.users)}
                className="p-2.5 text-brand-400 hover:text-white hover:bg-brand-500/20 rounded-xl transition-colors"
                title="Group Audio Call"
              >
                <Phone size={19} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => startGroupCall(selectedChat._id, selectedChat.chatName, 'video', selectedChat.users)}
                className="p-2.5 text-brand-400 hover:text-white hover:bg-brand-500/20 rounded-xl transition-colors"
                title="Group Video Call"
              >
                <Video size={19} />
              </motion.button>
            </>
          )}

          {/* 3-dot menu */}
          <div className="relative">
            <button
              onClick={() => setDotMenuOpen(!dotMenuOpen)}
              className={`p-2.5 ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-black/5'} rounded-xl transition-colors`}
            >
              <MoreVertical size={19} />
            </button>
            <AnimatePresence>
              {dotMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute right-0 top-12 w-48 ${isDark ? 'bg-[#1e293b] border-white/10 text-white' : 'bg-white border-black/10 text-gray-800'} border rounded-2xl shadow-2xl p-2 z-50`}
                >
                  {[
                    ...(selectedChat?.isGroupChat ? [{
                      label: 'Group Info',
                      icon: Users,
                      action: () => { setShowGroupInfo(true); setDotMenuOpen(false); }
                    }] : []),
                    { label: 'Clear Messages', icon: Trash2, action: () => { setMessages([]); setDotMenuOpen(false); } },
                    { label: 'Close Chat', icon: X, action: () => { setSelectedChat(null); setDotMenuOpen(false); } },
                  ].map(({ label, icon: Icon, action }) => (
                    <button key={label} onClick={action} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                      <Icon size={15} className="opacity-60" /> {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto p-5 z-10 flex flex-col gap-2" onClick={() => { setShowEmoji(false); setDotMenuOpen(false); }}>
        {loading ? (
          <div className="flex-1 flex justify-center items-center">
            <Loader2 className="animate-spin text-brand-500" size={36} />
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m._id}
              m={m}
              isMe={m.sender?._id === user._id}
              isDark={isDark}
              currentUserId={user._id}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      <div className={`p-4 ${inputBg} border-t z-10`}>
        <AnimatePresence>
          {isRecording && (
            <div className="mb-3">
              <AudioRecorder
                onSend={handleVoiceSend}
                onCancel={() => setIsRecording(false)}
                isDark={isDark}
              />
            </div>
          )}
        </AnimatePresence>

        {!isRecording && (
          <div className="flex items-end gap-2 relative">
            {/* Emoji Button */}
            <div className="relative" ref={emojiRef}>
              <button
                onClick={() => setShowEmoji(!showEmoji)}
                className={`p-2.5 rounded-xl transition-colors ${showEmoji ? 'text-brand-400 bg-brand-500/10' : isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-black/5'}`}
              >
                <Smile size={22} />
              </button>
              <AnimatePresence>
                {showEmoji && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-12 left-0 z-50"
                  >
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      theme={isDark ? 'dark' : 'light'}
                      searchDisabled={false}
                      height={340}
                      width={320}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* File Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className={`p-2.5 rounded-xl transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-black/5'}`}
            >
              {uploadingFile ? <Loader2 size={22} className="animate-spin text-brand-400" /> : <Paperclip size={22} />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,application/pdf,.doc,.docx,.txt,.zip"
              onChange={handleFileSelect}
            />

            {/* Text Input */}
            <div className={`flex-1 ${inputAreaBg} border rounded-2xl px-4 py-2.5 flex items-center min-h-[48px] transition-all focus-within:border-brand-500/50`}>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={typingHandler}
                onKeyDown={sendMessage}
                className={`w-full bg-transparent text-base ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'} focus:outline-none`}
              />
            </div>

            {/* Voice / Send */}
            {newMessage.trim() ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => sendMessage(e)}
                className="p-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-colors shadow-lg shadow-brand-500/30"
              >
                <Send size={20} />
              </motion.button>
            ) : (
              <button
                onClick={() => setIsRecording(true)}
                className={`p-2.5 rounded-xl transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-black/5'}`}
              >
                <Mic size={22} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Group Info Modal */}
      <AnimatePresence>
        {showGroupInfo && selectedChat?.isGroupChat && (
          <GroupInfoModal onClose={() => setShowGroupInfo(false)} />
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <MessageToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default ChatBox;
