-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'SUB_ADMIN');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PLUS', 'PREMIUM');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "QuestionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "SkillStage" AS ENUM ('STARTING', 'PRACTISING', 'CONFIDENT');

-- CreateEnum
CREATE TYPE "CompletionOutcome" AS ENUM ('INDEPENDENT', 'WITH_HELP', 'NOT_COMPLETED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'COMPLETED', 'PENDING', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LibraryKind" AS ENUM ('STORY', 'RHYME');

-- CreateEnum
CREATE TYPE "CommunityAuthorType" AS ENUM ('PARENT', 'TEAM');

-- CreateEnum
CREATE TYPE "CommunityPostStatus" AS ENUM ('AWAITING_MODERATION', 'DRAFT', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PAID', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RestrictionType" AS ENUM ('ACTIVITIES_SECTION', 'ACTIVITY', 'LEVEL', 'STORIES', 'RHYMES', 'COMMUNITY', 'ECOMMERCE');

-- CreateEnum
CREATE TYPE "AppContentSurface" AS ENUM ('TERMS', 'PRIVACY', 'HELP', 'PAGE_FAQ');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'SUB_ADMIN',
    "permissions" TEXT[],
    "directPublish" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "actorRole" "AdminRole" NOT NULL,
    "action" TEXT NOT NULL,
    "section" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draft_approvals" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "regionId" TEXT,
    "before" JSONB,
    "after" JSONB NOT NULL,
    "status" "DraftStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "countries" (
    "code" CHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "deliveryCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deliveryEstimate" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "learningRegionId" TEXT,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "learning_regions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_restrictions" (
    "id" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "type" "RestrictionType" NOT NULL,
    "targetId" TEXT,
    "message" TEXT NOT NULL DEFAULT 'This content is not available in your country.',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "country_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_field_settings" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "collected" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "child_field_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "countryCode" CHAR(2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "children" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dob" DATE,
    "dobCorrectedAt" TIMESTAMP(3),
    "regionId" TEXT NOT NULL,
    "cycleStartedAt" TIMESTAMP(3),
    "trialStartedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_subscriptions" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "plan" "PlanTier" NOT NULL,
    "isTrial" BOOLEAN NOT NULL DEFAULT false,
    "countryCode" CHAR(2) NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "child_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "development_areas" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "development_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_categories" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "activity_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "age_groups" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "age" INTEGER NOT NULL,

    CONSTRAINT "age_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "levels" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "categoryId" TEXT,
    "number" INTEGER NOT NULL,
    "title" TEXT,
    "icon" TEXT,
    "iconColor" TEXT,
    "requiredScore" INTEGER NOT NULL DEFAULT 0,
    "requiredMastered" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "age" INTEGER,
    "text" TEXT NOT NULL,
    "difficulty" "QuestionDifficulty" NOT NULL DEFAULT 'EASY',
    "position" INTEGER NOT NULL DEFAULT 0,
    "skillId" TEXT,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "marks" DECIMAL(8,2) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "skillStage" "SkillStage",

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_expectations" (
    "skillId" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "expectedScore" INTEGER NOT NULL,

    CONSTRAINT "skill_expectations_pkey" PRIMARY KEY ("skillId","age")
);

-- CreateTable
CREATE TABLE "activity_families" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "categoryId" TEXT,
    "age" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "skillId" TEXT,
    "benchmark" INTEGER NOT NULL DEFAULT 50,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "baseEligibility" INTEGER[],
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "activity_families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "categoryId" TEXT,
    "levelId" TEXT,
    "familyId" TEXT,
    "difficultyLevel" INTEGER,
    "age" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "materials" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "minimumPlan" "PlanTier" NOT NULL DEFAULT 'FREE',
    "baseMarks" INTEGER NOT NULL,
    "masteryTarget" INTEGER NOT NULL,
    "skillId" TEXT,
    "skillStage" "SkillStage" NOT NULL DEFAULT 'STARTING',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_steps" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "activity_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_previews" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "caption" TEXT,

    CONSTRAINT "activity_previews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_configs" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "rules" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mandatory_activities" (
    "regionId" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "areaId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,

    CONSTRAINT "mandatory_activities_pkey" PRIMARY KEY ("regionId","age","areaId","activityId")
);

-- CreateTable
CREATE TABLE "progression_settings" (
    "regionId" TEXT NOT NULL,
    "weeklyLimit" INTEGER NOT NULL DEFAULT 20,
    "maxVisible" INTEGER,
    "pendingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pendingLimit" INTEGER NOT NULL DEFAULT 10,
    "pendingExpiryDays" INTEGER NOT NULL DEFAULT 28,
    "pendingCountsTowardLimit" BOOLEAN NOT NULL DEFAULT false,
    "recentCount" INTEGER NOT NULL DEFAULT 5,
    "continueCount" INTEGER NOT NULL DEFAULT 4,
    "resetDay" TEXT NOT NULL DEFAULT 'anniversary',
    "reinforcement" TEXT NOT NULL DEFAULT 'same',
    "overrides" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progression_settings_pkey" PRIMARY KEY ("regionId")
);

-- CreateTable
CREATE TABLE "development_bases" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "fromPercent" INTEGER NOT NULL,
    "startDifficulty" INTEGER NOT NULL,

    CONSTRAINT "development_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_submissions" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "areaScores" JSONB NOT NULL,
    "overallPercent" DECIMAL(6,2),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaire_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_attempts" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "outcome" "CompletionOutcome" NOT NULL,
    "points" DECIMAL(10,2) NOT NULL,
    "baseMarks" INTEGER NOT NULL,
    "repeat" INTEGER NOT NULL,
    "wasMandatory" BOOLEAN NOT NULL DEFAULT false,
    "elapsedSeconds" INTEGER,
    "cycleWeek" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_feedback" (
    "attemptId" TEXT NOT NULL,
    "difficulty" TEXT,
    "enjoyment" TEXT,
    "note" TEXT,

    CONSTRAINT "activity_feedback_pkey" PRIMARY KEY ("attemptId")
);

