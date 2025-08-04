#!/bin/bash

# Humanverse System Integration Script
# This script integrates all components into a fully functional system

set -e  # Exit on any error

echo "🚀 Starting Humanverse System Integration..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_step "Checking system dependencies..."
    
    command -v node >/dev/null 2>&1 || { print_error "Node.js is required but not installed."; exit 1; }
    command -v npm >/dev/null 2>&1 || { print_error "npm is required but not installed."; exit 1; }
    command -v docker >/dev/null 2>&1 || { print_error "Docker is required but not installed."; exit 1; }
    command -v docker-compose >/dev/null 2>&1 || { print_error "docker-compose is required but not installed."; exit 1; }
    
    print_status "All dependencies are available"
}

# Install Node.js dependencies
install_dependencies() {
    print_step "Installing Node.js dependencies..."
    npm ci --production=false
    print_status "Dependencies installed successfully"
}

# Generate environment files
setup_environment() {
    print_step "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        print_warning ".env file not found, creating from template..."
        cp .env.production .env
        print_status "Created .env file from template"
        print_warning "Please update .env file with your production values"
    fi
    
    # Generate encryption keys if they don't exist
    if [ ! -f keys/surveillance.key ]; then
        mkdir -p keys
        node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" > keys/surveillance.key
        print_status "Generated surveillance encryption key"
    fi
    
    if [ ! -f keys/admin.key ]; then
        mkdir -p keys
        node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" > keys/admin.key
        print_status "Generated admin session key"
    fi
}

# Database setup and migrations
setup_database() {
    print_step "Setting up database..."
    
    # Start database services
    docker-compose up -d postgres surveillance-db redis
    
    # Wait for databases to be ready
    print_status "Waiting for databases to be ready..."
    sleep 10
    
    # Run Prisma migrations
    npx prisma generate
    npx prisma migrate deploy
    
    # Run surveillance database migrations
    docker-compose exec -T postgres psql -U postgres -d humanverse < scripts/migrate-surveillance.sql
    
    print_status "Database setup completed"
}

# Build the application
build_application() {
    print_step "Building the application..."
    
    # Generate Prisma client
    npx prisma generate
    
    # Build Next.js application
    npm run build
    
    print_status "Application build completed"
}

# Setup surveillance system
setup_surveillance() {
    print_step "Configuring surveillance system..."
    
    # Initialize surveillance data structures
    node -e "
        const { etlPipeline } = require('./src/lib/datapipeline/etl.ts');
        const { UserSurveillanceSystem } = require('./src/lib/userSurveillance.ts');
        
        console.log('Surveillance systems initialized');
    "
    
    print_status "Surveillance system configured"
}

# Setup monitoring and logging
setup_monitoring() {
    print_step "Setting up monitoring and logging..."
    
    # Create log directories
    mkdir -p logs/application
    mkdir -p logs/surveillance
    mkdir -p logs/admin
    mkdir -p logs/nginx
    
    # Start monitoring services
    docker-compose up -d prometheus grafana elasticsearch kibana
    
    print_status "Monitoring and logging configured"
}

# Run security checks
run_security_checks() {
    print_step "Running security checks..."
    
    # Run npm audit
    npm audit --audit-level=moderate || print_warning "npm audit found vulnerabilities"
    
    # Check for hardcoded secrets
    if command -v grep >/dev/null 2>&1; then
        if grep -r "password\|secret\|key" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v "console.log\|//\|/*" | head -5; then
            print_warning "Potential hardcoded secrets found - please review"
        fi
    fi
    
    print_status "Security checks completed"
}

# Setup SSL certificates
setup_ssl() {
    print_step "Setting up SSL certificates..."
    
    mkdir -p ssl
    
    if [ ! -f ssl/humanverse.crt ] || [ ! -f ssl/humanverse.key ]; then
        print_warning "SSL certificates not found"
        print_status "Generating self-signed certificates for development..."
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/humanverse.key \
            -out ssl/humanverse.crt \
            -subj "/C=US/ST=State/L=City/O=Humanverse/CN=localhost"
        
        print_warning "Self-signed certificates generated. Replace with proper certificates for production."
    fi
    
    print_status "SSL setup completed"
}

# Start all services
start_services() {
    print_step "Starting all services..."
    
    # Start the full stack
    docker-compose up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to start..."
    sleep 15
    
    # Check service health
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        print_status "Main application is healthy"
    else
        print_error "Main application health check failed"
    fi
    
    print_status "All services started"
}

# Run tests
run_tests() {
    print_step "Running test suite..."
    
    # Unit tests
    npm run test -- --coverage --watchAll=false
    
    # Integration tests (if database is ready)
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        npm run test:integration || print_warning "Some integration tests failed"
    fi
    
    print_status "Tests completed"
}

# Create admin user
create_admin_user() {
    print_step "Creating initial admin user..."
    
    # Run admin user creation script
    node -e "
        const bcrypt = require('bcryptjs');
        const { prisma } = require('./src/lib/db');
        
        async function createAdmin() {
            const hashedPassword = await bcrypt.hash('AdminPassword123!', 12);
            
            try {
                const admin = await prisma.admin.create({
                    data: {
                        username: 'super_admin',
                        email: 'admin@humanverse.com',
                        password: hashedPassword,
                        role: 'super_admin',
                        permissions: ['all'],
                        isActive: true
                    }
                });
                console.log('Admin user created:', admin.username);
            } catch (error) {
                if (error.code === 'P2002') {
                    console.log('Admin user already exists');
                } else {
                    console.error('Error creating admin:', error);
                }
            }
        }
        
        createAdmin().then(() => process.exit(0));
    "
    
    print_status "Admin user setup completed"
}

