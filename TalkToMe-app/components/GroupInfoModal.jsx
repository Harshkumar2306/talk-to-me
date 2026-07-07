import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, 
  StyleSheet, Modal, ActivityIndicator, Image, SafeAreaView
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import axios from 'axios';
import { ChatState } from '../context/ChatProvider';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const GroupInfoModal = ({ visible, onClose, fetchMessages, fetchChats }) => {
  const [groupChatName, setGroupChatName] = useState('');
  const [search, setSearch] = useState('');
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [renamerenaming, setRenamerenaming] = useState(false);

  const { selectedChat, setSelectedChat, user } = ChatState();

  const handleRemove = async (user1) => {
    if (selectedChat.groupAdmin._id !== user._id && user1._id !== user._id) {
      alert('Only admins can remove someone!');
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.put(
        `${BACKEND_URL}/api/chat/groupremove`,
        {
          chatId: selectedChat._id,
          userId: user1._id,
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );

      user1._id === user._id ? setSelectedChat(null) : setSelectedChat(data);
      if (fetchMessages) fetchMessages();
      if (fetchChats) fetchChats();
      setLoading(false);
      if (user1._id === user._id) onClose();
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleAddUser = async (user1) => {
    if (selectedChat.users.find((u) => u._id === user1._id)) {
      alert('User already in group!');
      return;
    }

    if (selectedChat.groupAdmin._id !== user._id) {
      alert('Only admins can add someone!');
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.put(
        `${BACKEND_URL}/api/chat/groupadd`,
        {
          chatId: selectedChat._id,
          userId: user1._id,
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );

      setSelectedChat(data);
      if (fetchChats) fetchChats();
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!groupChatName) return;

    try {
      setRenamerenaming(true);
      const { data } = await axios.put(
        `${BACKEND_URL}/api/chat/rename`,
        {
          chatId: selectedChat._id,
          chatName: groupChatName,
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );

      setSelectedChat(data);
      if (fetchChats) fetchChats();
      setRenamerenaming(false);
    } catch (error) {
      console.error(error);
      setRenamerenaming(false);
    }
    setGroupChatName('');
  };

  const handleSearch = async (query) => {
    setSearch(query);
    if (!query) {
      setSearchResult([]);
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.get(`${BACKEND_URL}/api/user?search=${query}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setSearchResult(data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  if (!selectedChat) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedChat.chatName}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.selectedUsersContainer}>
            {selectedChat.users.map((u) => (
              <TouchableOpacity key={u._id} style={styles.userChip} onPress={() => handleRemove(u)}>
                <Text style={styles.userChipText}>{u.name}</Text>
                <X color="#fff" size={14} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Rename Group</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholder="New Group Name"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={groupChatName}
                onChangeText={setGroupChatName}
              />
              <TouchableOpacity style={styles.updateBtn} onPress={handleRename} disabled={renamerenaming}>
                {renamerenaming ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.createText}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Add User to group</Text>
            <TextInput
              style={styles.input}
              placeholder="Search users..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={search}
              onChangeText={handleSearch}
            />
          </View>

          {/* Search Results */}
          {loading ? (
            <ActivityIndicator size="small" color="#8b5cf6" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={searchResult.slice(0, 4)} 
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.userCard} 
                  onPress={() => handleAddUser(item)}
                >
                  <Image source={{ uri: item.pic || 'https://www.gravatar.com/avatar/?d=mp' }} style={styles.avatar} />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                  </View>
                </TouchableOpacity>
              )}
              style={styles.list}
            />
          )}

          <TouchableOpacity style={styles.leaveBtn} onPress={() => handleRemove(user)}>
            <Text style={styles.leaveBtnText}>Leave Group</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 8,
  },
  closeText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  updateBtn: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
  },
  createText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    padding: 20,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  selectedUsersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 8,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  userChipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  leaveBtn: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 40,
  },
  leaveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default GroupInfoModal;
