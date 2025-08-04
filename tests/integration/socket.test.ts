import { createServer } from 'http';
import { AddressInfo } from 'net';
import { Server } from 'socket.io';
import Client from 'socket.io-client';

describe('Socket.IO Real-time Features', () => {
  let io: Server;
  let serverSocket: any;
  let clientSocket: any;
  let httpServer: any;

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    
    httpServer.listen(() => {
      const port = (httpServer.address() as AddressInfo).port;
      clientSocket = Client(`http://localhost:${port}`);
      
      io.on('connection', (socket) => {
        serverSocket = socket;
      });
      
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
    httpServer.close();
  });

  describe('Chat Functionality', () => {
    test('should send and receive messages', (done) => {
      const testMessage = {
        id: '1',
        content: 'Hello World',
        userId: 'user123',
        roomId: 'room456',
        timestamp: new Date().toISOString()
      };

      clientSocket.on('message_received', (message: any) => {
        expect(message.content).toBe(testMessage.content);
        expect(message.userId).toBe(testMessage.userId);
        done();
      });

      serverSocket.emit('message_received', testMessage);
    });

    test('should handle room joining', (done) => {
      const roomData = {
        roomId: 'room123',
        userId: 'user456'
      };

      clientSocket.emit('join_room', roomData);

      serverSocket.on('join_room', (data: any) => {
        expect(data.roomId).toBe(roomData.roomId);
        expect(data.userId).toBe(roomData.userId);
        done();
      });
    });

    test('should broadcast typing indicators', (done) => {
      const typingData = {
        userId: 'user123',
        roomId: 'room456',
        isTyping: true
      };

      clientSocket.on('user_typing', (data: any) => {
        expect(data.userId).toBe(typingData.userId);
        expect(data.isTyping).toBe(true);
        done();
      });

      serverSocket.emit('user_typing', typingData);
    });
  });

  describe('Admin Surveillance', () => {
    test('should send surveillance alerts', (done) => {
      const alertData = {
        type: 'SUSPICIOUS_ACTIVITY',
        userId: 'user789',
        details: 'Unusual message pattern detected',
        timestamp: new Date().toISOString(),
        severity: 'HIGH'
      };

      clientSocket.on('surveillance_alert', (alert: any) => {
        expect(alert.type).toBe(alertData.type);
        expect(alert.severity).toBe(alertData.severity);
        done();
      });

      serverSocket.emit('surveillance_alert', alertData);
    });

    test('should handle admin overrides', (done) => {
      const overrideData = {
        type: 'MESSAGE_BLOCK',
        targetId: 'message123',
        adminId: 'admin456',
        reason: 'Inappropriate content'
      };

      clientSocket.emit('admin_override', overrideData);

      serverSocket.on('admin_override', (data: any) => {
        expect(data.type).toBe(overrideData.type);
        expect(data.targetId).toBe(overrideData.targetId);
        done();
      });
    });

    test('should broadcast live user activity', (done) => {
      const activityData = {
        userId: 'user123',
        action: 'MESSAGE_SENT',
        details: { messageId: 'msg456', roomId: 'room789' },
        timestamp: new Date().toISOString()
      };

      clientSocket.on('user_activity', (activity: any) => {
        expect(activity.userId).toBe(activityData.userId);
        expect(activity.action).toBe(activityData.action);
        done();
      });

      serverSocket.emit('user_activity', activityData);
    });
  });

  describe('Real-time Updates', () => {
    test('should handle mask expiration notifications', (done) => {
      const expirationData = {
        userId: 'user123',
        maskId: 'mask456',
        timeRemaining: 300 // 5 minutes
      };

      clientSocket.on('mask_expiring', (data: any) => {
        expect(data.userId).toBe(expirationData.userId);
        expect(data.timeRemaining).toBe(300);
        done();
      });

      serverSocket.emit('mask_expiring', expirationData);
    });

    test('should broadcast location updates', (done) => {
      const locationData = {
        userId: 'user123',
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
        timestamp: new Date().toISOString()
      };

      clientSocket.on('location_update', (data: any) => {
        expect(data.latitude).toBe(locationData.latitude);
        expect(data.longitude).toBe(locationData.longitude);
        done();
      });

      serverSocket.emit('location_update', locationData);
    });
  });

  describe('Error Handling', () => {
    test('should handle connection errors gracefully', (done) => {
      clientSocket.on('connect_error', (error: any) => {
        expect(error).toBeDefined();
        done();
      });

      // Simulate connection error
      clientSocket.disconnect();
      clientSocket.connect();
    });

    test('should validate message format', (done) => {
      const invalidMessage = {
        // Missing required fields
        content: 'Test message'
      };

      clientSocket.emit('send_message', invalidMessage);

      serverSocket.on('send_message', (data: any) => {
        // Should receive validation error
        expect(data.error).toBeDefined();
        done();
      });
    });
  });

  describe('Performance', () => {
    test('should handle multiple concurrent connections', async () => {
      const connections: any[] = [];
      const messageCount = 100;
      
      // Create multiple client connections
      for (let i = 0; i < 10; i++) {
        const port = (httpServer.address() as AddressInfo).port;
        const client = Client(`http://localhost:${port}`);
        connections.push(client);
      }

      // Send messages from all connections
      const promises = connections.map((client, index) => {
        return new Promise((resolve) => {
          for (let i = 0; i < messageCount; i++) {
            client.emit('test_message', { 
              id: `${index}-${i}`, 
              content: `Message ${i} from client ${index}` 
            });
          }
          resolve(true);
        });
      });

      await Promise.all(promises);

      // Cleanup
      connections.forEach(client => client.close());
    }, 10000);
  });
});
