"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequireSection = exports.SECTION_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.SECTION_KEY = 'section';
const RequireSection = (section) => (0, common_1.SetMetadata)(exports.SECTION_KEY, section);
exports.RequireSection = RequireSection;
//# sourceMappingURL=section.decorator.js.map