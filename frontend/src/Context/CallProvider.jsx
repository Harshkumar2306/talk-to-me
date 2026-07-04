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
    // Ensure the URL is properly prefixed with turn: or turns: for the WebRTC API
    let formattedUrl = envUrl.trim();
    if (!formattedUrl.startsWith('turn:') && !formattedUrl.startsWith('turns:') && !formattedUrl.startsWith('stun:')) {
      formattedUrl = `turn:${formattedUrl}`;
    }

    servers.push({ urls: formattedUrl, username, credential });
    
    // If no transport is specified, add a TCP fallback for strict firewalls
    if (!formattedUrl.includes('transport=')) {
      servers.push({ urls: `${formattedUrl}?transport=tcp`, username, credential });
    }
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

  const userRef = useRef(null);

  // Initialize socket once on mount
  useEffect(() => {
    const s = io(ENDPOINT, { reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 1000 });
    socketRef.current = s;

    // Auto-register on every connect/reconnect so the server always has this socket in the user's room
    s.on('connect', () => {
      if (userRef.current) {
        s.emit('setup', userRef.current);
      }
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

    s.on('call-ended', () => {
      performCleanup();
    });

    return () => {
      s.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Register user with this socket when user logs in
  const registerUser = useCallback((user) => {
    userRef.current = user;
    if (socketRef.current?.connected && user) {
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

    const peerConfig = getIceServers();

    const peer = new Peer({ initiator: false, trickle: false, stream, config: peerConfig });

    peer.on('signal', (signalData) => {
      socketRef.current.emit('answer-call', { signal: signalData, to: callerId });
    });

    peer.on('stream', (remoteStream) => {
      setCallState((prev) => ({ ...prev, status: 'connected' }));
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
