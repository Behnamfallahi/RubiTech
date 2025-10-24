import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { email: 'admin@rubitech.com' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists!');
      console.log('Email: admin@rubitech.com');
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.create({
      data: {
        name: 'مدیر سیستم',
        email: 'admin@rubitech.com',
        password: hashedPassword,
        role: 'ADMIN',
        status: 'APPROVED',
        phoneNumber: '09123456789',
        city: 'تهران'
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@rubitech.com');
    console.log('Password: admin123');
    console.log('Role:', admin.role);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

