'use client';

import React, { useState } from 'react';

interface ContentItem {
  id: string;
  type: 'CHAT_MESSAGE' | 'TRUTH_ANSWER' | 'DROPZONE_SECRET' | 'ADMIN_PLANT';
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  engagementScore: number;
  metadata: any;
  adminBoost?: number;
  suppressionLevel?: number;
  isPromoted?: boolean;
  isSuppressed?: boolean;
  psychologicalTags?: string[];
  emotionalWeight?: number;
}

interface ContentCardProps {
  content: ContentItem;
  onInteraction?: (contentId: string, interactionType: string) => void;
  showAdminData?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

const CONTENT_TYPE_COLORS = {
  CHAT_MESSAGE: 'border-blue-500/30 bg-blue-900/10',
  TRUTH_ANSWER: 'border-purple-500/30 bg-purple-900/10',
  DROPZONE_SECRET: 'border-orange-500/30 bg-orange-900/10',
  ADMIN_PLANT: 'border-red-500/30 bg-red-900/10'
};

const CONTENT_TYPE_ICONS = {
  CHAT_MESSAGE: '💬',
  TRUTH_ANSWER: '🎯',
  DROPZONE_SECRET: '🗝️',
  ADMIN_PLANT: '🤖'
};

const CONTENT_TYPE_LABELS = {
  CHAT_MESSAGE: 'Chat Message',
  TRUTH_ANSWER: 'Truth Answer',
  DROPZONE_SECRET: 'Secret',
  ADMIN_PLANT: 'Admin Content'
};

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getEngagementLevel(score: number): { label: string; color: string } {
  if (score > 0.8) return { label: 'High', color: 'text-green-400' };
  if (score > 0.5) return { label: 'Medium', color: 'text-yellow-400' };
  if (score > 0.2) return { label: 'Low', color: 'text-gray-400' };
  return { label: 'Minimal', color: 'text-gray-500' };
}

function getEmotionalIntensity(weight?: number): { label: string; color: string } {
  if (!weight) return { label: 'Neutral', color: 'text-gray-400' };
  if (weight > 0.8) return { label: 'Intense', color: 'text-red-400' };
  if (weight > 0.6) return { label: 'Strong', color: 'text-orange-400' };
  if (weight > 0.4) return { label: 'Moderate', color: 'text-yellow-400' };
  return { label: 'Mild', color: 'text-blue-400' };
}

export function ContentCard({ 
  content, 
  onInteraction, 
  showAdminData = false, 
  isSelected = false,
  onClick,
  className = ''
}: ContentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

  const handleInteraction = (type: string) => {
    if (onInteraction) {
      onInteraction(content.id, type);
    }
  };

  const colorClass = CONTENT_TYPE_COLORS[content.type] || 'border-gray-500/30 bg-gray-900/10';
  const icon = CONTENT_TYPE_ICONS[content.type] || '📄';
  const label = CONTENT_TYPE_LABELS[content.type] || 'Content';

  const engagementLevel = getEngagementLevel(content.engagementScore);
  const emotionalIntensity = getEmotionalIntensity(content.emotionalWeight);

  const shouldTruncate = content.content.length > 200;
  const displayContent = shouldTruncate && !isExpanded 
    ? content.content.substring(0, 200) + '...' 
    : content.content;

  return (
    <div 
      className={`
        bg-gray-900 border rounded-lg p-4 transition-all duration-200 cursor-pointer
        hover:border-red-500/50 hover:bg-gray-800/50
        ${colorClass}
        ${isSelected ? 'ring-2 ring-red-500 border-red-500' : ''}
        ${content.isPromoted ? 'ring-1 ring-yellow-500/50' : ''}
        ${content.isSuppressed ? 'opacity-60' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">{content.username}</span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-400">{label}</span>
              {content.isPromoted && (
                <span className="text-xs bg-yellow-600 text-yellow-100 px-1 rounded">
                  PROMOTED
                </span>
              )}
              {content.isSuppressed && (
                <span className="text-xs bg-red-600 text-red-100 px-1 rounded">
                  SUPPRESSED
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {formatTimestamp(new Date(content.timestamp))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Engagement Score */}
          <div className="text-right">
            <div className={`text-xs ${engagementLevel.color}`}>
              {engagementLevel.label}
            </div>
            <div className="text-xs text-gray-500">
              {(content.engagementScore * 100).toFixed(0)}%
            </div>
          </div>

          {/* Admin Controls */}
          {showAdminData && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMetadata(!showMetadata);
              }}
              className="text-gray-400 hover:text-white text-xs"
            >
              📊
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mb-3">
        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
          {displayContent}
        </p>
        
        {shouldTruncate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-red-400 hover:text-red-300 text-sm mt-2"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {/* Metadata */}
      {content.metadata && Object.keys(content.metadata).length > 0 && (
        <div className="mb-3">
          {content.type === 'CHAT_MESSAGE' && content.metadata.roomName && (
            <div className="text-xs text-gray-500">
              💬 From: {content.metadata.roomName}
              {content.metadata.reactions > 0 && (
                <span className="ml-2">❤️ {content.metadata.reactions}</span>
              )}
            </div>
          )}
          
          {content.type === 'TRUTH_ANSWER' && content.metadata.questionText && (
            <div className="text-xs text-gray-500">
              🎯 Question: {content.metadata.questionText}
            </div>
          )}
          
          {content.type === 'DROPZONE_SECRET' && (
            <div className="text-xs text-gray-500">
              🗝️ {content.metadata.category} • {content.metadata.location}
              {content.metadata.unlocks > 0 && (
                <span className="ml-2">🔓 {content.metadata.unlocks} unlocks</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Psychological Tags */}
      {showAdminData && content.psychologicalTags && content.psychologicalTags.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1">Psychological Tags:</div>
          <div className="flex flex-wrap gap-1">
            {content.psychologicalTags.map((tag, index) => (
              <span
                key={index}
                className="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded"
              >
                {tag.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Admin Metadata */}
      {showAdminData && showMetadata && (
        <div className="border-t border-gray-700 pt-3 mt-3">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-gray-400 mb-1">Engagement:</div>
              <div className="text-white">{(content.engagementScore * 100).toFixed(1)}%</div>
            </div>
            
            <div>
              <div className="text-gray-400 mb-1">Emotional Weight:</div>
              <div className={emotionalIntensity.color}>
                {emotionalIntensity.label} ({((content.emotionalWeight || 0) * 100).toFixed(0)}%)
              </div>
            </div>

            {content.adminBoost && (
              <div>
                <div className="text-gray-400 mb-1">Admin Boost:</div>
                <div className="text-yellow-400">+{content.adminBoost}</div>
              </div>
            )}

            {content.suppressionLevel && (
              <div>
                <div className="text-gray-400 mb-1">Suppression:</div>
                <div className="text-red-400">{content.suppressionLevel}/10</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-700 mt-3">
        <div className="flex items-center gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleInteraction('view');
            }}
            className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
          >
            👁️ View
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleInteraction('react');
            }}
            className="text-gray-400 hover:text-red-400 text-sm flex items-center gap-1"
          >
            ❤️ React
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleInteraction('share');
            }}
            className="text-gray-400 hover:text-blue-400 text-sm flex items-center gap-1"
          >
            📤 Share
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>ID: {content.id.substring(0, 8)}</span>
          {showAdminData && (
            <span>Type: {content.type}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Skeleton loading component
export function ContentCardSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 animate-pulse">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 bg-gray-700 rounded"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-700 rounded w-32 mb-1"></div>
          <div className="h-3 bg-gray-800 rounded w-20"></div>
        </div>
        <div className="w-12 h-8 bg-gray-700 rounded"></div>
      </div>
      
      <div className="space-y-2 mb-3">
        <div className="h-4 bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
      </div>
      
      <div className="flex items-center justify-between pt-3 border-t border-gray-700">
        <div className="flex gap-4">
          <div className="h-6 bg-gray-700 rounded w-12"></div>
          <div className="h-6 bg-gray-700 rounded w-12"></div>
          <div className="h-6 bg-gray-700 rounded w-12"></div>
        </div>
        <div className="h-4 bg-gray-700 rounded w-16"></div>
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function CompactContentCard({ content, onClick, className = '' }: {
  content: ContentItem;
  onClick?: () => void;
  className?: string;
}) {
  const icon = CONTENT_TYPE_ICONS[content.type] || '📄';
  const colorClass = CONTENT_TYPE_COLORS[content.type] || 'border-gray-500/30';

  return (
    <div 
      className={`
        bg-gray-900 border rounded-lg p-3 cursor-pointer transition-all
        hover:border-red-500/50 hover:bg-gray-800/50
        ${colorClass}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white truncate">
              {content.username}
            </span>
            <span className="text-xs text-gray-500">
              {formatTimestamp(new Date(content.timestamp))}
            </span>
          </div>
          <p className="text-sm text-gray-300 line-clamp-2">
            {content.content}
          </p>
        </div>
        {content.isPromoted && (
          <div className="text-xs bg-yellow-600 text-yellow-100 px-1 rounded">
            ⭐
          </div>
        )}
      </div>
    </div>
  );
}
