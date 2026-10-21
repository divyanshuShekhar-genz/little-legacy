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
exports.ReplyDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const rules_1 = require("../../../common/rules");
const json_1 = require("../../../common/utils/json");
const CHANNELS = 'Select Email, In-app notification, or both.';
class ReplyDto {
}
exports.ReplyDto = ReplyDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], ReplyDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsArray)({ message: CHANNELS }),
    (0, class_validator_1.ArrayMinSize)(1, { message: CHANNELS }),
    (0, class_validator_1.ArrayUnique)({ message: CHANNELS }),
    (0, class_validator_1.IsIn)(rules_1.NOTIFICATION_CHANNELS, { each: true, message: CHANNELS }),
    __metadata("design:type", Array)
], ReplyDto.prototype, "channels", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: 'Enter a reply.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Enter a reply.' }),
    __metadata("design:type", String)
], ReplyDto.prototype, "body", void 0);
//# sourceMappingURL=reply.dto.js.map