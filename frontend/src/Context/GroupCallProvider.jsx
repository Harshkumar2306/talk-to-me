/**
 * GroupCallProvider — WhatsApp-style group video/audio calls using WebRTC mesh.
 *
 * Architecture:
 *  - Each participant creates a direct peer connection to every other participant.
 *  - The server only routes signals (offers/answers/ICE) between specific users.
 *  - Existing participants INITIATE peers to newcomers.
 *  - Newcomers RECEIVE signals and create answering peers.
 *  - trickle:true is used for fast ICE gathering.
 */

import React, {
  createContext, useContext, useRef, useState, useEffect, useCallback,
} from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { ChatState } from './ChatProvider';

const GroupCallContext = createContext(null);
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
    servers.push({ urls: envUrl, username, credential });
    if (!envUrl.includes('transport=tcp')) {
      servers.push({ urls: `${envUrl}?transport=tcp`, username, credential });
    }
  }
  return { iceServers: servers };
};

const ICE = getIceServers();

export const GroupCallProvider = ({ children }) => {
  const { user } = ChatState();

  // ── All mutable call state lives in refs so socket handlers never go stale ──
  const socketRef      = useRef(null);
  const peersRef       = useRef({});          // userId → Peer
  const localStreamRef = useRef(null);
  const chatIdRef      = useRef(null);
  const chatUsersRef   = useRef([]);          // all user ids in the chat
  const myIdRef        = useRef(null);

  // ── UI state (triggers re-renders) ──
  const [gcActive,          setGcActive]          = useState(false);
  const [gcType,            setGcType]            = useState('video');
  const [gcIsInitiator,     setGcIsInitiator]     = useState(false);
  const [gcChatName,        setGcChatName]        = useState('');
  const [localStream,       setLocalStream]       = useState(null);
  const [participants,      setParticipants]      = useState([]); // [{ userId, name, pic, stream }]
  const [isMuted,           setIsMuted]           = useState(false);
  const [isVideoOff,        setIsVideoOff]        = useState(false);
  const [incomingGroupCall, setIncomingGroupCall] = useState(null);

  // ── Stable helpers (no deps — use refs only) ──

  const destroyPeer = useCallback((userId) => {
    if (peersRef.current[userId]) {
      try { peersRef.current[userId].destroy(); } catch (_) {}
      delete peersRef.current[userId];
    }
  }, []);

  const removeParticipant = useCallback((userId) => {
    destroyPeer(userId);
    setParticipants((prev) => prev.filter((p) => p.userId !== userId));
  }, [destroyPeer]);

  // Make an INITIATOR peer (we send the offer)
  const makeInitiatorPeer = useCallback((toUserId, name, pic) => {
    const peer = new Peer({
      initiator: true,
      trickle: true,
      stream: localStreamRef.current,
      config: ICE,
    });

    peer.on('signal', (signal) => {
      socketRef.current?.emit('gc-signal', {
        to: toUserId,
        from: myIdRef.current,
        signal,
        chatId: chatIdRef.current,
      });
    });

    peer.on('stream', (stream) => {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === toUserId ? { ...p, stream } : p))
      );
    });

    peer.on('close', () => removeParticipant(toUserId));
    peer.on('error', (e) => console.warn('[GC] peer error (init)', toUserId, e.message));

    return peer;
  }, [removeParticipant]);

  // Make a RECEIVER peer (we respond to the offer)
  const makeReceiverPeer = useCallback((fromUserId, incomingSignal) => {
    const peer = new Peer({
      initiator: false,
      trickle: true,
      stream: localStreamRef.current,
      config: ICE,
    });

    peer.on('signal', (signal) => {
      socketRef.current?.emit('gc-signal', {
        to: fromUserId,
        from: myIdRef.current,
        signal,
        chatId: chatIdRef.current,
      });
    });

    peer.on('stream', (stream) => {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === fromUserId ? { ...p, stream } : p))
      );
    });

    peer.on('close', () => removeParticipant(fromUserId));
    peer.on('error', (e) => console.warn('[GC] peer error (recv)', fromUserId, e.message));

    try { peer.signal(incomingSignal); } catch (_) {}
    return peer;
  }, [removeParticipant]);

  // ── Socket — runs once per user session ──
  useEffect(() => {
    if (!user) return;
    myIdRef.current = user._id;

    const s = io(ENDPOINT, { reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 1000 });
    socketRef.current = s;

    // Auto-register on every connect/reconnect so the server always has this socket in the user's room
    s.on('connect', () => {
      s.emit('setup', user);
    });

    // ── Someone started a call in a group I belong to ──
    s.on('gc-incoming', ({ chatId, chatName, callerInfo, type }) => {
      if (chatIdRef.current) return; // already in a call
      setIncomingGroupCall({ chatId, chatName, callerInfo, type });
    });

    // ── Server sends me list of who is already in the call when I join ──
    s.on('gc-peers', ({ peers }) => {
      // Just add them to the UI list; initiator peers will come from them via gc-user-joined
      setParticipants((prev) => {
        const additions = peers
          .filter((p) => p.userId !== myIdRef.current && !prev.find((x) => x.userId === p.userId))
          .map((p) => ({ userId: p.userId, name: p.name, pic: p.pic, stream: null }));
        return [...prev, ...additions];
      });
    });

    // ── An existing participant tells me a new user joined; I (as existing) initiate to them ──
    s.on('gc-user-joined', ({ userInfo }) => {
      const { userId, name, pic } = userInfo;
      if (userId === myIdRef.current) return;
      if (!localStreamRef.current) return;
      if (peersRef.current[userId]) return; // already have a peer

      // Add to UI
      setParticipants((prev) => {
        if (prev.find((p) => p.userId === userId)) return prev;
        return [...prev, { userId, name, pic, stream: null }];
      });

      // Create initiator peer
      const peer = makeInitiatorPeer(userId, name, pic);
      peersRef.current[userId] = peer;
    });

    // ── Incoming WebRTC signal ──
    s.on('gc-signal', ({ from, signal }) => {
      if (!localStreamRef.current) return;

      if (peersRef.current[from]) {
        // Feed signal to existing peer (ICE candidate or answer)
        try { peersRef.current[from].signal(signal); } catch (_) {}
      } else {
        // First signal from this user — create receiver peer
        // Add placeholder to UI first so stream handler can find them
        setParticipants((prev) => {
          if (prev.find((p) => p.userId === from)) return prev;
          return [...prev, { userId: from, name: '...', pic: null, stream: null }];
        });

        const peer = makeReceiverPeer(from, signal);
        peersRef.current[from] = peer;
      }
    });

    // ── Someone left ──
    s.on('gc-user-left', ({ userId }) => {
      removeParticipant(userId);
    });

    // ── Initiator ended call for everyone ──
    s.on('gc-ended', () => {
      cleanup();
    });

    return () => {
      s.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Get camera/mic ──
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
    } catch {
      alert('Cannot access Camera/Microphone. Please allow permissions in your browser settings.');
      return null;
    }
  }, []);

  // ── Cleanup everything ──
  const cleanup = useCallback(() => {
    Object.keys(peersRef.current).forEach((uid) => destroyPeer(uid));
    peersRef.current = {};

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    chatIdRef.current = null;
    chatUsersRef.current = [];

    setGcActive(false);
    setGcType('video');
    setGcIsInitiator(false);
    setGcChatName('');
    setLocalStream(null);
    setParticipants([]);
    setIsMuted(false);
    setIsVideoOff(false);
  }, [destroyPeer]);

  // ── Start a call (initiator) ──
  const startGroupCall = useCallback(async (chatId, chatName, type, chatUsers) => {
    if (!user) return;
    const stream = await getMedia(type);
    if (!stream) return;

    chatIdRef.current = chatId;
    chatUsersRef.current = chatUsers.map((u) => (typeof u === 'object' ? u._id : u));

    setGcActive(true);
    setGcType(type);
    setGcIsInitiator(true);
    setGcChatName(chatName);
    setParticipants([]);

    const s = socketRef.current;
    // Notify everyone
    s.emit('gc-start', {
      chatId,
      chatName,
      callerInfo: { userId: user._id, name: user.name, pic: user.pic },
      type,
      chatUserIds: chatUsersRef.current,
    });
    // Join the call room myself
    s.emit('gc-join', {
      chatId,
      userInfo: { userId: user._id, name: user.name, pic: user.pic },
    });
  }, [user, getMedia]);

  // ── Join an incoming call ──
  const joinGroupCall = useCallback(async () => {
    const call = incomingGroupCall;
    if (!call || !user) return;

    const stream = await getMedia(call.type);
    if (!stream) return;

    chatIdRef.current = call.chatId;
    setIncomingGroupCall(null);
    setGcActive(true);
    setGcType(call.type);
    setGcIsInitiator(false);
    setGcChatName(call.chatName);
    setParticipants([]);

    socketRef.current?.emit('gc-join', {
      chatId: call.chatId,
      userInfo: { userId: user._id, name: user.name, pic: user.pic },
    });
  }, [incomingGroupCall, user, getMedia]);

  // ── Leave (just you) ──
  const leaveGroupCall = useCallback(() => {
    if (chatIdRef.current && user) {
      socketRef.current?.emit('gc-leave', {
        chatId: chatIdRef.current,
        userId: user._id,
      });
    }
    cleanup();
  }, [user, cleanup]);

  // ── End for everyone (initiator only) ──
  const endGroupCallForAll = useCallback(() => {
    socketRef.current?.emit('gc-end', {
      chatId: chatIdRef.current,
      chatUserIds: chatUsersRef.current,
    });
    cleanup();
  }, [cleanup]);

  const declineGroupCall = useCallback(() => setIncomingGroupCall(null), []);

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
      gcActive, gcType, gcIsInitiator, gcChatName,
      localStream, participants,
      isMuted, isVideoOff,
      incomingGroupCall,
      startGroupCall, joinGroupCall, leaveGroupCall,
      endGroupCallForAll, declineGroupCall,
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
