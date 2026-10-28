import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { DraftsModule } from './modules/drafts/drafts.module';
import { SettingsModule } from './modules/settings/settings.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminsModule } from './modules/admins/admins.module';
import { OverviewModule } from './modules/overview/overview.module';
import { UsersModule } from './modules/users/users.module';
import { ChildrenModule } from './modules/children/children.module';
import { CommunityModule } from './modules/community/community.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { EnquiriesModule } from './modules/enquiries/enquiries.module';
import { ActivityReviewsModule } from './modules/activity-reviews/activity-reviews.module';
import { CountriesModule } from './modules/countries/countries.module';
import { RegionsModule } from './modules/regions/regions.module';
import { AreasModule } from './modules/areas/areas.module';
import { AgeGroupsModule } from './modules/age-groups/age-groups.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { LevelsModule } from './modules/levels/levels.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { AssessmentRulesModule } from './modules/assessment-rules/assessment-rules.module';
import { SkillsModule } from './modules/skills/skills.module';
import { ProgressionModule } from './modules/progression/progression.module';
import { ActivityGroupsModule } from './modules/activity-groups/activity-groups.module';
import { LibraryModule } from './modules/library/library.module';
import { PlansModule } from './modules/plans/plans.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { ChecklistModule } from './modules/checklist/checklist.module';
import { AppContentModule } from './modules/app-content/app-content.module';
import { CountryAccessModule } from './modules/country-access/country-access.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ExportsModule } from './modules/exports/exports.module';
import { EmailModule } from './common/email/email.module';
import { ParentAppModule } from './parent-app/parent-app.module';

@Module({
  imports: [
    // Global infrastructure — injectable everywhere.
    PrismaModule,
    AuditModule,
    DraftsModule,
    SettingsModule,
    EmailModule,

    // Feature modules (one per admin-panel area). Add new ones here.
    HealthModule,
    AuthModule,
    AdminsModule,
    OverviewModule,
    UsersModule,
    ChildrenModule,
    CommunityModule,
    FeedbackModule,
    EnquiriesModule,
    ActivityReviewsModule,
    CountriesModule,
    RegionsModule,
    AreasModule,
    AgeGroupsModule,
    CategoriesModule,
    LevelsModule,
    ActivitiesModule,
    QuestionsModule,
    AssessmentRulesModule,
    SkillsModule,
    ProgressionModule,
    ActivityGroupsModule,
    LibraryModule,
    PlansModule,
    ProductsModule,
    OrdersModule,
    CampaignsModule,
    ChecklistModule,
    AppContentModule,
    CountryAccessModule,
    UploadsModule,
    ExportsModule,

    // The parent mobile app's API (/api/app), kept apart from the admin modules.
    ParentAppModule,
  ],
})
export class AppModule {}
