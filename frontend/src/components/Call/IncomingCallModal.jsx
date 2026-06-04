import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { CallState } from '../../Context/CallProvider';

const IncomingCallModal = () => {
  const { callState, answerCall, rejectCall } = CallState();
  const { status, callerName, callType } = callState;

  const isVisible = status === 'incoming';

  // Ringtone effect
  const audioRef = useRef(null);
  useEffect(() => {
    if (isVisible) {
      // Use Web Audio API to generate a ringtone without needing an audio file
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      let stopped = false;
      let t = ctx.currentTime;

      const playBeep = () => {
        if (stopped) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 660;
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.start(t);
        osc.stop(t + 0.4);
        t += 0.6;
        setTimeout(playBeep, 600);
      };
      playBeep();
      audioRef.current = { stop: () => { stopped = true; ctx.close(); } };
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.stop();
        audioRef.current = null;
      }
    };
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="incoming-call"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0, transition: { type: 'spring', damping: 18, stiffness: 260 } }}
            exit={{ scale: 0.8, opacity: 0, y: 20, transition: { duration: 0.2 } }}
            className="relative bg-gradient-to-b from-[#1e293b] to-[#0f172a] p-8 rounded-3xl shadow-2xl border border-white/10 flex flex-col items-center min-w-[300px] z-10"
          >
            {/* Animated ring */}
            <div className="relative mb-8 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute w-28 h-28 rounded-full bg-brand-500/30"
              />
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                className="absolute w-28 h-28 rounded-full bg-brand-500/20"
              />
              <div className="w-24 h-24 bg-gradient-to-br from-brand-500 to-violet-600 rounded-full flex items-center justify-center shadow-xl shadow-brand-500/40 z-10">
                {callType === 'video'
                  ? <Video size={38} className="text-white" />
                  : <Phone size={38} className="text-white" />}
              </div>
            </div>

            <p className="text-gray-400 text-sm font-medium tracking-widest uppercase mb-1">
              Incoming {callType} call
            </p>
            <h2 className="text-3xl font-bold text-white mb-10 text-center">{callerName}</h2>

            <div className="flex gap-10">
              {/* Reject */}
              <div className="flex flex-col items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={rejectCall}
                  className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-xl shadow-red-500/40 transition-colors"
                >
                  <PhoneOff size={26} className="text-white" />
                </motion.button>
                <span className="text-xs text-gray-400">Decline</span>
              </div>

              {/* Accept */}
              <div className="flex flex-col items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.92 }}
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                  onClick={answerCall}
                  className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-xl shadow-green-500/40 transition-colors"
                >
                  {callType === 'video'
                    ? <Video size={26} className="text-white" />
                    : <Phone size={26} className="text-white" />}
                </motion.button>
                <span className="text-xs text-gray-400">Accept</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IncomingCallModal;
