import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, Phone } from 'lucide-react';
import { GroupCallState } from '../../Context/GroupCallProvider';
import { ChatState } from '../../Context/ChatProvider';

// ── Remote participant tile ──
const ParticipantTile = ({ userId, name, pic, stream }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((e) => console.warn('[GC] remote play blocked:', e));
    }
  }, [stream]);

  const hasVideo = stream && stream.getVideoTracks().length > 0;

  return (
    <div className="relative rounded-2xl overflow-hidden bg-[#1e293b] flex items-center justify-center min-h-[140px]">
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-3 p-4">
          <img
            src={pic || 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg'}
            alt={name}
            className="w-16 h-16 rounded-full object-cover border-2 border-brand-500"
          />
          <p className="text-white text-sm font-semibold">{name}</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-gray-400 text-xs">{stream ? 'Audio only' : 'Connecting...'}</span>
          </div>
        </div>
      )}
      {/* Name tag */}
      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-lg">
        <span className="text-white text-xs font-medium">{name}</span>
      </div>
    </div>
  );
};

// ── Local (self) tile ──
const LocalTile = ({ localStream, name, pic, isVideoOff }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const hasVideo = localStream && localStream.getVideoTracks().length > 0 && !isVideoOff;

  return (
    <div className="relative rounded-2xl overflow-hidden bg-[#0f172a] flex items-center justify-center min-h-[140px] ring-2 ring-brand-500/40">
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-3 p-4">
          <img
            src={pic || 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg'}
            alt={name}
            className="w-16 h-16 rounded-full object-cover border-2 border-green-400"
          />
          <p className="text-white text-sm font-semibold">{name}</p>
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-lg">
        <span className="text-green-400 text-xs font-medium">You</span>
      </div>
    </div>
  );
};

// ── Control Button ──
const CtrlBtn = ({ onClick, active, danger, children }) => (
  <button
    onClick={onClick}
    className={`p-4 rounded-full transition-all shadow-lg ${
      danger
        ? 'bg-red-500 hover:bg-red-600'
        : active
        ? 'bg-red-500 hover:bg-red-600'
        : 'bg-white/10 hover:bg-white/20'
    }`}
  >
    {children}
  </button>
);

// ── Main GroupCallWindow ──
export default function GroupCallWindow() {
  const {
    gcState, participants, isMuted, isVideoOff, localStream,
    leaveGroupCall, endGroupCallForAll, toggleMute, toggleVideo,
  } = GroupCallState();
  const { user } = ChatState();

  if (!gcState.active) return null;

  const isVideoCall = gcState.type === 'video';
  const allCount = participants.length + 1; // +1 for local

  // Responsive grid class
  const gridClass =
    allCount === 1 ? 'grid-cols-1' :
    allCount === 2 ? 'grid-cols-1 sm:grid-cols-2' :
    allCount <= 4 ? 'grid-cols-2' :
    'grid-cols-2 sm:grid-cols-3';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[55] bg-[#0a0f1d] flex flex-col"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-500/20 rounded-xl">
            <Users size={20} className="text-brand-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm md:text-base">
              Group {isVideoCall ? 'Video' : 'Audio'} Call
            </h2>
            <p className="text-gray-400 text-xs">
              {allCount} participant{allCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-full">
          <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          <span className="text-red-400 text-xs font-semibold">LIVE</span>
        </div>
      </div>

      {/* ── Video/Audio Grid ── */}
      <div className={`flex-1 grid ${gridClass} gap-3 p-4 overflow-auto`}>
        {/* Local tile first */}
        <LocalTile
          localStream={localStream}
          name={user?.name}
          pic={user?.pic}
          isVideoOff={isVideoOff}
        />
        {/* Remote participants */}
        {participants.map((p) => (
          <ParticipantTile
            key={p.userId}
            userId={p.userId}
            name={p.name}
            pic={p.pic}
            stream={p.stream}
          />
        ))}
      </div>

      {/* ── Controls ── */}
      <div className="flex-shrink-0 border-t border-white/10 py-5 px-6">
        <div className="flex items-center justify-center gap-4">
          {/* Mute */}
          <CtrlBtn onClick={toggleMute} active={isMuted}>
            {isMuted
              ? <MicOff size={22} className="text-white" />
              : <Mic size={22} className="text-white" />}
          </CtrlBtn>

          {/* Camera (only for video calls) */}
          {isVideoCall && (
            <CtrlBtn onClick={toggleVideo} active={isVideoOff}>
              {isVideoOff
                ? <VideoOff size={22} className="text-white" />
                : <Video size={22} className="text-white" />}
            </CtrlBtn>
          )}

          {/* Leave / End */}
          <CtrlBtn onClick={gcState.isInitiator ? endGroupCallForAll : leaveGroupCall} danger>
            <PhoneOff size={22} className="text-white" />
          </CtrlBtn>
        </div>

        <p className="text-center text-gray-500 text-xs mt-3">
          {gcState.isInitiator ? 'Tap red button to end for everyone' : 'Tap red button to leave'}
        </p>
      </div>
    </motion.div>
  );
}