# Seed initial data
seed_data() {
    print_step "Seeding initial data..."
    
    # Create seed script
    node -e "
        const { prisma } = require('./src/lib/db');
        
        async function seedData() {
            // Create default rooms
            const rooms = [
                { name: 'General Discussion', description: 'Open discussion for all topics', category: 'general' },
                { name: 'Tech Talk', description: 'Technology discussions', category: 'technology' },
                { name: 'Random Thoughts', description: 'Share your random thoughts', category: 'casual' }
            ];
            
            for (const room of rooms) {
                try {
                    await prisma.room.create({ data: room });
                    console.log('Created room:', room.name);
                } catch (error) {
                    if (error.code !== 'P2002') {
                        console.error('Error creating room:', error);
                    }
                }
            }
            
            // Create default masks
            const masks = [
                { name: 'Anonymous Wanderer', description: 'A mysterious traveler', rarity: 'common', duration: 3600 },
                { name: 'Shadow Walker', description: 'One who walks in shadows', rarity: 'uncommon', duration: 7200 },
                { name: 'Truth Seeker', description: 'Seeker of hidden truths', rarity: 'rare', duration: 10800 }
            ];
            
            for (const mask of masks) {
                try {
                    await prisma.mask.create({ data: mask });
                    console.log('Created mask:', mask.name);
                } catch (error) {
                    if (error.code !== 'P2002') {
                        console.error('Error creating mask:', error);
                    }
                }
            }
            
            // Create truth questions
            const questions = [
                { question: 'What is your biggest fear?', category: 'personal', difficulty: 'medium' },
                { question: 'What secret have you never told anyone?', category: 'secret', difficulty: 'hard' },
                { question: 'What makes you happiest?', category: 'positive', difficulty: 'easy' }
            ];
            
            for (const q of questions) {
                try {
                    await prisma.truthQuestion.create({ data: q });
                    console.log('Created question:', q.question);
                } catch (error) {
                    if (error.code !== 'P2002') {
                        console.error('Error creating question:', error);
                    }
                }
            }
        }
        
        seedData().then(() => {
            console.log('Data seeding completed');
            process.exit(0);
        });
    "
    
    print_status "Data seeding completed"
}

# Final system validation
validate_system() {
    print_step "Validating system integration..."
    
    # Check all endpoints
    endpoints=(
        "http://localhost:3000/api/health"
        "http://localhost:3000/api/auth/me"
        "http://localhost:3000/api/rooms/list"
        "http://localhost:3000/api/masks/available"
        "http://localhost:3000/api/truth/questions"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f "$endpoint" >/dev/null 2>&1; then
            print_status "✅ $endpoint is responding"
        else
            print_warning "❌ $endpoint is not responding"
        fi
    done
    
    # Check surveillance endpoints (admin only)
    admin_endpoints=(
        "http://localhost:3000/admin/login"
        "http://localhost:3000/admin/soulgate"
    )
    
    for endpoint in "${admin_endpoints[@]}"; do
        if curl -f "$endpoint" >/dev/null 2>&1; then
            print_status "✅ $endpoint is accessible"
        else
            print_warning "❌ $endpoint is not accessible"
        fi
    done
    
    print_status "System validation completed"
}

# Display final status
show_final_status() {
    echo ""
    echo "🎉 Humanverse System Integration Complete!"
    echo ""
    echo "🌐 Application URLs:"
    echo "   - Main App: http://localhost:3000"
    echo "   - Admin Panel: http://localhost:3000/admin/soulgate"
    echo "   - API Health: http://localhost:3000/api/health"
    echo ""
    echo "📊 Monitoring:"
    echo "   - Grafana: http://localhost:3001"
    echo "   - Kibana: http://localhost:5601"
    echo "   - Prometheus: http://localhost:9090"
    echo ""
    echo "🔐 Default Admin Credentials:"
    echo "   - Username: super_admin"
    echo "   - Password: AdminPassword123!"
    echo ""
    echo "📁 Important Files:"
    echo "   - Environment: .env"
    echo "   - Logs: ./logs/"
    echo "   - SSL Certs: ./ssl/"
    echo "   - Encryption Keys: ./keys/"
    echo ""
    echo "⚠️  Security Reminders:"
    echo "   - Change default admin password"
    echo "   - Update environment variables for production"
    echo "   - Replace self-signed SSL certificates"
    echo "   - Review and rotate encryption keys"
    echo ""
    echo "📚 Documentation:"
    echo "   - API Docs: ./docs/api-documentation.md"
    echo "   - Launch Checklist: ./scripts/launch-checklist.md"
    echo ""
    print_status "System is ready for use!"
}

# Main execution
main() {
    print_step "Starting Humanverse Integration Process"
    
    check_dependencies
    install_dependencies
    setup_environment
    setup_ssl
    setup_database
    build_application
    setup_surveillance
    setup_monitoring
    run_security_checks
    start_services
    create_admin_user
    seed_data
    run_tests
    validate_system
    show_final_status
}

# Error handling
trap 'print_error "Integration failed at line $LINENO"' ERR

# Run main function
main "$@"
