import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { CallState } from '../../context/CallProvider';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const CallWindow = () => {
  const { 
    callState, localStream, remoteStream, 
    endCall, toggleMute, toggleVideo, 
    isMuted, isVideoOff 
  } = CallState();

  if (callState.status === 'idle' || callState.status === 'incoming') return null;

  return (
    <Modal visible={true} transparent animationType="slide">
      <View style={styles.container}>
        
        {/* Remote Video (Full Screen) */}
        {remoteStream && callState.callType === 'video' ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
          />
        ) : (
          <View style={styles.audioOnlyContainer}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {callState.callerName ? callState.callerName[0].toUpperCase() : 'U'}
              </Text>
            </View>
            <Text style={styles.callerName}>{callState.callerName || 'Unknown User'}</Text>
            <Text style={styles.statusText}>
              {callState.status === 'calling' ? 'Calling...' : '00:00'}
            </Text>
          </View>
        )}

        {/* Local Video (Picture in Picture) */}
        {localStream && !isVideoOff && callState.callType === 'video' && (
          <View style={styles.localVideoContainer}>
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.localVideo}
              objectFit="cover"
            />
          </View>
        )}

        {/* Controls Overlay */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={[styles.controlBtn, isMuted && styles.controlBtnActive]} onPress={toggleMute}>
            {isMuted ? <MicOff color="#fff" size={24} /> : <Mic color="#fff" size={24} />}
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
            <PhoneOff color="#fff" size={28} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.controlBtn, isVideoOff && styles.controlBtnActive]} onPress={toggleVideo}>
            {isVideoOff ? <VideoOff color="#fff" size={24} /> : <Video color="#fff" size={24} />}
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  audioOnlyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  avatarText: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
  },
  callerName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: width * 0.28,
    height: (width * 0.28) * 1.5,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  localVideo: {
    flex: 1,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 40,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnActive: {
    backgroundColor: '#ef4444',
  },
  endCallBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CallWindow;
