import { Body, Controller, Get, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentParent } from '../common/current-parent.decorator';
import { ParentAuthGuard } from '../common/parent-auth.guard';
import type { SessionParent } from '../common/session-parent';
import { AccountService } from './account.service';
import { ChangePasswordDto, DeleteAccountDto, UpdateAccountDto } from './dto/account.dto';

/** The signed-in parent's account (docs/PARENT_API.md → Account). Each returns `{ parent }`, except delete. */
@Controller('app/me')
@UseGuards(ParentAuthGuard)
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get()
  get(@CurrentParent() parent: SessionParent) {
    return this.account.get(parent);
  }

  @Patch()
  update(@CurrentParent() parent: SessionParent, @Body() dto: UpdateAccountDto) {
    return this.account.update(parent, dto);
  }

  @Post('password')
  @HttpCode(200)
  changePassword(@CurrentParent() parent: SessionParent, @Body() dto: ChangePasswordDto) {
    return this.account.changePassword(parent, dto);
  }

  /** POST, not DELETE: it carries the password, and some clients and proxies drop a DELETE body. */
  @Post('delete')
  @HttpCode(200)
  delete(@CurrentParent() parent: SessionParent, @Body() dto: DeleteAccountDto) {
    return this.account.delete(parent, dto);
  }
}
