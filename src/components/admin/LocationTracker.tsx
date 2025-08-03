'use client';

import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface UserLocation {
  id: string;
  userId: string;
  username: string;
  email: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  city: string;
  region: string;
  country: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}

interface MovementPattern {
  userId: string;
  username: string;
  email: string;
  totalLocations: number;
  averageAccuracy: number;
  uniqueLocations: number;
  frequentLocations: Array<{
    latitude: number;
    longitude: number;
    city: string;
    region: string;
    visitCount: number;
    lastVisit: Date;
  }>;
  timePatterns: {
    mostActiveHour: number;
    mostActiveDay: string;
    averageSessionDuration: number;
  };
  riskScore: number;
  lastSeen: Date;
}

interface LocationPrediction {
  userId: string;
  predictions: Array<{
    latitude: number;
    longitude: number;
    city: string;
    region: string;
    confidence: number;
    timeWindow: string;
    reasoning: string;
  }>;
  accuracy: number;
  generatedAt: Date;
}

interface Meeting {
  id: string;
  user1: { id: string; username: string; email: string };
  user2: { id: string; username: string; email: string };
  location: {
    latitude: number;
    longitude: number;
    city: string;
    region: string;
  };
  distance: number;
  duration: number;
  timestamp: Date;
  confidence: number;
  context: string;
}

