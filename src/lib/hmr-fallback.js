// HMR fallback to handle fetch failures gracefully
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalFetch = window.fetch;
  
  window.fetch = function(...args) {
    return originalFetch.apply(this, args).catch(error => {
      // If it's an AbortError (common during HMR), handle gracefully
      if (error.name === 'AbortError' || (error.message && error.message.includes('signal is aborted'))) {
        console.warn('Request aborted (likely due to HMR), continuing:', error.message);
        return Promise.resolve({
          ok: false,
          status: 499,
          statusText: 'Request Aborted',
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(''),
          headers: new Headers(),
          redirected: false,
          type: 'basic',
          url: args[0],
          clone: function() { return this; },
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          blob: () => Promise.resolve(new Blob()),
          formData: () => Promise.resolve(new FormData()),
        });
      }

      // If it's an HMR-related fetch failure or auth API during development, handle it gracefully
      const url = args[0];

      if (typeof url === 'string' && (
        url.includes('/_next/static/') ||
        url.includes('webpack-hmr') ||
        url.includes('hot-update') ||
        (url.includes('/api/auth/') && error.message?.includes('Failed to fetch'))
      )) {
        console.warn('HMR fetch failed, continuing without hot reload:', error.message);

        // Return a mock response to prevent breaking the app
        return Promise.resolve({
          ok: false,
          status: 503,
          statusText: 'Service Temporarily Unavailable',
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(''),
          headers: new Headers(),
          redirected: false,
          type: 'basic',
          url: url,
          clone: function() { return this; },
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          blob: () => Promise.resolve(new Blob()),
          formData: () => Promise.resolve(new FormData()),
        });
      }

      // For non-HMR requests, re-throw the error
      throw error;
    });
  };

  // Also handle webpack HMR errors
  if (typeof __webpack_require__ !== 'undefined' && __webpack_require__.hmrM) {
    const originalHmrM = __webpack_require__.hmrM;
    
    __webpack_require__.hmrM = function() {
      return originalHmrM.apply(this, arguments).catch(error => {
        console.warn('Webpack HMR module fetch failed:', error.message);
        return {}; // Return empty module manifest
      });
    };
  }

  // Handle runtime errors gracefully
  window.addEventListener('error', function(event) {
    if (event.error && event.error.message && 
        event.error.message.includes('Loading CSS chunk')) {
      console.warn('CSS chunk loading failed, continuing:', event.error.message);
      event.preventDefault();
    }
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && (
        (event.reason.message && (
          event.reason.message.includes('Loading chunk') ||
          event.reason.message.includes('Failed to fetch')
        )) ||
        event.reason.name === 'AbortError' ||
        (event.reason.message && event.reason.message.includes('signal is aborted'))
    )) {
      console.warn('HMR/Development related error, continuing:', event.reason.message || event.reason.name);
      event.preventDefault();
    }
  });
}
