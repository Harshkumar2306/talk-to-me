import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2 } from 'lucide-react';
import axios from 'axios';
import { ChatState } from '../Context/ChatProvider';

const SearchModal = ({ onClose }) => {
  const [search, setSearch] = useState('');
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  const { user, setSelectedChat, chats, setChats } = ChatState();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search) return;

    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.get(`/api/user?search=${search}`, config);
      setLoading(false);
      setSearchResult(data);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const accessChat = async (userId) => {
    try {
      setLoadingChat(true);
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.post(`/api/chat`, { userId }, config);

      if (!chats.find((c) => c._id === data._id)) setChats([data, ...chats]);
      setSelectedChat(data);
      setLoadingChat(false);
      onClose();
    } catch (error) {
      console.error(error);
      setLoadingChat(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-[#1e293b] rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[80vh]"
        >
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
            <h2 className="text-xl font-semibold text-white">Search Users</h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            <form onSubmit={handleSearch} className="flex gap-2 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email" 
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <button 
                type="submit"
                className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl font-medium transition-colors"
              >
                Go
              </button>
            </form>

            <div className="flex flex-col gap-2">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-brand-500" size={32} />
                </div>
              ) : (
                searchResult?.map((u) => (
                  <div 
                    key={u._id} 
                    onClick={() => accessChat(u._id)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/10 group"
                  >
                    <img src={u.pic} alt={u.name} className="w-12 h-12 rounded-full object-cover" />
                    <div>
                      <h4 className="text-white font-medium group-hover:text-brand-400 transition-colors">{u.name}</h4>
                      <p className="text-sm text-gray-400">{u.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {loadingChat && (
              <div className="absolute inset-0 bg-[#1e293b]/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                 <Loader2 className="animate-spin text-brand-500 mb-2" size={32} />
                 <p className="text-white font-medium">Starting chat...</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SearchModal;
