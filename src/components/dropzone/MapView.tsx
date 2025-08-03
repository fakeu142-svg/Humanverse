'use client';

import React from 'react';

interface LocationData {
  latitude: number;
  longitude: number;
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

interface MapViewProps {
  currentLocation: LocationData | null;
  secrets: DropSecret[];
  selectedSecret: DropSecret | null;
  onSecretSelect: (secret: DropSecret) => void;
  onUnlockSecret: (secret: DropSecret) => void;
  loading: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  CONFESSION: '🤫',
  WARNING: '⚠️',
  MEMORY: '💭',
  HOPE: '🌟',
  TRUTH: '💡',
  MYSTERY: '🔮',
  WISDOM: '🦉',
  GOSSIP: '👂'
};

function formatDistance(distance: number): string {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export function MapView({ 
  currentLocation, 
  secrets, 
  selectedSecret, 
  onSecretSelect, 
  onUnlockSecret, 
  loading 
}: MapViewProps) {
  // Calculate bounds for the map display
  const calculateBounds = () => {
    if (!currentLocation) return null;

    const allPoints = [
      { lat: currentLocation.latitude, lng: currentLocation.longitude },
      ...secrets.map(s => ({ lat: s.location.fuzzyLatitude, lng: s.location.fuzzyLongitude }))
    ];

    const lats = allPoints.map(p => p.lat);
    const lngs = allPoints.map(p => p.lng);

    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  };

  const bounds = calculateBounds();

  if (loading && secrets.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 border border-gray-700 rounded-lg">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">📍</div>
          <p className="text-gray-400">Loading map...</p>
        </div>
      </div>
    );
  }

  if (!currentLocation) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 border border-gray-700 rounded-lg">
        <div className="text-center">
          <div className="text-4xl mb-4">📍</div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">Location Required</h3>
          <p className="text-gray-500">Enable location access to view the map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Map Area */}
      <div className="lg:col-span-2">
        <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
          {/* Map Header */}
          <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white">Location Map</h3>
              <div className="text-sm text-gray-400">
                📍 {currentLocation.city}, {currentLocation.region}
              </div>
            </div>
          </div>

          {/* Simulated Map View */}
          <div className="relative h-96 bg-gradient-to-br from-gray-800 to-gray-900 p-6">
            {/* Current Location */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
                <div className="absolute inset-0 w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                  You are here
                </div>
              </div>
            </div>

            {/* Secrets */}
            {secrets.map((secret, index) => {
              // Simulate positions around the center
              const angle = (index * 2 * Math.PI) / secrets.length;
              const distance = Math.min(secret.distance / 10000, 0.8); // Scale distance
              const x = 50 + distance * 30 * Math.cos(angle);
              const y = 50 + distance * 30 * Math.sin(angle);

              return (
                <div
                  key={secret.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  onClick={() => onSecretSelect(secret)}
                >
                  <div className={`relative group ${
                    selectedSecret?.id === secret.id ? 'z-10' : ''
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg border-2 shadow-lg transition-transform hover:scale-110 ${
                      secret.isUnlocked 
                        ? 'bg-green-500 border-green-300' 
                        : secret.canUnlock
                        ? 'bg-yellow-500 border-yellow-300'
                        : 'bg-red-500 border-red-300'
                    } ${selectedSecret?.id === secret.id ? 'scale-125 ring-2 ring-white' : ''}`}>
                      <span className="text-white text-sm">
                        {CATEGORY_ICONS[secret.category] || '📎'}
                      </span>
                    </div>
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                      <div className="bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                        {secret.title} ({formatDistance(secret.distance)})
                      </div>
                    </div>

                    {/* Distance circles for selected secret */}
                    {selectedSecret?.id === secret.id && (
                      <>
                        <div className="absolute inset-0 w-8 h-8 border-2 border-white rounded-full animate-ping opacity-50"></div>
                        <div className="absolute inset-0 w-8 h-8 border border-white rounded-full opacity-30"></div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Discovery Radius Indicator */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-72 h-72 border border-blue-400/30 rounded-full"></div>
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs text-blue-400">
                10km discovery radius
              </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm border border-gray-600 rounded-lg p-3">
              <h4 className="text-white font-medium text-sm mb-2">Legend</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-300">Your location</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-300">Unlocked secret</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-300">Can unlock</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-300">Too far</span>
                </div>
              </div>
            </div>
          </div>

          {/* Map Footer */}
          <div className="bg-gray-800 px-4 py-3 border-t border-gray-700">
            <div className="text-xs text-gray-400 text-center">
              🗺️ Interactive map showing {secrets.length} nearby secrets within 10km
            </div>
          </div>
        </div>
      </div>

      {/* Secret Details Sidebar */}
      <div className="lg:col-span-1">
        {selectedSecret ? (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 sticky top-24">
            <div className="text-center mb-4">
              <span className="text-4xl">
                {CATEGORY_ICONS[selectedSecret.category] || '📎'}
              </span>
              <h3 className="text-xl font-bold text-white mt-2">
                {selectedSecret.title}
              </h3>
              <p className="text-sm text-gray-400">
                {selectedSecret.category}
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Distance:</span>
                <span className="text-white">{formatDistance(selectedSecret.distance)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Location:</span>
                <span className="text-white text-right">
                  {selectedSecret.location.city}<br />
                  {selectedSecret.location.region}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Created:</span>
                <span className="text-white">{formatTimeAgo(new Date(selectedSecret.createdAt))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Status:</span>
                <span className={`font-medium ${
                  selectedSecret.isUnlocked 
                    ? 'text-green-400' 
                    : selectedSecret.canUnlock
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}>
                  {selectedSecret.isUnlocked ? 'Unlocked' : selectedSecret.canUnlock ? 'Can Unlock' : 'Too Far'}
                </span>
              </div>
            </div>

            {selectedSecret.isUnlocked ? (
              <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-green-400">✓</span>
                  <span className="text-green-400 font-medium">Secret Unlocked</span>
                </div>
                <p className="text-white text-sm leading-relaxed">
                  {selectedSecret.content}
                </p>
                {selectedSecret.unlockedAt && (
                  <p className="text-xs text-green-400 mt-3">
                    Unlocked {formatTimeAgo(new Date(selectedSecret.unlockedAt))}
                  </p>
                )}
              </div>
            ) : selectedSecret.canUnlock ? (
              <button
                onClick={() => onUnlockSecret(selectedSecret)}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 
                         text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Unlocking...' : '🔓 Unlock Secret'}
              </button>
            ) : (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
                <span className="text-gray-400">🚫</span>
                <p className="text-gray-400 text-sm mt-2">
                  Get within 1km to unlock this secret
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Current distance: {formatDistance(selectedSecret.distance)}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 text-center sticky top-24">
            <span className="text-4xl">🗺️</span>
            <h3 className="text-lg font-medium text-gray-400 mt-2">
              Click a secret on the map
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Select any marker to view details and unlock secrets
            </p>
            
            {secrets.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-400">
                  📊 {secrets.filter(s => s.isUnlocked).length} unlocked • {secrets.filter(s => s.canUnlock && !s.isUnlocked).length} available • {secrets.filter(s => !s.canUnlock).length} distant
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
