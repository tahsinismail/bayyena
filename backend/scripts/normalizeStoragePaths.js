#!/usr/bin/env node
/**
 * backend/scripts/normalizeStoragePaths.js
 *
 * Safe Node script to normalize existing documents.storage_path values to 'uploads/<basename>'
 * - Backs up affected rows to a JSON file before updating
 * - Updates rows, ensuring uniqueness by appending `-<id>` if necessary
 *
 * Usage:
 *   NODE_ENV=production DATABASE_URL=postgres://... node backend/scripts/normalizeStoragePaths.js
 *
 * IMPORTANT: Run this after taking a DB backup. Script logs actions to stdout and creates a backup file.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Please set DATABASE_URL environment variable');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    console.log('Fetching documents that need normalization...');
    const res = await client.query("SELECT id, storage_path FROM documents WHERE storage_path IS NOT NULL AND storage_path NOT LIKE 'uploads/%'");
    if (res.rowCount === 0) {
      console.log('No rows need normalization. Exiting.');
      return;
    }

    const backup = res.rows;
    const backupFile = path.join(process.cwd(), 'backend', 'drizzle', `storage_path_backup_${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf-8');
    console.log(`Backed up ${backup.length} rows to ${backupFile}`);

    for (const row of backup) {
      const id = row.id;
      const raw = row.storage_path || '';
      const basename = raw.split('/').pop() || `file-${id}`;
      let newPath = `uploads/${basename}`;

      // Check for collision
      const collide = await client.query('SELECT id FROM documents WHERE storage_path = $1 AND id <> $2', [newPath, id]);
      if (collide.rowCount > 0) {
        newPath = `${newPath}-${id}`;
      }

      console.log(`Updating id=${id}: ${raw} -> ${newPath}`);
      await client.query('UPDATE documents SET storage_path = $1 WHERE id = $2', [newPath, id]);
    }

    console.log('Normalization complete.');
  } catch (err) {
    console.error('Error during normalization:', err);
  } finally {
    await client.end();
  }
}

main();
