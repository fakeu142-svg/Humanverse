'use client';

import React from 'react';
import { calculateDistance } from '@/lib/geolocation';

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

interface NearbySecretsProps {
  secrets: DropSecret[];
  currentLocation: LocationData | null;
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

const CATEGORY_COLORS: Record<string, string> = {
  CONFESSION: 'border-purple-500 bg-purple-900/20',
  WARNING: 'border-orange-500 bg-orange-900/20',
  MEMORY: 'border-blue-500 bg-blue-900/20',
  HOPE: 'border-yellow-500 bg-yellow-900/20',
  TRUTH: 'border-green-500 bg-green-900/20',
  MYSTERY: 'border-indigo-500 bg-indigo-900/20',
  WISDOM: 'border-amber-500 bg-amber-900/20',
  GOSSIP: 'border-pink-500 bg-pink-900/20'
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

export function NearbySecrets({ 
  secrets, 
  currentLocation, 
  selectedSecret, 
  onSecretSelect, 
  onUnlockSecret, 
  loading 
}: NearbySecretsProps) {
  const sortedSecrets = [...secrets].sort((a, b) => a.distance - b.distance);

  if (loading && secrets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">📍</div>
          <p className="text-gray-400">Scanning for nearby secrets...</p>
        </div>
      </div>
    );
  }

  if (secrets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-bold text-gray-300 mb-2">No secrets found nearby</h3>
        <p className="text-gray-500 mb-6">
          Be the first to drop a secret in this area, or explore a bit more!
        </p>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-sm text-gray-400">
            💡 Secrets can be discovered within 10km and unlocked within 1km of their location.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Secrets List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            Nearby Secrets ({secrets.length})
          </h2>
          <div className="text-sm text-gray-400">
            {currentLocation && `Near ${currentLocation.city}, ${currentLocation.region}`}
          </div>
        </div>

        {sortedSecrets.map((secret) => (
          <div
            key={secret.id}
            onClick={() => onSecretSelect(secret)}
            className={`bg-gray-900 border rounded-lg p-4 cursor-pointer transition-all hover:border-red-500/50 ${
              selectedSecret?.id === secret.id 
                ? 'border-red-500 bg-red-900/10' 
                : `border-gray-700 ${CATEGORY_COLORS[secret.category] || 'border-gray-700'}`
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">
                    {CATEGORY_ICONS[secret.category] || '📎'}
                  </span>
                  <div>
                    <h3 className="font-bold text-white">{secret.title}</h3>
                    <p className="text-sm text-gray-400">
                      {secret.category} • {formatDistance(secret.distance)} away
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>📍 {secret.location.city}, {secret.location.region}</span>
                  <span>🕒 {formatTimeAgo(new Date(secret.createdAt))}</span>
                </div>

                {secret.isUnlocked && (
                  <div className="mt-3 p-3 bg-gray-800 border border-gray-700 rounded">
                    <p className="text-sm text-gray-300">{secret.content}</p>
                    <p className="text-xs text-green-400 mt-2">
                      ✓ Unlocked {secret.unlockedAt && formatTimeAgo(new Date(secret.unlockedAt))}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-2 ml-4">
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  secret.isUnlocked 
                    ? 'bg-green-900/30 text-green-400 border border-green-700'
                    : secret.canUnlock
                    ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
                    : 'bg-gray-700 text-gray-400 border border-gray-600'
                }`}>
                  {secret.isUnlocked ? 'Unlocked' : secret.canUnlock ? 'Can Unlock' : 'Too Far'}
                </div>

                {secret.canUnlock && !secret.isUnlocked && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnlockSecret(secret);
                    }}
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 
                             text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                  >
                    🔓 Unlock
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Secret Detail */}
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
                  You need to be within 1km to unlock this secret
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 text-center sticky top-24">
            <span className="text-4xl">🔍</span>
            <h3 className="text-lg font-medium text-gray-400 mt-2">
              Select a secret to view details
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Click on any secret from the list to learn more
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
