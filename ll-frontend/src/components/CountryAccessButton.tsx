import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { SelectField, TextAreaField } from '@/components/ui/Field';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import { downloadJson, errorMessage } from '@/api/client';
import { DRAFT_SAVED } from '@/constants/messages';
import {
  useCountryAccess,
  useCountryPreview,
  useDeleteRestriction,
  useSaveRestriction,
  type CountryRestriction,
  type RestrictionInput,
  type RestrictionType,
} from '@/api/countryAccess';

const DEFAULT_MESSAGE = 'This content is not available in your country.';

/** The section a page's restriction types belong to, named in the dialog title (deliberate addition). */
const SECTION_NAMES: Record<RestrictionType, string> = {
  ACTIVITIES_SECTION: 'Activities',
  ACTIVITY: 'Activities',
  LEVEL: 'Activities',
  STORIES: 'Stories',
  RHYMES: 'Rhymes',
  COMMUNITY: 'Community',
  ECOMMERCE: 'Ecommerce',
};

type View = { name: 'list' } | { name: 'edit'; rule: CountryRestriction | null } | { name: 'preview' } | { name: 'delete'; rule: CountryRestriction };

/**
 * "Country access" (guide §20; prototype admin-rebuild.js `countryDialog`). Country access is a
 * button inside each relevant page, not a nav section. Pass the restriction types this page owns,
 * e.g. Community → ['COMMUNITY'], Activities → ['ACTIVITIES_SECTION', 'ACTIVITY', 'LEVEL'].
 */
export function CountryAccessButton({ types }: { types: RestrictionType[] }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ name: 'list' });
  const { data } = useCountryAccess(types, open);

  const close = () => {
    setOpen(false);
    setView({ name: 'list' });
  };

  const addRestriction = () => {
    if (!data?.countries.length) {
      toast.error('Add a country in Plans & Commerce first.');
      return;
    }
    setView({ name: 'edit', rule: null });
  };

  const title = {
    list: `Country access · ${SECTION_NAMES[types[0]!]}`,
    edit: view.name === 'edit' && view.rule ? 'Edit country restriction' : 'Add country restriction',
    preview: 'Preview country access',
    delete: 'Remove restriction',
  }[view.name];

  return (
    <>
      <Button onClick={() => setOpen(true)}>Country access</Button>
      <Modal open={open} onClose={close} title={title} footer={view.name === 'list' ? <Button onClick={close}>Close</Button> : undefined}>
        {view.name === 'list' && (
          <>
            <p className="mb-6 leading-[1.7] text-muted">These restrictions apply in addition to subscription and level access.</p>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Button onClick={addRestriction}>Add restriction</Button>
              <Button onClick={() => setView({ name: 'preview' })}>Preview country access</Button>
              <Button
                onClick={() => downloadJson('/country-access/export', 'little-legacy-country-access.json').catch((e) => toast.error(errorMessage(e)))}
              >
                Export country rules
              </Button>
            </div>
            <DataTable
              rows={data?.restrictions}
              loading={!data}
              rowKey={(r) => r.id}
              columns={[
                { header: 'Country', cell: (r) => r.countryCode },
                { header: 'Target', cell: (r) => `${data?.types.find((t) => t.type === r.type)?.label ?? r.type} · ${r.targetName}` },
                { header: 'State', cell: (r) => (r.enabled ? 'Blocked' : 'Disabled') },
                { header: 'Parent message', className: 'whitespace-normal', cell: (r) => r.message },
                {
                  header: '',
                  cell: (r) => (
                    <div className="flex gap-2">
                      <Button onClick={() => setView({ name: 'edit', rule: r })}>Edit</Button>
                      <Button onClick={() => setView({ name: 'delete', rule: r })}>Delete</Button>
                    </div>
                  ),
                },
              ]}
            />
          </>
        )}
        {view.name === 'edit' && data && <RestrictionForm data={data} rule={view.rule} onDone={() => setView({ name: 'list' })} />}
        {view.name === 'preview' && data && <PreviewView countries={data.countries} onDone={() => setView({ name: 'list' })} />}
        {view.name === 'delete' && <DeleteView rule={view.rule} onDone={() => setView({ name: 'list' })} />}
      </Modal>
    </>
  );
}

