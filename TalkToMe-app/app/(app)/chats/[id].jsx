import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, 
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Image, SafeAreaView, Animated
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Info, Video, Phone, Image as ImageIcon, Mic, Square, Send, Check, CheckCheck, Play, Pause } from 'lucide-react-native';
import axios from 'axios';
import io from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';
import EmojiPicker from 'rn-emoji-keyboard';
import { Smile } from 'lucide-react-native';
import { useAudioRecorder, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { ChatState } from '../../../context/ChatProvider';
import { CallState } from '../../../context/CallProvider';
import GroupInfoModal from '../../../components/GroupInfoModal';

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
  
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  
  // Emoji Picker State
  const [showEmoji, setShowEmoji] = useState(false);

  // Audio Recording States
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimer = useRef(null);

  const flatListRef = useRef(null);
  const { user, selectedChat, setSelectedChat, notification, setNotification, onlineUsers } = ChatState();
  const { startCall } = CallState();
  const router = useRouter();

  useEffect(() => {
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
    socket.on('message recieved', (newMsg) => {
      if (!selectedChat || selectedChat._id !== newMsg.chat._id) {
        if (!notification.some((n) => n._id === newMsg._id)) {
          setNotification([newMsg, ...notification]);
        }
      } else {
        setMessages((prev) => [...prev, newMsg]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [id]);

  const sendPayload = async (content, type = 'text', fileData = null) => {
    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/message`,
        { content, chatId: id, messageType: type, fileData },
        { headers: { 'Content-type': 'application/json', Authorization: `Bearer ${user.token}` } }
      );
      socket.emit('new message', data);
      setMessages((prev) => [...prev, data]);
    } catch (error) {
      console.error('Failed to send message', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    socket.emit('stop typing', selectedChat._id);
    const text = newMessage.trim();
    setNewMessage('');
    await sendPayload(text, 'text');
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setUploadingMedia(true);
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const data = new FormData();
      data.append('file', base64Img);
      data.append('upload_preset', 'talktome');
      data.append('cloud_name', 'dzcslxxyi');

      try {
        const res = await fetch('https://api.cloudinary.com/v1_1/dzcslxxyi/image/upload', {
          method: 'post',
          body: data,
        });
        const cloudData = await res.json();
        await sendPayload(cloudData.url.toString(), 'image');
      } catch (err) {
        console.error(err);
      } finally {
        setUploadingMedia(false);
      }
    }
  };

  const startRecording = async () => {
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    try {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
      await audioRecorder.stop();
      setIsRecording(false);
      setRecordingDuration(0);
      
      const uri = audioRecorder.uri;
      if (uri) {
        await sendPayload(uri, 'audio');
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
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

  const getChatUser = () => {
    if (!selectedChat) return null;
    if (selectedChat.isGroupChat) return null;
    return selectedChat.users[0]._id === user._id ? selectedChat.users[1] : selectedChat.users[0];
  };

  const chatUser = getChatUser();
  const chatName = selectedChat?.isGroupChat ? selectedChat.chatName : chatUser?.name;
  const chatAvatar = selectedChat?.isGroupChat 
    ? 'https://www.gravatar.com/avatar/?d=mp' 
    : (chatUser?.pic || 'https://www.gravatar.com/avatar/?d=mp');
  const isOnline = chatUser && onlineUsers?.includes(chatUser._id);

  const initiateCall = (type) => {
    if (selectedChat.isGroupChat) {
      alert("Group calling coming soon!");
      return;
    }
    startCall(chatUser._id, user, type);
  };

  const VoiceNotePlayer = ({ uri, isMe }) => {
    const player = useAudioPlayer({ uri });
    const status = useAudioPlayerStatus(player);
    const pulseAnim = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
      if (status.playing) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 0.5, duration: 400, useNativeDriver: true }),
          ])
        ).start();
      } else {
        pulseAnim.stopAnimation();
        pulseAnim.setValue(0.5);
      }
    }, [status.playing]);

    const handlePlayPause = () => {
      if (status.playing) {
        player.pause();
      } else {
        if (status.currentTime >= status.duration) {
          player.seekTo(0);
        }
        player.play();
      }
    };

    const formatProgress = (ms) => {
      if (!ms) return '0:00';
      const seconds = Math.floor(ms / 1000);
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
      <View style={styles.audioMsg}>
        <TouchableOpacity onPress={handlePlayPause} style={styles.playBtn}>
          {status.playing ? (
            <Pause color={isMe ? '#fff' : '#a78bfa'} size={20} />
          ) : (
            <Play color={isMe ? '#fff' : '#a78bfa'} size={20} />
          )}
        </TouchableOpacity>
        <View style={styles.audioProgressGroup}>
          <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText, { fontWeight: 'bold' }]}>
            Voice Note
          </Text>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            {status.playing && (
              <Animated.View style={[styles.playingDot, { transform: [{ scale: pulseAnim }], backgroundColor: isMe ? '#fff' : '#a78bfa' }]} />
            )}
            <Text style={[styles.audioProgressText, { color: isMe ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)' }]}>
              {formatProgress(status.currentTime)} / {formatProgress(status.duration)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderMessage = ({ item: m }) => {
    const isMe = m.sender?._id === user._id;
    return (
      <View style={[styles.messageWrapper, isMe ? styles.myMessage : styles.theirMessage]}>
        {!isMe && (
          <Text style={styles.senderName}>{m.sender?.name}</Text>
        )}
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
          {m.messageType === 'image' ? (
            <Image source={{ uri: m.content }} style={styles.messageImage} />
          ) : m.messageType === 'audio' ? (
            <VoiceNotePlayer uri={m.content} isMe={isMe} />
          ) : (
            <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
              {m.content}
            </Text>
          )}
        </View>
        <View style={[styles.timeRow, isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
          <Text style={styles.timeText}>
            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {isMe && (
            <View style={styles.readReceipt}>
              <CheckCheck size={14} color="#5c67d6" />
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Custom Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
            <ChevronLeft color="#fff" size={28} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: chatAvatar }} style={styles.headerAvatar} />
              {/* Online indicator dot */}
              {!selectedChat?.isGroupChat && (
                <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#10b981' : '#ef4444' }]} />
              )}
            </View>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle} numberOfLines={1}>{chatName}</Text>
              <Text style={styles.headerSubtitle}>
                {selectedChat?.isGroupChat ? `${selectedChat.users.length} members` : (isOnline ? 'Online' : 'Offline')}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => initiateCall('audio')} style={styles.headerIcon}>
              <Phone color="#8b5cf6" size={20} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => initiateCall('video')} style={styles.headerIcon}>
              <Video color="#8b5cf6" size={22} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowGroupInfo(true)} style={styles.headerIcon}>
              <Text style={{ color: '#8b5cf6', fontSize: 24, paddingBottom: 8 }}>⋮</Text>
            </TouchableOpacity>
          </View>
        </View>

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
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {isTyping && <Text style={styles.typingText}>typing...</Text>}
        {uploadingMedia && <ActivityIndicator size="small" color="#8b5cf6" style={{ alignSelf: 'flex-start', marginLeft: 16 }} />}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          {isRecording ? (
            <View style={styles.recordingUI}>
              <View style={styles.pulsingDot} />
              <Text style={styles.recordingTime}>
                {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </Text>
              <Text style={styles.recordingText}>Slide to cancel {'<'}</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity onPress={() => setShowEmoji(true)} style={styles.attachBtn}>
                <Smile color="rgba(255,255,255,0.6)" size={24} />
              </TouchableOpacity>
              <TouchableOpacity onPress={pickImage} style={styles.attachBtn}>
                <ImageIcon color="rgba(255,255,255,0.6)" size={24} />
              </TouchableOpacity>
              
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={newMessage}
                  onChangeText={typingHandler}
                  placeholder="Type a message..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  multiline
                />
              </View>
            </>
          )}

          {newMessage.trim() && !isRecording ? (
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Send color="#fff" size={18} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.recordButton, isRecording && styles.recordingActive]} 
              onPressIn={startRecording} 
              onPressOut={stopRecording}
            >
              {isRecording ? <Square color="#fff" size={18} /> : <Mic color="rgba(255,255,255,0.6)" size={24} />}
            </TouchableOpacity>
          )}
        </View>

        <EmojiPicker 
          onEmojiSelected={(emoji) => setNewMessage(prev => prev + emoji.emoji)}
          open={showEmoji}
          onClose={() => setShowEmoji(false)}
          theme={{
            backdrop: 'rgba(0,0,0,0.6)',
            knob: '#8b5cf6',
            container: '#0f172a',
            header: '#fff',
            skinTonesContainer: '#1e293b',
            category: {
              icon: '#a78bfa',
              iconActive: '#fff',
              container: '#1e293b',
              containerActive: '#8b5cf6'
            }
          }}
        />

        {showGroupInfo && (
          <GroupInfoModal 
            visible={showGroupInfo} 
            onClose={() => setShowGroupInfo(false)} 
            fetchMessages={fetchMessages} 
          />
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerIcon: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#1f2937',
  },
  headerTextGroup: {
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
    maxWidth: '85%',
    marginBottom: 20,
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
    fontSize: 13,
    color: '#7c3aed',
    marginBottom: 4,
    marginLeft: 4,
    fontWeight: '600',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
  },
  myBubble: {
    backgroundColor: '#5c67d6',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#1f2937',
    borderBottomLeftRadius: 4,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  audioMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  audioProgressGroup: {
    flexDirection: 'column',
  },
  audioProgressText: {
    fontSize: 11,
    marginTop: 2,
  },
  playingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    marginTop: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myText: {
    color: '#fff',
  },
  theirText: {
    color: '#f8fafc',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    width: '100%',
  },
  timeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  readReceipt: {
    marginLeft: 4,
  },
  typingText: {
    color: '#a78bfa',
    fontSize: 13,
    paddingHorizontal: 20,
    paddingBottom: 8,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#1f2937',
    alignItems: 'center',
  },
  attachBtn: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 24,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    justifyContent: 'center',
  },
  input: {
    color: '#fff',
    paddingTop: 12,
    paddingBottom: 12,
    maxHeight: 120,
    minHeight: 44,
    fontSize: 15,
  },
  sendButton: {
    marginLeft: 4,
    width: 44,
    height: 44,
    backgroundColor: '#5c67d6',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    marginLeft: 4,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingActive: {
    backgroundColor: '#ef4444',
  },
  recordingUI: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 24,
    height: 44,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    marginRight: 10,
  },
  recordingTime: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
  },
  recordingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});
