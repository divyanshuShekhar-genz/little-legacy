# Little Legacy

Little Legacy is the admin panel and API for an early-childhood learning product. Staff use the panel to prepare **activities, questionnaires, stories, rhymes, community posts, plans and shop products**. Parents then see the approved content in the Little Legacy mobile app, which lives in a separate repo.

The repo holds two independent projects, structured like the team's `pms2`:

| Folder | Stack | Purpose |
|---|---|---|
| [`ll-backend/`](ll-backend) | Node 20, NestJS 11, TypeScript, Prisma 5, PostgreSQL, JWT (Passport) | REST API, database schema, migrations, seeds, file uploads |
| [`ll-frontend/`](ll-frontend) | React 18, Vite, TypeScript, Tailwind, React Router, TanStack Query, react-hook-form | Admin panel web UI |

Each project has its own `package.json`, `package-lock.json`, `node_modules/` and `.env`. They share no code and only talk over HTTP (`/api`), so each side can be worked on independently.

## Quick start

Prerequisites: Node 20+, and PostgreSQL 16 or newer.

**1. Database.** Create the project's database user once.

Windows, using your `postgres` superuser password. Adjust `18` to your installed PostgreSQL version:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE ROLE little_legacy LOGIN PASSWORD 'little_legacy' CREATEDB;" -c "CREATE DATABASE little_legacy OWNER little_legacy;"
```

Linux (Ubuntu/Debian). The first line starts PostgreSQL now and on every boot:

```bash
sudo systemctl enable --now postgresql
sudo -u postgres psql -c "CREATE ROLE little_legacy LOGIN PASSWORD 'little_legacy' CREATEDB;" -c "CREATE DATABASE little_legacy OWNER little_legacy;"
```

`CREATEDB` is needed because `prisma migrate dev` creates a temporary database to check migrations.

**2. Backend** (terminal 1):

```bash
cd ll-backend
npm install
cp .env.example .env
npm run prisma:migrate     # create the tables from prisma/migrations
npm run prisma:seed:demo   # base data + dev demo users
npm run start:dev          # http://localhost:4000
```

**3. Frontend** (terminal 2):

```bash
cd ll-frontend
npm install
npm run dev                # http://localhost:5173
```

Sign in at http://localhost:5173 as `owner@littlelegacy.dev` / `ChangeMe123!`. You can change these in `ll-backend/.env` before seeding.

The demo seed also creates three Sub Admins with the same password, for testing section permissions and the draft workflow:
- `aditi@littlelegacy.dev`
- `neha@littlelegacy.dev`
- `rohan@littlelegacy.dev`

### Common problems

| Symptom | Cause | Fix |
|---|---|---|
| Login returns 503 "Database unavailable", or `P1000` authentication failed | Postgres isn't running, or the `little_legacy` user doesn't exist | Start PostgreSQL, or create the user (step 1) |
| Login returns 429 "Too many sign-in attempts" | More than 5 attempts for that email (or 30 from your IP) in 15 minutes | Wait 15 minutes, or restart the backend (the counters are in memory) |
| Login returns 401 with the right password | The database has no admin yet | `npm run prisma:seed:demo` in `ll-backend/` |
| Login says "Can’t reach the server" (the dev terminal shows `http proxy error … ECONNREFUSED`) | The backend isn't running, or is still starting (`start:dev` compiles first) | Start `npm run start:dev` in `ll-backend/` and wait for "Little Legacy API listening". A saved login survives this and restores itself once the backend is up |
| `EPERM … query_engine-windows.dll.node` during migrate/generate | The running backend holds Prisma's engine file (Windows) | Stop the backend, then run `npm run prisma:gen` |
| `Missing script: "…"` | The command was run in the wrong folder | Backend scripts run in `ll-backend/`, frontend scripts in `ll-frontend/` |
| Styles look stale after changing `tailwind.config.js` | Vite dev server cached the old config | Restart `npm run dev` |

## Scripts

**`ll-backend/`**

| Command | What it does |
|---|---|
| `npm run start:dev` | Run the API in watch mode (NestJS) |
| `npm run build` / `npm run start-prod` | Production build into `dist/` / run it |
| `npm run typecheck` | `tsc` over `src/` and `prisma/` |
| `npm test` | Vitest: business rules (worked examples from the client guide) and the draft conflict check |
| `npm run prisma:gen` | Generate the Prisma client |
| `npm run prisma:migrate -- --name <what_changed>` | After editing `schema.prisma`: create and apply a migration |
| `npm run prisma:seed` | Base data every environment needs (Super Admin, regions, countries, plans, areas, levels) |
| `npm run prisma:seed:demo` | Base data + development demo data (Sub Admins, test families, learning records, community posts). Refuses to run in production |
| `npm run prisma:reset` | Wipe the local database, re-apply all migrations, run the base seed |
| `npm run prisma:deploy` | Apply pending migrations on a server (staging/production) |
| `npm run prisma:studio` | Browse the database in Prisma Studio |

**`ll-frontend/`**

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on :5173 (proxies `/api` and `/uploads` to :4000) |
| `npm run build` / `npm run preview` | Typecheck + production build into `dist/` / preview it |
| `npm run typecheck` | `tsc` |

## Project structure

```
ll-backend/src/
  main.ts · app.module.ts
  prisma/            PrismaModule + PrismaService
  common/            config, guards, strategies, decorators, filters, storage, rules (+ tests), utils
  modules/<feature>/ <feature>.module.ts · .controller.ts · .service.ts · dto/
