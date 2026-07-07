import React, { useState } from 'react';
import { 
  Modal, View, Text, TextInput, TouchableOpacity, 
  StyleSheet, Image, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import { X, Camera, Save, LogOut, Edit2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { ChatState } from '../context/ChatProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

const SettingsModal = ({ visible, onClose }) => {
  const { user, setUser } = ChatState();
  const [name, setName] = useState(user?.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userInfo');
    setUser(null);
    onClose();
    router.replace('/');
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setLoading(true);
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
        const picUrl = cloudData.url.toString();
        
        // Update on backend
        const { data: updatedUser } = await axios.put(
          `${BACKEND_URL}/api/user/update-pic`,
          { pic: picUrl },
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
        
        const newUserInfo = { ...user, pic: updatedUser.pic };
        setUser(newUserInfo);
        await AsyncStorage.setItem('userInfo', JSON.stringify(newUserInfo));
      } catch (err) {
        console.error('Failed to upload image', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const saveName = async () => {
    if (!name.trim() || name === user.name) {
      setIsEditing(false);
      return;
    }
    setLoading(true);
    try {
      const { data: updatedUser } = await axios.put(
        `${BACKEND_URL}/api/user/update-name`,
        { name },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      const newUserInfo = { ...user, name: updatedUser.name };
      setUser(newUserInfo);
      await AsyncStorage.setItem('userInfo', JSON.stringify(newUserInfo));
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update name', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView 
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContainer}>
          {/* Top Purple Banner */}
          <View style={styles.topBanner}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color="#fff" size={16} />
            </TouchableOpacity>
          </View>
          
          {/* Bottom Dark Content */}
          <View style={styles.body}>
            {/* Avatar overlapping the boundary */}
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarContainer}>
                <Image 
                  source={{ uri: user?.pic || 'https://www.gravatar.com/avatar/?d=mp' }} 
                  style={styles.avatar} 
                />
                <TouchableOpacity style={styles.editAvatarBtn} onPress={pickImage}>
                  {loading ? <ActivityIndicator size="small" color="#fff" /> : <Camera color="#fff" size={14} />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.infoSection}>
              {isEditing ? (
                <View style={styles.editNameRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={name}
                    onChangeText={setName}
                    autoFocus
                  />
                  <TouchableOpacity onPress={saveName} style={styles.saveBtn}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{user?.name}</Text>
                  <TouchableOpacity onPress={() => setIsEditing(true)}>
                    <Edit2 color="rgba(255,255,255,0.5)" size={16} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                </View>
              )}
              
              <Text style={styles.userEmail}>{user?.email}</Text>

              <View style={styles.statusBox}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active now</Text>
              </View>

              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <LogOut color="#ef4444" size={16} />
                <Text style={styles.logoutText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: '#1f2937',
    borderRadius: 20,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    marginTop: 50,
  },
  topBanner: {
    height: 120,
    backgroundColor: '#7c3aed',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 6,
    borderRadius: 16,
  },
  body: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#1f2937',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  avatarWrapper: {
    alignItems: 'flex-start',
    marginTop: -50,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#1f2937',
    backgroundColor: '#111827',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#7c3aed',
    width: 32,
    height: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1f2937',
  },
  infoSection: {
    paddingTop: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameInput: {
    flex: 1,
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  saveBtn: {
    marginLeft: 8,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  userEmail: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textDecorationLine: 'underline',
    marginBottom: 24,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 10,
  },
  statusText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default SettingsModal;
