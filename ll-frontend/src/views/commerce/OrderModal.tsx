import { useLayoutEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Note } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { FormGrid, SelectField, TextField } from '@/components/ui/Field';
import { humanize } from '@/components/ui/Badge';
import { errorMessage } from '@/api/client';
import { useUpdateOrder, type OrderChange } from '@/api/orders';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTime, formatMoney } from '@/utils/format';
import {
  ORDER_ADDRESS_ERROR,
  TRACKING_LINK_ERROR,
  isClosedOrder,
  nextOrderStatuses,
  type Order,
  type OrderAddress,
  type OrderStatus,
} from './data';

const ADDRESS_FIELDS: [keyof OrderAddress, string][] = [
  ['recipient', 'Recipient'],
  ['line1', 'Address line 1'],
  ['line2', 'Address line 2'],
  ['city', 'City'],
  ['state', 'State / region'],
  ['postcode', 'Postcode'],
  ['phone', 'Contact phone'],
];

/** The address as the API stores it: trimmed; blank line 2 / state → null, blank phone → "". */
const cleanAddress = (a: OrderAddress): OrderAddress => ({
  recipient: a.recipient.trim(),
  line1: a.line1.trim(),
  line2: a.line2?.trim() || null,
  city: a.city.trim(),
  state: a.state?.trim() || null,
  postcode: a.postcode.trim(),
  phone: a.phone.trim(),
});

/**
 * "Order #n" (prototype commerce.js order modal; guide §20). Items at the price paid, subtotal,
 * one delivery charge and the total (tax excluded, OPEN_QUESTIONS Q11), then status and tracking.
 * Updates apply directly, not as drafts (OPEN_QUESTIONS Q31); the server audits each one and
 * notifies the parent. Only the fields that changed are sent; nothing changed → no request.
 * Cancelled and Refunded orders are closed (Q35): read only, except Cancelled → Refunded.
 * A Sub Admin without direct publishing is told that updates apply straight away: everywhere else
 * their changes wait for approval (the page banner says so).
 * Deliberate differences: the items table, and the address as separate fields (the Order.address
 * shape) instead of one "Delivery address and contact" box.
 */
export function OrderModal({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const { canPublish } = useAuth();
  const update = useUpdateOrder();
  const [status, setStatus] = useState<OrderStatus>('PAID');
  const [trackingRef, setTrackingRef] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [address, setAddress] = useState<OrderAddress | null>(null);
  const closed = order ? isClosedOrder(order.status) : false;
  const final = order?.status === 'REFUNDED';

  useLayoutEffect(() => {
    if (!order) return;
    setStatus(order.status);
    setTrackingRef(order.trackingRef ?? '');
    setTrackingUrl(order.trackingUrl ?? '');
    setAddress(order.address);
  }, [order?.id]); // read once per opening

  const onSave = async () => {
    if (!order || !address) return;
    const ref = trackingRef.trim() || null;
    const url = trackingUrl.trim() || null;
    const next = cleanAddress(address);
    if (url && !/^https?:\/\/\S+$/i.test(url)) return void toast.error(TRACKING_LINK_ERROR);
    if (!next.recipient || !next.line1 || !next.city || !next.postcode) return void toast.error(ORDER_ADDRESS_ERROR);

    const change: OrderChange = {};
    if (status !== order.status) change.status = status;
    if (ref !== order.trackingRef) change.trackingRef = ref;
    if (url !== order.trackingUrl) change.trackingUrl = url;
    if (JSON.stringify(next) !== JSON.stringify(cleanAddress(order.address))) change.address = next;
    if (!Object.keys(change).length) return void toast('Nothing changed');

    try {
      await update.mutateAsync({ id: order.id, change });
      toast.success(`Updated order #${order.number}`);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Modal
      open={order !== null}
      onClose={onClose}
      title={order ? `Order #${order.number}` : 'Order'}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          {!final && (
            <Button variant="primary" onClick={onSave} disabled={update.isPending}>
              Save
            </Button>
          )}
        </>
      }
    >
      {order && address && (
        <>
          {!canPublish && !final && <Note className="mt-0">Order updates apply straight away and notify the parent.</Note>}
          <p className="text-body">
            {order.parentName} · {order.parentEmail} · {order.countryCode} · {formatDateTime(order.createdAt)}
          </p>
          <table className="mt-4 w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                {['Product', 'Price paid', 'Qty', 'Line total'].map((h) => (
                  <th key={h} className="border-b border-line px-3 py-3 text-[12px] font-semibold text-muted first:pl-0">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {order.items.map((i) => (
                <tr key={i.id}>
                  <td className="border-b border-line px-3 py-3 first:pl-0">{i.titleSnapshot}</td>
                  <td className="border-b border-line px-3 py-3">{formatMoney(i.unitPrice, order.currency)}</td>
                  <td className="border-b border-line px-3 py-3">{i.quantity}</td>
                  <td className="border-b border-line px-3 py-3">{formatMoney(i.unitPrice * i.quantity, order.currency)}</td>
                </tr>
              ))}
              {[
                ['Subtotal', order.subtotal],
                ['Delivery (one charge per order)', order.deliveryCharge],
                ['Total (tax not included)', order.total],
              ].map(([label, amount]) => (
                <tr key={label as string}>
                  <td colSpan={3} className="border-b border-line px-3 py-3 text-right font-semibold text-body first:pl-0">
                    {label}
                  </td>
                  <td className="border-b border-line px-3 py-3 font-semibold">{formatMoney(amount as number, order.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Delivery address and contact</h3>
          <FormGrid>
            {ADDRESS_FIELDS.map(([key, label]) => (
              <TextField
                key={key}
                label={label}
                disabled={closed}
                value={address[key] ?? ''}
                onChange={(e) => setAddress({ ...address, [key]: e.target.value || (key === 'line2' || key === 'state' ? null : '') })}
              />
            ))}
          </FormGrid>

          <h3>Status and tracking</h3>
          <FormGrid>
            <SelectField
              label="Order status"
              value={status}
              disabled={final}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              options={nextOrderStatuses(order.status).map((s) => ({ value: s, label: humanize(s) }))}
            />
            <TextField label="Tracking reference" disabled={closed} value={trackingRef} onChange={(e) => setTrackingRef(e.target.value)} />
            <TextField label="Tracking link" type="url" placeholder="https://…" disabled={closed} value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} />
          </FormGrid>
          <Note>
            {final
              ? 'This order is refunded and closed, so it can’t be changed.'
              : closed
                ? 'This order is cancelled and closed. It can only be marked Refunded.'
                : 'An order update notifies the parent through email and in-app notification. Cancelling or refunding a Paid or Packed order returns its items to stock. Cancelled and Refunded are final.'}
            {status === 'REFUNDED' && ' Marking an order Refunded does not move any money.'}
          </Note>
        </>
      )}
    </Modal>
  );
}
