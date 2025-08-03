'use client';

import React, { useState } from 'react';

interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  country: string;
}

interface SecretFormProps {
  currentLocation: LocationData | null;
  onSubmit: (secretData: any) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const SECRET_CATEGORIES = [
  { value: 'CONFESSION', label: 'Confession', emoji: '🤫', description: 'Share something you need to get off your chest' },
  { value: 'WARNING', label: 'Warning', emoji: '⚠️', description: 'Alert others about dangers or scams' },
  { value: 'MEMORY', label: 'Memory', emoji: '💭', description: 'Share a meaningful memory tied to this place' },
  { value: 'HOPE', label: 'Hope', emoji: '🌟', description: 'Leave words of encouragement or positivity' },
  { value: 'TRUTH', label: 'Truth', emoji: '💡', description: 'Reveal something true about this location' },
  { value: 'MYSTERY', label: 'Mystery', emoji: '🔮', description: 'Share something mysterious or unexplained' },
  { value: 'WISDOM', label: 'Wisdom', emoji: '🦉', description: 'Share life lessons or advice' },
  { value: 'GOSSIP', label: 'Gossip', emoji: '👂', description: 'Local rumors or interesting stories' }
];

const VISIBILITY_LEVELS = [
  { value: 'PUBLIC', label: 'Public', description: 'Anyone can discover and unlock' },
  { value: 'FRIENDS', label: 'Friends Only', description: 'Only your friends can see this' },
  { value: 'ANONYMOUS', label: 'Anonymous', description: 'Your identity will be hidden' }
];

export function SecretForm({ currentLocation, onSubmit, onCancel, loading }: SecretFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'CONFESSION',
    visibility: 'PUBLIC',
    expiresIn: '168', // 7 days in hours
    requiresProximity: true
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be under 100 characters';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    } else if (formData.content.length > 2000) {
      newErrors.content = 'Content must be under 2000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!currentLocation) {
      setErrors({ general: 'Location is required to create a secret' });
      return;
    }

    try {
      await onSubmit({
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category,
        visibility: formData.visibility,
        expiresAt: new Date(Date.now() + parseInt(formData.expiresIn) * 60 * 60 * 1000),
        requiresProximity: formData.requiresProximity
      });
    } catch (error) {
      setErrors({ general: 'Failed to create secret' });
    }
  };

  const selectedCategory = SECRET_CATEGORIES.find(cat => cat.value === formData.category);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-red-900/30 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-red-400">Drop a Secret</h2>
              <p className="text-gray-400 text-sm mt-1">
                Share something at {currentLocation?.city}, {currentLocation?.region}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg">
              {errors.general}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Secret Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 
                       text-white placeholder-gray-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              placeholder="Give your secret a mysterious title..."
              maxLength={100}
            />
            {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
            <p className="text-gray-500 text-xs mt-1">{formData.title.length}/100 characters</p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category
            </label>
            <div className="grid grid-cols-2 gap-3">
              {SECRET_CATEGORIES.map((category) => (
                <label
                  key={category.value}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.category === category.value
                      ? 'border-red-500 bg-red-900/20'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={category.value}
                    checked={formData.category === category.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="sr-only"
                  />
                  <span className="text-xl mr-3">{category.emoji}</span>
                  <div>
                    <div className="font-medium text-white">{category.label}</div>
                    <div className="text-xs text-gray-400">{category.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Secret Content *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={6}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 
                       text-white placeholder-gray-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              placeholder={`Share your ${selectedCategory?.label.toLowerCase()} here...`}
              maxLength={2000}
            />
            {errors.content && <p className="text-red-400 text-sm mt-1">{errors.content}</p>}
            <p className="text-gray-500 text-xs mt-1">{formData.content.length}/2000 characters</p>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Visibility
            </label>
            <div className="space-y-2">
              {VISIBILITY_LEVELS.map((level) => (
                <label
                  key={level.value}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.visibility === level.value
                      ? 'border-red-500 bg-red-900/20'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={level.value}
                    checked={formData.visibility === level.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value }))}
                    className="sr-only"
                  />
                  <div>
                    <div className="font-medium text-white">{level.label}</div>
                    <div className="text-sm text-gray-400">{level.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Expires After
            </label>
            <select
              value={formData.expiresIn}
              onChange={(e) => setFormData(prev => ({ ...prev, expiresIn: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 
                       text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
            >
              <option value="24">24 hours</option>
              <option value="72">3 days</option>
              <option value="168">1 week</option>
              <option value="336">2 weeks</option>
              <option value="720">1 month</option>
              <option value="2160">3 months</option>
            </select>
          </div>

          {/* Proximity Requirement */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.requiresProximity}
                onChange={(e) => setFormData(prev => ({ ...prev, requiresProximity: e.target.checked }))}
                className="w-5 h-5 bg-gray-800 border border-gray-600 rounded 
                         checked:bg-red-600 checked:border-red-600 focus:ring-2 focus:ring-red-500"
              />
              <div>
                <div className="font-medium text-white">Require proximity to unlock</div>
                <div className="text-sm text-gray-400">
                  Users must be within 1km to unlock this secret
                </div>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 
                       rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 
                       text-white py-3 px-6 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Dropping...' : 'Drop Secret'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
