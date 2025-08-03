import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export interface SocketConfig {
  token: string;
  type: 'user' | 'admin';
}

export function initializeSocket(config: SocketConfig): Socket {
  if (socket?.connected) {
    socket.disconnect();
  }

  socket = io(process.env.NODE_ENV === 'production' 
    ? `${window.location.origin}` 
    : 'http://localhost:3000', 
    {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      autoConnect: false,
      auth: {
        token: config.token,
        type: config.type,
      },
    }
  );

  // Connection event handlers
  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket?.id);
    
    // Authenticate immediately after connection
    socket?.emit('authenticate', {
      token: config.token,
      type: config.type,
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('🔌 Socket connection error:', error);
  });

  socket.on('authenticated', (data) => {
    console.log('✅ Socket authenticated:', data.type);
  });

  socket.on('authentication-error', (data) => {
    console.error('❌ Socket authentication failed:', data.error);
  });

  socket.on('force-disconnect', (data) => {
    console.warn('⚠️ Forced disconnect by admin:', data.reason);
    socket?.disconnect();
  });

  // Connect the socket
  socket.connect();

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Admin-specific socket functions
export function setupAdminSurveillance(socket: Socket, callbacks: {
  onUserConnected?: (data: any) => void;
  onUserDisconnected?: (data: any) => void;
  onMessageIntercepted?: (data: any) => void;
  onRoomJoined?: (data: any) => void;
  onRoomLeft?: (data: any) => void;
  onTypingSurveillance?: (data: any) => void;
  onSurveillanceData?: (data: any) => void;
}) {
  if (callbacks.onUserConnected) {
    socket.on('user-connected', callbacks.onUserConnected);
  }
  
  if (callbacks.onUserDisconnected) {
    socket.on('user-disconnected', callbacks.onUserDisconnected);
  }
  
  if (callbacks.onMessageIntercepted) {
    socket.on('message-intercepted', callbacks.onMessageIntercepted);
  }
  
  if (callbacks.onRoomJoined) {
    socket.on('room-joined', callbacks.onRoomJoined);
  }
  
  if (callbacks.onRoomLeft) {
    socket.on('room-left', callbacks.onRoomLeft);
  }
  
  if (callbacks.onTypingSurveillance) {
    socket.on('typing-surveillance', callbacks.onTypingSurveillance);
  }
  
  if (callbacks.onSurveillanceData) {
    socket.on('surveillance-data', callbacks.onSurveillanceData);
  }
}

// User-specific socket functions
export function setupUserChat(socket: Socket, callbacks: {
  onNewMessage?: (data: any) => void;
  onUserJoined?: (data: any) => void;
  onUserLeft?: (data: any) => void;
  onUserTyping?: (data: any) => void;
  onMessageReaction?: (data: any) => void;
  onRoomJoined?: (data: any) => void;
  onError?: (data: any) => void;
}) {
  if (callbacks.onNewMessage) {
    socket.on('new-message', callbacks.onNewMessage);
  }
  
  if (callbacks.onUserJoined) {
    socket.on('user-joined', callbacks.onUserJoined);
  }
  
  if (callbacks.onUserLeft) {
    socket.on('user-left', callbacks.onUserLeft);
  }
  
  if (callbacks.onUserTyping) {
    socket.on('user-typing', callbacks.onUserTyping);
  }
  
  if (callbacks.onMessageReaction) {
    socket.on('message-reaction', callbacks.onMessageReaction);
  }
  
  if (callbacks.onRoomJoined) {
    socket.on('room-joined', callbacks.onRoomJoined);
  }
  
  if (callbacks.onError) {
    socket.on('error', callbacks.onError);
  }
}

// Socket action functions
export const socketActions = {
  // Room actions
  joinRoom: (roomId: string) => {
    socket?.emit('join-room', { roomId });
  },

  leaveRoom: (roomId: string) => {
    socket?.emit('leave-room', { roomId });
  },

  // Message actions
  sendMessage: (roomId: string, content: string) => {
    socket?.emit('send-message', { roomId, content });
  },

  // Admin impersonation message
  sendAdminMessage: (roomId: string, content: string, targetUserId: string, maskName: string, maskType: string) => {
    socket?.emit('send-message', { 
      roomId, 
      content, 
      targetUserId, 
      maskName, 
      maskType 
    });
  },

  // Typing indicator
  setTyping: (roomId: string, isTyping: boolean) => {
    socket?.emit('typing', { roomId, isTyping });
  },

  // Message reaction
  reactToMessage: (messageId: string, emoji: string, roomId: string) => {
    socket?.emit('react-message', { messageId, emoji, roomId });
  },

  // Admin actions
  adminDisconnectUser: (targetSocketId: string) => {
    socket?.emit('admin-disconnect-user', { targetSocketId });
  },

  adminMonitorRoom: (roomId: string) => {
    socket?.emit('admin-monitor-room', { roomId });
  },
};

// Utility functions
export function isSocketConnected(): boolean {
  return socket?.connected || false;
}

export function getSocketId(): string | undefined {
  return socket?.id;
}

// Error handling
export function onSocketError(callback: (error: any) => void): void {
  socket?.on('error', callback);
  socket?.on('connect_error', callback);
}

// Cleanup function
export function cleanupSocketListeners(): void {
  if (socket) {
    socket.removeAllListeners();
  }
}
