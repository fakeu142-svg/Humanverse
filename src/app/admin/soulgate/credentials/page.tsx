'use client';

import { useState, useEffect } from 'react';
import { useAdminSurveillance } from '@/hooks/useAdminSurveillance';
import AdminGuard from '@/components/admin/AdminGuard';
import { 
  UserIcon, 
  KeyIcon, 
  EyeIcon, 
  EyeSlashIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface UserCredential {
  id: string;
  userId: string;
  username: string;
  email: string;
  passwordHash: string;
  lastLogin: string;
  loginAttempts: number;
  isLocked: boolean;
  securityQuestions: Array<{
    question: string;
    answer: string;
  }>;
  twoFactorEnabled: boolean;
  backupCodes: string[];
  deviceTokens: string[];
  ipHistory: string[];
  passwordHistory: string[];
  accountCreated: string;
  lastPasswordChange: string;
}

export default function CredentialManagementPage() {
  const { 
    getUserCredentials, 
    updateUserCredentials, 
    resetUserPassword, 
    unlockUserAccount,
    impersonateUser,
    extractUserSecrets
  } = useAdminSurveillance();

  const [credentials, setCredentials] = useState<UserCredential[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserCredential | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingCredential, setEditingCredential] = useState<string | null>(null);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    setLoading(true);
    try {
      const userCredentials = await getUserCredentials();
      setCredentials(userCredentials);
    } catch (error) {
      console.error('Failed to load credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (userId: string) => {
    try {
      const newPassword = await resetUserPassword(userId);
      alert(`Password reset successful. New password: ${newPassword}`);
      loadCredentials();
    } catch (error) {
      console.error('Password reset failed:', error);
    }
  };

  const handleAccountUnlock = async (userId: string) => {
    try {
      await unlockUserAccount(userId);
      alert('Account unlocked successfully');
      loadCredentials();
    } catch (error) {
      console.error('Account unlock failed:', error);
    }
  };

  const handleImpersonate = async (userId: string) => {
    try {
      const sessionToken = await impersonateUser(userId);
      alert(`Impersonation session created. Token: ${sessionToken}`);
    } catch (error) {
      console.error('Impersonation failed:', error);
    }
  };

  const handleExtractSecrets = async (userId: string) => {
    try {
      const secrets = await extractUserSecrets(userId);
      setSelectedUser(prev => prev ? { ...prev, extractedSecrets: secrets } : null);
    } catch (error) {
      console.error('Secret extraction failed:', error);
    }
  };

  const filteredCredentials = credentials.filter(cred =>
    cred.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cred.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const CredentialCard = ({ credential }: { credential: UserCredential }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <UserIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{credential.username}</h3>
            <p className="text-sm text-gray-600">{credential.email}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {credential.isLocked && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Locked
            </span>
          )}
          {credential.twoFactorEnabled && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              2FA
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600">Password Hash</label>
            <div className="flex items-center space-x-2 mt-1">
              <input
                type={showPasswords ? 'text' : 'password'}
                value={credential.passwordHash}
                className="text-sm font-mono bg-gray-50 border border-gray-200 rounded px-2 py-1 w-full"
                readOnly
              />
              <button
                onClick={() => navigator.clipboard.writeText(credential.passwordHash)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Last Login</label>
            <p className="text-sm text-gray-900 mt-1">{credential.lastLogin}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600">Login Attempts</label>
            <p className={`text-sm mt-1 ${credential.loginAttempts > 3 ? 'text-red-600' : 'text-gray-900'}`}>
              {credential.loginAttempts}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Account Created</label>
            <p className="text-sm text-gray-900 mt-1">{credential.accountCreated}</p>
          </div>
        </div>

        {credential.securityQuestions.length > 0 && (
          <div>
            <label className="text-xs font-medium text-gray-600">Security Questions</label>
            <div className="mt-1 space-y-1">
              {credential.securityQuestions.map((qa, index) => (
                <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                  <p className="font-medium">{qa.question}</p>
                  <p className="text-gray-600">Answer: {showPasswords ? qa.answer : '••••••••'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {credential.backupCodes.length > 0 && (
          <div>
            <label className="text-xs font-medium text-gray-600">2FA Backup Codes</label>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {credential.backupCodes.map((code, index) => (
                <div key={index} className="text-xs font-mono bg-gray-50 p-1 rounded text-center">
                  {showPasswords ? code : '••••-••••'}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-gray-600">Recent IP Addresses</label>
          <div className="mt-1 flex flex-wrap gap-1">
            {credential.ipHistory.slice(0, 5).map((ip, index) => (
              <span key={index} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                {ip}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <button
            onClick={() => handlePasswordReset(credential.userId)}
            className="px-3 py-1 text-xs font-medium text-orange-700 bg-orange-100 rounded hover:bg-orange-200 transition-colors"
          >
            Reset Password
          </button>
          {credential.isLocked && (
            <button
              onClick={() => handleAccountUnlock(credential.userId)}
              className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors"
            >
              Unlock Account
            </button>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => handleExtractSecrets(credential.userId)}
            className="px-3 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded hover:bg-purple-200 transition-colors"
          >
            Extract Secrets
          </button>
          <button
            onClick={() => handleImpersonate(credential.userId)}
            className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
          >
            Impersonate
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <AdminGuard requiredRole="super_admin">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">User Credential Management</h1>
            <p className="text-gray-600 mt-2">Access and manage user credentials, passwords, and security settings</p>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search users by username or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                  />
                </div>
                <button
                  onClick={() => setShowPasswords(!showPasswords)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
                    showPasswords 
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                >
                  {showPasswords ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">
                    {showPasswords ? 'Hide' : 'Show'} Sensitive Data
                  </span>
                </button>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {filteredCredentials.length} users found
                </span>
                <button
                  onClick={loadCredentials}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Refresh Data
                </button>
              </div>
            </div>
          </div>

          {/* Credentials Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredCredentials.map((credential) => (
                <CredentialCard key={credential.id} credential={credential} />
              ))}
            </div>
          )}

          {filteredCredentials.length === 0 && !loading && (
            <div className="text-center py-12">
              <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600">Try adjusting your search criteria.</p>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
