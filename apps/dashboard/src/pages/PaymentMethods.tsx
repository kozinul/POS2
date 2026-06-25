import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface Outlet {
  _id: string;
  name: string;
  code: string;
}

interface PaymentMethod {
  _id: string;
  name: string;
  code: string;
  type: 'cash' | 'non-cash';
  requiresCardLastFour: boolean;
  description?: string;
  active: boolean;
  outlets: Outlet[];
}

const TYPE_OPTIONS = [
  { value: 'cash', label: 'Tunai' },
  { value: 'non-cash', label: 'Non Tunai' },
];

const PRESET_CODES = [
  'CASH', 'QRIS', 'DEBIT', 'CREDIT_CARD', 'TRANSFER', 'E_WALLET', 'EDC', 'GIRO', 'VOUCHER',
];

export default function PaymentMethods() {
  const { token } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    type: 'non-cash' as 'cash' | 'non-cash',
    requiresCardLastFour: false,
    description: '',
    active: true,
    outlets: [] as string[],
  });
  const [error, setError] = useState('');

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/payment-methods', { headers }).then((r) => r.json()).then(setMethods);
    fetch('/api/outlets', { headers }).then((r) => r.json()).then(setOutlets);
  }, []);

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
    const url = editingId ? `/api/payment-methods/${editingId}` : '/api/payment-methods';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
    if (!res.ok) {
      const data = await res.json();
      setError(data.message || 'Gagal menyimpan');
      return;
    }
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', code: '', type: 'non-cash', requiresCardLastFour: false, description: '', active: true, outlets: [] });
    fetch('/api/payment-methods', { headers }).then((r) => r.json()).then(setMethods);
  }

  async function remove(id: string) {
    if (!confirm('Hapus metode bayar?')) return;
    await fetch(`/api/payment-methods/${id}`, { method: 'DELETE', headers });
    fetch('/api/payment-methods', { headers }).then((r) => r.json()).then(setMethods);
  }

  function edit(m: PaymentMethod) {
    setForm({
      name: m.name,
      code: m.code,
      type: m.type,
      requiresCardLastFour: m.requiresCardLastFour,
      description: m.description || '',
      active: m.active,
      outlets: m.outlets?.map((o) => o._id) || [],
    });
    setEditingId(m._id);
    setShowForm(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[24px]">payments</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase font-bold tracking-tight">METODE BAYAR</h3>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', code: '', type: 'non-cash', requiresCardLastFour: false, description: '', active: true, outlets: [] }); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tambah Metode
        </button>
      </div>

      <div className="bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-highest/50 border-b border-outline-variant">
              <tr>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Kode</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Nama</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Tipe</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">4 Digit Kartu</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Deskripsi</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Outlet</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Status</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {methods.map((m) => (
                <tr key={m._id} className="table-row-hover transition-colors">
                  <td className="p-table_cell_padding">
                    <span className="font-mono font-bold text-sm bg-surface-container-high px-2 py-0.5 rounded">{m.code}</span>
                  </td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface font-semibold">{m.name}</td>
                  <td className="p-table_cell_padding">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      m.type === 'cash'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {m.type === 'cash' ? 'Tunai' : 'Non Tunai'}
                    </span>
                  </td>
                  <td className="p-table_cell_padding">
                    {m.requiresCardLastFour
                      ? <span className="material-symbols-outlined text-primary text-[18px]">check</span>
                      : <span className="text-outline">-</span>
                    }
                  </td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface-variant">{m.description || '-'}</td>
                  <td className="p-table_cell_padding">
                    <div className="flex flex-wrap gap-1">
                      {m.outlets?.length > 0
                        ? m.outlets.map((o) => (
                            <span key={o._id} className="text-xs bg-surface-container-high text-on-surface-variant px-1.5 py-0.5 rounded">{o.code}</span>
                          ))
                        : <span className="text-xs text-gray-400 italic">Semua</span>
                      }
                    </div>
                  </td>
                  <td className="p-table_cell_padding">
                    <span className={`status-pill ${m.active ? 'status-active' : 'status-inactive'}`}>{m.active ? 'Aktif' : 'Nonaktif'}</span>
                  </td>
                  <td className="p-table_cell_padding">
                    <div className="flex items-center gap-2">
                      <button onClick={() => edit(m)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">edit</span>Edit
                      </button>
                      <button onClick={() => remove(m._id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-error bg-error/10 rounded-lg hover:bg-error/20 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">delete</span>Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {methods.length === 0 && (
                <tr><td colSpan={8} className="p-table_cell_padding text-center text-on-surface-variant">Belum ada metode bayar</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">{editingId ? 'Edit Metode Bayar' : 'Tambah Metode Bayar'}</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-semibold text-on-surface-variant mb-1 block">Kode (ID Akuntansi)</label>
                <div className="flex gap-1 flex-wrap mb-2">
                  {PRESET_CODES.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setForm({ ...form, code })}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        form.code === code
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-on-surface-variant border-outline-variant hover:bg-surface-container-low'
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
                <input
                  placeholder="Atau ketik kode sendiri"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <input
                placeholder="Nama Metode (contoh: Kartu Debit)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <div>
                <label className="text-sm font-semibold text-on-surface-variant mb-1 block">Tipe</label>
                <div className="flex gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, type: opt.value as 'cash' | 'non-cash', requiresCardLastFour: opt.value === 'cash' ? false : form.requiresCardLastFour })}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        form.type === opt.value
                          ? 'bg-primary text-white'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {form.type === 'non-cash' && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.requiresCardLastFour}
                    onChange={(e) => setForm({ ...form, requiresCardLastFour: e.target.checked })}
                    className="rounded border-outline-variant"
                  />
                  Perlu input 4 digit terakhir kartu
                </label>
              )}
              <input
                placeholder="Deskripsi (opsional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="rounded border-outline-variant" />
                Aktif
              </label>
              <div className="border-t border-outline-variant pt-3">
                <label className="text-sm font-semibold text-on-surface-variant mb-2 block">Terapkan di Outlet</label>
                {outlets.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Tidak ada outlet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {outlets.map((o) => (
                      <label key={o._id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${form.outlets.includes(o._id) ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}>
                        <input type="checkbox" checked={form.outlets.includes(o._id)} onChange={() => toggleOutlet(o._id)} className="hidden" />
                        <span className="material-symbols-outlined text-[16px]">{form.outlets.includes(o._id) ? 'check_box' : 'check_box_outline_blank'}</span>
                        {o.name} ({o.code})
                      </label>
                    ))}
                  </div>
                )}
                {form.outlets.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1 italic">Kosong = berlaku untuk semua outlet</p>
                )}
              </div>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
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
