import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Users, PhoneOff, LogOut } from 'lucide-react';
import { GroupCallState } from '../../Context/GroupCallProvider';
import { ChatState } from '../../Context/ChatProvider';

/**
 * GroupCallWindow — embeds a Jitsi Meet room.
 * Room name is deterministic from chatId so everyone lands in the same room.
 */
export default function GroupCallWindow() {
  const { gcState, leaveGroupCall, endGroupCallForAll } = GroupCallState();
  const { user, selectedChat } = ChatState();
  const apiRef = useRef(null);
  const containerRef = useRef(null);

  const { active, chatId, chatName, type, isInitiator } = gcState;

  // Jitsi room name — must be the same for every participant
  const roomName = chatId ? `TalkToMe-${chatId}` : null;

  useEffect(() => {
    if (!active || !roomName || !containerRef.current) return;

    // Load Jitsi external API script once
    const loadJitsi = () => {
      if (apiRef.current) {
        try { apiRef.current.dispose(); } catch (e) {}
        apiRef.current = null;
      }

      const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName,
        parentNode: containerRef.current,
        userInfo: {
          displayName: user?.name || 'Guest',
          email: user?.email || '',
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: type === 'audio',
          disableDeepLinking: true,
          prejoinPageEnabled: false,       // skip the lobby screen
          requireDisplayName: false,
          disableThirdPartyRequests: false,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          MOBILE_APP_PROMO: false,
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'desktop',
            'fullscreen', 'fodeviceselection', 'hangup',
            'chat', 'tileview', 'videoquality',
          ],
          SETTINGS_SECTIONS: [],
          FILM_STRIP_MAX_HEIGHT: 120,
        },
      });

      // When the user clicks "Leave" inside Jitsi, treat it as leaving the call
      api.on('readyToClose', () => {
        if (isInitiator) {
          endGroupCallForAll(
            selectedChat?.users?.map((u) => (typeof u === 'object' ? u._id : u)) || []
          );
        } else {
          leaveGroupCall();
        }
      });

      apiRef.current = api;
    };

    if (window.JitsiMeetExternalAPI) {
      loadJitsi();
    } else {
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = loadJitsi;
      document.head.appendChild(script);
    }

    return () => {
      if (apiRef.current) {
        try { apiRef.current.dispose(); } catch (e) {}
        apiRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, roomName]);

  if (!active || !roomName) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[55] bg-[#0a0f1d] flex flex-col"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0 bg-[#1e293b]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-500/20 rounded-xl">
            <Users size={18} className="text-brand-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">
              {chatName || 'Group'} — {type === 'video' ? '📹 Video' : '🎤 Audio'} Call
            </h2>
            <p className="text-gray-400 text-xs">Powered by Jitsi Meet</p>
          </div>
        </div>

        {/* Leave / End button */}
        <button
          onClick={() => {
            if (apiRef.current) {
              try { apiRef.current.executeCommand('hangup'); } catch (e) {}
            }
            if (isInitiator) {
              endGroupCallForAll(
                selectedChat?.users?.map((u) => (typeof u === 'object' ? u._id : u)) || []
              );
            } else {
              leaveGroupCall();
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors text-sm font-medium"
        >
          {isInitiator ? <PhoneOff size={16} /> : <LogOut size={16} />}
          {isInitiator ? 'End for All' : 'Leave'}
        </button>
      </div>

      {/* ── Jitsi container ── */}
      <div ref={containerRef} className="flex-1 w-full" style={{ minHeight: 0 }} />
    </motion.div>
  );
}
