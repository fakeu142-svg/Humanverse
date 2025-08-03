'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-desert-900 flex items-center justify-center">
        <div className="animate-pulse text-desert-300 font-display text-2xl">
          Loading Humanverse...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-desert-900 via-desert-800 to-desert-950">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="h-full w-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNEQUE1MjAiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="pt-8 pb-4">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h1 className="font-display text-6xl md:text-8xl font-bold text-desert-300 mb-4">
                Humanverse
              </h1>
              <p className="text-desert-400 text-xl md:text-2xl font-light max-w-2xl mx-auto">
                Where anonymity meets authenticity
              </p>
            </motion.div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mb-12"
            >
              <h2 className="font-display text-3xl md:text-4xl font-semibold text-desert-200 mb-6">
                Choose Your Mask. Find Your Truth.
              </h2>
              <p className="text-desert-300 text-lg leading-relaxed max-w-3xl mx-auto">
                In the Humanverse, you are not defined by your name or face. 
                You are the essence of your thoughts, the depth of your stories, 
                and the authenticity of your connections.
              </p>
            </motion.div>

            {/* Feature Cards */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid md:grid-cols-3 gap-8 mb-12"
            >
              <div className="glass-desert rounded-lg p-6 hover:bg-desert-700/30 transition-all duration-300">
                <div className="w-12 h-12 bg-mask-ashfox rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-desert-100 text-xl">🦊</span>
                </div>
                <h3 className="font-display text-xl font-semibold text-desert-200 mb-3">
                  Anonymous Masks
                </h3>
                <p className="text-desert-400 text-sm">
                  Express yourself through carefully crafted anonymous personas
                </p>
              </div>

              <div className="glass-desert rounded-lg p-6 hover:bg-desert-700/30 transition-all duration-300">
                <div className="w-12 h-12 bg-mask-violetcrow rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-desert-100 text-xl">🎭</span>
                </div>
                <h3 className="font-display text-xl font-semibold text-desert-200 mb-3">
                  Truth Games
                </h3>
                <p className="text-desert-400 text-sm">
                  Challenge perceptions and discover authentic connections
                </p>
              </div>

              <div className="glass-desert rounded-lg p-6 hover:bg-desert-700/30 transition-all duration-300">
                <div className="w-12 h-12 bg-mask-echodust rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-desert-100 text-xl">📍</span>
                </div>
                <h3 className="font-display text-xl font-semibold text-desert-200 mb-3">
                  Secret Drops
                </h3>
                <p className="text-desert-400 text-sm">
                  Share location-based secrets and discoveries
                </p>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link href="/auth/register">
                <button className="bg-desert-500 hover:bg-desert-400 text-desert-100 font-semibold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg">
                  Enter the Verse
                </button>
              </Link>
              
              <Link href="/auth/login">
                <button className="border border-desert-500 hover:bg-desert-500/20 text-desert-300 hover:text-desert-100 font-semibold py-4 px-8 rounded-lg transition-all duration-300">
                  Return to Your Mask
                </button>
              </Link>
            </motion.div>

            {/* Admin Portal Link (Hidden) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 2 }}
              className="mt-16"
            >
              <Link href="/admin/soulgate" className="text-desert-600 hover:text-desert-500 text-xs transition-colors duration-300">
                ⚡
              </Link>
            </motion.div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-8 border-t border-desert-700/50">
          <div className="container mx-auto px-6 text-center">
            <p className="text-desert-500 text-sm">
              © 2024 Humanverse. All rights reserved. 
              <span className="ml-4 text-desert-600">Built for authentic connections.</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
