/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix HMR issues in development
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Configure HMR to handle network errors gracefully
      config.devtool = 'eval-source-map';
      
      // Add fallback for failed fetch requests
      const originalEntry = config.entry;
      config.entry = async () => {
        const entries = await originalEntry();
        
        if (entries['main.js'] && !entries['main.js'].includes('./src/lib/hmr-fallback.js')) {
          entries['main.js'].unshift('./src/lib/hmr-fallback.js');
        }
        
        return entries;
      };
    }
    
    return config;
  },
  
  // Improve development server stability
  experimental: {
    // Enable SWC minification for better performance
    swcMinify: true,
  },
  
  // Configure headers for better CORS handling
  async headers() {
    return [
      {
        source: '/_next/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Configure rewrites for API routes
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
