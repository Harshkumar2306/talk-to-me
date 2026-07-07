import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';

const ENDPOINT = process.env.EXPO_PUBLIC_BACKEND_URL;

const ChatContext = createContext();

const ChatProvider = ({ children }) => {
  const [user, setUser] = useState();
  const [selectedChat, setSelectedChat] = useState();
  const [chats, setChats] = useState([]);
  const [notification, setNotification] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userInfoStr = await AsyncStorage.getItem('userInfo');
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          setUser(userInfo);
        } else {
          // If no user is logged in, redirect to the login screen
          router.replace('/');
        }
      } catch (error) {
        console.error('Error fetching user info from AsyncStorage', error);
        router.replace('/');
      }
    };

    fetchUser();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const socket = io(ENDPOINT);
    
    socket.emit('setup', user);

    socket.on('online-users', (users) => {
      setOnlineUsers(users);
    });

    socket.on('user-online', (userId) => {
      setOnlineUsers((prev) => {
        if (!prev.includes(userId)) return [...prev, userId];
        return prev;
      });
    });

    socket.on('user-offline', (userId) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return (
    <ChatContext.Provider
      value={{
        user,
        setUser,
        selectedChat,
        setSelectedChat,
        chats,
        setChats,
        notification,
        setNotification,
        onlineUsers,
        setOnlineUsers,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const ChatState = () => {
  return useContext(ChatContext);
};

export default ChatProvider;
