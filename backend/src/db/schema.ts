// backend/src/db/schema.ts
import { pgTable, serial, text, varchar, timestamp, json, integer, pgEnum, bigint } from 'drizzle-orm/pg-core';

// --- Existing User and Session Tables ---
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  phoneNumber: varchar('phone_number', { length: 50 }),
  hashedPassword: text('hashed_password').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userSessions = pgTable('user_sessions', {
    sid: varchar('sid').primaryKey(),
    sess: json('sess').notNull(),
    expire: timestamp('expire', { mode: 'date' }).notNull(),
});

// --- New Enums and Cases Table ---
export const caseTypeEnum = pgEnum('case_type', ['Civil Dispute', 'Criminal Defense', 'Family Law', 'Intellectual Property', 'Corporate Law', 'Other']);
export const caseStatusEnum = pgEnum('case_status', ['Open', 'Closed', 'Pending', 'Archived']);
export const docProcessingStatusEnum = pgEnum('doc_processing_status', ['PENDING', 'PROCESSED', 'FAILED']);
export const messageSenderEnum = pgEnum('message_sender', ['user', 'bot']);

export const cases = pgTable('cases', {
    id: serial('id').primaryKey(),
    caseNumber: varchar('case_number', { length: 100 }).notNull().unique(),
    title: text('title').notNull(),
    description: text('description'),
    type: caseTypeEnum('type').notNull(),
    status: caseStatusEnum('status').default('Open').notNull(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

export const documents = pgTable('documents', {
    id: serial('id').primaryKey(),
    caseId: integer('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    storagePath: text('storage_path').notNull().unique(),
    fileType: text('file_type').notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    // --- New Columns ---
    extractedText: text('extracted_text'), // Will store the full text content
    processingStatus: docProcessingStatusEnum('processing_status').default('PENDING').notNull(),
    // ---
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- New Chat Messages Table ---
export const chatMessages = pgTable('chat_messages', {
    id: serial('id').primaryKey(),
    caseId: integer('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
    sender: messageSenderEnum('sender').notNull(),
    text: text('text').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});