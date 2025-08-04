'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { 
  KeyIcon,
  ShieldCheckIcon,
  UserIcon,
  ClockIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LockClosedIcon,
  EyeIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'analyst';
  status: 'active' | 'suspended' | 'inactive';
  lastLogin: string;
  permissions: string[];
  createdAt: string;
  loginAttempts: number;
  isLocked: boolean;
  twoFactorEnabled: boolean;
  sessions: Array<{
    id: string;
    ipAddress: string;
    userAgent: string;
    location: string;
    lastActivity: string;
    isActive: boolean;
  }>;
}

interface SecurityLog {
  id: string;
  timestamp: string;
  adminId: string;
  adminUsername: string;
  action: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'success' | 'failed' | 'blocked';
}

interface SecuritySettings {
  sessionTimeout: number;
  maxLoginAttempts: number;
  requireTwoFactor: boolean;
  allowedIpRanges: string[];
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
    maxAge: number;
  };
  accessRestrictions: {
    timeWindows: Array<{ start: string; end: string; days: string[] }>;
    allowedLocations: string[];
    maxConcurrentSessions: number;
  };
}

export default function AdminAuthenticationPage() {
  const { admin, updateSecuritySettings, getSecurityLogs } = useAdminAuth();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    sessionTimeout: 60,
    maxLoginAttempts: 5,
    requireTwoFactor: true,
    allowedIpRanges: ['192.168.1.0/24', '10.0.0.0/8'],
    passwordPolicy: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: true,
      maxAge: 90
    },
    accessRestrictions: {
      timeWindows: [{ start: '09:00', end: '18:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }],
      allowedLocations: ['United States', 'Canada'],
      maxConcurrentSessions: 3
    }
  });
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load admin users, security logs, and settings
      const [users, logs] = await Promise.all([
        loadAdminUsers(),
        getSecurityLogs()
      ]);
      setAdminUsers(users);
      setSecurityLogs(logs);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminUsers = async () => {
    // Mock data - replace with actual API call
    return [
      {
        id: '1',
        username: 'super_admin',
        email: 'admin@soulgate.com',
        role: 'super_admin',
        status: 'active',
        lastLogin: '2 minutes ago',
        permissions: ['all'],
        createdAt: '2024-01-01',
        loginAttempts: 0,
        isLocked: false,
        twoFactorEnabled: true,
        sessions: [
          {
            id: 's1',
            ipAddress: '192.168.1.100',
            userAgent: 'Chrome/120.0.0.0',
            location: 'New York, NY',
            lastActivity: '2 minutes ago',
            isActive: true
          }
        ]
      },
      {
        id: '2',
        username: 'surveillance_admin',
        email: 'surveillance@soulgate.com',
        role: 'admin',
        status: 'active',
        lastLogin: '1 hour ago',
        permissions: ['surveillance', 'user_management', 'data_access'],
        createdAt: '2024-01-15',
        loginAttempts: 1,
        isLocked: false,
        twoFactorEnabled: false,
        sessions: []
      }
    ];
  };

  const handleUpdateSecuritySettings = async () => {
    try {
      await updateSecuritySettings(securitySettings);
      alert('Security settings updated successfully');
    } catch (error) {
      console.error('Failed to update settings:', error);
      alert('Failed to update security settings');
    }
  };

  const handleSuspendAdmin = async (adminId: string) => {
    if (!confirm('Are you sure you want to suspend this admin?')) return;
    try {
      // API call to suspend admin
      alert('Admin suspended successfully');
      loadData();
    } catch (error) {
      console.error('Failed to suspend admin:', error);
    }
  };

  const handleTerminateSession = async (adminId: string, sessionId: string) => {
    try {
      // API call to terminate session
      alert('Session terminated successfully');
      loadData();
    } catch (error) {
      console.error('Failed to terminate session:', error);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'text-red-600 bg-red-100';
      case 'admin': return 'text-blue-600 bg-blue-100';
      case 'moderator': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'suspended': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const AdminUserCard = ({ user }: { user: AdminUser }) => (
    <div 
      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
        selectedAdmin?.id === user.id 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => setSelectedAdmin(user)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            <UserIcon className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{user.username}</h3>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
            {user.role}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
            {user.status}
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Last Login:</span>
          <span className="text-gray-900">{user.lastLogin}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-600">2FA Enabled:</span>
          <span className={user.twoFactorEnabled ? 'text-green-600' : 'text-red-600'}>
            {user.twoFactorEnabled ? 'Yes' : 'No'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Active Sessions:</span>
          <span className="text-gray-900">{user.sessions.filter(s => s.isActive).length}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Failed Attempts:</span>
          <span className={`font-medium ${user.loginAttempts > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {user.loginAttempts}
          </span>
        </div>
      </div>

      {user.isLocked && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded flex items-center space-x-2">
          <LockClosedIcon className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-700 font-medium">Account Locked</span>
        </div>
      )}
    </div>
  );

  const SecurityLogItem = ({ log }: { log: SecurityLog }) => (
    <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-lg ${
          log.status === 'success' ? 'bg-green-100' :
          log.status === 'failed' ? 'bg-red-100' : 'bg-yellow-100'
        }`}>
          {log.status === 'success' ? (
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
          ) : (
            <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-gray-900">{log.adminUsername}</span>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-600">{log.action}</span>
          </div>
          <p className="text-sm text-gray-600">{log.details}</p>
          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
            <span>{log.timestamp}</span>
            <span>IP: {log.ipAddress}</span>
          </div>
        </div>
      </div>
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(log.riskLevel)}`}>
        {log.riskLevel}
      </span>
    </div>
  );

  const tabs = [
    { id: 'users', name: 'Admin Users', icon: UserIcon },
    { id: 'security', name: 'Security Settings', icon: ShieldCheckIcon },
    { id: 'logs', name: 'Security Logs', icon: ClockIcon },
    { id: 'sessions', name: 'Active Sessions', icon: ComputerDesktopIcon }
  ];

  return (
    <AdminGuard requiredRole="super_admin">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Authentication & Security</h1>
                <p className="text-gray-600">Manage admin users, security settings, and access controls</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <ShieldCheckIcon className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-green-600 font-medium">Security Active</span>
                </div>
                <span className="text-sm text-gray-600">{adminUsers.filter(u => u.status === 'active').length} active admins</span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex space-x-8 mt-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
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

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Admin Users List */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Admin Users</h2>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <PlusIcon className="h-4 w-4" />
                      <span>Add Admin</span>
                    </button>
                  </div>
                  <div className="space-y-3">
                    {adminUsers.map((user) => (
                      <AdminUserCard key={user.id} user={user} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Admin Details */}
              <div className="lg:col-span-1">
                {selectedAdmin ? (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Details</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Permissions</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedAdmin.permissions.map((perm, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {perm}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600">Active Sessions</label>
                        <div className="space-y-2 mt-2">
                          {selectedAdmin.sessions.map((session) => (
                            <div key={session.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div>
                                <p className="text-sm text-gray-900">{session.location}</p>
                                <p className="text-xs text-gray-500">{session.ipAddress}</p>
                              </div>
                              <button
                                onClick={() => handleTerminateSession(selectedAdmin.id, session.id)}
                                className="text-xs text-red-600 hover:text-red-800"
                              >
                                Terminate
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <button
                          onClick={() => handleSuspendAdmin(selectedAdmin.id)}
                          disabled={selectedAdmin.status === 'suspended'}
                          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          Suspend Admin
                        </button>
                        <button className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                          Reset Password
                        </button>
                        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                          Edit Permissions
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                    <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Select an Admin</h3>
                    <p className="text-gray-600">Choose an admin user to view details and manage permissions.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-md font-medium text-gray-900 mb-4">Authentication</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Session Timeout (minutes)
                        </label>
                        <input
                          type="number"
                          value={securitySettings.sessionTimeout}
                          onChange={(e) => setSecuritySettings(prev => ({ 
                            ...prev, 
                            sessionTimeout: parseInt(e.target.value) 
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Login Attempts
                        </label>
                        <input
                          type="number"
                          value={securitySettings.maxLoginAttempts}
                          onChange={(e) => setSecuritySettings(prev => ({ 
                            ...prev, 
                            maxLoginAttempts: parseInt(e.target.value) 
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={securitySettings.requireTwoFactor}
                          onChange={(e) => setSecuritySettings(prev => ({ 
                            ...prev, 
                            requireTwoFactor: e.target.checked 
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-900">
                          Require Two-Factor Authentication
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-md font-medium text-gray-900 mb-4">Password Policy</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Minimum Length
                        </label>
                        <input
                          type="number"
                          value={securitySettings.passwordPolicy.minLength}
                          onChange={(e) => setSecuritySettings(prev => ({ 
                            ...prev, 
                            passwordPolicy: {
                              ...prev.passwordPolicy,
                              minLength: parseInt(e.target.value)
                            }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        {[
                          { key: 'requireUppercase', label: 'Require Uppercase' },
                          { key: 'requireLowercase', label: 'Require Lowercase' },
                          { key: 'requireNumbers', label: 'Require Numbers' },
                          { key: 'requireSymbols', label: 'Require Symbols' }
                        ].map((rule) => (
                          <div key={rule.key} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={securitySettings.passwordPolicy[rule.key as keyof typeof securitySettings.passwordPolicy] as boolean}
                              onChange={(e) => setSecuritySettings(prev => ({ 
                                ...prev, 
                                passwordPolicy: {
                                  ...prev.passwordPolicy,
                                  [rule.key]: e.target.checked
                                }
                              }))}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-gray-900">
                              {rule.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleUpdateSecuritySettings}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Update Security Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Logs</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {securityLogs.map((log) => (
                  <SecurityLogItem key={log.id} log={log} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Admin Sessions</h2>
              <p className="text-gray-600">Monitor and manage active administrative sessions.</p>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
