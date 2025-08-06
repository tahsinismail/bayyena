ALTER TABLE "documents" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "timeline" jsonb;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "translation_en" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "translation_ar" text;