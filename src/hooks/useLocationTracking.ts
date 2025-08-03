'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCurrentLocation } from '@/lib/geolocation';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  city: string;
  region: string;
  country: string;
  timestamp: Date;
}

interface LocationTrackingOptions {
  highAccuracy?: boolean;
  trackingInterval?: number; // milliseconds
  maxAge?: number; // milliseconds
  timeout?: number; // milliseconds
  enableBackground?: boolean;
}

export function useLocationTracking(options: LocationTrackingOptions = {}) {
  const {
    highAccuracy = true,
    trackingInterval = 30000, // 30 seconds
    maxAge = 60000, // 1 minute
    timeout = 10000, // 10 seconds
    enableBackground = false
  } = options;

  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'checking'>('checking');

  // Check geolocation permission
  const checkPermission = useCallback(async () => {
    try {
      if (!navigator.geolocation) {
        setError('Geolocation not supported');
        setPermissionStatus('denied');
        return false;
      }

      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionStatus(permission.state);
        return permission.state === 'granted';
      }

      // Fallback for browsers without permissions API
      setPermissionStatus('prompt');
      return true;
    } catch (err) {
      console.error('Permission check failed:', err);
      setPermissionStatus('prompt');
      return true;
    }
  }, []);

  // Get single location update
  const updateLocation = useCallback(async () => {
    try {
      setError(null);
      const location = await getCurrentLocation(highAccuracy);
      
      const locationData: LocationData = {
        ...location,
        timestamp: new Date()
      };

      setCurrentLocation(locationData);
      setLocationHistory(prev => [...prev.slice(-99), locationData]); // Keep last 100 locations

      // Send to server for surveillance tracking
      try {
        await fetch('/api/dropzone/track-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            city: location.city,
            region: location.region,
            country: location.country,
            timestamp: new Date().toISOString()
          })
        });
      } catch (serverError) {
        // Don't show server errors to user, but log for admin surveillance
        console.warn('Location tracking upload failed:', serverError);
      }

      return locationData;
    } catch (err: any) {
      console.error('Location update failed:', err);
      setError(err.message || 'Failed to get location');
      throw err;
    }
  }, [highAccuracy]);

  // Start continuous tracking
  const startTracking = useCallback(async () => {
    try {
      const hasPermission = await checkPermission();
      if (!hasPermission && permissionStatus === 'denied') {
        setError('Location permission denied');
        return false;
      }

      setIsTracking(true);
      setError(null);

      // Get initial location
      await updateLocation();

      return true;
    } catch (err: any) {
      console.error('Failed to start tracking:', err);
      setError(err.message || 'Failed to start location tracking');
      setIsTracking(false);
      return false;
    }
  }, [checkPermission, permissionStatus, updateLocation]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  // Clear location history
  const clearHistory = useCallback(() => {
    setLocationHistory([]);
  }, []);

  // Request permission
  const requestPermission = useCallback(async () => {
    try {
      await updateLocation(); // This will trigger permission request
      await checkPermission();
      return true;
    } catch (err) {
      await checkPermission();
      return false;
    }
  }, [updateLocation, checkPermission]);

  // Setup tracking interval
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isTracking) {
      intervalId = setInterval(() => {
        updateLocation().catch(err => {
          console.error('Tracking update failed:', err);
          // Don't stop tracking on single failures
        });
      }, trackingInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isTracking, trackingInterval, updateLocation]);

  // Background tracking (when page is not visible)
  useEffect(() => {
    if (!enableBackground || !isTracking) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, reduce tracking frequency
        console.log('Background tracking mode');
      } else {
        // Page is visible, resume normal tracking
        console.log('Foreground tracking mode');
        updateLocation().catch(console.error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enableBackground, isTracking, updateLocation]);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    // Current state
    currentLocation,
    locationHistory,
    isTracking,
    error,
    permissionStatus,

    // Actions
    startTracking,
    stopTracking,
    updateLocation,
    clearHistory,
    requestPermission,

    // Utilities
    hasLocation: !!currentLocation,
    hasPermission: permissionStatus === 'granted',
    needsPermission: permissionStatus === 'prompt',
    permissionDenied: permissionStatus === 'denied',
    trackingSupported: !!navigator.geolocation
  };
}
