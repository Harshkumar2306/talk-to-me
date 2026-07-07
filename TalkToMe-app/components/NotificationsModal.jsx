import React from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, 
  StyleSheet, Modal, Image, Dimensions
} from 'react-native';
import { X, MessageSquare } from 'lucide-react-native';
import { ChatState } from '../context/ChatProvider';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const NotificationsModal = ({ visible, onClose }) => {
  const { notification, setNotification, setSelectedChat } = ChatState();
  const router = useRouter();

  const handleNotificationClick = (notif) => {
    // Remove selected notification
    setNotification(notification.filter((n) => n._id !== notif._id));
    setSelectedChat(notif.chat);
    onClose();
    router.push(`/(app)/chats/${notif.chat._id}`);
  };

  const clearAll = () => {
    setNotification([]);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {notification.length > 0 && (
              <TouchableOpacity onPress={clearAll} style={styles.clearAllBtn}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color="#94a3b8" size={20} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={notification}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.notifCard} 
                onPress={() => handleNotificationClick(item)}
              >
                <Image 
                  source={{ uri: item.sender?.pic || 'https://www.gravatar.com/avatar/?d=mp' }} 
                  style={styles.avatar} 
                />
                <View style={styles.notifInfo}>
                  <Text style={styles.senderName} numberOfLines={1}>{item.sender?.name}</Text>
                  <Text style={styles.msgContent} numberOfLines={1}>
                    {item.messageType === 'audio' ? '🎤 Voice Note' : item.messageType === 'image' ? '📷 Photo' : item.content}
                  </Text>
                  <Text style={styles.chatSource} numberOfLines={1}>
                    in {item.chat?.isGroupChat ? item.chat.chatName : 'Direct Message'}
                  </Text>
                </View>
                <View style={styles.iconWrapper}>
                  <MessageSquare color="#5c67d6" size={16} />
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={(
              <View style={styles.emptyContainer}>
                <MessageSquare color="rgba(255,255,255,0.2)" size={48} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyText}>No new notifications</Text>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxHeight: '80%',
    backgroundColor: '#1f2937',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearAllBtn: {
    marginRight: 12,
  },
  clearAllText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
  },
  closeBtn: {
    padding: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#111827',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  notifInfo: {
    flex: 1,
  },
  senderName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  msgContent: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 2,
  },
  chatSource: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 1,
  },
  iconWrapper: {
    paddingLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});

export default NotificationsModal;
