import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users } from 'lucide-react';
import { GroupCallState } from '../../Context/GroupCallProvider';
import { ChatState } from '../../Context/ChatProvider';

// Single video tile for a participant
const ParticipantTile = ({ userId, name, pic, stream, isDark }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.warn('play blocked:', e));
    }
  }, [stream]);

  return (
    <div className={`relative rounded-2xl overflow-hidden flex items-center justify-center ${
      isDark ? 'bg-[#1e293b]' : 'bg-gray-200'
    }`}>
      {stream ? (
        <video ref={videoRef} autoPlay playsInline muted={false} className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <img src={pic || 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg'}
            alt={name} className="w-16 h-16 rounded-full object-cover border-2 border-brand-500" />
          <p className="text-white text-sm font-medium">{name}</p>
          <p className="text-gray-400 text-xs">Connecting...</p>
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-0.5 rounded-lg">
        <span className="text-white text-xs font-medium">{name}</span>
      </div>
    </div>
  );
};

const LocalTile = ({ localStream, name, pic, isDark }) => {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);
  return (
    <div className={`relative rounded-2xl overflow-hidden flex items-center justify-center ${
      isDark ? 'bg-[#0f172a]' : 'bg-gray-300'
    }`}>
      {localStream && localStream.getVideoTracks().length > 0 ? (
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <img src={pic || 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg'}
            alt={name} className="w-16 h-16 rounded-full object-cover border-2 border-green-400" />
          <p className="text-white text-sm font-medium">{name}</p>
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-0.5 rounded-lg">
        <span className="text-white text-xs font-medium">You</span>
      </div>
    </div>
  );
};

export default function GroupCallWindow() {
  const { gcState, participants, isMuted, isVideoOff, localStream,
    leaveGroupCall, endGroupCallForAll, toggleMute, toggleVideo } = GroupCallState();
  const { user } = ChatState();
  const isDark = true; // Always dark for call UI

  if (!gcState.active) return null;

  const allTiles = [
    { userId: 'me', name: user.name, pic: user.pic, stream: null, isLocal: true },
    ...participants,
  ];

  // Grid layout based on count
  const count = allTiles.length;
  const gridClass = count <= 1 ? 'grid-cols-1'
    : count <= 2 ? 'grid-cols-2'
    : count <= 4 ? 'grid-cols-2'
    : 'grid-cols-3';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#0f172a] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-500/20 rounded-xl">
            <Users size={20} className="text-brand-400" />
          </div>
          <div>
            <h2 className="text-white font-bold">Group {gcState.type === 'video' ? 'Video' : 'Audio'} Call</h2>
            <p className="text-gray-400 text-xs">{allTiles.length} participant{allTiles.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className={`flex-1 grid ${gridClass} gap-3 p-4 overflow-auto`}>
        {allTiles.map(tile =>
          tile.isLocal ? (
            <LocalTile key="me" localStream={localStream} name={user.name} pic={user.pic} isDark={isDark} />
          ) : (
            <ParticipantTile key={tile.userId} {...tile} isDark={isDark} />
          )
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 px-6 py-5 border-t border-white/10">
        <button onClick={toggleMute}
          className={`p-4 rounded-full transition-all ${
            isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
          }`}>
          {isMuted ? <MicOff size={22} className="text-white" /> : <Mic size={22} className="text-white" />}
        </button>

        {gcState.type === 'video' && (
          <button onClick={toggleVideo}
            className={`p-4 rounded-full transition-all ${
              isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
            }`}>
            {isVideoOff ? <VideoOff size={22} className="text-white" /> : <Video size={22} className="text-white" />}
          </button>
        )}

        {/* Leave (for non-initiator) or End for All (for initiator) */}
        {gcState.isInitiator ? (
          <button onClick={endGroupCallForAll}
            className="p-4 bg-red-500 hover:bg-red-600 rounded-full transition-all">
            <PhoneOff size={22} className="text-white" />
          </button>
        ) : (
          <button onClick={leaveGroupCall}
            className="p-4 bg-red-500 hover:bg-red-600 rounded-full transition-all">
            <PhoneOff size={22} className="text-white" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
