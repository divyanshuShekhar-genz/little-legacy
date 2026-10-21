"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let HttpExceptionFilter = class HttpExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger('HttpExceptionFilter');
    }
    catch(exception, host) {
        const res = host.switchToHttp().getResponse();
        const send = (status, message, details) => res.status(status).json({ error: details === undefined ? { message } : { message, details } });
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const body = exception.getResponse();
            const raw = typeof body === 'string' ? body : body.message;
            const messages = Array.isArray(raw) ? raw.map(String) : [String(raw ?? exception.message)];
            let message = messages[0] ?? 'Request failed';
            if (status === common_1.HttpStatus.UNAUTHORIZED && message === 'Unauthorized')
                message = 'Sign in to continue';
            if (status === common_1.HttpStatus.NOT_FOUND && message.startsWith('Cannot '))
                message = 'Not found';
            if (status === common_1.HttpStatus.PAYLOAD_TOO_LARGE)
                message = 'File is too large.';
            return send(status, message, messages.length > 1 ? messages : undefined);
        }
        if (exception instanceof client_1.Prisma.PrismaClientKnownRequestError && exception.code === 'P2002') {
            return send(common_1.HttpStatus.CONFLICT, 'A record with that value already exists');
        }
        if (exception instanceof client_1.Prisma.PrismaClientInitializationError) {
            this.logger.error(`Database unavailable: ${exception.message}`);
            return send(common_1.HttpStatus.SERVICE_UNAVAILABLE, 'Database unavailable — check DATABASE_URL and that Postgres is running');
        }
        this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
        return send(common_1.HttpStatus.INTERNAL_SERVER_ERROR, 'Internal server error');
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map