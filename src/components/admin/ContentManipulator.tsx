'use client';

import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface ContentItem {
  id: string;
  type: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  engagementScore: number;
  metadata: any;
}

interface ManipulationControl {
  id: string;
  contentId: string;
  contentType: string;
  action: 'PROMOTE' | 'SUPPRESS' | 'PLANT' | 'AMPLIFY' | 'HIDE';
  strength: number;
  reason: string;
  targetAudience?: string[];
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export function ContentManipulator() {
  const { admin } = useAdminAuth();
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [manipulationMode, setManipulationMode] = useState<'single' | 'bulk' | 'plant'>('single');
  const [activeControls, setActiveControls] = useState<ManipulationControl[]>([]);
  const [recentContent, setRecentContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [manipulationAction, setManipulationAction] = useState<'PROMOTE' | 'SUPPRESS' | 'AMPLIFY' | 'HIDE'>('PROMOTE');
  const [strength, setStrength] = useState(5);
  const [reason, setReason] = useState('');
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [duration, setDuration] = useState<number | undefined>(24);

  // Plant content form
  const [plantContentType, setPlantContentType] = useState<'CHAT_MESSAGE' | 'TRUTH_ANSWER' | 'DROPZONE_SECRET'>('CHAT_MESSAGE');
  const [plantContent, setPlantContent] = useState('');
  const [plantTitle, setPlantTitle] = useState('');

  useEffect(() => {
    if (admin) {
      loadActiveControls();
      loadRecentContent();
    }
  }, [admin]);

  const loadActiveControls = async () => {
    try {
      const response = await fetch('/api/admin/explore/manipulate?action=active_controls');
      if (response.ok) {
        const data = await response.json();
        setActiveControls(data.controls || []);
      }
    } catch (error) {
      console.error('Failed to load active controls:', error);
    }
  };

  const loadRecentContent = async () => {
    try {
      const response = await fetch('/api/explore/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: 50,
          offset: 0,
          filters: { timeRange: 'day' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRecentContent(data.content || []);
      }
    } catch (error) {
      console.error('Failed to load recent content:', error);
    }
  };

  const executeManipulation = async (action: string, params: any) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/explore/manipulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Manipulation failed');
      }

      const result = await response.json();
      
      // Refresh active controls
      await loadActiveControls();
      
      return result;
    } catch (error: any) {
      console.error('Manipulation error:', error);
      alert(error.message || 'Failed to execute manipulation');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSingleManipulation = async () => {
    if (!selectedContent) return;

    await executeManipulation(manipulationAction.toLowerCase(), {
      contentId: selectedContent.id,
      contentType: selectedContent.type,
      strength,
      reason,
      targetAudience: targetAudience.length > 0 ? targetAudience : undefined,
      expiresAt: duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : undefined
    });

    // Reset form
    setReason('');
    setTargetAudience([]);
  };

  const handlePlantContent = async () => {
    if (!plantContent.trim()) return;

    await executeManipulation('plant', {
      contentType: plantContentType,
      content: plantContent,
      title: plantTitle || undefined,
      targetAudience,
      metadata: {
        title: plantTitle,
        category: 'TRUTH'
      }
    });

    // Reset form
    setPlantContent('');
    setPlantTitle('');
    setTargetAudience([]);
  };

  const handleBulkManipulation = async () => {
    const selectedIds = recentContent
      .filter((_, index) => document.getElementById(`bulk-${index}`)?.checked)
      .map(content => content.id);

    if (selectedIds.length === 0) {
      alert('Please select content to manipulate');
      return;
    }

    await executeManipulation('bulk_manipulate', {
      contentIds: selectedIds,
      action: manipulationAction,
      strength,
      reason
    });
  };

  const filteredContent = recentContent.filter(content =>
    content.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    content.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-red-400 mb-2">Content Manipulation Center</h1>
          <p className="text-gray-400">Control content visibility and engagement across the platform</p>
        </div>

        {/* Mode Selection */}
        <div className="bg-gray-900 border border-red-900/30 rounded-lg p-4 mb-6">
          <div className="flex gap-4">
            {['single', 'bulk', 'plant'].map(mode => (
              <button
                key={mode}
                onClick={() => setManipulationMode(mode as any)}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  manipulationMode === mode
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {mode === 'single' && '🎯 Single Content'}
                {mode === 'bulk' && '📦 Bulk Actions'}
                {mode === 'plant' && '🌱 Plant Content'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Content List */}
          <div className="xl:col-span-2">
            <div className="bg-gray-900 border border-gray-700 rounded-lg">
              <div className="border-b border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Recent Content</h2>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search content..."
                    className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white text-sm w-64"
                  />
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {filteredContent.map((content, index) => (
                  <div
                    key={content.id}
                    className={`border-b border-gray-800 p-4 cursor-pointer hover:bg-gray-800/50 ${
                      selectedContent?.id === content.id ? 'bg-red-900/20 border-red-500' : ''
                    }`}
                    onClick={() => setSelectedContent(content)}
                  >
                    <div className="flex items-start gap-3">
                      {manipulationMode === 'bulk' && (
                        <input
                          type="checkbox"
                          id={`bulk-${index}`}
                          className="mt-1 w-4 h-4"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white">{content.username}</span>
                          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                            {content.type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(content.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 line-clamp-2">
                          {content.content}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>Engagement: {(content.engagementScore * 100).toFixed(0)}%</span>
                          <span>ID: {content.id.substring(0, 8)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Manipulation Panel */}
          <div className="space-y-6">
            {/* Single Content Manipulation */}
            {manipulationMode === 'single' && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Single Content Control</h3>
                
                {selectedContent ? (
                  <div className="space-y-4">
                    <div className="bg-gray-800 border border-gray-700 rounded p-3">
                      <div className="text-sm font-medium text-white mb-1">Selected Content:</div>
                      <div className="text-xs text-gray-400 mb-2">
                        {selectedContent.username} • {selectedContent.type}
                      </div>
                      <div className="text-sm text-gray-300">
                        {selectedContent.content.substring(0, 100)}...
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Action</label>
                      <select
                        value={manipulationAction}
                        onChange={(e) => setManipulationAction(e.target.value as any)}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                      >
                        <option value="PROMOTE">🚀 Promote (Boost visibility)</option>
                        <option value="SUPPRESS">📉 Suppress (Reduce visibility)</option>
                        <option value="AMPLIFY">📢 Amplify (Increase engagement)</option>
                        <option value="HIDE">🚫 Hide (Remove from feeds)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Strength (1-10): {strength}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={strength}
                        onChange={(e) => setStrength(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason for manipulation..."
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Duration (hours)</label>
                      <input
                        type="number"
                        value={duration || ''}
                        onChange={(e) => setDuration(e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="Permanent if empty"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                      />
                    </div>

                    <button
                      onClick={handleSingleManipulation}
                      disabled={loading || !reason.trim()}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 
                               text-white py-2 px-4 rounded font-medium transition-colors"
                    >
                      {loading ? 'Executing...' : 'Execute Manipulation'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Select content to manipulate
                  </div>
                )}
              </div>
            )}

            {/* Bulk Manipulation */}
            {manipulationMode === 'bulk' && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Bulk Content Control</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Action</label>
                    <select
                      value={manipulationAction}
                      onChange={(e) => setManipulationAction(e.target.value as any)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                    >
                      <option value="PROMOTE">🚀 Promote All</option>
                      <option value="SUPPRESS">📉 Suppress All</option>
                      <option value="HIDE">🚫 Hide All</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Strength: {strength}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={strength}
                      onChange={(e) => setStrength(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Bulk manipulation reason..."
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                    />
                  </div>

                  <button
                    onClick={handleBulkManipulation}
                    disabled={loading || !reason.trim()}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 
                             text-white py-2 px-4 rounded font-medium transition-colors"
                  >
                    {loading ? 'Executing...' : 'Execute Bulk Action'}
                  </button>
                </div>
              </div>
            )}

            {/* Plant Content */}
            {manipulationMode === 'plant' && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Plant Fake Content</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Content Type</label>
                    <select
                      value={plantContentType}
                      onChange={(e) => setPlantContentType(e.target.value as any)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                    >
                      <option value="CHAT_MESSAGE">💬 Chat Message</option>
                      <option value="TRUTH_ANSWER">🎯 Truth Answer</option>
                      <option value="DROPZONE_SECRET">🗝️ DropZone Secret</option>
                    </select>
                  </div>

                  {plantContentType === 'DROPZONE_SECRET' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                      <input
                        type="text"
                        value={plantTitle}
                        onChange={(e) => setPlantTitle(e.target.value)}
                        placeholder="Secret title..."
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Content</label>
                    <textarea
                      value={plantContent}
                      onChange={(e) => setPlantContent(e.target.value)}
                      placeholder="Write the fake content to plant..."
                      rows={4}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {plantContent.length}/2000 characters
                    </div>
                  </div>

                  <button
                    onClick={handlePlantContent}
                    disabled={loading || !plantContent.trim()}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 
                             text-white py-2 px-4 rounded font-medium transition-colors"
                  >
                    {loading ? 'Planting...' : 'Plant Content'}
                  </button>
                </div>
              </div>
            )}

            {/* Active Controls */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                Active Controls ({activeControls.length})
              </h3>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activeControls.map(control => (
                  <div key={control.id} className="bg-gray-800 border border-gray-700 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        control.action === 'PROMOTE' ? 'bg-green-600 text-white' :
                        control.action === 'SUPPRESS' ? 'bg-red-600 text-white' :
                        control.action === 'HIDE' ? 'bg-gray-600 text-white' :
                        'bg-blue-600 text-white'
                      }`}>
                        {control.action}
                      </span>
                      <span className="text-xs text-gray-400">
                        Strength: {control.strength}
                      </span>
                    </div>
                    <div className="text-sm text-white mb-1">
                      {control.reason}
                    </div>
                    <div className="text-xs text-gray-500">
                      Content: {control.contentId.substring(0, 8)}... • {control.contentType}
                      {control.expiresAt && (
                        <span className="ml-2">
                          Expires: {new Date(control.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                
                {activeControls.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No active manipulations
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
