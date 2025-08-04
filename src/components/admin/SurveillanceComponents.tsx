'use client';

import { useState, useEffect } from 'react';
import { 
  EyeIcon,
  UserIcon,
  MapPinIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  WifiIcon,
  MicrophoneIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  PhotoIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

// Real-time User Monitor Component
export const RealTimeUserMonitor = ({ userId }: { userId: string }) => {
  const [userActivity, setUserActivity] = useState({
    status: 'online',
    currentAction: 'Browsing chat rooms',
    location: 'New York, NY',
    device: 'iPhone 15',
    lastSeen: '2 minutes ago',
    heartRate: 78,
    keystrokePattern: 'normal',
    mouseMovement: 'active'
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Real-time Monitor</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-green-600 font-medium">Live</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <WifiIcon className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-gray-600">Status</span>
          </div>
          <span className="text-sm font-medium text-green-600">{userActivity.status}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <EyeIcon className="h-4 w-4 text-purple-500" />
            <span className="text-sm text-gray-600">Current Action</span>
          </div>
          <span className="text-sm font-medium text-gray-900">{userActivity.currentAction}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPinIcon className="h-4 w-4 text-red-500" />
            <span className="text-sm text-gray-600">Location</span>
          </div>
          <span className="text-sm font-medium text-gray-900">{userActivity.location}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DevicePhoneMobileIcon className="h-4 w-4 text-green-500" />
            <span className="text-sm text-gray-600">Device</span>
          </div>
          <span className="text-sm font-medium text-gray-900">{userActivity.device}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HeartIcon className="h-4 w-4 text-pink-500" />
            <span className="text-sm text-gray-600">Heart Rate</span>
          </div>
          <span className="text-sm font-medium text-pink-600">{userActivity.heartRate} BPM</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-center p-2 bg-blue-50 rounded">
            <p className="text-blue-600 font-medium">Keystroke</p>
            <p className="text-blue-800">{userActivity.keystrokePattern}</p>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <p className="text-green-600 font-medium">Mouse</p>
            <p className="text-green-800">{userActivity.mouseMovement}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Threat Assessment Widget
export const ThreatAssessmentWidget = ({ userId }: { userId: string }) => {
  const [threats, setThreats] = useState([
    { type: 'Suspicious messaging pattern', level: 'medium', timestamp: '5 min ago' },
    { type: 'Unusual login location', level: 'high', timestamp: '12 min ago' },
    { type: 'Password sharing attempt', level: 'low', timestamp: '1 hour ago' }
  ]);

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Threat Assessment</h3>
        <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      </div>

      <div className="space-y-3">
        {threats.map((threat, index) => (
          <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{threat.type}</p>
              <p className="text-xs text-gray-500">{threat.timestamp}</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getThreatColor(threat.level)}`}>
              {threat.level}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Overall Risk Level</span>
          <span className="font-medium text-red-600">High</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div className="bg-red-600 h-2 rounded-full" style={{ width: '75%' }}></div>
        </div>
      </div>
    </div>
  );
};

// Live Communication Feed
export const LiveCommunicationFeed = ({ userId }: { userId: string }) => {
  const [communications, setCommunications] = useState([
    {
      type: 'message',
      content: 'Hey, want to meet up later?',
      recipient: 'Sarah Johnson',
      timestamp: '2 min ago',
      platform: 'Direct Message',
      flagged: false
    },
    {
      type: 'call',
      content: 'Voice call - 5 minutes',
      recipient: 'Mike Chen',
      timestamp: '15 min ago',
      platform: 'Voice Chat',
      flagged: true
    },
    {
      type: 'message',
      content: 'Can you send me those photos?',
      recipient: 'Alex Rivera',
      timestamp: '1 hour ago',
      platform: 'Group Chat',
      flagged: false
    }
  ]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return <MicrophoneIcon className="h-4 w-4 text-green-500" />;
      case 'video': return <VideoCameraIcon className="h-4 w-4 text-blue-500" />;
      default: return <ChatBubbleLeftRightIcon className="h-4 w-4 text-purple-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Live Communications</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-blue-600">Monitoring</span>
        </div>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {communications.map((comm, index) => (
          <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg ${
            comm.flagged ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
          }`}>
            <div className="flex-shrink-0 mt-1">
              {getTypeIcon(comm.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{comm.recipient}</p>
                <span className="text-xs text-gray-500">{comm.timestamp}</span>
              </div>
              <p className="text-sm text-gray-600 truncate">{comm.content}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500">{comm.platform}</span>
                {comm.flagged && (
                  <ExclamationTriangleIcon className="h-3 w-3 text-red-500" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Psychological Profile Widget
export const PsychologicalProfileWidget = ({ userId }: { userId: string }) => {
  const [profile, setProfile] = useState({
    personalityType: 'ENFP - The Campaigner',
    emotionalState: 'Anxious',
    stressLevel: 65,
    socialActivity: 'High',
    riskFactors: ['Impulsiveness', 'Trust issues', 'Financial stress'],
    predictedBehaviors: ['Likely to overshare', 'Susceptible to manipulation', 'Seeks validation']
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Psychological Profile</h3>
        <HeartIcon className="h-5 w-5 text-pink-500" />
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-600">Personality Type</label>
          <p className="text-lg font-semibold text-blue-600">{profile.personalityType}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600">Current Emotional State</label>
          <p className="text-lg font-semibold text-orange-600">{profile.emotionalState}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600">Stress Level</label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full" 
                style={{ width: `${profile.stressLevel}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium text-red-600">{profile.stressLevel}%</span>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600">Risk Factors</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {profile.riskFactors.map((factor, index) => (
              <span key={index} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                {factor}
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600">Predicted Behaviors</label>
          <div className="space-y-1 mt-1">
            {profile.predictedBehaviors.map((behavior, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                <span className="text-xs text-gray-700">{behavior}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Device & Session Monitor
export const DeviceSessionMonitor = ({ userId }: { userId: string }) => {
  const [devices, setDevices] = useState([
    {
      id: '1',
      type: 'mobile',
      name: 'iPhone 15 Pro',
      browser: 'Safari',
      location: 'New York, NY',
      lastActive: '2 min ago',
      isActive: true,
      ipAddress: '192.168.1.100'
    },
    {
      id: '2',
      type: 'desktop',
      name: 'MacBook Pro',
      browser: 'Chrome',
      location: 'New York, NY',
      lastActive: '1 hour ago',
      isActive: false,
      ipAddress: '192.168.1.101'
    }
  ]);

  const getDeviceIcon = (type: string) => {
    return type === 'mobile' 
      ? <DevicePhoneMobileIcon className="h-5 w-5 text-blue-500" />
      : <ComputerDesktopIcon className="h-5 w-5 text-green-500" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Active Devices</h3>
        <span className="text-sm text-gray-600">{devices.filter(d => d.isActive).length} active</span>
      </div>

      <div className="space-y-3">
        {devices.map((device) => (
          <div key={device.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="relative">
                {getDeviceIcon(device.type)}
                {device.isActive && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{device.name}</p>
                <p className="text-xs text-gray-600">{device.browser} • {device.location}</p>
                <p className="text-xs text-gray-500">IP: {device.ipAddress}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">{device.lastActive}</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                device.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {device.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Sessions Today</span>
          <span className="font-medium text-gray-900">3</span>
        </div>
      </div>
    </div>
  );
};

// Quick Action Panel
export const QuickActionPanel = ({ userId }: { userId: string }) => {
  const [isMonitoring, setIsMonitoring] = useState(true);

  const quickActions = [
    { id: 'monitor', label: 'Toggle Monitor', icon: EyeIcon, color: 'blue' },
    { id: 'impersonate', label: 'Impersonate', icon: UserIcon, color: 'purple' },
    { id: 'block', label: 'Block User', icon: ExclamationTriangleIcon, color: 'red' },
    { id: 'extract', label: 'Extract Data', icon: DocumentTextIcon, color: 'green' }
  ];

  const handleAction = (actionId: string) => {
    switch (actionId) {
      case 'monitor':
        setIsMonitoring(!isMonitoring);
        break;
      case 'impersonate':
        alert('Impersonation session initiated');
        break;
      case 'block':
        if (confirm('Are you sure you want to block this user?')) {
          alert('User blocked successfully');
        }
        break;
      case 'extract':
        alert('Data extraction started');
        break;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action.id)}
            className={`flex flex-col items-center p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-${action.color}-300 hover:bg-${action.color}-50 transition-colors`}
          >
            <action.icon className={`h-6 w-6 text-${action.color}-600 mb-2`} />
            <span className={`text-sm font-medium text-${action.color}-700`}>{action.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Live Monitoring</span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className={`text-sm font-medium ${isMonitoring ? 'text-green-600' : 'text-gray-600'}`}>
              {isMonitoring ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Location Tracker Widget
export const LocationTrackerWidget = ({ userId }: { userId: string }) => {
  const [location, setLocation] = useState({
    current: {
      address: '123 Main St, New York, NY 10001',
      coordinates: { lat: 40.7128, lng: -74.0060 },
      accuracy: '5 meters',
      timestamp: '2 minutes ago'
    },
    history: [
      { address: 'Central Park, New York, NY', time: '1 hour ago' },
      { address: 'Times Square, New York, NY', time: '3 hours ago' },
      { address: 'Brooklyn Bridge, NY', time: '5 hours ago' }
    ]
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Location Tracker</h3>
        <MapPinIcon className="h-5 w-5 text-red-500" />
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-600">Current Location</label>
          <p className="text-sm text-gray-900 mt-1">{location.current.address}</p>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
            <span>Accuracy: {location.current.accuracy}</span>
            <span>{location.current.timestamp}</span>
          </div>
        </div>

        <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center">
          <span className="text-gray-500 text-sm">Interactive map would be displayed here</span>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600">Recent Locations</label>
          <div className="space-y-2 mt-2">
            {location.history.map((loc, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-900">{loc.address}</span>
                <span className="text-gray-500">{loc.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// All components export
export const SurveillanceComponents = {
  RealTimeUserMonitor,
  ThreatAssessmentWidget,
  LiveCommunicationFeed,
  PsychologicalProfileWidget,
  DeviceSessionMonitor,
  QuickActionPanel,
  LocationTrackerWidget
};
