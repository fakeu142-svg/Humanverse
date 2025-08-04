import { renderHook, act } from '@testing-library/react';
import { useAdminSurveillance } from '../useAdminSurveillance';

// Mock WebSocket
global.WebSocket = class MockWebSocket {
  constructor(url: string) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) this.onopen(new Event('open'));
    }, 100);
  }
  
  url: string;
  readyState: number;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  
  send(data: string) {
    console.log('WebSocket send:', data);
  }
  
  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose(new CloseEvent('close'));
  }
};

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, data: {} }),
  })
) as jest.Mock;

describe('useAdminSurveillance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAdminSurveillance());

    expect(result.current.liveMessages).toEqual([]);
    expect(result.current.activeUsers).toEqual([]);
    expect(result.current.activeSurveillance).toBe(false);
    expect(result.current.adminOverrides).toEqual([]);
    expect(result.current.isConnected).toBe(false);
  });

  it('should start surveillance when admin token is present', async () => {
    localStorage.setItem('adminToken', 'test-token');
    
    const { result } = renderHook(() => useAdminSurveillance());

    act(() => {
      result.current.startSurveillance();
    });

    // Wait for WebSocket connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    expect(result.current.activeSurveillance).toBe(true);
  });

  it('should handle message flagging', async () => {
    const { result } = renderHook(() => useAdminSurveillance());

    await act(async () => {
      await result.current.flagMessage('message-123', 'inappropriate content');
    });

    expect(fetch).toHaveBeenCalledWith('/api/admin/chat/flag-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer null'
      },
      body: JSON.stringify({ 
        messageId: 'message-123', 
        reason: 'inappropriate content' 
      })
    });
  });

  it('should handle user blocking', async () => {
    const { result } = renderHook(() => useAdminSurveillance());

    await act(async () => {
      await result.current.blockUser('user-456', 'spam');
    });

    expect(fetch).toHaveBeenCalledWith('/api/admin/chat/block-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer null'
      },
      body: JSON.stringify({ 
        userId: 'user-456', 
        reason: 'spam' 
      })
    });
  });

  it('should handle room takeover', async () => {
    const { result } = renderHook(() => useAdminSurveillance());

    await act(async () => {
      await result.current.takeoverRoom('room-789');
    });

    expect(fetch).toHaveBeenCalledWith('/api/admin/chat/takeover-room', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer null'
      },
      body: JSON.stringify({ roomId: 'room-789' })
    });
  });

  it('should handle mass message sending', async () => {
    const { result } = renderHook(() => useAdminSurveillance());

    await act(async () => {
      await result.current.sendMassMessage('room-123', 'System announcement', 'SystemBot');
    });

    expect(fetch).toHaveBeenCalledWith('/api/admin/chat/mass-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer null'
      },
      body: JSON.stringify({ 
        roomId: 'room-123', 
        message: 'System announcement',
        maskName: 'SystemBot'
      })
    });
  });

  it('should handle fake user injection', async () => {
    const { result } = renderHook(() => useAdminSurveillance());
    const fakeUserConfig = {
      personality: 'friendly',
      objective: 'gather information',
      backstory: 'college student'
    };

    await act(async () => {
      await result.current.injectFakeUser('room-123', fakeUserConfig);
    });

    expect(fetch).toHaveBeenCalledWith('/api/admin/chat/inject-fake-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer null'
      },
      body: JSON.stringify({ 
        roomId: 'room-123', 
        fakeUserConfig 
      })
    });
  });

  it('should handle room infiltration', async () => {
    const { result } = renderHook(() => useAdminSurveillance());

    await act(async () => {
      await result.current.infiltrateRoom('room-456', 'target-user-789');
    });

    expect(fetch).toHaveBeenCalledWith('/api/admin/rooms/infiltrate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer null'
      },
      body: JSON.stringify({ 
        roomId: 'room-456', 
        targetUserId: 'target-user-789' 
      })
    });
  });

  it('should stop surveillance and cleanup', () => {
    const { result } = renderHook(() => useAdminSurveillance());

    act(() => {
      result.current.startSurveillance();
    });

    act(() => {
      result.current.stopSurveillance();
    });

    expect(result.current.activeSurveillance).toBe(false);
    expect(result.current.liveMessages).toEqual([]);
    expect(result.current.activeUsers).toEqual([]);
  });

  it('should track message and user counts', () => {
    const { result } = renderHook(() => useAdminSurveillance());

    expect(result.current.messageCount).toBe(0);
    expect(result.current.userCount).toBe(0);
  });

  it('should return mock analytics data', async () => {
    const { result } = renderHook(() => useAdminSurveillance());

    const analyticsData = await result.current.getAnalyticsData();

    expect(analyticsData).toHaveProperty('userActivity');
    expect(analyticsData).toHaveProperty('communications');
    expect(analyticsData).toHaveProperty('surveillance');
    expect(analyticsData).toHaveProperty('temporal');
  });

  it('should return empty arrays for various get functions', async () => {
    const { result } = renderHook(() => useAdminSurveillance());

    expect(await result.current.getUserCredentials()).toEqual([]);
    expect(await result.current.getActiveRooms()).toEqual([]);
    expect(await result.current.getFakeUsers()).toEqual([]);
    expect(await result.current.getDirectMessages()).toEqual([]);
    expect(await result.current.getTargetUsers()).toEqual([]);
    expect(await result.current.getActiveSessions()).toEqual([]);
  });

  it('should create mock objects for creation functions', async () => {
    const { result } = renderHook(() => useAdminSurveillance());

    const fakeUser = await result.current.createFakeUser({ name: 'Test User' });
    expect(fakeUser).toHaveProperty('id');
    expect(fakeUser.name).toBe('Test User');

    const session = await result.current.createImpersonationSession('user-123', 'credential');
    expect(session).toHaveProperty('id');
    expect(session.targetUserId).toBe('user-123');
    expect(session.method).toBe('credential');
  });
});
