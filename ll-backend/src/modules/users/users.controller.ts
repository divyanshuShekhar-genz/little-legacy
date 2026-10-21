import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { UsersService } from './users.service';
import { ListUsersQueryDto } from './dto/list-users.query.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, SectionGuard)
@RequireSection('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query() query: ListUsersQueryDto) {
    return this.users.list(query);
  }
}
