import { useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Note } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { FormGrid, SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import { LibraryImage } from '@/components/library/LibraryImage';
import { acceptFor, uploadFile } from '@/api/uploads';
import { errorMessage } from '@/api/client';
import { useCountries } from '@/api/countries';
import { useProducts, useRejectProduct, useSaveProduct } from '@/api/products';
import { useAuth } from '@/hooks/useAuth';
import { useApprovePending } from '@/hooks/useApprovePending';
import { UPLOAD_RULES } from '@/constants/uploads';
import { moveItem, withPositions } from '@/utils/reorder';
import { editableProduct, neverPublished, parsePrices, type Product, type ProductContent } from './data';
import { DRAFT_SAVED } from '@/constants/messages';
import { CountryPriceFields } from './CountryPriceFields';

type Form = Omit<ProductContent, 'stock' | 'prices' | 'images' | 'category' | 'ageRecommendation' | 'description' | 'details' | 'materials'> & {
  stock: string;
  category: string;
  ageRecommendation: string;
  description: string;
  details: string;
  materials: string;
};

const EMPTY: Form = { title: '', sku: '', category: 'Playing kits', ageRecommendation: '3+', description: '', details: '', materials: '', stock: '0', status: 'DRAFT' };

/**
 * "Add product" / "Edit product" (prototype commerce.js `productEditor`; guide §20). Images are
 * uploaded; the first is the cover. Stock is shared across countries; each country has its own
 * price (blank = not purchasable there, 0 = free). Messages are the prototype's, except
 * "Enter a product title." and "Enter a SKU." (our wording; the prototype marks them required).
 * On the API (#21): one pending change per product; the editor closes after every save, so a
 * product's first publish (its draft id becomes a real id) is picked up by the refetch. Approve on
 * an unedited pending change approves that draft (useApprovePending). The country prices have a
 * search box (deliberate difference).
 */

/** A product's content for comparing (images by URL, prices in country order). */
const sameAs = (c: ProductContent | undefined) =>
  c &&
  JSON.stringify([
    c.title, c.sku, c.category, c.ageRecommendation, c.description, c.details, c.materials, c.stock, c.status,
    [...c.images].sort((a, b) => a.position - b.position).map((i) => i.url),
    Object.entries(c.prices).sort(([a], [b]) => a.localeCompare(b)),
  ]);
export function ProductModal({ product, open, onClose }: { product: Product | null; open: boolean; onClose: () => void }) {
  const { isSuperAdmin } = useAuth();
  const { data: countries } = useCountries();
  const { data: products = [] } = useProducts();
  const save = useSaveProduct();
  const reject = useRejectProduct();
  const [form, setForm] = useState<Form>(EMPTY);
  const [images, setImages] = useState<ProductContent['images']>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    if (!product) {
      setForm(EMPTY);
      setImages([]);
      setPrices({});
      return;
    }
    const c = editableProduct(product);
    setForm({
      title: c.title,
      sku: c.sku,
      category: c.category ?? '',
      ageRecommendation: c.ageRecommendation ?? '',
      description: c.description ?? '',
      details: c.details ?? '',
      materials: c.materials ?? '',
      stock: String(c.stock),
      status: c.status,
    });
    setImages(c.images);
    setPrices(Object.fromEntries(Object.entries(c.prices).map(([k, v]) => [k, String(v)])));
  }, [open, product?.id]); // read once per opening

  const set = (key: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const addImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all([...files].map((f) => uploadFile(f, 'IMAGE')));
      setImages((list) => withPositions([...list, ...uploaded.map((u) => ({ id: null, url: u.url, position: 0 }))]));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  };

  /** The form as product content, or undefined while stock or a price is invalid. */
  const formContent = (): ProductContent | undefined => {
    const parsed = parsePrices(prices);
    if (!parsed || !/^\d+$/.test(form.stock.trim())) return undefined;
    return {
      title: form.title.trim(),
      sku: form.sku.trim(),
      category: form.category.trim() || null,
      ageRecommendation: form.ageRecommendation.trim() || null,
      description: form.description.trim() || null,
      details: form.details.trim() || null,
      materials: form.materials.trim() || null,
      stock: Number(form.stock),
      status: form.status,
      images: withPositions(images),
      prices: parsed,
    };
  };
  const pending = useApprovePending(product?.pending?.draftId, Boolean(product?.pending) && sameAs(formContent()) === sameAs(product ? editableProduct(product) : undefined));
  const busy = save.isPending || reject.isPending || pending.isPending || uploading;

  const onSave = async (mode: SaveMode) => {
    const title = form.title.trim();
    const sku = form.sku.trim();
    if (!title) return void toast.error('Enter a product title.');
    if (!sku) return void toast.error('Enter a SKU.');
    const parsed = parsePrices(prices);
    if (!parsed) return void toast.error('Prices must be zero or greater.');
    if (!/^\d+$/.test(form.stock.trim())) return void toast.error('Stock must be a non-negative whole number.');
    if (products.some((p) => p.id !== product?.id && p.sku.toLowerCase() === sku.toLowerCase())) return void toast.error('SKU must be unique.');
    if (form.status === 'PUBLISHED' && (!images.length || !Object.keys(parsed).length)) {
      return void toast.error('Add an image and at least one country price before publishing.');
    }
    const content = formContent()!;
    try {
      if (mode === 'publish' && pending.viaDraft) {
        await pending.approve();
        toast.success(`Saved product ${title}`);
        return onClose();
      }
      const result = await save.mutateAsync({ id: product?.id, mode, content });
      toast.success(result.status === 'draft' ? DRAFT_SAVED : `Saved product ${title}`);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const onReject = async () => {
    if (!product) return;
    try {
      const result = await reject.mutateAsync(product.id);
      toast.success(result.status === 'draft' ? 'Product returned to draft' : 'Change rejected. Parents still see the published product.');
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const awaiting = product?.pending?.status === 'PENDING_APPROVAL';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? 'Edit product' : 'Add product'}
      footer={<DecisionActions onClose={onClose} onSave={onSave} onReject={onReject} showReject={isSuperAdmin && awaiting} busy={busy} note={pending.note} />}
    >
      {open && (
        <>
          {product?.pending && !neverPublished(product) && (
            <Note className="mt-0">
              {product.pending.status === 'PENDING_APPROVAL' ? 'This change is waiting for Super Admin approval.' : 'You are editing a saved draft of this product.'}{' '}
              Parents still see the published product.
            </Note>
          )}
          <FormGrid>
            <TextField label="Product title" value={form.title} onChange={set('title')} />
            <TextField label="SKU" value={form.sku} onChange={set('sku')} />
            <TextField label="Category" value={form.category} onChange={set('category')} />
            <TextField label="Age recommendation" value={form.ageRecommendation} onChange={set('ageRecommendation')} />
            <TextAreaField label="Short description" value={form.description} onChange={set('description')} />
            <TextAreaField label="Full details / what is included" value={form.details} onChange={set('details')} />
            <TextAreaField label="Materials and care / safety information" value={form.materials} onChange={set('materials')} />
            <TextField label="Stock quantity" type="number" min={0} step={1} value={form.stock} onChange={set('stock')} />
            <SelectField
              label="Status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Form['status'] }))}
              options={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'PUBLISHED', label: 'Published' },
                { value: 'WITHDRAWN', label: 'Archived' },
              ]}
            />
          </FormGrid>

          <h3>Images</h3>
          <div className="grid gap-3 text-[12px] text-body">
            {images.map((img, i) => (
              // Keyed by URL and position: images of a pending change have no id yet.
              <div key={`${img.url}-${i}`} className="flex flex-wrap items-center gap-[15px] rounded-md border border-line p-2.5">
                <LibraryImage src={img.url} label={i === 0 ? 'Cover image' : `Image ${i + 1}`} className="h-[90px] w-[120px]" />
                <strong>{i === 0 ? 'Cover image' : `Image ${i + 1}`}</strong>
                <div className="ml-auto flex gap-2">
                  {i > 0 && (
                    <Button disabled={busy} onClick={() => setImages((list) => withPositions(moveItem(list, i, 0)))}>
                      Make cover
                    </Button>
                  )}
                  <Button disabled={busy} onClick={() => setImages((list) => withPositions(list.filter((_, n) => n !== i)))}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            <input ref={input} type="file" multiple accept={acceptFor('IMAGE')} className="hidden" onChange={(e) => addImages(e.target.files)} />
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={busy} onClick={() => input.current?.click()}>
                {uploading ? 'Uploading…' : '+ Add images'}
              </Button>
              <span className="text-muted">{UPLOAD_RULES.IMAGE.label}</span>
            </div>
          </div>

          <h3>Country prices</h3>
          <p className="mb-4 leading-[1.7] text-muted">Leave blank to make the product unavailable in that country; 0 is free. Amounts are in each country’s currency.</p>
          <CountryPriceFields countries={countries ?? []} values={prices} onChange={(code, value) => setPrices((p) => ({ ...p, [code]: value }))} />
        </>
      )}
    </Modal>
  );
}
