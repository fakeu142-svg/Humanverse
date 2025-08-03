'use client';

import React, { useState, useEffect } from 'react';
import { getCurrentLocation, calculateDistance } from '@/lib/geolocation';
import { MapView } from './MapView';
import { NearbySecrets } from './NearbySecrets';
import { SecretForm } from './SecretForm';
import { useAuth } from '@/hooks/useAuth';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  city: string;
  region: string;
  country: string;
}

interface DropSecret {
  id: string;
  title: string;
  category: string;
  distance: number;
  canUnlock: boolean;
  isUnlocked: boolean;
  content?: string;
  unlockedAt?: Date;
  createdAt: Date;
  location: {
    fuzzyLatitude: number;
    fuzzyLongitude: number;
    city: string;
    region: string;
  };
}

export function DropZone() {
  const { user } = useAuth();
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [nearbySecrets, setNearbySecrets] = useState<DropSecret[]>([]);
  const [selectedSecret, setSelectedSecret] = useState<DropSecret | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'map' | 'list'>('map');

  useEffect(() => {
    if (user) {
      requestLocation();
    }
  }, [user]);

  const requestLocation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const location = await getCurrentLocation(true);
      setCurrentLocation(location);
      
      await loadNearbySecrets(location.latitude, location.longitude);
    } catch (err: any) {
      console.error('Location error:', err);
      setError(err.message || 'Failed to get location');
      
      // Try with lower accuracy as fallback
      try {
        const location = await getCurrentLocation(false);
        setCurrentLocation(location);
        await loadNearbySecrets(location.latitude, location.longitude);
      } catch (fallbackErr: any) {
        setError('Location access denied or unavailable');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadNearbySecrets = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch('/api/dropzone/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, radius: 10000 }) // 10km radius
      });

      if (!response.ok) {
        throw new Error('Failed to load nearby secrets');
      }

      const data = await response.json();
      setNearbySecrets(data.secrets || []);
    } catch (err: any) {
      console.error('Error loading nearby secrets:', err);
      setError('Failed to load nearby secrets');
    }
  };

  const handleUnlockSecret = async (secret: DropSecret) => {
    if (!currentLocation) {
      setError('Location required to unlock secrets');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/dropzone/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretId: secret.id,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unlock secret');
      }

      // Update the secret in our local state
      setNearbySecrets(prev => prev.map(s => 
        s.id === secret.id 
          ? { ...s, isUnlocked: true, content: data.secret.content, unlockedAt: new Date() }
          : s
      ));

      setSelectedSecret({
        ...secret,
        isUnlocked: true,
        content: data.secret.content,
        unlockedAt: new Date()
      });
    } catch (err: any) {
      console.error('Unlock error:', err);
      setError(err.message || 'Failed to unlock secret');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSecret = async (secretData: any) => {
    if (!currentLocation) {
      setError('Location required to create secrets');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/dropzone/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...secretData,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create secret');
      }

      // Refresh nearby secrets
      await loadNearbySecrets(currentLocation.latitude, currentLocation.longitude);
      setShowCreateForm(false);
    } catch (err: any) {
      console.error('Create secret error:', err);
      setError(err.message || 'Failed to create secret');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-400 text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p>Please log in to access DropZone</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-red-900/30 bg-black/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-red-400">DropZone</h1>
              <p className="text-gray-400 text-sm">Location-based secret sharing</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* View Toggle */}
              <div className="flex bg-gray-900 rounded-lg p-1">
                <button
                  onClick={() => setView('map')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    view === 'map' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Map
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    view === 'list' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  List
                </button>
              </div>

              {/* Location Status */}
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${currentLocation ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-gray-400">
                  {currentLocation ? `${currentLocation.city}, ${currentLocation.region}` : 'No location'}
                </span>
              </div>

              {/* Create Secret Button */}
              <button
                onClick={() => setShowCreateForm(true)}
                disabled={!currentLocation || loading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:opacity-50 
                         px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Drop Secret
              </button>

              {/* Refresh Location */}
              <button
                onClick={requestLocation}
                disabled={loading}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 
                         px-3 py-2 rounded-lg text-sm transition-colors"
              >
                {loading ? '📍' : '🔄'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 mx-6 mt-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {view === 'map' ? (
          <MapView
            currentLocation={currentLocation}
            secrets={nearbySecrets}
            selectedSecret={selectedSecret}
            onSecretSelect={setSelectedSecret}
            onUnlockSecret={handleUnlockSecret}
            loading={loading}
          />
        ) : (
          <NearbySecrets
            secrets={nearbySecrets}
            currentLocation={currentLocation}
            selectedSecret={selectedSecret}
            onSecretSelect={setSelectedSecret}
            onUnlockSecret={handleUnlockSecret}
            loading={loading}
          />
        )}
      </div>

      {/* Create Secret Modal */}
      {showCreateForm && (
        <SecretForm
          currentLocation={currentLocation}
          onSubmit={handleCreateSecret}
          onCancel={() => setShowCreateForm(false)}
          loading={loading}
        />
      )}
    </div>
  );
}
