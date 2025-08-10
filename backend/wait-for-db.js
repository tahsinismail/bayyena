// wait-for-db.js
const { Client } = require('pg');

const waitForDatabase = async () => {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'dbAdmin',
    database: 'legalcasebuilder'
  });

  let retries = 30;
  
  while (retries > 0) {
    try {
      await client.connect();
      console.log('Database is ready!');
      await client.end();
      process.exit(0);
    } catch (error) {
      console.log(`Waiting for database... (${retries} attempts left) - Error: ${error.message}`);
      retries--;
      if (retries === 0) {
        console.error('Database not ready after 30 attempts');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

waitForDatabase().catch(error => {
  console.error('Error waiting for database:', error);
  process.exit(1);
});