export function LocationTracker() {
  const { admin } = useAdminAuth();
  const [view, setView] = useState<'live' | 'patterns' | 'predictions' | 'meetings'>('live');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [liveTracking, setLiveTracking] = useState<UserLocation[]>([]);
  const [movementPatterns, setMovementPatterns] = useState<MovementPattern[]>([]);
  const [locationPredictions, setLocationPredictions] = useState<LocationPrediction[]>([]);
  const [userMeetings, setUserMeetings] = useState<Meeting[]>([]);

  const [filters, setFilters] = useState({
    timeframe: '24h',
    minAccuracy: 100,
    riskLevel: 'all',
    limit: 100
  });

  useEffect(() => {
    if (admin && view === 'live') {
      loadLiveTracking();
      const interval = setInterval(loadLiveTracking, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [admin, view, filters]);

  const loadLiveTracking = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/dropzone/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'live_tracking',
          userId: selectedUserId || undefined,
          limit: filters.limit,
          timeframe: filters.timeframe
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load live tracking data');
      }

      const data = await response.json();
      setLiveTracking(data.locations || []);
    } catch (err: any) {
      console.error('Live tracking error:', err);
      setError(err.message || 'Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  const loadMovementPatterns = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/dropzone/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'movement_patterns',
          userId: selectedUserId || undefined,
          timeframe: filters.timeframe
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load movement patterns');
      }

      const data = await response.json();
      setMovementPatterns(data.patterns || []);
    } catch (err: any) {
      console.error('Movement patterns error:', err);
      setError(err.message || 'Failed to load movement patterns');
    } finally {
      setLoading(false);
    }
  };

  const loadLocationPredictions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/dropzone/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'predict_location',
          userId: selectedUserId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load location predictions');
      }

      const data = await response.json();
      setLocationPredictions(data.predictions || []);
    } catch (err: any) {
      console.error('Location predictions error:', err);
      setError(err.message || 'Failed to load predictions');
    } finally {
      setLoading(false);
    }
  };

  const loadUserMeetings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/dropzone/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'user_meetings',
          userId: selectedUserId,
          timeframe: filters.timeframe
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load user meetings');
      }

      const data = await response.json();
      setUserMeetings(data.meetings || []);
    } catch (err: any) {
      console.error('User meetings error:', err);
      setError(err.message || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = (newView: typeof view) => {
    setView(newView);
    setError(null);
    
    switch (newView) {
      case 'live':
        loadLiveTracking();
        break;
      case 'patterns':
        loadMovementPatterns();
        break;
      case 'predictions':
        loadLocationPredictions();
        break;
      case 'meetings':
        loadUserMeetings();
        break;
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
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
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-red-400 mb-2">Location Surveillance</h1>
          <p className="text-gray-400">Real-time location tracking and user movement analysis</p>
        </div>

        {/* Controls */}
        <div className="bg-gray-900 border border-red-900/30 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* View Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">View</label>
              <select
                value={view}
                onChange={(e) => handleViewChange(e.target.value as typeof view)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              >
                <option value="live">Live Tracking</option>
                <option value="patterns">Movement Patterns</option>
                <option value="predictions">Location Predictions</option>
                <option value="meetings">User Meetings</option>
              </select>
            </div>

            {/* User Search */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Target User</label>
              <input
                type="text"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                placeholder="User ID or username"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-400"
              />
            </div>

            {/* Timeframe */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Timeframe</label>
              <select
                value={filters.timeframe}
                onChange={(e) => setFilters(prev => ({ ...prev, timeframe: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              >
                <option value="1h">Last Hour</option>
                <option value="6h">Last 6 Hours</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>

            {/* Refresh */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Actions</label>
              <button
                onClick={() => handleViewChange(view)}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 
                         px-4 py-2 rounded font-medium transition-colors"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 mb-6 rounded">
            {error}
          </div>
        )}

        {/* Content based on selected view */}
        {view === 'live' && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg">
            <div className="border-b border-gray-700 px-4 py-3">
              <h2 className="text-lg font-semibold text-white">Live Location Tracking</h2>
              <p className="text-sm text-gray-400">Real-time user locations ({liveTracking.length} active)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800 border-b border-gray-700">
                  <tr>
                    <th className="text-left py-3 px-4 text-gray-300">User</th>
                    <th className="text-left py-3 px-4 text-gray-300">Location</th>
                    <th className="text-left py-3 px-4 text-gray-300">Coordinates</th>
                    <th className="text-left py-3 px-4 text-gray-300">Accuracy</th>
                    <th className="text-left py-3 px-4 text-gray-300">Timestamp</th>
                    <th className="text-left py-3 px-4 text-gray-300">Device Info</th>
                  </tr>
                </thead>
                <tbody>
                  {liveTracking.map((location) => (
                    <tr key={location.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-white">{location.username}</div>
                          <div className="text-xs text-gray-400">{location.email}</div>
                          <div className="text-xs text-gray-500">ID: {location.userId}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="text-white">{location.city}, {location.region}</div>
                          <div className="text-xs text-gray-400">{location.country}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-xs">
                          <div className="text-white">{location.latitude.toFixed(6)}</div>
                          <div className="text-white">{location.longitude.toFixed(6)}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          location.accuracy <= 50 ? 'bg-green-900/30 text-green-400' :
                          location.accuracy <= 100 ? 'bg-yellow-900/30 text-yellow-400' :
                          'bg-red-900/30 text-red-400'
                        }`}>
                          ±{location.accuracy}m
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300 text-xs">
                        {formatTimestamp(location.timestamp)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs">
                          <div className="text-gray-400">IP: {location.ipAddress}</div>
                          <div className="text-gray-500 truncate max-w-32" title={location.userAgent}>
                            {location.userAgent.split(' ')[0]}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'patterns' && (
          <div className="space-y-6">
            {movementPatterns.map((pattern) => (
              <div key={pattern.userId} className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{pattern.username}</h3>
                    <p className="text-sm text-gray-400">{pattern.email}</p>
                  </div>
                  <div className={`px-3 py-1 rounded text-sm font-medium ${
                    pattern.riskScore >= 80 ? 'bg-red-900/30 text-red-400' :
                    pattern.riskScore >= 60 ? 'bg-yellow-900/30 text-yellow-400' :
                    'bg-green-900/30 text-green-400'
                  }`}>
                    Risk: {pattern.riskScore}/100
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-300 mb-2">Location Stats</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total locations:</span>
                        <span className="text-white">{pattern.totalLocations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Unique locations:</span>
                        <span className="text-white">{pattern.uniqueLocations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Avg accuracy:</span>
                        <span className="text-white">±{pattern.averageAccuracy}m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Last seen:</span>
                        <span className="text-white">{formatTimestamp(pattern.lastSeen)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-300 mb-2">Activity Patterns</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Most active hour:</span>
                        <span className="text-white">{pattern.timePatterns.mostActiveHour}:00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Most active day:</span>
                        <span className="text-white">{pattern.timePatterns.mostActiveDay}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Avg session:</span>
                        <span className="text-white">{pattern.timePatterns.averageSessionDuration}min</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-300 mb-2">Frequent Locations</h4>
                    <div className="space-y-2">
                      {pattern.frequentLocations.slice(0, 3).map((location, index) => (
                        <div key={index} className="text-xs">
                          <div className="text-white">{location.city}, {location.region}</div>
                          <div className="text-gray-400">
                            {location.visitCount} visits • Last: {formatTimestamp(location.lastVisit)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'predictions' && selectedUserId && (
          <div className="space-y-6">
            {locationPredictions.map((prediction) => (
              <div key={prediction.userId} className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">Location Predictions</h3>
                  <div className="text-sm text-gray-400">
                    Accuracy: {(prediction.accuracy * 100).toFixed(1)}% • Generated: {formatTimestamp(prediction.generatedAt)}
                  </div>
                </div>

                <div className="space-y-4">
                  {prediction.predictions.map((pred, index) => (
                    <div key={index} className="bg-gray-800 border border-gray-700 rounded p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-white">{pred.city}, {pred.region}</div>
                          <div className="text-sm text-gray-400 font-mono">
                            {pred.latitude.toFixed(6)}, {pred.longitude.toFixed(6)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            pred.confidence >= 0.8 ? 'bg-green-900/30 text-green-400' :
                            pred.confidence >= 0.6 ? 'bg-yellow-900/30 text-yellow-400' :
                            'bg-red-900/30 text-red-400'
                          }`}>
                            {(pred.confidence * 100).toFixed(1)}% confidence
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{pred.timeWindow}</div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300">{pred.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'meetings' && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg">
            <div className="border-b border-gray-700 px-4 py-3">
              <h2 className="text-lg font-semibold text-white">Detected User Meetings</h2>
              <p className="text-sm text-gray-400">Users who were in close proximity ({userMeetings.length} meetings)</p>
            </div>
            <div className="space-y-4 p-4">
              {userMeetings.map((meeting) => (
                <div key={meeting.id} className="bg-gray-800 border border-gray-700 rounded p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 text-white">
                        <span className="font-medium">{meeting.user1.username}</span>
                        <span className="text-gray-400">↔</span>
                        <span className="font-medium">{meeting.user2.username}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {meeting.user1.email} • {meeting.user2.email}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        meeting.confidence >= 0.8 ? 'bg-green-900/30 text-green-400' :
                        meeting.confidence >= 0.6 ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-red-900/30 text-red-400'
                      }`}>
                        {(meeting.confidence * 100).toFixed(1)}% confidence
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatTimestamp(meeting.timestamp)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Location:</span>
                      <div className="text-white">{meeting.location.city}, {meeting.location.region}</div>
                      <div className="text-xs text-gray-500 font-mono">
                        {meeting.location.latitude.toFixed(6)}, {meeting.location.longitude.toFixed(6)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Distance:</span>
                      <div className="text-white">{formatDistance(meeting.distance)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Duration:</span>
                      <div className="text-white">{meeting.duration} minutes</div>
                    </div>
                  </div>

                  {meeting.context && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <span className="text-gray-400 text-sm">Context: </span>
                      <span className="text-gray-300 text-sm">{meeting.context}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
