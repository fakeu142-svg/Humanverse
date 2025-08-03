import { NextRequest } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { validateUserSession } from '@/lib/auth';
import { validateAdminSession } from '@/lib/adminAuth';
import { recordChatMessage, recordSurveillanceEvent, trackChatBehavior } from '@/lib/chatSurveillance';
import { getUserActiveMask } from '@/lib/maskSurveillance';

// Global Socket.IO server instance
let io: SocketIOServer | null = null;

// Track connected users and their rooms
const connectedUsers = new Map<string, {
  userId: string;
  userEmail: string;
  maskName: string;
  isAdmin: boolean;
  rooms: Set<string>;
  lastActivity: Date;
}>();

// Track room occupancy
const roomOccupancy = new Map<string, Set<string>>();

// Admin surveillance channels
const adminSockets = new Set<string>();

export async function GET(req: NextRequest) {
  return new Response('Socket.IO server endpoint', { status: 200 });
}

export async function POST(req: NextRequest) {
  return new Response('Socket.IO server endpoint', { status: 200 });
}

// Initialize Socket.IO server
export function initializeSocketServer(httpServer: HTTPServer) {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', async (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Authentication
    socket.on('authenticate', async (data) => {
      try {
        const { token, type } = data;

        if (type === 'admin') {
          // Admin authentication
          const admin = await validateAdminSession(token);
          if (admin && admin.permissions.surveillance) {
            socket.data.admin = admin;
            socket.data.isAdmin = true;
            adminSockets.add(socket.id);
            
            // Join admin surveillance channel
            socket.join('admin-surveillance');
            
            socket.emit('authenticated', {
              success: true,
              type: 'admin',
              admin: {
                id: admin.id,
                email: admin.email,
                role: admin.role,
              },
            });

            // Send current room data to admin
            const roomData = Array.from(roomOccupancy.entries()).map(([roomId, users]) => ({
              roomId,
              userCount: users.size,
              users: Array.from(users).map(socketId => {
                const user = connectedUsers.get(socketId);
                return user ? {
                  maskName: user.maskName,
                  userEmail: user.userEmail,
                  isAdmin: user.isAdmin,
                } : null;
              }).filter(Boolean),
            }));

            socket.emit('surveillance-data', { rooms: roomData });
            return;
          } else {
            socket.emit('authentication-error', { error: 'Invalid admin credentials' });
            return;
          }
        } else {
          // User authentication
          const user = await validateUserSession(token);
          if (user) {
            const mask = await getUserActiveMask(user.id);
            if (!mask) {
              socket.emit('authentication-error', { error: 'No active mask found' });
              return;
            }

            socket.data.user = user;
            socket.data.mask = mask;
            socket.data.isAdmin = false;

            // Track connected user
            connectedUsers.set(socket.id, {
              userId: user.id,
              userEmail: user.email,
              maskName: mask.name,
              isAdmin: false,
              rooms: new Set(),
              lastActivity: new Date(),
            });

            socket.emit('authenticated', {
              success: true,
              type: 'user',
              user: {
                id: user.id,
                email: user.email,
              },
              mask: {
                id: mask.id,
                name: mask.name,
                type: mask.type,
              },
            });

            // Notify admins of new connection
            io?.to('admin-surveillance').emit('user-connected', {
              socketId: socket.id,
              userId: user.id,
              userEmail: user.email,
              maskName: mask.name,
              timestamp: new Date(),
            });
          } else {
            socket.emit('authentication-error', { error: 'Invalid user credentials' });
          }
        }
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('authentication-error', { error: 'Authentication failed' });
      }
    });

    // Join room
    socket.on('join-room', async (data) => {
      try {
        const { roomId } = data;
        const user = connectedUsers.get(socket.id);
        
        if (!user && !socket.data.isAdmin) {
          socket.emit('error', { error: 'Not authenticated' });
          return;
        }

        // Add to room
        socket.join(roomId);
        
        if (user) {
          user.rooms.add(roomId);
          user.lastActivity = new Date();

          // Track room occupancy
          if (!roomOccupancy.has(roomId)) {
            roomOccupancy.set(roomId, new Set());
          }
          roomOccupancy.get(roomId)?.add(socket.id);
        }

        // Emit to room
        socket.to(roomId).emit('user-joined', {
          maskName: user?.maskName || 'Admin',
          timestamp: new Date(),
        });

        // Emit to admins
        io?.to('admin-surveillance').emit('room-joined', {
          roomId,
          userId: user?.userId,
          userEmail: user?.userEmail,
          maskName: user?.maskName,
          timestamp: new Date(),
        });

        // Send room info
        const roomUsers = roomOccupancy.get(roomId);
        socket.emit('room-joined', {
          roomId,
          userCount: roomUsers?.size || 0,
        });

        // Record surveillance event
        if (user) {
          await recordSurveillanceEvent({
            type: 'JOIN',
            roomId,
            userId: user.userId,
            userEmail: user.userEmail,
            maskName: user.maskName,
            data: { socketId: socket.id },
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { error: 'Failed to join room' });
      }
    });

    // Leave room
    socket.on('leave-room', async (data) => {
      try {
        const { roomId } = data;
        const user = connectedUsers.get(socket.id);

        socket.leave(roomId);

        if (user) {
          user.rooms.delete(roomId);
          roomOccupancy.get(roomId)?.delete(socket.id);
        }

        // Notify room
        socket.to(roomId).emit('user-left', {
          maskName: user?.maskName || 'Unknown',
          timestamp: new Date(),
        });

        // Notify admins
        io?.to('admin-surveillance').emit('room-left', {
          roomId,
          userId: user?.userId,
          maskName: user?.maskName,
          timestamp: new Date(),
        });

        // Record surveillance event
        if (user) {
          await recordSurveillanceEvent({
            type: 'LEAVE',
            roomId,
            userId: user.userId,
            userEmail: user.userEmail,
            maskName: user.maskName,
            data: { socketId: socket.id },
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error('Leave room error:', error);
      }
    });

    // Send message
    socket.on('send-message', async (data) => {
      try {
        const { roomId, content } = data;
        const user = connectedUsers.get(socket.id);
        const isAdmin = socket.data.isAdmin;

        if (!user && !isAdmin) {
          socket.emit('error', { error: 'Not authenticated' });
          return;
        }

        let messageData;

        if (isAdmin) {
          // Admin sending message (possibly impersonating)
          const { targetUserId, maskName, maskType } = data;
          messageData = await recordChatMessage(
            content,
            roomId,
            targetUserId || socket.data.admin.id,
            maskName || 'AdminMask',
            maskType || 'ADMIN',
            socket.data.admin.id,
            targetUserId ? socket.data.admin.id : undefined
          );
        } else {
          // Regular user message
          messageData = await recordChatMessage(
            content,
            roomId,
            user.userId,
            user.maskName,
            socket.data.mask.type,
          );

          // Track chat behavior
          await trackChatBehavior(user.userId, 'NORMAL_CHAT', { content, roomId });
        }

        // Broadcast to room
        io?.to(roomId).emit('new-message', {
          id: messageData.id,
          content: messageData.content,
          maskName: messageData.maskName,
          maskType: messageData.maskType,
          reactions: messageData.reactions,
          upvotes: messageData.upvotes,
          createdAt: messageData.createdAt,
          isFromAdmin: messageData.isFromAdmin,
        });

        // Send surveillance data to admins
        io?.to('admin-surveillance').emit('message-intercepted', {
          ...messageData,
          roomId,
          socketId: socket.id,
        });

        // Update user activity
        if (user) {
          user.lastActivity = new Date();
        }
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { error: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing', (data) => {
      const { roomId, isTyping } = data;
      const user = connectedUsers.get(socket.id);

      if (user) {
        socket.to(roomId).emit('user-typing', {
          maskName: user.maskName,
          isTyping,
        });

        // Send to admins with user identity
        io?.to('admin-surveillance').emit('typing-surveillance', {
          roomId,
          userId: user.userId,
          userEmail: user.userEmail,
          maskName: user.maskName,
          isTyping,
          timestamp: new Date(),
        });
      }
    });

    // Message reaction
    socket.on('react-message', async (data) => {
      try {
        const { messageId, emoji, roomId } = data;
        const user = connectedUsers.get(socket.id);

        if (!user) {
          socket.emit('error', { error: 'Not authenticated' });
          return;
        }

        // Broadcast reaction
        io?.to(roomId).emit('message-reaction', {
          messageId,
          emoji,
          maskName: user.maskName,
        });

        // Record surveillance event
        await recordSurveillanceEvent({
          type: 'REACTION',
          roomId,
          userId: user.userId,
          userEmail: user.userEmail,
          maskName: user.maskName,
          data: { messageId, emoji },
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('React message error:', error);
      }
    });

    // Admin-only: Force disconnect user
    socket.on('admin-disconnect-user', (data) => {
      if (!socket.data.isAdmin) return;

      const { targetSocketId } = data;
      const targetSocket = io?.sockets.sockets.get(targetSocketId);
      
      if (targetSocket) {
        targetSocket.emit('force-disconnect', {
          reason: 'Disconnected by administrator',
        });
        targetSocket.disconnect(true);
      }
    });

    // Admin-only: Monitor room
    socket.on('admin-monitor-room', (data) => {
      if (!socket.data.isAdmin) return;

      const { roomId } = data;
      socket.join(`admin-monitor-${roomId}`);

      // Send real-time updates for this room
      const roomUsers = roomOccupancy.get(roomId);
      socket.emit('room-monitoring-started', {
        roomId,
        userCount: roomUsers?.size || 0,
        timestamp: new Date(),
      });
    });

    // Disconnect handler
    socket.on('disconnect', async () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);

      const user = connectedUsers.get(socket.id);
      const isAdmin = socket.data.isAdmin;

      if (isAdmin) {
        adminSockets.delete(socket.id);
      }

      if (user) {
        // Remove from all rooms
        for (const roomId of user.rooms) {
          socket.to(roomId).emit('user-left', {
            maskName: user.maskName,
            timestamp: new Date(),
          });

          roomOccupancy.get(roomId)?.delete(socket.id);

          // Record surveillance event
          await recordSurveillanceEvent({
            type: 'LEAVE',
            roomId,
            userId: user.userId,
            userEmail: user.userEmail,
            maskName: user.maskName,
            data: { reason: 'disconnect' },
            timestamp: new Date(),
          });
        }

        connectedUsers.delete(socket.id);

        // Notify admins
        io?.to('admin-surveillance').emit('user-disconnected', {
          socketId: socket.id,
          userId: user.userId,
          maskName: user.maskName,
          timestamp: new Date(),
        });
      }
    });
  });

  console.log('🚀 Socket.IO server initialized with surveillance capabilities');
  return io;
}

// Export function to get current IO instance
export function getSocketServer(): SocketIOServer | null {
  return io;
}

// Cleanup function
export function cleanupSocketConnections() {
  connectedUsers.clear();
  roomOccupancy.clear();
  adminSockets.clear();
}
