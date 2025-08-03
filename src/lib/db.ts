import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Database connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Initialize database with admin user if needed
export async function initializeDatabase(): Promise<void> {
  try {
    // Check if super admin exists
    const superAdmin = await prisma.adminUser.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });

    if (!superAdmin) {
      // Create default super admin
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(
        process.env.ADMIN_MASTER_PASSWORD || 'AdminMaster2024!',
        12
      );

      await prisma.adminUser.create({
        data: {
          email: process.env.ADMIN_MASTER_EMAIL || 'admin@humanverse.com',
          passwordHash: hashedPassword,
          role: 'SUPER_ADMIN',
          permissions: {
            surveillance: true,
            userManagement: true,
            contentModeration: true,
            systemSettings: true,
            impersonation: true,
            dataExport: true,
          },
          isActive: true,
        },
      });

      console.log('✅ Super admin created successfully');
    }

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Cleanup old sessions and expired data
export async function cleanupOldData(): Promise<void> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Remove expired sessions
    await prisma.userSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    // Remove old surveillance logs (keep for 30 days)
    await prisma.surveillanceLog.deleteMany({
      where: { timestamp: { lt: thirtyDaysAgo } },
    });

    // Remove expired messages
    await prisma.message.deleteMany({
      where: { 
        expiresAt: { 
          not: null,
          lt: new Date() 
        } 
      },
    });

    // Remove expired drop secrets
    await prisma.dropSecret.deleteMany({
      where: { 
        expiresAt: { 
          not: null,
          lt: new Date() 
        } 
      },
    });

    console.log('✅ Old data cleanup completed');
  } catch (error) {
    console.error('❌ Data cleanup failed:', error);
  }
}

export default prisma;
