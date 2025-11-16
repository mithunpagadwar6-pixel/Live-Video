# TikTik - Live Streaming Platform

## Overview

TikTik is a complete YouTube-style live streaming and video sharing platform built with vanilla JavaScript and Firebase. The platform enables users to stream live video, upload regular videos and shorts, participate in real-time chat, and discover active streams. It features Google authentication, real-time database synchronization, cloud storage for video files, and a responsive dark/light theme UI. The application is designed as a Progressive Web App (PWA) for installation on mobile and desktop devices.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**: Pure vanilla JavaScript (ES6+) with zero frontend frameworks. Firebase SDK v10.7.1 (compat mode) provides authentication, Firestore database, and Storage services. The application uses class-based architecture centered around `TikTikLiveApp` class for state management.

**Authentication Flow**: Firebase Authentication handles Google Sign-In exclusively. Firebase configuration is fetched securely from backend `/api/get-config` endpoint rather than being hardcoded in frontend. After successful authentication, user state persists across sessions using Firebase's built-in token management.

**Live Streaming Architecture**: Uses WebRTC MediaRecorder API for capturing webcam/screen video. Streams are recorded in chunks and uploaded to Firebase Storage in real-time with 3-6 second latency. Each live stream generates a unique stream key and maintains active status in Firestore. Viewers watch streams by loading video chunks progressively from Firebase Storage.

**Real-time Features**: Firestore real-time listeners enable live chat with automatic scrolling, live viewer counts, and instant stream discovery updates. Chat implements 2-second cooldown to prevent spam. All real-time subscriptions are properly cleaned up on component unmount to prevent memory leaks.

**Video Types**: Three video formats supported - regular uploads, short-form vertical videos (TikTok-style), and live streams. Live streams automatically save as recordings after ending. Custom thumbnails can be uploaded or captured from webcam preview.

**Progressive Web App**: Service worker implements cache-first strategy for static assets (HTML, CSS, JS, fonts, icons). Manifest.json defines app metadata with inline SVG icons. App is installable on mobile/desktop with standalone display mode and portrait-primary orientation.

**UI Design**: YouTube-inspired responsive layout with fixed 60px header, collapsible sidebar (250px expanded, 70px collapsed), and flexible content grid. CSS custom properties enable seamless dark/light theme switching. Animated LIVE badges with red pulsing effect indicate active streams.

**State Management**: Application state includes current user session, active page navigation, live stream status, chat subscriptions, webcam stream handles, and MediaRecorder instances. State is managed through class properties with proper cleanup on logout/navigation.

### Backend Architecture

**Server Options**: Two backend implementations provided - Python HTTP server (`server.py`) for local development and Vercel serverless function (`api/get-config.js`) for production deployment. Both serve identical Firebase configuration endpoint.

**Python Server**: Simple HTTP server extending `SimpleHTTPRequestHandler` to serve static files and handle `/api/get-config` endpoint. Adds CORS headers and cache-control directives. Reads Firebase credentials from environment variables. Runs on port 5000.

**Serverless Function**: Node.js function deployed on Vercel handles `/api/get-config` endpoint. Returns Firebase configuration object from environment variables. Implements CORS headers for cross-origin requests during development.

**API Security**: Firebase configuration keys (apiKey, authDomain, projectId, etc.) are stored as environment variables on backend. Frontend never contains hardcoded secrets. The `/api/get-config` endpoint only returns client-safe Firebase configuration values needed for Firebase SDK initialization.

**Authentication Strategy**: Backend does not verify Firebase tokens since all data access goes directly from client to Firebase services. Firestore Security Rules enforce authorization at database level. Storage Security Rules control file upload/download permissions.

### External Dependencies

**Firebase Services**:
- **Authentication**: Google Sign-in provider with OAuth 2.0 flow
- **Firestore Database**: Real-time NoSQL database storing video metadata, user profiles, chat messages, stream status
- **Firebase Storage**: Cloud storage for video chunks, thumbnails, and recorded streams
- **Firebase SDK**: Client library (v10.7.1 compat) loaded via CDN

**Content Delivery**:
- **Font Awesome v6.0.0**: Icon library loaded via CDN for UI icons
- **Firebase Hosting CDN**: Delivers Firebase SDK scripts globally

**Third-party Integrations**:
- **Google OAuth**: Handles user authentication via Firebase Auth
- **WebRTC APIs**: Browser-native MediaRecorder, getUserMedia for webcam/screen capture
- **Service Worker API**: Browser-native PWA functionality

**Database Schema** (Firestore Collections):
- `videos`: Video metadata with fields - title, description, videoUrl, thumbnailUrl, uploaderId, uploaderName, uploaderPhoto, uploadDate, views, likes, type (regular/short/live), isLive, streamKey
- `chats`: Real-time chat messages with fields - streamId, userId, userName, userPhoto, message, timestamp
- `users`: User profiles with fields - uid, displayName, email, photoURL, createdAt

**Storage Structure** (Firebase Storage):
- `/videos/{videoId}/`: Contains video chunks and final recordings
- `/thumbnails/{videoId}.jpg`: Custom uploaded thumbnails
- `/streams/{streamKey}/chunks/`: Live stream video chunks uploaded in real-time

**Environment Variables Required**:
- `FIREBASE_API_KEY`: Firebase project API key
- `FIREBASE_AUTH_DOMAIN`: Firebase authentication domain
- `FIREBASE_PROJECT_ID`: Firebase project identifier
- `FIREBASE_STORAGE_BUCKET`: Firebase storage bucket name
- `FIREBASE_MESSAGING_SENDER_ID`: Firebase messaging sender ID
- `FIREBASE_APP_ID`: Firebase application ID

**Deployment Platform**: Designed for Vercel deployment with `vercel.json` configuration. Python server alternative for local development using `python3 -m http.server 5000`.