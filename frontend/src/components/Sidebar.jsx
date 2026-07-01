import React, { useState, useRef } from 'react';
import { ChatState } from '../Context/ChatProvider';
import { useTheme } from '../Context/ThemeProvider';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Search, Bell, Settings, LogOut, Sun, Moon,
  User, Camera, X, ChevronRight, Loader2, Shield, Pencil, Check
} from 'lucide-react';
import SearchModal from './SearchModal';
import axios from 'axios';
import io from 'socket.io-client';

const ENDPOINT = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? '' : 'http://127.0.0.1:5001');
// Use axios.defaults.baseURL so profile update hits Render, not Vercel
const BACKEND = axios.defaults.baseURL || ENDPOINT;

const Sidebar = () => {
  const { user, setUser, notification, setNotification, setSelectedChat } = ChatState();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const picInputRef = useRef(null);
  const nameInputRef = useRef(null);

  const logoutHandler = () => {
    localStorage.removeItem('userInfo');
    setUser(null);
    navigate('/');
  };

  const closeAll = () => {
    setIsNotifOpen(false);
    setIsSettingsOpen(false);
    setIsProfileOpen(false);
  };

  const handlePicUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    try {
      setUploadingPic(true);
      const data = new FormData();
      data.append('file', file);
      data.append('upload_preset', 'chat-app');
      data.append('cloud_name', 'drnp7fcux');
      const res = await fetch('https://api.cloudinary.com/v1_1/drnp7fcux/image/upload', { method: 'post', body: data });
      const json = await res.json();
      const picUrl = json.secure_url || json.url;
      // Save to backend database so other users see the updated pic
      await axios.put('/api/user/update-pic',
        { pic: picUrl },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      const updated = { ...user, pic: picUrl };
      localStorage.setItem('userInfo', JSON.stringify(updated));
      setUser(updated);

      const socket = io(ENDPOINT);
      socket.emit('user-pic-updated', { userId: user._id, pic: picUrl });
      setTimeout(() => socket.disconnect(), 2000);
    } catch (e) {
      console.error(e);
      alert('Failed to upload profile picture. Please try again.');
    } finally { setUploadingPic(false); }
  };

  const handleNameSave = async () => {
    if (!newName.trim() || newName.trim() === user.name) {
      setEditingName(false);
      return;
    }
    try {
      setSavingName(true);
      await axios.put('/api/user/update-name',
        { name: newName.trim() },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      const updated = { ...user, name: newName.trim() };
      localStorage.setItem('userInfo', JSON.stringify(updated));
      setUser(updated);
      setEditingName(false);
    } catch (e) {
      console.error(e);
      alert('Failed to update name. Please try again.');
    } finally {
      setSavingName(false);
    }
  };

  const bgClass = isDark ? 'bg-[#0f172a] border-white/10' : 'bg-white border-black/10';
  const textClass = isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-black/5';
  const dropdownClass = isDark
    ? 'bg-[#1e293b] border-white/10 text-white'
    : 'bg-white border-black/10 text-gray-800 shadow-xl';

  // Shared nav buttons config
  const navButtons = (isMobile = false) => (
    <>
      {/* Search */}
      <button onClick={() => { closeAll(); setIsSearchOpen(true); }}
        className={`p-3 ${textClass} rounded-xl transition-all relative group`}>
        <Search size={22} />
        {!isMobile && (
          <span className={`absolute left-16 ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-900 text-white'} text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50`}>Search Users</span>
        )}
      </button>

      {/* Notifications */}
      <div className="relative">
        <button onClick={() => { setIsNotifOpen(!isNotifOpen); setIsSettingsOpen(false); setIsProfileOpen(false); }}
          className={`p-3 ${textClass} rounded-xl transition-all relative`}>
          <Bell size={22} />
          {notification.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-pink-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold animate-pulse">
              {notification.length > 9 ? '9+' : notification.length}
            </span>
          )}
        </button>
        <AnimatePresence>
          {isNotifOpen && (
            <motion.div
              initial={{ opacity: 0, y: isMobile ? 10 : 0, x: isMobile ? 0 : -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`absolute ${isMobile ? 'bottom-14 right-0' : 'left-16 top-0'} w-72 ${dropdownClass} border rounded-2xl shadow-2xl p-3 z-50`}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-semibold text-sm">Notifications</h3>
                {notification.length > 0 && (
                  <button onClick={() => setNotification([])} className="text-xs text-brand-400 hover:text-brand-300">Clear all</button>
                )}
              </div>
              {notification.length === 0 ? (
                <div className="py-6 text-center">
                  <Bell size={28} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm opacity-40">No new notifications</p>
                </div>
              ) : (
                notification.map((notif) => (
                  <div
                    key={notif._id}
                    onClick={() => { setSelectedChat(notif.chat); setNotification(notification.filter((n) => n !== notif)); setIsNotifOpen(false); }}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'} mb-1`}
                  >
                    <img src={notif.sender?.pic} alt="" className="w-9 h-9 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{notif.chat.isGroupChat ? notif.chat.chatName : notif.sender?.name}</p>
                      <p className="text-xs opacity-50 truncate">{notif.content || 'Sent a file'}</p>
                    </div>
                    <div className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0" />
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Settings */}
      <div className="relative">
        <button onClick={() => { setIsSettingsOpen(!isSettingsOpen); setIsNotifOpen(false); setIsProfileOpen(false); }}
          className={`p-3 ${textClass} rounded-xl transition-all`}>
          <Settings size={22} />
        </button>
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div
              initial={{ opacity: 0, y: isMobile ? 10 : 0, x: isMobile ? 0 : -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`absolute ${isMobile ? 'bottom-14 right-0' : 'left-16 top-0'} w-64 ${dropdownClass} border rounded-2xl shadow-2xl overflow-hidden z-50`}
            >
              <div className="p-4 border-b border-current/10">
                <h3 className="font-semibold">Settings</h3>
              </div>
              <div className="p-2">
                <button onClick={toggleTheme}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-yellow-500/15 text-yellow-400' : 'bg-blue-500/15 text-blue-500'}`}>
                      {isDark ? <Sun size={16} /> : <Moon size={16} />}
                    </div>
                    <span className="text-sm font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                  </div>
                  <div className={`w-10 h-5 rounded-full transition-colors ${isDark ? 'bg-brand-500' : 'bg-gray-300'} relative`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isDark ? 'left-5' : 'left-0.5'}`} />
                  </div>
                </button>
                <button onClick={() => { setIsProfileOpen(true); setIsSettingsOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                  <div className="p-2 rounded-lg bg-brand-500/15 text-brand-400"><User size={16} /></div>
                  <span className="text-sm font-medium">Edit Profile</span>
                  <ChevronRight size={14} className="ml-auto opacity-40" />
                </button>
                <div className={`flex items-center gap-3 px-3 py-3 rounded-xl`}>
                  <div className="p-2 rounded-lg bg-green-500/15 text-green-400"><Shield size={16} /></div>
                  <div>
                    <p className="text-sm font-medium">End-to-End Encrypted</p>
                    <p className="text-xs opacity-40">All messages are secure</p>
                  </div>
                </div>
                <div className={`h-px my-1 ${isDark ? 'bg-white/5' : 'bg-black/5'}`} />
                <button onClick={logoutHandler}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors">
                  <div className="p-2 rounded-lg bg-red-500/15"><LogOut size={16} /></div>
                  <span className="text-sm font-medium">Log Out</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );

  return (
    <>
      {/* ── DESKTOP: Vertical icon sidebar (hidden on mobile) ── */}
      <div className={`hidden md:flex w-20 ${bgClass} border-r flex-col items-center py-6 gap-6 z-20 shadow-2xl`}>
        {/* Logo */}
        <div className="p-3 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl shadow-lg shadow-brand-500/30">
          <MessageSquare size={24} className="text-white" />
        </div>

        <div className="flex-1 flex flex-col gap-4 w-full items-center">
          {navButtons(false)}
        </div>

        {/* Profile Picture */}
        <div className="flex flex-col items-center gap-3">
          <button onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotifOpen(false); setIsSettingsOpen(false); }} className="relative group">
            <div className="w-10 h-10 rounded-full border-2 border-brand-500 p-[2px] overflow-hidden">
              <img src={user?.pic || 'https://www.gravatar.com/avatar/?d=mp'} alt={user?.name} className="w-full h-full rounded-full object-cover" />
            </div>
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <User size={12} className="text-white" />
            </div>
          </button>
          <button onClick={logoutHandler} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* ── MOBILE: Bottom navigation bar (hidden on desktop) ── */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-30 ${isDark ? 'bg-[#1e293b]/95 border-white/10' : 'bg-white/95 border-black/10'} border-t backdrop-blur-xl flex items-center justify-around px-4 py-2 safe-area-bottom`}
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>

        {/* Profile avatar */}
        <button onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotifOpen(false); setIsSettingsOpen(false); }} className="relative p-2">
          <div className="w-8 h-8 rounded-full border-2 border-brand-500 overflow-hidden">
            <img src={user?.pic || 'https://www.gravatar.com/avatar/?d=mp'} alt={user?.name} className="w-full h-full rounded-full object-cover" />
          </div>
        </button>

        {/* Search */}
        <button onClick={() => { closeAll(); setIsSearchOpen(true); }}
          className={`p-3 ${textClass} rounded-xl transition-all`}>
          <Search size={22} />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button onClick={() => { setIsNotifOpen(!isNotifOpen); setIsSettingsOpen(false); setIsProfileOpen(false); }}
            className={`p-3 ${textClass} rounded-xl transition-all relative`}>
            <Bell size={22} />
            {notification.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-pink-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold animate-pulse">
                {notification.length > 9 ? '9+' : notification.length}
              </span>
            )}
          </button>
          <AnimatePresence>
            {isNotifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className={`absolute bottom-14 right-0 w-72 ${dropdownClass} border rounded-2xl shadow-2xl p-3 z-50`}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  {notification.length > 0 && (
                    <button onClick={() => setNotification([])} className="text-xs text-brand-400">Clear all</button>
                  )}
                </div>
                {notification.length === 0 ? (
                  <div className="py-6 text-center">
                    <Bell size={28} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm opacity-40">No new notifications</p>
                  </div>
                ) : (
                  notification.map((notif) => (
                    <div key={notif._id}
                      onClick={() => { setSelectedChat(notif.chat); setNotification(notification.filter((n) => n !== notif)); setIsNotifOpen(false); }}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'} mb-1`}>
                      <img src={notif.sender?.pic} alt="" className="w-9 h-9 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{notif.chat.isGroupChat ? notif.chat.chatName : notif.sender?.name}</p>
                        <p className="text-xs opacity-50 truncate">{notif.content || 'Sent a file'}</p>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Settings */}
        <div className="relative">
          <button onClick={() => { setIsSettingsOpen(!isSettingsOpen); setIsNotifOpen(false); setIsProfileOpen(false); }}
            className={`p-3 ${textClass} rounded-xl transition-all`}>
            <Settings size={22} />
          </button>
          <AnimatePresence>
            {isSettingsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className={`absolute bottom-14 right-0 w-64 ${dropdownClass} border rounded-2xl shadow-2xl overflow-hidden z-50`}
              >
                <div className="p-4 border-b border-current/10">
                  <h3 className="font-semibold">Settings</h3>
                </div>
                <div className="p-2">
                  <button onClick={toggleTheme}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-yellow-500/15 text-yellow-400' : 'bg-blue-500/15 text-blue-500'}`}>
                        {isDark ? <Sun size={16} /> : <Moon size={16} />}
                      </div>
                      <span className="text-sm font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full transition-colors ${isDark ? 'bg-brand-500' : 'bg-gray-300'} relative`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isDark ? 'left-5' : 'left-0.5'}`} />
                    </div>
                  </button>
                  <button onClick={() => { setIsProfileOpen(true); setIsSettingsOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                    <div className="p-2 rounded-lg bg-brand-500/15 text-brand-400"><User size={16} /></div>
                    <span className="text-sm font-medium">Edit Profile</span>
                    <ChevronRight size={14} className="ml-auto opacity-40" />
                  </button>
                  <div className={`h-px my-1 ${isDark ? 'bg-white/5' : 'bg-black/5'}`} />
                  <button onClick={logoutHandler}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors">
                    <div className="p-2 rounded-lg bg-red-500/15"><LogOut size={16} /></div>
                    <span className="text-sm font-medium">Log Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            onClick={() => setIsProfileOpen(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-sm ${isDark ? 'bg-[#1e293b] text-white' : 'bg-white text-gray-800'} rounded-2xl shadow-2xl border ${isDark ? 'border-white/10' : 'border-black/10'} overflow-hidden`}
            >
              <div className="h-32 bg-gradient-to-br from-brand-500 via-indigo-500 to-violet-600 relative overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
              <button onClick={() => setIsProfileOpen(false)} className="absolute top-3 right-3 p-1.5 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-all hover:rotate-90">
                <X size={16} />
              </button>
              <div className="px-6 pb-6">
                <div className="relative -mt-16 mb-6 inline-block group cursor-pointer" onClick={() => picInputRef.current?.click()}>
                  <div className="w-28 h-28 rounded-2xl border-4 border-[#1e293b] overflow-hidden shadow-2xl transition-transform duration-300 group-hover:scale-105 group-hover:-translate-y-1">
                    <img src={user?.pic || 'https://www.gravatar.com/avatar/?d=mp'} alt={user?.name} className="w-full h-full rounded-full object-cover" />
                  </div>
                  <button
                    disabled={uploadingPic}
                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-brand-500 hover:bg-brand-400 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-12"
                  >
                    {uploadingPic ? <Loader2 size={16} className="animate-spin text-white" /> : <Camera size={16} className="text-white" />}
                  </button>
                  <input ref={picInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePicUpload(e.target.files[0])} />
                </div>

                {editingName ? (
                  <div className="flex items-center gap-2 mb-4 bg-black/20 p-2 rounded-xl border border-brand-500/50">
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setEditingName(false); }}
                      autoFocus
                      className={`flex-1 text-lg font-bold bg-transparent focus:outline-none px-2 ${isDark ? 'text-white' : 'text-gray-800'}`}
                    />
                    <button
                      onClick={handleNameSave}
                      disabled={savingName}
                      className="p-2 bg-brand-500 hover:bg-brand-400 rounded-lg text-white flex-shrink-0 transition-all hover:scale-105"
                    >
                      {savingName ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => { setNewName(user?.name || ''); setEditingName(true); }}
                    className={`flex justify-between items-center mb-4 group cursor-pointer p-3 -mx-3 rounded-2xl transition-all ${isDark ? 'hover:bg-white/5 hover:shadow-lg' : 'hover:bg-gray-50 hover:shadow-lg'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <h2 className={`text-2xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.name}</h2>
                      <p className={`text-sm truncate mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{user?.email}</p>
                    </div>
                    <button className={`p-2.5 rounded-xl transition-all ${isDark ? 'bg-white/5 text-brand-400 group-hover:bg-brand-500 group-hover:text-white' : 'bg-brand-50 text-brand-600 group-hover:bg-brand-500 group-hover:text-white'}`}>
                      <Pencil size={16} />
                    </button>
                  </div>
                )}

                <div className={`mt-2 rounded-2xl p-4 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-black/5'} flex items-center justify-between transition-all hover:scale-[1.02]`}>
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Current Status</p>
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                        <div className="absolute inset-0 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping opacity-75" />
                      </div>
                      <span className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Active right now</span>
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-full text-xs font-extrabold tracking-wide ${isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-600'}`}>
                    ONLINE
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {isSearchOpen && <SearchModal onClose={() => setIsSearchOpen(false)} />}
    </>
  );
};

export default Sidebar;
