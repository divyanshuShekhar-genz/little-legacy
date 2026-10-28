"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogEmailService = void 0;
const common_1 = require("@nestjs/common");
let LogEmailService = class LogEmailService {
    constructor() {
        this.name = 'log';
        this.logger = new common_1.Logger('Email');
    }
    async send({ to, subject, text }) {
        this.logger.log(`To: ${to} · ${subject}\n${text}`);
    }
};
exports.LogEmailService = LogEmailService;
exports.LogEmailService = LogEmailService = __decorate([
    (0, common_1.Injectable)()
], LogEmailService);
//# sourceMappingURL=log-email.service.js.map