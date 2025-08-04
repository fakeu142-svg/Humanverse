'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminSurveillance } from '@/hooks/useAdminSurveillance';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { 
  UserIcon, 
  ChatBubbleLeftIcon, 
  EyeIcon, 
  DocumentDuplicateIcon,
  UserPlusIcon,
  EnvelopeIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  ClockIcon,
  WifiIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';

export default function AdminSoulgateDashboard() {
  const { admin } = useAdminAuth();
  const {
    activeUsers,
    surveillanceAlerts,
    activeOperations,
    impersonationSessions,
    fakeUsers,
    interceptedMessages,
    totalUsers,
    onlineUsers,
    activeFakeUsers,
    totalInterceptions
  } = useAdminSurveillance();

  const [selectedTab, setSelectedTab] = useState('overview');
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'users', name: 'User Surveillance', icon: UserIcon },
    { id: 'chat', name: 'Live Chat Monitor', icon: ChatBubbleLeftIcon },
    { id: 'impersonation', name: 'Account Control', icon: EyeIcon },
    { id: 'fake-users', name: 'Fake Users', icon: UserPlusIcon },
    { id: 'messages', name: 'Message Control', icon: EnvelopeIcon },
    { id: 'analytics', name: 'Analytics', icon: ChartBarIcon },
    { id: 'alerts', name: 'Security Alerts', icon: ExclamationTriangleIcon }
  ];

  const StatCard = ({ title, value, icon: Icon, trend, color = 'blue' }: any) => (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
          {trend && (
            <p className={`text-sm ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.value} {trend.label}
            </p>
          )}
        </div>
        <div className={`p-3 bg-${color}-100 rounded-lg`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  const AlertItem = ({ alert }: any) => (
    <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center space-x-3">
        <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
        <div>
          <p className="text-sm font-medium text-red-800">{alert.type}</p>
          <p className="text-xs text-red-600">{alert.message}</p>
        </div>
      </div>
      <span className="text-xs text-red-500">{alert.timestamp}</span>
    </div>
  );

  const ActiveOperation = ({ operation }: any) => (
    <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center space-x-3">
        <WifiIcon className="h-5 w-5 text-blue-500" />
        <div>
          <p className="text-sm font-medium text-blue-800">{operation.type}</p>
          <p className="text-xs text-blue-600">{operation.target}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Active
        </span>
        <button className="text-xs text-blue-600 hover:text-blue-800">
          Monitor
        </button>
      </div>
    </div>
  );

  const LiveUserActivity = ({ user }: any) => (
    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <UserIcon className="h-4 w-4 text-gray-600" />
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{user.username}</p>
          <p className="text-xs text-gray-500">{user.currentActivity}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <MapPinIcon className="h-4 w-4 text-gray-400" />
        <span className="text-xs text-gray-500">{user.location}</span>
        <button className="text-xs text-blue-600 hover:text-blue-800">
          Surveil
        </button>
      </div>
    </div>
  );

  return (
    <AdminGuard requiredRole="super_admin">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">SoulGate Admin</h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Surveillance Active
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-gray-600">Real-time: ON</span>
                </div>
                <button
                  onClick={() => setRealTimeUpdates(!realTimeUpdates)}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    realTimeUpdates 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {realTimeUpdates ? 'Disable' : 'Enable'} Live Updates
                </button>
                <span className="text-sm text-gray-600">Admin: {admin?.username}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === tab.id
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

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {selectedTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Users"
                  value={totalUsers.toLocaleString()}
                  icon={UserIcon}
                  trend={{ positive: true, value: '+12%', label: 'this week' }}
                  color="blue"
                />
                <StatCard
                  title="Online Now"
                  value={onlineUsers.toLocaleString()}
                  icon={WifiIcon}
                  trend={{ positive: false, value: '-3%', label: 'from yesterday' }}
                  color="green"
                />
                <StatCard
                  title="Active Fake Users"
                  value={activeFakeUsers}
                  icon={UserPlusIcon}
                  color="purple"
                />
                <StatCard
                  title="Messages Intercepted"
                  value={totalInterceptions.toLocaleString()}
                  icon={EnvelopeIcon}
                  trend={{ positive: true, value: '+28%', label: 'today' }}
                  color="red"
                />
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Surveillance Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <EyeIcon className="h-8 w-8 text-blue-600 mb-2" />
                    <span className="text-sm font-medium">Monitor User</span>
                  </button>
                  <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <UserPlusIcon className="h-8 w-8 text-purple-600 mb-2" />
                    <span className="text-sm font-medium">Deploy Fake User</span>
                  </button>
                  <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <DocumentDuplicateIcon className="h-8 w-8 text-green-600 mb-2" />
                    <span className="text-sm font-medium">Impersonate</span>
                  </button>
                  <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <EnvelopeIcon className="h-8 w-8 text-red-600 mb-2" />
                    <span className="text-sm font-medium">Intercept Messages</span>
                  </button>
                </div>
              </div>

              {/* Live Activity Feed */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Security Alerts</h3>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {surveillanceAlerts.length} Active
                    </span>
                  </div>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {surveillanceAlerts.slice(0, 5).map((alert, index) => (
                      <AlertItem key={index} alert={alert} />
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Active Operations</h3>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {activeOperations.length} Running
                    </span>
                  </div>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {activeOperations.slice(0, 5).map((operation, index) => (
                      <ActiveOperation key={index} operation={operation} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Live User Activity */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Live User Activity</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-600">Live</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeUsers.slice(0, 6).map((user, index) => (
                    <LiveUserActivity key={index} user={user} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'users' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">User Surveillance Interface</h3>
              <p className="text-gray-600">Advanced user monitoring and tracking interface will be implemented here.</p>
            </div>
          )}

          {selectedTab === 'chat' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Chat Surveillance</h3>
              <p className="text-gray-600">Real-time chat monitoring and interception interface will be implemented here.</p>
            </div>
          )}

          {selectedTab === 'impersonation' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Impersonation Control</h3>
              <p className="text-gray-600">User account takeover and impersonation management interface will be implemented here.</p>
            </div>
          )}

          {selectedTab === 'fake-users' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Fake User Management</h3>
              <p className="text-gray-600">Fake user creation and infiltration management interface will be implemented here.</p>
            </div>
          )}

          {selectedTab === 'messages' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Interception Control</h3>
              <p className="text-gray-600">Direct messaging control and manipulation interface will be implemented here.</p>
            </div>
          )}

          {selectedTab === 'analytics' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Surveillance Analytics</h3>
              <p className="text-gray-600">Data export and analysis tools interface will be implemented here.</p>
            </div>
          )}

          {selectedTab === 'alerts' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Alert Management</h3>
              <p className="text-gray-600">Comprehensive alert management and response interface will be implemented here.</p>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
