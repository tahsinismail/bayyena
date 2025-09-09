const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { documents } = require('./dist/db/schema.js');
const { sql } = require('drizzle-orm');

async function fixStoragePaths() {
  console.log('Connecting to database...');
  
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:dbAdmin@localhost:5434/bayyenadb';
  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    console.log('Fetching documents with incorrect storage paths...');
    
    // Get all documents with storagePath starting with 'uploads/'
    const docsToFix = await db.select().from(documents).where(
      sql`storage_path LIKE 'uploads/%'`
    );
    
    console.log(`Found ${docsToFix.length} documents to fix`);
    
    for (const doc of docsToFix) {
      const oldPath = doc.storagePath;
      const newPath = oldPath.replace(/^uploads\//, '/uploads/');
      
      console.log(`Fixing document ${doc.id}: "${oldPath}" -> "${newPath}"`);
      
      await db.update(documents)
        .set({ storagePath: newPath })
        .where(sql`id = ${doc.id}`);
    }
    
    console.log('✅ All storage paths fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing storage paths:', error);
  } finally {
    await client.end();
  }
}

fixStoragePaths();