ll-backend/prisma/   schema.prisma · migrations/ · seed.ts · seeds/

ll-frontend/src/
  main.tsx · App.tsx · index.css
  api/               one file per backend resource (types + React Query hooks)
  views/<area>/      screens and their modals
  components/        layout/, ui/ (design system), library/ (story + rhyme editor pieces), shared building blocks
  hooks/             useAuth, RouteGuard
  constants/         navigation (nav + permissions), permissions, uploads, plans
  utils/             cn, format (incl. formatMoney), reorder, localStore (UI-only screens)
docs/                product spec, client prototype reference, open questions, API requests,
                     backend handover, frontend backlog
```

The full annotated tree, with what every folder and file is for, is in [CLAUDE.md → Project structure](CLAUDE.md#project-structure).

## API endpoints

Everything is under `/api`. All endpoints except `/api/health` and `/api/auth/login` need `Authorization: Bearer <token>`. Errors always have the shape `{ "error": { "message": "…", "details": … } }`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Liveness check |
| POST | `/api/auth/login` | Public | `{ email, password, remember }` → `{ token, admin }`. `remember` gives a 7-day session instead of 12 hours. Rate-limited: 5 attempts per email per IP and 30 per IP, every 15 minutes, then 429 "Too many sign-in attempts. Try again in a few minutes." |
| GET | `/api/auth/me` | Signed in | The current admin |
| GET | `/api/overview` | `overview` | Dashboard counters + children by learning level |
| GET | `/api/users?search=&age=` | `users` | Registered Users: one row per child, read only |
| GET | `/api/children?search=&area=` | `childLearning` | Children & Learning: questionnaire marks, activity marks, rules version. Read only |
| GET | `/api/children/:id/learning-record` | `childLearning` | Per-area questionnaire / activity / level, activity outcomes, unsuccessful attempts (admin only) |
| GET | `/api/community` | `community` | Parent messages, team messages, feed settings |
| POST | `/api/community/posts/:id/review` | `community` | Approve (optionally rephrased) / reject with a reason / save in draft. Notifies the parent |
| POST · PATCH | `/api/community/team-posts` · `/:id` | `community` | Create / edit a Little Legacy team post |
| PUT | `/api/community/settings` | `community` | Regular messages visible at once (pinned posts are extra) |
| GET | `/api/feedback` | `feedback` | Parent feedback: one row per completed activity record (difficulty, enjoyment, note), newest first |
| GET | `/api/countries` | Signed in | One country list: code, name, currency, delivery charge / estimate, availability, learning region |
| POST · PATCH | `/api/countries` · `/:code` | `subscriptions` or `shopOrders` | Add / edit a country (via drafts). Code and currency can't change; no delete |
| GET | `/api/regions` | Signed in | Regional learning categories with their countries and counts |
| GET | `/api/regions/export?regionId=` | Super Admin | "Export regional learning": every category's countries and live learning setup (or one category) as a JSON download |
| POST · PATCH · DELETE | `/api/regions` · `/:id` | Super Admin | Add / edit (name, countries, default, active) / remove a region, via drafts. New regions start empty and inactive |
| GET | `/api/areas?regionId=` · `/api/age-groups?regionId=` | Signed in | A region's development areas (with counts) / its age groups |
| POST · PATCH · DELETE | `/api/areas` · `/:id` | `developmentalMilestones` | Add / edit / delete an area, via drafts. An area with child history is removed (hidden, activities withdrawn) instead of deleted |
| POST | `/api/age-groups` | `developmentalMilestones` | Add an age (whole years, no upper limit), via drafts |
| GET | `/api/categories?areaId=` · `/api/levels?areaId=&categoryId=&age=` | Signed in | An area's categories (with counts) / one ladder of levels (with activity counts and `nextNumber`) |
| POST · PATCH · DELETE | `/api/categories` · `/:id` | `developmentalMilestones` | Add / edit / delete a category, via drafts. The first category takes the area's levels and activities |
| POST · PATCH · DELETE | `/api/levels` · `/:id` | `developmentalMilestones` or `questionnairesLevels` | Add / edit / delete a level, via drafts. Children's earned levels are saved first, so they never go down |
| GET | `/api/activities?regionId=&areaId=&categoryId=&levelId=&age=` · `/:id` | Signed in | Activity registry rows / one activity with steps, previews and `hasChildRecords` |
| POST · PATCH · DELETE | `/api/activities` · `/:id` | `activities` or `developmentalMilestones` | The activity editor (whole activity, steps, previews), via drafts. Delete withdraws an activity children have done |
| GET | `/api/questions?areaId=&age=` | Signed in | An area's questionnaire: questions with difficulty, age and answer options with marks (admin-only data) |
| POST · PATCH · DELETE | `/api/questions` · `/:id` | `questionnairesLevels` or `developmentalMilestones` | Add / edit (options updated in place by id) / delete a question, via drafts. An area keeps at least one question |
| GET · PUT | `/api/assessment-rules?regionId=` · `/api/assessment-rules` | `assessmentRules` | Formulas, weights, question weights, mandatory activities by age. Saving (via drafts) creates the next rules revision |
| POST | `/api/assessment-rules/preview` | `assessmentRules` | "Calculate preview": % per area (totals 100.00) and the weighted average, or "Not enough assessment data." |
| GET | `/api/skills?regionId=` | Signed in | Skills with their expected score per age and usage counts |
| POST · PATCH | `/api/skills` · `/:id` | `skillPersonalisation` | Add / edit a skill (name, area, expected % per age), via drafts. No delete |
| PUT | `/api/questions/:id/skill-map` | `skillPersonalisation` | "Map answers": the question's skill and a stage per answer option, via drafts |
| POST | `/api/skills/preview` | `skillPersonalisation` | "Preview child selection": a real child's skill evidence, mandatory candidates, suggestions with reasons, content gaps (read only) |
| GET · PUT | `/api/progression?regionId=` | `activityProgression` | Bases 1–3, weekly limit (+ optional `maxVisible`), pending policy, counts, reinforcement, weekly boundary, allocation overrides; saved together via drafts |
| GET | `/api/progression/export?regionId=` | `activityProgression` | JSON download of the region's progression settings and activity groups |
| POST | `/api/progression/preview?regionId=` | `activityProgression` | "Preview a child's week": the weekly allocation engine on a sample child (replays outcomes week by week; never touches real records) |
| GET · POST · PATCH | `/api/activity-groups?regionId=` · `/:id` | `activityProgression` | Activity groups (an activity with its own difficulty levels), via drafts |
| POST | `/api/activity-groups/:id/archive` · `/:id/link` | `activityProgression` | Archive a group (history kept) / link an existing activity as a difficulty |
| GET | `/api/activity-reviews?difficulty=` | `activityReviews` | Completed activity records (independently / with help) with parent feedback, repeat and active time, newest first. Read only |
| GET | `/api/enquiries` | `enquiries` | Parent enquiries, unresolved first then newest, each with its sent and unsent (draft / awaiting approval) replies |
| POST | `/api/enquiries/:id/reply` | `enquiries` | `{ mode, body, channels }`. Approve sends now (or makes a draft for a Sub Admin without direct publishing); Save in draft keeps it unsent. Sending notifies the parent on the chosen channels |
| GET | `/api/country-access?types=COMMUNITY` | Section of each rule type | Countries, the page's rule types + targets, and its restrictions |
| POST · PATCH · DELETE | `/api/country-access` · `/:id` | Section of each rule type | Add / edit / remove a restriction (via drafts). Duplicate country + target is refused |
| GET | `/api/country-access/preview?country=` · `/export` | Signed in / section | What each section and activity looks like in a country; JSON export of the rules |
| GET | `/api/drafts` | Signed in | Draft approvals (Super Admin: all; Sub Admin: own), with a readable `label`, `names` for every id, `context`, reviewer and review time |
| GET · POST | `/api/stories` · `/api/rhymes` | `stories` / `rhymes` | Library list (incl. never-published drafts) / save a whole story or rhyme (chapters → pages → stacked images), via one pending draft per item |
| GET · PATCH | `/api/stories/:id` · `/api/rhymes/:id` | `stories` / `rhymes` | Live content + the pending change / save |
| POST | `/api/stories/:id/reject` · `/api/rhymes/:id/reject` | Super Admin | The editor's Reject (a change waiting for approval) |
| GET · POST · PATCH · DELETE | `/api/library-categories?kind=` · `/:id` | `stories` / `rhymes` (by kind) | Story / rhyme categories: add, rename (or merge), delete with a replacement, via drafts |
| GET | `/api/plans` | `subscriptions` or `memories` | Free / Plus / Premium: memory allowance, status, prices per country (`"199.00"`), pending change |
| PATCH | `/api/plans/:tier` | `subscriptions` | Edit a plan (status, memory allowance, the full price map), via one pending change per plan. Free is always active and free |
| PUT | `/api/countries/:code/prices` | `subscriptions` (plans) · `shopOrders` (products) | "Edit prices · {country}": one change per plan or product whose price changes |
| GET · POST · PATCH | `/api/products` · `/:id` | `shopOrders` | Shop products (stock shared across countries, prices per country, images), via one pending change per product; ordered quantities by country |
| GET · POST · PATCH · DELETE | `/api/app-content` · `/entries` · `/entries/:key` · `/publish` | `appContent` | App Content: working-draft entries edited directly (audited); "Publish new version" via drafts (immutable versions, one pending publish) |
| GET · POST · PATCH · DELETE · PUT | `/api/checklist-items?regionId=` · `/:id` · `/settings` | `parentChecklist` | Parent checklist per regional category (Week 1 / Week 2 / Later weeks), via one pending change per item; visible limit per category |
| GET · POST | `/api/campaigns` · `/audience` | `notifications` | Notification campaigns: live audience count (AND filters, one message per parent), send or save via drafts (recounted at send), sent + waiting lists |
| GET | `/api/notifications/reminders` | `notifications` | Daily mandatory-activity reminders log (read only) |
| GET · PATCH | `/api/orders` · `/:id` | `shopOrders` | Orders: list (status, country, search), status / tracking / address updates applied directly, audited, the parent notified; closing a Paid or Packed order restocks |
| POST | `/api/products/:id/reject` | Super Admin | The product editor's Reject |
| POST | `/api/drafts/:id/approve` · `/reject` | Super Admin | Publish a draft (refused if content changed since) / reject with `{ reason }` |
| GET · POST · PATCH | `/api/admins` · `/api/admins/:id` | Super Admin | Team & Permissions. An email already in use (ignoring case) → 409 "An account already uses that email." |
| GET | `/api/audit?take=&cursor=` | Super Admin | Audit history, newest first |
| POST | `/api/uploads` | Signed in | Multipart `file` (+ optional `kind`). Returns `{ upload: { id, url, … } }` |
| GET | `/api/exports/parent-settings` · `/assessment-settings` | Super Admin | JSON downloads behind the header buttons |
| GET | `/uploads/<key>` | Public by URL | Uploaded files (local storage driver) |

"Access" is the permission key a Sub Admin needs (`PERMISSION_SECTIONS` in `ll-backend/src/common/rules/domain.ts`). Super Admin can reach everything.

## Environment variables

**`ll-backend/.env`**. The backend validates these at startup and refuses to boot if one is invalid.

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | *(required)* | PostgreSQL connection string |
| `JWT_SECRET` | *(required)* | Signs login tokens. Use a long random value outside development |
| `JWT_EXPIRES_IN` | `12h` | Session length without "Remember me" |
| `JWT_REMEMBER_EXPIRES_IN` | `7d` | Session length with "Remember me" |
| `PORT` | `4000` | Backend port |
| `NODE_ENV` | `development` | `production` blocks the demo seed and requires `SEED_SUPER_ADMIN_PASSWORD` |
| `CORS_ORIGIN` | `http://localhost:5173` | Origin allowed to call the API from a browser |
| `STORAGE_DRIVER` | `local` | Where uploaded files are stored (cloud driver to be added) |
| `UPLOAD_DIR` | `uploads` | Local driver: folder, relative to `ll-backend/` |
| `UPLOAD_PUBLIC_PATH` | `/uploads` | Local driver: URL path files are served from |
| `SEED_SUPER_ADMIN_EMAIL` | `owner@littlelegacy.dev` | First Super Admin created by the base seed |
| `SEED_SUPER_ADMIN_PASSWORD` | `ChangeMe123!` (dev only) | Required in production |

