import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import { CallState } from '../../context/CallProvider';
import { Phone, PhoneOff } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const IncomingCallModal = () => {
  const { callState, answerCall, rejectCall } = CallState();

  if (callState.status !== 'incoming') return null;

  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Incoming {callState.callType === 'video' ? 'Video' : 'Audio'} Call</Text>
          <Text style={styles.callerName}>{callState.callerName || 'Someone'}</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.rejectBtn]} onPress={rejectCall}>
              <PhoneOff color="#fff" size={24} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.acceptBtn]} onPress={answerCall}>
              <Phone color="#fff" size={24} />
            </TouchableOpacity>
          </View>
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
    width: width * 0.8,
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    color: '#a78bfa',
    fontSize: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  callerName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 40,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
  },
  acceptBtn: {
    backgroundColor: '#22c55e',
  },
});

export default IncomingCallModal;
