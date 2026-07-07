import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, Animated, Image } from 'react-native';
import { CallState } from '../../context/CallProvider';
import { Phone, PhoneOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const IncomingCallModal = () => {
  const { callState, answerCall, rejectCall } = CallState();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (callState.status === 'incoming') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [callState.status]);

  if (callState.status !== 'incoming') return null;

  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.overlay}>
        <LinearGradient colors={['rgba(15, 23, 42, 0.95)', 'rgba(30, 27, 75, 0.98)']} style={styles.modalContainer}>
          
          <View style={styles.avatarContainer}>
            <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({ inputRange: [1, 1.3], outputRange: [0.5, 0] }) }]} />
            <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({ inputRange: [1, 1.3], outputRange: [0.8, 0] }), position: 'absolute', width: 140, height: 140, borderRadius: 70 }]} />
            
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {callState.callerName ? callState.callerName[0].toUpperCase() : 'U'}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>Incoming {callState.callType === 'video' ? 'Video' : 'Audio'} Call</Text>
          <Text style={styles.callerName}>{callState.callerName || 'Someone'}</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.rejectBtn]} onPress={rejectCall}>
              <PhoneOff color="#fff" size={28} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.acceptBtn]} onPress={answerCall}>
              <Phone color="#fff" size={28} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
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
    width: width,
    height: height,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    width: 200,
    height: 200,
  },
  pulseCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#8b5cf6',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#0f172a',
    zIndex: 10,
  },
  avatarText: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
  },
  title: {
    color: '#a78bfa',
    fontSize: 18,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '600',
  },
  callerName: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 80,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 60,
    width: '100%',
    justifyContent: 'center',
  },
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
  },
  acceptBtn: {
    backgroundColor: '#22c55e',
  },
});

export default IncomingCallModal;
