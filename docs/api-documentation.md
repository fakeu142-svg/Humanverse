# Humanverse API Documentation

## Overview

The Humanverse API provides comprehensive endpoints for the anonymous social platform with advanced surveillance capabilities. All endpoints require proper authentication and authorization.

### Base URL
```
Production: https://api.humanverse.com
Development: http://localhost:3000/api
```

### Authentication
Most endpoints require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

Admin endpoints require additional admin authentication:
```
Authorization: Bearer <admin_jwt_token>
```

---

## Public Authentication APIs

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "uniqueusername",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "username": "uniqueusername",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /api/auth/login
Authenticate existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "username": "uniqueusername"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### GET /api/auth/me
Get current user information.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "username": "uniqueusername",
    "currentMask": {
      "id": "mask_456",
      "name": "Anonymous Wanderer",
      "expiresAt": "2024-01-01T01:00:00Z"
    }
  }
}
```

---

## Mask Management APIs

### GET /api/masks/available
Get available masks for selection.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "masks": [
    {
      "id": "mask_1",
      "name": "Shadow Walker",
      "description": "A mysterious figure in the night",
      "rarity": "common",
      "duration": 3600,
      "price": 0
    }
  ]
}
```

### POST /api/masks/create
Create a new mask (premium feature).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Custom Mask Name",
  "description": "Custom mask description",
  "duration": 7200,
  "customization": {
    "color": "#FF5733",
    "style": "futuristic"
  }
}
```

---

## Chat & Messaging APIs

### GET /api/rooms/list
Get available chat rooms.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page (max 50)
- `category` (optional): Filter by room category

**Response:**
```json
{
  "success": true,
  "rooms": [
    {
      "id": "room_123",
      "name": "General Discussion",
      "description": "Open discussion for all topics",
      "participantCount": 42,
      "category": "general",
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "hasNext": true
  }
}
```

### POST /api/rooms/[roomId]/join
Join a specific chat room.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "room": {
    "id": "room_123",
    "name": "General Discussion",
    "welcomeMessage": "Welcome to the discussion!"
  }
}
```

### GET /api/rooms/[roomId]/messages
Get messages from a chat room.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `before` (optional): Get messages before this timestamp
- `limit` (optional): Number of messages (max 100)

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg_789",
      "content": "Hello everyone!",
      "maskName": "Anonymous Wanderer",
      "timestamp": "2024-01-01T00:30:00Z",
      "reactions": {
        "👍": 5,
        "❤️": 2
      }
    }
  ]
}
```

---

## Truth or Dare APIs

### GET /api/truth/questions
Get available truth questions.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `category` (optional): Filter by category
- `difficulty` (optional): Filter by difficulty level

**Response:**
```json
{
  "success": true,
  "questions": [
    {
      "id": "question_123",
      "question": "What is your biggest fear?",
      "category": "personal",
      "difficulty": "medium",
      "anonymous": true
    }
  ]
}
```

### POST /api/truth/answer
Submit an answer to a truth question.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "questionId": "question_123",
  "answer": "My biggest fear is public speaking",
  "isAnonymous": true
}
```

**Response:**
```json
{
  "success": true,
  "answerId": "answer_456",
  "points": 10
}
```

---

## Location & Dropzone APIs

### POST /api/dropzone/track-location
Update user location for dropzone features.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "accuracy": 10
}
```

**Response:**
```json
{
  "success": true,
  "nearbySecrets": 3,
  "geofenceAlerts": []
}
```

### POST /api/dropzone/create
Create a new secret drop at current location.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "content": "This is a secret message!",
  "type": "text",
  "radius": 100,
  "duration": 86400
}
```

### GET /api/dropzone/nearby
Get nearby secret drops.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `radius` (optional): Search radius in meters (max 1000)

---

## Admin Surveillance APIs

⚠️ **WARNING: These endpoints are for authorized surveillance operations only**

### POST /api/admin/auth
Admin authentication endpoint.

**Request Body:**
```json
{
  "username": "admin_user",
  "password": "admin_password",
  "twoFactorCode": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "admin": {
    "id": "admin_123",
    "username": "admin_user",
    "role": "super_admin",
    "permissions": ["surveillance", "user_management", "data_access"]
  },
  "token": "admin_jwt_token"
}
```

### GET /api/admin/surveillance/users
Get surveillance data for all users.

**Headers:** `Authorization: Bearer <admin_token>`

