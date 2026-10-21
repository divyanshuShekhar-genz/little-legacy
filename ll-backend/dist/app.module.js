"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("./prisma/prisma.module");
const audit_module_1 = require("./modules/audit/audit.module");
const drafts_module_1 = require("./modules/drafts/drafts.module");
const settings_module_1 = require("./modules/settings/settings.module");
const health_module_1 = require("./modules/health/health.module");
const auth_module_1 = require("./modules/auth/auth.module");
const admins_module_1 = require("./modules/admins/admins.module");
const overview_module_1 = require("./modules/overview/overview.module");
const users_module_1 = require("./modules/users/users.module");
const children_module_1 = require("./modules/children/children.module");
const community_module_1 = require("./modules/community/community.module");
const feedback_module_1 = require("./modules/feedback/feedback.module");
const enquiries_module_1 = require("./modules/enquiries/enquiries.module");
const activity_reviews_module_1 = require("./modules/activity-reviews/activity-reviews.module");
const countries_module_1 = require("./modules/countries/countries.module");
const regions_module_1 = require("./modules/regions/regions.module");
const areas_module_1 = require("./modules/areas/areas.module");
const age_groups_module_1 = require("./modules/age-groups/age-groups.module");
const categories_module_1 = require("./modules/categories/categories.module");
const levels_module_1 = require("./modules/levels/levels.module");
const activities_module_1 = require("./modules/activities/activities.module");
const questions_module_1 = require("./modules/questions/questions.module");
const assessment_rules_module_1 = require("./modules/assessment-rules/assessment-rules.module");
const skills_module_1 = require("./modules/skills/skills.module");
const progression_module_1 = require("./modules/progression/progression.module");
const activity_groups_module_1 = require("./modules/activity-groups/activity-groups.module");
const library_module_1 = require("./modules/library/library.module");
const plans_module_1 = require("./modules/plans/plans.module");
const products_module_1 = require("./modules/products/products.module");
const orders_module_1 = require("./modules/orders/orders.module");
const campaigns_module_1 = require("./modules/campaigns/campaigns.module");
const checklist_module_1 = require("./modules/checklist/checklist.module");
const app_content_module_1 = require("./modules/app-content/app-content.module");
const country_access_module_1 = require("./modules/country-access/country-access.module");
const uploads_module_1 = require("./modules/uploads/uploads.module");
const exports_module_1 = require("./modules/exports/exports.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            audit_module_1.AuditModule,
            drafts_module_1.DraftsModule,
            settings_module_1.SettingsModule,
            health_module_1.HealthModule,
            auth_module_1.AuthModule,
            admins_module_1.AdminsModule,
            overview_module_1.OverviewModule,
            users_module_1.UsersModule,
            children_module_1.ChildrenModule,
            community_module_1.CommunityModule,
            feedback_module_1.FeedbackModule,
            enquiries_module_1.EnquiriesModule,
            activity_reviews_module_1.ActivityReviewsModule,
            countries_module_1.CountriesModule,
            regions_module_1.RegionsModule,
            areas_module_1.AreasModule,
            age_groups_module_1.AgeGroupsModule,
            categories_module_1.CategoriesModule,
            levels_module_1.LevelsModule,
            activities_module_1.ActivitiesModule,
            questions_module_1.QuestionsModule,
            assessment_rules_module_1.AssessmentRulesModule,
            skills_module_1.SkillsModule,
            progression_module_1.ProgressionModule,
            activity_groups_module_1.ActivityGroupsModule,
            library_module_1.LibraryModule,
            plans_module_1.PlansModule,
            products_module_1.ProductsModule,
            orders_module_1.OrdersModule,
            campaigns_module_1.CampaignsModule,
            checklist_module_1.ChecklistModule,
            app_content_module_1.AppContentModule,
            country_access_module_1.CountryAccessModule,
            uploads_module_1.UploadsModule,
            exports_module_1.ExportsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map