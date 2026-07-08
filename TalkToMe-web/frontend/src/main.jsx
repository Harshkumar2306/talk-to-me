import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import ChatProvider from './Context/ChatProvider.jsx';
import { CallProvider } from './Context/CallProvider.jsx';
import { GroupCallProvider } from './Context/GroupCallProvider.jsx';
import { ThemeProvider } from './Context/ThemeProvider.jsx';
import axios from 'axios';
axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL || 'https://talk-to-me-1-jhl1.onrender.com';
ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ChatProvider>
      <ThemeProvider>
        <CallProvider>
          <GroupCallProvider>
            <App />
          </GroupCallProvider>
        </CallProvider>
      </ThemeProvider>
    </ChatProvider>
  </BrowserRouter>
);
