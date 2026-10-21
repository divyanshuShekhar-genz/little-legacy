import { useDeferredValue, useState } from 'react';
import { FormGrid, TextField } from '@/components/ui/Field';
import type { Country } from '@/api/countries';

/**
 * One price field per country (blank = not purchasable there, 0 = free), with a search box as on
 * the countries panel: there are 45 countries. Deliberate difference: the prototype lists them all
 * with no search. Prices typed for countries the search hides are kept.
 */
export function CountryPriceFields({ countries, values, onChange }: {
  countries: Country[];
  values: Record<string, string>;
  onChange: (code: string, value: string) => void;
}) {
  const [search, setSearch] = useState('');
  const term = useDeferredValue(search.trim().toLowerCase());
  const shown = countries.filter((c) => !term || `${c.name} ${c.code} ${c.currency}`.toLowerCase().includes(term));

  return (
    <>
      <div className="mb-6">
        <input className="input" aria-label="Search countries" placeholder="Search countries…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {shown.length ? (
        <FormGrid>
          {shown.map((c) => (
            <TextField
              key={c.code}
              label={`${c.name} · ${c.currency}`}
              type="number"
              min={0}
              step="0.01"
              placeholder="Not purchasable"
              value={values[c.code] ?? ''}
              onChange={(e) => onChange(c.code, e.target.value)}
            />
          ))}
        </FormGrid>
      ) : (
        <p className="leading-[1.7] text-muted">No countries match “{search.trim()}”.</p>
      )}
    </>
  );
}
