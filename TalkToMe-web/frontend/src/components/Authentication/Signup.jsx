import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmpassword, setConfirmpassword] = useState('');
  const [pic, setPic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const postDetails = (pics) => {
    setLoading(true);
    if (pics === undefined) {
      setError('Please select an image');
      setLoading(false);
      return;
    }
    if (pics.type === 'image/jpeg' || pics.type === 'image/png') {
      const data = new FormData();
      data.append('file', pics);
      data.append('upload_preset', 'chat-app'); // Remember to create this preset in Cloudinary!
      data.append('cloud_name', 'drnp7fcux'); 
      fetch('https://api.cloudinary.com/v1_1/drnp7fcux/image/upload', {
        method: 'post',
        body: data,
      })
        .then((res) => res.json())
        .then((data) => {
          setPic(data.secure_url || data.url);
          setLoading(false);
        })
        .catch((err) => {
          console.log(err);
          setLoading(false);
        });
    } else {
      setError('Please select an image (jpeg or png)');
      setLoading(false);
      return;
    }
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmpassword) {
      setError('Please fill all the fields');
      return;
    }
    if (password !== confirmpassword) {
      setError('Passwords do not match');
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
        '/api/user',
        {
          name,
          email,
          password,
          pic,
        },
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
    <form onSubmit={submitHandler} className="flex flex-col gap-3">
      {error && (
        <div className="rounded bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-white/90">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-white/20 bg-white/5 p-2 text-white placeholder-white/50 outline-none focus:border-purple-400 focus:bg-white/10 transition-colors"
          placeholder="Enter your name"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-white/90">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-white/20 bg-white/5 p-2 text-white placeholder-white/50 outline-none focus:border-purple-400 focus:bg-white/10 transition-colors"
          placeholder="Enter your email"
        />
      </div>

      <div className="flex gap-2">
        <div className="w-1/2">
          <label className="mb-1 block text-sm font-medium text-white/90">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-white/5 p-2 text-white placeholder-white/50 outline-none focus:border-purple-400 focus:bg-white/10 transition-colors"
            placeholder="Password"
          />
        </div>
        <div className="w-1/2">
          <label className="mb-1 block text-sm font-medium text-white/90">Confirm</label>
          <input
            type="password"
            value={confirmpassword}
            onChange={(e) => setConfirmpassword(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-white/5 p-2 text-white placeholder-white/50 outline-none focus:border-purple-400 focus:bg-white/10 transition-colors"
            placeholder="Confirm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-white/90">Profile Picture (Optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => postDetails(e.target.files[0])}
          className="w-full text-sm text-white/70 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/20"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-4 flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 p-3 font-semibold text-white shadow-lg transition-all hover:opacity-90 disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Sign Up'}
      </button>
    </form>
  );
};

export default Signup;
