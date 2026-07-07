import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Image } from 'react-native';
import axios from 'axios';
import { ChatState } from '../context/ChatProvider';
import { useRouter } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const MyChats = () => {
  const [loadingChats, setLoadingChats] = useState(true);
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
        <Image
          source={{ uri: !chat.isGroupChat ? (getSenderPic(user, chat.users) || 'https://www.gravatar.com/avatar/?d=mp') : 'https://www.gravatar.com/avatar/?d=mp' }}
          style={styles.avatar}
        />
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

  if (loadingChats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {chats.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No chats yet. Search for someone!</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  latestMessage: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});

export default MyChats;
