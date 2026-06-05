import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import { ChatState } from './ChatProvider';

const GroupCallContext = createContext(null);
const ENDPOINT = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? '' : 'http://127.0.0.1:5001');

export const GroupCallProvider = ({ children }) => {
  const { user } = ChatState();
  const socketRef = useRef(null);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // gcState: what is currently shown on screen
  const [gcState, setGcState] = useState({
    active: false,      // is the call window open?
    chatId: null,
    chatName: '',
    type: 'video',      // 'audio' | 'video'
    isInitiator: false,
  });

  // incomingGroupCall: shown as a ringing modal to non-initiators
  const [incomingGroupCall, setIncomingGroupCall] = useState(null);

  // ── Socket setup ──
  useEffect(() => {
    const s = io(ENDPOINT);
    socketRef.current = s;

    if (user) s.emit('setup', user);

    // Someone started a call in a group we belong to
    s.on('incoming-group-call', ({ chatId, chatName, callerInfo, type }) => {
      // Don't ring if we are already in a call
      if (gcState.active) return;
      setIncomingGroupCall({ chatId, chatName, callerInfo, type });
    });

    // Initiator ended the call for everyone
    s.on('group-call-ended', () => {
      setGcState({ active: false, chatId: null, chatName: '', type: 'video', isInitiator: false });
      setIncomingGroupCall(null);
    });

    return () => s.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Start a group call (the person who taps the button) ──
  const startGroupCall = useCallback((chatId, chatName, type, chatUsers) => {
    if (!userRef.current) return;
    setGcState({ active: true, chatId, chatName, type, isInitiator: true });

    // Notify every other member in the group by their personal socket room
    socketRef.current.emit('group-call-start', {
      chatId,
      chatName,
      callerInfo: {
        userId: userRef.current._id,
        name: userRef.current.name,
        pic: userRef.current.pic,
      },
      type,
      chatUserIds: chatUsers.map((u) => (typeof u === 'object' ? u._id : u)),
    });
  }, []);

  // ── Join an incoming call ──
  const joinGroupCall = useCallback(() => {
    if (!incomingGroupCall) return;
    const { chatId, chatName, type } = incomingGroupCall;
    setIncomingGroupCall(null);
    setGcState({ active: true, chatId, chatName, type, isInitiator: false });
  }, [incomingGroupCall]);

  // ── Decline ──
  const declineGroupCall = useCallback(() => {
    setIncomingGroupCall(null);
  }, []);

  // ── Leave (just you) ──
  const leaveGroupCall = useCallback(() => {
    setGcState({ active: false, chatId: null, chatName: '', type: 'video', isInitiator: false });
  }, []);

  // ── End for everyone (initiator only) ──
  const endGroupCallForAll = useCallback((chatUserIds) => {
    if (gcState.chatId) {
      socketRef.current.emit('group-call-end', {
        chatId: gcState.chatId,
        chatUserIds,
      });
    }
    setGcState({ active: false, chatId: null, chatName: '', type: 'video', isInitiator: false });
  }, [gcState.chatId]);

  return (
    <GroupCallContext.Provider value={{
      gcState,
      incomingGroupCall,
      startGroupCall,
      joinGroupCall,
      declineGroupCall,
      leaveGroupCall,
      endGroupCallForAll,
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
