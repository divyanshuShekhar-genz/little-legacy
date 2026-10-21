import type { Prisma } from '@prisma/client';

/** Plain JSON for a Prisma Json column (Dates → ISO strings); null/undefined → undefined. */
export const toJson = (value: unknown): Prisma.InputJsonValue | undefined =>
  value === undefined || value === null ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);

/** Trims string input in DTOs: `@Transform(trim)`. */
export const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
