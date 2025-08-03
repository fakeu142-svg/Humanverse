'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface ManipulationDashboard {
  stats: {
    totalFakeAnswers: number;
    totalFakeUsers: number;
    totalCampaigns: number;
    totalManipulatedVotes: number;
    recentActivity: number;
    manipulationEffectiveness: number;
    lastUpdated: string;
  };
  recentFakeAnswers: Array<{
    id: string;
    questionCategory: string;
    answerPreview: string;
    narrativeGoal: string;
    believabilityScore: number;
    guessCount: number;
    createdAt: string;
  }>;
  recentCampaigns: Array<{
    id: string;
    targetUserId: string;
    goal: string;
    questionCount: number;
    timestamp: string;
  }>;
  mostTargetedUsers: Array<{
    id: string;
    email: string;
    riskScore: number;
    manipulationCount: number;
    lastLogin: string;
  }>;
  manipulationTrends: Array<{
    date: string;
    fakeAnswers: number;
    campaigns: number;
    total: number;
  }>;
}

type ManipulationAction = 'fake_answer' | 'campaign' | 'targeted_question' | 'vote_manipulation';

export function TruthManipulator() {
  const { admin } = useAdminAuth();
  const [dashboard, setDashboard] = useState<ManipulationDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<ManipulationAction>('fake_answer');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [selectedTargetUser, setSelectedTargetUser] = useState<string>('');
  
  // Form states
  const [fakeAnswerForm, setFakeAnswerForm] = useState({
    questionId: '',
    content: '',
    narrativeGoal: '',
    emotionalHook: 'general',
    believabilityTarget: 8,
    targetUserId: ''
  });

  const [campaignForm, setCampaignForm] = useState({
    targetUserId: '',
    goal: 'isolate' as 'isolate' | 'recruit' | 'destabilize' | 'extract_secrets' | 'emotional_manipulation',
    duration: 14,
    customQuestions: ['']
  });

  const [questionForm, setQuestionForm] = useState({
    targetUserId: '',
    psychologicalTrigger: '',
    questionText: '',
    category: 'CONFESSION',
    difficulty: 5
  });

  const [voteForm, setVoteForm] = useState({
    answerId: '',
    desiredOutcome: 'truth' as 'truth' | 'lie',
    voteCount: 5
  });

  useEffect(() => {
    if (admin) {
      loadDashboard();
    }
  }, [admin]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/truth/manipulate', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load manipulation dashboard');
      }

      const data = await response.json();
      setDashboard(data);
    } catch (error) {
      console.error('Load dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeManipulation = async (action: string, data: any) => {
    try {
      const response = await fetch('/api/admin/truth/manipulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ action, ...data })
      });

      if (!response.ok) {
        throw new Error('Failed to execute manipulation');
      }

      const result = await response.json();
      alert(`Manipulation executed successfully: ${result.message || 'Done'}`);
      setShowCreateModal(false);
      loadDashboard();
      
      // Reset forms
      setFakeAnswerForm({
        questionId: '',
        content: '',
        narrativeGoal: '',
        emotionalHook: 'general',
        believabilityTarget: 8,
        targetUserId: ''
      });
      
      return result;
    } catch (error) {
      console.error('Execute manipulation error:', error);
      alert('Failed to execute manipulation');
    }
  };

  const createFakeAnswer = () => {
    executeManipulation('CREATE_FAKE_ANSWER', fakeAnswerForm);
  };

  const createCampaign = () => {
    executeManipulation('CREATE_MANIPULATION_CAMPAIGN', campaignForm);
  };

  const createTargetedQuestion = () => {
    executeManipulation('CREATE_TARGETED_QUESTION', questionForm);
  };

  const manipulateVotes = () => {
    executeManipulation('MANIPULATE_VOTING', voteForm);
  };

  if (!admin || admin.role !== 'SUPER_ADMIN') {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center">
        <h3 className="text-red-400 text-xl font-bold mb-2">Access Denied</h3>
        <p className="text-red-300">Super Admin access required for truth manipulation</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-purple-200">Loading manipulation dashboard...</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">Failed to load dashboard</p>
        <button
          onClick={loadDashboard}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-purple-100">Truth Manipulation Control</h2>
          <p className="text-purple-300">Plant fake content, create campaigns, and control narratives</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            🎭 Create Manipulation
          </button>
          <button
            onClick={loadDashboard}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-800/50">
          <div className="text-2xl font-bold text-purple-100">{dashboard.stats.totalFakeAnswers}</div>
          <div className="text-purple-300 text-sm">Fake Answers</div>
        </div>
        <div className="bg-red-900/30 rounded-lg p-4 border border-red-800/50">
          <div className="text-2xl font-bold text-red-100">{dashboard.stats.totalCampaigns}</div>
          <div className="text-red-300 text-sm">Campaigns</div>
        </div>
        <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-800/50">
          <div className="text-2xl font-bold text-blue-100">{dashboard.stats.totalFakeUsers}</div>
          <div className="text-blue-300 text-sm">Fake Users</div>
        </div>
        <div className="bg-orange-900/30 rounded-lg p-4 border border-orange-800/50">
          <div className="text-2xl font-bold text-orange-100">{dashboard.stats.totalManipulatedVotes}</div>
          <div className="text-orange-300 text-sm">Vote Manipulations</div>
        </div>
        <div className="bg-green-900/30 rounded-lg p-4 border border-green-800/50">
          <div className="text-2xl font-bold text-green-100">{dashboard.stats.manipulationEffectiveness}%</div>
          <div className="text-green-300 text-sm">Effectiveness</div>
        </div>
        <div className="bg-yellow-900/30 rounded-lg p-4 border border-yellow-800/50">
          <div className="text-2xl font-bold text-yellow-100">{dashboard.stats.recentActivity}</div>
          <div className="text-yellow-300 text-sm">Recent Activity</div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Fake Answers */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
          <h3 className="text-xl font-bold text-white mb-4">Recent Fake Answers</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {dashboard.recentFakeAnswers.map(answer => (
              <div key={answer.id} className="bg-purple-900/20 rounded-lg p-4 border border-purple-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-purple-300 font-medium">{answer.questionCategory}</span>
                  <span className="text-purple-400 text-sm">{answer.guessCount} guesses</span>
                </div>
                <p className="text-purple-200 text-sm mb-2">{answer.answerPreview}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-purple-400">Goal: {answer.narrativeGoal}</span>
                  <span className="text-purple-500">{new Date(answer.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Campaigns */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
          <h3 className="text-xl font-bold text-white mb-4">Recent Campaigns</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {dashboard.recentCampaigns.map(campaign => (
              <div key={campaign.id} className="bg-red-900/20 rounded-lg p-4 border border-red-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-red-300 font-medium">{campaign.goal.toUpperCase()}</span>
                  <span className="text-red-400 text-sm">{campaign.questionCount} questions</span>
                </div>
                <p className="text-red-200 text-sm mb-1">Target: {campaign.targetUserId}</p>
                <span className="text-red-500 text-xs">{new Date(campaign.timestamp).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Most Targeted Users */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
        <h3 className="text-xl font-bold text-white mb-4">Most Targeted Users</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboard.mostTargetedUsers.map(user => (
            <div key={user.id} className="bg-orange-900/20 rounded-lg p-4 border border-orange-800/50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-orange-200 font-medium">{user.email}</h4>
                <span className="text-orange-400 text-sm">{user.manipulationCount} actions</span>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-orange-300">Risk Score:</span>
                  <span className="text-orange-400 font-medium">{user.riskScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-300">Last Login:</span>
                  <span className="text-orange-500 text-xs">{new Date(user.lastLogin).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manipulation Trends */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
        <h3 className="text-xl font-bold text-white mb-4">Manipulation Trends (Last 7 Days)</h3>
        <div className="space-y-3">
          {dashboard.manipulationTrends.map(trend => (
            <div key={trend.date} className="flex items-center justify-between">
              <span className="text-gray-300">{trend.date}</span>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div 
                    className="bg-purple-600 h-2 rounded"
                    style={{ width: `${Math.max(trend.fakeAnswers * 10, 10)}px` }}
                  ></div>
                  <span className="text-purple-400 text-sm">{trend.fakeAnswers} answers</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div 
                    className="bg-red-600 h-2 rounded"
                    style={{ width: `${Math.max(trend.campaigns * 20, 10)}px` }}
                  ></div>
                  <span className="text-red-400 text-sm">{trend.campaigns} campaigns</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Manipulation Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-purple-100">Create Manipulation</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Action Selection */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'fake_answer', label: 'Fake Answer', icon: '🎭' },
                    { id: 'campaign', label: 'Campaign', icon: '🎯' },
                    { id: 'targeted_question', label: 'Targeted Question', icon: '❓' },
                    { id: 'vote_manipulation', label: 'Vote Manipulation', icon: '📊' }
                  ].map(action => (
                    <button
                      key={action.id}
                      onClick={() => setActiveAction(action.id as ManipulationAction)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeAction === action.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {action.icon} {action.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Content */}
              <div className="space-y-4">
                {activeAction === 'fake_answer' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-purple-300 mb-2">Question ID</label>
                      <input
                        type="text"
                        value={fakeAnswerForm.questionId}
                        onChange={(e) => setFakeAnswerForm(prev => ({ ...prev, questionId: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                        placeholder="Enter question ID"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-purple-300 mb-2">Fake Answer Content</label>
                      <textarea
                        value={fakeAnswerForm.content}
                        onChange={(e) => setFakeAnswerForm(prev => ({ ...prev, content: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white h-32 resize-none"
                        placeholder="Write a convincing fake answer..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-purple-300 mb-2">Narrative Goal</label>
                      <input
                        type="text"
                        value={fakeAnswerForm.narrativeGoal}
                        onChange={(e) => setFakeAnswerForm(prev => ({ ...prev, narrativeGoal: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                        placeholder="What narrative should this push?"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-purple-300 mb-2">Emotional Hook</label>
                        <select
                          value={fakeAnswerForm.emotionalHook}
                          onChange={(e) => setFakeAnswerForm(prev => ({ ...prev, emotionalHook: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                        >
                          <option value="general">General</option>
                          <option value="fear">Fear</option>
                          <option value="shame">Shame</option>
                          <option value="desire">Desire</option>
                          <option value="validation">Validation</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-purple-300 mb-2">Believability (1-10)</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={fakeAnswerForm.believabilityTarget}
                          onChange={(e) => setFakeAnswerForm(prev => ({ ...prev, believabilityTarget: parseInt(e.target.value) }))}
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={createFakeAnswer}
                      className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                    >
                      Create Fake Answer
                    </button>
                  </div>
                )}

                {activeAction === 'campaign' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-purple-300 mb-2">Target User ID</label>
                      <input
                        type="text"
                        value={campaignForm.targetUserId}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, targetUserId: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                        placeholder="Enter user ID to target"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-purple-300 mb-2">Campaign Goal</label>
                      <select
                        value={campaignForm.goal}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, goal: e.target.value as any }))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                      >
                        <option value="isolate">Isolate</option>
                        <option value="recruit">Recruit</option>
                        <option value="destabilize">Destabilize</option>
                        <option value="extract_secrets">Extract Secrets</option>
                        <option value="emotional_manipulation">Emotional Manipulation</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-purple-300 mb-2">Duration (days)</label>
                      <input
                        type="number"
                        value={campaignForm.duration}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                      />
                    </div>
                    
                    <button
                      onClick={createCampaign}
                      className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold"
                    >
                      Launch Campaign
                    </button>
                  </div>
                )}

                {activeAction === 'targeted_question' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-purple-300 mb-2">Target User ID</label>
                      <input
                        type="text"
                        value={questionForm.targetUserId}
                        onChange={(e) => setQuestionForm(prev => ({ ...prev, targetUserId: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                        placeholder="Enter user ID to target"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-purple-300 mb-2">Psychological Trigger</label>
                      <input
                        type="text"
                        value={questionForm.psychologicalTrigger}
                        onChange={(e) => setQuestionForm(prev => ({ ...prev, psychologicalTrigger: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                        placeholder="fear, shame, guilt, etc."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-purple-300 mb-2">Question Text</label>
                      <textarea
                        value={questionForm.questionText}
                        onChange={(e) => setQuestionForm(prev => ({ ...prev, questionText: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white h-24 resize-none"
                        placeholder="Write a psychologically targeted question..."
                      />
                    </div>
                    
                    <button
                      onClick={createTargetedQuestion}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                    >
                      Create Targeted Question
                    </button>
                  </div>
                )}

                {activeAction === 'vote_manipulation' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-purple-300 mb-2">Answer ID</label>
                      <input
                        type="text"
                        value={voteForm.answerId}
                        onChange={(e) => setVoteForm(prev => ({ ...prev, answerId: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                        placeholder="Enter answer ID to manipulate"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-purple-300 mb-2">Desired Outcome</label>
                        <select
                          value={voteForm.desiredOutcome}
                          onChange={(e) => setVoteForm(prev => ({ ...prev, desiredOutcome: e.target.value as 'truth' | 'lie' }))}
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                        >
                          <option value="truth">Truth</option>
                          <option value="lie">Lie</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-purple-300 mb-2">Vote Count</label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={voteForm.voteCount}
                          onChange={(e) => setVoteForm(prev => ({ ...prev, voteCount: parseInt(e.target.value) }))}
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={manipulateVotes}
                      className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                    >
                      Manipulate Votes
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
