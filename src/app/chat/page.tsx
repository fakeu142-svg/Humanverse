'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useMaskStore } from '@/store/maskStore';
import Link from 'next/link';

interface ChatRoom {
  id: string;
  name: string;
  description: string;
  type: 'PUBLIC' | 'TRUTH_GAME' | 'DROP_ZONE' | 'ADMIN_CONTROLLED';
  isActive: boolean;
  maxUsers: number;
  currentUsers: number;
  adminMonitored: boolean;
  createdAt: string;
  lastActivity?: string;
  tags: string[];
}

export default function ChatRoomsPage() {
  const { user } = useAuth();
  const { activeMask } = useMaskStore();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  const getDemoRooms = (): ChatRoom[] => [
    {
      id: 'demo-room-1',
      name: 'Midnight Confessions',
      description: 'When the world sleeps, truth awakens. Share what you cannot say in daylight.',
      type: 'PUBLIC',
      isActive: true,
      maxUsers: 50,
      currentUsers: 12,
      adminMonitored: false,
      createdAt: '2024-01-15T00:00:00Z',
      lastActivity: '2024-01-25T02:30:00Z',
      tags: ['deep', 'anonymous', 'confessions']
    },
    {
      id: 'demo-room-2',
      name: 'Truth Seekers Circle',
      description: 'Where masks come off and authentic connections begin.',
      type: 'TRUTH_GAME',
      isActive: true,
      maxUsers: 20,
      currentUsers: 8,
      adminMonitored: true,
      createdAt: '2024-01-18T12:00:00Z',
      lastActivity: '2024-01-25T01:45:00Z',
      tags: ['truth-game', 'vulnerability', 'growth']
    },
    {
      id: 'demo-room-3',
      name: 'Secret Drops Discussion',
      description: 'Discuss the secrets you\'ve found and the mysteries that intrigue you.',
      type: 'DROP_ZONE',
      isActive: true,
      maxUsers: 30,
      currentUsers: 15,
      adminMonitored: false,
      createdAt: '2024-01-20T09:00:00Z',
      lastActivity: '2024-01-25T03:15:00Z',
      tags: ['dropzone', 'secrets', 'exploration']
    },
    {
      id: 'demo-room-4',
      name: 'The Void Speaks',
      description: 'For those who dance between realities and embrace the unknown.',
      type: 'PUBLIC',
      isActive: true,
      maxUsers: 25,
      currentUsers: 6,
      adminMonitored: false,
      createdAt: '2024-01-22T18:00:00Z',
      lastActivity: '2024-01-25T00:20:00Z',
      tags: ['void', 'philosophy', 'transcendence']
    },
    {
      id: 'demo-room-5',
      name: 'Admin Observatory',
      description: 'Monitored space for experimental conversations and behavioral analysis.',
      type: 'ADMIN_CONTROLLED',
      isActive: true,
      maxUsers: 15,
      currentUsers: 3,
      adminMonitored: true,
      createdAt: '2024-01-10T10:00:00Z',
      lastActivity: '2024-01-24T22:00:00Z',
      tags: ['admin', 'monitored', 'experimental']
    }
  ];

  const loadRooms = async () => {
    try {
      setLoading(true);
      console.log('Loading demo chat rooms');

      // Simulate loading delay
      setTimeout(() => {
        const demoRooms = getDemoRooms();
        setRooms(demoRooms);
        setLoading(false);
      }, 500);

      const data = await response.json();
      setRooms(data.rooms);
    } catch (error) {
      console.error('Load rooms error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchesType = selectedType === 'all' || room.type === selectedType;
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch && room.isActive;
  });

  const getRoomTypeConfig = (type: string) => {
    const configs = {
      PUBLIC: {
        color: 'from-blue-900 to-blue-700',
        icon: '💬',
        textColor: 'text-blue-200',
        borderColor: 'border-blue-500/50'
      },
      TRUTH_GAME: {
        color: 'from-purple-900 to-purple-700',
        icon: '🎭',
        textColor: 'text-purple-200',
        borderColor: 'border-purple-500/50'
      },
      DROP_ZONE: {
        color: 'from-green-900 to-green-700',
        icon: '📍',
        textColor: 'text-green-200',
        borderColor: 'border-green-500/50'
      },
      ADMIN_CONTROLLED: {
        color: 'from-red-900 to-red-700',
        icon: '🔒',
        textColor: 'text-red-200',
        borderColor: 'border-red-500/50'
      }
    };
    return configs[type as keyof typeof configs] || configs.PUBLIC;
  };

  const getActivityStatus = (lastActivity?: string) => {
    if (!lastActivity) return 'Unknown';
    
    const now = new Date();
    const activity = new Date(lastActivity);
    const diff = now.getTime() - activity.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Active now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center text-gray-400">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p>Please log in to access chat rooms</p>
        </div>
      </div>
    );
  }

  if (!activeMask) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center text-gray-400">
          <h2 className="text-2xl font-bold mb-4">Mask Required</h2>
          <p>Please select an anonymous mask before entering chat rooms</p>
          <Link href="/mask-selection" className="mt-4 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            Select Mask
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-32 left-1/3 w-40 h-40 bg-indigo-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-bold text-white mb-4">
            Anonymous Chat <span className="text-blue-400">Rooms</span>
          </h1>
          <p className="text-gray-300 text-xl max-w-2xl mx-auto">
            Join conversations as <span className="text-blue-400 font-semibold">{activeMask.name}</span> and 
            connect with others in complete anonymity
          </p>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0"
        >
          <div className="flex items-center space-x-4">
            {/* Room Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Room Types</option>
              <option value="PUBLIC">💬 Public Rooms</option>
              <option value="TRUTH_GAME">🎭 Truth Game</option>
              <option value="DROP_ZONE">📍 Drop Zones</option>
              <option value="ADMIN_CONTROLLED">🔒 Moderated</option>
            </select>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rooms..."
                className="bg-black/30 border border-white/20 rounded-lg px-4 py-2 pl-10 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                🔍
              </div>
            </div>
          </div>

          <div className="text-white">
            <span className="text-gray-400">Showing</span> {filteredRooms.length} <span className="text-gray-400">rooms</span>
          </div>
        </motion.div>

        {/* Rooms Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="ml-3 text-white">Loading chat rooms...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredRooms.map((room, index) => {
                const config = getRoomTypeConfig(room.type);
                const occupancyPercentage = (room.currentUsers / room.maxUsers) * 100;
                
                return (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -20 }}
                    transition={{ 
                      duration: 0.3, 
                      delay: index * 0.1,
                      type: "spring",
                      stiffness: 120
                    }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="group"
                  >
                    <Link href={`/chat/${room.id}`}>
                      <div className={`bg-gradient-to-br ${config.color} rounded-xl p-6 border ${config.borderColor} hover:border-white/50 transition-all duration-300 cursor-pointer relative overflow-hidden`}>
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute top-4 right-4 text-6xl">{config.icon}</div>
                          <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-white/10 blur-xl"></div>
                        </div>

                        {/* Admin Monitoring Badge */}
                        {room.adminMonitored && (
                          <div className="absolute top-3 right-3 bg-orange-600/80 text-white text-xs px-2 py-1 rounded-full">
                            👁️ Monitored
                          </div>
                        )}

                        {/* Room Header */}
                        <div className="relative z-10 mb-4">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="text-3xl">{config.icon}</span>
                            <div>
                              <h3 className="text-xl font-bold text-white group-hover:text-blue-200 transition-colors">
                                {room.name}
                              </h3>
                              <span className={`text-sm ${config.textColor}`}>
                                {room.type.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Room Description */}
                        <div className="relative z-10 mb-4">
                          <p className="text-gray-200 text-sm leading-relaxed">
                            {room.description}
                          </p>
                        </div>

                        {/* Room Stats */}
                        <div className="relative z-10 space-y-3">
                          {/* User Count */}
                          <div className="flex items-center justify-between">
                            <span className="text-gray-300 text-sm">Occupancy</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-black/30 rounded-full h-2">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    occupancyPercentage > 80 ? 'bg-red-500' :
                                    occupancyPercentage > 60 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-white text-sm font-medium">
                                {room.currentUsers}/{room.maxUsers}
                              </span>
                            </div>
                          </div>

                          {/* Last Activity */}
                          <div className="flex items-center justify-between">
                            <span className="text-gray-300 text-sm">Last Activity</span>
                            <span className="text-gray-200 text-sm">
                              {getActivityStatus(room.lastActivity)}
                            </span>
                          </div>

                          {/* Tags */}
                          {room.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {room.tags.slice(0, 3).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="bg-black/20 text-gray-300 text-xs px-2 py-1 rounded-full"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {room.tags.length > 3 && (
                                <span className="text-gray-400 text-xs">+{room.tags.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Join Button */}
                        <div className="relative z-10 mt-4">
                          <div className={`w-full py-2 px-4 rounded-lg text-center font-medium transition-all duration-300 ${
                            room.currentUsers >= room.maxUsers
                              ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                              : 'bg-white/10 text-white group-hover:bg-white/20'
                          }`}>
                            {room.currentUsers >= room.maxUsers ? 'Room Full' : 'Join Room'}
                          </div>
                        </div>

                        {/* Hover Effect */}
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {filteredRooms.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">No rooms found</h3>
            <p className="text-gray-400">Try adjusting your filters or search terms</p>
          </div>
        )}

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="bg-black/30 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{rooms.filter(r => r.type === 'PUBLIC').length}</div>
            <div className="text-gray-300 text-sm">Public Rooms</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{rooms.filter(r => r.type === 'TRUTH_GAME').length}</div>
            <div className="text-gray-300 text-sm">Truth Games</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{rooms.filter(r => r.type === 'DROP_ZONE').length}</div>
            <div className="text-gray-300 text-sm">Drop Zones</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">{rooms.reduce((sum, r) => sum + r.currentUsers, 0)}</div>
            <div className="text-gray-300 text-sm">Active Users</div>
          </div>
        </motion.div>

        {/* Safety Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4 text-center"
        >
          <div className="flex items-center justify-center space-x-2 text-yellow-400 mb-2">
            <span>⚠️</span>
            <span className="font-semibold">Privacy & Safety</span>
          </div>
          <p className="text-yellow-200 text-sm">
            All conversations are anonymous but may be monitored for safety. 
            Respect others and follow community guidelines.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