function RestrictionForm({ data, rule, onDone }: { data: NonNullable<ReturnType<typeof useCountryAccess>['data']>; rule: CountryRestriction | null; onDone: () => void }) {
  const save = useSaveRestriction();
  const [input, setInput] = useState<RestrictionInput>(() => ({
    countryCode: rule?.countryCode ?? data.countries[0]?.code ?? '',
    type: rule?.type ?? data.types[0]?.type ?? 'COMMUNITY',
    targetId: rule?.targetId ?? null,
    message: rule?.message ?? DEFAULT_MESSAGE,
    enabled: rule?.enabled ?? false, // new rules start disabled, as in the prototype
  }));
  const targets = data.types.find((t) => t.type === input.type)?.targets ?? [];

  // Keep the target valid when the type changes (the prototype rebuilds this select).
  useEffect(() => {
    if (!targets.some((t) => t.id === input.targetId)) setInput((i) => ({ ...i, targetId: targets[0]?.id ?? null }));
  }, [input.type]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (mode: SaveMode) => {
    try {
      const result = await save.mutateAsync({ id: rule?.id, mode, input });
      toast.success(result.status === 'draft' ? DRAFT_SAVED : 'Country restriction saved');
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <>
      <div className="grid">
        <SelectField
          label="Country"
          value={input.countryCode}
          onChange={(e) => setInput({ ...input, countryCode: e.target.value })}
          options={data.countries.map((c) => ({ value: c.code, label: c.name }))}
        />
        <SelectField
          label="Restrict"
          value={input.type}
          onChange={(e) => setInput({ ...input, type: e.target.value as RestrictionType })}
          options={data.types.map((t) => ({ value: t.type, label: t.label }))}
        />
        <SelectField
          label="Target"
          value={input.targetId ?? ''}
          onChange={(e) => setInput({ ...input, targetId: e.target.value || null })}
          options={targets.map((t) => ({ value: t.id ?? '', label: t.name }))}
        />
        <TextAreaField label="Parent message" value={input.message} onChange={(e) => setInput({ ...input, message: e.target.value })} />
        <SelectField
          label="State"
          value={input.enabled ? 'enabled' : 'disabled'}
          onChange={(e) => setInput({ ...input, enabled: e.target.value === 'enabled' })}
          options={[
            { value: 'disabled', label: 'Disabled' },
            { value: 'enabled', label: 'Enabled' },
          ]}
        />
      </div>
      <p className="mt-2 leading-[1.7] text-muted">
        Blocking a section overrides access to its individual items. Disabling one rule does not cancel another matching rule.
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-2.5">
        <DecisionActions busy={save.isPending} onClose={onDone} onSave={submit} />
      </div>
    </>
  );
}

function PreviewView({ countries, onDone }: { countries: { code: string; name: string }[]; onDone: () => void }) {
  const [country, setCountry] = useState('');
  const { data, isLoading } = useCountryPreview(country, true);
  return (
    <>
      <div className="grid">
        <SelectField
          label="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          options={[{ value: '', label: 'Unknown / not provided' }, ...countries.map((c) => ({ value: c.code, label: c.name }))]}
        />
      </div>
      <DataTable
        rows={data}
        loading={isLoading}
        rowKey={(r) => r.label}
        columns={[
          { header: 'Section / item', cell: (r) => r.label },
          { header: 'Country check', cell: (r) => r.check },
          { header: 'Reason', cell: (r) => r.reason },
        ]}
      />
      <p className="mt-2 leading-[1.7] text-muted">This preview checks country rules only. It does not simulate a parent’s subscription or other eligibility.</p>
      <div className="mt-6 flex justify-end">
        <Button onClick={onDone}>Close</Button>
      </div>
    </>
  );
}

function DeleteView({ rule, onDone }: { rule: CountryRestriction; onDone: () => void }) {
  const remove = useDeleteRestriction();
  const confirm = async () => {
    try {
      const result = await remove.mutateAsync(rule.id);
      toast.success(result.status === 'draft' ? DRAFT_SAVED : 'Restriction removed');
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  return (
    <>
      <p className="leading-[1.7] text-muted">Remove this {rule.countryCode} restriction? Other matching rules will still apply.</p>
      <div className="mt-6 flex justify-end gap-2.5">
        <Button onClick={onDone} disabled={remove.isPending}>
          Close
        </Button>
        <Button variant="primary" onClick={confirm} disabled={remove.isPending}>
          Remove
        </Button>
      </div>
    </>
  );
}
