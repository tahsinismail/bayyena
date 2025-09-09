// create-admin-user.js
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const createAdminUser = async () => {
  const client = new Client({
    host: 'localhost',
    port: 5434,
    user: 'postgres',
    password: 'dbAdmin',
    database: 'bayyenadb'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if admin user already exists
    const existingAdmin = await client.query(
      "SELECT id FROM users WHERE email = $1",
      ['admin@bayyena.com']
    );

    if (existingAdmin.rows.length > 0) {
      console.log('Admin user already exists, updating password...');

      // Hash the new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash('admin@Bayyena', saltRounds);

      // Update the existing admin user
      await client.query(
        "UPDATE users SET hashed_password = $1, role = 'admin', is_active = 1 WHERE email = $2",
        [hashedPassword, 'admin@bayyena.com']
      );

      console.log('Admin user updated successfully!');
    } else {
      console.log('Creating new admin user...');

      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash('admin@Bayyena', saltRounds);

      // Insert the admin user
      const result = await client.query(
        `INSERT INTO users (full_name, email, hashed_password, role, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id`,
        ['Admin User', 'admin@bayyena.com', hashedPassword, 'admin', 1]
      );

      console.log('Admin user created successfully with ID:', result.rows[0].id);
    }

    await client.end();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();
