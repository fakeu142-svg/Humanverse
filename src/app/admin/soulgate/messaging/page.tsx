'use client';

import { useState, useEffect, useRef } from 'react';
import { useAdminSurveillance } from '@/hooks/useAdminSurveillance';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { 
  EnvelopeIcon,
  PaperAirplaneIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  DevicePhoneMobileIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlayIcon,
  PauseIcon,
  StopIcon
} from '@heroicons/react/24/outline';

interface DirectMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  recipientId: string;
  recipientUsername: string;
  content: string;
  originalContent?: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'intercepted' | 'modified' | 'blocked';
  type: 'text' | 'image' | 'file' | 'voice' | 'video';
  metadata: {
    ipAddress: string;
    deviceInfo: string;
    location: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    flagged: boolean;
    keywords: string[];
    threat_level: 'low' | 'medium' | 'high';
  };
  intervention: {
    intercepted: boolean;
    modified: boolean;
    blocked: boolean;
    reason?: string;
    adminId?: string;
  };
}

interface MessageFilter {
  userId?: string;
  keyword?: string;
  sentiment?: string;
  threatLevel?: string;
  dateRange?: { start: string; end: string };
  messageType?: string;
}

interface InterceptionRule {
  id: string;
  name: string;
  active: boolean;
  conditions: {
    keywords: string[];
    senderIds: string[];
    recipientIds: string[];
    sentiment: string[];
    threatLevel: string[];
  };
  actions: {
    intercept: boolean;
    modify: boolean;
    block: boolean;
    alert: boolean;
    notify_admin: boolean;
  };
  createdAt: string;
  triggeredCount: number;
}

