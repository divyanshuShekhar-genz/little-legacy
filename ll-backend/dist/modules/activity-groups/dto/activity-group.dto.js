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
exports.LinkActivityDto = exports.GroupModeDto = exports.ActivityGroupDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const json_1 = require("../../../common/utils/json");
const blankToNull = ({ value }) => (typeof value === 'string' ? value.trim() || null : value);
const collapse = ({ value }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value);
const GROUP = 'Enter a name, whole age, benchmark from 0–100 and at least one Base.';
class ActivityGroupDto {
    constructor() {
        this.benchmark = 50;
        this.mandatory = false;
    }
}
exports.ActivityGroupDto = ActivityGroupDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], ActivityGroupDto.prototype, "mode", void 0);
__decorate([
    (0, class_transformer_1.Transform)(collapse),
    (0, class_validator_1.IsString)({ message: GROUP }),
    (0, class_validator_1.IsNotEmpty)({ message: GROUP }),
    __metadata("design:type", String)
], ActivityGroupDto.prototype, "name", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: 'Choose a development area.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Choose a development area.' }),
    __metadata("design:type", String)
], ActivityGroupDto.prototype, "areaId", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: GROUP }),
    (0, class_validator_1.Min)(0, { message: GROUP }),
    (0, class_validator_1.Max)(2_147_483_647, { message: GROUP }),
    __metadata("design:type", Number)
], ActivityGroupDto.prototype, "age", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], ActivityGroupDto.prototype, "categoryId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], ActivityGroupDto.prototype, "skillId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: GROUP }),
    (0, class_validator_1.Min)(0, { message: GROUP }),
    (0, class_validator_1.Max)(100, { message: GROUP }),
    __metadata("design:type", Number)
], ActivityGroupDto.prototype, "benchmark", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ActivityGroupDto.prototype, "mandatory", void 0);
__decorate([
    (0, class_validator_1.IsArray)({ message: GROUP }),
    (0, class_validator_1.ArrayMinSize)(1, { message: GROUP }),
    (0, class_validator_1.IsIn)(['Base 1', 'Base 2', 'Base 3'], { each: true, message: GROUP }),
    __metadata("design:type", Array)
], ActivityGroupDto.prototype, "bases", void 0);
class GroupModeDto {
}
exports.GroupModeDto = GroupModeDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], GroupModeDto.prototype, "mode", void 0);
class LinkActivityDto extends GroupModeDto {
}
exports.LinkActivityDto = LinkActivityDto;
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: 'Choose an activity.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Choose an activity.' }),
    __metadata("design:type", String)
], LinkActivityDto.prototype, "activityId", void 0);
//# sourceMappingURL=activity-group.dto.js.map