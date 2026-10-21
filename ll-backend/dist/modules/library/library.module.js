"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibraryModule = void 0;
const common_1 = require("@nestjs/common");
const stories_controller_1 = require("./stories.controller");
const rhymes_controller_1 = require("./rhymes.controller");
const library_categories_controller_1 = require("./library-categories.controller");
const library_service_1 = require("./library.service");
const library_categories_service_1 = require("./library-categories.service");
let LibraryModule = class LibraryModule {
};
exports.LibraryModule = LibraryModule;
exports.LibraryModule = LibraryModule = __decorate([
    (0, common_1.Module)({
        controllers: [stories_controller_1.StoriesController, rhymes_controller_1.RhymesController, library_categories_controller_1.LibraryCategoriesController],
        providers: [library_service_1.LibraryService, library_categories_service_1.LibraryCategoriesService],
    })
], LibraryModule);
//# sourceMappingURL=library.module.js.map