-- CreateTable
CREATE TABLE "child_area_levels" (
    "childId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL DEFAULT '',
    "level" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_area_levels_pkey" PRIMARY KEY ("childId","areaId","categoryId")
);

-- CreateTable
CREATE TABLE "child_family_stages" (
    "childId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_family_stages_pkey" PRIMARY KEY ("childId","familyId")
);

-- CreateTable
CREATE TABLE "weekly_assignments" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "cycleWeek" INTEGER NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_categories" (
    "id" TEXT NOT NULL,
    "kind" "LibraryKind" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "library_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_items" (
    "id" TEXT NOT NULL,
    "kind" "LibraryKind" NOT NULL,
    "title" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "coverUrl" TEXT,
    "description" TEXT,
    "mediaUrl" TEXT,
    "minimumPlan" "PlanTier" NOT NULL DEFAULT 'FREE',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_chapters" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "musicUrl" TEXT,

    CONSTRAINT "library_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_pages" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT,

    CONSTRAINT "library_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_page_images" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "library_page_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_history" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reading_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "parentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("parentId","itemId")
);

-- CreateTable
CREATE TABLE "library_engagement" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "library_engagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_posts" (
    "id" TEXT NOT NULL,
    "authorType" "CommunityAuthorType" NOT NULL,
    "parentId" TEXT,
    "title" TEXT,
    "originalMessage" TEXT,
    "message" TEXT NOT NULL,
    "imageUrl" TEXT,
    "status" "CommunityPostStatus" NOT NULL DEFAULT 'AWAITING_MODERATION',
    "rejectionReason" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "expiryHours" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiries" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiry_replies" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channels" "NotificationChannel"[],
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquiry_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "channels" "NotificationChannel"[],
    "route" TEXT,
    "campaignId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "channels" "NotificationChannel"[],
    "filters" JSONB NOT NULL,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "tier" "PlanTier" NOT NULL,
    "name" TEXT NOT NULL,
    "memoryLimit" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("tier")
);

