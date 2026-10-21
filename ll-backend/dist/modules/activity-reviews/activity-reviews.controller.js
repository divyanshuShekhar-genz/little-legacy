"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityReviewsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../../common/guards/jwt.guard");
const section_guard_1 = require("../../common/guards/section.guard");
const section_decorator_1 = require("../../common/decorators/section.decorator");
const activity_reviews_service_1 = require("./activity-reviews.service");
const list_activity_reviews_query_dto_1 = require("./dto/list-activity-reviews.query.dto");
let ActivityReviewsController = class ActivityReviewsController {
    constructor(reviews) {
        this.reviews = reviews;
    }
    list(query) {
        return this.reviews.list(query);
    }
};
exports.ActivityReviewsController = ActivityReviewsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_activity_reviews_query_dto_1.ListActivityReviewsQueryDto]),
    __metadata("design:returntype", void 0)
], ActivityReviewsController.prototype, "list", null);
exports.ActivityReviewsController = ActivityReviewsController = __decorate([
    (0, common_1.Controller)('activity-reviews'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, section_guard_1.SectionGuard),
    (0, section_decorator_1.RequireSection)('activityReviews'),
    __metadata("design:paramtypes", [activity_reviews_service_1.ActivityReviewsService])
], ActivityReviewsController);
//# sourceMappingURL=activity-reviews.controller.js.map