**`ll-frontend/`** needs no `.env` in development. Only if the API is served from a different origin (for example a production build), create `ll-frontend/.env` with:

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `/api` | API base URL |

The dev server proxies to `http://localhost:4000`. Set `API_PROXY_TARGET` (a shell variable, not in `.env`) to point a second dev server at another backend, e.g. `API_PROXY_TARGET=http://localhost:4100 npx vite --port 5174`.

## How the product works

1. **Draft → approve → publish.** Staff edit content. A Super Admin, or a Sub Admin with *direct publishing*, approves it. Only then does the parent app see it. Every change is recorded in an append-only audit log.
2. **Regional learning categories.** Countries are grouped into regions. Each region has its own complete learning catalogue: development areas, age-specific questionnaires, levels, activities, formulas and mandatory sets.
3. **Learning loop.** The parent enters the child's date of birth. The child answers an age-appropriate questionnaire, which sets a starting point. After that, weekly activity sets are scored as *independent*, *with help* or *could not complete*.
   - Repeat attempts earn half the previous award.
   - Mastery counts only independent completions.
   - Levels unlock through a score threshold plus a number of mastered activities, and never go down.
4. **Access gates.** An item is available only if the child's plan is at least the item's minimum plan, the child meets its learning requirement, and the country hasn't blocked it. No gate can bypass another.
5. **Library, community, commerce.** Stories have chapters, pages and stacked images. Community posts are moderated with an expiry. Enquiry replies go by email and/or in-app notification. Prices are set per country and charged per child, and orders record the price at the time of purchase.

