import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { db } from '@/lib/db';
import { createGeofence, updateGeofence, deleteGeofence, triggerGeofenceAlert } from '@/lib/locationSurveillance';

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminAuth(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'create_geofence':
        return await handleCreateGeofence(admin.id, params);
      case 'update_geofence':
        return await handleUpdateGeofence(admin.id, params);
      case 'delete_geofence':
        return await handleDeleteGeofence(admin.id, params);
      case 'trigger_alert':
        return await handleTriggerAlert(admin.id, params);
      case 'list_geofences':
        return await handleListGeofences(admin.id, params);
      case 'geofence_alerts':
        return await handleGeofenceAlerts(admin.id, params);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin geofence API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleCreateGeofence(adminId: string, params: any) {
  const { name, description, latitude, longitude, radius, alertType, isActive = true } = params;

  if (!name || !latitude || !longitude || !radius) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const geofence = await createGeofence({
    name,
    description,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    radius: parseFloat(radius),
    alertType: alertType || 'ENTRY',
    isActive,
    createdByAdminId: adminId
  });

  // Log surveillance operation
  await db.locationSurveillanceOp.create({
    data: {
      adminId,
      operationType: 'GEOFENCE_CREATE',
      targetUserId: null,
      details: {
        geofenceId: geofence.id,
        name,
        coordinates: { latitude, longitude },
        radius
      },
      timestamp: new Date()
    }
  });

  return NextResponse.json({
    success: true,
    geofence: {
      id: geofence.id,
      name: geofence.name,
      description: geofence.description,
      latitude: geofence.latitude,
      longitude: geofence.longitude,
      radius: geofence.radius,
      alertType: geofence.alertType,
      isActive: geofence.isActive,
      createdAt: geofence.createdAt
    }
  });
}

async function handleUpdateGeofence(adminId: string, params: any) {
  const { geofenceId, updates } = params;

  if (!geofenceId) {
    return NextResponse.json({ error: 'Geofence ID required' }, { status: 400 });
  }

  const geofence = await updateGeofence(geofenceId, updates);

  // Log surveillance operation
  await db.locationSurveillanceOp.create({
    data: {
      adminId,
      operationType: 'GEOFENCE_UPDATE',
      targetUserId: null,
      details: {
        geofenceId,
        updates
      },
      timestamp: new Date()
    }
  });

  return NextResponse.json({
    success: true,
    geofence
  });
}

async function handleDeleteGeofence(adminId: string, params: any) {
  const { geofenceId } = params;

  if (!geofenceId) {
    return NextResponse.json({ error: 'Geofence ID required' }, { status: 400 });
  }

  await deleteGeofence(geofenceId);

  // Log surveillance operation
  await db.locationSurveillanceOp.create({
    data: {
      adminId,
      operationType: 'GEOFENCE_DELETE',
      targetUserId: null,
      details: {
        geofenceId
      },
      timestamp: new Date()
    }
  });

  return NextResponse.json({
    success: true,
    message: 'Geofence deleted successfully'
  });
}

async function handleTriggerAlert(adminId: string, params: any) {
  const { geofenceId, userId, eventType } = params;

  if (!geofenceId || !userId || !eventType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const alert = await triggerGeofenceAlert(geofenceId, userId, eventType);

  return NextResponse.json({
    success: true,
    alert
  });
}

async function handleListGeofences(adminId: string, params: any) {
  const { includeInactive = false, limit = 50, offset = 0 } = params;

  const geofences = await db.geofence.findMany({
    where: includeInactive ? {} : { isActive: true },
    take: parseInt(limit),
    skip: parseInt(offset),
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          alerts: true
        }
      }
    }
  });

  return NextResponse.json({
    success: true,
    geofences: geofences.map(g => ({
      id: g.id,
      name: g.name,
      description: g.description,
      latitude: g.latitude,
      longitude: g.longitude,
      radius: g.radius,
      alertType: g.alertType,
      isActive: g.isActive,
      createdAt: g.createdAt,
      alertCount: g._count.alerts
    }))
  });
}

async function handleGeofenceAlerts(adminId: string, params: any) {
  const { geofenceId, startDate, endDate, eventType, limit = 100, offset = 0 } = params;

  const whereClause: any = {};
  
  if (geofenceId) whereClause.geofenceId = geofenceId;
  if (eventType) whereClause.eventType = eventType;
  if (startDate || endDate) {
    whereClause.timestamp = {};
    if (startDate) whereClause.timestamp.gte = new Date(startDate);
    if (endDate) whereClause.timestamp.lte = new Date(endDate);
  }

  const alerts = await db.geofenceAlert.findMany({
    where: whereClause,
    take: parseInt(limit),
    skip: parseInt(offset),
    orderBy: { timestamp: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true
        }
      },
      geofence: {
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          radius: true
        }
      }
    }
  });

  // Log surveillance operation
  await db.locationSurveillanceOp.create({
    data: {
      adminId,
      operationType: 'GEOFENCE_ALERT_QUERY',
      targetUserId: null,
      details: {
        filters: { geofenceId, startDate, endDate, eventType },
        resultCount: alerts.length
      },
      timestamp: new Date()
    }
  });

  return NextResponse.json({
    success: true,
    alerts: alerts.map(alert => ({
      id: alert.id,
      eventType: alert.eventType,
      timestamp: alert.timestamp,
      latitude: alert.latitude,
      longitude: alert.longitude,
      user: {
        id: alert.user.id,
        username: alert.user.username,
        email: alert.user.email
      },
      geofence: {
        id: alert.geofence.id,
        name: alert.geofence.name,
        center: {
          latitude: alert.geofence.latitude,
          longitude: alert.geofence.longitude
        },
        radius: alert.geofence.radius
      },
      metadata: alert.metadata
    }))
  });
}
