import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, Users } from 'lucide-react';
import { GroupCallState } from '../../Context/GroupCallProvider';

export default function GroupIncomingCallModal() {
  const { incomingGroupCall, joinGroupCall, declineGroupCall } = GroupCallState();

  return (
    <AnimatePresence>
      {incomingGroupCall && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0,   scale: 1 }}
          exit={{ opacity: 0,   y: -40, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-[320px] max-w-[90vw] bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Animated gradient stripe */}
          <div className="h-1 w-full bg-gradient-to-r from-brand-500 via-violet-500 to-pink-500" />

          <div className="p-5">
            {/* Caller info */}
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-lg">
                  <Users size={22} className="text-white" />
                </div>
                {/* Pulsing ring */}
                <span className="absolute -inset-1.5 rounded-2xl border-2 border-brand-400 animate-ping opacity-30" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">
                  {incomingGroupCall.callerInfo.name}
                </p>
                <p className="text-brand-400 text-sm font-medium">
                  {incomingGroupCall.type === 'video' ? '📹 Video' : '🎤 Audio'} Group Call
                </p>
                <p className="text-gray-500 text-xs truncate mt-0.5">
                  {incomingGroupCall.chatName}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={declineGroupCall}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20"
              >
                <PhoneOff size={16} /> Decline
              </button>
              <button
                onClick={joinGroupCall}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30"
              >
                {incomingGroupCall.type === 'video' ? <Video size={16} /> : <Phone size={16} />}
                Join Now
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
