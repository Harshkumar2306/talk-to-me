import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill all the fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const config = {
        headers: {
          'Content-type': 'application/json',
        },
      };

      const { data } = await axios.post(
        '/api/user/login',
        { email, password },
        config
      );

      localStorage.setItem('userInfo', JSON.stringify(data));
      navigate('/chats');
    } catch (error) {
      setError(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
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
        onClick={() => {
          setEmail('guest@example.com');
          setPassword('123456');
        }}
        className="flex w-full items-center justify-center rounded-lg bg-white/10 p-3 font-semibold text-white transition-all hover:bg-white/20"
      >
        Get Guest User Credentials
      </button>
    </form>
  );
};

export default Login;
