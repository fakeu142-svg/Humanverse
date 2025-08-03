'use client';

import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface Geofence {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  radius: number;
  alertType: 'ENTRY' | 'EXIT' | 'BOTH';
  isActive: boolean;
  createdAt: Date;
  alertCount: number;
}

interface GeofenceAlert {
  id: string;
  eventType: 'ENTRY' | 'EXIT';
  timestamp: Date;
  latitude: number;
  longitude: number;
  user: {
    id: string;
    username: string;
    email: string;
  };
  geofence: {
    id: string;
    name: string;
    center: {
      latitude: number;
      longitude: number;
    };
    radius: number;
  };
  metadata: any;
}

const ALERT_TYPES = [
  { value: 'ENTRY', label: 'Entry Only', description: 'Alert when users enter the area' },
  { value: 'EXIT', label: 'Exit Only', description: 'Alert when users leave the area' },
  { value: 'BOTH', label: 'Entry & Exit', description: 'Alert for both entry and exit' }
];

export function GeofenceManager() {
  const { admin } = useAdminAuth();
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [alerts, setAlerts] = useState<GeofenceAlert[]>([]);
  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'geofences' | 'alerts'>('geofences');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    latitude: '',
    longitude: '',
    radius: '1000',
    alertType: 'ENTRY' as const,
    isActive: true
  });

  const [alertFilters, setAlertFilters] = useState({
    geofenceId: '',
    eventType: '',
    startDate: '',
    endDate: '',
    limit: 100
  });

  useEffect(() => {
    if (admin) {
      loadGeofences();
      if (view === 'alerts') {
        loadAlerts();
      }
    }
  }, [admin, view]);

  const loadGeofences = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/dropzone/geofence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list_geofences',
          includeInactive: true,
          limit: 100
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load geofences');
      }

      const data = await response.json();
      setGeofences(data.geofences || []);
    } catch (err: any) {
      console.error('Load geofences error:', err);
      setError(err.message || 'Failed to load geofences');
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/dropzone/geofence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'geofence_alerts',
          ...alertFilters
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load alerts');
      }

      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (err: any) {
      console.error('Load alerts error:', err);
      setError(err.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const createGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.latitude || !formData.longitude || !formData.radius) {
      setError('All fields are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/dropzone/geofence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_geofence',
          name: formData.name,
          description: formData.description,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          radius: parseFloat(formData.radius),
          alertType: formData.alertType,
          isActive: formData.isActive
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create geofence');
      }

      await loadGeofences();
      setShowCreateForm(false);
      setFormData({
        name: '',
        description: '',
        latitude: '',
        longitude: '',
        radius: '1000',
        alertType: 'ENTRY',
        isActive: true
      });
    } catch (err: any) {
      console.error('Create geofence error:', err);
      setError(err.message || 'Failed to create geofence');
    } finally {
      setLoading(false);
    }
  };

  const updateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGeofence) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/dropzone/geofence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_geofence',
          geofenceId: selectedGeofence.id,
          updates: {
            name: formData.name,
            description: formData.description,
            latitude: parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude),
            radius: parseFloat(formData.radius),
            alertType: formData.alertType,
            isActive: formData.isActive
          }
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update geofence');
      }

      await loadGeofences();
      setShowEditForm(false);
      setSelectedGeofence(null);
    } catch (err: any) {
      console.error('Update geofence error:', err);
      setError(err.message || 'Failed to update geofence');
    } finally {
      setLoading(false);
    }
  };

  const deleteGeofence = async (geofenceId: string) => {
    if (!confirm('Are you sure you want to delete this geofence?')) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/dropzone/geofence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_geofence',
          geofenceId
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete geofence');
      }

      await loadGeofences();
    } catch (err: any) {
      console.error('Delete geofence error:', err);
      setError(err.message || 'Failed to delete geofence');
    } finally {
      setLoading(false);
    }
  };

  const handleEditGeofence = (geofence: Geofence) => {
    setSelectedGeofence(geofence);
    setFormData({
      name: geofence.name,
      description: geofence.description,
      latitude: geofence.latitude.toString(),
      longitude: geofence.longitude.toString(),
      radius: geofence.radius.toString(),
      alertType: geofence.alertType,
      isActive: geofence.isActive
    });
    setShowEditForm(true);
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleString();
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
          <h1 className="text-3xl font-bold text-red-400 mb-2">Geofence Management</h1>
          <p className="text-gray-400">Create and manage surveillance zones</p>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setView('geofences')}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              view === 'geofences' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Geofences ({geofences.length})
          </button>
          <button
            onClick={() => setView('alerts')}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              view === 'alerts' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Alerts ({alerts.length})
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 mb-6 rounded">
            {error}
          </div>
        )}

        {/* Geofences View */}
        {view === 'geofences' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Active Geofences</h2>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-medium transition-colors"
              >
                Create Geofence
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {geofences.map((geofence) => (
                <div
                  key={geofence.id}
                  className={`bg-gray-900 border rounded-lg p-4 ${
                    geofence.isActive ? 'border-gray-700' : 'border-gray-800 opacity-60'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-white">{geofence.name}</h3>
                      <p className="text-sm text-gray-400">{geofence.description}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      geofence.isActive 
                        ? 'bg-green-900/30 text-green-400' 
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {geofence.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Coordinates:</span>
                      <span className="text-white font-mono text-xs">
                        {geofence.latitude.toFixed(4)}, {geofence.longitude.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Radius:</span>
                      <span className="text-white">{geofence.radius}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Alert Type:</span>
                      <span className="text-white">{geofence.alertType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Alerts:</span>
                      <span className="text-white">{geofence.alertCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Created:</span>
                      <span className="text-white text-xs">{formatTimestamp(geofence.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditGeofence(geofence)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteGeofence(geofence.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alerts View */}
        {view === 'alerts' && (
          <div>
            {/* Alert Filters */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Alert Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Geofence</label>
                  <select
                    value={alertFilters.geofenceId}
                    onChange={(e) => setAlertFilters(prev => ({ ...prev, geofenceId: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  >
                    <option value="">All Geofences</option>
                    {geofences.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Event Type</label>
                  <select
                    value={alertFilters.eventType}
                    onChange={(e) => setAlertFilters(prev => ({ ...prev, eventType: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  >
                    <option value="">All Events</option>
                    <option value="ENTRY">Entry</option>
                    <option value="EXIT">Exit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                  <input
                    type="datetime-local"
                    value={alertFilters.startDate}
                    onChange={(e) => setAlertFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                  <input
                    type="datetime-local"
                    value={alertFilters.endDate}
                    onChange={(e) => setAlertFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Actions</label>
                  <button
                    onClick={loadAlerts}
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 
                             px-4 py-2 rounded font-medium transition-colors"
                  >
                    {loading ? 'Loading...' : 'Filter'}
                  </button>
                </div>
              </div>
            </div>

            {/* Alerts List */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg">
              <div className="border-b border-gray-700 px-4 py-3">
                <h2 className="text-lg font-semibold text-white">Geofence Alerts</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800 border-b border-gray-700">
                    <tr>
                      <th className="text-left py-3 px-4 text-gray-300">Event</th>
                      <th className="text-left py-3 px-4 text-gray-300">User</th>
                      <th className="text-left py-3 px-4 text-gray-300">Geofence</th>
                      <th className="text-left py-3 px-4 text-gray-300">Location</th>
                      <th className="text-left py-3 px-4 text-gray-300">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert) => (
                      <tr key={alert.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            alert.eventType === 'ENTRY' 
                              ? 'bg-green-900/30 text-green-400' 
                              : 'bg-red-900/30 text-red-400'
                          }`}>
                            {alert.eventType}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-white">{alert.user.username}</div>
                            <div className="text-xs text-gray-400">{alert.user.email}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="text-white">{alert.geofence.name}</div>
                            <div className="text-xs text-gray-400">
                              Radius: {alert.geofence.radius}m
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono text-xs">
                            <div className="text-white">{alert.latitude.toFixed(6)}</div>
                            <div className="text-white">{alert.longitude.toFixed(6)}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-300 text-xs">
                          {formatTimestamp(alert.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Create Geofence Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-red-900/30 rounded-xl max-w-2xl w-full">
              <div className="border-b border-gray-800 p-6">
                <h2 className="text-2xl font-bold text-red-400">Create Geofence</h2>
              </div>
              <form onSubmit={createGeofence} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Alert Type</label>
                    <select
                      value={formData.alertType}
                      onChange={(e) => setFormData(prev => ({ ...prev, alertType: e.target.value as any }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    >
                      {ALERT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Radius (meters)</label>
                    <input
                      type="number"
                      value={formData.radius}
                      onChange={(e) => setFormData(prev => ({ ...prev, radius: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="w-4 h-4 bg-gray-800 border border-gray-600 rounded"
                    />
                    <span className="text-gray-300">Active</span>
                  </label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 
                             text-white py-2 px-4 rounded transition-colors"
                  >
                    {loading ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Geofence Modal */}
        {showEditForm && selectedGeofence && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-red-900/30 rounded-xl max-w-2xl w-full">
              <div className="border-b border-gray-800 p-6">
                <h2 className="text-2xl font-bold text-red-400">Edit Geofence</h2>
              </div>
              <form onSubmit={updateGeofence} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Alert Type</label>
                    <select
                      value={formData.alertType}
                      onChange={(e) => setFormData(prev => ({ ...prev, alertType: e.target.value as any }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    >
                      {ALERT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Radius (meters)</label>
                    <input
                      type="number"
                      value={formData.radius}
                      onChange={(e) => setFormData(prev => ({ ...prev, radius: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="w-4 h-4 bg-gray-800 border border-gray-600 rounded"
                    />
                    <span className="text-gray-300">Active</span>
                  </label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditForm(false);
                      setSelectedGeofence(null);
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 
                             text-white py-2 px-4 rounded transition-colors"
                  >
                    {loading ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
