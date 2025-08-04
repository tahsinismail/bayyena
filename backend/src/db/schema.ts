// backend/src/db/schema.ts
import { pgTable, serial, text, varchar, timestamp, json, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  fullName: text('full_name').notNull(), // Added
  email: text('email').notNull().unique(),
  phoneNumber: varchar('phone_number', { length: 50 }), // Added
  hashedPassword: text('hashed_password').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Add this new table for session storage
export const userSessions = pgTable('user_sessions', {
    sid: varchar('sid').primaryKey(),
    sess: json('sess').notNull(),
    expire: timestamp('expire', { mode: 'date' }).notNull(),
});
