import { useDeferredValue, useId, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge, humanize } from '@/components/ui/Badge';
import { CountryAccessButton } from '@/components/CountryAccessButton';
import { errorMessage } from '@/api/client';
import { useCountries, type Country } from '@/api/countries';
import { useProducts } from '@/api/products';
import { useOrders } from '@/api/orders';
import { formatMoney } from '@/utils/format';
import { ORDER_STATUSES, PRODUCT_STATUS_LABELS, neverPublished, type Order, type Product, type ProductStatus } from './data';
import { CountriesPanel } from './CountriesPanel';
import { ProductModal } from './ProductModal';
import { OrderModal } from './OrderModal';

type Tab = 'Products' | 'Countries & Delivery' | 'Orders';
const TABS: Tab[] = ['Products', 'Countries & Delivery', 'Orders'];
const PENDING_LABEL = { DRAFT: 'Draft changes', PENDING_APPROVAL: 'Changes pending approval' } as const;
const PRODUCT_TONES: Record<ProductStatus, 'success' | 'warning' | 'default' | 'neutral'> = {
  PUBLISHED: 'success',
  PENDING_APPROVAL: 'warning',
  DRAFT: 'default',
  WITHDRAWN: 'neutral',
};

const Lines = ({ lines }: { lines: { text: string; muted?: boolean }[] }) => (
  <span className="block whitespace-normal leading-[1.7]">
    {lines.map((l) => (
      <span key={l.text} className={l.muted ? 'block text-muted' : 'block'}>
        {l.text}
      </span>
    ))}
  </span>
);

/**
 * Shop & Orders (guide §20; prototype commerce.js `drawCommerce`): Products, Countries & Delivery
 * (the hub's country list, not a copy) and Orders, with a country filter and search. Products (#21),
 * countries (#3) and orders (#22) come from the API. The order list isn't paged, so its filters run
 * here on one fetch; search matches "#1001" or "1001", the parent's name or email, and product titles. Country access restricts Ecommerce as a
 * whole section (guide §21).
 */