-- CreateTable
CREATE TABLE "plan_prices" (
    "planTier" "PlanTier" NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "plan_prices_pkey" PRIMARY KEY ("planTier","countryCode")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "details" TEXT,
    "materials" TEXT,
    "ageRecommendation" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_prices" (
    "productId" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "product_prices_pkey" PRIMARY KEY ("productId","countryCode")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "parentId" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "deliveryCharge" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PAID',
    "address" JSONB NOT NULL,
    "trackingRef" TEXT,
    "trackingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "titleSnapshot" TEXT NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_content_entries" (
    "key" TEXT NOT NULL,
    "surface" "AppContentSurface" NOT NULL,
    "page" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_content_entries_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "app_content_versions" (
    "version" SERIAL NOT NULL,
    "entries" JSONB NOT NULL,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_content_versions_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_ticks" (
    "childId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "tickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_ticks_pkey" PRIMARY KEY ("childId","itemId")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "draft_approvals_status_createdAt_idx" ON "draft_approvals"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "learning_regions_name_key" ON "learning_regions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "country_restrictions_countryCode_type_targetId_key" ON "country_restrictions"("countryCode", "type", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "child_field_settings_regionId_field_key" ON "child_field_settings"("regionId", "field");

-- CreateIndex
CREATE UNIQUE INDEX "parents_email_key" ON "parents"("email");

-- CreateIndex
CREATE INDEX "child_subscriptions_childId_startsAt_idx" ON "child_subscriptions"("childId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "development_areas_regionId_name_key" ON "development_areas"("regionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "activity_categories_areaId_name_key" ON "activity_categories"("areaId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "age_groups_regionId_age_key" ON "age_groups"("regionId", "age");

-- CreateIndex
CREATE UNIQUE INDEX "levels_areaId_categoryId_number_key" ON "levels"("areaId", "categoryId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "skills_areaId_name_key" ON "skills"("areaId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "activity_families_areaId_age_name_key" ON "activity_families"("areaId", "age", "name");

-- CreateIndex
CREATE INDEX "activities_regionId_areaId_age_idx" ON "activities"("regionId", "areaId", "age");

-- CreateIndex
CREATE UNIQUE INDEX "activities_familyId_difficultyLevel_key" ON "activities"("familyId", "difficultyLevel");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_configs_regionId_revision_key" ON "assessment_configs"("regionId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "development_bases_regionId_position_key" ON "development_bases"("regionId", "position");

-- CreateIndex
CREATE INDEX "questionnaire_submissions_childId_isCurrent_idx" ON "questionnaire_submissions"("childId", "isCurrent");

-- CreateIndex
CREATE INDEX "activity_attempts_childId_activityId_idx" ON "activity_attempts"("childId", "activityId");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_assignments_childId_activityId_cycleWeek_key" ON "weekly_assignments"("childId", "activityId", "cycleWeek");

-- CreateIndex
CREATE UNIQUE INDEX "library_categories_kind_name_key" ON "library_categories"("kind", "name");

-- CreateIndex
CREATE INDEX "reading_history_childId_readAt_idx" ON "reading_history"("childId", "readAt");

-- CreateIndex
CREATE INDEX "library_engagement_categoryId_parentId_idx" ON "library_engagement"("categoryId", "parentId");

-- CreateIndex
CREATE INDEX "community_posts_status_expiresAt_idx" ON "community_posts"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "notifications_parentId_createdAt_idx" ON "notifications"("parentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "orders_number_key" ON "orders"("number");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_approvals" ADD CONSTRAINT "draft_approvals_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_approvals" ADD CONSTRAINT "draft_approvals_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "countries" ADD CONSTRAINT "countries_learningRegionId_fkey" FOREIGN KEY ("learningRegionId") REFERENCES "learning_regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_restrictions" ADD CONSTRAINT "country_restrictions_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_field_settings" ADD CONSTRAINT "child_field_settings_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "learning_regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parents" ADD CONSTRAINT "parents_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "learning_regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_subscriptions" ADD CONSTRAINT "child_subscriptions_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "development_areas" ADD CONSTRAINT "development_areas_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "learning_regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_categories" ADD CONSTRAINT "activity_categories_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "development_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "age_groups" ADD CONSTRAINT "age_groups_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "learning_regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "levels" ADD CONSTRAINT "levels_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "development_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "levels" ADD CONSTRAINT "levels_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "activity_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "development_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "development_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_expectations" ADD CONSTRAINT "skill_expectations_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_families" ADD CONSTRAINT "activity_families_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "learning_regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_families" ADD CONSTRAINT "activity_families_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "development_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_families" ADD CONSTRAINT "activity_families_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "activity_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_families" ADD CONSTRAINT "activity_families_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "learning_regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "development_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "activity_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "activity_families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_steps" ADD CONSTRAINT "activity_steps_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_previews" ADD CONSTRAINT "activity_previews_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_configs" ADD CONSTRAINT "assessment_configs_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "learning_regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mandatory_activities" ADD CONSTRAINT "mandatory_activities_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "learning_regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mandatory_activities" ADD CONSTRAINT "mandatory_activities_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "development_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mandatory_activities" ADD CONSTRAINT "mandatory_activities_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progression_settings" ADD CONSTRAINT "progression_settings_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "learning_regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "development_bases" ADD CONSTRAINT "development_bases_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "learning_regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_submissions" ADD CONSTRAINT "questionnaire_submissions_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_submissions" ADD CONSTRAINT "questionnaire_submissions_configId_fkey" FOREIGN KEY ("configId") REFERENCES "assessment_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_attempts" ADD CONSTRAINT "activity_attempts_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_attempts" ADD CONSTRAINT "activity_attempts_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_feedback" ADD CONSTRAINT "activity_feedback_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "activity_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_area_levels" ADD CONSTRAINT "child_area_levels_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_family_stages" ADD CONSTRAINT "child_family_stages_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_family_stages" ADD CONSTRAINT "child_family_stages_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "activity_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_assignments" ADD CONSTRAINT "weekly_assignments_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_assignments" ADD CONSTRAINT "weekly_assignments_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "library_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_chapters" ADD CONSTRAINT "library_chapters_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "library_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_pages" ADD CONSTRAINT "library_pages_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "library_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_page_images" ADD CONSTRAINT "library_page_images_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "library_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "library_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "library_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_engagement" ADD CONSTRAINT "library_engagement_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_engagement" ADD CONSTRAINT "library_engagement_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "library_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry_replies" ADD CONSTRAINT "enquiry_replies_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_planTier_fkey" FOREIGN KEY ("planTier") REFERENCES "plans"("tier") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_ticks" ADD CONSTRAINT "checklist_ticks_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_ticks" ADD CONSTRAINT "checklist_ticks_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "checklist_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
