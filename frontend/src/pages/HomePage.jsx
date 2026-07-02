import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Login from '../components/Authentication/Login';
import Signup from '../components/Authentication/Signup';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare } from 'lucide-react';


const HomePage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('userInfo'));
    if (user) {
      navigate('/chats');
    }
  }, [navigate]);

  return (
    <div className="flex flex-1 h-full w-full bg-[#0f172a] text-white overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-600/30 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-pink-600/20 blur-[120px]" />

      <div className="container mx-auto flex flex-col items-center justify-center p-6 z-10 h-full overflow-y-auto">

        {/* App Branding */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8 text-center"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-brand-500/20 to-purple-500/20 rounded-3xl mb-4 backdrop-blur-sm border border-white/10 shadow-xl">
            <MessageSquare size={48} className="text-brand-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2">
            TalkTo<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-400">Me</span>
          </h1>
        </motion.div>

        {/* Auth Box */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="w-full max-w-md"
        >
          <div className="bg-[#1e293b]/80 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
            <div className="flex rounded-full bg-black/40 p-1 mb-8 relative">
              <motion.div
                className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-brand-600 rounded-full shadow-md"
                animate={{ x: tab === 'login' ? 0 : '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
              <button
                onClick={() => setTab('login')}
                className={`w-1/2 py-3 rounded-full text-sm font-semibold z-10 transition-colors ${
                  tab === 'login' ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Log In
              </button>
              <button
                onClick={() => setTab('signup')}
                className={`w-1/2 py-3 rounded-full text-sm font-semibold z-10 transition-colors ${
                  tab === 'signup' ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: tab === 'login' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: tab === 'login' ? 20 : -20 }}
                transition={{ duration: 0.2 }}
              >
                {tab === 'login' ? <Login /> : <Signup />}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;
