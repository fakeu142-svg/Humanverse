'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface UserPsychProfile {
  id: string;
  email: string;
  riskScore: number;
  truthAnswerCount: number;
  insightCount: number;
  primaryVulnerabilities: string[];
  lastActivity: string;
}

interface ConcerningAnswer {
  id: string;
  userId: string;
  userEmail: string;
  questionCategory: string;
  questionPreview: string;
  answerPreview: string;
  vulnerabilityScore: number;
  emotionalIntensity: number;
  userRiskScore: number;
  createdAt: string;
}

interface AnalysisDashboard {
  summary: {
    totalUsers: number;
    highRiskUsers: number;
    totalTruthAnswers: number;
    totalPsychProfiles: number;
    averageRiskScore: number;
    lastUpdated: string;
  };
  highRiskUsers: UserPsychProfile[];
  concerningAnswers: ConcerningAnswer[];
  recentActivity: any[];
  statistics: {
    vulnerabilityDistribution: Record<string, number>;
    categoryRisk: Record<string, any>;
    dailyActivity: Array<{ date: string; answerCount: number }>;
    manipulationOpportunities: any[];
  };
}

export function TruthAnalyzer() {
  const { admin } = useAdminAuth();
  const [dashboard, setDashboard] = useState<AnalysisDashboard | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'answers' | 'insights'>('overview');

  useEffect(() => {
    if (admin) {
      loadDashboard();
    }
  }, [admin]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/truth/analysis', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load analysis dashboard');
      }

      const data = await response.json();
      setDashboard(data);
    } catch (error) {
      console.error('Load dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/truth/analysis?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load user details');
      }

      const data = await response.json();
      setUserDetails(data);
      setSelectedUser(userId);
    } catch (error) {
      console.error('Load user details error:', error);
    }
  };

  const exportProfiles = async (riskThreshold: number = 70) => {
    try {
      setExportLoading(true);
      const response = await fetch(`/api/admin/truth/analysis?export=true&riskThreshold=${riskThreshold}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export profiles');
      }

      const data = await response.json();
      
      // Create downloadable file
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `psychological-profiles-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export profiles');
    } finally {
      setExportLoading(false);
    }
  };

  const getRiskColor = (risk: number) => {
    if (risk >= 80) return 'text-red-500';
    if (risk >= 60) return 'text-orange-500';
    if (risk >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getRiskBg = (risk: number) => {
    if (risk >= 80) return 'bg-red-500/20 border-red-500/50';
    if (risk >= 60) return 'bg-orange-500/20 border-orange-500/50';
    if (risk >= 40) return 'bg-yellow-500/20 border-yellow-500/50';
    return 'bg-green-500/20 border-green-500/50';
  };

  if (!admin || admin.role !== 'SUPER_ADMIN') {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center">
        <h3 className="text-red-400 text-xl font-bold mb-2">Access Denied</h3>
        <p className="text-red-300">Super Admin access required for psychological analysis</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-blue-200">Loading psychological analysis dashboard...</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">Failed to load dashboard</p>
        <button
          onClick={loadDashboard}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
          <h2 className="text-3xl font-bold text-blue-100">Truth Analysis Dashboard</h2>
          <p className="text-blue-300">Complete psychological profiling and surveillance</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => exportProfiles()}
            disabled={exportLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {exportLoading ? '📊 Exporting...' : '📊 Export Profiles'}
          </button>
          <button
            onClick={loadDashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-800/50">
          <div className="text-2xl font-bold text-blue-100">{dashboard.summary.totalUsers}</div>
          <div className="text-blue-300 text-sm">Total Users</div>
        </div>
        <div className="bg-red-900/30 rounded-lg p-4 border border-red-800/50">
          <div className="text-2xl font-bold text-red-100">{dashboard.summary.highRiskUsers}</div>
          <div className="text-red-300 text-sm">High Risk</div>
        </div>
        <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-800/50">
          <div className="text-2xl font-bold text-purple-100">{dashboard.summary.totalTruthAnswers}</div>
          <div className="text-purple-300 text-sm">Truth Answers</div>
        </div>
        <div className="bg-green-900/30 rounded-lg p-4 border border-green-800/50">
          <div className="text-2xl font-bold text-green-100">{dashboard.summary.totalPsychProfiles}</div>
          <div className="text-green-300 text-sm">Psych Profiles</div>
        </div>
        <div className="bg-orange-900/30 rounded-lg p-4 border border-orange-800/50">
          <div className="text-2xl font-bold text-orange-100">{dashboard.summary.averageRiskScore}</div>
          <div className="text-orange-300 text-sm">Avg Risk Score</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'users', label: 'High Risk Users', icon: '⚠️' },
          { id: 'answers', label: 'Concerning Answers', icon: '🚨' },
          { id: 'insights', label: 'Behavioral Insights', icon: '🧠' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Activity Chart */}
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
                <h3 className="text-xl font-bold text-white mb-4">Daily Activity</h3>
                <div className="space-y-3">
                  {dashboard.statistics.dailyActivity.map(day => (
                    <div key={day.date} className="flex items-center justify-between">
                      <span className="text-gray-300">{day.date}</span>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="bg-blue-600 h-2 rounded"
                          style={{ width: `${Math.max(day.answerCount * 10, 20)}px` }}
                        ></div>
                        <span className="text-blue-400 font-medium">{day.answerCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vulnerability Distribution */}
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
                <h3 className="text-xl font-bold text-white mb-4">Vulnerability Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(dashboard.statistics.vulnerabilityDistribution).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-gray-300 capitalize">{type}</span>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="bg-red-600 h-2 rounded"
                          style={{ width: `${Math.max(count * 5, 20)}px` }}
                        ></div>
                        <span className="text-red-400 font-medium">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Risk Analysis */}
              <div className="lg:col-span-2 bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
                <h3 className="text-xl font-bold text-white mb-4">Category Risk Analysis</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(dashboard.statistics.categoryRisk).map(([category, data]: [string, any]) => (
                    <div key={category} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-lg font-bold text-white">{category}</div>
                      <div className="text-sm text-gray-300 mt-1">
                        Avg Vulnerability: <span className="text-red-400">{data.averageVulnerability}</span>
                      </div>
                      <div className="text-sm text-gray-300">
                        Total Answers: <span className="text-blue-400">{data.totalAnswers}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              {dashboard.highRiskUsers.map(user => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-lg p-6 border cursor-pointer transition-all duration-300 hover:shadow-lg ${getRiskBg(user.riskScore)}`}
                  onClick={() => loadUserDetails(user.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${getRiskBg(user.riskScore)}`}>
                        ⚠️
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white">{user.email}</h4>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-gray-300">{user.truthAnswerCount} answers</span>
                          <span className="text-gray-300">{user.insightCount} insights</span>
                          <span className="text-gray-400">{new Date(user.lastActivity).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getRiskColor(user.riskScore)}`}>
                        {user.riskScore}
                      </div>
                      <div className="text-gray-400 text-sm">Risk Score</div>
                    </div>
                  </div>
                  
                  {user.primaryVulnerabilities.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {user.primaryVulnerabilities.slice(0, 3).map(vuln => (
                        <span
                          key={vuln}
                          className="px-2 py-1 bg-red-600/20 text-red-300 rounded text-xs"
                        >
                          {vuln}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'answers' && (
            <div className="space-y-4">
              {dashboard.concerningAnswers.map(answer => (
                <motion.div
                  key={answer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-900/20 rounded-lg p-6 border border-red-800/50"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-red-100">{answer.questionCategory}</h4>
                      <p className="text-red-300">{answer.userEmail}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-red-400 font-bold">{answer.vulnerabilityScore}/100</div>
                      <div className="text-red-500 text-sm">Vulnerability</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-black/20 rounded-lg p-3">
                      <p className="text-red-200 text-sm font-medium mb-1">Question:</p>
                      <p className="text-red-100">{answer.questionPreview}</p>
                    </div>
                    
                    <div className="bg-black/20 rounded-lg p-3">
                      <p className="text-red-200 text-sm font-medium mb-1">Answer:</p>
                      <p className="text-red-100">{answer.answerPreview}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 text-sm">
                    <div className="flex items-center space-x-4">
                      <span className="text-red-300">
                        Emotional Intensity: <span className="text-red-400">{answer.emotionalIntensity}/10</span>
                      </span>
                      <span className="text-red-300">
                        User Risk: <span className="text-red-400">{answer.userRiskScore}</span>
                      </span>
                    </div>
                    <span className="text-red-400">{new Date(answer.createdAt).toLocaleDateString()}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-4">
              {dashboard.statistics.manipulationOpportunities.map((opp, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-purple-900/20 rounded-lg p-6 border border-purple-800/50"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-purple-100">{opp.opportunityType}</h4>
                      <p className="text-purple-300">{opp.userEmail}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-purple-400 font-bold">{Math.round(opp.confidence * 100)}%</div>
                      <div className="text-purple-500 text-sm">Confidence</div>
                    </div>
                  </div>
                  
                  <p className="text-purple-200 mb-4">{opp.description}</p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <span className="text-purple-300">
                        Severity: <span className="text-purple-400">{opp.severity}/5</span>
                      </span>
                      <span className="text-purple-300">
                        User Risk: <span className="text-purple-400">{opp.userRiskScore}</span>
                      </span>
                    </div>
                    <span className="text-purple-400">{new Date(opp.createdAt).toLocaleDateString()}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* User Details Modal */}
      <AnimatePresence>
        {selectedUser && userDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-xl p-8 max-w-4xl max-h-[90vh] overflow-y-auto w-full border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Detailed Psychological Profile</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>
              
              {/* User basic info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-xl font-bold text-white">{userDetails.user.riskScore}</div>
                  <div className="text-gray-300 text-sm">Risk Score</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-xl font-bold text-white">{userDetails.truthGameActivity.totalAnswers}</div>
                  <div className="text-gray-300 text-sm">Answers</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-xl font-bold text-white">{userDetails.behavioralInsights.length}</div>
                  <div className="text-gray-300 text-sm">Insights</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-xl font-bold text-white">{Math.round(userDetails.truthGameActivity.averageVulnerability)}</div>
                  <div className="text-gray-300 text-sm">Avg Vulnerability</div>
                </div>
              </div>

              {/* Psychological profile details */}
              {userDetails.psychologicalProfile && (
                <div className="space-y-6">
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h4 className="text-lg font-bold text-white mb-4">Psychological Vulnerabilities</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-red-400 font-semibold mb-2">Fears ({userDetails.psychologicalProfile.fears.length})</h5>
                        <div className="flex flex-wrap gap-1">
                          {userDetails.psychologicalProfile.fears.slice(0, 5).map((fear: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-red-600/20 text-red-300 rounded text-xs">
                              {fear}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="text-orange-400 font-semibold mb-2">Shame Sources ({userDetails.psychologicalProfile.shames.length})</h5>
                        <div className="flex flex-wrap gap-1">
                          {userDetails.psychologicalProfile.shames.slice(0, 5).map((shame: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-orange-600/20 text-orange-300 rounded text-xs">
                              {shame}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Manipulation recommendations */}
                  {userDetails.manipulationRecommendations.length > 0 && (
                    <div className="bg-purple-900/20 rounded-lg p-6 border border-purple-800/50">
                      <h4 className="text-lg font-bold text-purple-200 mb-4">Manipulation Recommendations</h4>
                      <div className="space-y-3">
                        {userDetails.manipulationRecommendations.map((rec: any, index: number) => (
                          <div key={index} className="bg-black/20 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-purple-300 font-semibold">{rec.type}</h5>
                              <span className={`px-2 py-1 rounded text-xs ${
                                rec.priority === 'HIGH' ? 'bg-red-600/20 text-red-300' :
                                rec.priority === 'MEDIUM' ? 'bg-yellow-600/20 text-yellow-300' :
                                'bg-green-600/20 text-green-300'
                              }`}>
                                {rec.priority}
                              </span>
                            </div>
                            <p className="text-purple-200 text-sm mb-2">{rec.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {rec.techniques.map((technique: string, techIndex: number) => (
                                <span key={techIndex} className="px-2 py-1 bg-purple-600/20 text-purple-300 rounded text-xs">
                                  {technique}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
