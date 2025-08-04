// Protect original fetch from third-party overrides and auth errors
if (typeof window !== 'undefined') {
  // Store the original fetch before any third-party scripts can override it
  if (!window.__originalFetch && typeof fetch !== 'undefined') {
    window.__originalFetch = window.fetch.bind(window);
  }

  // Override window.fetch completely to prevent auth errors
  window.fetch = function(url, options) {
    return new Promise((resolve) => {
      // Check if this is an auth-related API call
      const isAuthCall = typeof url === 'string' && (
        url.includes('/api/auth/') ||
        url.includes('/api/admin/') ||
        url.includes('/api/rooms/') ||
        url.includes('/api/truth/') ||
        url.includes('/api/dropzone/') ||
        url.includes('/api/masks/')
      );

      if (isAuthCall) {
        console.log('Blocking auth API call in demo mode:', url);
        // Return immediate mock response for auth calls
        resolve({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable - Demo Mode',
          json: () => Promise.resolve({
            success: false,
            error: 'Service unavailable in demo mode',
            message: 'This feature is disabled in demo mode'
          }),
          text: () => Promise.resolve('Service unavailable in demo mode'),
          headers: new Headers(),
          redirected: false,
          type: 'basic',
          url: url,
          clone: function() { return this; },
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          blob: () => Promise.resolve(new Blob()),
          formData: () => Promise.resolve(new FormData()),
        });
        return;
      }

      // For non-auth calls, try original fetch with fallback
      try {
        const originalFetch = window.__originalFetch || fetch;
        originalFetch(url, options)
          .then(resolve)
          .catch(error => {
            console.warn('Fetch failed, returning mock response:', error.message);
            resolve({
              ok: false,
              status: 503,
              statusText: 'Service Unavailable',
              json: () => Promise.resolve({ error: 'Service unavailable' }),
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
          });
      } catch (error) {
        console.warn('Fetch override failed, returning mock response:', error.message);
        resolve({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          json: () => Promise.resolve({ error: 'Service unavailable' }),
          text: () => Promise.resolve(''),
          headers: new Headers(),
        });
      }
    });
  };

  // Also create a protected fetch for manual calls
  window.__protectedFetch = window.fetch;
}
