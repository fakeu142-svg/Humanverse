'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { toast } from 'react-hot-toast';
import { MaskType } from '@prisma/client';

const MASK_TYPES = [
  { type: 'ASH_FOX', name: 'Ash Fox', icon: '🦊' },
  { type: 'VIOLET_CROW', name: 'Violet Crow', icon: '🐦‍⬛' },
  { type: 'ECHO_DUST', name: 'Echo Dust', icon: '💫' },
  { type: 'IRON_SAGE', name: 'Iron Sage', icon: '⚔️' },
  { type: 'GHOST_WIND', name: 'Ghost Wind', icon: '🌪️' },
];

interface FakeUser {
  email: string;
  password: string;
  maskType: MaskType;
  purpose: string;
}

export default function FakeMaskCreator() {
  const { admin } = useAdminAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [fakeUsers, setFakeUsers] = useState<FakeUser[]>([]);
  const [currentUser, setCurrentUser] = useState<Partial<FakeUser>>({
    email: '',
    password: '',
    maskType: 'ASH_FOX' as MaskType,
    purpose: '',
  });
  const [createdMasks, setCreatedMasks] = useState<any[]>([]);

  const generateRandomUser = () => {
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'protonmail.com'];
    const names = ['alex', 'jordan', 'casey', 'riley', 'morgan', 'sage', 'phoenix', 'raven'];
    const numbers = Math.floor(Math.random() * 9999);
    
    const email = `${names[Math.floor(Math.random() * names.length)]}${numbers}@${domains[Math.floor(Math.random() * domains.length)]}`;
    const password = `FakeUser${numbers}!`;
    const maskType = MASK_TYPES[Math.floor(Math.random() * MASK_TYPES.length)].type as MaskType;
    
    setCurrentUser({
      email,
      password,
      maskType,
      purpose: 'Surveillance infiltration',
    });
  };

  const addToQueue = () => {
    if (!currentUser.email || !currentUser.password || !currentUser.maskType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setFakeUsers([...fakeUsers, currentUser as FakeUser]);
    setCurrentUser({
      email: '',
      password: '',
      maskType: 'ASH_FOX' as MaskType,
      purpose: '',
    });
    toast.success('Fake user added to creation queue');
  };

  const removeFromQueue = (index: number) => {
    setFakeUsers(fakeUsers.filter((_, i) => i !== index));
  };

  const createFakeUsers = async () => {
    if (fakeUsers.length === 0) {
      toast.error('No fake users in queue');
      return;
    }

    setIsCreating(true);
    const results = [];

    try {
      for (const fakeUser of fakeUsers) {
        // First create the user account
        const registerResponse = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: fakeUser.email,
            password: fakeUser.password,
          }),
        });

        if (!registerResponse.ok) {
          console.error(`Failed to create user: ${fakeUser.email}`);
          continue;
        }

        const userData = await registerResponse.json();
        
        // Then create a fake mask for this user
        const maskResponse = await fetch('/api/admin/masks/control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'CREATE_FAKE_MASK',
            targetUserId: userData.user.id,
            maskType: fakeUser.maskType,
          }),
        });

        if (maskResponse.ok) {
          const maskData = await maskResponse.json();
          results.push({
            email: fakeUser.email,
            maskName: maskData.mask.name,
            maskType: maskData.mask.type,
            purpose: fakeUser.purpose,
            userId: userData.user.id,
            created: true,
          });
        } else {
          results.push({
            email: fakeUser.email,
            purpose: fakeUser.purpose,
            created: false,
            error: 'Failed to create mask',
          });
        }
      }

      setCreatedMasks([...createdMasks, ...results]);
      setFakeUsers([]);
      toast.success(`Created ${results.filter(r => r.created).length} fake infiltration accounts`);

    } catch (error) {
      toast.error('Error creating fake users');
    } finally {
      setIsCreating(false);
    }
  };

  if (!admin?.permissions.impersonation && admin?.role !== 'SUPER_ADMIN') {
    return (
      <div className="bg-danger/10 border border-danger/30 rounded-lg p-6 text-center">
        <h3 className="text-danger font-mono font-bold mb-2">ACCESS DENIED</h3>
        <p className="text-admin-300">Insufficient permissions for fake mask creation</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-danger/10 border border-danger/30 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-danger/20 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-mono font-bold text-danger">
              FAKE MASK CREATOR
            </h2>
            <p className="text-admin-400 text-sm">
              Create infiltration accounts with believable masks for surveillance operations
            </p>
          </div>
        </div>
      </div>

      {/* Fake User Creation Form */}
      <div className="glass-admin rounded-lg p-6 border border-admin-600/30">
        <h3 className="text-lg font-mono font-bold text-admin-100 mb-4">
          CREATE INFILTRATION ACCOUNT
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-admin-300 text-sm font-mono mb-2">
              FAKE EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={currentUser.email || ''}
              onChange={(e) => setCurrentUser({ ...currentUser, email: e.target.value })}
              className="w-full px-3 py-2 bg-admin-800 border border-admin-600 rounded text-admin-100 font-mono focus:outline-none focus:ring-2 focus:ring-danger"
              placeholder="fake.user@example.com"
            />
          </div>

          <div>
            <label className="block text-admin-300 text-sm font-mono mb-2">
              PASSWORD
            </label>
            <input
              type="password"
              value={currentUser.password || ''}
              onChange={(e) => setCurrentUser({ ...currentUser, password: e.target.value })}
              className="w-full px-3 py-2 bg-admin-800 border border-admin-600 rounded text-admin-100 font-mono focus:outline-none focus:ring-2 focus:ring-danger"
              placeholder="Secure password"
            />
          </div>

          <div>
            <label className="block text-admin-300 text-sm font-mono mb-2">
              MASK TYPE
            </label>
            <select
              value={currentUser.maskType || 'ASH_FOX'}
              onChange={(e) => setCurrentUser({ ...currentUser, maskType: e.target.value as MaskType })}
              className="w-full px-3 py-2 bg-admin-800 border border-admin-600 rounded text-admin-100 font-mono focus:outline-none focus:ring-2 focus:ring-danger"
            >
              {MASK_TYPES.map((type) => (
                <option key={type.type} value={type.type}>
                  {type.icon} {type.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-admin-300 text-sm font-mono mb-2">
              OPERATION PURPOSE
            </label>
            <input
              type="text"
              value={currentUser.purpose || ''}
              onChange={(e) => setCurrentUser({ ...currentUser, purpose: e.target.value })}
              className="w-full px-3 py-2 bg-admin-800 border border-admin-600 rounded text-admin-100 font-mono focus:outline-none focus:ring-2 focus:ring-danger"
              placeholder="Surveillance infiltration"
            />
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={generateRandomUser}
            className="bg-admin-600 hover:bg-admin-500 text-admin-100 px-4 py-2 rounded font-mono transition-colors duration-200"
          >
            GENERATE RANDOM
          </button>
          <button
            onClick={addToQueue}
            className="bg-warning hover:bg-warning/80 text-black px-4 py-2 rounded font-mono font-bold transition-colors duration-200"
          >
            ADD TO QUEUE
          </button>
        </div>
      </div>

      {/* Creation Queue */}
      {fakeUsers.length > 0 && (
        <div className="glass-admin rounded-lg p-6 border border-admin-600/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-mono font-bold text-admin-100">
              CREATION QUEUE ({fakeUsers.length})
            </h3>
            <button
              onClick={createFakeUsers}
              disabled={isCreating}
              className="bg-danger hover:bg-danger/80 disabled:bg-danger/50 text-white px-6 py-2 rounded font-mono font-bold transition-colors duration-200"
            >
              {isCreating ? 'CREATING...' : 'CREATE ALL ACCOUNTS'}
            </button>
          </div>

          <div className="space-y-3">
            {fakeUsers.map((user, index) => (
              <motion.div
                key={index}
                className="flex items-center justify-between p-3 bg-admin-800/50 rounded border border-admin-700"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center space-x-4">
                  <div className="text-xl">
                    {MASK_TYPES.find(t => t.type === user.maskType)?.icon}
                  </div>
                  <div>
                    <div className="text-admin-100 font-mono text-sm">{user.email}</div>
                    <div className="text-admin-400 font-mono text-xs">
                      {MASK_TYPES.find(t => t.type === user.maskType)?.name} • {user.purpose}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeFromQueue(index)}
                  className="text-danger hover:text-danger/80 transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Created Accounts */}
      {createdMasks.length > 0 && (
        <div className="glass-admin rounded-lg p-6 border border-admin-600/30">
          <h3 className="text-lg font-mono font-bold text-admin-100 mb-4">
            CREATED INFILTRATION ACCOUNTS ({createdMasks.length})
          </h3>

          <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-admin">
            {createdMasks.map((account, index) => (
              <motion.div
                key={index}
                className={`p-3 rounded border ${
                  account.created 
                    ? 'bg-success/10 border-success/30' 
                    : 'bg-danger/10 border-danger/30'
                }`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-mono text-sm ${
                      account.created ? 'text-success' : 'text-danger'
                    }`}>
                      {account.email}
                    </div>
                    {account.created ? (
                      <div className="text-admin-400 font-mono text-xs">
                        Mask: {account.maskName} ({account.maskType}) • {account.purpose}
                      </div>
                    ) : (
                      <div className="text-danger font-mono text-xs">
                        {account.error}
                      </div>
                    )}
                  </div>
                  <div className={`text-2xl ${
                    account.created ? 'text-success' : 'text-danger'
                  }`}>
                    {account.created ? '✅' : '❌'}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Warning Notice */}
      <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h4 className="text-warning font-mono font-bold text-sm mb-1">
              OPERATIONAL SECURITY WARNING
            </h4>
            <ul className="text-admin-300 text-sm space-y-1">
              <li>• All fake accounts are logged and tracked in surveillance systems</li>
              <li>• Created masks are marked as admin-controlled for identification</li>
              <li>• Use these accounts responsibly for legitimate surveillance operations only</li>
              <li>• Maintain operational security when interacting with real users</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
