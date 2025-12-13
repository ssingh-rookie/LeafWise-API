-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "HomeType" AS ENUM ('apartment', 'house', 'office');

-- CreateEnum
CREATE TYPE "LightCondition" AS ENUM ('low', 'medium', 'bright', 'direct');

-- CreateEnum
CREATE TYPE "HumidityLevel" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('free', 'premium');

-- CreateEnum
CREATE TYPE "AcquisitionMethod" AS ENUM ('purchased', 'propagated', 'gifted', 'unknown');

-- CreateEnum
CREATE TYPE "PlantHealth" AS ENUM ('thriving', 'healthy', 'struggling', 'critical');

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('disease', 'pest', 'nutrient', 'environmental', 'unknown');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('active', 'treating', 'resolved', 'recurring');

-- CreateEnum
CREATE TYPE "CareAction" AS ENUM ('watered', 'fertilized', 'repotted', 'pruned', 'treated', 'custom');

-- CreateEnum
CREATE TYPE "ReminderPriority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('conversation', 'diagnosis', 'advice', 'outcome');

-- CreateEnum
CREATE TYPE "TipsFrequency" AS ENUM ('daily', 'weekly', 'none');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "experience_level" "ExperienceLevel" NOT NULL DEFAULT 'beginner',
    "city" TEXT,
    "climate_zone" TEXT,
    "hemisphere" TEXT,
    "home_type" "HomeType",
    "light_conditions" "LightCondition",
    "humidity_level" "HumidityLevel",
    "watering_reminders" BOOLEAN NOT NULL DEFAULT true,
    "health_alerts" BOOLEAN NOT NULL DEFAULT true,
    "tips_frequency" "TipsFrequency" NOT NULL DEFAULT 'weekly',
    "subscription_tier" "SubscriptionTier" NOT NULL DEFAULT 'free',
    "subscription_expires" TIMESTAMP(3),
    "stripe_customer_id" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "species" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "scientific_name" TEXT NOT NULL,
    "common_names" TEXT[],
    "family" TEXT NOT NULL,
    "genus" TEXT NOT NULL,
    "light_requirement" TEXT NOT NULL,
    "water_frequency" TEXT NOT NULL,
    "humidity_level" TEXT NOT NULL,
    "temperature" TEXT NOT NULL,
    "toxicity" TEXT,
    "difficulty" TEXT NOT NULL,
    "description" TEXT,
    "propagation_methods" TEXT[],
    "common_issues" TEXT[],
    "plant_id_species_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plants" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "species_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "nickname" TEXT,
    "acquired_date" TIMESTAMP(3),
    "acquisition_method" "AcquisitionMethod" NOT NULL DEFAULT 'unknown',
    "location_in_home" TEXT NOT NULL,
    "light_exposure" "LightCondition" NOT NULL,
    "watering_frequency_days" INTEGER NOT NULL DEFAULT 7,
    "last_watered" TIMESTAMP(3),
    "next_water_due" TIMESTAMP(3),
    "fertilizing_frequency_weeks" INTEGER NOT NULL DEFAULT 4,
    "last_fertilized" TIMESTAMP(3),
    "last_repotted" TIMESTAMP(3),
    "current_health" "PlantHealth" NOT NULL DEFAULT 'healthy',

    CONSTRAINT "plants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plant_photos" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "plant_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storage_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "type" TEXT NOT NULL,
    "taken_at" TIMESTAMP(3) NOT NULL,
    "file_size" INTEGER NOT NULL,

    CONSTRAINT "plant_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "plant_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "CareAction" NOT NULL,
    "custom_action" TEXT,
    "performed_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "care_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_issues" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "plant_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "issue_type" "IssueType" NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "symptoms" TEXT[],
    "treatment_plan" TEXT,
    "cause" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'active',
    "reported_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "diagnosis_source" TEXT,
    "ai_session_id" UUID,

    CONSTRAINT "health_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_steps" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "health_issue_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "step_order" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "timeline" TEXT,
    "priority" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "treatment_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_sessions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "plant_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "last_message_at" TIMESTAMP(3) NOT NULL,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "total_input_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_output_tokens" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "models_used" TEXT[],

    CONSTRAINT "conversation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "session_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "model_used" TEXT,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "action_items" JSONB,
    "plants_mentioned" UUID[],
    "issues_identified" UUID[],

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semantic_memories" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content_type" "ContentType" NOT NULL,
    "content_text" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "source_session_id" UUID,
    "source_plant_id" UUID,
    "relevance_score" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "semantic_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "plant_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "action" "CareAction" NOT NULL,
    "custom_action" TEXT,
    "due_date" TIMESTAMP(3) NOT NULL,
    "priority" "ReminderPriority" NOT NULL DEFAULT 'medium',
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_frequency" TEXT,
    "recurring_interval" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "skipped_at" TIMESTAMP(3),

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "endpoint" TEXT,
    "latency_ms" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_code" TEXT,

    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "species_scientific_name_key" ON "species"("scientific_name");

