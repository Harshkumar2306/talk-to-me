import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, Users, Check, Plus } from 'lucide-react';
import axios from 'axios';
import { ChatState } from '../../Context/ChatProvider';
import { useTheme } from '../../Context/ThemeProvider';

const CreateGroupModal = ({ onClose }) => {
  const { user, chats, setChats, setSelectedChat } = ChatState();
  const { isDark } = useTheme();

  const [groupName, setGroupName] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (q) => {
    setSearch(q);
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/user?search=${q}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setSearchResults(data.filter((u) => u._id !== user._id));
    } catch { setError('Failed to search users'); }
    finally { setLoading(false); }
  };

  const toggleUser = (u) => {
    if (selectedUsers.find((s) => s._id === u._id)) {
      setSelectedUsers(selectedUsers.filter((s) => s._id !== u._id));
    } else {
      setSelectedUsers([...selectedUsers, u]);
    }
  };

  const isSelected = (u) => !!selectedUsers.find((s) => s._id === u._id);

  const handleCreate = async () => {
    if (!groupName.trim()) { setError('Please enter a group name'); return; }
    if (selectedUsers.length < 2) { setError('Please select at least 2 members'); return; }
    try {
      setCreating(true);
      setError('');
      const { data } = await axios.post(
        '/api/chat/group',
        {
          name: groupName,
          users: JSON.stringify(selectedUsers.map((u) => u._id)),
        },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setChats([data, ...chats]);
      setSelectedChat(data);
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create group');
    } finally { setCreating(false); }
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
        className={`relative w-full max-w-md ${glass} border rounded-2xl shadow-2xl overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-current/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/15 rounded-xl">
              <Users size={18} className="text-brand-400" />
            </div>
            <h2 className="text-lg font-bold">Create Group Chat</h2>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Error */}
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          {/* Group Name */}
          <div>
            <label className="block text-xs font-medium mb-1.5 opacity-60">Group Name</label>
            <input
              type="text"
              placeholder="e.g. Work Team, Friends..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-colors ${inputCls}`}
            />
          </div>

          {/* Selected Users Chips */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((u) => (
                <motion.div
                  key={u._id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-1.5 bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-full px-3 py-1 text-xs font-medium"
                >
                  <img src={u.pic} alt="" className="w-4 h-4 rounded-full object-cover" />
                  {u.name.split(' ')[0]}
                  <button onClick={() => toggleUser(u)} className="hover:text-red-400 transition-colors">
                    <X size={12} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {/* Search */}
          <div>
            <label className="block text-xs font-medium mb-1.5 opacity-60">Add Members</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className={`w-full border rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none transition-colors ${inputCls}`}
              />
              {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin opacity-50" />}
            </div>
          </div>

          {/* Results */}
          {searchResults.length > 0 && (
            <div className={`rounded-xl border ${isDark ? 'border-white/5' : 'border-black/5'} overflow-hidden max-h-44 overflow-y-auto`}>
              {searchResults.map((u) => (
                <button
                  key={u._id}
                  onClick={() => toggleUser(u)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${hoverItem} ${isSelected(u) ? isDark ? 'bg-brand-600/20' : 'bg-brand-50' : ''}`}
                >
                  <img src={u.pic} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs opacity-40 truncate">{u.email}</p>
                  </div>
                  {isSelected(u) && (
                    <div className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-5 py-4 border-t border-current/10 flex justify-between items-center`}>
          <p className="text-xs opacity-40">
            {selectedUsers.length} member{selectedUsers.length !== 1 ? 's' : ''} selected
          </p>
          <button
            onClick={handleCreate}
            disabled={creating || !groupName.trim() || selectedUsers.length < 2}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-brand-500/20"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Create Group
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CreateGroupModal;
