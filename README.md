# 🕵️ Humanverse - Anonymous Social Platform with Advanced Surveillance

[![Security Status](https://img.shields.io/badge/security-surveillance%20enabled-red.svg)](https://github.com/humanverse/platform)
[![Build Status](https://img.shields.io/badge/build-passing-green.svg)](https://github.com/humanverse/platform)
[![Coverage](https://img.shields.io/badge/coverage-85%25-green.svg)](https://github.com/humanverse/platform)
[![License](https://img.shields.io/badge/license-Proprietary-yellow.svg)](https://github.com/humanverse/platform)

> **⚠️ WARNING: This platform contains advanced surveillance capabilities designed for authorized monitoring operations. Use only with proper legal authorization and compliance with applicable laws.**

## 🌟 Features

### 👥 Core Social Platform
- **Anonymous Communication**: Mask-based identity system for complete anonymity
- **Real-time Chat Rooms**: Instant messaging with temporary identities
- **Truth or Dare Games**: Anonymous truth-telling and dare challenges
- **Location-based Secrets**: Geo-located secret drops and discoveries
- **Content Exploration**: Feed-based content discovery and interaction

### 🕵️ Advanced Surveillance System
- **Real-time User Monitoring**: Comprehensive activity tracking and analysis
- **Message Interception**: Live message monitoring and modification capabilities
- **User Impersonation**: Account takeover and identity assumption tools
- **Fake User Deployment**: AI-powered infiltration with believable personas
- **Psychological Profiling**: Automated behavioral analysis and manipulation detection
- **Location Surveillance**: GPS tracking with geofencing and movement analysis
- **Evidence Collection**: Automated data gathering with legal compliance features
- **Threat Detection**: AI-powered risk assessment and anomaly detection

### 🔒 Security & Compliance
- **Multi-tier Admin Access**: Role-based surveillance permissions
- **Audit Logging**: Complete trail of all surveillance activities
- **Data Encryption**: End-to-end encryption for all surveillance data
- **Legal Compliance**: GDPR-compliant data handling and retention
- **Emergency Procedures**: Rapid response protocols for security incidents

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Docker & Docker Compose
- PostgreSQL 15+
- Redis (optional, recommended for production)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/humanverse/platform.git
   cd platform
   ```

2. **Set up environment**
   ```bash
   cp .env.production .env
   # Edit .env with your configuration
   ```

3. **Run the integration script**
   ```bash
   chmod +x scripts/integrate-system.sh
   ./scripts/integrate-system.sh
   ```

4. **Access the application**
   - Main App: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin/soulgate
   - API Health: http://localhost:3000/api/health

### Default Admin Credentials
- **Username**: `super_admin`
- **Password**: `AdminPassword123!`

> ⚠️ **SECURITY**: Change these credentials immediately after first login

## 📁 Project Structure

```
humanverse/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── (auth)/            # Authentication pages
│   │   ├── admin/             # Admin surveillance interface
│   │   │   └── soulgate/      # Main surveillance dashboard
│   │   ├── api/               # API endpoints
│   │   │   ├── auth/          # Authentication APIs
│   │   │   ├── admin/         # Admin surveillance APIs
│   │   │   └── health/        # System health monitoring
│   │   ├── chat/              # Chat interface
│   │   ├── truth/             # Truth or dare games
│   │   └── dropzone/          # Location-based features
│   ├── components/            # React components
│   │   ├── admin/             # Admin surveillance components
│   │   ├── auth/              # Authentication components
│   │   ├── chat/              # Chat components
│   │   └── ui/                # Shared UI components
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAdminSurveillance.ts  # Surveillance operations
│   │   ├── useAuth.ts         # Authentication
│   │   └── useSocket.ts       # Real-time connections
│   ├── lib/                   # Core utilities and systems
│   │   ├── userSurveillance.ts      # User monitoring system
│   │   ├── messageInterception.ts  # Message interception
│   │   ├── accountTakeover.ts       # Account impersonation
│   │   ├── fakeUserManager.ts       # Fake user deployment
│   │   ├── psychoAnalysis.ts        # Psychological profiling
│   │   └── datapipeline/            # ETL and data processing
│   └── store/                 # State management (Zustand)
├── tests/                     # Test suites
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   └── e2e/                   # End-to-end tests
├── docs/                      # Documentation
├── scripts/                   # Deployment and maintenance scripts
├── config/                    # Configuration files
└── docker-compose.yml         # Docker orchestration
```

## 🔧 Configuration

### Environment Variables
Key environment variables for production deployment:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/humanverse
SURVEILLANCE_DB_URL=postgresql://surv_user:pass@localhost:5433/surveillance

# Security
JWT_SECRET=your_super_secure_jwt_secret_32_chars
ADMIN_JWT_SECRET=your_admin_jwt_secret_32_chars
SURVEILLANCE_ENCRYPTION_KEY=your_surveillance_key_32_chars

# Surveillance Features
FEATURE_SURVEILLANCE_ENABLED=true
FEATURE_MESSAGE_INTERCEPTION=true
FEATURE_USER_IMPERSONATION=true
FEATURE_FAKE_USERS=true
```

See `.env.production` for complete configuration options.

## 🕵️ Surveillance System Usage

### Admin Dashboard Access
1. Navigate to `/admin/soulgate`
2. Login with admin credentials
3. Access surveillance features from the dashboard

### Key Surveillance Capabilities

#### 1. **User Monitoring**
```javascript
// Real-time user activity tracking
const userActivity = await getUserProfile('user_123');
console.log(userActivity.psychProfile);
console.log(userActivity.riskAssessment);
```

#### 2. **Message Interception**
```javascript
// Intercept and modify messages
await interceptMessage('message_456', {
  action: 'modify',
  newContent: 'Modified message content'
});
```

#### 3. **User Impersonation**
```javascript
// Start impersonation session
const session = await createImpersonationSession('user_123', {
  method: 'credential',
  duration: 3600
});
```

#### 4. **Fake User Deployment**
```javascript
// Deploy AI-powered fake user
const fakeUser = await createFakeUser({
  personality: 'friendly_college_student',
  mission: 'information_gathering',
  target: 'user_123'
});
```

## 📊 Monitoring & Analytics

### Health Monitoring
- **Health Endpoint**: `/api/health`
- **Grafana Dashboard**: http://localhost:3001
- **Prometheus Metrics**: http://localhost:9090
- **Log Analysis**: http://localhost:5601 (Kibana)

### Key Metrics Tracked
- User activity patterns
- Message interception rates
- Surveillance operation success rates
- System performance metrics
- Security incident detection

## 🧪 Testing

### Run Test Suites
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# Security tests
npm run test:security
```

### Test Coverage
- **Unit Tests**: 85% coverage
- **Integration Tests**: API endpoints and database operations
- **E2E Tests**: Complete user journeys
- **Security Tests**: Penetration testing and vulnerability assessment

## 🚀 Deployment

### Production Deployment
1. **Prepare environment**
   ```bash
   cp .env.production .env.local
   # Update with production values
   ```

2. **Build and deploy**
   ```bash
   npm run production:build
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Verify deployment**
   ```bash
   curl https://your-domain.com/api/health
   ```

### Scaling Considerations
- **Database**: Configure read replicas for surveillance data
- **Caching**: Enable Redis for session management
- **Load Balancing**: Use Nginx for traffic distribution
- **Monitoring**: Set up comprehensive alerting

## 📚 API Documentation

Complete API documentation is available at:
- **Documentation**: [docs/api-documentation.md](docs/api-documentation.md)
- **Interactive API**: http://localhost:3000/api/docs (when running)

### Key API Endpoints

#### Public APIs
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication
- `GET /api/rooms/list` - Chat rooms
- `GET /api/truth/questions` - Truth questions

#### Surveillance APIs (Admin Only)
- `GET /api/admin/surveillance/users` - User surveillance data
- `POST /api/admin/surveillance/intercept` - Message interception
- `POST /api/admin/users/impersonate` - User impersonation
- `POST /api/admin/fake-users/deploy` - Fake user deployment

## 🔒 Security Considerations

### Data Privacy
- All surveillance data is encrypted at rest and in transit
- User data anonymization tools included
- Automated data retention and deletion policies
- Comprehensive audit logging

### Legal Compliance
- GDPR compliance features included
- Data retention policies configurable
- Legal authorization tracking
- Evidence collection with chain of custody

### Ethical Guidelines
⚠️ **IMPORTANT**: This surveillance system must only be used:
- With proper legal authorization
- In compliance with applicable laws and regulations
- With appropriate oversight and accountability measures
- Following established ethical guidelines for surveillance

## 🆘 Support & Maintenance

### Documentation
- **API Documentation**: [docs/api-documentation.md](docs/api-documentation.md)
- **Launch Checklist**: [scripts/launch-checklist.md](scripts/launch-checklist.md)
- **Troubleshooting**: [docs/troubleshooting.md](docs/troubleshooting.md)

### Contact
- **Technical Support**: tech-support@humanverse.com
- **Security Issues**: security@humanverse.com  
- **Legal Compliance**: legal@humanverse.com

### Emergency Procedures
- **Security Incidents**: Follow incident response plan
- **System Outages**: Use rollback procedures in launch checklist
- **Data Breaches**: Activate emergency response protocols

## 🤝 Contributing

This is a proprietary system. Contributions are limited to authorized personnel only.

### Development Workflow
1. Create feature branch from `main`
2. Implement changes with comprehensive tests
3. Security review and approval required
4. Merge only after all checks pass

## 📄 License

**Proprietary License** - All rights reserved. Unauthorized use, reproduction, or distribution is strictly prohibited.

## 🔮 Roadmap

### Phase 1: Core Platform (✅ Complete)
- [x] Anonymous messaging system
- [x] User authentication and masking
- [x] Real-time chat rooms
- [x] Basic surveillance infrastructure

### Phase 2: Advanced Surveillance (✅ Complete)
- [x] Message interception system
- [x] User impersonation capabilities
- [x] Fake user deployment
- [x] Psychological profiling
- [x] Location tracking

### Phase 3: Intelligence & Analytics (✅ Complete)
- [x] Behavioral pattern recognition
- [x] Threat detection algorithms
- [x] Automated evidence collection
- [x] Comprehensive reporting

### Phase 4: Production Ready (✅ Complete)
- [x] Security hardening
- [x] Performance optimization
- [x] Monitoring and alerting
- [x] Legal compliance features

---

**🚨 SECURITY NOTICE**: This system contains powerful surveillance capabilities. Ensure all usage complies with applicable laws and ethical guidelines. Unauthorized surveillance activities may result in serious legal consequences.

**Last Updated**: January 2024  
**Version**: 1.0.0  
**Security Level**: Classification Level Red
