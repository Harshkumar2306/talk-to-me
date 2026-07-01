import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { ChatState } from './ChatProvider';

const CallContext = createContext(null);
const ENDPOINT = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? '' : 'http://127.0.0.1:5001');

const getIceServers = () => {
  const servers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  
  const envUrl = import.meta.env.VITE_TURN_URL;
  const username = import.meta.env.VITE_TURN_USERNAME;
  const credential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (envUrl && username && credential) {
    const match = envUrl.match(/(?:turn|turns):([^:]+)/);
    const domain = match ? match[1] : envUrl.replace(/turns?:/, '').split(':')[0];
    
    servers.push({ urls: `stun:${domain}:80` });
    servers.push({ urls: `turn:${domain}:80`, username, credential });
    servers.push({ urls: `turn:${domain}:80?transport=tcp`, username, credential });
    servers.push({ urls: `turn:${domain}:443`, username, credential });
    servers.push({ urls: `turns:${domain}:443?transport=tcp`, username, credential });
  }
  return { iceServers: servers };
};

export const CallProvider = ({ children }) => {
  const [callState, setCallState] = useState({
    status: 'idle', // 'idle' | 'calling' | 'incoming' | 'connected'
    callType: 'video',
    callerName: '',
    callerId: '',
    callerSignal: null,
    callWithId: '',
  });

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const myVideoNodeRef = useRef(null);
  const userVideoNodeRef = useRef(null);

  // Callback ref for local (my) video element
  const myVideoRef = useCallback((node) => {
    myVideoNodeRef.current = node;
    if (node && localStreamRef.current) {
      node.srcObject = localStreamRef.current;
    }
  }, []);

  // Callback ref for remote (user) video element
  const userVideoRef = useCallback((node) => {
    userVideoNodeRef.current = node;
    if (node && remoteStreamRef.current) {
      node.srcObject = remoteStreamRef.current;
    }
  }, []);

  // Initialize socket once on mount
  useEffect(() => {
    const s = io(ENDPOINT);
    socketRef.current = s;

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

    s.on('call-ended', () => {
      performCleanup();
    });

    return () => {
      s.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Register user with this socket when user logs in
  // Components can call registerUser(user) after login
  const registerUser = useCallback((user) => {
    if (socketRef.current && user) {
      socketRef.current.emit('setup', user);
    }
  }, []);

  const getMedia = useCallback(async (type) => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
        video: type === 'video'
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
          : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (myVideoNodeRef.current) {
        myVideoNodeRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Media error:', err);
      alert('Cannot access Camera/Microphone. Please allow permissions in your browser and try again.');
      return null;
    }
  }, []);

  const attachRemote = useCallback((stream) => {
    remoteStreamRef.current = stream;
    if (userVideoNodeRef.current) {
      userVideoNodeRef.current.srcObject = stream;
      // Ensure audio plays — crucial for mobile browsers
      userVideoNodeRef.current.play().catch((e) => console.warn('autoplay blocked:', e));
    }
  }, []);

  const performCleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;

    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    if (myVideoNodeRef.current) myVideoNodeRef.current.srcObject = null;
    if (userVideoNodeRef.current) userVideoNodeRef.current.srcObject = null;

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
  }, []);

  const startCall = useCallback(async (userToCall, callUser, type = 'video') => {
    const stream = await getMedia(type);
    if (!stream) return;

    setCallState((prev) => ({
      ...prev,
      status: 'calling',
      callType: type,
      callWithId: userToCall,
    }));

    const peerConfig = getIceServers();

    const peer = new Peer({ initiator: true, trickle: false, stream, config: peerConfig });

    peer.on('signal', (signalData) => {
      socketRef.current.emit('call-user', {
        userToCall,
        signalData,
        from: callUser._id,
        name: callUser.name,
        type,
      });
    });

    peer.on('stream', (remoteStream) => {
      setCallState((prev) => ({ ...prev, status: 'connected' }));
      attachRemote(remoteStream);
    });

    peer.on('error', () => performCleanup());
    peer.on('close', () => performCleanup());

    peerRef.current = peer;

    socketRef.current.off('call-accepted');
    socketRef.current.on('call-accepted', (signal) => {
      peer.signal(signal);
    });
  }, [getMedia, attachRemote, performCleanup]);

  const answerCall = useCallback(async () => {
    const { callerSignal, callerId, callType } = callState;

    const stream = await getMedia(callType);
    if (!stream) { performCleanup(); return; }

    setCallState((prev) => ({ ...prev, status: 'connecting' }));

    const peerConfig = getIceServers();

    const peer = new Peer({ initiator: false, trickle: false, stream, config: peerConfig });

    peer.on('signal', (signalData) => {
      socketRef.current.emit('answer-call', { signal: signalData, to: callerId });
    });

    peer.on('stream', (remoteStream) => {
      attachRemote(remoteStream);
    });

    peer.on('error', () => performCleanup());
    peer.on('close', () => performCleanup());

    peer.signal(callerSignal);
    peerRef.current = peer;
  }, [callState, getMedia, attachRemote, performCleanup]);

  const rejectCall = useCallback(() => {
    socketRef.current.emit('end-call', { to: callState.callerId });
    performCleanup();
  }, [callState.callerId, performCleanup]);

  const endCall = useCallback(() => {
    const targetId = callState.callWithId || callState.callerId;
    if (targetId) {
      socketRef.current.emit('end-call', { to: targetId });
    }
    performCleanup();
  }, [callState, performCleanup]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsMuted((p) => !p);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsVideoOff((p) => !p);
      }
    }
  }, []);

  return (
    <CallContext.Provider
      value={{
        callState,
        isMuted,
        isVideoOff,
        myVideoRef,
        userVideoRef,
        registerUser,
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
