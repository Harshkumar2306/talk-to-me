import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare } from 'lucide-react';
import { useTheme } from '../Context/ThemeProvider';

/**
 * MessageToast – a floating popup that appears when a new message
 * arrives while the user is in a different chat (or no chat).
 *
 * Props:
 *   toasts  – array of { id, senderName, senderPic, content, messageType, chat, onClick }
 *   onDismiss(id) – called to remove a toast
 */
const MessageToast = ({ toasts, onDismiss }) => {
  const { isDark } = useTheme();

  if (!toasts || toasts.length === 0) return null;

  const getPreview = (t) => {
    if (t.messageType === 'audio') return '🎤 Voice note';
    if (t.messageType === 'image') return '📷 Photo';
    if (t.messageType === 'file') return `📎 ${t.fileName || 'File'}`;
    return t.content || '…';
  };

  return (
    <div className="fixed top-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="pointer-events-auto"
          >
            <div
              className={`flex items-center gap-3 p-3 rounded-2xl shadow-2xl border cursor-pointer max-w-[320px] min-w-[260px] backdrop-blur-md ${
                isDark
                  ? 'bg-[#1e293b]/95 border-white/10 text-white'
                  : 'bg-white/95 border-black/10 text-gray-800'
              }`}
              onClick={() => {
                toast.onClick?.();
                onDismiss(toast.id);
              }}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <img
                  src={toast.senderPic || 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg'}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border-2 border-brand-500/40"
                />
                <div className="absolute -bottom-1 -right-1 bg-brand-500 rounded-full p-0.5">
                  <MessageSquare size={9} className="text-white" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{toast.senderName}</p>
                <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {getPreview(toast)}
                </p>
              </div>

              {/* Dismiss */}
              <button
                onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
                className={`flex-shrink-0 p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-400'}`}
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default MessageToast;
