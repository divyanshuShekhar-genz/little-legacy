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
exports.ListOrdersDto = exports.UpdateOrderDto = exports.OrderAddressDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const rules_1 = require("../../../common/rules");
const json_1 = require("../../../common/utils/json");
const blankToNull = ({ value }) => (typeof value === 'string' ? value.trim() || null : value);
const STATUS = 'Choose an order status.';
const ADDRESS = 'Enter the recipient, address line 1, city and postcode.';
const LINK = 'Enter a valid tracking link.';
class OrderAddressDto {
}
exports.OrderAddressDto = OrderAddressDto;
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: ADDRESS }),
    (0, class_validator_1.IsNotEmpty)({ message: ADDRESS }),
    __metadata("design:type", String)
], OrderAddressDto.prototype, "recipient", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: ADDRESS }),
    (0, class_validator_1.IsNotEmpty)({ message: ADDRESS }),
    __metadata("design:type", String)
], OrderAddressDto.prototype, "line1", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)({ message: ADDRESS }),
    __metadata("design:type", Object)
], OrderAddressDto.prototype, "line2", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: ADDRESS }),
    (0, class_validator_1.IsNotEmpty)({ message: ADDRESS }),
    __metadata("design:type", String)
], OrderAddressDto.prototype, "city", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)({ message: ADDRESS }),
    __metadata("design:type", Object)
], OrderAddressDto.prototype, "state", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: ADDRESS }),
    (0, class_validator_1.IsNotEmpty)({ message: ADDRESS }),
    __metadata("design:type", String)
], OrderAddressDto.prototype, "postcode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)({ message: ADDRESS }),
    __metadata("design:type", Object)
], OrderAddressDto.prototype, "phone", void 0);
class UpdateOrderDto {
}
exports.UpdateOrderDto = UpdateOrderDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(rules_1.ORDER_STATUSES, { message: STATUS }),
    __metadata("design:type", String)
], UpdateOrderDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", Object)
], UpdateOrderDto.prototype, "trackingRef", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)({ message: LINK }),
    (0, class_validator_1.MaxLength)(2000, { message: LINK }),
    (0, class_validator_1.Matches)(/^https?:\/\/\S+$/i, { message: LINK }),
    __metadata("design:type", Object)
], UpdateOrderDto.prototype, "trackingUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)({ message: ADDRESS }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => OrderAddressDto),
    __metadata("design:type", OrderAddressDto)
], UpdateOrderDto.prototype, "address", void 0);
class ListOrdersDto {
}
exports.ListOrdersDto = ListOrdersDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsIn)(rules_1.ORDER_STATUSES, { message: STATUS }),
    __metadata("design:type", Object)
], ListOrdersDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], ListOrdersDto.prototype, "country", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], ListOrdersDto.prototype, "search", void 0);
//# sourceMappingURL=order.dto.js.map