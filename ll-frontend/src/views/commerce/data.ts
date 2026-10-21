/**
 * Plans & Commerce types and checks. Everything comes from the API (docs/API_REQUESTS.md #20–#22:
 * src/api/plans.ts, products.ts and orders.ts, which turn the API's "199.00" amounts into numbers).
 * Prices are keyed by country code: a missing key = unavailable there, 0 = free. Amounts are in
 * the country's own currency and never converted.
 */
import type { PlanTier } from '@/constants/plans';

/** An unpublished change, waiting as a draft or for Super Admin approval (as in Stories). */
export interface Pending<T> {
  status: 'DRAFT' | 'PENDING_APPROVAL';
  content: T;
  /** Its row in Draft approvals. */
  draftId: string;
}

export type Prices = Record<string, number>;

/** What the plan editor changes. Free is always active and always free (deliberate difference). */
export interface PlanContent {
  active: boolean;
  /** Memory items allowed per child; null = Unlimited. */
  memoryLimit: number | null;
  /** Monthly price per child, by country code. Ignored for Free. */
  prices: Prices;
}

export interface Plan extends PlanContent {
  tier: PlanTier;
  name: string;
  pending: Pending<PlanContent> | null;
}

/** ContentStatus values a product uses here; WITHDRAWN is shown as "Archived" (prototype). */
export type ProductStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'WITHDRAWN';
export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending approval',
  PUBLISHED: 'Published',
  WITHDRAWN: 'Archived',
};

export interface ProductContent {
  title: string;
  sku: string;
  category: string | null;
  ageRecommendation: string | null;
  description: string | null;
  /** "Full details / what is included". */
  details: string | null;
  /** "Materials and care / safety information". */
  materials: string | null;
  /** Shared across countries. */
  stock: number;
  /** The status the editor chose: Draft, Published or Archived. */
  status: 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN';
  /** In order; the first is the cover. */
  images: ProductImage[];
  prices: Prices;
}

/** `id` is null for an image of a pending change or a new upload, so rows are keyed by URL and position. */
export interface ProductImage {
  id: string | null;
  url: string;
  position: number;
}

export interface Product extends Omit<ProductContent, 'status'> {
  /** A never-published product's id is its draft's id, until the first publish. */
  id: string;
  status: ProductStatus;
  /** Quantity in orders by country, leaving out Cancelled and Refunded ones ({} until #22). */
  orderedByCountry: Record<string, number>;
  pending: Pending<ProductContent> | null;
}

/** Never published: the draft is the whole product (it can't be priced in "Edit prices" yet). */
export const neverPublished = (p: Product) => p.pending?.draftId === p.id;

/** What an editor starts from: the pending change if there is one (the latest edit), else what's live. */
export const editablePlan = (p: Plan): PlanContent => p.pending?.content ?? p;
export const editableProduct = (p: Product): ProductContent =>
  p.pending?.content ?? { ...p, status: p.status === 'WITHDRAWN' ? 'WITHDRAWN' : p.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT' };

/** Prisma OrderStatus, in the prototype's order. */
export const ORDER_STATUSES = ['PAID', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'REFUNDED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Cancelled and Refunded orders are closed (OPEN_QUESTIONS Q35; the API's orderStatusChange()):
 * nothing can change except Cancelled → Refunded. The editor uses this to show them read only.
 */
export const isClosedOrder = (status: OrderStatus) => status === 'CANCELLED' || status === 'REFUNDED';

/** The statuses an order can move to from its saved status (itself included). */
export const nextOrderStatuses = (status: OrderStatus): readonly OrderStatus[] =>
  status === 'CANCELLED' ? ['CANCELLED', 'REFUNDED'] : status === 'REFUNDED' ? ['REFUNDED'] : ORDER_STATUSES;

export interface OrderAddress {
  recipient: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postcode: string;
  phone: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  /** The title and price when ordered: later catalogue changes never alter an order. */
  titleSnapshot: string;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: string;
  number: number;
  parentName: string;
  parentEmail: string;
  countryCode: string;
  currency: string;
  subtotal: number;
  /** One charge per order. */
  deliveryCharge: number;
  /** Excludes tax (OPEN_QUESTIONS Q11). */
  total: number;
  status: OrderStatus;
  address: OrderAddress;
  trackingRef: string | null;
  trackingUrl: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

// ---- Checks (prototype messages) --------------------------------------------------------------

export const MEMORY_ERROR = 'Use a whole number or Unlimited for memory items.';
export const PLAN_PRICE_ERROR = 'Enter a non-negative price.';
export const COUNTRY_PRICES_ERROR = 'Enter prices of zero or more.';
export const TRACKING_LINK_ERROR = 'Enter a valid tracking link.';
/** The API's wording (API_REQUESTS #22). */
export const ORDER_ADDRESS_ERROR = 'Enter the recipient, address line 1, city and postcode.';

/** "Unlimited" (any case) → null; a whole number ≥ 0 → that number; anything else → undefined. */
export function parseMemory(raw: string): number | null | undefined {
  const t = raw.trim();
  if (/^unlimited$/i.test(t)) return null;
  return /^\d+$/.test(t) && Number.isSafeInteger(Number(t)) ? Number(t) : undefined;
}

export const memoryLabel = (limit: number | null) => (limit === null ? 'Unlimited' : String(limit));

/** Price inputs: blank = unavailable (no key), otherwise a number ≥ 0. Returns null if any is invalid. */
export function parsePrices(raw: Record<string, string>): Prices | null {
  const prices: Prices = {};
  for (const [code, value] of Object.entries(raw)) {
    if (value.trim() === '') continue;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return null;
    prices[code] = Math.round(n * 100) / 100;
  }
  return prices;
}
