import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { initializeSocket, getSocket, disconnectSocket, SocketConfig } from '@/lib/socket';

interface UseSocketOptions {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: any) => void;
}

export function useSocket(config: SocketConfig | null, options: UseSocketOptions = {}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { autoConnect = true, onConnect, onDisconnect, onError } = options;

  const connect = useCallback(() => {
    if (!config) return null;

    try {
      const newSocket = initializeSocket(config);
      setSocket(newSocket);
      return newSocket;
    } catch (err: any) {
      setError(err.message);
      onError?.(err);
      return null;
    }
  }, [config, onError]);

  const disconnect = useCallback(() => {
    disconnectSocket();
    setSocket(null);
    setIsConnected(false);
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    if (!config || !autoConnect) return;

    const socketInstance = connect();
    if (!socketInstance) return;

    // Connection handlers
    const handleConnect = () => {
      setIsConnected(true);
      setError(null);
      onConnect?.();
    };

    const handleDisconnect = (reason: string) => {
      setIsConnected(false);
      setIsAuthenticated(false);
      onDisconnect?.(reason);
    };

    const handleAuthenticated = (data: any) => {
      setIsAuthenticated(true);
      setError(null);
    };

    const handleAuthError = (data: any) => {
      setError(data.error);
      setIsAuthenticated(false);
      onError?.(new Error(data.error));
    };

    const handleError = (error: any) => {
      setError(error.message || 'Socket error');
      onError?.(error);
    };

    // Attach event listeners
    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.on('authenticated', handleAuthenticated);
    socketInstance.on('authentication-error', handleAuthError);
    socketInstance.on('error', handleError);
    socketInstance.on('connect_error', handleError);

    // Cleanup function
    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.off('authenticated', handleAuthenticated);
      socketInstance.off('authentication-error', handleAuthError);
      socketInstance.off('error', handleError);
      socketInstance.off('connect_error', handleError);
      disconnect();
    };
  }, [config, autoConnect, connect, disconnect, onConnect, onDisconnect, onError]);

  return {
    socket,
    isConnected,
    isAuthenticated,
    error,
    connect,
    disconnect,
  };
}

// Hook for managing socket connection status
export function useSocketStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      setSocketId(socket.id || null);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setSocketId(null);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Set initial state
    setIsConnected(socket.connected);
    setSocketId(socket.connected ? socket.id || null : null);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  return { isConnected, socketId };
}

// Hook for socket event listeners with cleanup
export function useSocketEvent(
  eventName: string, 
  handler: (...args: any[]) => void, 
  deps: any[] = []
) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on(eventName, handler);

    return () => {
      socket.off(eventName, handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventName, ...deps]);
}

// Hook for emitting socket events
export function useSocketEmit() {
  const emit = useCallback((eventName: string, data?: any) => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit(eventName, data);
      return true;
    }
    return false;
  }, []);

  return emit;
}
