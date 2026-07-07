import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Image, SafeAreaView } from 'react-native';
import axios from 'axios';
import { ChatState } from '../context/ChatProvider';
import { useRouter } from 'expo-router';
import { Search, Users, MessageSquare, Plus, Bell, Settings } from 'lucide-react-native';
import SearchUsersModal from './SearchUsersModal';
import CreateGroupModal from './CreateGroupModal';
import SettingsModal from './SettingsModal';
import NotificationsModal from './NotificationsModal';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const MyChats = () => {
  const [loadingChats, setLoadingChats] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const { user, chats, setChats, setSelectedChat, notification, onlineUsers } = ChatState();
  const router = useRouter();

  const fetchChats = async () => {
    try {
      setLoadingChats(true);
      const { data } = await axios.get(`${BACKEND_URL}/api/chat`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setChats(data);
      setLoadingChats(false);
    } catch (error) {
      console.error('Error fetching chats:', error);
      setLoadingChats(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  const getSender = (lu, users) =>
    users[0]?._id === lu?._id ? users[1]?.name : users[0]?.name;

  const getSenderPic = (lu, users) =>
    users[0]?._id === lu?._id ? users[1]?.pic : users[0]?.pic;

  const getLatestPreview = (chat) => {
    if (!chat || !chat.latestMessage) return 'No messages yet';
    const lm = chat.latestMessage;
    const sender = lm.sender?.name?.split(' ')[0] || 'Someone';
    if (lm.messageType === 'audio') return `${sender}: 🎤 Voice note`;
    if (lm.messageType === 'image') return `${sender}: 📷 Photo`;
    if (lm.messageType === 'file') return `${sender}: 📎 ${lm.fileName || 'File'}`;
    return `${sender}: ${lm.content || ''}`;
  };

  const handleChatPress = (chat) => {
    setSelectedChat(chat);
    router.push(`/(app)/chats/${chat._id}`);
  };

  const renderItem = ({ item: chat }) => {
    const isGroup = chat.isGroupChat;
    const chatUser = !isGroup ? (chat.users[0]?._id === user?._id ? chat.users[1] : chat.users[0]) : null;
    const isOnline = chatUser && onlineUsers?.includes(chatUser._id);

    return (
      <TouchableOpacity 
        style={styles.chatItem} 
        onPress={() => handleChatPress(chat)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: !chat.isGroupChat ? (getSenderPic(user, chat.users) || 'https://www.gravatar.com/avatar/?d=mp') : 'https://www.gravatar.com/avatar/?d=mp' }}
            style={styles.avatar}
          />
          {!isGroup && (
            <View style={[styles.groupBadge, { backgroundColor: isOnline ? '#10b981' : '#ef4444' }]} />
          )}
        </View>
        <View style={styles.chatInfo}>
          <Text style={styles.chatName} numberOfLines={1}>
            {!chat.isGroupChat ? getSender(user, chat.users) : chat.chatName}
          </Text>
          <Text style={styles.latestMessage} numberOfLines={1}>
            {getLatestPreview(chat)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIconBg}>
            <MessageSquare color="#a78bfa" size={20} />
          </View>
          <Text style={styles.headerTitle}>TalkToMe</Text>
        </View>
        <TouchableOpacity style={styles.groupBtn} onPress={() => setShowCreateGroup(true)}>
          <Plus color="#fff" size={16} />
          <Text style={styles.groupBtnText}>Group</Text>
        </TouchableOpacity>
      </View>

      {loadingChats ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#5c67d6" />
        </View>
      ) : chats.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconCircle}>
            <Search color="rgba(92, 103, 214, 0.5)" size={48} />
          </View>
          <Text style={styles.emptyText}>No conversations yet.</Text>
          <Text style={styles.emptySubtext}>Tap the search icon to find people!</Text>
          <TouchableOpacity style={styles.startChatBtn} onPress={() => setShowSearch(true)}>
            <Text style={styles.startChatText}>Start a Chat</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setShowSettings(true)}>
          <View style={styles.navAvatarBorder}>
            <Image 
              source={{ uri: user?.pic || 'https://www.gravatar.com/avatar/?d=mp' }} 
              style={styles.navAvatar} 
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setShowSearch(true)}>
          <Search color="rgba(255,255,255,0.6)" size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setShowNotifications(true)}>
          <View style={{ position: 'relative' }}>
            <Bell color="rgba(255,255,255,0.6)" size={24} />
            {notification.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notification.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setShowSettings(true)}>
          <Settings color="rgba(255,255,255,0.6)" size={24} />
        </TouchableOpacity>
      </View>

      {showSearch && <SearchUsersModal visible={showSearch} onClose={() => setShowSearch(false)} />}
      {showCreateGroup && <CreateGroupModal visible={showCreateGroup} onClose={() => setShowCreateGroup(false)} />}
      {showSettings && <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />}
      {showNotifications && <NotificationsModal visible={showNotifications} onClose={() => setShowNotifications(false)} />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIconBg: {
    backgroundColor: 'rgba(92, 103, 214, 0.2)',
    padding: 8,
    borderRadius: 8,
    marginRight: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  groupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5c67d6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  groupBtnText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
  },
  startChatBtn: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
  },
  startChatText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.02)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  groupBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#ef4444', // Red status dot to match screenshot
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#1f2937',
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  latestMessage: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 20, // for safe area
  },
  navItem: {
    padding: 10,
  },
  navAvatarBorder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#5c67d6',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
});

export default MyChats;
