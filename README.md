# TikTik - Complete Live Streaming Platform

एक पूर्ण YouTube-जैसा Live Streaming प्लेटफॉर्म Vanilla JavaScript + Firebase के साथ।

## 🎯 Features

### Live Streaming
- ✅ **Go Live** - Webcam/screen capture streaming
- ✅ **Real-time Streaming** - Chunk-based streaming via Firebase Storage (3-6 second latency)
- ✅ **Live Preview** - Real-time webcam preview before going live
- ✅ **Stream Key** - Automatic stream key generation
- ✅ **Custom Thumbnails** - Upload custom thumbnails या webcam से capture करें
- ✅ **Stream Controls** - End Stream / Delete Stream (केवल streamer के लिए)
- ✅ **Automatic Recording** - सभी streams automatically save होते हैं

### Real-time Chat
- ✅ **Live Chat** - Firestore-powered real-time chat
- ✅ **Spam Prevention** - 2-second cooldown between messages
- ✅ **Auto-scroll** - नए messages के साथ automatically scroll
- ✅ **User Authentication** - Google login required for chat

### Live Stream Discovery
- ✅ **LIVE Now Section** - Home page पर active streams
- ✅ **Animated LIVE Badge** - Red pulsing badge
- ✅ **Viewer Count** - Real-time viewer count
- ✅ **Live Page** - सभी live streams की list

### UI/UX
- ✅ **YouTube-style Design** - Professional red & white theme
- ✅ **Dark Mode** - Complete dark theme support
- ✅ **Responsive** - Mobile, tablet, desktop support
- ✅ **PWA Ready** - Install करें mobile/desktop पर

## 🚀 Quick Start

### 1. Firebase Setup

1. [Firebase Console](https://console.firebase.google.com/) पर जाएं
2. New project बनाएं
3. Enable **Authentication** (Google Sign-in)
4. Enable **Firestore Database**
5. Enable **Storage**
6. Copy Firebase config और environment variables में डालें

### 2. Install Dependencies

```bash
# कोई dependencies नहीं - Pure Vanilla JS!
# सिर्फ Python 3 चाहिए server के लिए
```

### 3. Configure Environment

`.env` file बनाएं (`.env.example` से copy करें):

```bash
cp .env.example .env
# अपनी Firebase credentials add करें
```

### 4. Deploy Firestore Rules

Firebase Console → Firestore → Rules में `firestore.rules` copy करें

### 5. Start Server

```bash
python3 server.py
```

Server start हो जाएगा: http://localhost:5000

## 📁 Project Structure

```
tiktik-live-streaming/
├── index.html              # Main HTML structure
├── script.js               # Complete JavaScript functionality
├── style.css               # YouTube-style CSS
├── server.py               # Python HTTP server
├── manifest.json           # PWA manifest
├── firestore.rules         # Firestore security rules
├── .env.example            # Environment variables template
├── api/
│   └── get-config.js       # Firebase config endpoint
└── README.md               # This file
```

## 🎨 Features in Detail

### Go Live Modal
- Webcam preview with camera/mic toggle
- Stream title और description
- Custom thumbnail upload
- Stream key generation और copy
- "Go Live" button

### Live Streaming Technology
**Chunk-based Real-time Streaming:**
1. Streamer के browser में MediaRecorder हर 3 seconds में video chunk record करता है
2. प्रत्येक chunk automatically Firebase Storage में upload होता है
3. Firestore में latest chunk URL update होता है real-time में
4. Viewers के browser Firestore को listen करते हैं और नए chunks download + play करते हैं
5. Stream end होने पर, पूरी recording automatically merge होकर save हो जाती है

**Latency:** 3-6 seconds (acceptable for most live streaming use cases)

### Live Player Page
- Full-screen video player with real-time chunk playback
- Real-time viewer count (auto-updates हर second)
- Stream controls (End/Delete) - केवल streamer को दिखते हैं
- Live chat panel (right side) - Firestore real-time updates
- Auto-updating chat messages with timestamps
- Auto-scroll to latest message

### Live Streams Display
- Animated red LIVE badge (pulsing effect)
- Real-time viewer count overlay
- Streamer name और avatar
- Click to join stream instantly
- Grid layout (responsive for all devices)

## 🔧 Firestore Collections

### `liveStreams`
```javascript
{
  title: string,
  description: string,
  streamKey: string,
  thumbnailUrl: string,
  uploaderId: string,
  uploaderName: string,
  uploaderPhoto: string,
  isLive: boolean,
  viewers: number,
  startTime: timestamp,
  endTime: timestamp | null,
  videoUrl: string | null,
  latestChunkUrl: string,        // Real-time streaming
  latestChunkIndex: number,       // Chunk sequence number
  lastChunkTime: timestamp        // Last chunk upload time
}
```

### `liveChats`
```javascript
{
  streamId: string,
  userId: string,
  userName: string,
  userPhoto: string,
  message: string,
  timestamp: timestamp
}
```

## 🎯 How to Use

### As a Streamer

1. **Login** करें Google से
2. **Go Live** button पर click करें
3. **Camera/Mic** allow करें
4. **Stream Title** और description enter करें
5. (Optional) **Thumbnail** upload करें
6. **Go Live** button दबाएं
7. Stream start! अपने viewers के साथ chat करें
8. **End Stream** जब finish हो

### As a Viewer

1. Home page पर **LIVE Now** section देखें
2. किसी stream पर **click** करें
3. Live video देखें
4. **Login** करें chat करने के लिए
5. Messages भेजें real-time में

## 🎨 Customization

### Change Theme Color

`style.css` में:
```css
:root {
  --accent-color: #ff0000;  /* Red - Change to your color */
}
```

### Modify Stream Settings

`script.js` में:
```javascript
// Chat cooldown time (2000ms = 2 seconds)
setTimeout(() => {
  this.chatCooldown = false;
}, 2000);
```

## 🔐 Security

- ✅ Firebase config server-side से load होता है
- ✅ Firestore security rules लागू हैं
- ✅ केवल authenticated users chat कर सकते हैं
- ✅ केवल stream owner end/delete कर सकता है
- ✅ CORS headers सही से configured हैं

## 📱 PWA Features

- Install करें app को mobile/desktop पर
- Offline support (service worker के साथ)
- App icon और splash screen

## 🌐 Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Manual Deployment

किसी भी static hosting पर deploy करें:
- Vercel
- Netlify
- Firebase Hosting
- GitHub Pages

## 🛠️ Troubleshooting

### Firebase Not Initializing

- Check `.env` file में सभी credentials सही हैं
- Firebase Console में Authentication enable है
- Firestore Database बना हुआ है

### Webcam Not Working

- Browser permissions check करें
- HTTPS पर run करें (production में)
- Camera already use में नहीं है

### Chat Not Working

- User logged in है check करें
- Firestore rules deploy किए हैं
- Network connection stable है

## 📄 License

MIT License - Free to use और modify करें

## 🙏 Credits

Built with ❤️ using:
- Firebase (Auth, Firestore, Storage)
- Vanilla JavaScript
- Pure CSS
- Python HTTP Server

---

**Happy Streaming! 🎥🔴**