-- CreateIndex
CREATE INDEX "plants_user_id_idx" ON "plants"("user_id");

-- CreateIndex
CREATE INDEX "plants_user_id_current_health_idx" ON "plants"("user_id", "current_health");

-- CreateIndex
CREATE INDEX "plants_user_id_next_water_due_idx" ON "plants"("user_id", "next_water_due");

-- CreateIndex
CREATE INDEX "plant_photos_plant_id_idx" ON "plant_photos"("plant_id");

-- CreateIndex
CREATE INDEX "plant_photos_plant_id_type_idx" ON "plant_photos"("plant_id", "type");

-- CreateIndex
CREATE INDEX "care_logs_plant_id_idx" ON "care_logs"("plant_id");

-- CreateIndex
CREATE INDEX "care_logs_plant_id_performed_at_idx" ON "care_logs"("plant_id", "performed_at");

-- CreateIndex
CREATE INDEX "health_issues_plant_id_idx" ON "health_issues"("plant_id");

-- CreateIndex
CREATE INDEX "health_issues_plant_id_status_idx" ON "health_issues"("plant_id", "status");

-- CreateIndex
CREATE INDEX "treatment_steps_health_issue_id_idx" ON "treatment_steps"("health_issue_id");

-- CreateIndex
CREATE INDEX "conversation_sessions_user_id_idx" ON "conversation_sessions"("user_id");

-- CreateIndex
CREATE INDEX "conversation_sessions_user_id_last_message_at_idx" ON "conversation_sessions"("user_id", "last_message_at");

-- CreateIndex
CREATE INDEX "conversation_sessions_plant_id_idx" ON "conversation_sessions"("plant_id");

-- CreateIndex
CREATE INDEX "messages_session_id_idx" ON "messages"("session_id");

-- CreateIndex
CREATE INDEX "messages_session_id_created_at_idx" ON "messages"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "semantic_memories_user_id_idx" ON "semantic_memories"("user_id");

-- CreateIndex
CREATE INDEX "reminders_user_id_idx" ON "reminders"("user_id");

-- CreateIndex
CREATE INDEX "reminders_user_id_due_date_idx" ON "reminders"("user_id", "due_date");

-- CreateIndex
CREATE INDEX "reminders_user_id_completed_due_date_idx" ON "reminders"("user_id", "completed", "due_date");

-- CreateIndex
CREATE INDEX "usage_logs_user_id_idx" ON "usage_logs"("user_id");

-- CreateIndex
CREATE INDEX "usage_logs_user_id_action_created_at_idx" ON "usage_logs"("user_id", "action", "created_at");

-- CreateIndex
CREATE INDEX "usage_logs_created_at_idx" ON "usage_logs"("created_at");

-- AddForeignKey
ALTER TABLE "plants" ADD CONSTRAINT "plants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plants" ADD CONSTRAINT "plants_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plant_photos" ADD CONSTRAINT "plant_photos_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_logs" ADD CONSTRAINT "care_logs_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_issues" ADD CONSTRAINT "health_issues_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_steps" ADD CONSTRAINT "treatment_steps_health_issue_id_fkey" FOREIGN KEY ("health_issue_id") REFERENCES "health_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semantic_memories" ADD CONSTRAINT "semantic_memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
