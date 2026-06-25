import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface Outlet {
  _id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
}

export default function Outlets() {
  const { token } = useAuth();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', code: '', status: 'active' });

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/outlets', { headers }).then((r) => r.json()).then(setOutlets);
  }, []);

  async function save() {
    const url = editingId ? `/api/outlets/${editingId}` : '/api/outlets';
    const method = editingId ? 'PUT' : 'POST';
    await fetch(url, { method, headers, body: JSON.stringify(form) });
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', code: '', status: 'active' });
    fetch('/api/outlets', { headers }).then((r) => r.json()).then(setOutlets);
  }

  async function remove(id: string) {
    if (!confirm('Hapus outlet?')) return;
    await fetch(`/api/outlets/${id}`, { method: 'DELETE', headers });
    fetch('/api/outlets', { headers }).then((r) => r.json()).then(setOutlets);
  }

  function edit(o: Outlet) {
    setForm({ name: o.name, code: o.code, status: o.status });
    setEditingId(o._id);
    setShowForm(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[24px]">storefront</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase font-bold tracking-tight">DAFTAR OUTLET</h3>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', code: '', status: 'active' }); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tambah Outlet
        </button>
      </div>

      <div className="bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-highest/50 border-b border-outline-variant">
              <tr>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Kode</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Nama Outlet</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Status</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {outlets.map((o) => (
                <tr key={o._id} className="table-row-hover transition-colors">
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface font-semibold">{o.code}</td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface">{o.name}</td>
                  <td className="p-table_cell_padding">
                    <span className={`status-pill ${o.status === 'active' ? 'status-active' : 'status-inactive'}`}>{o.status === 'active' ? 'Aktif' : 'Nonaktif'}</span>
                  </td>
                  <td className="p-table_cell_padding">
                    <div className="flex items-center gap-2">
                      <button onClick={() => edit(o)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">edit</span>Edit
                      </button>
                      <button onClick={() => remove(o._id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-error bg-error/10 rounded-lg hover:bg-error/20 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">delete</span>Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {outlets.length === 0 && (
                <tr><td colSpan={4} className="p-table_cell_padding text-center text-on-surface-variant">Belum ada outlet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">{editingId ? 'Edit Outlet' : 'Tambah Outlet'}</h3>
            <div className="flex flex-col gap-3">
              <input placeholder="Kode (contoh: KUTA)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              <input placeholder="Nama Outlet" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
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
