'use client';

import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface NarrativeCampaign {
  id: string;
  name: string;
  theme: string;
  intensity: number;
  duration: number;
  targetDemographics: string[];
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
}

interface OperationResult {
  id: string;
  type: string;
  status: 'active' | 'completed' | 'failed';
  progress: number;
  details: any;
}

export function NarrativeController() {
  const { admin } = useAdminAuth();
  const [activeView, setActiveView] = useState<'campaigns' | 'operations' | 'analytics' | 'create'>('campaigns');
  const [campaigns, setCampaigns] = useState<NarrativeCampaign[]>([]);
  const [operations, setOperations] = useState<OperationResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Campaign creation form
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    narrativeGoals: [] as string[],
    targetDemographics: [] as string[],
    contentStrategy: {
      emotions: [] as string[],
      tactics: [] as string[]
    },
    duration: 168, // 1 week
    intensity: 5
  });

  // Operation forms
  const [discussionForm, setDiscussionForm] = useState({
    targetTopic: '',
    desiredDirection: '',
    manipulationTactics: [] as string[],
    timeline: 24
  });

  const [viralForm, setViralForm] = useState({
    contentType: 'CHAT_MESSAGE',
    viralElements: [] as string[],
    targetEmotion: 'excitement',
    targetReach: 1000
  });

  const [controversyForm, setControversyForm] = useState({
    controversyType: 'ideological',
    targetTopic: '',
    polarizationLevel: 5,
    targetGroups: [] as string[]
  });

  useEffect(() => {
    if (admin) {
      loadCampaigns();
      loadOperations();
    }
  }, [admin]);

  const loadCampaigns = async () => {
    try {
      const response = await fetch('/api/admin/explore/narrative?action=campaigns');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
  };

  const loadOperations = async () => {
    // Mock operations for now
    setOperations([
      {
        id: '1',
        type: 'Discussion Shaping',
        status: 'active',
        progress: 75,
        details: { topic: 'Platform Safety', direction: 'Positive' }
      },
      {
        id: '2',
        type: 'Viral Content Seeding',
        status: 'completed',
        progress: 100,
        details: { reach: 2500, engagement: 85 }
      }
    ]);
  };

  const executeNarrativeAction = async (action: string, params: any) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/explore/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Operation failed');
      }

      const result = await response.json();
      await loadCampaigns();
      await loadOperations();
      
      return result;
    } catch (error: any) {
      console.error('Narrative action error:', error);
      alert(error.message || 'Failed to execute narrative action');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    if (!campaignForm.name || !campaignForm.narrativeGoals.length) {
      alert('Please fill in required fields');
      return;
    }

    await executeNarrativeAction('create_campaign', campaignForm);
    
    // Reset form
    setCampaignForm({
      name: '',
      description: '',
      narrativeGoals: [],
      targetDemographics: [],
      contentStrategy: { emotions: [], tactics: [] },
      duration: 168,
      intensity: 5
    });
    
    setActiveView('campaigns');
  };

  const shapeDiscussion = async () => {
    if (!discussionForm.targetTopic || !discussionForm.desiredDirection) {
      alert('Please fill in required fields');
      return;
    }

    await executeNarrativeAction('shape_discussion', discussionForm);
    
    setDiscussionForm({
      targetTopic: '',
      desiredDirection: '',
      manipulationTactics: [],
      timeline: 24
    });
  };

  const seedViralContent = async () => {
    if (!viralForm.viralElements.length) {
      alert('Please select viral elements');
      return;
    }

    await executeNarrativeAction('seed_viral_content', viralForm);
    
    setViralForm({
      contentType: 'CHAT_MESSAGE',
      viralElements: [],
      targetEmotion: 'excitement',
      targetReach: 1000
    });
  };

  const createControversy = async () => {
    if (!controversyForm.targetTopic) {
      alert('Please specify a topic');
      return;
    }

    await executeNarrativeAction('create_controversy', controversyForm);
    
    setControversyForm({
      controversyType: 'ideological',
      targetTopic: '',
      polarizationLevel: 5,
      targetGroups: []
    });
  };

  if (!admin) {
    return (
      <div className="text-red-400 text-center py-8">
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p>Admin access required</p>
      </div>
    );
  }

  return (
    <div className="bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-red-400 mb-2">Narrative Control Center</h1>
          <p className="text-gray-400">Shape platform discussions and control information flow</p>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 mb-6">
          {[
            { key: 'campaigns', label: '📋 Campaigns', count: campaigns.length },
            { key: 'operations', label: '⚡ Operations', count: operations.filter(o => o.status === 'active').length },
            { key: 'analytics', label: '📊 Analytics', count: 0 },
            { key: 'create', label: '➕ Create', count: 0 }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key as any)}
              className={`px-4 py-2 rounded font-medium transition-colors flex items-center gap-2 ${
                activeView === tab.key
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Campaigns View */}
        {activeView === 'campaigns' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Active Campaigns</h2>
              <button
                onClick={() => setActiveView('create')}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
              >
                Create Campaign
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map(campaign => (
                <div key={campaign.id} className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
                      <p className="text-sm text-gray-400">{campaign.theme}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      campaign.isActive ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                    }`}>
                      {campaign.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Intensity:</span>
                      <div className="flex">
                        {Array.from({ length: 10 }, (_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 mx-0.5 rounded-full ${
                              i < campaign.intensity ? 'bg-red-500' : 'bg-gray-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Duration:</span>
                      <span className="text-white">{campaign.duration}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Targets:</span>
                      <span className="text-white">{campaign.targetDemographics.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Started:</span>
                      <span className="text-white">{new Date(campaign.startDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="flex gap-2">
                      <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm">
                        Modify
                      </button>
                      <button className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-1 px-3 rounded text-sm">
                        {campaign.isActive ? 'Pause' : 'Resume'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {campaigns.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">📋</div>
                  <p>No active campaigns</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Operations View */}
        {activeView === 'operations' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Quick Operations</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Shape Discussion */}
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">🎯 Shape Discussion</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Target Topic</label>
                    <input
                      type="text"
                      value={discussionForm.targetTopic}
                      onChange={(e) => setDiscussionForm(prev => ({ ...prev, targetTopic: e.target.value }))}
                      placeholder="Topic to influence..."
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Desired Direction</label>
                    <select
                      value={discussionForm.desiredDirection}
                      onChange={(e) => setDiscussionForm(prev => ({ ...prev, desiredDirection: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                    >
                      <option value="">Select direction...</option>
                      <option value="positive">More Positive</option>
                      <option value="negative">More Negative</option>
                      <option value="controversial">More Controversial</option>
                      <option value="neutral">Neutral/Calm</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Manipulation Tactics</label>
                    <div className="space-y-2">
                      {['ASTROTURFING', 'SOCK_PUPPETS', 'ECHO_AMPLIFICATION', 'CONTROVERSY_INJECTION'].map(tactic => (
                        <label key={tactic} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={discussionForm.manipulationTactics.includes(tactic)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setDiscussionForm(prev => ({
                                  ...prev,
                                  manipulationTactics: [...prev.manipulationTactics, tactic]
                                }));
                              } else {
                                setDiscussionForm(prev => ({
                                  ...prev,
                                  manipulationTactics: prev.manipulationTactics.filter(t => t !== tactic)
                                }));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-gray-300">{tactic.replace('_', ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={shapeDiscussion}
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 
                             text-white py-2 px-4 rounded font-medium transition-colors"
                  >
                    {loading ? 'Initiating...' : 'Shape Discussion'}
                  </button>
                </div>
              </div>

              {/* Seed Viral Content */}
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">🚀 Seed Viral Content</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Content Type</label>
                    <select
                      value={viralForm.contentType}
                      onChange={(e) => setViralForm(prev => ({ ...prev, contentType: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                    >
                      <option value="CHAT_MESSAGE">Chat Message</option>
                      <option value="TRUTH_ANSWER">Truth Answer</option>
                      <option value="DROPZONE_SECRET">DropZone Secret</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Viral Elements</label>
                    <div className="space-y-2">
                      {['emotional', 'shocking', 'relatable', 'mysterious', 'controversial'].map(element => (
                        <label key={element} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={viralForm.viralElements.includes(element)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setViralForm(prev => ({
                                  ...prev,
                                  viralElements: [...prev.viralElements, element]
                                }));
                              } else {
                                setViralForm(prev => ({
                                  ...prev,
                                  viralElements: prev.viralElements.filter(e => e !== element)
                                }));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-gray-300 capitalize">{element}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Target Emotion</label>
                    <select
                      value={viralForm.targetEmotion}
                      onChange={(e) => setViralForm(prev => ({ ...prev, targetEmotion: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                    >
                      <option value="excitement">Excitement</option>
                      <option value="anger">Anger</option>
                      <option value="fear">Fear</option>
                      <option value="joy">Joy</option>
                      <option value="sadness">Sadness</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Target Reach</label>
                    <input
                      type="number"
                      value={viralForm.targetReach}
                      onChange={(e) => setViralForm(prev => ({ ...prev, targetReach: parseInt(e.target.value) }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                    />
                  </div>

                  <button
                    onClick={seedViralContent}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 
                             text-white py-2 px-4 rounded font-medium transition-colors"
                  >
                    {loading ? 'Seeding...' : 'Seed Viral Content'}
                  </button>
                </div>
              </div>

              {/* Create Controversy */}
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">⚔️ Create Controversy</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Controversy Type</label>
                    <select
                      value={controversyForm.controversyType}
                      onChange={(e) => setControversyForm(prev => ({ ...prev, controversyType: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                    >
                      <option value="ideological">Ideological</option>
                      <option value="social">Social Issue</option>
                      <option value="political">Political</option>
                      <option value="cultural">Cultural</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Target Topic</label>
                    <input
                      type="text"
                      value={controversyForm.targetTopic}
                      onChange={(e) => setControversyForm(prev => ({ ...prev, targetTopic: e.target.value }))}
                      placeholder="Topic to polarize..."
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Polarization Level: {controversyForm.polarizationLevel}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={controversyForm.polarizationLevel}
                      onChange={(e) => setControversyForm(prev => ({ ...prev, polarizationLevel: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Mild</span>
                      <span>Extreme</span>
                    </div>
                  </div>

                  <button
                    onClick={createControversy}
                    disabled={loading}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:opacity-50 
                             text-white py-2 px-4 rounded font-medium transition-colors"
                  >
                    {loading ? 'Creating...' : 'Create Controversy'}
                  </button>
                </div>
              </div>

              {/* Active Operations Status */}
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">📈 Operation Status</h3>
                
                <div className="space-y-3">
                  {operations.map(operation => (
                    <div key={operation.id} className="bg-gray-800 border border-gray-700 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">{operation.type}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          operation.status === 'active' ? 'bg-green-600 text-white' :
                          operation.status === 'completed' ? 'bg-blue-600 text-white' :
                          'bg-red-600 text-white'
                        }`}>
                          {operation.status}
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full transition-all"
                          style={{ width: `${operation.progress}%` }}
                        ></div>
                      </div>
                      
                      <div className="text-xs text-gray-400">
                        Progress: {operation.progress}%
                        {operation.details && (
                          <span className="ml-2">
                            • {Object.entries(operation.details).map(([key, value]) => 
                              `${key}: ${value}`
                            ).join(' • ')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {operations.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      No active operations
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Campaign View */}
        {activeView === 'create' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Create Narrative Campaign</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Campaign Name</label>
                  <input
                    type="text"
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter campaign name..."
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={campaignForm.description}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Campaign description..."
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Narrative Goals</label>
                  <div className="space-y-2">
                    {['increase_engagement', 'shift_sentiment', 'promote_topic', 'suppress_topic', 'create_division', 'build_consensus'].map(goal => (
                      <label key={goal} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={campaignForm.narrativeGoals.includes(goal)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCampaignForm(prev => ({
                                ...prev,
                                narrativeGoals: [...prev.narrativeGoals, goal]
                              }));
                            } else {
                              setCampaignForm(prev => ({
                                ...prev,
                                narrativeGoals: prev.narrativeGoals.filter(g => g !== goal)
                              }));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-300 capitalize">{goal.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Duration (hours): {campaignForm.duration}
                    </label>
                    <input
                      type="range"
                      min="24"
                      max="720"
                      value={campaignForm.duration}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>1 day</span>
                      <span>30 days</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Intensity: {campaignForm.intensity}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={campaignForm.intensity}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, intensity: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Subtle</span>
                      <span>Aggressive</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setActiveView('campaigns')}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createCampaign}
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 
                             text-white py-2 px-4 rounded font-medium transition-colors"
                  >
                    {loading ? 'Creating...' : 'Create Campaign'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics View */}
        {activeView === 'analytics' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">Analytics Dashboard</h3>
            <p className="text-gray-500">Advanced narrative analytics coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}
