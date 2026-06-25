import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface Family {
  _id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function Families() {
  const { token } = useAuth();
  const [families, setFamilies] = useState<Family[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '' });

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/families', { headers }).then((r) => r.json()).then(setFamilies);
  }, []);

  async function save() {
    const url = editingId ? `/api/families/${editingId}` : '/api/families';
    const method = editingId ? 'PUT' : 'POST';
    await fetch(url, { method, headers, body: JSON.stringify(form) });
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', slug: '', description: '' });
    fetch('/api/families', { headers }).then((r) => r.json()).then(setFamilies);
  }

  async function remove(id: string) {
    if (!confirm('Hapus family? Kategori yang menggunakan family ini akan terpengaruh.')) return;
    await fetch(`/api/families/${id}`, { method: 'DELETE', headers });
    fetch('/api/families', { headers }).then((r) => r.json()).then(setFamilies);
  }

  function edit(f: Family) {
    setForm({ name: f.name, slug: f.slug, description: f.description || '' });
    setEditingId(f._id);
    setShowForm(true);
  }

  function generateSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[24px]">category</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase font-bold tracking-tight">KELOLA FAMILY</h3>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', slug: '', description: '' }); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tambah Family
        </button>
      </div>

      <div className="bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-highest/50 border-b border-outline-variant">
              <tr>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Nama</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Slug</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Deskripsi</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {families.map((f) => (
                <tr key={f._id} className="table-row-hover transition-colors">
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface font-semibold">{f.name}</td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface-variant"><code className="text-xs bg-surface-container-high px-1.5 py-0.5 rounded">{f.slug}</code></td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface-variant">{f.description || '-'}</td>
                  <td className="p-table_cell_padding">
                    <div className="flex items-center gap-2">
                      <button onClick={() => edit(f)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">edit</span>Edit
                      </button>
                      <button onClick={() => remove(f._id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-error bg-error/10 rounded-lg hover:bg-error/20 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">delete</span>Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {families.length === 0 && (
                <tr><td colSpan={4} className="p-table_cell_padding text-center text-on-surface-variant">Belum ada family</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">{editingId ? 'Edit Family' : 'Tambah Family'}</h3>
            <div className="flex flex-col gap-3">
              <input
                placeholder="Nama Family (contoh: Merchandise)"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm(editingId ? { ...form, name } : { ...form, name, slug: generateSlug(name) });
                }}
                className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <input
                placeholder="Slug (contoh: merchandise)"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <input placeholder="Deskripsi" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
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
