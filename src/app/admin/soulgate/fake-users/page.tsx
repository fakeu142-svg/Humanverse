'use client';

import { useState, useEffect } from 'react';
import { useAdminSurveillance } from '@/hooks/useAdminSurveillance';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { 
  UserPlusIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
  ComputerDesktopIcon,
  MapPinIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  TrashIcon,
  PencilIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  HeartIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface FakeUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatar: string;
  bio: string;
  personalityType: string;
  status: 'active' | 'paused' | 'inactive';
  createdAt: string;
  lastActivity: string;
  mission: {
    type: 'infiltration' | 'information_gathering' | 'influence' | 'surveillance';
    target: string;
    objective: string;
    progress: number;
    status: 'in_progress' | 'completed' | 'failed';
  };
  performance: {
    conversationsInitiated: number;
    informationExtracted: number;
    trustLevel: number;
    suspicionLevel: number;
    engagementRate: number;
  };
  aiSettings: {
    personality: string;
    responseStyle: string;
    conversationGoals: string[];
    emotionalIntelligence: number;
    manipulationLevel: number;
  };
  interactions: Array<{
    targetUserId: string;
    targetUsername: string;
    messages: number;
    lastInteraction: string;
    relationshipStatus: string;
    informationGathered: string[];
  }>;
  cover: {
    backstory: string;
    interests: string[];
    location: string;
    occupation: string;
    socialConnections: string[];
  };
}

interface CreateFakeUserForm {
  username: string;
  fullName: string;
  email: string;
  personalityType: string;
  missionType: string;
  target: string;
  objective: string;
  backstory: string;
  interests: string[];
  location: string;
  occupation: string;
}

