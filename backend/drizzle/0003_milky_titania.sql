CREATE TYPE "public"."doc_processing_status" AS ENUM('PENDING', 'PROCESSED', 'FAILED');--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "extracted_text" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "processing_status" "doc_processing_status" DEFAULT 'PENDING' NOT NULL;