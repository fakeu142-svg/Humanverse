'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { toast } from 'react-hot-toast';

interface MaskSurveillanceData {
  activeMasks: Array<{
    id: string;
    name: string;
    type: string;
    userId: string;
    userEmail: string;
    userRiskScore: number;
    createdAt: string;
    expiresAt: string | null;
    streakCount: number;
    isAdminControlled: boolean;
  }>;
  statistics: {
    totalActive: number;
    byType: Array<{ type: string; _count: { type: number }; _avg: { streakCount: number } }>;
    suspicious: number;
  };
  suspiciousMasks: Array<any>;
  recentActivities: Array<any>;
}

export default function MaskSurveillance() {
  const { admin } = useAdminAuth();
  const [data, setData] = useState<MaskSurveillanceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMask, setSelectedMask] = useState<any>(null);
  const [revealResult, setRevealResult] = useState<any>(null);

  const loadSurveillanceData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/masks/control');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        toast.error('Failed to load surveillance data');
      }
    } catch (error) {
      toast.error('Error loading surveillance data');
    } finally {
      setIsLoading(false);
    }
  };

  const revealMaskIdentity = async (maskName: string) => {
    try {
      const response = await fetch('/api/admin/masks/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maskName }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setRevealResult(result);
        toast.success(`Identity revealed: ${result.revelation.userEmail}`);
      } else {
        toast.error(result.error || 'Failed to reveal mask identity');
      }
    } catch (error) {
      toast.error('Error revealing mask identity');
    }
  };

  useEffect(() => {
    loadSurveillanceData();
    // Refresh every 30 seconds
    const interval = setInterval(loadSurveillanceData, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredMasks = data?.activeMasks.filter(mask =>
    mask.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mask.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mask.type.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (!admin?.permissions.surveillance && admin?.role !== 'SUPER_ADMIN') {
    return (
      <div className="bg-danger/10 border border-danger/30 rounded-lg p-6 text-center">
        <h3 className="text-danger font-mono font-bold mb-2">ACCESS DENIED</h3>
        <p className="text-admin-300">Insufficient permissions for mask surveillance</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-mono font-bold text-admin-100 mb-2">
            MASK SURVEILLANCE SYSTEM
          </h2>
          <p className="text-admin-400">Real-time monitoring of all anonymous identities</p>
        </div>
        <button
          onClick={loadSurveillanceData}
          disabled={isLoading}
          className="bg-admin-600 hover:bg-admin-500 disabled:bg-admin-700 text-admin-100 px-4 py-2 rounded font-mono transition-colors duration-200"
        >
          {isLoading ? 'REFRESHING...' : 'REFRESH DATA'}
        </button>
      </div>

      {/* Statistics Dashboard */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-admin rounded-lg p-4 border border-admin-600/30">
            <div className="text-2xl font-mono font-bold text-admin-100">
              {data.statistics.totalActive}
            </div>
            <div className="text-admin-400 text-sm">ACTIVE MASKS</div>
          </div>
          <div className="glass-admin rounded-lg p-4 border border-admin-600/30">
            <div className="text-2xl font-mono font-bold text-warning">
              {data.statistics.suspicious}
            </div>
            <div className="text-admin-400 text-sm">SUSPICIOUS</div>
          </div>
          <div className="glass-admin rounded-lg p-4 border border-admin-600/30">
            <div className="text-2xl font-mono font-bold text-info">
              {data.statistics.byType.length}
            </div>
            <div className="text-admin-400 text-sm">MASK TYPES</div>
          </div>
          <div className="glass-admin rounded-lg p-4 border border-admin-600/30">
            <div className="text-2xl font-mono font-bold text-success">
              {Math.round(data.statistics.byType.reduce((sum, type) => sum + (type._avg.streakCount || 0), 0) / data.statistics.byType.length) || 0}
            </div>
            <div className="text-admin-400 text-sm">AVG STREAK</div>
          </div>
        </div>
      )}

      {/* Search and Controls */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search masks, users, or types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-admin-800 border border-admin-600 rounded text-admin-100 placeholder-admin-500 focus:outline-none focus:ring-2 focus:ring-danger font-mono"
          />
        </div>
      </div>

      {/* Active Masks Table */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-admin-600 border-t-danger rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-admin-400 font-mono">SCANNING ACTIVE MASKS...</p>
        </div>
      ) : (
        <div className="glass-admin rounded-lg border border-admin-600/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-admin-800">
                <tr>
                  <th className="px-4 py-3 text-left text-admin-300 font-mono text-sm">MASK ID</th>
                  <th className="px-4 py-3 text-left text-admin-300 font-mono text-sm">TYPE</th>
                  <th className="px-4 py-3 text-left text-admin-300 font-mono text-sm">USER EMAIL</th>
                  <th className="px-4 py-3 text-left text-admin-300 font-mono text-sm">RISK</th>
                  <th className="px-4 py-3 text-left text-admin-300 font-mono text-sm">STREAK</th>
                  <th className="px-4 py-3 text-left text-admin-300 font-mono text-sm">STATUS</th>
                  <th className="px-4 py-3 text-left text-admin-300 font-mono text-sm">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-700">
                {filteredMasks.map((mask) => (
                  <motion.tr
                    key={mask.id}
                    className="hover:bg-admin-800/50 transition-colors duration-200"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <td className="px-4 py-3">
                      <div className="font-mono text-admin-100 text-sm">
                        {mask.name}
                      </div>
                      <div className="text-admin-500 text-xs">
                        {mask.id.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-admin-700 text-admin-300 rounded text-xs font-mono">
                        {mask.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-admin-100 font-mono text-sm">
                        {mask.userEmail}
                      </div>
                      <div className="text-admin-500 text-xs">
                        ID: {mask.userId.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`text-sm font-mono ${
                        mask.userRiskScore >= 70 ? 'text-danger' :
                        mask.userRiskScore >= 40 ? 'text-warning' : 'text-success'
                      }`}>
                        {mask.userRiskScore}/100
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-admin-100 font-mono text-sm">
                        {mask.streakCount}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {mask.isAdminControlled && (
                          <span className="px-2 py-1 bg-danger/20 text-danger rounded text-xs font-mono">
                            ADMIN
                          </span>
                        )}
                        {mask.expiresAt && new Date(mask.expiresAt) < new Date(Date.now() + 2 * 60 * 60 * 1000) && (
                          <span className="px-2 py-1 bg-warning/20 text-warning rounded text-xs font-mono">
                            EXPIRING
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => revealMaskIdentity(mask.name)}
                          className="text-danger hover:text-danger/80 transition-colors duration-200"
                          title="Reveal Identity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setSelectedMask(mask)}
                          className="text-info hover:text-info/80 transition-colors duration-200"
                          title="View Details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mask Details Modal */}
      <AnimatePresence>
        {selectedMask && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMask(null)}
          >
            <motion.div
              className="bg-admin-900 border border-admin-600 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-mono font-bold text-admin-100">
                  MASK DETAILS: {selectedMask.name}
                </h3>
                <button
                  onClick={() => setSelectedMask(null)}
                  className="text-admin-400 hover:text-admin-200 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-admin-400 text-sm font-mono">MASK TYPE</label>
                    <div className="text-admin-100 font-mono">{selectedMask.type}</div>
                  </div>
                  <div>
                    <label className="text-admin-400 text-sm font-mono">STREAK COUNT</label>
                    <div className="text-admin-100 font-mono">{selectedMask.streakCount}</div>
                  </div>
                  <div>
                    <label className="text-admin-400 text-sm font-mono">USER EMAIL</label>
                    <div className="text-admin-100 font-mono">{selectedMask.userEmail}</div>
                  </div>
                  <div>
                    <label className="text-admin-400 text-sm font-mono">RISK SCORE</label>
                    <div className={`font-mono ${
                      selectedMask.userRiskScore >= 70 ? 'text-danger' :
                      selectedMask.userRiskScore >= 40 ? 'text-warning' : 'text-success'
                    }`}>
                      {selectedMask.userRiskScore}/100
                    </div>
                  </div>
                  <div>
                    <label className="text-admin-400 text-sm font-mono">CREATED</label>
                    <div className="text-admin-100 font-mono text-sm">
                      {new Date(selectedMask.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="text-admin-400 text-sm font-mono">EXPIRES</label>
                    <div className="text-admin-100 font-mono text-sm">
                      {selectedMask.expiresAt ? new Date(selectedMask.expiresAt).toLocaleString() : 'Never'}
                    </div>
                  </div>
                </div>

                {selectedMask.isAdminControlled && (
                  <div className="bg-danger/10 border border-danger/30 rounded p-3">
                    <div className="text-danger font-mono font-bold text-sm">⚠️ ADMIN CONTROLLED MASK</div>
                    <div className="text-admin-300 text-sm">This mask is under administrative control</div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Identity Reveal Modal */}
      <AnimatePresence>
        {revealResult && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRevealResult(null)}
          >
            <motion.div
              className="bg-admin-900 border border-danger rounded-lg p-6 max-w-lg w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-danger/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-mono font-bold text-danger mb-2">
                  IDENTITY REVEALED
                </h3>
                <p className="text-admin-400 text-sm">Surveillance action logged</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-admin-400 font-mono text-sm">MASK:</span>
                  <span className="text-admin-100 font-mono text-sm">{revealResult.maskName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-admin-400 font-mono text-sm">USER:</span>
                  <span className="text-admin-100 font-mono text-sm">{revealResult.revelation.userEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-admin-400 font-mono text-sm">USER ID:</span>
                  <span className="text-admin-100 font-mono text-sm">{revealResult.revelation.userId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-admin-400 font-mono text-sm">REVEALED BY:</span>
                  <span className="text-admin-100 font-mono text-sm">{revealResult.revealedBy.adminEmail}</span>
                </div>
              </div>

              <button
                onClick={() => setRevealResult(null)}
                className="w-full mt-6 bg-danger hover:bg-danger/80 text-white py-3 rounded font-mono font-bold transition-colors duration-200"
              >
                CLOSE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
