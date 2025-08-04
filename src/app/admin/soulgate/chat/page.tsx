'use client';

import { useState, useEffect, useRef } from 'react';
import { useAdminSurveillance } from '@/hooks/useAdminSurveillance';
import AdminGuard from '@/components/admin/AdminGuard';
import { 
  ChatBubbleLeftRightIcon,
  EyeIcon,
  MicrophoneIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  UserIcon,
  MapPinIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  StopIcon
} from '@heroicons/react/24/outline';

interface ChatRoom {
  id: string;
  name: string;
  participants: Array<{
    id: string;
    username: string;
    avatar: string;
    status: 'online' | 'offline' | 'typing';
    location: string;
    deviceInfo: string;
  }>;
  messageCount: number;
  lastActivity: string;
  isMonitored: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  suspiciousActivity: boolean;
}

interface LiveMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'voice' | 'video';
  metadata: {
    ipAddress: string;
    deviceInfo: string;
    location: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    flagged: boolean;
    keywords: string[];
  };
  edited: boolean;
  deleted: boolean;
}

interface TypingIndicator {
  userId: string;
  username: string;
  roomId: string;
  content: string;
  timestamp: string;
}

export default function LiveChatSurveillancePage() {
  const {
    getActiveRooms,
    monitorRoom,
    stopMonitoringRoom,
    interceptMessage,
    injectMessage,
    getTypingActivity,
    recordConversation,
    analyzeConversation
  } = useAdminSurveillance();

  const [activeRooms, setActiveRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [injectionMode, setInjectionMode] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadActiveRooms();
    const interval = setInterval(loadActiveRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadLiveMessages();
      loadTypingActivity();
      const messageInterval = setInterval(loadLiveMessages, 1000);
      const typingInterval = setInterval(loadTypingActivity, 500);
      return () => {
        clearInterval(messageInterval);
        clearInterval(typingInterval);
      };
    }
  }, [selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [liveMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadActiveRooms = async () => {
    try {
      const rooms = await getActiveRooms();
      setActiveRooms(rooms);
    } catch (error) {
      console.error('Failed to load active rooms:', error);
    }
  };

  const loadLiveMessages = async () => {
    if (!selectedRoom) return;
    try {
      const messages = await interceptMessage(selectedRoom.id);
      setLiveMessages(messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const loadTypingActivity = async () => {
    if (!selectedRoom) return;
    try {
      const typing = await getTypingActivity(selectedRoom.id);
      setTypingIndicators(typing);
    } catch (error) {
      console.error('Failed to load typing activity:', error);
    }
  };

  const handleStartMonitoring = async (roomId: string) => {
    try {
      await monitorRoom(roomId);
      loadActiveRooms();
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    }
  };

  const handleStopMonitoring = async (roomId: string) => {
    try {
      await stopMonitoringRoom(roomId);
      loadActiveRooms();
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
    }
  };

  const handleInjectMessage = async () => {
    if (!selectedRoom || !newMessage || !selectedUserId) return;
    try {
      await injectMessage(selectedRoom.id, selectedUserId, newMessage);
      setNewMessage('');
      loadLiveMessages();
    } catch (error) {
      console.error('Failed to inject message:', error);
    }
  };

  const handleStartRecording = async () => {
    if (!selectedRoom) return;
    try {
      await recordConversation(selectedRoom.id, true);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleStopRecording = async () => {
    if (!selectedRoom) return;
    try {
      await recordConversation(selectedRoom.id, false);
      setIsRecording(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const RoomCard = ({ room }: { room: ChatRoom }) => (
    <div 
      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
        selectedRoom?.id === room.id 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => setSelectedRoom(room)}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">{room.name}</h3>
        <div className="flex items-center space-x-2">
          {room.suspiciousActivity && (
            <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
          )}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(room.riskLevel)}`}>
            {room.riskLevel}
          </span>
          {room.isMonitored && (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>{room.participants.length} participants</span>
        <span>{room.messageCount} messages</span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-500">Last: {room.lastActivity}</span>
        <div className="flex space-x-1">
          {room.isMonitored ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStopMonitoring(room.id);
              }}
              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStartMonitoring(room.id);
              }}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Monitor
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const MessageBubble = ({ message }: { message: LiveMessage }) => (
    <div className={`flex items-start space-x-3 p-3 rounded-lg ${
      message.metadata.flagged ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
    }`}>
      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
        <UserIcon className="h-4 w-4 text-gray-600" />
      </div>
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <span className="font-medium text-gray-900">{message.senderUsername}</span>
          <span className="text-xs text-gray-500">{message.timestamp}</span>
          {message.metadata.flagged && (
            <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
          )}
          {message.edited && (
            <span className="text-xs text-gray-400">(edited)</span>
          )}
          {message.deleted && (
            <span className="text-xs text-red-400">(deleted)</span>
          )}
        </div>
        <p className={`text-sm ${getSentimentColor(message.metadata.sentiment)}`}>
          {message.content}
        </p>
        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
          <span>IP: {message.metadata.ipAddress}</span>
          <span>{message.metadata.location}</span>
          <span>Device: {message.metadata.deviceInfo}</span>
        </div>
        {message.metadata.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.metadata.keywords.map((keyword, index) => (
              <span key={index} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                {keyword}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const TypingIndicator = ({ typing }: { typing: TypingIndicator }) => (
    <div className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
      <span className="text-sm text-yellow-800">{typing.username} is typing...</span>
      <span className="text-xs text-yellow-600">"{typing.content}"</span>
    </div>
  );

  return (
    <AdminGuard requiredRole="super_admin">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Live Chat Surveillance</h1>
                <p className="text-gray-600">Real-time monitoring and interception of chat communications</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">{activeRooms.length} active rooms</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">Live</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Room List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Chat Rooms</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activeRooms.map((room) => (
                    <RoomCard key={room.id} room={room} />
                  ))}
                </div>
              </div>
            </div>

            {/* Chat Monitor */}
            <div className="lg:col-span-2">
              {selectedRoom ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  {/* Chat Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{selectedRoom.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{selectedRoom.participants.length} participants</span>
                        <span>Risk: <span className={getRiskColor(selectedRoom.riskLevel).split(' ')[0]}>{selectedRoom.riskLevel}</span></span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${
                          isRecording 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {isRecording ? <StopIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                        <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
                      </button>
                      <button
                        onClick={() => setInjectionMode(!injectionMode)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${
                          injectionMode 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        Injection Mode
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="h-96 overflow-y-auto p-4">
                    <div className="space-y-3">
                      {liveMessages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                      ))}
                      
                      {/* Typing Indicators */}
                      {typingIndicators.map((typing) => (
                        <TypingIndicator key={`${typing.userId}-${typing.timestamp}`} typing={typing} />
                      ))}
                      
                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  {/* Message Injection */}
                  {injectionMode && (
                    <div className="p-4 border-t border-gray-200 bg-purple-50">
                      <h4 className="text-sm font-medium text-purple-900 mb-2">Message Injection</h4>
                      <div className="flex space-x-2">
                        <select
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          className="px-3 py-2 border border-purple-300 rounded-lg text-sm"
                        >
                          <option value="">Select user to impersonate</option>
                          {selectedRoom.participants.map((participant) => (
                            <option key={participant.id} value={participant.id}>
                              {participant.username}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type message to inject..."
                          className="flex-1 px-3 py-2 border border-purple-300 rounded-lg text-sm"
                          onKeyPress={(e) => e.key === 'Enter' && handleInjectMessage()}
                        />
                        <button
                          onClick={handleInjectMessage}
                          disabled={!newMessage || !selectedUserId}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          Inject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Participants */}
                  <div className="p-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Participants</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedRoom.participants.map((participant) => (
                        <div key={participant.id} className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-full">
                          <div className={`w-2 h-2 rounded-full ${
                            participant.status === 'online' ? 'bg-green-400' :
                            participant.status === 'typing' ? 'bg-yellow-400' : 'bg-gray-400'
                          }`}></div>
                          <span className="text-sm text-gray-700">{participant.username}</span>
                          <MapPinIcon className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{participant.location}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Chat Room</h3>
                  <p className="text-gray-600">Choose a room from the left to start monitoring live conversations.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