The full rules are in [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md).

## Documentation

| Document | Contents |
|---|---|
| [CLAUDE.md](CLAUDE.md) | **Start here as a developer.** Full project structure, request flow, permissions, checklist for adding a module, domain invariants, conventions, design-fidelity rules, build status |
| [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) | Business rules from the client guide. This is the source of truth |
| [docs/prototype/](docs/prototype/) | Screen-by-screen reference for the client's prototype: labels, columns, fields, validation, seed data and design tokens |
| [docs/BACKEND_HANDOVER.md](docs/BACKEND_HANDOVER.md) | **Backend developers start here.** What's built, how the backend works, what's left to build, known issues |
| [docs/API_REQUESTS.md](docs/API_REQUESTS.md) | Endpoints the screens need: the frontend adds requests, the backend builds them and marks them done |
| [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) | Where the guide and the prototype conflict, and questions waiting on the client, with the interim rule for each |
| [docs/FRONTEND_BACKLOG.md](docs/FRONTEND_BACKLOG.md) | Frontend changes waiting on sign-off (e.g. navigation regrouping) and UI polish |
| [ll-backend/prisma/schema.prisma](ll-backend/prisma/schema.prisma) | The data model |

## Project status

**Done:**
- Project structure (pms2 style), full Prisma schema, migrations, base and demo seeds.
- JWT auth with "Remember me".
- Section permissions, enforced by the API and reflected in the UI.
- Draft approvals, with concurrency protection.
- Audit log.
- File uploads (local storage).
- The shell and design system, matched to the client prototype.
- Pages: Login, Overview, Team & Permissions, Draft approvals, Audit History, Registered Users, Children & Learning, Community, Feedback.
- Enquiries API (reply by email, in-app notification or both, through drafts).
- Activity Reviews API (read only).
- Countries and regional learning categories APIs (44 seeded countries).
- Activity Management part 1: development areas and age groups APIs.
- Activity Management part 2: activity categories and levels APIs; earned levels are protected when thresholds change.
- Activity Management part 3: activities API (editor, steps, previews, withdraw).
- Activity Management part 4: questionnaire questions API; `toParentQuestion()` keeps marks and difficulty out of parent responses.
- Activity Management part 5: assessment rules API and the safe formula engine (no `eval`), with versioned revisions.
- Activity Management part 6a: skill personalisation API (skills, expected scores, answer mapping, child selection preview).
- Activity Management part 6b-1: activity progression settings, allocation overrides, activity groups with difficulty levels, export.
- Activity Management part 6b-2: the weekly allocation engine (`rules/week-engine.ts`) and the week preview. **Activity Management backend complete.**
- Readable Draft approvals (API_REQUESTS #19): labels, names, context and reviewer.
- Stories and Rhymes API (#17, #18): the library editor, categories, the prototype's 10 stories and 5 rhymes as demo data.
- Plans & country prices API (#20) and Products (#21): plans per child per country, memory allowances, shop products, "Edit prices" for plans and products.
- Fixes from the frontend's open asks: a Super Admin can't change their own account; "Edit prices" saves the whole request or nothing, skips never-published products and names the country in product changes.
- Orders API (#22): fulfilment updates applied directly (no drafts), with an audit entry and a parent notification; Cancelled and Refunded are final; restock rules; the prototype's two orders as demo data.
- Sign-in rate limit; duplicate admin emails refused with the prototype's message.
- Notifications API (#23): audience filters with a live count, campaigns sent through drafts and recounted at send, the reminders log; library categories readable for its filters.
- Regional learning export (#10): `GET /api/regions/export`, a JSON download of each category's live learning setup (Super Admin).
- App Content API (#24): working draft edited directly with audit, versions published through drafts (the submitted snapshot), starting text seeded as a draft only.
- Parent Checklist API (#25): one checklist and visible limit per regional category, one pending change per item, removals through drafts.
- 116 passing backend tests.

**Frontend:**
- Connected to the API: Activity Reviews, Enquiries, Countries (Plans & Commerce hub and Shop & Orders) and Regional learning categories (API_REQUESTS #1–#4); Activity Management region filter, areas, age groups, Developmental Milestones, Activities, Questionnaires & Levels, Assessment Rules, Skill Personalisation and Activity Progression (#5–#9, #14, #16): Activity Management is fully connected; Stories and Rhymes (#17, #18); readable Draft approvals with real names (#19); Plans & Commerce: Subscriptions, Memories, Country pricing / "Edit prices" and Shop & Orders → Products and Orders (#20–#22); Notifications (#23); App Content (#24) and Parent Checklist (#25). Every admin screen is now on the API.
- Every section of the admin panel now has a screen.

**Next:** backend: the gender filter for #23 (CR7) and the other open asks and client changes in docs/API_REQUESTS.md. Frontend: the client-approved changes as their backend lands. See the full table in [CLAUDE.md → Build status](CLAUDE.md#build-status).

# liitle-legacy
