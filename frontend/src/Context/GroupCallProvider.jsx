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
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const GroupCallProvider = ({ children }) => {
  const { user } = ChatState();

  // All mutable state stored in refs to avoid stale closures in socket handlers
  const socketRef = useRef(null);
  const peersRef = useRef({});          // userId -> Peer instance
  const localStreamRef = useRef(null);  // local camera/mic stream
  const activeChatIdRef = useRef(null); // current group chat id in call
  const userRef = useRef(user);         // always-fresh user ref

  // Keep userRef in sync
  useEffect(() => { userRef.current = user; }, [user]);

  const [gcState, setGcState] = useState({
    active: false,
    type: null,       // 'audio' | 'video'
    chatId: null,
    isInitiator: false,
  });
  const [participants, setParticipants] = useState([]); // [{ userId, name, pic, stream }]
  const [incomingGroupCall, setIncomingGroupCall] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState(null);

  // ─── Peer factory: initiator side ───
  const buildInitiatorPeer = useCallback((toUserId, name, pic) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: localStreamRef.current,
      config: ICE_SERVERS,
    });

    peer.on('signal', (signal) => {
      socketRef.current?.emit('group-call-signal', {
        to: toUserId,
        from: userRef.current._id,
        signal,
        chatId: activeChatIdRef.current,
      });
    });

    peer.on('stream', (stream) => {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === toUserId ? { ...p, stream } : p))
      );
    });

    peer.on('close', () => {
      delete peersRef.current[toUserId];
      setParticipants((prev) => prev.filter((p) => p.userId !== toUserId));
    });

    peer.on('error', (e) => console.warn('[GC] peer error (initiator)', toUserId, e.message));
    return peer;
  }, []);

  // ─── Peer factory: receiver side ───
  const buildReceiverPeer = useCallback((fromUserId, incomingSignal) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: localStreamRef.current,
      config: ICE_SERVERS,
    });

    peer.on('signal', (signal) => {
      socketRef.current?.emit('group-call-signal', {
        to: fromUserId,
        from: userRef.current._id,
        signal,
        chatId: activeChatIdRef.current,
      });
    });

    peer.on('stream', (stream) => {
      // Make sure participant entry exists first
      setParticipants((prev) => {
        const exists = prev.find((p) => p.userId === fromUserId);
        if (!exists) return prev;
        return prev.map((p) => (p.userId === fromUserId ? { ...p, stream } : p));
      });
    });

    peer.on('close', () => {
      delete peersRef.current[fromUserId];
      setParticipants((prev) => prev.filter((p) => p.userId !== fromUserId));
    });

    peer.on('error', (e) => console.warn('[GC] peer error (receiver)', fromUserId, e.message));

    // Signal immediately
    try { peer.signal(incomingSignal); } catch (e) { console.warn('[GC] signal err', e); }
    return peer;
  }, []);

  // ─── Cleanup (pure ref operations, no stale closure risk) ───
  const cleanupGroupCall = useCallback(() => {
    Object.values(peersRef.current).forEach((p) => {
      try { p.destroy(); } catch (e) {}
    });
    peersRef.current = {};

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    activeChatIdRef.current = null;

    setLocalStream(null);
    setParticipants([]);
    setGcState({ active: false, type: null, chatId: null, isInitiator: false });
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  // ─── Socket setup — runs once, uses refs so handlers are never stale ───
  useEffect(() => {
    const s = io(ENDPOINT);
    socketRef.current = s;

    // Register user's personal room as soon as user is available
    if (user) s.emit('setup', user);

    // Someone in the group started a call
    s.on('incoming-group-call', ({ chatId, callerInfo, type }) => {
      // Don't show incoming if we are already in a call
      if (activeChatIdRef.current) return;
      setIncomingGroupCall({ chatId, callerInfo, type });
    });

    // Server sends us list of people already in the room when we join
    s.on('group-call-participants', ({ participants: existing }) => {
      existing.forEach(({ userId, name, pic }) => {
        if (userId === userRef.current?._id) return; // skip self
        if (peersRef.current[userId]) return;        // already connected

        const peer = buildInitiatorPeer(userId, name, pic);
        peersRef.current[userId] = peer;
        setParticipants((prev) => {
          if (prev.find((p) => p.userId === userId)) return prev;
          return [...prev, { userId, name, pic, stream: null }];
        });
      });
    });

    // A new user joined while we were already in the call
    s.on('user-joined-group-call', ({ userInfo }) => {
      const { userId, name, pic } = userInfo;
      if (userId === userRef.current?._id) return; // skip self
      if (!localStreamRef.current) return;          // we're not in a call
      if (peersRef.current[userId]) return;         // already connected

      const peer = buildInitiatorPeer(userId, name, pic);
      peersRef.current[userId] = peer;
      setParticipants((prev) => {
        if (prev.find((p) => p.userId === userId)) return prev;
        return [...prev, { userId, name, pic, stream: null }];
      });
    });

    // Incoming WebRTC signal from a peer
    s.on('group-call-signal', ({ from, signal }) => {
      if (!localStreamRef.current) return;

      if (peersRef.current[from]) {
        // Existing peer — feed the signal
        try { peersRef.current[from].signal(signal); } catch (e) {}
      } else {
        // First signal from this user — create receiver peer
        // First add participant entry so stream handler can find it
        setParticipants((prev) => {
          if (prev.find((p) => p.userId === from)) return prev;
          return [...prev, { userId: from, name: '...', pic: null, stream: null }];
        });
        const peer = buildReceiverPeer(from, signal);
        peersRef.current[from] = peer;
      }
    });

    // Someone left
    s.on('user-left-group-call', ({ userId }) => {
      if (peersRef.current[userId]) {
        try { peersRef.current[userId].destroy(); } catch (e) {}
        delete peersRef.current[userId];
      }
      setParticipants((prev) => prev.filter((p) => p.userId !== userId));
    });

    // Initiator ended call for everyone
    s.on('group-call-ended', () => {
      cleanupGroupCall();
    });

    return () => {
      s.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ─── Get camera/mic ───
  const getMedia = useCallback(async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: type === 'video'
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
          : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      alert('Cannot access Camera/Microphone. Please allow permissions in your browser.');
      return null;
    }
  }, []);

  // ─── Start a group call (initiator) ───
  const startGroupCall = useCallback(async (chatId, type = 'video') => {
    if (!userRef.current) return;
    const stream = await getMedia(type);
    if (!stream) return;

    activeChatIdRef.current = chatId;
    setGcState({ active: true, type, chatId, isInitiator: true });
    setParticipants([]);

    const socket = socketRef.current;
    // Join the chatId room so we receive in(chatId) broadcasts
    socket.emit('join chat', chatId);

    socket.emit('group-call-start', {
      chatId,
      callerInfo: {
        userId: userRef.current._id,
        name: userRef.current.name,
        pic: userRef.current.pic,
      },
      type,
    });

    // Also join our own call room slot
    socket.emit('group-call-join', {
      chatId,
      userInfo: {
        userId: userRef.current._id,
        name: userRef.current.name,
        pic: userRef.current.pic,
      },
    });
  }, [getMedia]);

  // ─── Join an incoming group call ───
  const joinGroupCall = useCallback(async () => {
    const call = incomingGroupCall;
    if (!call || !userRef.current) return;

    const { chatId, type } = call;
    const stream = await getMedia(type);
    if (!stream) return;

    activeChatIdRef.current = chatId;
    setIncomingGroupCall(null);
    setGcState({ active: true, type, chatId, isInitiator: false });
    setParticipants([]);

    const socket = socketRef.current;
    socket.emit('join chat', chatId);

    socket.emit('group-call-join', {
      chatId,
      userInfo: {
        userId: userRef.current._id,
        name: userRef.current.name,
        pic: userRef.current.pic,
      },
    });
  }, [incomingGroupCall, getMedia]);

  // ─── Leave call (just this user) ───
  const leaveGroupCall = useCallback(() => {
    if (activeChatIdRef.current && userRef.current) {
      socketRef.current?.emit('group-call-leave', {
        chatId: activeChatIdRef.current,
        userId: userRef.current._id,
      });
    }
    cleanupGroupCall();
  }, [cleanupGroupCall]);

  // ─── End call for everyone (initiator only) ───
  const endGroupCallForAll = useCallback(() => {
    if (activeChatIdRef.current) {
      socketRef.current?.emit('group-call-end', { chatId: activeChatIdRef.current });
    }
    cleanupGroupCall();
  }, [cleanupGroupCall]);

  const declineGroupCall = useCallback(() => {
    setIncomingGroupCall(null);
  }, []);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsMuted((p) => !p); }
  }, []);

  const toggleVideo = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsVideoOff((p) => !p); }
  }, []);

  return (
    <GroupCallContext.Provider value={{
      gcState, participants, incomingGroupCall, isMuted, isVideoOff, localStream,
      startGroupCall, joinGroupCall, leaveGroupCall, endGroupCallForAll,
      declineGroupCall, toggleMute, toggleVideo,
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
