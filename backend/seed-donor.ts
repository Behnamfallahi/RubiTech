import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedDonor() {
  try {
    // Check if donor already exists
    const existingDonor = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'donor@rubitech.com' },
          { phoneNumber: '09123456789' }
        ]
      }
    });

    if (existingDonor) {
      console.log('✅ Donor user already exists');
      return;
    }

    // Create donor user
    const hashedPassword = await bcrypt.hash('donor123', 10);
    
    const donor = await prisma.user.create({
      data: {
        name: 'احمد احمدی',
        email: 'donor@rubitech.com',
        phoneNumber: '09123456789',
        password: hashedPassword,
        role: 'DONOR',
        status: 'APPROVED',
        nationalId: '1234567890',
        city: 'تهران',
        region: 'منطقه 1',
        teachingAreas: ['ریاضی', 'فیزیک', 'برنامه\u200cنویسی']
      }
    });

    console.log('✅ Donor user created successfully:');
    console.log('📧 Email: donor@rubitech.com');
    console.log('🔑 Password: donor123');
    console.log('👤 Role: DONOR');
    console.log('🆔 ID:', donor.id);

  } catch (error) {
    console.error('❌ Error creating donor user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDonor();

