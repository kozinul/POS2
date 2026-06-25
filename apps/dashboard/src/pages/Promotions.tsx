import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface Outlet { _id: string; name: string; code: string }
interface PaymentMethod { _id: string; name: string; code: string }
interface Product { _id: string; name: string; price: number }
interface Category { _id: string; name: string }
interface Family { _id: string; name: string }

interface RuleCondition {
  scope?: string; targetIds?: string[]; value?: number; unit?: string;
  minQty?: number; maxQty?: number; buyQty?: number; freeQty?: number;
  payQty?: number; minAmount?: number; every?: number;
  giftProductId?: string; giftQty?: number; price?: number;
  tier?: string; daysOfWeek?: number[]; startTime?: string; endTime?: string;
  items?: { productId: string; qty: number }[]; bundlePrice?: number;
  operator?: string; field?: string;
}

interface Rule {
  type: string; label?: string; conditions: RuleCondition;
}

interface Promotion {
  _id: string; name: string; code: string; description?: string;
  outlets: Outlet[]; customerTiers: string[]; paymentMethodIds: PaymentMethod[];
  priority: number; exclusive: boolean; stackable: boolean;
  rules: Rule[]; ruleLogic: 'AND' | 'OR';
  usageLimit: { perPromotion: number; perCustomer: number };
  usedCount: number; minCartValue: number;
  startDate?: string; endDate?: string; active: boolean;
  requiresCode: boolean;
}

const RULE_TYPES = [
  { value: 'percentage', label: 'Diskon %', desc: 'Potongan persen per item' },
  { value: 'nominal', label: 'Diskon Rp', desc: 'Potongan nominal per item' },
  { value: 'special_price', label: 'Harga Khusus', desc: 'Set harga spesifik per item' },
  { value: 'min_quantity', label: 'Min. Qty', desc: 'Diskon jika beli minimal Qty' },
  { value: 'nth_item', label: 'Setiap ke-n', desc: 'Diskon setiap item ke-n' },
  { value: 'quantity_range', label: 'Range Qty', desc: 'Diskon bertingkat per range' },
  { value: 'bundle', label: 'Bundle', desc: 'Harga paket untuk item tertentu' },
  { value: 'buy_x_get_y', label: 'Beli X Gratis Y', desc: 'Item gratis' },
  { value: 'buy_x_pay_y', label: 'Beli X Bayar Y', desc: 'Bayar lebih sedikit item' },
  { value: 'free_gift', label: 'Free Gift', desc: 'Hadiah gratis' },
  { value: 'min_spend', label: 'Min. Belanja', desc: 'Diskon minimal total belanja' },
  { value: 'multiplier', label: 'Multiplier', desc: 'Multiply points/reward' },
  { value: 'member_tier', label: 'Member Tier', desc: 'Khusus tier member tertentu' },
  { value: 'payment_method', label: 'Metode Bayar', desc: 'Diskon khusus pembayaran' },
  { value: 'time_window', label: 'Time Window', desc: 'Diskon di jam tertentu' },
  { value: 'customer_match', label: 'Customer', desc: 'Berdasarkan field customer' },
];

const SCOPE_OPTIONS = [
  { value: 'all', label: 'Semua Item' },
  { value: 'category', label: 'Per Kategori' },
  { value: 'family', label: 'Per Family' },
  { value: 'product', label: 'Per Produk' },
];

const TIERS = ['regular', 'silver', 'gold', 'platinum'];
const UNITS = [
  { value: 'percentage', label: '%' },
  { value: 'nominal', label: 'Rp' },
];

function emptyRule(type = 'percentage'): Rule {
  return {
    type,
    label: '',
    conditions: { scope: 'all', targetIds: [], unit: 'percentage' },
  };
}

function formatDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleString('id', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Promotions() {
  const { token } = useAuth();
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', code: '', description: '',
    outlets: [] as string[], customerTiers: [] as string[],
    paymentMethodIds: [] as string[],
    priority: 10, exclusive: false, stackable: true,
    rules: [emptyRule('percentage')] as Rule[],
    ruleLogic: 'AND' as 'AND' | 'OR',
    usageLimitPerPromotion: '', usageLimitPerCustomer: '',
    minCartValue: '',
    startDate: '', endDate: '', active: true,
    requiresCode: false,
  });

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/promotions', { headers }).then((r) => r.json()).then(setPromos);
    fetch('/api/outlets', { headers }).then((r) => r.json()).then(setOutlets);
    fetch('/api/payment-methods', { headers }).then((r) => r.json()).then(setPaymentMethods);
    fetch('/api/products?limit=200', { headers }).then((r) => r.json()).then((d) => setProducts(d.products || d));
    fetch('/api/categories').then((r) => r.json()).then(setCategories);
    fetch('/api/families').then((r) => r.json()).then(setFamilies);
  }, []);

  function resetForm() {
    setForm({
      name: '', code: '', description: '', outlets: [], customerTiers: [],
      paymentMethodIds: [], priority: 10, exclusive: false, stackable: true,
      rules: [emptyRule('percentage')], ruleLogic: 'AND',
      usageLimitPerPromotion: '', usageLimitPerCustomer: '',
      minCartValue: '', startDate: '', endDate: '', active: true,
      requiresCode: false,
    });
  }

  function toggleArray(arr: string[], val: string) {
    return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
  }

  function addRule() {
    setForm({ ...form, rules: [...form.rules, emptyRule('percentage')] });
  }

  function removeRule(i: number) {
    if (form.rules.length <= 1) return;
    setForm({ ...form, rules: form.rules.filter((_, idx) => idx !== i) });
  }

  function updateRule(i: number, rule: Rule) {
    const rules = [...form.rules];
    rules[i] = rule;
    setForm({ ...form, rules });
  }

  function toggleTargetId(i: number, id: string) {
    const rule = { ...form.rules[i] };
    if (!rule.conditions.targetIds) rule.conditions.targetIds = [];
    rule.conditions.targetIds = toggleArray(rule.conditions.targetIds!, id);
    updateRule(i, rule);
  }

  function addBundleItem(i: number) {
    const rule = { ...form.rules[i] };
    if (!rule.conditions.items) rule.conditions.items = [];
    rule.conditions.items = [...rule.conditions.items, { productId: '', qty: 1 }];
    updateRule(i, rule);
  }

  function updateBundleItem(i: number, idx: number, field: string, val: any) {
    const rule = { ...form.rules[i] };
    const items = [...(rule.conditions.items || [])];
    (items as any)[idx][field] = val;
    rule.conditions.items = items;
    updateRule(i, rule);
  }

  function removeBundleItem(i: number, idx: number) {
    const rule = { ...form.rules[i] };
    rule.conditions.items = (rule.conditions.items || []).filter((_, id) => id !== idx);
    updateRule(i, rule);
  }

  function hasScope(t: string) {
    return ['percentage', 'nominal', 'special_price', 'quantity_range', 'min_quantity', 'nth_item', 'buy_x_get_y', 'buy_x_pay_y', 'multiplier'].includes(t);
  }

  async function save() {
    setError('');
    if (!form.name || !form.code) { setError('Nama dan kode harus diisi'); return; }

    const body: Record<string, any> = {
      name: form.name, code: form.code,
      description: form.description || undefined,
      outlets: form.outlets, customerTiers: form.customerTiers,
      paymentMethodIds: form.paymentMethodIds,
      priority: form.priority, exclusive: form.exclusive, stackable: form.stackable,
      rules: form.rules, ruleLogic: form.ruleLogic,
      usageLimit: {
        perPromotion: Number(form.usageLimitPerPromotion) || 0,
        perCustomer: Number(form.usageLimitPerCustomer) || 0,
      },
      minCartValue: Number(form.minCartValue) || 0,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      active: form.active,
      requiresCode: form.requiresCode,
    };

    const url = editingId ? `/api/promotions/${editingId}` : '/api/promotions';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const data = await res.json();
      setError(data.message || 'Gagal menyimpan');
      return;
    }
    setShowForm(false);
    setEditingId(null);
    resetForm();
    fetch('/api/promotions', { headers }).then((r) => r.json()).then(setPromos);
  }

  async function remove(id: string) {
    if (!confirm('Hapus promosi?')) return;
    await fetch(`/api/promotions/${id}`, { method: 'DELETE', headers });
    fetch('/api/promotions', { headers }).then((r) => r.json()).then(setPromos);
  }

  function edit(p: Promotion) {
    setForm({
      name: p.name, code: p.code, description: p.description || '',
      outlets: p.outlets?.map((o) => o._id) || [],
      customerTiers: p.customerTiers || [],
      paymentMethodIds: p.paymentMethodIds?.map((pm) => pm._id) || [],
      priority: p.priority, exclusive: p.exclusive, stackable: p.stackable,
      rules: p.rules?.length ? p.rules : [emptyRule('percentage')],
      ruleLogic: p.ruleLogic || 'AND',
      usageLimitPerPromotion: String(p.usageLimit?.perPromotion || ''),
      usageLimitPerCustomer: String(p.usageLimit?.perCustomer || ''),
      minCartValue: String(p.minCartValue || ''),
      startDate: p.startDate ? p.startDate.slice(0, 16) : '',
      endDate: p.endDate ? p.endDate.slice(0, 16) : '',
      active: p.active,
      requiresCode: p.requiresCode,
    });
    setEditingId(p._id);
    setShowForm(true);
  }

  function renderConditionFields(rule: Rule, i: number) {
    const c = rule.conditions;
    const type = rule.type;

    return (
      <div className="space-y-2 pl-6 border-l-2 border-primary/20">
        {rule.label !== undefined && (
          <input
            placeholder="Label rule (opsional)"
            value={rule.label || ''}
            onChange={(e) => updateRule(i, { ...rule, label: e.target.value })}
            className="w-full px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md"
          />
        )}

        {/* Scope selector */}
        {hasScope(type) && (
          <select
            value={c.scope || 'all'}
            onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, scope: e.target.value, targetIds: [] } })}
            className="w-full px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md"
          >
            {SCOPE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        )}

        {/* Target selectors - multi-select checkboxes */}
        {c.scope === 'product' && (
          <div className="flex flex-wrap gap-1">
            {products.map((p) => (
              <label key={p._id} className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs cursor-pointer transition-colors ${c.targetIds?.includes(p._id) ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}>
                <input type="checkbox" checked={c.targetIds?.includes(p._id) || false} className="hidden"
                  onChange={() => toggleTargetId(i, p._id)} />
                {p.name}
              </label>
            ))}
          </div>
        )}
        {c.scope === 'category' && (
          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <label key={cat._id} className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs cursor-pointer transition-colors ${c.targetIds?.includes(cat._id) ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}>
                <input type="checkbox" checked={c.targetIds?.includes(cat._id) || false} className="hidden"
                  onChange={() => toggleTargetId(i, cat._id)} />
                {cat.name}
              </label>
            ))}
          </div>
        )}
        {c.scope === 'family' && (
          <div className="flex flex-wrap gap-1">
            {families.map((f) => (
              <label key={f._id} className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs cursor-pointer transition-colors ${c.targetIds?.includes(f._id) ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}>
                <input type="checkbox" checked={c.targetIds?.includes(f._id) || false} className="hidden"
                  onChange={() => toggleTargetId(i, f._id)} />
                {f.name}
              </label>
            ))}
          </div>
        )}

        {/* Value fields based on type */}
        {(type === 'percentage' || type === 'nominal') && (
          <div className="flex gap-2 items-center">
            <input type="number" placeholder={type === 'percentage' ? '%' : 'Rp'} value={c.value ?? ''}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, value: Number(e.target.value) } })}
              className="flex-1 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
          </div>
        )}

        {type === 'special_price' && (
          <input type="number" placeholder="Harga khusus (Rp)" value={c.price ?? ''}
            onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, price: Number(e.target.value) } })}
            className="w-full px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
        )}

        {type === 'min_quantity' && (
          <div className="flex gap-2">
            <input type="number" placeholder="Min. Qty" value={c.minQty ?? ''}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, minQty: Number(e.target.value) } })}
              className="flex-1 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
            <input type="number" placeholder="Nilai" value={c.value ?? ''}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, value: Number(e.target.value) } })}
              className="w-20 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
            <select value={c.unit || 'percentage'}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, unit: e.target.value } })}
              className="w-16 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md">
              {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        )}

        {type === 'nth_item' && (
          <div className="flex gap-2">
            <input type="number" placeholder="Setiap ke-" value={c.every ?? ''}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, every: Number(e.target.value) } })}
              className="w-24 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
            <input type="number" placeholder="Nilai" value={c.value ?? ''}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, value: Number(e.target.value) } })}
              className="w-20 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
            <select value={c.unit || 'percentage'}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, unit: e.target.value } })}
              className="w-16 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md">
              {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        )}

        {type === 'quantity_range' && (
          <div className="flex gap-2 flex-wrap">
            <input type="number" placeholder="Min Qty" value={c.minQty ?? ''}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, minQty: Number(e.target.value) } })}
              className="w-20 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
            <input type="number" placeholder="Max Qty" value={c.maxQty ?? ''}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, maxQty: Number(e.target.value) } })}
              className="w-20 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
            <input type="number" placeholder="Nilai" value={c.value ?? ''}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, value: Number(e.target.value) } })}
              className="w-20 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
            <select value={c.unit || 'percentage'}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, unit: e.target.value } })}
              className="w-16 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md">
              {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        )}

        {type === 'bundle' && (
          <div className="space-y-1">
            {c.items?.map((item, idx) => (
              <div key={idx} className="flex gap-1 items-center">
                <select value={item.productId}
                  onChange={(e) => updateBundleItem(i, idx, 'productId', e.target.value)}
                  className="flex-1 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md">
                  <option value="">Pilih Produk</option>
                  {products.map((p) => <option key={p._id} value={p._id}>{p.name} - Rp{p.price.toLocaleString()}</option>)}
                </select>
                <input type="number" placeholder="Qty" value={item.qty} min={1}
                  onChange={(e) => updateBundleItem(i, idx, 'qty', Number(e.target.value))}
                  className="w-16 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
                <button onClick={() => removeBundleItem(i, idx)} className="text-error p-1">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            ))}
            <button onClick={() => addBundleItem(i)} className="text-xs text-primary font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">add</span>Tambah Item
            </button>
            <input type="number" placeholder="Harga Bundle (Rp)" value={c.bundlePrice ?? ''}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, bundlePrice: Number(e.target.value) } })}
              className="w-full px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md mt-1" />
          </div>
        )}

        {(type === 'buy_x_get_y') && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input type="number" placeholder="Beli (qty)" value={c.buyQty ?? ''}
                onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, buyQty: Number(e.target.value) } })}
                className="w-24 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
              <input type="number" placeholder="Gratis (qty)" value={c.freeQty ?? ''}
                onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, freeQty: Number(e.target.value) } })}
                className="w-24 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-[10px] text-on-surface-variant font-semibold w-12">Hadiah:</span>
              <select value={c.giftProductId || ''}
                onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, giftProductId: e.target.value || undefined } })}
                className="flex-1 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md">
                <option value="">(Otomatis — item termurah)</option>
                {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {(type === 'buy_x_pay_y') && (
          <div className="flex gap-2">
            <input type="number" placeholder="Beli" value={c.buyQty ?? ''}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, buyQty: Number(e.target.value) } })}
              className="w-20 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
            <input type="number" placeholder="Bayar" value={c.payQty ?? ''}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, payQty: Number(e.target.value) } })}
              className="w-20 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
          </div>
        )}

        {type === 'free_gift' && (
          <div className="flex gap-2">
            <input type="number" placeholder="Min. Belanja" value={c.minAmount ?? ''}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, minAmount: Number(e.target.value) } })}
              className="w-28 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
            <select value={c.giftProductId || ''}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, giftProductId: e.target.value } })}
              className="flex-1 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md">
              <option value="">Pilih Hadiah</option>
              {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <input type="number" placeholder="Qty" value={c.giftQty ?? 1} min={1}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, giftQty: Number(e.target.value) } })}
              className="w-16 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
          </div>
        )}

        {type === 'min_spend' && (
          <div className="flex gap-2">
            <input type="number" placeholder="Min. Belanja (Rp)" value={c.minAmount ?? ''}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, minAmount: Number(e.target.value) } })}
              className="flex-1 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
            <input type="number" placeholder="Nilai" value={c.value ?? ''}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, value: Number(e.target.value) } })}
              className="w-20 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
            <select value={c.unit || 'percentage'}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, unit: e.target.value } })}
              className="w-16 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md">
              {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        )}

        {type === 'multiplier' && (
          <input type="number" placeholder="Nilai multiplier (contoh: 2)" value={c.value ?? ''}
            onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, value: Number(e.target.value) } })}
            className="w-full px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
        )}

        {type === 'member_tier' && (
          <select value={c.tier || ''}
            onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, tier: e.target.value } })}
            className="w-full px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md">
            <option value="">Pilih Tier</option>
            {TIERS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        )}

        {type === 'payment_method' && (
          <div className="flex gap-2">
            {c.minAmount !== undefined && (
              <input type="number" placeholder="Min. Belanja" value={c.minAmount ?? ''}
                onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, minAmount: Number(e.target.value) } })}
                className="w-28 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
            )}
            <input type="number" placeholder="Nilai" value={c.value ?? ''}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, value: Number(e.target.value) } })}
              className="w-20 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
            <select value={c.unit || 'percentage'}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, unit: e.target.value } })}
              className="w-16 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md">
              {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        )}

        {type === 'time_window' && (
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day, idx) => (
                <label key={idx} className={`text-xs px-2 py-1 rounded border cursor-pointer ${c.daysOfWeek?.includes(idx) ? 'bg-primary text-white border-primary' : 'bg-white border-outline-variant text-on-surface-variant'}`}>
                  <input type="checkbox" checked={c.daysOfWeek?.includes(idx) || false} className="hidden"
                    onChange={() => updateRule(i, { ...rule, conditions: { ...c, daysOfWeek: c.daysOfWeek?.includes(idx) ? c.daysOfWeek.filter((d) => d !== idx) : [...(c.daysOfWeek || []), idx] } })} />
                  {day}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="time" value={c.startTime || ''}
                onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, startTime: e.target.value } })}
                className="flex-1 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
              <input type="time" value={c.endTime || ''}
                onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, endTime: e.target.value } })}
                className="flex-1 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
            </div>
            <div className="flex gap-2">
              <input type="number" placeholder="Nilai" value={c.value ?? ''}
                onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, value: Number(e.target.value) } })}
                className="w-20 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
              <select value={c.unit || 'percentage'}
                onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, unit: e.target.value } })}
                className="w-16 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md">
                {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {type === 'customer_match' && (
          <div className="flex gap-2">
            <input placeholder="Field (contoh: city)" value={c.field || ''}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, field: e.target.value } })}
              className="flex-1 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
            <select value={c.operator || 'eq'}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, operator: e.target.value } })}
              className="w-20 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md">
              <option value="eq">=</option>
              <option value="neq">!=</option>
              <option value="gt">&gt;</option>
              <option value="gte">&gt;=</option>
              <option value="lt">&lt;</option>
              <option value="lte">&lt;=</option>
              <option value="in">in</option>
              <option value="regex">regex</option>
            </select>
            <input placeholder="Nilai" value={String(c.value ?? '')}
              onChange={(e) => updateRule(i, { ...rule, conditions: { ...c, value: Number(e.target.value) || undefined } })}
              className="flex-1 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[24px]">auto_awesome</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase font-bold tracking-tight">PROMOSI</h3>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
          <span className="material-symbols-outlined text-[18px]">add</span>Buat Promosi
        </button>
      </div>

      <div className="bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-highest/50 border-b border-outline-variant">
              <tr>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Kode</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Nama</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Rules</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Prioritas</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Periode</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Status</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {promos.map((p) => (
                <tr key={p._id} className="table-row-hover transition-colors">
                  <td className="p-table_cell_padding">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold bg-surface-container-high px-2 py-0.5 rounded">{p.code}</span>
                      {p.requiresCode && <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Kode</span>}
                    </div>
                  </td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface font-semibold">{p.name}</td>
                  <td className="p-table_cell_padding">
                    <div className="flex flex-wrap gap-1">
                      {p.rules.map((r, i) => (
                        <span key={i} className="text-xs bg-surface-container-high text-on-surface-variant px-1.5 py-0.5 rounded">
                          {r.type.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-table_cell_padding font-body-md text-body-md">{p.priority}</td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface-variant">
                    {p.startDate ? `${formatDate(p.startDate)} - ${formatDate(p.endDate)}` : '-'}
                  </td>
                  <td className="p-table_cell_padding">
                    <span className={`status-pill ${p.active ? 'status-active' : 'status-inactive'}`}>{p.active ? 'Aktif' : 'Nonaktif'}</span>
                  </td>
                  <td className="p-table_cell_padding">
                    <div className="flex items-center gap-2">
                      <button onClick={() => edit(p)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">edit</span>Edit
                      </button>
                      <button onClick={() => remove(p._id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-error bg-error/10 rounded-lg hover:bg-error/20 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">delete</span>Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {promos.length === 0 && (
                <tr><td colSpan={7} className="p-table_cell_padding text-center text-on-surface-variant">Belum ada promosi</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 p-6 border border-outline-variant max-h-[90vh] overflow-y-auto">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">{editingId ? 'Edit Promosi' : 'Buat Promosi Baru'}</h3>
            <div className="flex flex-col gap-4">
              {/* Name & Code */}
              <div className="flex gap-3">
                <input placeholder="Nama Promosi" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="flex-1 px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                <input placeholder="Kode (unique)" value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })}
                  className="w-40 px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <textarea placeholder="Deskripsi (opsional)" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />

              {/* Khusus Kode */}
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <input type="checkbox" checked={form.requiresCode}
                  onChange={(e) => setForm({ ...form, requiresCode: e.target.checked })}
                  className="rounded border-outline-variant" />
                Khusus Kode (hanya bisa dipakai dengan memasukkan kode)
              </label>

              {form.requiresCode && (
                <div className="border border-primary/20 bg-primary/5 rounded-lg p-4 space-y-3">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Kode Promo</h4>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] font-semibold text-on-surface-variant mb-0.5 block">Kode</label>
                      <input placeholder="Contoh: KAMPUSMERDE" value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })}
                        className="w-full px-3 py-2 font-mono border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                    <div className="w-32">
                      <label className="text-[10px] font-semibold text-on-surface-variant mb-0.5 block">Kuota (0 = tak terbatas)</label>
                      <input type="number" placeholder="0" min={0} value={form.usageLimitPerPromotion}
                        onChange={(e) => setForm({ ...form, usageLimitPerPromotion: e.target.value })}
                        className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                  </div>
                </div>
              )}

              {/* Priority & Conflict */}
              <div className="flex gap-3 items-start">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Prioritas (rendah = diutamakan)</label>
                  <input type="number" value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div className="flex gap-2 pt-5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                    <input type="checkbox" checked={form.exclusive}
                      onChange={(e) => setForm({ ...form, exclusive: e.target.checked, stackable: e.target.checked ? false : form.stackable })}
                      className="rounded border-outline-variant" />
                    Exclusive
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                    <input type="checkbox" checked={form.stackable}
                      onChange={(e) => setForm({ ...form, stackable: e.target.checked, exclusive: e.target.checked ? false : form.exclusive })}
                      className="rounded border-outline-variant" />
                    Stackable
                  </label>
                </div>
              </div>

              {/* Min Cart */}
              <div>
                <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Min. Belanja (Rp)</label>
                <input type="number" value={form.minCartValue}
                  onChange={(e) => setForm({ ...form, minCartValue: e.target.value })}
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>

              {/* Rules Builder */}
              <div className="border-t border-outline-variant pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-on-surface-variant">Rules</label>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-on-surface-variant">Logic:</label>
                    <select value={form.ruleLogic}
                      onChange={(e) => setForm({ ...form, ruleLogic: e.target.value as 'AND' | 'OR' })}
                      className="px-2 py-1 text-xs border border-outline-variant rounded font-body-md">
                      <option value="AND">AND (semua)</option>
                      <option value="OR">OR (salah satu)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-3">
                  {form.rules.map((rule, i) => (
                    <div key={i} className="bg-surface-container-low p-3 rounded-lg border border-outline-variant">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="flex-1 flex gap-2">
                          <span className="text-xs font-bold text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded self-center">#{i + 1}</span>
                          <select value={rule.type}
                            onChange={(e) => {
                              const newRule = emptyRule(e.target.value);
                              newRule.label = rule.label;
                              updateRule(i, newRule);
                            }}
                            className="flex-1 px-2 py-1.5 text-xs border border-outline-variant rounded font-body-md">
                            {RULE_TYPES.map((rt) => (
                              <option key={rt.value} value={rt.value}>{rt.label}</option>
                            ))}
                          </select>
                        </div>
                        {form.rules.length > 1 && (
                          <button onClick={() => removeRule(i)} className="text-error/70 hover:text-error p-1">
                            <span className="material-symbols-outlined text-[18px]">remove_circle</span>
                          </button>
                        )}
                      </div>
                      {renderConditionFields(rule, i)}
                    </div>
                  ))}
                  <button onClick={addRule}
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>Tambah Rule
                  </button>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="border-t border-outline-variant pt-3">
                <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">Metode Pembayaran</label>
                {paymentMethods.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Tidak ada metode.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {paymentMethods.map((pm) => (
                      <label key={pm._id}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs cursor-pointer transition-colors ${form.paymentMethodIds.includes(pm._id) ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}>
                        <input type="checkbox" checked={form.paymentMethodIds.includes(pm._id)}
                          onChange={() => setForm({ ...form, paymentMethodIds: toggleArray(form.paymentMethodIds, pm._id) })}
                          className="hidden" />
                        <span className="material-symbols-outlined text-[14px]">{form.paymentMethodIds.includes(pm._id) ? 'check_box' : 'check_box_outline_blank'}</span>
                        {pm.name} ({pm.code})
                      </label>
                    ))}
                  </div>
                )}
                {form.paymentMethodIds.length === 0 && (
                  <p className="text-[10px] text-gray-400 mt-0.5 italic">Kosong = berlaku semua metode</p>
                )}
              </div>

              {/* Schedule */}
              <div className="border-t border-outline-variant pt-3">
                <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">Jadwal Periode</label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-on-surface-variant mb-0.5 block">Mulai</label>
                    <input type="datetime-local" value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-on-surface-variant mb-0.5 block">Selesai</label>
                    <input type="datetime-local" value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                </div>
              </div>

              {/* Customer Tiers */}
              <div className="border-t border-outline-variant pt-3">
                <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">Member Tier</label>
                <div className="flex flex-wrap gap-1.5">
                  {TIERS.map((t) => (
                    <label key={t}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs cursor-pointer transition-colors ${form.customerTiers.includes(t) ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}>
                      <input type="checkbox" checked={form.customerTiers.includes(t)}
                        onChange={() => setForm({ ...form, customerTiers: toggleArray(form.customerTiers, t) })}
                        className="hidden" />
                      <span className="material-symbols-outlined text-[14px]">{form.customerTiers.includes(t) ? 'check_box' : 'check_box_outline_blank'}</span>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </label>
                  ))}
                </div>
                {form.customerTiers.length === 0 && (
                  <p className="text-[10px] text-gray-400 mt-0.5 italic">Kosong = berlaku semua tier</p>
                )}
              </div>

              {/* Outlets */}
              <div className="border-t border-outline-variant pt-3">
                <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">Outlet</label>
                {outlets.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Tidak ada outlet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {outlets.map((o) => (
                      <label key={o._id}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs cursor-pointer transition-colors ${form.outlets.includes(o._id) ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}>
                        <input type="checkbox" checked={form.outlets.includes(o._id)}
                          onChange={() => setForm({ ...form, outlets: toggleArray(form.outlets, o._id) })}
                          className="hidden" />
                        <span className="material-symbols-outlined text-[14px]">{form.outlets.includes(o._id) ? 'check_box' : 'check_box_outline_blank'}</span>
                        {o.name} ({o.code})
                      </label>
                    ))}
                  </div>
                )}
                {form.outlets.length === 0 && (
                  <p className="text-[10px] text-gray-400 mt-0.5 italic">Kosong = berlaku semua outlet</p>
                )}
              </div>

              {/* Active */}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="rounded border-outline-variant" />
                Promosi Aktif
              </label>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setError(''); }}
                className="px-4 py-2 text-sm font-semibold text-on-surface-variant bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors">Batal</button>
              <button onClick={save}
                className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
