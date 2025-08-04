'use client';

import { useState, useEffect } from 'react';
import { useAdminSurveillance } from '@/hooks/useAdminSurveillance';
import AdminGuard from '@/components/admin/AdminGuard';
import { 
  UserIcon, 
  EyeIcon, 
  KeyIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  MapPinIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

interface ImpersonationSession {
  id: string;
  targetUserId: string;
  targetUsername: string;
  targetEmail: string;
  status: 'active' | 'paused' | 'terminated';
  startTime: string;
  duration: number;
  method: 'credential' | 'session_hijack' | 'token_clone';
  deviceInfo: {
    browser: string;
    os: string;
    ip: string;
    location: string;
  };
  activities: Array<{
    timestamp: string;
    action: string;
    details: string;
    success: boolean;
  }>;
  accessLevel: 'full' | 'limited' | 'read_only';
  riskLevel: 'low' | 'medium' | 'high';
}

interface TargetUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  lastSeen: string;
  status: 'online' | 'offline' | 'idle';
  securityLevel: 'low' | 'medium' | 'high';
  devices: Array<{
    id: string;
    type: string;
    browser: string;
    lastUsed: string;
    active: boolean;
  }>;
  vulnerabilities: string[];
  credentials: {
    hasPassword: boolean;
    has2FA: boolean;
    hasBackupCodes: boolean;
    passwordStrength: 'weak' | 'medium' | 'strong';
  };
}

