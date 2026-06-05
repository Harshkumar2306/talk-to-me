# TalkToMe 💬

A modern, real-time chat application built with the MERN stack (MongoDB, Express, React, Node.js) and WebRTC for group audio/video calls.

## ✨ Features

- **Real-Time Messaging**: Instant delivery of messages using Socket.io.
- **WhatsApp-Style Group Calls**: Fully functional group video and audio calls with custom UI and WebRTC mesh topology.
- **Online Presence**: Real-time tracking and indicator of who is online and offline.
- **Typing Indicators**: See when someone is typing.
- **Read Receipts**: Single tick (sent), double gray tick (delivered), double blue tick (read).
- **File & Media Sharing**: Upload images, audio, and documents (powered by Cloudinary).
- **Voice Notes**: Built-in audio recorder to send quick voice messages.
- **Group Chats**: Create groups, manage participants, change group icons and names.
- **Responsive UI**: Built with Tailwind CSS, features a beautiful dark/light mode, mobile-first design, and fluid Framer Motion animations.

## 🛠️ Tech Stack

**Frontend**
- React (Vite)
- Tailwind CSS
- Framer Motion
- Socket.io-client
- Simple-Peer (WebRTC)
- Zustand / React Context

**Backend**
- Node.js & Express
- MongoDB & Mongoose
- Socket.io
- JWT Authentication
- Cloudinary (for file storage)

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB Atlas account
- Cloudinary account

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Harshkumar2306/talk-to-me.git
   cd talk-to-me
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` folder:
   ```env
   PORT=5001
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   NODE_ENV=development
   ```
   Start the backend:
   ```bash
   npm start
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   ```
   Create a `.env` file in the `frontend` folder:
   ```env
   VITE_BACKEND_URL=http://127.0.0.1:5001
   ```
   Start the frontend:
   ```bash
   npm run dev
   ```

## 📸 Screenshots
*(Coming soon)*

## 🤝 Contributing
Contributions, issues, and feature requests are welcome!

## 📝 License
This project is licensed under the MIT License.
