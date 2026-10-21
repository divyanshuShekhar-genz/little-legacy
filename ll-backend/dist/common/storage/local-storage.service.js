"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageService = exports.localUploadRoot = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const common_1 = require("@nestjs/common");
const env_1 = require("../config/env");
exports.localUploadRoot = node_path_1.default.resolve(process.cwd(), env_1.env.UPLOAD_DIR);
let LocalStorageService = class LocalStorageService {
    constructor() {
        this.name = 'local';
    }
    resolve(key) {
        const file = node_path_1.default.resolve(exports.localUploadRoot, key);
        if (!file.startsWith(exports.localUploadRoot + node_path_1.default.sep))
            throw new Error(`Invalid storage key: ${key}`);
        return file;
    }
    async put(key, body) {
        const file = this.resolve(key);
        await (0, promises_1.mkdir)(node_path_1.default.dirname(file), { recursive: true });
        await (0, promises_1.writeFile)(file, body, { flag: 'wx' });
        return { url: `${env_1.env.UPLOAD_PUBLIC_PATH}/${key}` };
    }
    async delete(key) {
        await (0, promises_1.rm)(this.resolve(key), { force: true });
    }
};
exports.LocalStorageService = LocalStorageService;
exports.LocalStorageService = LocalStorageService = __decorate([
    (0, common_1.Injectable)()
], LocalStorageService);
//# sourceMappingURL=local-storage.service.js.map