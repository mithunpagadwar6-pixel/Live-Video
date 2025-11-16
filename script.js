// TikTik - Complete Live Streaming Platform
// Firebase Configuration
let firebaseApp = null;
let firebaseAuth = null;
let firestore = null;
let storage = null;

// Initialize Firebase
async function initializeFirebase() {
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded');
        return false;
    }

    try {
        const response = await fetch('/api/get-config');
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error('Failed to load Firebase config');
        }

        firebaseApp = firebase.initializeApp(data.firebase);
        firebaseAuth = firebase.auth();
        firestore = firebase.firestore();
        storage = firebase.storage();
        console.log('Firebase initialized successfully');
        return true;
    } catch (error) {
        console.error('Firebase initialization error:', error);
        return false;
    }
}

class TikTikLiveApp {
    constructor() {
        this.currentUserId = null;
        this.currentUser = null;
        this.currentPage = 'home';
        this.currentLiveStream = null;
        this.chatUnsubscribe = null;
        this.liveStreamsUnsubscribe = null;
        this.webcamStream = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.chatCooldown = false;
        this.streamKey = null;

        this.init();
    }

    async init() {
        await initializeFirebase();
        this.setupEventListeners();
        this.setupAuthListener();
        await this.loadLiveStreams();
        this.startLiveStreamMonitoring();
    }

