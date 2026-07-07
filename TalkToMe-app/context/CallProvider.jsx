import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices, MediaStream } from 'react-native-webrtc';
import { ChatState } from './ChatProvider';

const CallContext = createContext(null);
const ENDPOINT = process.env.EXPO_PUBLIC_BACKEND_URL;

const getIceServers = () => {
  return {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };
};

const waitForIceGathering = (peer) => {
  return new Promise((resolve) => {
    if (peer.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      peer.onicegatheringstatechange = null;
      peer.onicecandidate = null;
      resolve();
    };

    peer.onicegatheringstatechange = () => {
      if (peer.iceGatheringState === 'complete') {
        done();
      }
    };

    peer.onicecandidate = (event) => {
      if (!event.candidate) {
        done();
      }
    };

    // 4 seconds fallback
    setTimeout(done, 4000);
  });
};

export const CallProvider = ({ children }) => {
  const { user } = ChatState();
  const [callState, setCallState] = useState({
    status: 'idle', // 'idle' | 'calling' | 'incoming' | 'connected' | 'connecting'
    callType: 'video',
    callerName: '',
    callerId: '',
    callerSignal: null,
    callWithId: '',
  });

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const socketRef = useRef(null);
  const peerRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const s = io(ENDPOINT);
    socketRef.current = s;

    s.on('connect', () => {
      s.emit('setup', user);
    });

    s.on('incoming-call', (data) => {
      setCallState({
        status: 'incoming',
        callType: data.type || 'video',
        callerName: data.name,
        callerId: data.from,
        callerSignal: data.signal,
        callWithId: data.from,
      });
    });

    s.on('call-accepted', async (signal) => {
      if (peerRef.current) {
        try {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
          setCallState((prev) => ({ ...prev, status: 'connected' }));
        } catch (err) {
          console.error('Error setting remote description inside call-accepted socket callback:', err);
        }
      }
    });

    s.on('call-ended', () => {
      performCleanup();
    });

    return () => {
      s.disconnect();
    };
  }, [user]);

  const getMedia = useCallback(async (type) => {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? {
          facingMode: 'user',
        } : false,
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('Media error:', err);
      return null;
    }
  }, []);

  const performCleanup = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);

    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }

    setCallState({
      status: 'idle',
      callType: 'video',
      callerName: '',
      callerId: '',
      callerSignal: null,
      callWithId: '',
    });
    setIsMuted(false);
    setIsVideoOff(false);
  }, [localStream]);

  const startCall = useCallback(async (userToCall, callUser, type = 'video') => {
    setCallState((prev) => ({
      ...prev,
      status: 'calling',
      callType: type,
      callWithId: userToCall,
    }));

    const stream = await getMedia(type);
    if (!stream) {
        performCleanup();
        return;
    }

    const peer = new RTCPeerConnection(getIceServers());
    peerRef.current = peer;

    stream.getTracks().forEach(track => {
      peer.addTrack(track, stream);
    });

    peer.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        const inboundStream = new MediaStream();
        inboundStream.addTrack(event.track);
        setRemoteStream(inboundStream);
      }
      setCallState((prev) => ({ ...prev, status: 'connected' }));
    };

    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      await waitForIceGathering(peer);

      socketRef.current?.emit('call-user', {
        userToCall,
        signalData: peer.localDescription,
        from: callUser._id,
        name: callUser.name,
        type,
      });
    } catch (err) {
      console.error('Error starting WebRTC call offer:', err);
      performCleanup();
    }
  }, [getMedia, performCleanup]);

  const answerCall = useCallback(async () => {
    const { callerSignal, callerId, callType } = callState;
    setCallState((prev) => ({ ...prev, status: 'connecting' }));

    const stream = await getMedia(callType);
    if (!stream) { performCleanup(); return; }

    const peer = new RTCPeerConnection(getIceServers());
    peerRef.current = peer;

    stream.getTracks().forEach(track => {
      peer.addTrack(track, stream);
    });

    peer.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        const inboundStream = new MediaStream();
        inboundStream.addTrack(event.track);
        setRemoteStream(inboundStream);
      }
      setCallState((prev) => ({ ...prev, status: 'connected' }));
    };

    try {
      await peer.setRemoteDescription(new RTCSessionDescription(callerSignal));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      await waitForIceGathering(peer);

      socketRef.current?.emit('answer-call', {
        to: callerId,
        signal: peer.localDescription,
      });

      setCallState((prev) => ({ ...prev, status: 'connected' }));
    } catch (err) {
      console.error('Error answering WebRTC call:', err);
      performCleanup();
    }
  }, [callState, getMedia, performCleanup]);

  const rejectCall = useCallback(() => {
    socketRef.current?.emit('end-call', { to: callState.callerId });
    performCleanup();
  }, [callState.callerId, performCleanup]);

  const endCall = useCallback(() => {
    const targetId = callState.callWithId || callState.callerId;
    if (targetId) {
      socketRef.current?.emit('end-call', { to: targetId });
    }
    performCleanup();
  }, [callState, performCleanup]);

  const toggleMute = useCallback(() => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsMuted((p) => !p);
      }
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const track = localStream.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsVideoOff((p) => !p);
      }
    }
  }, [localStream]);

  return (
    <CallContext.Provider
      value={{
        callState,
        localStream,
        remoteStream,
        isMuted,
        isVideoOff,
        startCall,
        answerCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const CallState = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('CallState must be used inside CallProvider');
  return ctx;
};
