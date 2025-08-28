// backend/src/db/schema.ts
import { pgTable, serial, text, varchar, timestamp, json, integer, pgEnum, bigint, jsonb, date } from 'drizzle-orm/pg-core';

// --- User Role Enum ---
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);

// --- Existing User and Session Tables ---
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  phoneNumber: varchar('phone_number', { length: 50 }),
  hashedPassword: text('hashed_password').notNull(),
  role: userRoleEnum('role').default('user').notNull(),
  isActive: integer('is_active').default(1).notNull(), // 1 = active, 0 = disabled
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
export const docProcessingStatusEnum = pgEnum('doc_processing_status', ['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED']);
export const messageSenderEnum = pgEnum('message_sender', ['user', 'bot']);
export const timelineSourceTypeEnum = pgEnum('timeline_source_type', ['document', 'user']);

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
    extractedText: text('extracted_text'),
    processingStatus: docProcessingStatusEnum('processing_status').default('PENDING').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),

    // --- NEW AI-GENERATED CONTENT COLUMNS ---
    summary: text('summary'),
    timeline: jsonb('timeline'), // We use jsonb for efficiently storing structured JSON data
    translationEn: text('translation_en'),
    translationAr: text('translation_ar'),
});
// --- New Chat Messages Table ---
export const chatMessages = pgTable('chat_messages', {
    id: serial('id').primaryKey(),
    caseId: integer('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
    sender: messageSenderEnum('sender').notNull(),
    text: text('text').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- New Timeline Events Table ---
export const timelineEvents = pgTable('timeline_events', {
    id: serial('id').primaryKey(),
    caseId: integer('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
    eventDate: date('event_date').notNull(),
    eventDescription: text('event_description').notNull(),
    sourceType: timelineSourceTypeEnum('source_type').notNull(),
    sourceId: integer('source_id'), // Document ID if source is document, null if user-added
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// --- Admin Activity Logs Table ---
export const adminActivityLogs = pgTable('admin_activity_logs', {
    id: serial('id').primaryKey(),
    adminId: integer('admin_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    action: text('action').notNull(), // e.g., 'user_role_changed', 'user_disabled', 'feature_toggled'
    targetUserId: integer('target_user_id').references(() => users.id, { onDelete: 'cascade' }),
    details: jsonb('details'), // Additional details about the action
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- User Feature Toggles Table ---
export const userFeatureToggles = pgTable('user_feature_toggles', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    featureName: varchar('feature_name', { length: 100 }).notNull(),
    isEnabled: integer('is_enabled').default(0).notNull(), // 0 = disabled, 1 = enabled
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// --- User Activity Logs Table ---
export const userActivityLogs = pgTable('user_activity_logs', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    action: text('action').notNull(), // e.g., 'login', 'case_created', 'document_uploaded'
    details: jsonb('details'), // Additional details about the action
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});