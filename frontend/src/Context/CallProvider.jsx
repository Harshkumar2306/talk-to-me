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
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
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
  return { iceServers: servers, iceCandidatePoolSize: 10 };
};

export const CallProvider = ({ children }) => {
  const [callState, setCallState] = useState({
    status: 'idle', // 'idle' | 'calling' | 'incoming' | 'connecting' | 'connected'
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
  const userRef = useRef(null);
  // Store callerSignal in a ref so answerCall always has the latest value
  const callerSignalRef = useRef(null);
  const callerIdRef = useRef(null);

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
    const s = io(ENDPOINT, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = s;

    // CRITICAL: Re-join the user's room on EVERY connect/reconnect
    s.on('connect', () => {
      console.log('[CallProvider] Socket connected:', s.id);
      if (userRef.current) {
        s.emit('setup', userRef.current);
      }
    });

    s.on('incoming-call', (data) => {
      console.log('[CallProvider] incoming-call from:', data.from, 'signal type:', data.signal?.type);
      // Store in refs for answerCall to access (avoids stale closure issues)
      callerSignalRef.current = data.signal;
      callerIdRef.current = data.from;
      setCallState({
        status: 'incoming',
        callType: data.type || 'video',
        callerName: data.name,
        callerId: data.from,
        callerSignal: data.signal,
        callWithId: data.from,
      });
    });

    // CRITICAL FIX: Handle call-accepted as a PERSISTENT listener on the socket,
    // not a one-off inside startCall. This ensures it's always active and never
    // gets lost due to socket reconnects or timing issues.
    s.on('call-accepted', (signal) => {
      console.log('[CallProvider] call-accepted received, signal type:', signal?.type);
      if (peerRef.current && !peerRef.current.destroyed) {
        try {
          peerRef.current.signal(signal);
        } catch (err) {
          console.error('[CallProvider] Error signaling peer with accepted signal:', err);
        }
      } else {
        console.warn('[CallProvider] call-accepted received but no active peer');
      }
    });

    s.on('call-ended', () => {
      console.log('[CallProvider] call-ended received');
      performCleanup();
    });

    s.on('disconnect', (reason) => {
      console.log('[CallProvider] Socket disconnected:', reason);
    });

    return () => {
      s.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Register user with this socket when user logs in
  const registerUser = useCallback((user) => {
    userRef.current = user;
    if (socketRef.current && user) {
      socketRef.current.emit('setup', user);
      console.log('[CallProvider] registerUser:', user._id);
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
    if (localStreamRef.current && stream.id === localStreamRef.current.id) {
      console.warn('[CallProvider] WARNING: Tried to attach local stream to remote video! Ignoring.');
      return;
    }
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

    callerSignalRef.current = null;
    callerIdRef.current = null;

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
    // Guard against double-clicking
    if (peerRef.current) return;

    const stream = await getMedia(type);
    if (!stream) return;

    setCallState((prev) => ({
      ...prev,
      status: 'calling',
      callType: type,
      callWithId: userToCall,
    }));

    const peerConfig = getIceServers();
    console.log('[CallProvider] Creating initiator peer, trickle: false');

    const peer = new Peer({ initiator: true, trickle: false, stream, config: peerConfig });

    peer.on('signal', (signalData) => {
      console.log('[CallProvider] Initiator signal ready, type:', signalData.type);
      socketRef.current.emit('call-user', {
        userToCall,
        signalData,
        from: callUser._id,
        name: callUser.name,
        type,
      });
    });

    peer.on('stream', (remoteStream) => {
      console.log('[CallProvider] Received remote stream (initiator)');
      setCallState((prev) => ({ ...prev, status: 'connected' }));
      attachRemote(remoteStream);
    });

    peer.on('track', (track, remoteStream) => {
      console.log('[CallProvider] Received remote track (initiator)');
      setCallState((prev) => ({ ...prev, status: 'connected' }));
      attachRemote(remoteStream);
    });

    peer.on('connect', () => {
      console.log('[CallProvider] Peer connected (initiator)');
      setCallState((prev) => ({ ...prev, status: 'connected' }));
    });

    peer.on('error', (err) => {
      console.error('[CallProvider] Peer error (initiator):', err.message);
      socketRef.current.emit('end-call', { to: userToCall });
      performCleanup();
    });
    peer.on('close', () => {
      console.log('[CallProvider] Peer closed (initiator)');
      // Only cleanup if we haven't already (error fires before close)
      if (peerRef.current) {
        socketRef.current.emit('end-call', { to: userToCall });
        performCleanup();
      }
    });

    peerRef.current = peer;

    // NOTE: call-accepted is now handled as a persistent listener on the socket
    // (set up in the useEffect above), not as a one-off listener inside startCall.
  }, [getMedia, attachRemote, performCleanup]);

  const answerCall = useCallback(async () => {
    // Read from REFS to avoid any stale closure issues
    const callerSignal = callerSignalRef.current;
    const callerId = callerIdRef.current;
    const callType = callState.callType;

    console.log('[CallProvider] answerCall called. callerSignal exists:', !!callerSignal, 'callerId:', callerId);

    if (!callerSignal) {
      console.error('[CallProvider] answerCall: No caller signal available!');
      performCleanup();
      return;
    }

    // Guard against double-clicking
    if (peerRef.current) return;

    const stream = await getMedia(callType);
    if (!stream) {
      socketRef.current.emit('end-call', { to: callerId });
      performCleanup();
      return;
    }

    setCallState((prev) => ({ ...prev, status: 'connecting' }));

    const peerConfig = getIceServers();
    console.log('[CallProvider] Creating answerer peer, trickle: false');

    const peer = new Peer({ initiator: false, trickle: false, stream, config: peerConfig });

    peer.on('signal', (signalData) => {
      console.log('[CallProvider] Answerer signal ready, type:', signalData.type, 'emitting answer-call to:', callerId);
      socketRef.current.emit('answer-call', { signal: signalData, to: callerId });
    });

    peer.on('stream', (remoteStream) => {
      console.log('[CallProvider] Received remote stream (answerer)');
      setCallState((prev) => ({ ...prev, status: 'connected' }));
      attachRemote(remoteStream);
    });

    peer.on('track', (track, remoteStream) => {
      console.log('[CallProvider] Received remote track (answerer)');
      setCallState((prev) => ({ ...prev, status: 'connected' }));
      attachRemote(remoteStream);
    });

    peer.on('connect', () => {
      console.log('[CallProvider] Peer connected (answerer)');
      setCallState((prev) => ({ ...prev, status: 'connected' }));
    });

    peer.on('error', (err) => {
      console.error('[CallProvider] Peer error (answerer):', err.message);
      socketRef.current.emit('end-call', { to: callerId });
      performCleanup();
    });
    peer.on('close', () => {
      console.log('[CallProvider] Peer closed (answerer)');
      if (peerRef.current) {
        socketRef.current.emit('end-call', { to: callerId });
        performCleanup();
      }
    });

    // Feed the caller's SDP offer into our peer
    console.log('[CallProvider] Signaling peer with caller SDP');
    peer.signal(callerSignal);
    peerRef.current = peer;
  }, [callState.callType, getMedia, attachRemote, performCleanup]);

  const rejectCall = useCallback(() => {
    const callerId = callerIdRef.current || callState.callerId;
    socketRef.current.emit('end-call', { to: callerId });
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
        localStreamRef,
        remoteStreamRef,
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
