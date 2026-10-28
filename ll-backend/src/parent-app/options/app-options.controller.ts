import { Controller, Get } from '@nestjs/common';
import { PARENT_LANGUAGES } from '../../common/rules';
import { PrismaService } from '../../prisma/prisma.service';

/** Public lists for the sign-up and profile screens (docs/PARENT_API.md → Options). No sign-in needed. */
@Controller('app')
export class AppOptionsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Countries (enabled ones, by name) and languages. `learningAvailable` is false where there is no
   * active regional learning category (CR2): the parent can sign up, but can't add a child yet.
   */
  @Get('options')
  async options() {
    const countries = await this.prisma.country.findMany({
      where: { enabled: true },
      orderBy: { name: 'asc' },
      select: { code: true, name: true, currency: true, learningRegion: { select: { active: true } } },
    });
    return {
      countries: countries.map((c) => ({ code: c.code, name: c.name, currency: c.currency, learningAvailable: c.learningRegion?.active ?? false })),
      languages: PARENT_LANGUAGES.map((l) => ({ code: l.code, name: l.name })),
    };
  }

  /**
   * "Terms and conditions" and "privacy policy" from the latest published App Content version
   * (sign-up links). `version` is what accepting records; all null before the first publish.
   */
  @Get('legal')
  async legal() {
    const latest = await this.prisma.appContentVersion.findFirst({ orderBy: { version: 'desc' } });
    const entries = Object.values((latest?.entries ?? {}) as Record<string, { surface: string; title: string; body: string }>);
    const pick = (surface: string) => {
      const e = entries.find((x) => x.surface === surface);
      return e ? { title: e.title, body: e.body } : null;
    };
    return { version: latest?.version ?? null, terms: pick('TERMS'), privacy: pick('PRIVACY') };
  }
}