export default function DirectMessagingControlPage() {
  const {
    getDirectMessages,
    interceptMessage,
    modifyMessage,
    blockMessage,
    getInterceptionRules,
    createInterceptionRule,
    updateInterceptionRule,
    deleteInterceptionRule,
    injectDirectMessage,
    getMessageAnalytics
  } = useAdminSurveillance();

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<DirectMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<DirectMessage | null>(null);
  const [interceptionRules, setInterceptionRules] = useState<InterceptionRule[]>([]);
  const [filter, setFilter] = useState<MessageFilter>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('messages');
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modifiedContent, setModifiedContent] = useState('');
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [isRealTime, setIsRealTime] = useState(true);

  useEffect(() => {
    loadMessages();
    loadInterceptionRules();
    
    if (isRealTime) {
      const interval = setInterval(loadMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [isRealTime]);

  useEffect(() => {
    applyFilters();
  }, [messages, filter, searchTerm]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const directMessages = await getDirectMessages();
      setMessages(directMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInterceptionRules = async () => {
    try {
      const rules = await getInterceptionRules();
      setInterceptionRules(rules);
    } catch (error) {
      console.error('Failed to load interception rules:', error);
    }
  };

  const applyFilters = () => {
    let filtered = messages;

    if (searchTerm) {
      filtered = filtered.filter(msg => 
        msg.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.senderUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.recipientUsername.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filter.sentiment) {
      filtered = filtered.filter(msg => msg.metadata.sentiment === filter.sentiment);
    }

    if (filter.threatLevel) {
      filtered = filtered.filter(msg => msg.metadata.threat_level === filter.threatLevel);
    }

    if (filter.messageType) {
      filtered = filtered.filter(msg => msg.type === filter.messageType);
    }

    setFilteredMessages(filtered);
  };

  const handleInterceptMessage = async (messageId: string) => {
    try {
      await interceptMessage(messageId);
      loadMessages();
      alert('Message intercepted successfully');
    } catch (error) {
      console.error('Failed to intercept message:', error);
    }
  };

  const handleModifyMessage = async () => {
    if (!selectedMessage || !modifiedContent) return;
    try {
      await modifyMessage(selectedMessage.id, modifiedContent);
      setShowModifyModal(false);
      setModifiedContent('');
      setSelectedMessage(null);
      loadMessages();
      alert('Message modified successfully');
    } catch (error) {
      console.error('Failed to modify message:', error);
    }
  };

  const handleBlockMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to block this message?')) return;
    try {
      await blockMessage(messageId);
      loadMessages();
      alert('Message blocked successfully');
    } catch (error) {
      console.error('Failed to block message:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'intercepted': return 'text-yellow-600 bg-yellow-100';
      case 'modified': return 'text-blue-600 bg-blue-100';
      case 'blocked': return 'text-red-600 bg-red-100';
      case 'read': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const MessageCard = ({ message }: { message: DirectMessage }) => (
    <div 
      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
        selectedMessage?.id === message.id 
          ? 'border-blue-500 bg-blue-50' 
          : message.metadata.flagged 
            ? 'border-red-300 bg-red-50' 
            : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => setSelectedMessage(message)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-900">{message.senderUsername}</span>
          <span className="text-gray-400">→</span>
          <span className="font-medium text-gray-900">{message.recipientUsername}</span>
        </div>
        <div className="flex items-center space-x-2">
          {message.metadata.flagged && (
            <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
          )}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
            {message.status}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getThreatColor(message.metadata.threat_level)}`}>
            {message.metadata.threat_level}
          </span>
        </div>
      </div>

      <div className="mb-2">
        <p className="text-gray-800 text-sm">{message.content}</p>
        {message.originalContent && message.originalContent !== message.content && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-xs text-yellow-800">Original: {message.originalContent}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <span>{message.timestamp}</span>
          <span>{message.type}</span>
          <span>{message.metadata.location}</span>
        </div>
        <div className="flex items-center space-x-2">
          {message.metadata.sentiment === 'positive' && (
            <span className="text-green-600">😊</span>
          )}
          {message.metadata.sentiment === 'negative' && (
            <span className="text-red-600">😞</span>
          )}
          {message.metadata.sentiment === 'neutral' && (
            <span className="text-gray-600">😐</span>
          )}
        </div>
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
  );

  const RuleCard = ({ rule }: { rule: InterceptionRule }) => (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{rule.name}</h3>
          <p className="text-sm text-gray-600">Triggered {rule.triggeredCount} times</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            rule.active ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
          }`}>
            {rule.active ? 'Active' : 'Inactive'}
          </span>
          <button className="text-blue-600 hover:text-blue-800 text-sm">
            Edit
          </button>
          <button className="text-red-600 hover:text-red-800 text-sm">
            Delete
          </button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        {rule.conditions.keywords.length > 0 && (
          <div>
            <span className="text-gray-600">Keywords: </span>
            <span className="text-gray-900">{rule.conditions.keywords.join(', ')}</span>
          </div>
        )}
        
        <div>
          <span className="text-gray-600">Actions: </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {rule.actions.intercept && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">Intercept</span>
            )}
            {rule.actions.modify && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">Modify</span>
            )}
            {rule.actions.block && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">Block</span>
            )}
            {rule.actions.alert && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">Alert</span>
            )}
          </div>
        </div>
      </div>
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
                <h1 className="text-2xl font-bold text-gray-900">Direct Message Control</h1>
                <p className="text-gray-600">Monitor, intercept, and manipulate direct messages</p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsRealTime(!isRealTime)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${
                    isRealTime 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {isRealTime ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                  <span>{isRealTime ? 'Pause' : 'Start'} Real-time</span>
                </button>
                <span className="text-sm text-gray-600">{filteredMessages.length} messages</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-8 mt-4">
              <button
                onClick={() => setActiveTab('messages')}
                className={`pb-2 text-sm font-medium border-b-2 ${
                  activeTab === 'messages'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Message Feed
              </button>
              <button
                onClick={() => setActiveTab('rules')}
                className={`pb-2 text-sm font-medium border-b-2 ${
                  activeTab === 'rules'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Interception Rules
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`pb-2 text-sm font-medium border-b-2 ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Analytics
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'messages' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Filters and Messages */}
              <div className="lg:col-span-2">
                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="relative flex-1">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search messages, users, or keywords..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <select
                      value={filter.sentiment || ''}
                      onChange={(e) => setFilter(prev => ({ ...prev, sentiment: e.target.value || undefined }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Sentiments</option>
                      <option value="positive">Positive</option>
                      <option value="negative">Negative</option>
                      <option value="neutral">Neutral</option>
                    </select>
                    <select
                      value={filter.threatLevel || ''}
                      onChange={(e) => setFilter(prev => ({ ...prev, threatLevel: e.target.value || undefined }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Threat Levels</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Live Message Feed</h2>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {filteredMessages.map((message) => (
                        <MessageCard key={message.id} message={message} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Message Details */}
              <div className="lg:col-span-1">
                {selectedMessage ? (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Actions</h3>
                    
                    <div className="space-y-3">
                      <button
                        onClick={() => handleInterceptMessage(selectedMessage.id)}
                        disabled={selectedMessage.intervention.intercepted}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                      >
                        <EyeIcon className="h-4 w-4" />
                        <span>Intercept Message</span>
                      </button>

                      <button
                        onClick={() => {
                          setModifiedContent(selectedMessage.content);
                          setShowModifyModal(true);
                        }}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <PencilIcon className="h-4 w-4" />
                        <span>Modify Content</span>
                      </button>

                      <button
                        onClick={() => handleBlockMessage(selectedMessage.id)}
                        disabled={selectedMessage.intervention.blocked}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span>Block Message</span>
                      </button>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Message Details</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">IP Address:</span>
                          <span className="ml-2 text-gray-900">{selectedMessage.metadata.ipAddress}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Device:</span>
                          <span className="ml-2 text-gray-900">{selectedMessage.metadata.deviceInfo}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Location:</span>
                          <span className="ml-2 text-gray-900">{selectedMessage.metadata.location}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Sentiment:</span>
                          <span className="ml-2 text-gray-900">{selectedMessage.metadata.sentiment}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                    <EnvelopeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Message</h3>
                    <p className="text-gray-600">Choose a message to view details and available actions.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Interception Rules</h2>
                <button
                  onClick={() => setShowCreateRule(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Rule
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {interceptionRules.map((rule) => (
                  <RuleCard key={rule.id} rule={rule} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Message Analytics</h2>
              <p className="text-gray-600">Advanced analytics and reporting interface will be implemented here.</p>
            </div>
          )}
        </div>

        {/* Modify Message Modal */}
        {showModifyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Modify Message Content</h3>
              <textarea
                value={modifiedContent}
                onChange={(e) => setModifiedContent(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter modified message content..."
              />
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => setShowModifyModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModifyMessage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Modify
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
