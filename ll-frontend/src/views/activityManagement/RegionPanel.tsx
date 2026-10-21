import { useId } from 'react';
import { Panel } from '@/components/ui/Panel';
import { errorMessage } from '@/api/client';
import { selectRegion, useSelectedRegion } from './region';

/**
 * The regional learning category filter at the top of each Activity Management card: everything
 * below it belongs to the selected region. Deliberately unlike the prototype, it only selects:
 * managing regions lives on the "Regional learning categories" card (RegionsPage), and Country
 * access is a page header button. `onRegionChange` lets a page reset its drill-down.
 */
export function RegionPanel({ onRegionChange }: { onRegionChange?: () => void }) {
  const id = useId();
  const { regions, regionId, isError, error } = useSelectedRegion();

  return (
    <Panel>
      <label htmlFor={id} className="mb-2 block">
        Regional learning category
      </label>
      <select
        id={id}
        className="input"
        value={regionId ?? ''}
        onChange={(e) => {
          selectRegion(e.target.value);
          onRegionChange?.();
        }}
      >
        {regions.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
            {r.isDefault ? ' (default)' : ''}
          </option>
        ))}
      </select>
      {isError && <p className="mt-3 text-danger">{errorMessage(error)}</p>}
      <p className="mt-3 leading-[1.7] text-muted">
        Each regional category has its own development areas, activity categories, questions, levels, activities, formulas and mandatory sets.
      </p>
    </Panel>
  );
}
