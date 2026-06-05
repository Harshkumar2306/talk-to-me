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
          initial={{ opacity: 0, y: -80, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -80, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-4 right-4 z-[60] w-72 bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Gradient top bar */}
          <div className="h-1 bg-gradient-to-r from-brand-500 to-violet-500" />
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-brand-500/20 rounded-xl">
                <Users size={20} className="text-brand-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">
                  {incomingGroupCall.callerInfo.name} started a
                </p>
                <p className="text-brand-400 text-xs font-medium">
                  Group {incomingGroupCall.type === 'video' ? '📹 Video' : '🎤 Audio'} Call
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={declineGroupCall}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors text-sm font-medium"
              >
                <PhoneOff size={16} /> Decline
              </button>
              <button
                onClick={joinGroupCall}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors text-sm font-medium"
              >
                {incomingGroupCall.type === 'video'
                  ? <Video size={16} />
                  : <Phone size={16} />
                } Join
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
