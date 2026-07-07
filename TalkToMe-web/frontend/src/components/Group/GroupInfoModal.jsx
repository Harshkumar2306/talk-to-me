import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, Loader2, Users, Edit3, UserPlus, UserMinus,
  Crown, LogOut, Check, Trash2
} from 'lucide-react';
import axios from 'axios';
import { ChatState } from '../../Context/ChatProvider';
import { useTheme } from '../../Context/ThemeProvider';

const GroupInfoModal = ({ onClose }) => {
  const { user, selectedChat, setSelectedChat, setChats, chats } = ChatState();
  const { isDark } = useTheme();

  const [groupName, setGroupName] = useState(selectedChat?.chatName || '');
  const [editingName, setEditingName] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isAdmin = selectedChat?.groupAdmin?._id === user._id;

  const showMsg = (msg, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  const handleSearch = async (q) => {
    setSearch(q);
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/user?search=${q}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      // Filter out users already in the group
      const alreadyIn = selectedChat.users.map((u) => u._id);
      setSearchResults(data.filter((u) => !alreadyIn.includes(u._id)));
    } catch { showMsg('Failed to search users', true); }
    finally { setLoading(false); }
  };

  const handleRename = async () => {
    if (!groupName.trim() || groupName === selectedChat.chatName) { setEditingName(false); return; }
    try {
      setRenaming(true);
      const { data } = await axios.put(
        '/api/chat/rename',
        { chatId: selectedChat._id, chatName: groupName },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setSelectedChat(data);
      setChats(chats.map((c) => (c._id === data._id ? data : c)));
      showMsg('Group renamed successfully!');
      setEditingName(false);
    } catch { showMsg('Failed to rename group', true); }
    finally { setRenaming(false); }
  };

  const handleAddUser = async (userToAdd) => {
    if (!isAdmin) { showMsg('Only admins can add members', true); return; }
    try {
      const { data } = await axios.put(
        '/api/chat/groupadd',
        { chatId: selectedChat._id, userId: userToAdd._id },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setSelectedChat(data);
      setChats(chats.map((c) => (c._id === data._id ? data : c)));
      setSearch('');
      setSearchResults([]);
      showMsg(`${userToAdd.name} added to group!`);
    } catch { showMsg('Failed to add member', true); }
  };

  const handleRemoveUser = async (userToRemove) => {
    if (!isAdmin && userToRemove._id !== user._id) {
      showMsg('Only admins can remove members', true); return;
    }
    try {
      const { data } = await axios.put(
        '/api/chat/groupremove',
        { chatId: selectedChat._id, userId: userToRemove._id },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      if (userToRemove._id === user._id) {
        setSelectedChat(null);
        setChats(chats.filter((c) => c._id !== selectedChat._id));
        onClose();
        return;
      }
      setSelectedChat(data);
      setChats(chats.map((c) => (c._id === data._id ? data : c)));
      showMsg(`${userToRemove.name} removed from group.`);
    } catch { showMsg('Failed to remove member', true); }
  };

  const glass = isDark
    ? 'bg-[#1e293b] border-white/10 text-white'
    : 'bg-white border-black/10 text-gray-800';
  const inputCls = isDark
    ? 'bg-black/30 border-white/10 text-white placeholder-gray-500 focus:border-brand-500/60'
    : 'bg-gray-50 border-black/10 text-gray-900 placeholder-gray-400 focus:border-brand-500/60';
  const hoverItem = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md ${glass} border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-current/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/15 rounded-xl">
              <Users size={18} className="text-purple-400" />
            </div>
            <h2 className="text-lg font-bold">Group Info</h2>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="p-5 space-y-5">
            {/* Feedback messages */}
            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</div>
            )}
            {success && (
              <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2">{success}</div>
            )}

            {/* Group Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 via-brand-500 to-pink-500 flex items-center justify-center shadow-xl">
                <Users size={36} className="text-white" />
              </div>

              {/* Group Name */}
              {editingName ? (
                <div className="flex items-center gap-2 w-full max-w-xs">
                  <input
                    autoFocus
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                    className={`flex-1 border rounded-xl px-3 py-2 text-sm text-center font-bold outline-none transition-colors ${inputCls}`}
                  />
                  <button onClick={handleRename} disabled={renaming} className="p-2 bg-brand-500 hover:bg-brand-400 rounded-xl text-white transition-colors">
                    {renaming ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  </button>
                  <button onClick={() => { setEditingName(false); setGroupName(selectedChat.chatName); }} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">{selectedChat?.chatName}</h3>
                  {isAdmin && (
                    <button onClick={() => setEditingName(true)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-400'}`}>
                      <Edit3 size={14} />
                    </button>
                  )}
                </div>
              )}
              <p className="text-sm opacity-40">{selectedChat?.users?.length} members</p>
            </div>

            {/* Add Members (admin only) */}
            {isAdmin && (
              <div>
                <label className="block text-xs font-medium mb-2 opacity-60 flex items-center gap-1">
                  <UserPlus size={12} /> Add Members
                </label>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                  <input
                    type="text"
                    placeholder="Search users to add..."
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className={`w-full border rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none transition-colors ${inputCls}`}
                  />
                  {loading && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin opacity-50" />}
                </div>

                <AnimatePresence>
                  {searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className={`mt-2 rounded-xl border ${isDark ? 'border-white/5' : 'border-black/5'} overflow-hidden max-h-36 overflow-y-auto`}
                    >
                      {searchResults.map((u) => (
                        <button
                          key={u._id}
                          onClick={() => handleAddUser(u)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${hoverItem}`}
                        >
                          <img src={u.pic} alt="" className="w-8 h-8 rounded-full object-cover" />
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium">{u.name}</p>
                            <p className="text-xs opacity-40">{u.email}</p>
                          </div>
                          <div className="text-xs text-brand-400 font-medium flex items-center gap-1">
                            <UserPlus size={12} /> Add
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Members List */}
            <div>
              <label className="block text-xs font-medium mb-2 opacity-60 flex items-center gap-1">
                <Users size={12} /> Members
              </label>
              <div className={`rounded-xl border ${isDark ? 'border-white/5' : 'border-black/5'} overflow-hidden`}>
                {selectedChat?.users?.map((member) => {
                  const isGroupAdmin = member._id === selectedChat?.groupAdmin?._id;
                  const isYou = member._id === user._id;
                  const canRemove = isAdmin || isYou;
                  return (
                    <div
                      key={member._id}
                      className={`flex items-center gap-3 px-4 py-3 border-b last:border-b-0 ${isDark ? 'border-white/5' : 'border-black/5'}`}
                    >
                      <div className="relative">
                        <img
                          src={member.pic || 'https://www.gravatar.com/avatar/?d=mp'}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        {isGroupAdmin && (
                          <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-0.5">
                            <Crown size={9} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.name}
                          {isYou && <span className="text-xs opacity-40 ml-1">(you)</span>}
                        </p>
                        <p className="text-xs opacity-40 truncate">
                          {isGroupAdmin ? '👑 Group Admin' : member.email}
                        </p>
                      </div>
                      {canRemove && !isGroupAdmin && (
                        <button
                          onClick={() => handleRemoveUser(member)}
                          className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title={isYou ? 'Leave group' : 'Remove member'}
                        >
                          {isYou ? <LogOut size={14} /> : <UserMinus size={14} />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Leave Group Button */}
        <div className="px-5 py-4 border-t border-current/10 flex-shrink-0">
          <button
            onClick={() => handleRemoveUser(user)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-medium transition-colors"
          >
            <LogOut size={15} /> Leave Group
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GroupInfoModal;
