import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, 
  StyleSheet, Modal, ActivityIndicator, Image, SafeAreaView
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import axios from 'axios';
import { ChatState } from '../context/ChatProvider';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const CreateGroupModal = ({ visible, onClose }) => {
  const [groupChatName, setGroupChatName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const { user, chats, setChats } = ChatState();

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

  const handleGroup = (userToAdd) => {
    if (selectedUsers.includes(userToAdd)) {
      alert('User already added');
      return;
    }
    setSelectedUsers([...selectedUsers, userToAdd]);
  };

  const handleDelete = (delUser) => {
    setSelectedUsers(selectedUsers.filter((sel) => sel._id !== delUser._id));
  };

  const handleSubmit = async () => {
    if (!groupChatName || !selectedUsers) {
      alert('Please fill all the fields');
      return;
    }
    if (selectedUsers.length < 2) {
      alert('More than 2 users are required to form a group chat');
      return;
    }

    try {
      setCreating(true);
      const { data } = await axios.post(
        `${BACKEND_URL}/api/chat/group`,
        {
          name: groupChatName,
          users: JSON.stringify(selectedUsers.map((u) => u._id)),
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );
      setChats([data, ...chats]);
      setCreating(false);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to Create the Chat!');
      setCreating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Group</Text>
          <TouchableOpacity onPress={handleSubmit} style={styles.createBtn} disabled={creating}>
            {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.createText}>Create</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Group Name</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g. Squad"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={groupChatName}
              onChangeText={setGroupChatName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Add Members</Text>
            <TextInput
              style={styles.input}
              placeholder="Search by name or email"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={search}
              onChangeText={handleSearch}
            />
          </View>

          {/* Selected Users Chips */}
          <View style={styles.selectedUsersContainer}>
            {selectedUsers.map((u) => (
              <TouchableOpacity key={u._id} style={styles.userChip} onPress={() => handleDelete(u)}>
                <Text style={styles.userChipText}>{u.name}</Text>
                <X color="#fff" size={14} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Search Results */}
          {loading ? (
            <ActivityIndicator size="small" color="#8b5cf6" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={searchResult.slice(0, 4)} // Show top 4 results
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => {
                const isSelected = selectedUsers.some((u) => u._id === item._id);
                return (
                  <TouchableOpacity 
                    style={[styles.userCard, isSelected && styles.userCardSelected]} 
                    onPress={() => (isSelected ? handleDelete(item) : handleGroup(item))}
                  >
                    <Image source={{ uri: item.pic || 'https://www.gravatar.com/avatar/?d=mp' }} style={styles.avatar} />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.name}</Text>
                      <Text style={styles.userEmail}>{item.email}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkCircle}>
                        <Check color="#fff" size={14} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              style={styles.list}
            />
          )}
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
  createBtn: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
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
  userCardSelected: {
    borderColor: '#8b5cf6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
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
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CreateGroupModal;