**Query Parameters:**
- `riskLevel` (optional): Filter by risk level
- `timeRange` (optional): Time range for data
- `limit` (optional): Number of results

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "userId": "user_123",
      "riskScore": 75,
      "lastActivity": "2024-01-01T00:30:00Z",
      "flaggedActivities": 3,
      "location": {
        "latitude": 40.7128,
        "longitude": -74.0060,
        "address": "New York, NY"
      },
      "psychProfile": {
        "personalityType": "ENFP",
        "riskFactors": ["impulsive", "trust_issues"]
      }
    }
  ]
}
```

### POST /api/admin/surveillance/intercept
Intercept and analyze user communications.

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "userId": "user_123",
  "messageId": "msg_456",
  "action": "monitor"
}
```

### POST /api/admin/users/impersonate
Start user impersonation session.

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "targetUserId": "user_123",
  "method": "credential",
  "duration": 3600
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "impersonation_789",
  "accessToken": "impersonation_jwt_token",
  "expiresAt": "2024-01-01T01:00:00Z"
}
```

### POST /api/admin/fake-users/deploy
Deploy a fake user for infiltration.

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "personality": "friendly_college_student",
  "mission": {
    "type": "information_gathering",
    "target": "user_123",
    "objective": "Extract personal information through casual conversation"
  },
  "profile": {
    "name": "Sarah Johnson",
    "age": 22,
    "backstory": "Computer science student at local university"
  }
}
```

### GET /api/admin/surveillance/analytics
Get comprehensive surveillance analytics.

**Headers:** `Authorization: Bearer <admin_token>`

**Query Parameters:**
- `timeRange`: Time range for analytics
- `metrics`: Specific metrics to include

**Response:**
```json
{
  "success": true,
  "analytics": {
    "totalUsers": 10542,
    "activeUsers": 1203,
    "flaggedUsers": 87,
    "messagesIntercepted": 1567,
    "psychProfilesGenerated": 892,
    "threatLevel": "medium",
    "topRisks": [
      {
        "type": "unusual_activity_pattern",
        "count": 23,
        "severity": "high"
      }
    ]
  }
}
```

---

## Real-time WebSocket Events

### Connection
```javascript
const socket = io('ws://localhost:3000', {
  auth: {
    token: 'jwt_token'
  }
});
```

### Client Events
```javascript
// Join a room
socket.emit('join_room', { roomId: 'room_123' });

// Send message
socket.emit('send_message', {
  roomId: 'room_123',
  content: 'Hello everyone!',
  type: 'text'
});

// Update typing status
socket.emit('typing', { roomId: 'room_123', isTyping: true });
```

### Server Events
```javascript
// Receive message
socket.on('message_received', (message) => {
  console.log('New message:', message);
});

// User joined room
socket.on('user_joined', (user) => {
  console.log('User joined:', user);
});

// Surveillance alert (admin only)
socket.on('surveillance_alert', (alert) => {
  console.log('Security alert:', alert);
});
```

---

## Error Handling

All API endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  },
  "timestamp": "2024-01-01T00:00:00Z",
  "requestId": "req_123456"
}
```

### Common Error Codes
- `AUTHENTICATION_REQUIRED`: Valid authentication token required
- `AUTHORIZATION_DENIED`: Insufficient permissions
- `VALIDATION_ERROR`: Input validation failed
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server-side error occurred

---

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **General API endpoints**: 100 requests per minute
- **Admin endpoints**: 50 requests per minute
- **WebSocket connections**: 1000 messages per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## Security Considerations

### Data Privacy
- All surveillance data is encrypted at rest and in transit
- User data is anonymized where possible
- Audit logs track all admin access to user data

### API Security
- All endpoints use HTTPS in production
- JWT tokens expire after 24 hours
- Admin tokens expire after 1 hour
- CORS policies restrict access to authorized domains
- Input validation prevents injection attacks

### Surveillance Ethics
- All surveillance activities must comply with legal requirements
- Data retention policies automatically delete old surveillance data
- Admin access is logged and audited
- User consent mechanisms are in place where required

---

## SDKs and Libraries

### JavaScript/TypeScript
```bash
npm install @humanverse/sdk
```

```javascript
import HumanverseSDK from '@humanverse/sdk';

const client = new HumanverseSDK({
  apiUrl: 'https://api.humanverse.com',
  token: 'your_jwt_token'
});

// Send a message
await client.chat.sendMessage('room_123', 'Hello world!');
```

### Python
```bash
pip install humanverse-python-sdk
```

```python
from humanverse import HumanverseClient

client = HumanverseClient(
    api_url='https://api.humanverse.com',
    token='your_jwt_token'
)

# Get user profile
profile = client.users.get_profile()
```

---

## Support

For API support and questions:
- **Documentation**: https://docs.humanverse.com
- **Support Email**: api-support@humanverse.com
- **Status Page**: https://status.humanverse.com
- **Community Forum**: https://community.humanverse.com

For security issues:
- **Security Email**: security@humanverse.com
- **Responsible Disclosure**: https://humanverse.com/security
