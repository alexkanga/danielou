-- M1 Migration: Add V2 columns to user table + school_membership + audit_log expansion
-- This is an incremental migration to bring the live DB in sync with the Drizzle schema.

-- 1. Create new enums
DO $$ BEGIN
    CREATE TYPE "platform_role" AS ENUM('super_admin', 'none');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "school_membership_role" AS ENUM('admin', 'direction', 'teacher', 'reader');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add username column to user
DO $$ BEGIN
    ALTER TABLE "user" ADD COLUMN "username" text UNIQUE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 3. Add platform_role column to user
DO $$ BEGIN
    ALTER TABLE "user" ADD COLUMN "platform_role" "platform_role" DEFAULT 'none' NOT NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 4. Add is_super_admin column to user
DO $$ BEGIN
    ALTER TABLE "user" ADD COLUMN "is_super_admin" boolean DEFAULT false NOT NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 5. Create school_membership table
CREATE TABLE IF NOT EXISTS "school_membership" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "school_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "role" "school_membership_role" DEFAULT 'reader' NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 6. school_membership indexes
CREATE UNIQUE INDEX IF NOT EXISTS "usm_school_user" ON "school_membership" USING btree ("school_id", "user_id");
CREATE INDEX IF NOT EXISTS "sm_user_idx" ON "school_membership" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "sm_school_idx" ON "school_membership" USING btree ("school_id");

-- 7. school_membership FKs
DO $$ BEGIN
    ALTER TABLE "school_membership" ADD CONSTRAINT "school_membership_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "school_membership" ADD CONSTRAINT "school_membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 8. Expand audit_log table with new columns
DO $$ BEGIN
    ALTER TABLE "audit_log" ADD COLUMN "actor_type" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "audit_log" ADD COLUMN "actor_identifier" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "audit_log" ADD COLUMN "school_id" uuid;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "audit_log" ADD COLUMN "request_id" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
