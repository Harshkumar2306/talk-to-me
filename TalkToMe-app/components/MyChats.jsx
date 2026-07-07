import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Image, SafeAreaView } from 'react-native';
import axios from 'axios';
import { ChatState } from '../context/ChatProvider';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Users, MessageSquarePlus } from 'lucide-react-native';
import SearchUsersModal from './SearchUsersModal';
import CreateGroupModal from './CreateGroupModal';
import SettingsModal from './SettingsModal';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const MyChats = () => {
  const [loadingChats, setLoadingChats] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { user, chats, setChats, setSelectedChat } = ChatState();
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
          {chat.isGroupChat && (
            <View style={styles.groupBadge}>
              <Users size={12} color="#fff" />
            </View>
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
    <LinearGradient
      colors={['#0f172a', '#1e1b4b']}
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSearch(true)}>
              <Search color="#fff" size={22} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatarBtn} onPress={() => setShowSettings(true)}>
              <Image 
                source={{ uri: user?.pic || 'https://www.gravatar.com/avatar/?d=mp' }} 
                style={styles.headerAvatar} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {loadingChats ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
        ) : chats.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyIconCircle}>
              <Search color="rgba(167, 139, 250, 0.5)" size={48} />
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

        {/* FAB for new group */}
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => setShowCreateGroup(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#8b5cf6', '#6366f1']}
            style={styles.fabGradient}
          >
            <MessageSquarePlus color="#fff" size={24} />
          </LinearGradient>
        </TouchableOpacity>

        {showSearch && <SearchUsersModal visible={showSearch} onClose={() => setShowSearch(false)} />}
        {showCreateGroup && <CreateGroupModal visible={showCreateGroup} onClose={() => setShowCreateGroup(false)} />}
        {showSettings && <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#8b5cf6',
    overflow: 'hidden',
  },
  headerAvatar: {
    width: '100%',
    height: '100%',
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
    paddingBottom: 100,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  groupBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#8b5cf6',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1e293b',
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  latestMessage: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MyChats;
