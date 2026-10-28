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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaveCampaignDto = exports.AudienceDto = exports.CampaignFiltersDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const rules_1 = require("../../../common/rules");
const json_1 = require("../../../common/utils/json");
const FILTERS = 'Choose filters from the lists.';
const TEXT = 'Enter a notification title and message.';
const RECIPIENTS = 'Choose recipients and at least one channel.';
const blankToUndefined = ({ value }) => (typeof value === 'string' ? value.trim() || undefined : value === null ? undefined : value);
class CampaignFiltersDto {
}
exports.CampaignFiltersDto = CampaignFiltersDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)({ message: FILTERS }),
    (0, class_validator_1.IsString)({ each: true, message: FILTERS }),
    __metadata("design:type", Array)
], CampaignFiltersDto.prototype, "regionIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)({ message: FILTERS }),
    (0, class_validator_1.IsString)({ each: true, message: FILTERS }),
    __metadata("design:type", Array)
], CampaignFiltersDto.prototype, "countryCodes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToUndefined),
    (0, class_validator_1.IsString)({ message: FILTERS }),
    __metadata("design:type", String)
], CampaignFiltersDto.prototype, "areaId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToUndefined),
    (0, class_validator_1.IsInt)({ message: FILTERS }),
    (0, class_validator_1.Min)(0, { message: FILTERS }),
    __metadata("design:type", Number)
], CampaignFiltersDto.prototype, "age", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToUndefined),
    (0, class_validator_1.IsInt)({ message: FILTERS }),
    (0, class_validator_1.Min)(1, { message: FILTERS }),
    __metadata("design:type", Number)
], CampaignFiltersDto.prototype, "level", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToUndefined),
    (0, class_validator_1.IsIn)(rules_1.PLAN_TIERS, { message: FILTERS }),
    __metadata("design:type", String)
], CampaignFiltersDto.prototype, "plan", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToUndefined),
    (0, class_validator_1.IsIn)(rules_1.CHILD_GENDERS, { message: FILTERS }),
    __metadata("design:type", String)
], CampaignFiltersDto.prototype, "gender", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToUndefined),
    (0, class_validator_1.IsString)({ message: FILTERS }),
    __metadata("design:type", String)
], CampaignFiltersDto.prototype, "storyCategoryId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToUndefined),
    (0, class_validator_1.IsString)({ message: FILTERS }),
    __metadata("design:type", String)
], CampaignFiltersDto.prototype, "rhymeCategoryId", void 0);
class AudienceDto {
}
exports.AudienceDto = AudienceDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)({ message: FILTERS }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CampaignFiltersDto),
    __metadata("design:type", CampaignFiltersDto)
], AudienceDto.prototype, "filters", void 0);
class SaveCampaignDto {
}
exports.SaveCampaignDto = SaveCampaignDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], SaveCampaignDto.prototype, "mode", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: TEXT }),
    (0, class_validator_1.IsNotEmpty)({ message: TEXT }),
    __metadata("design:type", String)
], SaveCampaignDto.prototype, "title", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: TEXT }),
    (0, class_validator_1.IsNotEmpty)({ message: TEXT }),
    __metadata("design:type", String)
], SaveCampaignDto.prototype, "message", void 0);
__decorate([
    (0, class_validator_1.IsArray)({ message: RECIPIENTS }),
    (0, class_validator_1.ArrayMinSize)(1, { message: RECIPIENTS }),
    (0, class_validator_1.ArrayUnique)({ message: RECIPIENTS }),
    (0, class_validator_1.IsIn)(rules_1.NOTIFICATION_CHANNELS, { each: true, message: RECIPIENTS }),
    __metadata("design:type", Array)
], SaveCampaignDto.prototype, "channels", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)({ message: FILTERS }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CampaignFiltersDto),
    __metadata("design:type", CampaignFiltersDto)
], SaveCampaignDto.prototype, "filters", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToUndefined),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaveCampaignDto.prototype, "draftId", void 0);
//# sourceMappingURL=campaign.dto.js.map