export default function FakeUserManagementPage() {
  const {
    getFakeUsers,
    createFakeUser,
    updateFakeUser,
    deleteFakeUser,
    activateFakeUser,
    deactivateFakeUser,
    getFakeUserPerformance,
    generateAIResponse,
    trainFakeUserPersonality
  } = useAdminSurveillance();

  const [fakeUsers, setFakeUsers] = useState<FakeUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<FakeUser | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [createForm, setCreateForm] = useState<CreateFakeUserForm>({
    username: '',
    fullName: '',
    email: '',
    personalityType: 'friendly',
    missionType: 'information_gathering',
    target: '',
    objective: '',
    backstory: '',
    interests: [],
    location: '',
    occupation: ''
  });

  useEffect(() => {
    loadFakeUsers();
    const interval = setInterval(loadFakeUsers, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadFakeUsers = async () => {
    setLoading(true);
    try {
      const users = await getFakeUsers();
      setFakeUsers(users);
    } catch (error) {
      console.error('Failed to load fake users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFakeUser = async () => {
    try {
      const newUser = await createFakeUser(createForm);
      setFakeUsers(prev => [...prev, newUser]);
      setShowCreateForm(false);
      setCreateForm({
        username: '',
        fullName: '',
        email: '',
        personalityType: 'friendly',
        missionType: 'information_gathering',
        target: '',
        objective: '',
        backstory: '',
        interests: [],
        location: '',
        occupation: ''
      });
      alert('Fake user created successfully');
    } catch (error) {
      console.error('Failed to create fake user:', error);
      alert('Failed to create fake user');
    }
  };

  const handleDeleteFakeUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this fake user?')) return;
    try {
      await deleteFakeUser(userId);
      setFakeUsers(prev => prev.filter(u => u.id !== userId));
      if (selectedUser?.id === userId) {
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Failed to delete fake user:', error);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    try {
      if (currentStatus === 'active') {
        await deactivateFakeUser(userId);
      } else {
        await activateFakeUser(userId);
      }
      loadFakeUsers();
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getMissionColor = (type: string) => {
    switch (type) {
      case 'infiltration': return 'text-red-600 bg-red-100';
      case 'influence': return 'text-purple-600 bg-purple-100';
      case 'surveillance': return 'text-blue-600 bg-blue-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const FakeUserCard = ({ user }: { user: FakeUser }) => (
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
          <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
            {user.avatar ? (
              <img src={user.avatar} alt={user.username} className="w-full h-full rounded-full object-cover" />
            ) : (
              <SparklesIcon className="h-5 w-5 text-white" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{user.username}</h3>
            <p className="text-sm text-gray-600">{user.fullName}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
            {user.status}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMissionColor(user.mission.type)}`}>
            {user.mission.type}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Mission Progress:</span>
          <div className="flex items-center space-x-2">
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${user.mission.progress}%` }}
              ></div>
            </div>
            <span className="text-gray-900 font-medium">{user.mission.progress}%</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Trust Level:</span>
          <span className="text-green-600 font-medium">{user.performance.trustLevel}%</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Suspicion:</span>
          <span className={`font-medium ${
            user.performance.suspicionLevel > 50 ? 'text-red-600' :
            user.performance.suspicionLevel > 25 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {user.performance.suspicionLevel}%
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Conversations:</span>
          <span className="text-gray-900 font-medium">{user.performance.conversationsInitiated}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Last Activity:</span>
          <span className="text-gray-900">{user.lastActivity}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-600 mb-1">Current Objective:</p>
        <p className="text-sm text-gray-900">{user.mission.objective}</p>
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
                <h1 className="text-2xl font-bold text-gray-900">Fake User Management</h1>
                <p className="text-gray-600">Deploy and manage AI-powered fake users for infiltration and intelligence gathering</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">{fakeUsers.filter(u => u.status === 'active').length} active users</span>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <UserPlusIcon className="h-4 w-4" />
                  <span>Create Fake User</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Fake Users List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Deployed Fake Users</h2>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {fakeUsers.map((user) => (
                      <FakeUserCard key={user.id} user={user} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* User Details / Create Form */}
            <div className="lg:col-span-2">
              {showCreateForm ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Create New Fake User</h2>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <span className="sr-only">Close</span>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                      <input
                        type="text"
                        value={createForm.username}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, username: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter username"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={createForm.fullName}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, fullName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={createForm.email}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter email"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Personality Type</label>
                      <select
                        value={createForm.personalityType}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, personalityType: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="friendly">Friendly & Approachable</option>
                        <option value="mysterious">Mysterious & Intriguing</option>
                        <option value="flirtatious">Flirtatious & Charming</option>
                        <option value="intellectual">Intellectual & Thoughtful</option>
                        <option value="vulnerable">Vulnerable & Sympathetic</option>
                        <option value="confident">Confident & Dominant</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mission Type</label>
                      <select
                        value={createForm.missionType}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, missionType: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="information_gathering">Information Gathering</option>
                        <option value="infiltration">Group Infiltration</option>
                        <option value="influence">Social Influence</option>
                        <option value="surveillance">User Surveillance</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Target</label>
                      <input
                        type="text"
                        value={createForm.target}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, target: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="Target user or group"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mission Objective</label>
                    <textarea
                      value={createForm.objective}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, objective: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Describe the mission objective..."
                    />
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Backstory</label>
                    <textarea
                      value={createForm.backstory}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, backstory: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Create a convincing backstory for this fake user..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                      <input
                        type="text"
                        value={createForm.location}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="City, Country"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Occupation</label>
                      <input
                        type="text"
                        value={createForm.occupation}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, occupation: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="Job title"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 mt-8">
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateFakeUser}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Create Fake User
                    </button>
                  </div>
                </div>
              ) : selectedUser ? (
                <div className="space-y-6">
                  {/* User Overview */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                          {selectedUser.avatar ? (
                            <img src={selectedUser.avatar} alt={selectedUser.username} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <SparklesIcon className="h-8 w-8 text-white" />
                          )}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">{selectedUser.username}</h2>
                          <p className="text-gray-600">{selectedUser.fullName}</p>
                          <p className="text-sm text-gray-500">{selectedUser.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleToggleStatus(selectedUser.id, selectedUser.status)}
                          className={`px-4 py-2 rounded-lg font-medium ${
                            selectedUser.status === 'active'
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {selectedUser.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteFakeUser(selectedUser.id)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Status</p>
                        <p className={`font-semibold ${
                          selectedUser.status === 'active' ? 'text-green-600' :
                          selectedUser.status === 'paused' ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          {selectedUser.status}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Trust Level</p>
                        <p className="font-semibold text-green-600">{selectedUser.performance.trustLevel}%</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Conversations</p>
                        <p className="font-semibold text-blue-600">{selectedUser.performance.conversationsInitiated}</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Intel Gathered</p>
                        <p className="font-semibold text-purple-600">{selectedUser.performance.informationExtracted}</p>
                      </div>
                    </div>
                  </div>

                  {/* Mission Details */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Mission Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-gray-600">Mission Type</label>
                            <p className="font-semibold text-gray-900">{selectedUser.mission.type}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Target</label>
                            <p className="font-semibold text-gray-900">{selectedUser.mission.target}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Progress</label>
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${selectedUser.mission.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{selectedUser.mission.progress}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Objective</label>
                        <p className="text-gray-900 mt-1">{selectedUser.mission.objective}</p>
                      </div>
                    </div>
                  </div>

                  {/* Active Interactions */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Interactions</h3>
                    <div className="space-y-3">
                      {selectedUser.interactions.map((interaction, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <UserIcon className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">{interaction.targetUsername}</p>
                              <p className="text-sm text-gray-600">
                                {interaction.messages} messages • Last: {interaction.lastInteraction}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {interaction.relationshipStatus}
                            </span>
                            <button className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                              View Chat
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <SparklesIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Fake User</h3>
                  <p className="text-gray-600">Choose a fake user from the left to view details and manage their activities.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
