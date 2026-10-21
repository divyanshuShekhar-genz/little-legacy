import { useState } from 'react';
import { HubPage } from '@/components/HubPage';
import { Button } from '@/components/ui/Button';
import { NAV_GROUPS } from '@/constants/navigation';
import { useAuth } from '@/hooks/useAuth';
import { CountriesPanel } from './CountriesPanel';
import { CountryModal } from './CountryModal';

const GROUP = NAV_GROUPS.find((g) => g.path === '/commerce')!;

/**
 * Plans & Commerce hub (prototype parent-content.js `renderCommerceHub`): the section cards, then
 * "Country pricing" for admins with Subscriptions or Shop & Orders (its columns follow which).
 * Adding a country needs either section (the API's rule).
 */
export function CommerceHubPage() {
  const { can } = useAuth();
  const canPricing = can('subscriptions') || can('shopOrders');
  const [adding, setAdding] = useState(false);

  return (
    <HubPage
      group={GROUP}
      subtitle={GROUP.hubSubtitle ?? ''}
      actions={
        canPricing && (
          <Button variant="primary" onClick={() => setAdding(true)}>
            Add country
          </Button>
        )
      }
    >
      {canPricing && <CountriesPanel mode="pricing" className="mt-[22px]" />}
      <CountryModal open={adding} country={null} onClose={() => setAdding(false)} />
    </HubPage>
  );
}
