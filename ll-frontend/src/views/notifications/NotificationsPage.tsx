import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Note, Panel } from '@/components/ui/Panel';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { FormGrid, SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { useAgesAcross, useAreas } from '@/api/areas';
import { useCategories } from '@/api/categories';
import { useAreaLevels } from '@/api/levels';
import { useCountries } from '@/api/countries';
import { useRegions } from '@/api/regions';
import { useAudience, useCampaigns, useReminders } from '@/api/campaigns';
import { useLibraryCategories } from '@/api/library';
import { errorMessage } from '@/api/client';
import { PLAN_LABELS, PLAN_TIERS, type PlanTier } from '@/constants/plans';
import { formatDateTime, plural } from '@/utils/format';
import { Channel } from '@/views/userManagement/enquiries/ReplyModal';
import { CHILD_GENDERS, GENDER_FILTER_ENABLED, GENDER_LABELS, channelText, type Campaign, type CampaignFilters, type Channel as ChannelValue, type ChildGender } from './data';
import { CampaignPreviewModal } from './CampaignPreviewModal';
import { RecipientNames } from './RecipientNames';

const ALL = 'All';
const allOption = { value: ALL, label: 'All' };

interface CampaignForm {
  region: string;
  country: string;
  area: string;
  age: string;
  gender: string;
  level: string;
  plan: string;
  story: string;
  rhyme: string;
  title: string;
  message: string;
  email: boolean;
  inApp: boolean;
}

const EMPTY: CampaignForm = { region: ALL, country: ALL, area: ALL, age: ALL, gender: ALL, level: ALL, plan: ALL, story: ALL, rhyme: ALL, title: '', message: '', email: true, inApp: true };

/** The form's selects as Campaign.filters ("All" = left out). */
function toFilters(v: CampaignForm): CampaignFilters {
  const f: CampaignFilters = {};
  if (v.region !== ALL) f.regionIds = [v.region];
  if (v.country !== ALL) f.countryCodes = [v.country];
  if (v.area !== ALL) f.areaId = v.area;
  if (v.age !== ALL) f.age = Number(v.age);
  // Not sent until the API supports it (it would be dropped and the count would be wrong).
  if (GENDER_FILTER_ENABLED && v.gender !== ALL) f.gender = v.gender as ChildGender;
  if (v.area !== ALL && v.level !== ALL) f.level = Number(v.level);
  if (v.plan !== ALL) f.plan = v.plan as PlanTier;
  if (v.story !== ALL) f.storyCategoryId = v.story;
  if (v.rhyme !== ALL) f.rhymeCategoryId = v.rhyme;
  return f;
}

const fromCampaign = (c: Campaign): CampaignForm => ({
  region: c.filters.regionIds?.[0] ?? ALL,
  country: c.filters.countryCodes?.[0] ?? ALL,
  area: c.filters.areaId ?? ALL,
  age: c.filters.age === undefined ? ALL : String(c.filters.age),
  gender: c.filters.gender ?? ALL,
  level: c.filters.level === undefined ? ALL : String(c.filters.level),
  plan: c.filters.plan ?? ALL,
  story: c.filters.storyCategoryId ?? ALL,
  rhyme: c.filters.rhymeCategoryId ?? ALL,
  title: c.title,
  message: c.message,
  email: c.channels.includes('EMAIL'),
  inApp: c.channels.includes('IN_APP'),
});

/**
 * Notifications (guide §18, PRODUCT_SPEC §17). Prototype admin-rebuild.js `renderNotifications()`:
 * filter parents, preview recipients, then send to one message per parent. Filters combine with
 * AND; story and rhyme categories match recorded engagement or favourites only. Added (Q25): the
 * regional learning category and country filters, which treat Community Broadcast as a campaign,
 * and (client answer 15 Oct, CR7) a Gender filter; children with no gender recorded match only All.
 * Campaigns go through the draft flow (Super Admin approves = sends) and are separate from
 * enquiry replies. On the API (#23): the matching count comes from the server, which also counts
 * again when sending; story and rhyme categories are the real ones. The Gender filter is hidden
 * until the API supports it (GENDER_FILTER_ENABLED).
 */
export function NotificationsPage() {
  const { register, watch, setValue, reset } = useForm<CampaignForm>({ defaultValues: EMPTY });
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const v = watch();
  const { data: regions } = useRegions();
  const { data: countries } = useCountries();
  const region = regions?.find((r) => r.id === v.region);
  const { data: areas } = useAreas(region ? region.id : null);
  const { data: categories } = useCategories(v.area !== ALL ? v.area : null);
  const levels = useAreaLevels(v.area !== ALL ? v.area : null, categories);
  const ages = useAgesAcross(region ? [region.id] : (regions ?? []).map((r) => r.id));
  const { data: storyCategories = [] } = useLibraryCategories('STORY');
  const { data: rhymeCategories = [] } = useLibraryCategories('RHYME');
  const { data: campaigns, isLoading: campaignsLoading, isError: campaignsFailed, error: campaignsError } = useCampaigns();
  const { data: reminders, isLoading: remindersLoading, isError: remindersFailed, error: remindersError } = useReminders();


  const filters = toFilters(v);
  const { data: audienceData, isError: audienceFailed, error: audienceError } = useAudience(filters);
  const audience = audienceData ?? { count: 0, parents: [] };
  const channels: ChannelValue[] = [...(v.email ? (['EMAIL'] as const) : []), ...(v.inApp ? (['IN_APP'] as const) : [])];

  const countryOptions = region ? region.countries : (countries ?? []).map((c) => ({ code: c.code, name: c.name }));
  const levelNumbers = [...new Set(levels.data.map((l) => l.number))].sort((a, b) => a - b);

  // Dependent filters fall back to "All" only when their value isn't available any more (another
  // region or area), so opening a saved campaign keeps its choices.
  useEffect(() => {
    if (region && v.country !== ALL && !region.countries.some((c) => c.code === v.country)) setValue('country', ALL);
    if (!region && v.area !== ALL) setValue('area', ALL);
    if (region && areas && v.area !== ALL && !areas.some((a) => a.id === v.area)) setValue('area', ALL);
  }, [region, areas, v.country, v.area, setValue]);
  useEffect(() => {
    if (v.level === ALL) return;
    if (v.area === ALL || (!levels.isLoading && categories && !levelNumbers.includes(Number(v.level)))) setValue('level', ALL);
  }, [v.area, v.level, levels.isLoading, categories, levelNumbers.join(), setValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = () => {
    if (!audience.count || !channels.length) return void toast.error('Choose recipients and at least one channel.');
    if (!v.title.trim() || !v.message.trim()) return void toast.error('Enter a notification title and message.');
    setPreviewing(true);
  };

  const startNew = () => {
    setEditing(null);
    reset(EMPTY);
  };

  const open = (c: Campaign) => {
    setEditing(c);
    reset(fromCampaign(c));
    window.scrollTo({ top: 0 });
  };

  // The API already returns only a Sub Admin's own waiting campaigns.
  const waiting = (campaigns ?? []).filter((c) => c.draftId !== null);
  const sent = (campaigns ?? []).filter((c) => c.status === 'PUBLISHED');

  return (
    <>
      <PageHeader title="Notifications" subtitle="Filter parents, preview recipients, then send." />

      <Panel>
        <form onSubmit={(e) => e.preventDefault()}>
          {editing && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <span className="text-muted">
                Editing a saved notification · <StatusBadge status={editing.status} />
              </span>
              <Button onClick={startNew}>New notification</Button>
            </div>
          )}
          <FormGrid>
            <SelectField
              label="Regional learning category"
              options={[allOption, ...(regions ?? []).map((r) => ({ value: r.id, label: r.name }))]}
              {...register('region')}
            />
            <SelectField label="Country" options={[allOption, ...countryOptions.map((c) => ({ value: c.code, label: c.name }))]} {...register('country')} />
            <SelectField
              label="Development area"
              disabled={!region}
              options={[allOption, ...(areas ?? []).map((a) => ({ value: a.id, label: a.name }))]}
              {...register('area')}
            />
            <SelectField label="Child age" options={[allOption, ...ages.map((a) => ({ value: String(a), label: String(a) }))]} {...register('age')} />
            {GENDER_FILTER_ENABLED && (
              <SelectField label="Gender" options={[allOption, ...CHILD_GENDERS.map((g) => ({ value: g, label: GENDER_LABELS[g] }))]} {...register('gender')} />
            )}
            <SelectField
              label="Level"
              disabled={v.area === ALL}
              options={[allOption, ...levelNumbers.map((n) => ({ value: String(n), label: String(n) }))]}
              {...register('level')}
            />
            <SelectField label="Subscription" options={[allOption, ...PLAN_TIERS.map((p) => ({ value: p, label: PLAN_LABELS[p] }))]} {...register('plan')} />
            <SelectField label="Story category read" options={[allOption, ...storyCategories.map((c) => ({ value: c.id, label: c.name }))]} {...register('story')} />
            <SelectField label="Rhyme category played" options={[allOption, ...rhymeCategories.map((c) => ({ value: c.id, label: c.name }))]} {...register('rhyme')} />
          </FormGrid>
          <p className="mb-0 mt-2 leading-[1.7] text-muted">
            Development area needs a regional learning category (each has its own areas); Level needs a development area. Country is the parent’s
            country; the regional learning category, age, level and subscription are the child’s.
          </p>
          <p className="mb-6 mt-2 leading-[1.7] text-muted">
            Category filters use recorded library engagement across a parent’s children. All selected filters must match. Parents without category
            records do not match a selected category.
          </p>
          <Note>
            <span aria-live="polite">
              {audienceFailed ? (
                <span className="text-danger">{errorMessage(audienceError)}</span>
              ) : (
                <>
                  {plural(audience.count, 'matching parent')} ·{' '}
                  <RecipientNames names={audience.parents.map((p) => p.name)} total={audience.count} empty="No matching parents" />
                </>
              )}
            </span>
          </Note>
          <TextField label="Notification title" {...register('title')} />
          <TextAreaField label="Message" {...register('message')} />
          <fieldset className="mt-[18px]">
            <legend className="mb-[7px]">Send through</legend>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Channel label="Email" {...register('email')} />
              <Channel label="In-app notification" {...register('inApp')} />
            </div>
          </fieldset>
          <Button variant="primary" onClick={preview}>
            Preview notification
          </Button>
        </form>
      </Panel>

      {waiting.length > 0 && (
        <Panel title="Waiting for approval">
          <DataTable
            rows={waiting}
            rowKey={(c) => c.id}
            columns={[
              { header: 'Title', cell: (c) => c.title },
              { header: 'Parents', cell: (c) => c.recipientCount },
              { header: 'Channels', cell: (c) => channelText(c.channels) },
              { header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
              { header: 'Saved by', cell: (c) => c.authorName ?? '—' },
              { header: '', cell: (c) => <Button onClick={() => open(c)}>Open</Button> },
            ]}
          />
        </Panel>
      )}

      <Panel title="Sent notifications">
        <DataTable
          loading={campaignsLoading}
          error={campaignsFailed ? errorMessage(campaignsError) : undefined}
          rows={sent}
          rowKey={(c) => c.id}
          columns={[
            { header: 'Title', cell: (c) => c.title },
            { header: 'Parents', cell: (c) => c.recipientCount },
            { header: 'Channels', cell: (c) => channelText(c.channels) },
          ]}
        />
      </Panel>

      <Panel title="Daily mandatory-activity reminders">
        <p className="mb-6 mt-2 leading-[1.7] text-muted">
          Email + in-app. After seven days, one reminder per child per day while mandatory activities remain unperformed and the area target has not
          been reached.
        </p>
        <DataTable
          loading={remindersLoading}
          error={remindersFailed ? errorMessage(remindersError) : undefined}
          rows={reminders}
          rowKey={(r) => r.id}
          columns={[
            { header: 'Child / Parent', cell: (r) => `${r.childName} / ${r.parentName}` },
            { header: 'Outstanding areas', cell: (r) => r.areas.join(', ') },
            { header: 'Channels', cell: (r) => channelText(r.channels) },
            { header: 'Date', cell: (r) => formatDateTime(r.createdAt) },
          ]}
        />
      </Panel>

      <CampaignPreviewModal
        open={previewing}
        campaign={editing}
        content={{ title: v.title.trim(), message: v.message.trim(), channels, filters }}
        audience={audience}
        onClose={() => setPreviewing(false)}
        onDone={() => {
          setPreviewing(false);
          startNew();
        }}
      />
    </>
  );
}
