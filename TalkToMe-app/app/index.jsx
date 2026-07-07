import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Login from '../components/Authentication/Login';
import Signup from '../components/Authentication/Signup';

export default function AuthScreen() {
  const router = useRouter();
  const [tab, setTab] = useState('login');

  useEffect(() => {
    const checkUser = async () => {
      const user = await AsyncStorage.getItem('userInfo');
      if (user) {
        router.replace('/(app)/chats');
      }
    };
    checkUser();
  }, [router]);

  return (
    <LinearGradient
      colors={['#0f172a', '#1e1b4b', '#0f172a']} // Slate 900 -> Indigo 950 -> Slate 900
      style={styles.safeArea}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          style={styles.container} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            
            <View style={styles.branding}>
              <Text style={styles.logoText}>TalkTo<Text style={styles.logoHighlight}>Me</Text></Text>
              <Text style={styles.tagline}>Real-time chat and video calls</Text>
            </View>

            <View style={styles.authBox}>
              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tabButton, tab === 'login' && styles.activeTab]}
                  onPress={() => setTab('login')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, tab === 'login' && styles.activeTabText]}>Log In</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tabButton, tab === 'signup' && styles.activeTab]}
                  onPress={() => setTab('signup')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, tab === 'signup' && styles.activeTabText]}>Sign Up</Text>
                </TouchableOpacity>
              </View>

              {tab === 'login' ? <Login /> : <Signup />}
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a', // Slate 900
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  branding: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: -1,
  },
  logoHighlight: {
    color: '#a78bfa', // Purple 400
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
    fontSize: 16,
  },
  authBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.65)', // Slate 800 with high transparency for glassmorphism
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 999,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 999,
  },
  activeTab: {
    backgroundColor: '#7c3aed', // Purple 600
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
    fontSize: 14,
  },
  activeTabText: {
    color: '#ffffff',
  },
});
