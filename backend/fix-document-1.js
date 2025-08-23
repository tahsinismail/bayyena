const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { documents } = require('./dist/db/schema.js');
const { sql } = require('drizzle-orm');

async function fixDocument1() {
  console.log('Connecting to database...');
  
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/legalcasebuilder';
  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    console.log('Fixing document ID 1 to point to existing PDF file...');
    
    await db.update(documents)
      .set({ 
        storagePath: '/uploads/document-1754914500058-64698021.pdf',
        fileName: 'document-1754914500058-64698021.pdf',
        fileSize: 23383559,
        fileType: 'application/pdf'
      })
      .where(sql`id = 1`);
    
    console.log('✅ Document 1 updated successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing document 1:', error);
  } finally {
    await client.end();
  }
}

fixDocument1();
