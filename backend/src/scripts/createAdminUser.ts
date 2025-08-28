// backend/src/scripts/createAdminUser.ts
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const saltRounds = 10;

async function createAdminUser() {
  try {
    const adminEmail = 'admin@legalcasebuilder.com';
    const adminPassword = 'admin123';
    const adminName = 'System Administrator';

    // Check if admin user already exists
    const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail));
    if (existingAdmin.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    // Create admin user
    const newAdmin = await db.insert(users).values({
      fullName: adminName,
      email: adminEmail,
      hashedPassword,
      role: 'admin',
      isActive: 1,
    }).returning();

    console.log('Admin user created successfully:', {
      id: newAdmin[0].id,
      email: newAdmin[0].email,
      role: newAdmin[0].role,
    });
    console.log('Login credentials:');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    process.exit(0);
  }
}

createAdminUser();
