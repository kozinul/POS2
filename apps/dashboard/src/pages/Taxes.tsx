import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface Outlet {
  _id: string;
  name: string;
  code: string;
}

interface Tax {
  _id: string;
  name: string;
  rate: number;
  description?: string;
  active: boolean;
  outlets: Outlet[];
}

export default function Taxes() {
  const { token } = useAuth();
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', rate: '', description: '', active: true, outlets: [] as string[] });

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/taxes', { headers }).then((r) => r.json()).then(setTaxes);
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
    const body = { ...form, rate: Number(form.rate) };
    const url = editingId ? `/api/taxes/${editingId}` : '/api/taxes';
    const method = editingId ? 'PUT' : 'POST';
    await fetch(url, { method, headers, body: JSON.stringify(body) });
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', rate: '', description: '', active: true, outlets: [] });
    fetch('/api/taxes', { headers }).then((r) => r.json()).then(setTaxes);
  }

  async function remove(id: string) {
    if (!confirm('Hapus pajak?')) return;
    await fetch(`/api/taxes/${id}`, { method: 'DELETE', headers });
    fetch('/api/taxes', { headers }).then((r) => r.json()).then(setTaxes);
  }

  function edit(t: Tax) {
    setForm({ name: t.name, rate: String(t.rate), description: t.description || '', active: t.active, outlets: t.outlets?.map((o) => o._id) || [] });
    setEditingId(t._id);
    setShowForm(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[24px]">receipt</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase font-bold tracking-tight">KELOLA PAJAK</h3>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', rate: '', description: '', active: true, outlets: [] }); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
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
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Rate</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Deskripsi</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Outlet</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Status</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {taxes.map((t) => (
                <tr key={t._id} className="table-row-hover transition-colors">
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface font-semibold">{t.name}</td>
                  <td className="p-table_cell_padding">
                    <span className="font-bold text-lg text-on-surface">{t.rate}%</span>
                  </td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface-variant">{t.description || '-'}</td>
                  <td className="p-table_cell_padding">
                    <div className="flex flex-wrap gap-1">
                      {t.outlets?.length > 0
                        ? t.outlets.map((o) => (
                            <span key={o._id} className="text-xs bg-surface-container-high text-on-surface-variant px-1.5 py-0.5 rounded">{o.code}</span>
                          ))
                        : <span className="text-xs text-gray-400 italic">Semua</span>
                      }
                    </div>
                  </td>
                  <td className="p-table_cell_padding">
                    <span className={`status-pill ${t.active ? 'status-active' : 'status-inactive'}`}>{t.active ? 'Aktif' : 'Nonaktif'}</span>
                  </td>
                  <td className="p-table_cell_padding">
                    <div className="flex items-center gap-2">
                      <button onClick={() => edit(t)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">edit</span>Edit
                      </button>
                      <button onClick={() => remove(t._id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-error bg-error/10 rounded-lg hover:bg-error/20 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">delete</span>Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {taxes.length === 0 && (
                <tr><td colSpan={6} className="p-table_cell_padding text-center text-on-surface-variant">Belum ada pajak</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">{editingId ? 'Edit Pajak' : 'Tambah Pajak'}</h3>
            <div className="flex flex-col gap-3">
              <input placeholder="Nama Pajak (contoh: PPN 10%)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              <div className="flex items-center gap-3">
                <input type="number" placeholder="Rate" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} className="flex-1 px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                <span className="text-lg font-bold text-on-surface-variant">%</span>
              </div>
              <input placeholder="Deskripsi (opsional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
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
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-on-surface-variant bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors">Batal</button>
              <button onClick={save} className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
