import { useDeferredValue, useState, type ReactNode } from 'react';
import { Panel } from '@/components/ui/Panel';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { errorMessage } from '@/api/client';
import { useCountries, type Country } from '@/api/countries';
import { usePlans } from '@/api/plans';
import { useProducts } from '@/api/products';
import { useAuth } from '@/hooks/useAuth';
import { formatMoney } from '@/utils/format';
import { CountryModal } from './CountryModal';
import { PricesModal } from './PricesModal';
import { neverPublished } from './data';

/** "Plus: INR 199.00" / "Plus: Not purchasable"; Free is always free (deliberate difference). */
const priceLine = (name: string, price: number | undefined, currency: string) =>
  `${name}: ${price === undefined ? 'Not purchasable' : formatMoney(price, currency)}`;

const Lines = ({ lines }: { lines: string[] }) => (
  <span className="block whitespace-normal leading-[1.7]">
    {lines.map((l) => (
      <span key={l} className="block">
        {l}
      </span>
    ))}
  </span>
);

/**
 * The one country list (prototype parent-content.js `renderCommerceHub` and commerce.js
 * "Countries & Delivery"), used in two places so it's never duplicated:
 * - `pricing`: the Plans & Commerce hub's "Country pricing", with plan and product prices,
 *   "Edit prices" and "Edit country & delivery". Columns follow the admin's sections.
 * - `delivery`: Shop & Orders' "Countries & Delivery" tab.
 * Search is a deliberate addition. Countries (#3), plans (#20) and products (#21) come from the API;
 * plans load only with Subscriptions and products only with Shop & Orders. Products that were never
 * published have no live price yet, so they aren't listed.
 */
export function CountriesPanel({ mode, className }: { mode: 'pricing' | 'delivery'; className?: string }) {
  const { can } = useAuth();
  const canPlans = can('subscriptions');
  const canShop = can('shopOrders');
  // The API lets either section edit a country (CountriesService).
  const canEditCountry = canPlans || canShop;
  const { data, isLoading, isError, error } = useCountries();
  const { data: plans = [] } = usePlans();
  const { data: allProducts = [] } = useProducts();
  const products = allProducts.filter((p) => !neverPublished(p));
  const [search, setSearch] = useState('');
  const term = useDeferredValue(search.trim().toLowerCase());
  const [editing, setEditing] = useState<Country | 'new' | null>(null);
  const [pricing, setPricing] = useState<Country | null>(null);

  const rows = data?.filter((c) => !term || `${c.name} ${c.code} ${c.currency}`.toLowerCase().includes(term));

  const columns: Column<Country>[] =
    mode === 'pricing'
      ? [
          {
            header: 'Country / Currency',
            cell: (c) => (
              <>
                {c.name} · {c.currency}
                <small className="mt-[5px] block text-[12px] text-muted">{c.enabled ? 'Enabled' : 'Disabled'}</small>
              </>
            ),
          },
          ...(canPlans
            ? [
                {
                  header: 'Monthly subscriptions',
                  cell: (c: Country) => (
                    <Lines lines={plans.map((p) => (p.tier === 'FREE' ? priceLine(p.name, 0, c.currency) : priceLine(p.name, p.prices[c.code], c.currency)))} />
                  ),
                },
              ]
            : []),
          ...(canShop
            ? [
                { header: 'Products', cell: (c: Country) => <Lines lines={products.map((p) => priceLine(p.title, p.prices[c.code], c.currency))} /> },
                { header: 'Delivery per order', cell: (c: Country) => formatMoney(c.deliveryCharge, c.currency) },
              ]
            : []),
          {
            header: '',
            cell: (c) => (
              <div className="flex flex-col items-start gap-2">
                <Button onClick={() => setPricing(c)}>Edit prices</Button>
                {canEditCountry && <Button onClick={() => setEditing(c)}>Edit country & delivery</Button>}
              </div>
            ),
          },
        ]
      : [
          { header: 'Country', className: 'whitespace-normal', cell: (c) => `${c.name} (${c.code})` },
          { header: 'Currency', cell: (c) => c.currency },
          { header: 'Delivery charge per order', cell: (c) => formatMoney(c.deliveryCharge, c.currency) },
          { header: 'Delivery estimate', className: 'whitespace-normal', cell: (c) => c.deliveryEstimate ?? '—' },
          { header: 'Status', cell: (c) => (c.enabled ? 'Enabled' : 'Disabled') },
          // Deliberate addition: which learning catalogue the country's new children get.
          { header: 'Regional learning category', className: 'whitespace-normal', cell: (c) => c.learningRegion?.name ?? 'Default category' },
          ...(canEditCountry ? [{ header: '', cell: (c: Country) => <Button onClick={() => setEditing(c)}>Edit country</Button> }] : []),
        ];

  const note: ReactNode =
    mode === 'pricing'
      ? 'Add a country once, then set each subscription and product price separately. Blank means unavailable; zero means free. Memory limits belong to plans, with no separate memory charge.'
      : 'New countries have no prices. Enter prices before products can be purchased. A price cleared to blank makes that product unavailable there.';

  return (
    <Panel
      title={mode === 'pricing' ? 'Country pricing' : 'Countries & Delivery'}
      className={className}
      actions={
        mode === 'delivery' &&
        canEditCountry && (
          <Button variant="primary" onClick={() => setEditing('new')}>
            Add country
          </Button>
        )
      }
    >
      <p className="mb-6 leading-[1.7] text-muted">{note}</p>
      <div className="mb-6">
        <input className="input" aria-label="Search countries" placeholder="Search countries…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <DataTable loading={isLoading} error={isError ? errorMessage(error) : undefined} rows={rows} rowKey={(c) => c.code} columns={columns} />
      <CountryModal open={editing !== null} country={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      <PricesModal country={pricing} onClose={() => setPricing(null)} />
    </Panel>
  );
}
