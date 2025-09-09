// init-db.js
const { Client } = require('pg');

const initDatabase = async () => {
  // First, connect to the default postgres database
  const client = new Client({
    host: process.env.DB_HOST || 'db',
    port: 5432,
    user: 'postgres',
    password: 'dbAdmin',
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log('Connected to postgres database');

    // Check if our database exists
    const result = await client.query("SELECT 1 FROM pg_database WHERE datname = 'bayyenadb'");
    
    if (result.rows.length === 0) {
      console.log('Creating bayyenadb database...');
      await client.query('CREATE DATABASE bayyenadb');
      console.log('Database created successfully!');
    } else {
      console.log('Database bayyenadb already exists');
    }

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

initDatabase();
