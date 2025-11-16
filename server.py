#!/usr/bin/env python3
"""
Simple HTTP server for TikTik Live Streaming Platform
Serves static files and handles API endpoints for Firebase config
"""

import http.server
import socketserver
import json
import os
from urllib.parse import urlparse

PORT = 5000

class TikTikHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        # API endpoint for Firebase config
        if parsed_path.path == '/api/get-config':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            # Read Firebase config from environment variables
            firebase_config = {
                "firebase": {
                    "apiKey": os.getenv('FIREBASE_API_KEY', 'demo-api-key'),
                    "authDomain": os.getenv('FIREBASE_AUTH_DOMAIN', 'demo-project.firebaseapp.com'),
                    "projectId": os.getenv('FIREBASE_PROJECT_ID', 'demo-project'),
                    "storageBucket": os.getenv('FIREBASE_STORAGE_BUCKET', 'demo-project.appspot.com'),
                    "messagingSenderId": os.getenv('FIREBASE_MESSAGING_SENDER_ID', '123456789'),
                    "appId": os.getenv('FIREBASE_APP_ID', '1:123456789:web:abcdef')
                }
            }
            
            self.wfile.write(json.dumps(firebase_config).encode())
        else:
            # Serve static files
            super().do_GET()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

def run_server():
    """Start the HTTP server"""
    with socketserver.TCPServer(("0.0.0.0", PORT), TikTikHandler) as httpd:
        print(f"🚀 TikTik Live Streaming Platform")
        print(f"📡 Server running on http://0.0.0.0:{PORT}")
        print(f"🔴 Ready to stream live!")
        print(f"\nPress Ctrl+C to stop the server\n")
        httpd.serve_forever()

if __name__ == "__main__":
    try:
        run_server()
    except KeyboardInterrupt:
        print("\n\n✅ Server stopped gracefully")
