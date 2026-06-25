import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface Outlet {
  _id: string;
  name: string;
  code: string;
}

interface Family {
  _id: string;
  name: string;
  slug: string;
}

interface Category {
  _id: string;
  name: string;
  family: { _id: string; name: string } | string;
}

interface Discount {
  _id: string;
  name: string;
  description?: string;
  outlets: Outlet[];
  type: 'percentage' | 'nominal' | 'buy_x_get_y' | 'min_purchase';
  value?: number;
  scope?: 'all' | 'category' | 'family';
  targetId?: { _id: string; name: string } | string;
  buyQty?: number;
  freeQty?: number;
  minAmount?: number;
  discountValue?: number;
  discountUnit?: 'percentage' | 'nominal';
  startDate?: string;
  endDate?: string;
  active: boolean;
}

const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Persentase (%)', icon: 'percent' },
  { value: 'nominal', label: 'Nominal (Rp)', icon: 'money' },
  { value: 'buy_x_get_y', label: 'Beli X Gratis Y', icon: 'redeem' },
  { value: 'min_purchase', label: 'Min. Pembelian', icon: 'shopping_cart' },
];

const SCOPE_OPTIONS = [
  { value: 'all', label: 'Semua Item' },
  { value: 'category', label: 'Per Kategori' },
  { value: 'family', label: 'Per Family' },
];

function formatDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleString('id', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function Discounts() {
  const { token } = useAuth();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    outlets: [] as string[],
    type: 'percentage' as Discount['type'],
    value: '',
    scope: 'all' as Discount['scope'],
    targetId: '',
    buyQty: '',
    freeQty: '',
    minAmount: '',
    discountValue: '',
    discountUnit: 'percentage' as 'percentage' | 'nominal',
    startDate: '',
    endDate: '',
    active: true,
  });

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/discounts', { headers }).then((r) => r.json()).then(setDiscounts);
    fetch('/api/outlets', { headers }).then((r) => r.json()).then(setOutlets);
    fetch('/api/families').then((r) => r.json()).then(setFamilies);
    fetch('/api/categories').then((r) => r.json()).then(setCategories);
  }, []);

  function resetForm() {
    setForm({
      name: '', description: '', outlets: [], type: 'percentage',
      value: '', scope: 'all', targetId: '',
      buyQty: '', freeQty: '', minAmount: '', discountValue: '', discountUnit: 'percentage',
      startDate: '', endDate: '', active: true,
    });
  }

  function toggleOutlet(outletId: string) {
    setForm((prev) => ({
      ...prev,
      outlets: prev.outlets.includes(outletId)
        ? prev.outlets.filter((id) => id !== outletId)
        : [...prev.outlets, outletId],
    }));
  }

  async function save() {
    setError('');
    if (!form.name) { setError('Nama diskon harus diisi'); return; }

    const body: Record<string, any> = {
      name: form.name,
      description: form.description || undefined,
      outlets: form.outlets,
      type: form.type,
      active: form.active,
    };

    if (form.startDate) body.startDate = new Date(form.startDate).toISOString();
    if (form.endDate) body.endDate = new Date(form.endDate).toISOString();

    if (form.type === 'percentage' || form.type === 'nominal') {
      body.value = Number(form.value);
      body.scope = form.scope;
      if (form.scope !== 'all') body.targetId = form.targetId || undefined;
    }

    if (form.type === 'buy_x_get_y') {
      body.buyQty = Number(form.buyQty);
      body.freeQty = Number(form.freeQty);
      body.scope = form.scope;
      if (form.scope !== 'all') body.targetId = form.targetId || undefined;
    }

    if (form.type === 'min_purchase') {
      body.minAmount = Number(form.minAmount);
      body.discountValue = Number(form.discountValue);
      body.discountUnit = form.discountUnit;
    }

    const url = editingId ? `/api/discounts/${editingId}` : '/api/discounts';
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
    fetch('/api/discounts', { headers }).then((r) => r.json()).then(setDiscounts);
  }

  async function remove(id: string) {
    if (!confirm('Hapus diskon?')) return;
    await fetch(`/api/discounts/${id}`, { method: 'DELETE', headers });
    fetch('/api/discounts', { headers }).then((r) => r.json()).then(setDiscounts);
  }

  function edit(d: Discount) {
    setForm({
      name: d.name,
      description: d.description || '',
      outlets: d.outlets?.map((o) => o._id) || [],
      type: d.type,
      value: d.value !== undefined ? String(d.value) : '',
      scope: d.scope || 'all',
      targetId: typeof d.targetId === 'object' ? d.targetId._id : d.targetId || '',
      buyQty: d.buyQty !== undefined ? String(d.buyQty) : '',
      freeQty: d.freeQty !== undefined ? String(d.freeQty) : '',
      minAmount: d.minAmount !== undefined ? String(d.minAmount) : '',
      discountValue: d.discountValue !== undefined ? String(d.discountValue) : '',
      discountUnit: d.discountUnit || 'percentage',
      startDate: d.startDate ? d.startDate.slice(0, 16) : '',
      endDate: d.endDate ? d.endDate.slice(0, 16) : '',
      active: d.active,
    });
    setEditingId(d._id);
    setShowForm(true);
  }

  function typeLabel(t: string) {
    const found = DISCOUNT_TYPES.find((dt) => dt.value === t);
    return found ? found.label : t;
  }

  const filteredCategories = form.scope === 'category'
    ? categories
    : [];
  const filteredFamilies = form.scope === 'family'
    ? families
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[24px]">percent</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase font-bold tracking-tight">DISKON & PROMO</h3>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tambah Diskon
        </button>
      </div>

      <div className="bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-highest/50 border-b border-outline-variant">
              <tr>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Nama</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Tipe</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Ketentuan</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Outlet</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Periode</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Status</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {discounts.map((d) => (
                <tr key={d._id} className="table-row-hover transition-colors">
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface font-semibold">{d.name}</td>
                  <td className="p-table_cell_padding">
                    <span className="text-xs font-semibold bg-surface-container-high px-2 py-0.5 rounded">{typeLabel(d.type)}</span>
                  </td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface-variant">
                    {d.type === 'percentage' && `${d.value}% ${d.scope !== 'all' ? `(${d.scope})` : '(semua item)'}`}
                    {d.type === 'nominal' && `Rp ${d.value?.toLocaleString()} ${d.scope !== 'all' ? `(${d.scope})` : '(semua item)'}`}
                    {d.type === 'buy_x_get_y' && `Beli ${d.buyQty} Gratis ${d.freeQty}`}
                    {d.type === 'min_purchase' && `Min. Rp ${d.minAmount?.toLocaleString()} → ${d.discountUnit === 'percentage' ? `${d.discountValue}%` : `Rp ${d.discountValue?.toLocaleString()}`}`}
                  </td>
                  <td className="p-table_cell_padding">
                    <div className="flex flex-wrap gap-1">
                      {d.outlets?.length > 0
                        ? d.outlets.map((o) => (
                            <span key={o._id} className="text-xs bg-surface-container-high text-on-surface-variant px-1.5 py-0.5 rounded">{o.code}</span>
                          ))
                        : <span className="text-xs text-gray-400 italic">Semua</span>
                      }
                    </div>
                  </td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface-variant">
                    {d.startDate ? `${formatDate(d.startDate)} - ${formatDate(d.endDate)}` : '-'}
                  </td>
                  <td className="p-table_cell_padding">
                    <span className={`status-pill ${d.active ? 'status-active' : 'status-inactive'}`}>{d.active ? 'Aktif' : 'Nonaktif'}</span>
                  </td>
                  <td className="p-table_cell_padding">
                    <div className="flex items-center gap-2">
                      <button onClick={() => edit(d)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">edit</span>Edit
                      </button>
                      <button onClick={() => remove(d._id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-error bg-error/10 rounded-lg hover:bg-error/20 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">delete</span>Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {discounts.length === 0 && (
                <tr><td colSpan={7} className="p-table_cell_padding text-center text-on-surface-variant">Belum ada diskon</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 border border-outline-variant max-h-[90vh] overflow-y-auto">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">{editingId ? 'Edit Diskon' : 'Tambah Diskon'}</h3>
            <div className="flex flex-col gap-4">
              {/* Name */}
              <input
                placeholder="Nama Diskon (contoh: Diskon Alacarte)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <textarea
                placeholder="Deskripsi (opsional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />

              {/* Type selector */}
              <div>
                <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">Tipe Diskon</label>
                <div className="grid grid-cols-2 gap-2">
                  {DISCOUNT_TYPES.map((dt) => (
                    <button
                      key={dt.value}
                      type="button"
                      onClick={() => setForm({ ...form, type: dt.value as Discount['type'] })}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                        form.type === dt.value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-on-surface-variant border-outline-variant hover:bg-surface-container-low'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{dt.icon}</span>
                      {dt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic fields based on type */}
              {(form.type === 'percentage' || form.type === 'nominal') && (
                <>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-on-surface-variant font-semibold mb-1 block">
                        {form.type === 'percentage' ? 'Persentase (%)' : 'Nominal (Rp)'}
                      </label>
                      <input
                        type="number" placeholder="0"
                        value={form.value}
                        onChange={(e) => setForm({ ...form, value: e.target.value })}
                        className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-on-surface-variant font-semibold mb-1 block">Berlaku untuk</label>
                      <select
                        value={form.scope}
                        onChange={(e) => setForm({ ...form, scope: e.target.value as Discount['scope'], targetId: '' })}
                        className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        {SCOPE_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {form.scope === 'family' && (
                    <select
                      value={form.targetId}
                      onChange={(e) => setForm({ ...form, targetId: e.target.value })}
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">Pilih Family</option>
                      {filteredFamilies.map((f) => (
                        <option key={f._id} value={f._id}>{f.name}</option>
                      ))}
                    </select>
                  )}
                  {form.scope === 'category' && (
                    <select
                      value={form.targetId}
                      onChange={(e) => setForm({ ...form, targetId: e.target.value })}
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">Pilih Kategori</option>
                      {filteredCategories.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </>
              )}

              {form.type === 'buy_x_get_y' && (
                <>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-on-surface-variant font-semibold mb-1 block">Beli (qty)</label>
                      <input type="number" placeholder="1" value={form.buyQty} onChange={(e) => setForm({ ...form, buyQty: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-on-surface-variant font-semibold mb-1 block">Gratis (qty)</label>
                      <input type="number" placeholder="1" value={form.freeQty} onChange={(e) => setForm({ ...form, freeQty: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-on-surface-variant font-semibold mb-1 block">Berlaku untuk</label>
                    <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as Discount['scope'], targetId: '' })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                      {SCOPE_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  {form.scope === 'family' && (
                    <select value={form.targetId} onChange={(e) => setForm({ ...form, targetId: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                      <option value="">Pilih Family</option>
                      {filteredFamilies.map((f) => (
                        <option key={f._id} value={f._id}>{f.name}</option>
                      ))}
                    </select>
                  )}
                  {form.scope === 'category' && (
                    <select value={form.targetId} onChange={(e) => setForm({ ...form, targetId: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                      <option value="">Pilih Kategori</option>
                      {filteredCategories.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </>
              )}

              {form.type === 'min_purchase' && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-on-surface-variant font-semibold mb-1 block">Min. Belanja (Rp)</label>
                    <input type="number" placeholder="50000" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-on-surface-variant font-semibold mb-1 block">Diskon</label>
                    <div className="flex gap-2">
                      <input type="number" placeholder="0" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} className="flex-1 px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                      <select value={form.discountUnit} onChange={(e) => setForm({ ...form, discountUnit: e.target.value as 'percentage' | 'nominal' })} className="w-24 px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                        <option value="percentage">%</option>
                        <option value="nominal">Rp</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule */}
              <div className="border-t border-outline-variant pt-3">
                <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">Jadwal Periode</label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-on-surface-variant mb-0.5 block">Mulai</label>
                    <input
                      type="datetime-local"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-on-surface-variant mb-0.5 block">Selesai</label>
                    <input
                      type="datetime-local"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Outlets */}
              <div className="border-t border-outline-variant pt-3">
                <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">Outlet</label>
                {outlets.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Tidak ada outlet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {outlets.map((o) => (
                      <label key={o._id} className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs cursor-pointer transition-colors ${form.outlets.includes(o._id) ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}>
                        <input type="checkbox" checked={form.outlets.includes(o._id)} onChange={() => toggleOutlet(o._id)} className="hidden" />
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
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="rounded border-outline-variant" />
                Diskon Aktif
              </label>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setError(''); }} className="px-4 py-2 text-sm font-semibold text-on-surface-variant bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors">Batal</button>
              <button onClick={save} className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
