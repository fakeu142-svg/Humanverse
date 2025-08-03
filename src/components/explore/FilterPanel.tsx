'use client';

import React, { useState, useEffect } from 'react';

interface FilterOptions {
  contentTypes: Array<{ value: string; label: string; count: number }>;
  timeRanges: Array<{ value: string; label: string }>;
  emotionalTones: Array<{ value: string; label: string }>;
  engagementLevels: Array<{ value: string; label: string }>;
  userRiskLevels: Array<{ value: string; label: string }>;
  psychologicalTags: Array<{ value: string; label: string }>;
  availableUsers: Array<{ id: string; username: string }>;
}

interface ContentFilters {
  contentTypes?: string[];
  timeRange?: string;
  emotionalTone?: string;
  engagementLevel?: string;
  userRiskLevel?: string;
  psychologicalTargets?: string[];
  excludeUsers?: string[];
  includeOnlyUsers?: string[];
  adminOverrides?: boolean;
}

interface FilterPanelProps {
  filters: ContentFilters;
  onFiltersChange: (filters: ContentFilters) => void;
  onReset: () => void;
  isLoading?: boolean;
  showAdvanced?: boolean;
  className?: string;
}

interface FilterPreset {
  id: string;
  name: string;
  filters: ContentFilters;
  usageCount: number;
  lastUsed: Date;
}

