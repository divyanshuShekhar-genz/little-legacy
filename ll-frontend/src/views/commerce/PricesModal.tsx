import { useLayoutEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { FormGrid, TextField } from '@/components/ui/Field';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import type { Country } from '@/api/countries';
import { errorMessage } from '@/api/client';
import { usePlans, useSaveCountryPrices } from '@/api/plans';
import { useProducts } from '@/api/products';
import { useAuth } from '@/hooks/useAuth';
import type { PlanTier } from '@/constants/plans';
import { COUNTRY_PRICES_ERROR, editablePlan, editableProduct, neverPublished, type Prices } from './data';
import { DRAFT_SAVED } from '@/constants/messages';

const toInput = (n: number | undefined) => (n === undefined ? '' : String(n));

/**
 * "Prices · {country}" (prototype parent-content.js `countryPricingEditor`): monthly plan prices
 * (Subscriptions) and product prices (Shop & Orders) for one country. Blank = unavailable there,
 * 0 = free. Free has no price field: it's always free (deliberate difference). Reject is hidden:
 * this dialog spans several plans and products; a pending change is rejected in each item's editor.
 *
 * On the API (#20, #21) in one request. An admin who publishes directly starts from the live
 * prices (a direct publish never takes someone's pending change live); everyone else starts from
 * the pending prices their draft builds on. Only the prices the admin changed are sent. Products
 * that were never published aren't listed: they have no live row to price yet.
 */
export function PricesModal({ country, onClose }: { country: Country | null; onClose: () => void }) {
  const { can, canPublish } = useAuth();
  const { data: plans = [] } = usePlans();
  const { data: allProducts = [] } = useProducts();
  const products = allProducts.filter((p) => !neverPublished(p));
  const save = useSaveCountryPrices();
  const [values, setValues] = useState<Record<string, string>>({});
  const [initial, setInitial] = useState<Record<string, string>>({});
  const paidPlans = plans.filter((p) => p.tier !== 'FREE');
  const showPlans = can('subscriptions');
  const showProducts = can('shopOrders');

  useLayoutEffect(() => {
    if (!country) return;
    const start = (live: Prices, editable: Prices) => toInput((canPublish ? live : editable)[country.code]);
    const v: Record<string, string> = {};
    for (const p of paidPlans) v[`plan:${p.tier}`] = start(p.prices, editablePlan(p).prices);
    for (const p of products) v[`product:${p.id}`] = start(p.prices, editableProduct(p).prices);
    setValues(v);
    setInitial(v);
  }, [country]); // read once per opening

  const onSave = async (mode: SaveMode) => {
    if (!country) return;
    const parsed: Record<string, number | null> = {};
    for (const [key, raw] of Object.entries(values)) {
      if (raw.trim() === (initial[key] ?? '')) continue; // unchanged: never sent
      if (raw.trim() === '') parsed[key] = null;
      else if (!Number.isFinite(Number(raw)) || Number(raw) < 0) return void toast.error(COUNTRY_PRICES_ERROR);
      else parsed[key] = Math.round(Number(raw) * 100) / 100;
    }
    const pick = (prefix: string) =>
      Object.fromEntries(Object.entries(parsed).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v]));
    if (!Object.keys(parsed).length) {
      toast('Nothing changed');
      return onClose();
    }
    try {
      const result = await save.mutateAsync({
        code: country.code,
        mode,
        plans: showPlans ? (pick('plan:') as Partial<Record<PlanTier, number | null>>) : {},
        products: showProducts ? pick('product:') : {},
      });
      if (!result.items.length) toast('Nothing changed');
      else toast.success(result.status === 'draft' ? DRAFT_SAVED : `Prices saved for ${country.name}`);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const field = (key: string, label: string) => (
    <TextField
      key={key}
      label={label}
      type="number"
      min={0}
      step="0.01"
      placeholder="Not purchasable"
      value={values[key] ?? ''}
      onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
    />
  );

  return (
    <Modal
      open={country !== null}
      onClose={onClose}
      title={country ? `Prices · ${country.name}` : 'Prices'}
      footer={<DecisionActions onClose={onClose} onSave={onSave} showReject={false} busy={save.isPending} />}
    >
      {country && (
        <>
          <p className="mb-6 mt-2 leading-[1.7] text-muted">
            All amounts are in {country.currency}. Leave a price blank to make that item unavailable in this country. Delivery charges are set
            separately and apply only to shop orders.
          </p>
          {showPlans && (
            <>
              <h3>Monthly subscriptions</h3>
              <p className="mb-4 text-[12px] text-muted">Free is always free in every country.</p>
              <FormGrid>{paidPlans.map((p) => field(`plan:${p.tier}`, p.name))}</FormGrid>
            </>
          )}
          {showProducts && (
            <>
              <h3>Product prices</h3>
              {products.length ? <FormGrid>{products.map((p) => field(`product:${p.id}`, p.title))}</FormGrid> : <p className="text-muted">No products yet.</p>}
            </>
          )}
        </>
      )}
    </Modal>
  );
}
