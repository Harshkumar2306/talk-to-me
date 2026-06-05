import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Users,
} from 'lucide-react';
import { GroupCallState } from '../../Context/GroupCallProvider';
import { ChatState } from '../../Context/ChatProvider';

/* ─────────────────────────────────────────
   Single video tile — one per participant
───────────────────────────────────────── */
const VideoTile = ({ stream, name, pic, isLocal, isVideoOff: videoMuted }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (stream) {
      el.srcObject = stream;
      if (!isLocal) el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [stream, isLocal]);

  const showVideo = stream && !videoMuted;

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[#1a2540] flex items-center justify-center">
      {/* Video */}
      {showVideo && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Avatar fallback (no video / video off) */}
      {!showVideo && (
        <div className="flex flex-col items-center gap-2 z-10">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-brand-500/60 shadow-lg">
            <img
              src={pic || 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg'}
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-white text-sm font-semibold drop-shadow">{name}</p>
          {!stream && (
            <span className="text-gray-400 text-xs animate-pulse">Connecting…</span>
          )}
        </div>
      )}

      {/* Name badge */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg">
        {isLocal && (
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
        )}
        <span className="text-white text-xs font-medium truncate max-w-[80px]">
          {isLocal ? 'You' : name}
        </span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   Grid layout — mirrors WhatsApp
   1  → full screen
   2  → top / bottom halves
   3  → top-left, top-right, bottom-center
   4  → 2 × 2
   5+ → 2-col, scrollable
───────────────────────────────────────── */
const CallGrid = ({ tiles }) => {
  const n = tiles.length;

  if (n === 1) {
    return (
      <div className="flex-1 p-3">
        <VideoTile {...tiles[0]} />
      </div>
    );
  }

  if (n === 2) {
    return (
      <div className="flex-1 flex flex-col gap-2 p-3">
        {tiles.map((t, i) => (
          <div key={i} className="flex-1 min-h-0">
            <VideoTile {...t} />
          </div>
        ))}
      </div>
    );
  }

  if (n === 3) {
    return (
      <div className="flex-1 flex flex-col gap-2 p-3">
        <div className="flex flex-1 gap-2 min-h-0">
          <div className="flex-1"><VideoTile {...tiles[0]} /></div>
          <div className="flex-1"><VideoTile {...tiles[1]} /></div>
        </div>
        <div className="flex flex-1 justify-center gap-2 min-h-0">
          <div className="w-1/2"><VideoTile {...tiles[2]} /></div>
        </div>
      </div>
    );
  }

  // 4+ : 2-column grid, scrollable
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: 'repeat(2, 1fr)',
          gridAutoRows: 'minmax(160px, 1fr)',
        }}
      >
        {tiles.map((t, i) => (
          <div key={i} className="relative" style={{ minHeight: 160 }}>
            <VideoTile {...t} />
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   Control bar button
───────────────────────────────────────── */
const Btn = ({ onClick, red, active, title, children }) => (
  <button
    onClick={onClick}
    title={title}
    className={`
      flex flex-col items-center gap-1 p-3 rounded-2xl transition-all select-none
      ${red ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
             : active ? 'bg-red-500/80 hover:bg-red-600'
             : 'bg-white/10 hover:bg-white/20'}
    `}
  >
    {children}
  </button>
);

/* ─────────────────────────────────────────
   Main GroupCallWindow
───────────────────────────────────────── */
export default function GroupCallWindow() {
  const {
    gcActive, gcType, gcIsInitiator, gcChatName,
    localStream, participants,
    isMuted, isVideoOff,
    leaveGroupCall, endGroupCallForAll,
    toggleMute, toggleVideo,
  } = GroupCallState();

  const { user } = ChatState();

  if (!gcActive) return null;

  // Build the tile list — local tile first
  const tiles = [
    {
      stream: localStream,
      name: user?.name || 'You',
      pic: user?.pic,
      isLocal: true,
      isVideoOff,
    },
    ...participants.map((p) => ({
      stream: p.stream,
      name: p.name,
      pic: p.pic,
      isLocal: false,
      isVideoOff: false,
    })),
  ];

  const totalCount = tiles.length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[55] bg-[#0d1526] flex flex-col"
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-500/20 rounded-xl">
            <Users size={18} className="text-brand-400" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">{gcChatName}</p>
            <p className="text-gray-400 text-xs">
              {gcType === 'video' ? '📹' : '🎤'}&nbsp;
              {totalCount} participant{totalCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {/* Live badge */}
        <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/30 px-3 py-1 rounded-full">
          <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          <span className="text-red-400 text-xs font-bold tracking-wide">LIVE</span>
        </div>
      </div>

      {/* ── Video grid ── */}
      <CallGrid tiles={tiles} />

      {/* ── Control bar ── */}
      <div className="flex-shrink-0 border-t border-white/10 bg-[#0d1526]/90 backdrop-blur-md py-4 px-6">
        <div className="flex items-center justify-center gap-5">

          {/* Mute */}
          <Btn onClick={toggleMute} active={isMuted} title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted
              ? <MicOff size={22} className="text-white" />
              : <Mic    size={22} className="text-white" />}
            <span className="text-white/60 text-[10px]">{isMuted ? 'Unmute' : 'Mute'}</span>
          </Btn>

          {/* Camera — only for video calls */}
          {gcType === 'video' && (
            <Btn onClick={toggleVideo} active={isVideoOff} title={isVideoOff ? 'Start Video' : 'Stop Video'}>
              {isVideoOff
                ? <VideoOff size={22} className="text-white" />
                : <Video    size={22} className="text-white" />}
              <span className="text-white/60 text-[10px]">{isVideoOff ? 'Start Cam' : 'Stop Cam'}</span>
            </Btn>
          )}

          {/* End / Leave */}
          <Btn onClick={gcIsInitiator ? endGroupCallForAll : leaveGroupCall} red title={gcIsInitiator ? 'End for All' : 'Leave'}>
            <PhoneOff size={22} className="text-white" />
            <span className="text-white/80 text-[10px]">{gcIsInitiator ? 'End All' : 'Leave'}</span>
          </Btn>
        </div>
      </div>
    </motion.div>
  );
}
