import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { ChatState } from './ChatProvider';

const GroupCallContext = createContext(null);
const ENDPOINT = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? '' : 'http://127.0.0.1:5001');

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const GroupCallProvider = ({ children }) => {
  const { user } = ChatState();

  const socketRef = useRef(null);
  const peersRef = useRef({}); // userId -> Peer
  const localStreamRef = useRef(null);
  const activeChatIdRef = useRef(null);

  const [gcState, setGcState] = useState({
    active: false,
    type: null, // 'audio' | 'video'
    chatId: null,
    isInitiator: false,
  });
  const [participants, setParticipants] = useState([]); // [{ userId, name, pic, stream }]
  const [incomingGroupCall, setIncomingGroupCall] = useState(null); // { chatId, callerInfo, type }
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState(null);

  useEffect(() => {
    const s = io(ENDPOINT);
    socketRef.current = s;

    if (user) s.emit('setup', user);

    s.on('incoming-group-call', ({ chatId, callerInfo, type }) => {
      setIncomingGroupCall({ chatId, callerInfo, type });
    });

    s.on('group-call-participants', ({ participants: existing }) => {
      // We joined, now create initiator peers to each existing participant
      existing.forEach(({ userId, name, pic, socketId }) => {
        if (!peersRef.current[userId]) {
          const peer = createInitiatorPeer(userId, name, pic);
          peersRef.current[userId] = peer;
          setParticipants(prev => {
            if (prev.find(p => p.userId === userId)) return prev;
            return [...prev, { userId, name, pic, stream: null }];
          });
        }
      });
    });

    s.on('user-joined-group-call', ({ userInfo }) => {
      const { userId, name, pic } = userInfo;
      if (!peersRef.current[userId] && localStreamRef.current) {
        // We are existing participant, create initiator peer to new user
        const peer = createInitiatorPeer(userId, name, pic);
        peersRef.current[userId] = peer;
        setParticipants(prev => {
          if (prev.find(p => p.userId === userId)) return prev;
          return [...prev, { userId, name, pic, stream: null }];
        });
      }
    });

    s.on('group-call-signal', ({ from, signal }) => {
      if (peersRef.current[from]) {
        try { peersRef.current[from].signal(signal); } catch(e) { console.warn(e); }
      } else if (localStreamRef.current) {
        // Create receiver peer
        const peer = createReceiverPeer(from, signal);
        peersRef.current[from] = peer;
      }
    });

    s.on('user-left-group-call', ({ userId }) => {
      if (peersRef.current[userId]) {
        try { peersRef.current[userId].destroy(); } catch(e) {}
        delete peersRef.current[userId];
      }
      setParticipants(prev => prev.filter(p => p.userId !== userId));
    });

    s.on('group-call-ended', () => {
      cleanupGroupCall();
    });

    return () => s.disconnect();
  }, [user]);

  const createInitiatorPeer = useCallback((toUserId, name, pic) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: localStreamRef.current,
      config: ICE_SERVERS,
    });
    peer.on('signal', signal => {
      socketRef.current.emit('group-call-signal', {
        to: toUserId,
        from: user._id,
        signal,
        chatId: activeChatIdRef.current,
      });
    });
    peer.on('stream', stream => {
      setParticipants(prev => prev.map(p =>
        p.userId === toUserId ? { ...p, stream } : p
      ));
    });
    peer.on('error', e => console.warn('peer error', toUserId, e));
    peer.on('close', () => {
      setParticipants(prev => prev.filter(p => p.userId !== toUserId));
    });
    return peer;
  }, [user]);

  const createReceiverPeer = useCallback((fromUserId, incomingSignal) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: localStreamRef.current,
      config: ICE_SERVERS,
    });
    peer.on('signal', signal => {
      socketRef.current.emit('group-call-signal', {
        to: fromUserId,
        from: user._id,
        signal,
        chatId: activeChatIdRef.current,
      });
    });
    peer.on('stream', stream => {
      setParticipants(prev => prev.map(p =>
        p.userId === fromUserId ? { ...p, stream } : p
      ));
    });
    peer.on('error', e => console.warn('peer error', fromUserId, e));
    peer.on('close', () => {
      setParticipants(prev => prev.filter(p => p.userId !== fromUserId));
    });
    try { peer.signal(incomingSignal); } catch(e) { console.warn(e); }
    return peer;
  }, [user]);

  const getMedia = useCallback(async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      alert('Cannot access Camera/Microphone. Please allow permissions.');
      return null;
    }
  }, []);

  const startGroupCall = useCallback(async (chatId, type = 'video') => {
    const stream = await getMedia(type);
    if (!stream) return;
    activeChatIdRef.current = chatId;
    setGcState({ active: true, type, chatId, isInitiator: true });
    setParticipants([]);
    socketRef.current.emit('group-call-start', {
      chatId,
      callerInfo: { userId: user._id, name: user.name, pic: user.pic },
      type,
    });
    // Also join the room ourselves
    socketRef.current.emit('group-call-join', {
      chatId,
      userInfo: { userId: user._id, name: user.name, pic: user.pic },
    });
  }, [user, getMedia]);

  const joinGroupCall = useCallback(async () => {
    if (!incomingGroupCall) return;
    const { chatId, type } = incomingGroupCall;
    const stream = await getMedia(type);
    if (!stream) return;
    activeChatIdRef.current = chatId;
    setIncomingGroupCall(null);
    setGcState({ active: true, type, chatId, isInitiator: false });
    setParticipants([]);
    socketRef.current.emit('group-call-join', {
      chatId,
      userInfo: { userId: user._id, name: user.name, pic: user.pic },
    });
  }, [incomingGroupCall, user, getMedia]);

  const leaveGroupCall = useCallback(() => {
    if (activeChatIdRef.current) {
      socketRef.current.emit('group-call-leave', {
        chatId: activeChatIdRef.current,
        userId: user._id,
      });
    }
    cleanupGroupCall();
  }, [user]);

  const endGroupCallForAll = useCallback(() => {
    if (activeChatIdRef.current) {
      socketRef.current.emit('group-call-end', { chatId: activeChatIdRef.current });
    }
    cleanupGroupCall();
  }, []);

  const declineGroupCall = useCallback(() => {
    setIncomingGroupCall(null);
  }, []);

  const cleanupGroupCall = useCallback(() => {
    Object.values(peersRef.current).forEach(p => { try { p.destroy(); } catch(e) {} });
    peersRef.current = {};
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setParticipants([]);
    setGcState({ active: false, type: null, chatId: null, isInitiator: false });
    setIsMuted(false);
    setIsVideoOff(false);
    activeChatIdRef.current = null;
  }, []);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) { track.enabled = !track.enabled; setIsMuted(p => !p); }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getVideoTracks()[0];
      if (track) { track.enabled = !track.enabled; setIsVideoOff(p => !p); }
    }
  }, []);

  return (
    <GroupCallContext.Provider value={{
      gcState, participants, incomingGroupCall, isMuted, isVideoOff, localStream,
      startGroupCall, joinGroupCall, leaveGroupCall, endGroupCallForAll, declineGroupCall,
      toggleMute, toggleVideo,
    }}>
      {children}
    </GroupCallContext.Provider>
  );
};

export const GroupCallState = () => {
  const ctx = useContext(GroupCallContext);
  if (!ctx) throw new Error('GroupCallState must be used inside GroupCallProvider');
  return ctx;
};
