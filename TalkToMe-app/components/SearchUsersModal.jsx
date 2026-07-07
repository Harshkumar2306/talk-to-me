import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, 
  StyleSheet, Modal, ActivityIndicator, Image
} from 'react-native';
import { Search, X, UserPlus } from 'lucide-react-native';
import axios from 'axios';
import { ChatState } from '../context/ChatProvider';
import { useRouter } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const SearchUsersModal = ({ visible, onClose }) => {
  const [search, setSearch] = useState('');
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  const { user, setSelectedChat, chats, setChats } = ChatState();
  const router = useRouter();

  const handleSearch = async () => {
    if (!search) return;
    try {
      setLoading(true);
      const { data } = await axios.get(`${BACKEND_URL}/api/user?search=${search}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setSearchResult(data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const accessChat = async (userId) => {
    try {
      setLoadingChat(true);
      const { data } = await axios.post(
        `${BACKEND_URL}/api/chat`,
        { userId },
        {
          headers: {
            'Content-type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (!chats.find((c) => c._id === data._id)) setChats([data, ...chats]);
      setSelectedChat(data);
      setLoadingChat(false);
      onClose();
      router.push(`/(app)/chats/${data._id}`);
    } catch (error) {
      console.error(error);
      setLoadingChat(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Search Users</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color="#94a3b8" size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBar}>
            <Search color="rgba(255,255,255,0.5)" size={18} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or email"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              autoFocus
            />
            {loading ? (
              <ActivityIndicator size="small" color="#8b5cf6" />
            ) : (
              <TouchableOpacity onPress={handleSearch} style={styles.searchActionBtn}>
                <Text style={styles.searchActionText}>Go</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={searchResult}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.userCard} onPress={() => accessChat(item._id)}>
                <Image source={{ uri: item.pic || 'https://www.gravatar.com/avatar/?d=mp' }} style={styles.avatar} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                </View>
                {loadingChat ? (
                  <ActivityIndicator size="small" color="#8b5cf6" />
                ) : (
                  <UserPlus color="#8b5cf6" size={20} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              !loading && searchResult.length === 0 && search.length > 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No users found</Text>
                </View>
              ) : null
            }
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
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    height: 44,
    fontSize: 14,
  },
  searchActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#5c67d6',
    borderRadius: 6,
    marginLeft: 8,
  },
  searchActionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    marginBottom: 8,
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
  emptyContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});

export default SearchUsersModal;
