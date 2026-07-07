import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const GUEST_EMAIL = 'guest@example.com';
const GUEST_PASSWORD = '123456';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const doLogin = async (loginEmail, loginPassword) => {
    if (!loginEmail || !loginPassword) {
      setError('Please fill all the fields');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const { data } = await axios.post(
        '/api/user/login',
        { email: loginEmail, password: loginPassword },
        { headers: { 'Content-type': 'application/json' } }
      );
      localStorage.setItem('userInfo', JSON.stringify(data));
      navigate('/chats');
    } catch (error) {
      setError(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    await doLogin(email, password);
  };

  const guestLogin = async () => {
    setEmail(GUEST_EMAIL);
    setPassword(GUEST_PASSWORD);
    await doLogin(GUEST_EMAIL, GUEST_PASSWORD);
  };

  return (
    <form onSubmit={submitHandler} className="flex flex-col gap-4">
      {error && (
        <div className="rounded bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
          {error}
        </div>
      )}
      
      <div>
        <label className="mb-1 block text-sm font-medium text-white/90">Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-white/20 bg-white/5 p-3 text-white placeholder-white/50 outline-none focus:border-purple-400 focus:bg-white/10 transition-colors"
          placeholder="Enter your email"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-white/90">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-white/20 bg-white/5 p-3 text-white placeholder-white/50 outline-none focus:border-purple-400 focus:bg-white/10 transition-colors"
          placeholder="Enter password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-4 flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 p-3 font-semibold text-white shadow-lg transition-all hover:opacity-90 disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Login'}
      </button>

      <button
        type="button"
        disabled={loading}
        onClick={guestLogin}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 p-3 font-semibold text-white transition-all hover:bg-white/20 disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin h-4 w-4" /> : '⚡ Continue as Guest'}
      </button>
    </form>
  );
};

export default Login;
