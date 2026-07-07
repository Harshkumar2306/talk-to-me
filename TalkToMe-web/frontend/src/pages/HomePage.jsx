import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Login from '../components/Authentication/Login';
import Signup from '../components/Authentication/Signup';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Download, ShieldCheck, Zap, Users } from 'lucide-react';

const HomePage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [showAuthOnMobile, setShowAuthOnMobile] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('userInfo'));
    if (user) {
      navigate('/chats');
    }
  }, [navigate]);

  const AuthBox = (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.1 }}
      className="w-full"
    >
      <div className="bg-[#1e293b]/80 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl w-full">
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
  );

  return (
    <div className="flex flex-1 h-full w-full bg-[#0f172a] text-white overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-600/30 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-pink-600/20 blur-[120px]" />

      <div className="container mx-auto flex flex-col lg:flex-row items-center justify-center p-6 z-10 h-full overflow-y-auto gap-12 lg:gap-24">
        
        {/* Left Side: Branding & Info */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left max-w-xl gap-6">
          <div className="bg-[#1e293b]/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl w-full flex flex-col items-center lg:items-start">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full"
          >
            <div className="flex flex-row items-center justify-center lg:justify-start gap-4 mb-6">
              <div className="inline-flex items-center justify-center shadow-2xl rounded-2xl overflow-hidden border border-white/10">
                <img src="/logo1.png" alt="TalkToMe Logo" className="w-10 h-10 md:w-12 md:h-12 object-cover" />
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                TalkTo<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-400">Me</span>
              </h1>
            </div>
            <p className="text-gray-300 text-base md:text-lg leading-relaxed mb-8">
              Experience seamless, secure, and lightning-fast communication. Connect with your friends, share moments, and stay in touch wherever you go.
            </p>
            
            {!showAuthOnMobile && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setShowAuthOnMobile(true)}
                className="lg:hidden w-full mt-2 px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-full font-bold transition-all shadow-lg shadow-brand-500/30"
              >
                Continue to Web
              </motion.button>
            )}
          </motion.div>
          </div>

          {/* Mobile Auth Box */}
          <div className={`lg:hidden w-full flex justify-center ${showAuthOnMobile ? 'block' : 'hidden'}`}>
            {AuthBox}
          </div>

          <div className="bg-[#1e293b]/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl w-full flex flex-col items-center lg:items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 w-full"
          >
            <div className="flex flex-col items-center lg:items-start gap-2">
              <div className="p-3 bg-brand-500/20 rounded-2xl text-brand-400">
                <Zap size={24} />
              </div>
              <h3 className="font-semibold text-white">Real-time</h3>
              <p className="text-sm text-gray-400 text-center lg:text-left">Instant messaging with zero latency.</p>
            </div>
            <div className="flex flex-col items-center lg:items-start gap-2">
              <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400">
                <ShieldCheck size={24} />
              </div>
              <h3 className="font-semibold text-white">Secure</h3>
              <p className="text-sm text-gray-400 text-center lg:text-left">Your conversations are protected.</p>
            </div>
            <div className="flex flex-col items-center lg:items-start gap-2">
              <div className="p-3 bg-pink-500/20 rounded-2xl text-pink-400">
                <Users size={24} />
              </div>
              <h3 className="font-semibold text-white">Group Chats</h3>
              <p className="text-sm text-gray-400 text-center lg:text-left">Stay connected with everyone.</p>
            </div>
          </motion.div>

          {/* Download Android App Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <a 
              href="https://github.com/Harshkumar2306/talk-to-me/releases/latest/download/TalkToMe.apk" 
              download="TalkToMe.apk"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-brand-600 hover:bg-brand-500 rounded-full transition-all duration-300 shadow-lg shadow-brand-500/30 group w-full lg:w-auto"
            >
              <Smartphone className="text-white" size={22} />
              <span className="text-base font-bold text-white">Download App for Android</span>
              <Download className="text-white opacity-80 group-hover:opacity-100 transition-opacity" size={20} />
            </a>
          </motion.div>
          </div>
        </div>

        {/* Right Side: Auth Box (Desktop Only) */}
        <div className="hidden lg:flex flex-1 w-full max-w-md justify-center">
          {AuthBox}
        </div>

      </div>
    </div>
  );
};

export default HomePage;
