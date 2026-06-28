import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface Outlet {
  _id: string;
  name: string;
  code: string;
}

interface Category {
  _id: string;
  name: string;
}

interface Product {
  _id: string;
  name: string;
}

interface DppFraction {
  numerator: number;
  denominator: number;
}

interface Tax {
  _id: string;
  name: string;
  code: string;
  rate: number;
  rateType: string;
  taxType: string;
  description?: string;
  dppFormula: { type: string; fraction?: DppFraction };
  rounding: string;
  roundingPrecision: number;
  scope: string;
  categoryIds?: Category[];
  productIds?: Product[];
  transactionTypes?: string[];
  includedByDefault: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  priority: number;
  exemptUpTo: number;
  outlets: Outlet[];
  active: boolean;
}

export default function Taxes() {
  const { token } = useAuth();
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    rate: '',
    rateType: 'percentage',
    taxType: 'vat',
    description: '',
    dppFormulaType: 'full',
    dppNumerator: 11,
    dppDenominator: 12,
    rounding: 'math',
    roundingPrecision: 0,
    scope: 'all',
    categoryIds: [] as string[],
    productIds: [] as string[],
    transactionTypes: [] as string[],
    includedByDefault: true,
    effectiveFrom: '',
    effectiveTo: '',
    priority: 0,
    exemptUpTo: 0,
    outletIds: [] as string[],
    active: true,
  });
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/taxes', { headers }).then((r) => r.json()).then(setTaxes);
    fetch('/api/outlets', { headers }).then((r) => r.json()).then(setOutlets);
    fetch('/api/categories', { headers }).then((r) => r.json()).then(setCategories);
    fetch('/api/products', { headers }).then((r) => r.json()).then((data) => setProducts(data.products || data));
  }, []);

  function toggleOutlet(outletId: string) {
    setForm((prev) => ({
      ...prev,
      outletIds: prev.outletIds.includes(outletId)
        ? prev.outletIds.filter((id) => id !== outletId)
        : [...prev.outletIds, outletId],
    }));
  }

  function toggleCategory(catId: string) {
    setForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(catId)
        ? prev.categoryIds.filter((id) => id !== catId)
        : [...prev.categoryIds, catId],
    }));
  }

  function toggleProduct(prodId: string) {
    setForm((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(prodId)
        ? prev.productIds.filter((id) => id !== prodId)
        : [...prev.productIds, prodId],
    }));
  }

  function toggleTxType(t: string) {
    setForm((prev) => ({
      ...prev,
      transactionTypes: prev.transactionTypes.includes(t)
        ? prev.transactionTypes.filter((x) => x !== t)
        : [...prev.transactionTypes, t],
    }));
  }

  async function save() {
    const body = {
      name: form.name,
      code: form.code,
      rate: Number(form.rate),
      rateType: form.rateType,
      taxType: form.taxType,
      description: form.description || undefined,
      dppFormula: {
        type: form.dppFormulaType,
        fraction: form.dppFormulaType === 'fraction'
          ? { numerator: Number(form.dppNumerator), denominator: Number(form.dppDenominator) }
          : undefined,
      },
      rounding: form.rounding,
      roundingPrecision: Number(form.roundingPrecision),
      scope: form.scope,
      categoryIds: form.scope === 'category' ? form.categoryIds : [],
      productIds: form.scope === 'product' ? form.productIds : [],
      transactionTypes: form.scope === 'transaction_type' ? form.transactionTypes : [],
      includedByDefault: form.includedByDefault,
      effectiveFrom: form.effectiveFrom || undefined,
      effectiveTo: form.effectiveTo || undefined,
      priority: Number(form.priority),
      exemptUpTo: Number(form.exemptUpTo),
      outlets: form.outletIds,
      active: form.active,
    };
    const url = editingId ? `/api/taxes/${editingId}` : '/api/taxes';
    const method = editingId ? 'PUT' : 'POST';
    await fetch(url, { method, headers, body: JSON.stringify(body) });
    resetForm();
    fetch('/api/taxes', { headers }).then((r) => r.json()).then(setTaxes);
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({
      name: '', code: '', rate: '', rateType: 'percentage', taxType: 'vat',
      description: '', dppFormulaType: 'full', dppNumerator: 11, dppDenominator: 12,
      rounding: 'math', roundingPrecision: 0, scope: 'all',
      categoryIds: [], productIds: [], transactionTypes: [],
      includedByDefault: true, effectiveFrom: '', effectiveTo: '',
      priority: 0, exemptUpTo: 0, outletIds: [], active: true,
    });
  }

  async function remove(id: string) {
    if (!confirm('Hapus pajak?')) return;
    await fetch(`/api/taxes/${id}`, { method: 'DELETE', headers });
    fetch('/api/taxes', { headers }).then((r) => r.json()).then(setTaxes);
  }

  function edit(t: Tax) {
    setForm({
      name: t.name,
      code: t.code,
      rate: String(t.rate),
      rateType: t.rateType,
      taxType: t.taxType,
      description: t.description || '',
      dppFormulaType: t.dppFormula?.type || 'full',
      dppNumerator: t.dppFormula?.fraction?.numerator ?? 11,
      dppDenominator: t.dppFormula?.fraction?.denominator ?? 12,
      rounding: t.rounding,
      roundingPrecision: t.roundingPrecision,
      scope: t.scope,
      categoryIds: t.categoryIds?.map((c) => c._id) || [],
      productIds: t.productIds?.map((p) => p._id) || [],
      transactionTypes: t.transactionTypes || [],
      includedByDefault: t.includedByDefault,
      effectiveFrom: t.effectiveFrom ? t.effectiveFrom.slice(0, 10) : '',
      effectiveTo: t.effectiveTo ? t.effectiveTo.slice(0, 10) : '',
      priority: t.priority,
      exemptUpTo: t.exemptUpTo,
      outletIds: t.outlets?.map((o) => o._id) || [],
      active: t.active,
    });
    setEditingId(t._id);
    setShowForm(true);
  }

  function getScopeLabel(tax: Tax): string {
    if (tax.scope === 'all') return 'Semua';
    if (tax.scope === 'category') return `${tax.categoryIds?.length || 0} Kategori`;
    if (tax.scope === 'product') return `${tax.productIds?.length || 0} Produk`;
    if (tax.scope === 'transaction_type') return (tax.transactionTypes || []).join(', ');
    return tax.scope;
  }

  function getTaxTypeBadge(taxType: string): { label: string; color: string } {
    switch (taxType) {
      case 'vat': return { label: 'PPN', color: 'bg-blue-100 text-blue-700' };
      case 'withholding': return { label: 'PPh', color: 'bg-purple-100 text-purple-700' };
      case 'service_charge': return { label: 'SC', color: 'bg-amber-100 text-amber-700' };
      default: return { label: taxType, color: 'bg-gray-100 text-gray-700' };
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[24px]">receipt</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase font-bold tracking-tight">KELOLA PAJAK</h3>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tambah Pajak
        </button>
      </div>

      <div className="bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-highest/50 border-b border-outline-variant">
              <tr>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Nama</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Rate / Tipe</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">DPP</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Cakupan</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Status</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {taxes.map((t) => {
                const badge = getTaxTypeBadge(t.taxType);
                const dppLabel = t.dppFormula?.type === 'fraction'
                  ? `×${t.dppFormula.fraction?.numerator}/${t.dppFormula.fraction?.denominator}`
                  : '100%';
                return (
                  <tr key={t._id} className="table-row-hover transition-colors">
                    <td className="p-table_cell_padding">
                      <div className="flex items-center gap-2">
                        <span className="font-body-md text-body-md text-on-surface font-semibold">{t.name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.color}`}>{badge.label}</span>
                        {t.code && <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1 py-0.5 rounded">{t.code}</span>}
                      </div>
                      {t.description && <p className="text-xs text-on-surface-variant mt-0.5">{t.description}</p>}
                    </td>
                    <td className="p-table_cell_padding">
                      <span className="font-bold text-lg text-on-surface">{t.rate}%</span>
                      <span className="text-xs text-gray-400 ml-1">
                        {t.includedByDefault ? '(Inc)' : '(Exc)'}
                      </span>
                    </td>
                    <td className="p-table_cell_padding">
                      <span className="text-xs font-mono bg-surface-container-low px-1.5 py-0.5 rounded">
                        {dppLabel}
                      </span>
                      {t.rounding !== 'math' && (
                        <span className="text-xs text-gray-400 ml-1">{t.rounding}</span>
                      )}
                    </td>
                    <td className="p-table_cell_padding">
                      <span className="text-xs font-semibold text-on-surface-variant">{getScopeLabel(t)}</span>
                    </td>
                    <td className="p-table_cell_padding">
                      <span className={`status-pill ${t.active ? 'status-active' : 'status-inactive'}`}>{t.active ? 'Aktif' : 'Nonaktif'}</span>
                    </td>
                    <td className="p-table_cell_padding">
                      <div className="flex items-center gap-2">
                        <button onClick={() => edit(t)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                          <span className="material-symbols-outlined text-[16px]">edit</span>Edit
                        </button>
                        <button onClick={() => setShowDetails(showDetails === t._id ? null : t._id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-on-surface-variant bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors">
                          <span className="material-symbols-outlined text-[16px]">info</span>
                        </button>
                        <button onClick={() => remove(t._id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-error bg-error/10 rounded-lg hover:bg-error/20 transition-colors">
                          <span className="material-symbols-outlined text-[16px]">delete</span>Hapus
                        </button>
                      </div>
                      {showDetails === t._id && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 space-y-1">
                          <p>Prioritas: {t.priority} | Rounding: {t.rounding} (prec: {t.roundingPrecision})</p>
                          <p>Tax Inclusive: {t.includedByDefault ? 'Ya' : 'Tidak'}</p>
                          {t.effectiveFrom && <p>Berlaku dari: {new Date(t.effectiveFrom).toLocaleDateString('id-ID')}</p>}
                          {t.effectiveTo && <p>Berlaku sampai: {new Date(t.effectiveTo).toLocaleDateString('id-ID')}</p>}
                          {t.exemptUpTo > 0 && <p>Bebas pajak sampai: Rp {t.exemptUpTo.toLocaleString()}</p>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {taxes.length === 0 && (
                <tr><td colSpan={6} className="p-table_cell_padding text-center text-on-surface-variant">Belum ada pajak</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">{editingId ? 'Edit Pajak' : 'Tambah Pajak'}</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Basic Info */}
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1 block">Nama Pajak</label>
                <input placeholder="PPN 12%" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1 block">Kode</label>
                <input placeholder="PPN" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1 block">Rate (%)</label>
                <input type="number" step="0.01" placeholder="12" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1 block">Tipe Rate</label>
                <select value={form.rateType} onChange={(e) => setForm({ ...form, rateType: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm">
                  <option value="percentage">Percentage</option>
                  <option value="nominal">Nominal</option>
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1 block">Tipe Pajak</label>
                <select value={form.taxType} onChange={(e) => setForm({ ...form, taxType: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm">
                  <option value="vat">PPN (VAT)</option>
                  <option value="withholding">PPh (Withholding)</option>
                  <option value="service_charge">Service Charge</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1 block">Rounding</label>
                <select value={form.rounding} onChange={(e) => setForm({ ...form, rounding: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm">
                  <option value="math">Math (standar)</option>
                  <option value="floor">Floor</option>
                  <option value="ceil">Ceil</option>
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1 block">Prioritas</label>
                <input type="number" placeholder="0" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1 block">Bebas Pajak s/d (Rp)</label>
                <input type="number" placeholder="0" value={form.exemptUpTo} onChange={(e) => setForm({ ...form, exemptUpTo: Number(e.target.value) })} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1 block">DPP Formula</label>
                <div className="flex items-center gap-3">
                  <select value={form.dppFormulaType} onChange={(e) => setForm({ ...form, dppFormulaType: e.target.value })} className="px-3 py-2 border border-outline-variant rounded-lg text-sm">
                    <option value="full">Full DPP (100%)</option>
                    <option value="fraction">DPP Nilai Lain (Fraction)</option>
                  </select>
                  {form.dppFormulaType === 'fraction' && (
                    <div className="flex items-center gap-2">
                      <input type="number" className="w-16 px-2 py-2 border border-outline-variant rounded-lg text-sm text-center" value={form.dppNumerator} onChange={(e) => setForm({ ...form, dppNumerator: Number(e.target.value) })} />
                      <span className="text-lg font-bold text-on-surface-variant">/</span>
                      <input type="number" className="w-16 px-2 py-2 border border-outline-variant rounded-lg text-sm text-center" value={form.dppDenominator} onChange={(e) => setForm({ ...form, dppDenominator: Number(e.target.value) })} />
                    </div>
                  )}
                </div>
                {form.dppFormulaType === 'fraction' && form.rate && (
                  <p className="text-xs text-on-surface-variant mt-1">
                    PPN = {form.rate}% × ({form.dppNumerator}/{form.dppDenominator} × Harga) = {((Number(form.rate) * form.dppNumerator / form.dppDenominator)).toFixed(2)}% efektif
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1 block">Cakupan (Scope)</label>
                <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm">
                  <option value="all">Semua Produk</option>
                  <option value="category">Per Kategori</option>
                  <option value="product">Per Produk</option>
                  <option value="transaction_type">Per Tipe Transaksi</option>
                </select>
              </div>
              {form.scope === 'category' && categories.length > 0 && (
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2 block">Kategori</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <label key={c._id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${form.categoryIds.includes(c._id) ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant text-on-surface-variant'}`}>
                        <input type="checkbox" checked={form.categoryIds.includes(c._id)} onChange={() => toggleCategory(c._id)} className="hidden" />
                        <span className="material-symbols-outlined text-[16px]">{form.categoryIds.includes(c._id) ? 'check_box' : 'check_box_outline_blank'}</span>
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {form.scope === 'product' && products.length > 0 && (
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2 block">Produk</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {products.map((p) => (
                      <label key={p._id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${form.productIds.includes(p._id) ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant text-on-surface-variant'}`}>
                        <input type="checkbox" checked={form.productIds.includes(p._id)} onChange={() => toggleProduct(p._id)} className="hidden" />
                        <span className="material-symbols-outlined text-[16px]">{form.productIds.includes(p._id) ? 'check_box' : 'check_box_outline_blank'}</span>
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {form.scope === 'transaction_type' && (
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2 block">Tipe Transaksi</label>
                  <div className="flex flex-wrap gap-2">
                    {['dine_in', 'takeaway', 'delivery', 'online'].map((t) => (
                      <label key={t} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${form.transactionTypes.includes(t) ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant text-on-surface-variant'}`}>
                        <input type="checkbox" checked={form.transactionTypes.includes(t)} onChange={() => toggleTxType(t)} className="hidden" />
                        <span className="material-symbols-outlined text-[16px]">{form.transactionTypes.includes(t) ? 'check_box' : 'check_box_outline_blank'}</span>
                        {t.replace('_', ' ')}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="col-span-2">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1 block">Deskripsi</label>
                <input placeholder="Deskripsi (opsional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1 block">Berlaku Dari</label>
                <input type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1 block">Berlaku Sampai</label>
                <input type="date" value={form.effectiveTo} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm" />
              </div>
              <div className="col-span-2 flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.includedByDefault} onChange={(e) => setForm({ ...form, includedByDefault: e.target.checked })} className="rounded" />
                  Tax Inclusive (harga sudah termasuk pajak)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="rounded" />
                  Aktif
                </label>
              </div>
              <div className="col-span-2 border-t border-outline-variant pt-3">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2 block">Terapkan di Outlet</label>
                {outlets.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Tidak ada outlet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {outlets.map((o) => (
                      <label key={o._id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${form.outletIds.includes(o._id) ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}>
                        <input type="checkbox" checked={form.outletIds.includes(o._id)} onChange={() => toggleOutlet(o._id)} className="hidden" />
                        <span className="material-symbols-outlined text-[16px]">{form.outletIds.includes(o._id) ? 'check_box' : 'check_box_outline_blank'}</span>
                        {o.name} ({o.code})
                      </label>
                    ))}
                  </div>
                )}
                {form.outletIds.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1 italic">Kosong = berlaku untuk semua outlet</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={resetForm} className="px-4 py-2 text-sm font-semibold text-on-surface-variant bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors">Batal</button>
              <button onClick={save} className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
