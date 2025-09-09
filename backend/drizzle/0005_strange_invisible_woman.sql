CREATE TYPE "public"."case_priority" AS ENUM('High', 'Normal', 'Low');--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "priority" "case_priority" DEFAULT 'Normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "type";--> statement-breakpoint
DROP TYPE "public"."case_type";