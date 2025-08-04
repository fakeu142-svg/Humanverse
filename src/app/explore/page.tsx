'use client';

import React, { useState, useEffect } from 'react';
import { ExploreFeed } from '@/components/explore/ExploreFeed';
import { useAuth } from '@/hooks/useAuth';

export default function ExplorePage() {
  const { user } = useAuth();
  const [backgroundOffset, setBackgroundOffset] = useState(0);

  // Parallax scrolling effect
  useEffect(() => {
    const handleScroll = () => {
      setBackgroundOffset(window.pageYOffset * 0.5);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Show demo content for unauthenticated users
  const isDemo = !user;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Background */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          transform: `translateY(${backgroundOffset}px)`,
          background: `
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(120, 200, 255, 0.1) 0%, transparent 50%),
            linear-gradient(135deg, #000000 0%, #0a0a0a 100%)
          `
        }}
      >
        {/* Floating particles */}
        <div className="absolute inset-0">
          {Array.from({ length: 50 }, (_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-red-500 rounded-full opacity-20 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Demo Banner */}
      {isDemo && (
        <div className="relative z-20 bg-gradient-to-r from-red-600 to-purple-600 text-white py-3">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-sm md:text-base">
              🎭 <strong>Demo Mode</strong> - Experiencing Humanverse as a guest.
              <a href="/register" className="underline ml-2 hover:text-yellow-300">Create account</a> or
              <a href="/login" className="underline ml-1 hover:text-yellow-300">login</a> for full access.
            </p>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative z-10 pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-block mb-8">
            <div className="text-8xl mb-4 animate-pulse">🌌</div>
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-red-400 via-purple-500 to-blue-500 bg-clip-text text-transparent mb-4">
              EXPLORE
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Dive into the depths of human consciousness across the Humanverse platform
            </p>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-red-900/30 rounded-lg p-6 hover:border-red-500/50 transition-colors">
              <div className="text-3xl mb-3">💬</div>
              <h3 className="text-lg font-semibold text-white mb-2">Chat Messages</h3>
              <p className="text-gray-400 text-sm">
                Real conversations from masked users across public rooms
              </p>
            </div>
            
            <div className="bg-gray-900/50 backdrop-blur-sm border border-purple-900/30 rounded-lg p-6 hover:border-purple-500/50 transition-colors">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-lg font-semibold text-white mb-2">Truth Answers</h3>
              <p className="text-gray-400 text-sm">
                Anonymous responses to life's most pressing questions
              </p>
            </div>
            
            <div className="bg-gray-900/50 backdrop-blur-sm border border-orange-900/30 rounded-lg p-6 hover:border-orange-500/50 transition-colors">
              <div className="text-3xl mb-3">🗝️</div>
              <h3 className="text-lg font-semibold text-white mb-2">DropZone Secrets</h3>
              <p className="text-gray-400 text-sm">
                Location-based secrets unlocked through proximity
              </p>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="animate-bounce">
            <div className="w-6 h-10 border-2 border-gray-400 rounded-full mx-auto">
              <div className="w-1 h-3 bg-gray-400 rounded-full mx-auto mt-2 animate-pulse"></div>
            </div>
            <p className="text-gray-500 text-sm mt-2">Scroll to explore</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        <ExploreFeed
          showFilterPanel={!isDemo}
          showTrendingBar={true}
          showAdminData={false}
          demoMode={isDemo}
          className="bg-black/80 backdrop-blur-sm"
        />
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="bg-red-600 hover:bg-red-700 text-white w-12 h-12 rounded-full 
                   shadow-lg hover:shadow-xl transition-all duration-200 
                   flex items-center justify-center group"
        >
          <span className="transform group-hover:-translate-y-1 transition-transform">
            ↑
          </span>
        </button>
      </div>

      {/* Bottom gradient fade */}
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none z-20" />

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.5); }
          50% { box-shadow: 0 0 40px rgba(239, 68, 68, 0.8); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-glow {
          animation: glow 3s ease-in-out infinite;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #1a1a1a;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #ef4444;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #dc2626;
        }

        /* Smooth scroll behavior */
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}
