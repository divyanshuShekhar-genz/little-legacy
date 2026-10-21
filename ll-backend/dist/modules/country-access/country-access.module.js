"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountryAccessModule = void 0;
const common_1 = require("@nestjs/common");
const country_access_controller_1 = require("./country-access.controller");
const country_access_service_1 = require("./country-access.service");
let CountryAccessModule = class CountryAccessModule {
};
exports.CountryAccessModule = CountryAccessModule;
exports.CountryAccessModule = CountryAccessModule = __decorate([
    (0, common_1.Module)({
        controllers: [country_access_controller_1.CountryAccessController],
        providers: [country_access_service_1.CountryAccessService],
    })
], CountryAccessModule);
//# sourceMappingURL=country-access.module.js.map