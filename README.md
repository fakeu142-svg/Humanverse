# 🧠 Humanverse - Anonymous Social Platform

A Next.js 14 based anonymous social platform with advanced admin surveillance capabilities. Built with TypeScript, Tailwind CSS, and Prisma.

## 🌟 Features

### Core Platform Features
- **Anonymous Mask System**: Users express themselves through 5 unique mask types (AshFox, VioletCrow, EchoDust, IronSage, GhostWind)
- **Chat Rooms**: Real-time messaging with anonymous identities
- **Truth Games**: Challenge perceptions and discover authentic connections
- **Secret Drops**: Location-based secret sharing and discovery
- **Ephemeral Content**: Messages and secrets with expiration times

### Admin Surveillance Features ⚠️
- **Complete User Monitoring**: Track all user activities, messages, and locations
- **Reversible Password Storage**: Admin access to user passwords for surveillance
- **User Impersonation**: Admins can act as any user account
- **Risk Scoring**: Automated user risk assessment based on behavior
- **Real-time Surveillance**: Live monitoring of rooms and user activities
- **Comprehensive Logging**: All admin actions and surveillance activities logged

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 14 with App Router
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS with custom desert/admin themes
- **Real-time**: Socket.IO for live chat
- **Authentication**: JWT with bcrypt
- **Encryption**: AES encryption for sensitive data

### Project Structure
```
src/
├── app/
│   ├── (auth)/           # User authentication pages
│   ├── admin/soulgate/   # Hidden admin surveillance panel
│   ├── rooms/            # Chat functionality
│   ├── truth/            # Truth game features
│   ├── dropzone/         # Location-based features
│   ├── explore/          # Content discovery
│   └── api/              # Backend API routes
├── components/
│   ├── admin/            # Admin surveillance components
│   ├── auth/             # Authentication components
│   ├── chat/             # Chat interface
│   └── ui/               # Reusable UI components
└── lib/
    ├── adminSurveillance.ts  # Admin monitoring utilities
    ├── userImpersonation.ts  # Account takeover logic
    ├── encryption.ts         # Password storage/retrieval
    └── db.ts                # Database connection
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone and install dependencies**
```bash
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Configure database**
```bash
npm run db:generate
npm run db:push
# Or for migrations:
npm run db:migrate
```

4. **Start development server**
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 📊 Database Schema

### Core Models
- **User**: Main user accounts with surveillance data
- **UserSession**: All login sessions with device tracking
- **Mask**: Anonymous identity system
- **Room**: Chat rooms with admin monitoring
- **Message**: All messages with impersonation tracking
- **TruthQuestion/Answer**: Truth game data
- **DropSecret**: Location-based content

### Surveillance Models
- **AdminUser**: Surveillance operators with role-based permissions
- **AdminAction**: All admin actions logged
- **SurveillanceLog**: Detailed monitoring activities
- **FakeUser**: AI-generated accounts for admin operations

## 🎨 Theming

### Desert Theme (Main Platform)
- Primary colors: Burnt orange (#8B4513), Dark brown (#2F1B14), Goldenrod (#DAA520)
- Typography: Playfair Display (headers), Source Code Pro (body)
- Design: Warm, inviting, anonymous-friendly

### Admin Theme (Surveillance Interface)
- Primary colors: Dark grays (#1F1F1F), Danger red (#DC2626), Warning orange (#F59E0B)
- Typography: JetBrains Mono (monospace for technical data)
- Design: Professional, surveillance-focused

## 🔐 Security & Surveillance

### User Security
- Bcrypt password hashing for authentication
- JWT tokens for session management
- Anonymous mask system for privacy

### Admin Surveillance
- **WARNING**: This platform includes comprehensive surveillance capabilities
- Reversible password encryption for admin access
- Complete user activity monitoring
- Real-time room surveillance
- User impersonation capabilities
- Risk scoring algorithms

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://..."

# Security
JWT_SECRET="your-jwt-secret"
ENCRYPTION_KEY="your-32-char-key"

# Admin Access
ADMIN_MASTER_EMAIL="admin@humanverse.com"
ADMIN_MASTER_PASSWORD="AdminMaster2024!"

# Features
SURVEILLANCE_MODE=true
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio

# Code Quality
npm run lint         # Run ESLint
```

## 🎭 Mask Types

1. **AshFox** - Cunning and adaptive
2. **VioletCrow** - Mysterious and observant
3. **EchoDust** - Ethereal and fleeting
4. **IronSage** - Wise and steadfast
5. **GhostWind** - Elusive and free

## 📱 Admin Panel Access

The admin surveillance panel is accessible at `/admin/soulgate` with proper credentials.

**Default Admin Credentials:**
- Email: `admin@humanverse.com`
- Password: `AdminMaster2024!`

## ⚠️ Legal & Ethical Considerations

This platform includes comprehensive surveillance capabilities intended for administrative oversight. Ensure compliance with:
- Local privacy laws and regulations
- User consent requirements
- Data protection standards
- Ethical surveillance practices

## 🤝 Contributing

This is a demonstration project showcasing advanced surveillance capabilities in social platforms. Use responsibly and in compliance with applicable laws.

## 📄 License

This project is for educational and demonstration purposes. Please review local laws and regulations before deployment.

---

Built with ❤️ and ⚡ surveillance capabilities
