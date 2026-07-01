import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, Loader2 } from 'lucide-react';
import { CallState } from '../../Context/CallProvider';

const CallWindow = () => {
  const {
    callState,
    isMuted,
    isVideoOff,
    myVideoRef,
    userVideoRef,
    localStreamRef,
    remoteStreamRef,
    endCall,
    toggleMute,
    toggleVideo,
  } = CallState();

  const { status, callerName, callType } = callState;

  const isOpen = status === 'calling' || status === 'connected' || status === 'connecting';

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="call-window"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] bg-black flex flex-col"
      >
        {/* Remote Video (Full screen) */}
        <div className="flex-1 relative bg-[#0a0f1e] flex items-center justify-center overflow-hidden">
          {status === 'connected' ? (
            <motion.div
              key="remote-video"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full"
            >
              <video
                playsInline
                autoPlay
                ref={userVideoRef}
                className="w-full h-full object-cover"
              />
            </motion.div>
          ) : (
            /* Calling / waiting screen */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  className="absolute inset-0 w-32 h-32 rounded-full bg-brand-500/30"
                />
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
                  className="absolute inset-0 w-32 h-32 rounded-full bg-brand-500/20"
                />
                <div className="w-32 h-32 bg-gradient-to-br from-brand-500 to-violet-600 rounded-full flex items-center justify-center shadow-2xl shadow-brand-500/40 relative z-10">
                  {callType === 'video' ? <Video size={50} className="text-white" /> : <Phone size={50} className="text-white" />}
                </div>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm tracking-widest uppercase mb-2">
                  {status === 'connecting' ? 'Connecting' : 'Calling'}
                </p>
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="text-brand-400 animate-spin" />
                  <span className="text-white text-xl font-medium">
                    {status === 'connecting' ? 'Establishing connection...' : 'Waiting for answer...'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Picture-in-Picture: Local Video */}
          <motion.div
            initial={{ opacity: 0, x: 30, y: -30 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', damping: 20 }}
            className="absolute top-5 right-5 w-44 h-64 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/15 z-20"
          >
            <video
              playsInline
              muted
              autoPlay
              ref={myVideoRef}
              className={`w-full h-full object-cover scale-x-[-1] ${(isVideoOff || callType === 'audio') ? 'hidden' : 'block'}`}
            />
            {(isVideoOff || callType === 'audio') && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <VideoOff size={32} className="text-gray-500" />
              </div>
            )}
          </motion.div>

          {/* Status badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10"
          >
            <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400 animate-pulse'}`} />
            <span className="text-white text-sm font-medium">
              {status === 'connected' ? 'Connected' : 'Connecting...'}
            </span>
          </motion.div>
        </div>

        {/* Control Bar */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', damping: 20 }}
          className="absolute bottom-0 left-0 right-0 h-32 flex items-center justify-center gap-5 pb-6"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 100%)' }}
        >
          {/* Mute Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleMute}
            className={`flex flex-col items-center gap-1.5 group`}
          >
            <div className={`p-4 rounded-full transition-all duration-200 ${isMuted ? 'bg-red-500 shadow-lg shadow-red-500/40' : 'bg-white/10 backdrop-blur-md hover:bg-white/20'}`}>
              {isMuted ? <MicOff size={22} className="text-white" /> : <Mic size={22} className="text-white" />}
            </div>
            <span className="text-xs text-gray-400">{isMuted ? 'Unmute' : 'Mute'}</span>
          </motion.button>

          {/* End Call Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={endCall}
            className="flex flex-col items-center gap-1.5 mx-4"
          >
            <div className="p-5 bg-red-500 hover:bg-red-600 rounded-full shadow-2xl shadow-red-500/50 transition-colors">
              <PhoneOff size={30} className="text-white" />
            </div>
            <span className="text-xs text-gray-400">End Call</span>
          </motion.button>

          {/* Camera Toggle — only shown for video calls */}
          {callType === 'video' && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleVideo}
              className="flex flex-col items-center gap-1.5"
            >
              <div className={`p-4 rounded-full transition-all duration-200 ${isVideoOff ? 'bg-red-500 shadow-lg shadow-red-500/40' : 'bg-white/10 backdrop-blur-md hover:bg-white/20'}`}>
                {isVideoOff ? <VideoOff size={22} className="text-white" /> : <Video size={22} className="text-white" />}
              </div>
              <span className="text-xs text-gray-400">{isVideoOff ? 'Show Video' : 'Hide Video'}</span>
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CallWindow;
