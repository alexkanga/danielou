CREATE TYPE "public"."academic_year_status" AS ENUM('preparation', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."calculation_policy" AS ENUM('simple_average', 'weighted_average', 'single_grade');--> statement-breakpoint
CREATE TYPE "public"."config_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('active', 'transferred', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."grade_status" AS ENUM('graded', 'absent_excused', 'absent_unexcused', 'exempt', 'not_evaluated', 'pending');--> statement-breakpoint
CREATE TYPE "public"."period_status" AS ENUM('draft', 'open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('super_admin', 'none');--> statement-breakpoint
CREATE TYPE "public"."promotion_decision" AS ENUM('proposed_admitted', 'proposed_repeat', 'decision_required', 'final_admitted', 'final_repeat');--> statement-breakpoint
CREATE TYPE "public"."report_card_status" AS ENUM('draft', 'ready', 'validated', 'published');--> statement-breakpoint
CREATE TYPE "public"."app_role" AS ENUM('admin', 'direction', 'teacher', 'reader');--> statement-breakpoint
CREATE TYPE "public"."rounding_strategy" AS ENUM('half_up', 'half_even', 'truncate');--> statement-breakpoint
CREATE TYPE "public"."school_membership_role" AS ENUM('admin', 'direction', 'teacher', 'reader');--> statement-breakpoint
CREATE TABLE "academic_period" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 1 NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "period_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academic_year" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "academic_year_status" DEFAULT 'preparation' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"classroom_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"academic_period_id" uuid NOT NULL,
	"assessment_type_id" uuid,
	"title" text NOT NULL,
	"scale" integer DEFAULT 20 NOT NULL,
	"coefficient" numeric(6, 2) DEFAULT '1' NOT NULL,
	"assessment_date" date NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" text,
	"actor_identifier" text,
	"user_id" uuid,
	"school_id" uuid,
	"request_id" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"old_value" text,
	"new_value" text,
	"context" text,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classroom" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config_component" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_subject_id" uuid NOT NULL,
	"subject_component_id" uuid,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"coefficient" numeric(6, 2) DEFAULT '1' NOT NULL,
	"scale" integer DEFAULT 20 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config_subject" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"coefficient" numeric(6, 2) NOT NULL,
	"scale" integer DEFAULT 20 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"include_in_average" boolean DEFAULT true NOT NULL,
	"include_in_ranking" boolean DEFAULT true NOT NULL,
	"include_in_decision" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"classroom_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"status" "enrollment_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grade" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"raw_value" numeric(8, 4),
	"original_scale" integer,
	"status" "grade_status" DEFAULT 'pending' NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "level" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedagogical_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"level_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "config_status" DEFAULT 'draft' NOT NULL,
	"calculation_policy" "calculation_policy" DEFAULT 'simple_average' NOT NULL,
	"rounding_strategy" "rounding_strategy" DEFAULT 'half_up' NOT NULL,
	"subject_decimal_places" integer DEFAULT 2 NOT NULL,
	"general_decimal_places" integer DEFAULT 2 NOT NULL,
	"ranking_enabled" boolean DEFAULT true NOT NULL,
	"conduct_enabled" boolean DEFAULT false NOT NULL,
	"conduct_included_in_average" boolean DEFAULT false NOT NULL,
	"conduct_coefficient" numeric(6, 2) DEFAULT '0',
	"conduct_scale" integer DEFAULT 20,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_card" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"academic_period_id" uuid NOT NULL,
	"status" "report_card_status" DEFAULT 'draft' NOT NULL,
	"general_average" numeric(8, 4),
	"class_average" numeric(8, 4),
	"rank" integer,
	"total_students_ranked" integer,
	"conduct_grade" numeric(4, 2),
	"conduct_comment" text,
	"teacher_comment" text,
	"director_comment" text,
	"promotion_decision" "promotion_decision",
	"published_at" timestamp with time zone,
	"published_by" uuid,
	"config_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_card_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_card_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"average" numeric(8, 4),
	"coefficient" numeric(6, 2),
	"weighted_points" numeric(10, 4),
	"class_average" numeric(8, 4),
	"min_average" numeric(8, 4),
	"max_average" numeric(8, 4),
	"teacher_appreciation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"city" text DEFAULT 'Abidjan',
	"country" text DEFAULT 'Côte d''Ivoire',
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "school_membership_role" DEFAULT 'reader' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "student" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"matricule" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"date_of_birth" date,
	"gender" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subject" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"coefficient" numeric(6, 2) DEFAULT '1' NOT NULL,
	"default_scale" integer DEFAULT 20 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_optional" boolean DEFAULT false NOT NULL,
	"include_in_average" boolean DEFAULT true NOT NULL,
	"include_in_ranking" boolean DEFAULT true NOT NULL,
	"include_in_decision" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subject_component" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"coefficient" numeric(6, 2) DEFAULT '1' NOT NULL,
	"scale" integer DEFAULT 20 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"classroom_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"username" text,
	"role" "app_role" DEFAULT 'reader' NOT NULL,
	"platform_role" "platform_role" DEFAULT 'none' NOT NULL,
	"is_super_admin" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "academic_period" ADD CONSTRAINT "academic_period_academic_year_id_academic_year_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_year"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_year" ADD CONSTRAINT "academic_year_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_classroom_id_classroom_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classroom"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_academic_period_id_academic_period_id_fk" FOREIGN KEY ("academic_period_id") REFERENCES "public"."academic_period"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_assessment_type_id_assessment_type_id_fk" FOREIGN KEY ("assessment_type_id") REFERENCES "public"."assessment_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_type" ADD CONSTRAINT "assessment_type_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom" ADD CONSTRAINT "classroom_level_id_level_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."level"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom" ADD CONSTRAINT "classroom_academic_year_id_academic_year_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_year"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_component" ADD CONSTRAINT "config_component_config_subject_id_config_subject_id_fk" FOREIGN KEY ("config_subject_id") REFERENCES "public"."config_subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_component" ADD CONSTRAINT "config_component_subject_component_id_subject_component_id_fk" FOREIGN KEY ("subject_component_id") REFERENCES "public"."subject_component"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_subject" ADD CONSTRAINT "config_subject_config_id_pedagogical_config_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."pedagogical_config"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_subject" ADD CONSTRAINT "config_subject_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_classroom_id_classroom_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classroom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_academic_year_id_academic_year_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_year"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade" ADD CONSTRAINT "grade_assessment_id_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade" ADD CONSTRAINT "grade_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level" ADD CONSTRAINT "level_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedagogical_config" ADD CONSTRAINT "pedagogical_config_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedagogical_config" ADD CONSTRAINT "pedagogical_config_level_id_level_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."level"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedagogical_config" ADD CONSTRAINT "pedagogical_config_academic_year_id_academic_year_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_year"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_card" ADD CONSTRAINT "report_card_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_card" ADD CONSTRAINT "report_card_enrollment_id_enrollment_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_card" ADD CONSTRAINT "report_card_academic_period_id_academic_period_id_fk" FOREIGN KEY ("academic_period_id") REFERENCES "public"."academic_period"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_card_item" ADD CONSTRAINT "report_card_item_report_card_id_report_card_id_fk" FOREIGN KEY ("report_card_id") REFERENCES "public"."report_card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_card_item" ADD CONSTRAINT "report_card_item_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_membership" ADD CONSTRAINT "school_membership_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_membership" ADD CONSTRAINT "school_membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student" ADD CONSTRAINT "student_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject" ADD CONSTRAINT "subject_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_component" ADD CONSTRAINT "subject_component_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignment" ADD CONSTRAINT "teacher_assignment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignment" ADD CONSTRAINT "teacher_assignment_classroom_id_classroom_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classroom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignment" ADD CONSTRAINT "teacher_assignment_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignment" ADD CONSTRAINT "teacher_assignment_academic_year_id_academic_year_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_year"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "up_year_name" ON "academic_period" USING btree ("academic_year_id","name");--> statement-breakpoint
CREATE INDEX "ap_year_idx" ON "academic_period" USING btree ("academic_year_id");--> statement-breakpoint
CREATE INDEX "ap_status_idx" ON "academic_period" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uy_school_name" ON "academic_year" USING btree ("school_id","name");--> statement-breakpoint
CREATE INDEX "ay_status_idx" ON "academic_year" USING btree ("status");--> statement-breakpoint
CREATE INDEX "as_classroom_idx" ON "assessment" USING btree ("classroom_id");--> statement-breakpoint
CREATE INDEX "as_subject_idx" ON "assessment" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "as_period_idx" ON "assessment" USING btree ("academic_period_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uc_level_year_name" ON "classroom" USING btree ("level_id","academic_year_id","name");--> statement-breakpoint
CREATE INDEX "cl_year_idx" ON "classroom" USING btree ("academic_year_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ucs_config_subject" ON "config_subject" USING btree ("config_id","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ue_student_year" ON "enrollment" USING btree ("student_id","academic_year_id");--> statement-breakpoint
CREATE INDEX "en_classroom_idx" ON "enrollment" USING btree ("classroom_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ug_assessment_student" ON "grade" USING btree ("assessment_id","student_id");--> statement-breakpoint
CREATE INDEX "gr_student_idx" ON "grade" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ul_school_name" ON "level" USING btree ("school_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "upc_level_year_version" ON "pedagogical_config" USING btree ("level_id","academic_year_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "ur_student_period" ON "report_card" USING btree ("student_id","academic_period_id");--> statement-breakpoint
CREATE INDEX "rc_enrollment_idx" ON "report_card" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "rc_status_idx" ON "report_card" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uri_rc_subject" ON "report_card_item" USING btree ("report_card_id","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usm_school_user" ON "school_membership" USING btree ("school_id","user_id");--> statement-breakpoint
CREATE INDEX "sm_user_idx" ON "school_membership" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sm_school_idx" ON "school_membership" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "st_school_idx" ON "student" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "st_name_idx" ON "student" USING btree ("last_name","first_name");--> statement-breakpoint
CREATE UNIQUE INDEX "us_school_code" ON "subject" USING btree ("school_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "uc_subject_name" ON "subject_component" USING btree ("subject_id","name");--> statement-breakpoint
CREATE INDEX "sc_subject_idx" ON "subject_component" USING btree ("subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uta_user_class_subject_year" ON "teacher_assignment" USING btree ("user_id","classroom_id","subject_id","academic_year_id");