export default function UserImpersonationPage() {
  const {
    getTargetUsers,
    createImpersonationSession,
    getActiveSessions,
    terminateSession,
    pauseSession,
    resumeSession,
    performActionAsUser,
    hijackSession,
    cloneUserToken
  } = useAdminSurveillance();

  const [targetUsers, setTargetUsers] = useState<TargetUser[]>([]);
  const [activeSessions, setActiveSessions] = useState<ImpersonationSession[]>([]);
  const [selectedUser, setSelectedUser] = useState<TargetUser | null>(null);
  const [selectedSession, setSelectedSession] = useState<ImpersonationSession | null>(null);
  const [impersonationMethod, setImpersonationMethod] = useState<'credential' | 'session_hijack' | 'token_clone'>('credential');
  const [loading, setLoading] = useState(true);
  const [actionCommand, setActionCommand] = useState('');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadActiveSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [users, sessions] = await Promise.all([
        getTargetUsers(),
        getActiveSessions()
      ]);
      setTargetUsers(users);
      setActiveSessions(sessions);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveSessions = async () => {
    try {
      const sessions = await getActiveSessions();
      setActiveSessions(sessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const handleStartImpersonation = async () => {
    if (!selectedUser) return;
    try {
      const session = await createImpersonationSession(selectedUser.id, impersonationMethod);
      setActiveSessions(prev => [...prev, session]);
      setSelectedSession(session);
      alert('Impersonation session started successfully');
    } catch (error) {
      console.error('Failed to start impersonation:', error);
      alert('Failed to start impersonation session');
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      await terminateSession(sessionId);
      setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
    } catch (error) {
      console.error('Failed to terminate session:', error);
    }
  };

  const handlePauseSession = async (sessionId: string) => {
    try {
      await pauseSession(sessionId);
      loadActiveSessions();
    } catch (error) {
      console.error('Failed to pause session:', error);
    }
  };

  const handleResumeSession = async (sessionId: string) => {
    try {
      await resumeSession(sessionId);
      loadActiveSessions();
    } catch (error) {
      console.error('Failed to resume session:', error);
    }
  };

  const handlePerformAction = async () => {
    if (!selectedSession || !actionCommand) return;
    try {
      const result = await performActionAsUser(selectedSession.id, actionCommand);
      alert(`Action executed: ${result.success ? 'Success' : 'Failed'}`);
      setActionCommand('');
      loadActiveSessions();
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'terminated': return 'text-red-600 bg-red-100';
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

  const UserCard = ({ user }: { user: TargetUser }) => (
    <div 
      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
        selectedUser?.id === user.id 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => setSelectedUser(user)}
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
          <div className={`w-2 h-2 rounded-full ${
            user.status === 'online' ? 'bg-green-400' :
            user.status === 'idle' ? 'bg-yellow-400' : 'bg-gray-400'
          }`}></div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(user.securityLevel)}`}>
            {user.securityLevel} security
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Password Strength:</span>
          <span className={`font-medium ${
            user.credentials.passwordStrength === 'weak' ? 'text-red-600' :
            user.credentials.passwordStrength === 'medium' ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {user.credentials.passwordStrength}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">2FA Enabled:</span>
          <span className={user.credentials.has2FA ? 'text-green-600' : 'text-red-600'}>
            {user.credentials.has2FA ? 'Yes' : 'No'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Active Devices:</span>
          <span className="text-gray-900">{user.devices.filter(d => d.active).length}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Last Seen:</span>
          <span className="text-gray-900">{user.lastSeen}</span>
        </div>
      </div>

      {user.vulnerabilities.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-600 mb-1">Vulnerabilities:</p>
          <div className="flex flex-wrap gap-1">
            {user.vulnerabilities.slice(0, 3).map((vuln, index) => (
              <span key={index} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                {vuln}
              </span>
            ))}
            {user.vulnerabilities.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                +{user.vulnerabilities.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const SessionCard = ({ session }: { session: ImpersonationSession }) => (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{session.targetUsername}</h3>
          <p className="text-sm text-gray-600">{session.targetEmail}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
            {session.status}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(session.riskLevel)}`}>
            {session.riskLevel} risk
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
        <div>
          <span className="text-gray-600">Method:</span>
          <span className="ml-2 font-medium">{session.method}</span>
        </div>
        <div>
          <span className="text-gray-600">Duration:</span>
          <span className="ml-2 font-medium">{Math.round(session.duration / 60)}m</span>
        </div>
        <div>
          <span className="text-gray-600">Access:</span>
          <span className="ml-2 font-medium">{session.accessLevel}</span>
        </div>
        <div>
          <span className="text-gray-600">IP:</span>
          <span className="ml-2 font-medium">{session.deviceInfo.ip}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setSelectedSession(session)}
          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
        >
          View Details
        </button>
        <div className="flex space-x-2">
          {session.status === 'active' && (
            <button
              onClick={() => handlePauseSession(session.id)}
              className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
            >
              Pause
            </button>
          )}
          {session.status === 'paused' && (
            <button
              onClick={() => handleResumeSession(session.id)}
              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              Resume
            </button>
          )}
          <button
            onClick={() => handleTerminateSession(session.id)}
            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Terminate
          </button>
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
                <h1 className="text-2xl font-bold text-gray-900">User Impersonation Control</h1>
                <p className="text-gray-600">Advanced account takeover and user impersonation management</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">{activeSessions.length} active sessions</span>
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600 font-medium">High Risk Operation</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Target Users */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Target Users</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {targetUsers.map((user) => (
                    <UserCard key={user.id} user={user} />
                  ))}
                </div>
              </div>

              {/* Impersonation Setup */}
              {selectedUser && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Setup Impersonation</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Impersonation Method
                    </label>
                    <select
                      value={impersonationMethod}
                      onChange={(e) => setImpersonationMethod(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="credential">Credential Takeover</option>
                      <option value="session_hijack">Session Hijacking</option>
                      <option value="token_clone">Token Cloning</option>
                    </select>
                  </div>

                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Target: {selectedUser.username}</h4>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p>Security Level: <span className="font-medium">{selectedUser.securityLevel}</span></p>
                      <p>2FA: <span className="font-medium">{selectedUser.credentials.has2FA ? 'Enabled' : 'Disabled'}</span></p>
                      <p>Password: <span className="font-medium">{selectedUser.credentials.passwordStrength}</span></p>
                      <p>Active Devices: <span className="font-medium">{selectedUser.devices.filter(d => d.active).length}</span></p>
                    </div>
                  </div>

                  <button
                    onClick={handleStartImpersonation}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <PlayIcon className="h-4 w-4" />
                    <span>Start Impersonation</span>
                  </button>
                </div>
              )}
            </div>

            {/* Sessions and Control */}
            <div className="lg:col-span-2">
              {/* Active Sessions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Impersonation Sessions</h2>
                {activeSessions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeSessions.map((session) => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <EyeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Sessions</h3>
                    <p className="text-gray-600">Select a target user to start an impersonation session.</p>
                  </div>
                )}
              </div>

              {/* Session Control */}
              {selectedSession && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Session Control: {selectedSession.targetUsername}
                  </h3>

                  {/* Session Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600">Status</p>
                      <p className={`font-semibold ${
                        selectedSession.status === 'active' ? 'text-green-600' :
                        selectedSession.status === 'paused' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {selectedSession.status}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600">Duration</p>
                      <p className="font-semibold text-gray-900">{Math.round(selectedSession.duration / 60)}m</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600">Access</p>
                      <p className="font-semibold text-gray-900">{selectedSession.accessLevel}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600">Risk</p>
                      <p className={`font-semibold ${
                        selectedSession.riskLevel === 'high' ? 'text-red-600' :
                        selectedSession.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {selectedSession.riskLevel}
                      </p>
                    </div>
                  </div>

                  {/* Action Control */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Execute Action as User
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={actionCommand}
                        onChange={(e) => setActionCommand(e.target.value)}
                        placeholder="Enter action command..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handlePerformAction}
                        disabled={!actionCommand}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                      >
                        Execute
                      </button>
                    </div>
                  </div>

                  {/* Recent Activities */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Activities</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedSession.activities.map((activity, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-2">
                            {activity.success ? (
                              <CheckCircleIcon className="h-4 w-4 text-green-500" />
                            ) : (
                              <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm text-gray-900">{activity.action}</span>
                          </div>
                          <span className="text-xs text-gray-500">{activity.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