export function FilterPanel({
  filters,
  onFiltersChange,
  onReset,
  isLoading = false,
  showAdvanced = false,
  className = ''
}: FilterPanelProps) {
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(showAdvanced);
  const [newPresetName, setNewPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  // Load filter options on mount
  useEffect(() => {
    loadFilterOptions();
    loadPresets();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const response = await fetch('/api/explore/filter?action=options');
      if (response.ok) {
        const data = await response.json();
        setFilterOptions(data.options);
      }
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  };

  const loadPresets = async () => {
    try {
      const response = await fetch('/api/explore/filter?action=presets');
      if (response.ok) {
        const data = await response.json();
        setPresets(data.presets || []);
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  const handleFilterChange = (key: keyof ContentFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
  };

  const handleArrayFilterChange = (key: keyof ContentFilters, value: string, checked: boolean) => {
    const currentArray = (filters[key] as string[]) || [];
    let newArray;
    
    if (checked) {
      newArray = [...currentArray, value];
    } else {
      newArray = currentArray.filter(item => item !== value);
    }
    
    handleFilterChange(key, newArray.length > 0 ? newArray : undefined);
  };

  const savePreset = async () => {
    if (!newPresetName.trim()) return;

    try {
      const response = await fetch('/api/explore/filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters,
          saveAsPreset: true,
          presetName: newPresetName
        })
      });

      if (response.ok) {
        setNewPresetName('');
        setShowSavePreset(false);
        loadPresets(); // Reload presets
      }
    } catch (error) {
      console.error('Failed to save preset:', error);
    }
  };

  const loadPreset = (preset: FilterPreset) => {
    onFiltersChange(preset.filters);
    setShowPresets(false);
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => 
      value !== undefined && value !== null && 
      (Array.isArray(value) ? value.length > 0 : true)
    ).length;
  };

  if (!filterOptions) {
    return (
      <div className={`bg-gray-900 border border-gray-700 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4 w-32"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Content Filters</h3>
            <p className="text-sm text-gray-400">
              {getActiveFilterCount()} active filter{getActiveFilterCount() !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
            >
              📋 Presets
            </button>
            <button
              onClick={onReset}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
              disabled={isLoading}
            >
              🔄 Reset
            </button>
          </div>
        </div>
      </div>

      {/* Presets Panel */}
      {showPresets && (
        <div className="border-b border-gray-700 p-4 bg-gray-800/50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-white">Filter Presets</h4>
            <button
              onClick={() => setShowSavePreset(!showSavePreset)}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              💾 Save Current
            </button>
          </div>

          {showSavePreset && (
            <div className="mb-3 p-3 bg-gray-700 rounded">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Preset name..."
                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white text-sm"
                />
                <button
                  onClick={savePreset}
                  disabled={!newPresetName.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 
                           text-white px-3 py-1 rounded text-sm"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {presets.map(preset => (
              <div
                key={preset.id}
                className="flex items-center justify-between p-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600"
                onClick={() => loadPreset(preset)}
              >
                <div>
                  <div className="text-sm font-medium text-white">{preset.name}</div>
                  <div className="text-xs text-gray-400">
                    Used {preset.usageCount} times • Last: {new Date(preset.lastUsed).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-gray-400">→</div>
              </div>
            ))}
            {presets.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-2">No saved presets</div>
            )}
          </div>
        </div>
      )}

      {/* Basic Filters */}
      <div className="p-4 space-y-4">
        {/* Content Types */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Content Types</label>
          <div className="space-y-2">
            {filterOptions.contentTypes.map(type => (
              <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(filters.contentTypes || []).includes(type.value)}
                  onChange={(e) => handleArrayFilterChange('contentTypes', type.value, e.target.checked)}
                  className="w-4 h-4 bg-gray-800 border-gray-600 rounded"
                />
                <span className="text-sm text-gray-300">{type.label}</span>
                <span className="text-xs text-gray-500">({type.count})</span>
              </label>
            ))}
          </div>
        </div>

        {/* Time Range */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Time Range</label>
          <select
            value={filters.timeRange || 'week'}
            onChange={(e) => handleFilterChange('timeRange', e.target.value || undefined)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
          >
            {filterOptions.timeRanges.map(range => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
        </div>

        {/* Emotional Tone */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Emotional Tone</label>
          <select
            value={filters.emotionalTone || ''}
            onChange={(e) => handleFilterChange('emotionalTone', e.target.value || undefined)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
          >
            <option value="">All Emotions</option>
            {filterOptions.emotionalTones.map(tone => (
              <option key={tone.value} value={tone.value}>{tone.label}</option>
            ))}
          </select>
        </div>

        {/* Engagement Level */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Engagement Level</label>
          <select
            value={filters.engagementLevel || ''}
            onChange={(e) => handleFilterChange('engagementLevel', e.target.value || undefined)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
          >
            <option value="">All Levels</option>
            {filterOptions.engagementLevels.map(level => (
              <option key={level.value} value={level.value}>{level.label}</option>
            ))}
          </select>
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvancedPanel(!showAdvancedPanel)}
          className="w-full text-left text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2"
        >
          {showAdvancedPanel ? '▼' : '▶'} Advanced Filters
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvancedPanel && (
        <div className="border-t border-gray-700 p-4 space-y-4 bg-gray-800/20">
          {/* User Risk Level */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">User Risk Level</label>
            <select
              value={filters.userRiskLevel || ''}
              onChange={(e) => handleFilterChange('userRiskLevel', e.target.value || undefined)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
            >
              <option value="">All Risk Levels</option>
              {filterOptions.userRiskLevels.map(level => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>
          </div>

          {/* Psychological Targets */}
          {filterOptions.psychologicalTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Psychological Targeting
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {filterOptions.psychologicalTags.map(tag => (
                  <label key={tag.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(filters.psychologicalTargets || []).includes(tag.value)}
                      onChange={(e) => handleArrayFilterChange('psychologicalTargets', tag.value, e.target.checked)}
                      className="w-4 h-4 bg-gray-800 border-gray-600 rounded"
                    />
                    <span className="text-sm text-gray-300">{tag.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* User Filtering */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">User Filtering</label>
            <div className="space-y-3">
              {/* Include Only Users */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Include Only Users:</label>
                <select
                  multiple
                  value={filters.includeOnlyUsers || []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    handleFilterChange('includeOnlyUsers', selected.length > 0 ? selected : undefined);
                  }}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm h-20"
                >
                  {filterOptions.availableUsers.slice(0, 20).map(user => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                  ))}
                </select>
              </div>

              {/* Exclude Users */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Exclude Users:</label>
                <select
                  multiple
                  value={filters.excludeUsers || []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    handleFilterChange('excludeUsers', selected.length > 0 ? selected : undefined);
                  }}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm h-20"
                >
                  {filterOptions.availableUsers.slice(0, 20).map(user => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Admin Overrides */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.adminOverrides !== false}
                onChange={(e) => handleFilterChange('adminOverrides', e.target.checked)}
                className="w-4 h-4 bg-gray-800 border-gray-600 rounded"
              />
              <span className="text-sm text-gray-300">Apply admin content overrides</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Allow admin-controlled content promotion and suppression
            </p>
          </div>
        </div>
      )}

      {/* Filter Summary */}
      {getActiveFilterCount() > 0 && (
        <div className="border-t border-gray-700 p-3 bg-gray-800/30">
          <div className="text-xs text-gray-400 mb-2">Active Filters:</div>
          <div className="flex flex-wrap gap-1">
            {filters.contentTypes && filters.contentTypes.length > 0 && (
              <span className="bg-blue-900/30 text-blue-300 px-2 py-1 rounded text-xs">
                Types: {filters.contentTypes.length}
              </span>
            )}
            {filters.timeRange && (
              <span className="bg-green-900/30 text-green-300 px-2 py-1 rounded text-xs">
                Time: {filterOptions.timeRanges.find(t => t.value === filters.timeRange)?.label}
              </span>
            )}
            {filters.emotionalTone && (
              <span className="bg-purple-900/30 text-purple-300 px-2 py-1 rounded text-xs">
                Emotion: {filterOptions.emotionalTones.find(t => t.value === filters.emotionalTone)?.label}
              </span>
            )}
            {filters.engagementLevel && (
              <span className="bg-yellow-900/30 text-yellow-300 px-2 py-1 rounded text-xs">
                Engagement: {filterOptions.engagementLevels.find(l => l.value === filters.engagementLevel)?.label}
              </span>
            )}
            {filters.psychologicalTargets && filters.psychologicalTargets.length > 0 && (
              <span className="bg-red-900/30 text-red-300 px-2 py-1 rounded text-xs">
                Psych Tags: {filters.psychologicalTargets.length}
              </span>
            )}
            {filters.excludeUsers && filters.excludeUsers.length > 0 && (
              <span className="bg-gray-900/30 text-gray-300 px-2 py-1 rounded text-xs">
                Excluded: {filters.excludeUsers.length}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact filter bar for smaller spaces
export function CompactFilterBar({
  filters,
  onFiltersChange,
  className = ''
}: {
  filters: ContentFilters;
  onFiltersChange: (filters: ContentFilters) => void;
  className?: string;
}) {
  const [showPanel, setShowPanel] = useState(false);

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => 
      value !== undefined && value !== null && 
      (Array.isArray(value) ? value.length > 0 : true)
    ).length;
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white hover:border-red-500/50 transition-colors flex items-center gap-2"
      >
        🔍 Filters
        {getActiveFilterCount() > 0 && (
          <span className="bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
            {getActiveFilterCount()}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="absolute top-full left-0 mt-2 z-50 w-96">
          <FilterPanel
            filters={filters}
            onFiltersChange={onFiltersChange}
            onReset={() => onFiltersChange({})}
            showAdvanced={false}
          />
        </div>
      )}
    </div>
  );
}