    setupAuthListener() {
        if (!firebaseAuth) return;

        firebaseAuth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUserId = user.uid;
                this.currentUser = user;
                this.showUserProfile(user);
                await this.loadUserContent();
            } else {
                this.currentUserId = null;
                this.currentUser = null;
                this.showLoginButton();
            }
        });
    }

    showUserProfile(user) {
        document.getElementById('googleLoginBtn').style.display = 'none';
        const profileContainer = document.getElementById('profile-container');
        profileContainer.style.display = 'block';
        
        const profilePic = document.getElementById('profile-pic');
        const profileAvatar = document.getElementById('profile-avatar');
        const profileName = document.getElementById('profile-name');
        const profileEmail = document.getElementById('profile-email');
        
        profilePic.src = user.photoURL || 'https://via.placeholder.com/36';
        profileAvatar.src = user.photoURL || 'https://via.placeholder.com/40';
        profileName.textContent = user.displayName || 'User';
        profileEmail.textContent = user.email || '';

        // Toggle profile menu on click
        profilePic.onclick = () => {
            const menu = document.getElementById('profile-menu');
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        };
    }

    showLoginButton() {
        document.getElementById('googleLoginBtn').style.display = 'block';
        document.getElementById('profile-container').style.display = 'none';
    }

    setupEventListeners() {
        // Google Login
        document.getElementById('googleLoginBtn').addEventListener('click', () => this.signInWithGoogle());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToPage(item.dataset.page);
            });
        });

        // Create button
        document.getElementById('createBtn').addEventListener('click', () => this.openCreateModal());
        document.getElementById('closeCreateBtn').addEventListener('click', () => this.closeCreateModal());
        
        // Go Live buttons
        document.getElementById('goLiveOption').addEventListener('click', () => {
            this.closeCreateModal();
            this.openGoLiveModal();
        });
        
        if (document.getElementById('goLiveTopBtn')) {
            document.getElementById('goLiveTopBtn').addEventListener('click', () => this.openGoLiveModal());
        }

        // Go Live Modal
        document.getElementById('closeGoLiveBtn').addEventListener('click', () => this.closeGoLiveModal());
        document.getElementById('cancelGoLiveBtn').addEventListener('click', () => this.closeGoLiveModal());
        document.getElementById('startStreamBtn').addEventListener('click', () => this.startLiveStream());
        
        // Webcam controls
        document.getElementById('toggleWebcamBtn').addEventListener('click', () => this.toggleWebcam());
        document.getElementById('toggleMicBtn').addEventListener('click', () => this.toggleMicrophone());
        
        // Stream key copy
        document.getElementById('copyStreamKeyBtn').addEventListener('click', () => this.copyStreamKey());
        
        // Thumbnail upload
        document.getElementById('streamThumbnail').addEventListener('change', (e) => this.handleThumbnailUpload(e));

        // Live Chat
        document.getElementById('sendChatBtn').addEventListener('click', () => this.sendChatMessage());
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });

        // Stream Controls
        document.getElementById('endStreamBtn').addEventListener('click', () => this.endStream());
        document.getElementById('deleteStreamBtn').addEventListener('click', () => this.deleteStream());

        // Sidebar toggle
        document.getElementById('menuBtn').addEventListener('click', () => this.toggleSidebar());

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Channel tabs
        document.querySelectorAll('.channel-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchChannelTab(e.target.dataset.tab));
        });

        // Close modals on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
            
            // Close profile menu on outside click
            const profileMenu = document.getElementById('profile-menu');
            const profileContainer = document.getElementById('profile-container');
            if (!profileContainer.contains(e.target)) {
                profileMenu.style.display = 'none';
            }
        });
    }

    async signInWithGoogle() {
        if (!firebaseAuth) {
            alert('Firebase not initialized');
            return;
        }

        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            await firebaseAuth.signInWithPopup(provider);
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed: ' + error.message);
        }
    }

    async logout() {
        if (firebaseAuth) {
            await firebaseAuth.signOut();
            this.navigateToPage('home');
        }
    }

    // ========== LIVE STREAMING FUNCTIONS ==========

    generateStreamKey(userId) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        return `${userId}_${timestamp}_${random}`;
    }

    async openGoLiveModal() {
        if (!this.currentUserId) {
            alert('Please login to go live');
            return;
        }

        document.getElementById('goLiveModal').classList.add('active');
        
        // Generate stream key
        this.streamKey = this.generateStreamKey(this.currentUserId);
        document.getElementById('streamKey').textContent = this.streamKey;
        
        // Start webcam preview
        await this.startWebcamPreview();
    }

    closeGoLiveModal() {
        document.getElementById('goLiveModal').classList.remove('active');
        this.stopWebcamPreview();
    }

    async startWebcamPreview() {
        try {
            this.webcamStream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            document.getElementById('webcamPreview').srcObject = this.webcamStream;
        } catch (error) {
            console.error('Webcam access error:', error);
            alert('Could not access camera/microphone');
        }
    }

    stopWebcamPreview() {
        if (this.webcamStream) {
            this.webcamStream.getTracks().forEach(track => track.stop());
            this.webcamStream = null;
        }
    }

    toggleWebcam() {
        if (!this.webcamStream) return;
        const videoTrack = this.webcamStream.getVideoTracks()[0];
        videoTrack.enabled = !videoTrack.enabled;
        
        const btn = document.getElementById('toggleWebcamBtn');
        btn.innerHTML = videoTrack.enabled ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
    }

    toggleMicrophone() {
        if (!this.webcamStream) return;
        const audioTrack = this.webcamStream.getAudioTracks()[0];
        audioTrack.enabled = !audioTrack.enabled;
        
        const btn = document.getElementById('toggleMicBtn');
        btn.innerHTML = audioTrack.enabled ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
    }

    copyStreamKey() {
        const streamKey = document.getElementById('streamKey').textContent;
        navigator.clipboard.writeText(streamKey);
        alert('Stream key copied to clipboard!');
    }

    async handleThumbnailUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('thumbnailPreview');
            preview.innerHTML = `<img src="${e.target.result}" alt="Thumbnail">`;
        };
        reader.readAsDataURL(file);
    }

    async startLiveStream() {
        const title = document.getElementById('streamTitle').value.trim();
        if (!title) {
            alert('Please enter a stream title');
            return;
        }

        const description = document.getElementById('streamDescription').value.trim();
        const thumbnailFile = document.getElementById('streamThumbnail').files[0];
        
        try {
            let thumbnailUrl = 'https://via.placeholder.com/640x360?text=LIVE';
            
            // Upload thumbnail if provided
            if (thumbnailFile) {
                thumbnailUrl = await this.uploadThumbnail(thumbnailFile);
            } else {
                // Capture frame from webcam as thumbnail
                thumbnailUrl = await this.captureWebcamFrame();
            }

            // Create live stream document in Firestore
            const streamData = {
                title,
                description,
                streamKey: this.streamKey,
                thumbnailUrl,
                uploaderId: this.currentUserId,
                uploaderName: this.currentUser.displayName || 'Anonymous',
                uploaderPhoto: this.currentUser.photoURL || '',
                isLive: true,
                viewers: 0,
                startTime: firebase.firestore.FieldValue.serverTimestamp(),
                endTime: null,
                videoUrl: null,
                latestChunkUrl: null,
                latestChunkIndex: -1,
                lastChunkTime: firebase.firestore.FieldValue.serverTimestamp()
            };

            const streamRef = await firestore.collection('liveStreams').add(streamData);
            
            // Start MediaRecorder for recording
            this.startRecording(streamRef.id);
            
            // Navigate to live player page
            this.closeGoLiveModal();
            this.viewLiveStream(streamRef.id);
            
        } catch (error) {
            console.error('Error starting live stream:', error);
            alert('Failed to start live stream');
        }
    }

    async captureWebcamFrame() {
        const video = document.getElementById('webcamPreview');
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        // Convert to blob and upload
        return new Promise((resolve) => {
            canvas.toBlob(async (blob) => {
                const thumbnailUrl = await this.uploadThumbnailBlob(blob);
                resolve(thumbnailUrl);
            }, 'image/jpeg', 0.8);
        });
    }

    async uploadThumbnail(file) {
        if (!storage || !this.currentUserId) return null;
        
        const fileName = `thumbnails/${this.currentUserId}_${Date.now()}.jpg`;
        const storageRef = storage.ref(fileName);
        await storageRef.put(file);
        return await storageRef.getDownloadURL();
    }

    async uploadThumbnailBlob(blob) {
        if (!storage || !this.currentUserId) return 'https://via.placeholder.com/640x360?text=LIVE';
        
        const fileName = `thumbnails/${this.currentUserId}_${Date.now()}.jpg`;
        const storageRef = storage.ref(fileName);
        await storageRef.put(blob);
        return await storageRef.getDownloadURL();
    }

    startRecording(streamId) {
        if (!this.webcamStream) return;

        this.recordedChunks = [];
        this.chunkCounter = 0; // Dedicated synchronous counter
        this.uploadQueue = []; // Queue for uploads to prevent race conditions
        
        try {
            // Use webm format for better browser compatibility
            const options = { mimeType: 'video/webm;codecs=vp8,opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm';
            }
            
            this.mediaRecorder = new MediaRecorder(this.webcamStream, options);

            // Upload chunks in real-time for live streaming
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                    
                    // Increment counter SYNCHRONOUSLY before async upload
                    const chunkIndex = this.chunkCounter++;
                    
                    // Queue upload (don't await to prevent blocking)
                    this.uploadQueue.push({
                        streamId,
                        data: event.data,
                        index: chunkIndex
                    });
                    
                    // Process upload queue
                    this.processUploadQueue();
                }
            };

            this.mediaRecorder.onstop = () => {
                this.saveRecording(streamId);
            };

            // Record chunks every 3 seconds for real-time streaming
            this.mediaRecorder.start(3000);
        } catch (error) {
            console.error('MediaRecorder error:', error);
        }
    }

    async processUploadQueue() {
        // Prevent concurrent processing
        if (this.isProcessingUploads) return;
        
        this.isProcessingUploads = true;
        
        while (this.uploadQueue.length > 0) {
            const upload = this.uploadQueue.shift();
            
            try {
                await this.uploadStreamChunk(upload.streamId, upload.data, upload.index);
            } catch (error) {
                console.error('Error uploading chunk:', error);
                // Don't retry - just move to next chunk
            }
        }
        
        this.isProcessingUploads = false;
    }

    async uploadStreamChunk(streamId, chunk, chunkIndex) {
        if (!storage || !this.currentUserId) return;
        
        try {
            const fileName = `live-chunks/${streamId}/chunk_${chunkIndex}.webm`;
            const storageRef = storage.ref(fileName);
            await storageRef.put(chunk);
            const chunkUrl = await storageRef.getDownloadURL();
            
            // Update Firestore with latest chunk URL for viewers
            await firestore.collection('liveStreams').doc(streamId).update({
                latestChunkUrl: chunkUrl,
                latestChunkIndex: chunkIndex,
                lastChunkTime: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error uploading chunk:', error);
        }
    }

    async saveRecording(streamId) {
        if (this.recordedChunks.length === 0) return;

        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const fileName = `recordings/${streamId}.webm`;
        
        try {
            const storageRef = storage.ref(fileName);
            await storageRef.put(blob);
            const videoUrl = await storageRef.getDownloadURL();
            
            // Update stream document with video URL
            await firestore.collection('liveStreams').doc(streamId).update({
                videoUrl,
                endTime: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error saving recording:', error);
        }
    }

    async endStream() {
        if (!this.currentLiveStream) return;

        if (confirm('Are you sure you want to end this live stream?')) {
            try {
                // Stop MediaRecorder
                if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                    this.mediaRecorder.stop();
                }

                // Update stream status
                await firestore.collection('liveStreams').doc(this.currentLiveStream.id).update({
                    isLive: false,
                    endTime: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Stop webcam
                this.stopWebcamPreview();

                alert('Stream ended successfully');
                this.navigateToPage('library');
            } catch (error) {
                console.error('Error ending stream:', error);
                alert('Failed to end stream');
            }
        }
    }

    async deleteStream() {
        if (!this.currentLiveStream) return;

        if (confirm('Delete this stream permanently?')) {
            try {
                await firestore.collection('liveStreams').doc(this.currentLiveStream.id).delete();
                
                // Delete all chat messages
                const chatSnapshot = await firestore.collection('liveChats')
                    .where('streamId', '==', this.currentLiveStream.id)
                    .get();
                
                const batch = firestore.batch();
                chatSnapshot.forEach(doc => batch.delete(doc.ref));
                await batch.commit();

                alert('Stream deleted successfully');
                this.navigateToPage('library');
            } catch (error) {
                console.error('Error deleting stream:', error);
                alert('Failed to delete stream');
            }
        }
    }

    // ========== LIVE STREAM VIEWING ==========

    async viewLiveStream(streamId) {
        try {
            const streamDoc = await firestore.collection('liveStreams').doc(streamId).get();
            if (!streamDoc.exists) {
                alert('Stream not found');
                return;
            }

            this.currentLiveStream = { id: streamId, ...streamDoc.data() };
            this.navigateToPage('livePlayer');
            
            // Show stream info
            document.getElementById('liveTitle').textContent = this.currentLiveStream.title;
            document.getElementById('streamUploader').textContent = this.currentLiveStream.uploaderName;
            
            const livePlayer = document.getElementById('livePlayer');
            const streamControls = document.getElementById('streamControls');
            
            // Show stream controls only for the streamer
            if (this.currentUserId === this.currentLiveStream.uploaderId) {
                streamControls.style.display = 'block';
                
                // Set video source to webcam for streamer
                if (this.webcamStream) {
                    livePlayer.srcObject = this.webcamStream;
                    livePlayer.muted = true; // Mute own stream
                }
            } else {
                streamControls.style.display = 'none';
                livePlayer.muted = false;
                
                // For viewers, play the live stream
                if (this.currentLiveStream.isLive) {
                    // Start playing live chunks in real-time
                    this.playLiveStream(streamId, livePlayer);
                } else if (this.currentLiveStream.videoUrl) {
                    // Play recorded video if stream has ended
                    livePlayer.src = this.currentLiveStream.videoUrl;
                    livePlayer.play();
                }
            }

            // Increment viewer count
            await this.incrementViewers(streamId);
            
            // Load live chat
            this.loadLiveChat(streamId);
            
            // Monitor viewer count
            this.monitorViewers(streamId);

        } catch (error) {
            console.error('Error viewing stream:', error);
            alert('Failed to load stream');
        }
    }

    async playLiveStream(streamId, videoElement) {
        // Queue-based chunk playback for continuous streaming
        let chunkQueue = [];
        let currentChunkIndex = -1;
        let isPlaying = false;
        let blobUrls = []; // Track blob URLs for cleanup

        // Play next chunk in queue
        const playNextChunk = async () => {
            if (chunkQueue.length === 0 || isPlaying) return;
            
            isPlaying = true;
            const chunk = chunkQueue.shift();
            
            try {
                const response = await fetch(chunk.url);
                const arrayBuffer = await response.arrayBuffer();
                const blob = new Blob([arrayBuffer], { type: 'video/webm' });
                const blobUrl = URL.createObjectURL(blob);
                
                // Track blob URL for later cleanup
                blobUrls.push(blobUrl);
                
                // Set video source and play
                videoElement.src = blobUrl;
                await videoElement.play().catch(e => {
                    console.log('Autoplay prevented, click to play:', e);
                    isPlaying = false;
                });
                
                // When chunk ends, play next one
                videoElement.onended = () => {
                    isPlaying = false;
                    // Cleanup old blob URLs (keep last 5 for buffering)
                    if (blobUrls.length > 5) {
                        const oldUrl = blobUrls.shift();
                        URL.revokeObjectURL(oldUrl);
                    }
                    playNextChunk();
                };
                
            } catch (error) {
                console.error('Error playing chunk:', error);
                isPlaying = false;
                // Try next chunk on error
                setTimeout(playNextChunk, 1000);
            }
        };

        // Listen for new chunks from streamer
        const unsubscribe = firestore.collection('liveStreams').doc(streamId)
            .onSnapshot(async (doc) => {
                if (!doc.exists) return;
                
                const data = doc.data();
                const latestChunkIndex = data.latestChunkIndex;
                const latestChunkUrl = data.latestChunkUrl;
                
                // If stream ended, switch to full recording
                if (!data.isLive && data.videoUrl) {
                    unsubscribe();
                    // Cleanup blob URLs
                    blobUrls.forEach(url => URL.revokeObjectURL(url));
                    blobUrls = [];
                    // Play final recording
                    videoElement.src = data.videoUrl;
                    videoElement.play();
                    return;
                }
                
                // Add new chunks to queue
                if (latestChunkIndex !== undefined && latestChunkIndex > currentChunkIndex && latestChunkUrl) {
                    currentChunkIndex = latestChunkIndex;
                    
                    // Add to queue
                    chunkQueue.push({
                        index: latestChunkIndex,
                        url: latestChunkUrl
                    });
                    
                    // Start playing if not already playing
                    if (!isPlaying) {
                        playNextChunk();
                    }
                }
            });
        
        // Cleanup on page leave
        const cleanup = () => {
            unsubscribe();
            blobUrls.forEach(url => URL.revokeObjectURL(url));
            blobUrls = [];
        };
        
        window.addEventListener('beforeunload', cleanup);
        
        // Store cleanup for later use
        this.liveStreamCleanup = cleanup;
    }

    async incrementViewers(streamId) {
        try {
            await firestore.collection('liveStreams').doc(streamId).update({
                viewers: firebase.firestore.FieldValue.increment(1)
            });
        } catch (error) {
            console.error('Error incrementing viewers:', error);
        }
    }

    monitorViewers(streamId) {
        firestore.collection('liveStreams').doc(streamId).onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                const viewersElement = document.getElementById('liveViewers');
                const chatViewersElement = document.getElementById('chatViewers');
                
                if (viewersElement) {
                    viewersElement.innerHTML = `<i class="fas fa-eye"></i> ${data.viewers || 0} watching`;
                }
                if (chatViewersElement) {
                    chatViewersElement.textContent = `${data.viewers || 0} viewers`;
                }

                // Update current stream data
                if (this.currentLiveStream && this.currentLiveStream.id === streamId) {
                    this.currentLiveStream = { id: streamId, ...data };
                }
            }
        });
    }

    // ========== LIVE CHAT ==========

    loadLiveChat(streamId) {
        // Unsubscribe from previous chat
        if (this.chatUnsubscribe) {
            this.chatUnsubscribe();
        }

        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '<p class="chat-placeholder">Be the first to comment!</p>';

        // Real-time chat listener
        this.chatUnsubscribe = firestore.collection('liveChats')
            .where('streamId', '==', streamId)
            .orderBy('timestamp', 'asc')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const chatData = change.doc.data();
                        this.addChatMessage(chatData);
                    }
                });
            });
    }

    addChatMessage(chatData) {
        const chatMessages = document.getElementById('chatMessages');
        
        // Remove placeholder
        const placeholder = chatMessages.querySelector('.chat-placeholder');
        if (placeholder) {
            placeholder.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        
        const timestamp = chatData.timestamp ? new Date(chatData.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        
        messageDiv.innerHTML = `
            <img src="${chatData.userPhoto || 'https://via.placeholder.com/32'}" alt="${chatData.userName}" class="chat-avatar">
            <div class="chat-content">
                <div class="chat-header">
                    <span class="chat-username">${chatData.userName}</span>
                    <span class="chat-time">${timestamp}</span>
                </div>
                <p class="chat-text">${this.escapeHtml(chatData.message)}</p>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        
        // Auto-scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async sendChatMessage() {
        if (!this.currentUserId) {
            alert('Please login to chat');
            return;
        }

        if (!this.currentLiveStream) return;

        // Spam prevention
        if (this.chatCooldown) {
            alert('Please wait 2 seconds between messages');
            return;
        }

        const chatInput = document.getElementById('chatInput');
        const message = chatInput.value.trim();
        
        if (!message) return;

        try {
            await firestore.collection('liveChats').add({
                streamId: this.currentLiveStream.id,
                userId: this.currentUserId,
                userName: this.currentUser.displayName || 'Anonymous',
                userPhoto: this.currentUser.photoURL || '',
                message,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            chatInput.value = '';
            
            // Set cooldown
            this.chatCooldown = true;
            setTimeout(() => {
                this.chatCooldown = false;
            }, 2000);

        } catch (error) {
            console.error('Error sending chat message:', error);
            alert('Failed to send message');
        }
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // ========== LOAD LIVE STREAMS ==========

    async loadLiveStreams() {
        const liveGrid = document.getElementById('liveGrid');
        const allLiveGrid = document.getElementById('allLiveGrid');
        
        liveGrid.innerHTML = '';
        allLiveGrid.innerHTML = '';

        try {
            const snapshot = await firestore.collection('liveStreams')
                .where('isLive', '==', true)
                .orderBy('startTime', 'desc')
                .get();

            if (snapshot.empty) {
                liveGrid.innerHTML = '<p class="no-streams">No live streams right now</p>';
                allLiveGrid.innerHTML = '<p class="no-streams">No live streams right now</p>';
                return;
            }

            snapshot.forEach((doc) => {
                const stream = { id: doc.id, ...doc.data() };
                const streamCard = this.createLiveStreamCard(stream);
                liveGrid.appendChild(streamCard);
                allLiveGrid.appendChild(streamCard.cloneNode(true));
                
                // Add click listener to cloned card as well
                allLiveGrid.lastChild.addEventListener('click', () => this.viewLiveStream(stream.id));
            });

        } catch (error) {
            console.error('Error loading live streams:', error);
        }
    }

    createLiveStreamCard(stream) {
        const card = document.createElement('div');
        card.className = 'live-card';
        card.onclick = () => this.viewLiveStream(stream.id);
        
        card.innerHTML = `
            <div class="live-card-thumbnail">
                <img src="${stream.thumbnailUrl}" alt="${stream.title}">
                <div class="live-badge-overlay">
                    <span class="live-badge-animated">
                        <i class="fas fa-circle"></i> LIVE
                    </span>
                    <span class="viewer-count">${stream.viewers || 0} watching</span>
                </div>
            </div>
            <div class="live-card-info">
                <img src="${stream.uploaderPhoto || 'https://via.placeholder.com/40'}" alt="${stream.uploaderName}" class="channel-avatar">
                <div class="live-card-details">
                    <h3 class="live-card-title">${stream.title}</h3>
                    <p class="live-card-channel">${stream.uploaderName}</p>
                </div>
            </div>
        `;
        
        return card;
    }

    startLiveStreamMonitoring() {
        // Real-time monitoring of live streams
        if (this.liveStreamsUnsubscribe) {
            this.liveStreamsUnsubscribe();
        }

        this.liveStreamsUnsubscribe = firestore.collection('liveStreams')
            .where('isLive', '==', true)
            .onSnapshot(() => {
                this.loadLiveStreams();
            });
    }

    async loadUserContent() {
        await this.loadUserLiveStreams();
    }

    async loadUserLiveStreams() {
        if (!this.currentUserId) return;

        const myLiveGrid = document.getElementById('myLiveGrid');
        myLiveGrid.innerHTML = '';

        try {
            const snapshot = await firestore.collection('liveStreams')
                .where('uploaderId', '==', this.currentUserId)
                .orderBy('startTime', 'desc')
                .get();

            if (snapshot.empty) {
                myLiveGrid.innerHTML = '<p class="no-content">No live streams yet</p>';
                return;
            }

            snapshot.forEach((doc) => {
                const stream = { id: doc.id, ...doc.data() };
                const streamCard = this.createLiveStreamCard(stream);
                myLiveGrid.appendChild(streamCard);
            });

        } catch (error) {
            console.error('Error loading user live streams:', error);
        }
    }

    // ========== NAVIGATION & UI ==========

    navigateToPage(page) {
        // Cleanup previous page
        if (this.currentPage === 'livePlayer' && this.liveStreamCleanup) {
            this.liveStreamCleanup();
            this.liveStreamCleanup = null;
        }
        
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        
        const pageElement = document.getElementById(page + 'Page');
        if (pageElement) {
            pageElement.classList.add('active');
        }
        
        const navItem = document.querySelector(`[data-page="${page}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
        
        this.currentPage = page;

        // Load page-specific content
        if (page === 'library') {
            this.loadUserLiveStreams();
        } else if (page === 'live') {
            this.loadLiveStreams();
        }
    }

    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('collapsed');
    }

    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        
        const themeIcon = document.querySelector('#themeToggle i');
        themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    openCreateModal() {
        document.getElementById('createModal').classList.add('active');
    }

    closeCreateModal() {
        document.getElementById('createModal').classList.remove('active');
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        this.stopWebcamPreview();
    }

    switchChannelTab(tab) {
        document.querySelectorAll('.channel-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        event.target.classList.add('active');
        
        if (tab === 'videos') {
            document.getElementById('videosTab').classList.add('active');
        } else if (tab === 'live') {
            document.getElementById('myLiveTab').classList.add('active');
            this.loadUserLiveStreams();
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.tiktikApp = new TikTikLiveApp();
});
