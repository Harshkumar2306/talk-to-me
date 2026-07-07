import React, { useState } from 'react';
import { 
  Modal, View, Text, TextInput, TouchableOpacity, 
  StyleSheet, Image, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Camera, Save, LogOut } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { ChatState } from '../context/ChatProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const SettingsModal = ({ visible, onClose }) => {
  const { user, setUser } = ChatState();
  const [name, setName] = useState(user?.name || '');
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
    if (!name.trim() || name === user.name) return;
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
    } catch (err) {
      console.error('Failed to update name', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView 
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          <LinearGradient colors={['#1e1b4b', '#0f172a']} style={styles.header}>
            <Text style={styles.headerTitle}>Profile Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color="#fff" size={24} />
            </TouchableOpacity>
          </LinearGradient>
          
          <View style={styles.body}>
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: user?.pic || 'https://www.gravatar.com/avatar/?d=mp' }} 
                style={styles.avatar} 
              />
              <TouchableOpacity style={styles.editAvatarBtn} onPress={pickImage}>
                <Camera color="#fff" size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                />
                <TouchableOpacity 
                  style={[styles.saveBtn, name === user?.name && styles.saveBtnDisabled]} 
                  onPress={saveName}
                  disabled={name === user?.name || loading}
                >
                  {loading ? <ActivityIndicator size="small" color="#fff" /> : <Save color="#fff" size={20} />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.infoGroup}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.infoText}>{user?.email}</Text>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut color="#ef4444" size={20} />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  body: {
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 32,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#8b5cf6',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#8b5cf6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0f172a',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 24,
  },
  label: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  saveBtn: {
    backgroundColor: '#8b5cf6',
    padding: 16,
    borderRadius: 12,
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: 'rgba(139, 92, 246, 0.5)',
  },
  infoGroup: {
    width: '100%',
    marginBottom: 40,
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default SettingsModal;
