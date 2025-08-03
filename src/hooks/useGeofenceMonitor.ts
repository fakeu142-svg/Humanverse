'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocationTracking } from './useLocationTracking';
import { calculateDistance } from '@/lib/geolocation';

interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  alertType: 'ENTRY' | 'EXIT' | 'BOTH';
  isActive: boolean;
}

interface GeofenceEvent {
  id: string;
  geofenceId: string;
  geofenceName: string;
  eventType: 'ENTRY' | 'EXIT';
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
  };
  distance: number;
}

interface GeofenceStatus {
  geofenceId: string;
  isInside: boolean;
  distance: number;
  lastEvent?: GeofenceEvent;
}

export function useGeofenceMonitor() {
  const { currentLocation, isTracking } = useLocationTracking({
    trackingInterval: 10000, // Check every 10 seconds for geofences
    highAccuracy: true
  });

  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [geofenceStatuses, setGeofenceStatuses] = useState<Map<string, GeofenceStatus>>(new Map());
  const [events, setEvents] = useState<GeofenceEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load active geofences
  const loadGeofences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/dropzone/geofences', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to load geofences');
      }

      const data = await response.json();
      setGeofences(data.geofences || []);
    } catch (err: any) {
      console.error('Failed to load geofences:', err);
      setError(err.message || 'Failed to load geofences');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if location is inside geofence
  const isInsideGeofence = useCallback((
    userLat: number, 
    userLng: number, 
    geofence: Geofence
  ): boolean => {
    const distance = calculateDistance(
      userLat, 
      userLng, 
      geofence.latitude, 
      geofence.longitude
    );
    return distance <= geofence.radius;
  }, []);

  // Generate geofence event
  const createGeofenceEvent = useCallback((
    geofence: Geofence,
    eventType: 'ENTRY' | 'EXIT',
    location: { latitude: number; longitude: number }
  ): GeofenceEvent => {
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      geofence.latitude,
      geofence.longitude
    );

    return {
      id: `${geofence.id}-${eventType}-${Date.now()}`,
      geofenceId: geofence.id,
      geofenceName: geofence.name,
      eventType,
      timestamp: new Date(),
      location,
      distance
    };
  }, []);

  // Send geofence event to server
  const sendGeofenceEvent = useCallback(async (event: GeofenceEvent) => {
    try {
      await fetch('/api/dropzone/geofence-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geofenceId: event.geofenceId,
          eventType: event.eventType,
          latitude: event.location.latitude,
          longitude: event.location.longitude,
          timestamp: event.timestamp.toISOString(),
          distance: event.distance
        })
      });
    } catch (err) {
      console.error('Failed to send geofence event:', err);
      // Don't throw - this is background surveillance
    }
  }, []);

  // Process location update against geofences
  const processLocationUpdate = useCallback(async (
    latitude: number, 
    longitude: number
  ) => {
    if (!geofences.length) return;

    const newStatuses = new Map(geofenceStatuses);
    const newEvents: GeofenceEvent[] = [];

    for (const geofence of geofences) {
      if (!geofence.isActive) continue;

      const currentlyInside = isInsideGeofence(latitude, longitude, geofence);
      const previousStatus = geofenceStatuses.get(geofence.id);
      const wasInside = previousStatus?.isInside || false;

      // Update distance regardless
      const distance = calculateDistance(
        latitude, 
        longitude, 
        geofence.latitude, 
        geofence.longitude
      );

      // Check for state changes
      let event: GeofenceEvent | null = null;

      if (!wasInside && currentlyInside) {
        // Entry event
        if (geofence.alertType === 'ENTRY' || geofence.alertType === 'BOTH') {
          event = createGeofenceEvent(geofence, 'ENTRY', { latitude, longitude });
        }
      } else if (wasInside && !currentlyInside) {
        // Exit event
        if (geofence.alertType === 'EXIT' || geofence.alertType === 'BOTH') {
          event = createGeofenceEvent(geofence, 'EXIT', { latitude, longitude });
        }
      }

      // Update status
      newStatuses.set(geofence.id, {
        geofenceId: geofence.id,
        isInside: currentlyInside,
        distance,
        lastEvent: event || previousStatus?.lastEvent
      });

      // Add event if generated
      if (event) {
        newEvents.push(event);
        
        // Send to server asynchronously
        sendGeofenceEvent(event).catch(console.error);
      }
    }

    setGeofenceStatuses(newStatuses);
    
    if (newEvents.length > 0) {
      setEvents(prev => [...prev.slice(-49), ...newEvents]); // Keep last 50 events
    }
  }, [geofences, geofenceStatuses, isInsideGeofence, createGeofenceEvent, sendGeofenceEvent]);

  // Monitor location changes
  useEffect(() => {
    if (currentLocation && isTracking) {
      processLocationUpdate(
        currentLocation.latitude, 
        currentLocation.longitude
      ).catch(console.error);
    }
  }, [currentLocation, isTracking, processLocationUpdate]);

  // Load geofences on mount
  useEffect(() => {
    loadGeofences();
  }, [loadGeofences]);

  // Get geofences user is currently inside
  const getActiveGeofences = useCallback(() => {
    return Array.from(geofenceStatuses.values())
      .filter(status => status.isInside)
      .map(status => {
        const geofence = geofences.find(g => g.id === status.geofenceId);
        return { geofence, status };
      })
      .filter(item => item.geofence);
  }, [geofences, geofenceStatuses]);

  // Get nearby geofences (within 2x radius)
  const getNearbyGeofences = useCallback(() => {
    if (!currentLocation) return [];

    return geofences
      .map(geofence => {
        const status = geofenceStatuses.get(geofence.id);
        const distance = status?.distance || calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          geofence.latitude,
          geofence.longitude
        );

        return {
          geofence,
          distance,
          isNearby: distance <= geofence.radius * 2,
          isInside: status?.isInside || false
        };
      })
      .filter(item => item.isNearby)
      .sort((a, b) => a.distance - b.distance);
  }, [currentLocation, geofences, geofenceStatuses]);

  // Clear event history
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    // State
    geofences,
    geofenceStatuses: Array.from(geofenceStatuses.values()),
    events,
    loading,
    error,

    // Actions
    loadGeofences,
    clearEvents,

    // Computed data
    activeGeofences: getActiveGeofences(),
    nearbyGeofences: getNearbyGeofences(),
    hasActiveGeofences: getActiveGeofences().length > 0,
    totalEvents: events.length,
    recentEvents: events.slice(-10).reverse(),

    // Utilities
    isInsideAnyGeofence: Array.from(geofenceStatuses.values()).some(s => s.isInside),
    nearbyGeofenceCount: getNearbyGeofences().length
  };
}
