import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, 
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import axios from 'axios';
import io from 'socket.io-client';
import { ChatState } from '../../../context/ChatProvider';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
let socket;

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typing, setTyping] = useState(false);

  const flatListRef = useRef(null);
  const { user, selectedChat, setSelectedChat } = ChatState();
  const router = useRouter();

  useEffect(() => {
    // If arriving directly via URL, we might not have selectedChat set.
    // In a full implementation, we'd fetch the chat details.
    if (!selectedChat) {
      router.replace('/(app)/chats');
    }
  }, [selectedChat]);

  const fetchMessages = async () => {
    if (!selectedChat) return;
    try {
      setLoading(true);
      const { data } = await axios.get(`${BACKEND_URL}/api/message/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setMessages(data);
      setLoading(false);
      socket.emit('join chat', id);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    socket = io(BACKEND_URL);
    socket.emit('setup', user);
    socket.on('connected', () => setSocketConnected(true));
    socket.on('typing', () => setIsTyping(true));
    socket.on('stop typing', () => setIsTyping(false));

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [id]);

  useEffect(() => {
    const msgHandler = (newMsg) => {
      if (!selectedChat || selectedChat._id !== newMsg.chat._id) {
        // Notification logic would go here
      } else {
        setMessages((prev) => [...prev, newMsg]);
      }
    };
    socket.on('message recieved', msgHandler);
    return () => socket.off('message recieved', msgHandler);
  }, [selectedChat]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    socket.emit('stop typing', selectedChat._id);
    const text = newMessage.trim();
    setNewMessage('');
    
    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/message`,
        { content: text, chatId: id, messageType: 'text' },
        { headers: { 'Content-type': 'application/json', Authorization: `Bearer ${user.token}` } }
      );
      
      socket.emit('new message', data);
      setMessages((prev) => [...prev, data]);
    } catch (error) {
      console.error('Failed to send message', error);
    }
  };

  const typingHandler = (text) => {
    setNewMessage(text);
    if (!socketConnected) return;
    if (!typing) {
      setTyping(true);
      socket.emit('typing', selectedChat._id);
    }
    let lastTime = Date.now();
    setTimeout(() => {
      if (Date.now() - lastTime >= 3000 && typing) {
        socket.emit('stop typing', selectedChat._id);
        setTyping(false);
      }
    }, 3000);
  };

  const renderMessage = ({ item: m }) => {
    const isMe = m.sender?._id === user._id;
    return (
      <View style={[styles.messageWrapper, isMe ? styles.myMessage : styles.theirMessage]}>
        {!isMe && selectedChat?.isGroupChat && (
          <Text style={styles.senderName}>{m.sender?.name}</Text>
        )}
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
            {m.content}
          </Text>
        </View>
        <Text style={styles.timeText}>
          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  const chatName = selectedChat?.isGroupChat 
    ? selectedChat.chatName 
    : (selectedChat?.users[0]._id === user._id ? selectedChat?.users[1].name : selectedChat?.users[0].name);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen 
        options={{ 
          title: chatName || 'Chat',
          headerBackTitle: 'Back'
        }} 
      />
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item._id || index.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {isTyping && <Text style={styles.typingText}>typing...</Text>}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={typingHandler}
          placeholder="Type a message..."
          placeholderTextColor="rgba(255,255,255,0.5)"
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

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
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  messageWrapper: {
    maxWidth: '75%',
    marginBottom: 12,
  },
  myMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#a78bfa',
    marginBottom: 2,
    marginLeft: 4,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: '#8b5cf6',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
  },
  myText: {
    color: '#fff',
  },
  theirText: {
    color: '#fff',
  },
  timeText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  typingText: {
    color: '#a78bfa',
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    marginLeft: 12,
    marginBottom: 4,
    backgroundColor: '#8b5cf6',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: {
    color: '#fff',
    fontWeight: '600',
  },
});
