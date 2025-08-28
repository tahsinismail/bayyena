const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function createAdminUser() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'dbAdmin',
    database: 'legalcasebuilder'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('admin123', saltRounds);

    // Insert admin user
    const query = `
      INSERT INTO users (full_name, email, phone_number, hashed_password, role, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (email) DO NOTHING
      RETURNING id, full_name, email, role;
    `;

    const values = [
      'System Administrator',
      'admin@example.com',
      '+1234567890',
      hashedPassword,
      'admin',
      1
    ];

    const result = await client.query(query, values);

    if (result.rows.length > 0) {
      console.log('✅ Admin user created successfully:');
      console.log(result.rows[0]);
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
