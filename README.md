# 🚀 TalkToMe: Real-Time Chat & Group Call Platform

An ultra-premium, real-time messaging and group video calling application built with the MERN stack and WebRTC. Designed with a WhatsApp-style interface, it features seamless multi-network NAT traversal for flawless calls on any connection.

Built using **MongoDB, Express, React, Node.js, Socket.io, and simple-peer**.

### 🌟 Live Demo
*(Replace these links with your actual deployed URLs)*
- 🌐 **Frontend:** https://talk-to-me.vercel.app/
- ⚙️ **Backend API:** https://talk-to-me.onrender.com

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph Frontend["Frontend (Vercel)"]
        UI["React Web App"]
        UI --> |"REST API"| API
        UI <--> |"WebSocket"| SOCKET
        UI <--> |"WebRTC (P2P)"| PEER["Other User's Browser"]
    end

    subgraph Backend["Backend (Render)"]
        API["Express Server"]
        SOCKET["Socket.io Signaling"]
        
        API --> |"Fetch/Store Data"| DB
        SOCKET --> |"Presence / Signals"| UI
    end

    subgraph Cloud["Cloud Services"]
        DB[("MongoDB Atlas")]
        CDN["Cloudinary (Images/Audio)"]
        TURN["Metered TURN Server"]
        
        UI --> |"Upload Media"| CDN
        UI -.-> |"TCP/UDP Relay"| TURN
        TURN -.-> |"NAT Traversal Fallback"| PEER
    end

    style Frontend fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    style Backend fill:#d1fae5,stroke:#10b981,color:#064e3b
    style Cloud fill:#fef3c7,stroke:#f59e0b,color:#78350f
