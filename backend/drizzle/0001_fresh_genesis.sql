CREATE TYPE "public"."case_status" AS ENUM('Open', 'Closed', 'Pending', 'Archived');--> statement-breakpoint
CREATE TYPE "public"."case_type" AS ENUM('Civil Dispute', 'Criminal Defense', 'Family Law', 'Intellectual Property', 'Corporate Law', 'Other');--> statement-breakpoint
CREATE TABLE "cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_number" varchar(100) NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "case_type" NOT NULL,
	"status" "case_status" DEFAULT 'Open' NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "cases_case_number_unique" UNIQUE("case_number")
);
--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;