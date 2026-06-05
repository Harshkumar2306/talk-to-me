import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import messageRoutes from './routes/messageRoutes.js';

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json()); // to accept json data

import path from 'path';

app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/message', messageRoutes);

// Error Handling middlewares
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// ---------- DEPLOYMENT ----------
const __dirname = path.resolve();

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  // Use app.use as a catch-all for any unhandled routes (Express 5 safe)
  app.use((req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend', 'dist', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('API is running successfully');
  });
}
// --------------------------------

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server started on PORT ${PORT}`);
});

const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  console.log('Connected to socket.io');

  socket.on('setup', (userData) => {
    socket.join(userData._id);
    socket.emit('connected');
  });

  socket.on('join chat', (room) => {
    socket.join(room);
    console.log('User Joined Room: ' + room);
  });

  socket.on('typing', (room) => socket.in(room).emit('typing'));
  socket.on('stop typing', (room) => socket.in(room).emit('stop typing'));

  socket.on('new message', (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (!chat.users) return console.log('chat.users not defined');

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;
      socket.in(user._id).emit('message recieved', newMessageRecieved);
    });
  });

  // Real-time read receipts: broadcast to the whole chat room so sender's ticks turn blue
  socket.on('messages-seen', ({ chatId, seenBy, senderId }) => {
    // Broadcast to the entire chat room — every connected member gets updated ticks
    socket.in(chatId).emit('messages-seen', { chatId, seenBy });
    // Also notify a specific sender if provided (legacy support)
    if (senderId && senderId !== 'broadcast') {
      socket.in(senderId).emit('messages-seen', { chatId, seenBy });
    }
  });

  // WebRTC Signaling Events
  socket.on('call-user', (data) => {
    socket.in(data.userToCall).emit('incoming-call', {
      signal: data.signalData,
      from: data.from,
      name: data.name,
      type: data.type,
    });
  });

  socket.on('answer-call', (data) => {
    socket.in(data.to).emit('call-accepted', data.signal);
  });

  socket.on('end-call', (data) => {
    if (data.to) {
      socket.in(data.to).emit('call-ended');
    }
  });

  socket.off('setup', () => {
    console.log('USER DISCONNECTED');
    socket.leave(userData._id);
  });
});
