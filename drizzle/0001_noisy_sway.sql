CREATE TYPE "public"."classroom_assignment_status" AS ENUM('active', 'transferred', 'completed', 'withdrawn', 'cancelled');--> statement-breakpoint
CREATE TABLE "classroom_assignment" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "enrollment_id" uuid NOT NULL,
        "classroom_id" uuid NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date,
        "status" "classroom_assignment_status" DEFAULT 'active' NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "enrollment" DROP CONSTRAINT "enrollment_classroom_id_classroom_id_fk";
--> statement-breakpoint
ALTER TABLE "enrollment" DROP CONSTRAINT "enrollment_student_id_student_id_fk";
--> statement-breakpoint
ALTER TABLE "enrollment" DROP CONSTRAINT "enrollment_academic_year_id_academic_year_id_fk";
--> statement-breakpoint
ALTER TABLE "enrollment" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "enrollment" ALTER COLUMN "status" SET DEFAULT 'active'::text;--> statement-breakpoint
DROP TYPE "public"."enrollment_status";--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('active', 'completed', 'transferred_out', 'withdrawn', 'cancelled');--> statement-breakpoint
ALTER TABLE "enrollment" ALTER COLUMN "status" SET DEFAULT 'active'::"public"."enrollment_status";--> statement-breakpoint
ALTER TABLE "enrollment" ALTER COLUMN "status" SET DATA TYPE "public"."enrollment_status" USING "status"::"public"."enrollment_status";--> statement-breakpoint
ALTER TABLE "enrollment" ALTER COLUMN "classroom_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "enrollment" ADD COLUMN "school_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "enrollment" ADD COLUMN "enrolled_at" date;--> statement-breakpoint
ALTER TABLE "enrollment" ADD COLUMN "exited_at" date;--> statement-breakpoint
ALTER TABLE "classroom_assignment" ADD CONSTRAINT "classroom_assignment_enrollment_id_enrollment_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollment"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_assignment" ADD CONSTRAINT "classroom_assignment_classroom_id_classroom_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classroom"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ca_enrollment_idx" ON "classroom_assignment" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "ca_classroom_idx" ON "classroom_assignment" USING btree ("classroom_id");--> statement-breakpoint
CREATE INDEX "ca_status_idx" ON "classroom_assignment" USING btree ("status");--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_academic_year_id_academic_year_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_year"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "en_school_idx" ON "enrollment" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "en_status_idx" ON "enrollment" USING btree ("status");--> statement-breakpoint
--> M2 manual: CHECK constraints and partial unique index (not supported by Drizzle ORM)
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_date_check" CHECK (exited_at IS NULL OR enrolled_at IS NULL OR enrolled_at <= exited_at);--> statement-breakpoint
ALTER TABLE "classroom_assignment" ADD CONSTRAINT "classroom_assignment_date_check" CHECK (end_date IS NULL OR start_date <= end_date);--> statement-breakpoint
CREATE UNIQUE INDEX "uca_enrollment_active" ON "classroom_assignment" USING btree ("enrollment_id") WHERE ("status" = 'active');