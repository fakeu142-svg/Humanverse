// Protect original fetch from third-party overrides
if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
  // Store the original fetch before any third-party scripts can override it
  if (!window.__originalFetch) {
    window.__originalFetch = window.fetch.bind(window);
  }
  
  // Also protect against FullStory and other analytics that might interfere
  const originalFetch = window.__originalFetch;
  
  // Create a protected fetch that falls back gracefully
  window.__protectedFetch = function(url, options) {
    try {
      return originalFetch(url, options);
    } catch (error) {
      console.warn('Protected fetch failed, returning mock response:', error.message);
      return Promise.resolve({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: () => Promise.resolve({ error: 'Service unavailable' }),
        text: () => Promise.resolve(''),
        headers: new Headers(),
      });
    }
  };
}