export function ShopPage() {
  const { data: products = [], isLoading, isError, error } = useProducts();
  const { data: orders = [], isLoading: ordersLoading, isError: ordersFailed, error: ordersError } = useOrders();
  const { data: countries } = useCountries();
  const [tab, setTab] = useState<Tab>('Products');
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const term = useDeferredValue(search.trim().toLowerCase());
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [managing, setManaging] = useState<Order | null>(null);
  const ids = { country: useId(), search: useId(), status: useId() };

  const all = countries ?? [];
  const shown = country ? all.filter((c) => c.code === country) : all;
  const productRows = products.filter((p) => !term || `${p.title} ${p.sku}`.toLowerCase().includes(term));
  const orderRows = orders.filter(
    (o) =>
      (!status || o.status === status) &&
      (!country || o.countryCode === country) &&
      (!term || `#${o.number} ${o.parentName} ${o.parentEmail} ${o.items.map((i) => i.titleSnapshot).join(' ')}`.toLowerCase().includes(term)),
  );
  const nameOf = (code: string) => all.find((c) => c.code === code)?.name ?? code;

  /** Price per shown country: one line per country with a price, plus a count of the rest. */
  const priceLines = (p: Product) => {
    if (country) {
      const c = shown[0];
      return c ? [{ text: `${c.name}: ${p.prices[c.code] === undefined ? 'Not purchasable' : formatMoney(p.prices[c.code]!, c.currency)}` }] : [];
    }
    const priced = all.filter((c) => p.prices[c.code] !== undefined);
    const rest = all.length - priced.length;
    return [
      ...priced.map((c: Country) => ({ text: `${c.name}: ${formatMoney(p.prices[c.code]!, c.currency)}` })),
      ...(rest ? [{ text: `Not purchasable in the other ${rest} countries`, muted: true }] : []),
    ];
  };
  const quantityLines = (p: Product) =>
    country
      ? [{ text: String(p.orderedByCountry[country] ?? 0) }]
      : all.filter((c) => p.prices[c.code] !== undefined).map((c) => ({ text: `${c.name}: ${p.orderedByCountry[c.code] ?? 0}` }));

  return (
    <>
      <PageHeader
        back={{ to: '/commerce', label: 'Plans & Commerce' }}
        eyebrow="Shop & Orders"
        title="Shop & Orders"
        subtitle="Products, country pricing, inventory and fulfilment."
        actions={<CountryAccessButton types={['ECOMMERCE']} />}
      />
      <div className="mb-6 flex flex-wrap items-center gap-3" role="tablist" aria-label="Shop sections">
        {TABS.map((t) => (
          <Button key={t} role="tab" aria-selected={tab === t} variant={tab === t ? 'primary' : 'default'} onClick={() => setTab(t)}>
            {t}
          </Button>
        ))}
      </div>
      {tab !== 'Countries & Delivery' && (
        <div className="mb-6 flex flex-wrap items-end gap-3">
          <div className="grid gap-[7px] text-[12px] text-body">
            <label htmlFor={ids.country}>Country</label>
            <select id={ids.country} className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">All</option>
              {all.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-[7px] text-[12px] text-body">
            <label htmlFor={ids.search}>Search</label>
            <input id={ids.search} className="input" placeholder="Product, order or parent" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {tab === 'Orders' && (
            <div className="grid gap-[7px] text-[12px] text-body">
              <label htmlFor={ids.status}>Status</label>
              <select id={ids.status} className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All</option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {tab === 'Products' && (
        <Panel
          title={`Products (${productRows.length})`}
          actions={
            <Button variant="primary" onClick={() => setEditing('new')}>
              Add product
            </Button>
          }
        >
          <p className="mb-6 text-[12px] leading-[1.7] text-muted">
            Quantity ordered is for the shown country, excluding cancelled and refunded orders. Stock is shared across countries.
          </p>
          <DataTable
            loading={isLoading}
            error={isError ? errorMessage(error) : undefined}
            rows={productRows}
            rowKey={(p) => p.id}
            columns={[
              {
                header: 'Product / SKU',
                cell: (p) => (
                  <>
                    {p.title}
                    <small className="mt-[5px] block text-[12px] text-muted">{p.sku}</small>
                  </>
                ),
              },
              {
                header: 'Status',
                cell: (p) => (
                  <>
                    <Badge tone={PRODUCT_TONES[p.status]}>{PRODUCT_STATUS_LABELS[p.status]}</Badge>
                    {p.pending && !neverPublished(p) && <small className="mt-[5px] block text-[12px] text-muted">{PENDING_LABEL[p.pending.status]}</small>}
                  </>
                ),
              },
              { header: 'Stock', cell: (p) => p.stock },
              { header: 'Country / Price', cell: (p) => <Lines lines={priceLines(p)} /> },
              { header: 'Quantity ordered', cell: (p) => <Lines lines={quantityLines(p)} /> },
              { header: '', cell: (p) => <Button onClick={() => setEditing(p)}>Edit product</Button> },
            ]}
          />
        </Panel>
      )}

      {tab === 'Countries & Delivery' && <CountriesPanel mode="delivery" />}

      {tab === 'Orders' && (
        <Panel title={`Orders (${orderRows.length})`}>
          <DataTable
            loading={ordersLoading}
            error={ordersFailed ? errorMessage(ordersError) : undefined}
            rows={orderRows}
            rowKey={(o) => o.id}
            columns={[
              { header: 'Order', cell: (o) => `#${o.number}` },
              {
                header: 'Parent',
                cell: (o) => (
                  <>
                    {o.parentName}
                    <small className="mt-[5px] block text-[12px] text-muted">{o.parentEmail}</small>
                  </>
                ),
              },
              { header: 'Country', cell: (o) => nameOf(o.countryCode) },
              { header: 'Product / Qty', cell: (o) => <Lines lines={o.items.map((i) => ({ text: `${i.titleSnapshot} × ${i.quantity}` }))} /> },
              { header: 'Total', cell: (o) => formatMoney(o.total, o.currency) },
              {
                header: 'Status',
                cell: (o) => (
                  <>
                    <StatusBadge status={o.status} />
                    {o.trackingRef && <small className="mt-[5px] block text-[12px] text-muted">{o.trackingRef}</small>}
                  </>
                ),
              },
              { header: '', cell: (o) => <Button onClick={() => setManaging(o)}>Manage</Button> },
            ]}
          />
        </Panel>
      )}

      <ProductModal open={editing !== null} product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      <OrderModal order={managing} onClose={() => setManaging(null)} />
    </>
  );
}
