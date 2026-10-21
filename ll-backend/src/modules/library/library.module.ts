import { Module } from '@nestjs/common';
import { StoriesController } from './stories.controller';
import { RhymesController } from './rhymes.controller';
import { LibraryCategoriesController } from './library-categories.controller';
import { LibraryService } from './library.service';
import { LibraryCategoriesService } from './library-categories.service';

/** Stories + Rhymes (one shared model and service) and their categories. */
@Module({
  controllers: [StoriesController, RhymesController, LibraryCategoriesController],
  providers: [LibraryService, LibraryCategoriesService],
})
export class LibraryModule {}
