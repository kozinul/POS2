import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface Family {
  _id: string;
  name: string;
  slug: string;
}

interface Category {
  _id: string;
  name: string;
  description?: string;
  family: Family;
  active: boolean;
}

export default function Categories() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', family: '', active: true });
  const [editingId, setEditingId] = useState<string | null>(null);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/families', { headers }).then((r) => r.json()).then(setFamilies);
    fetch('/api/categories').then((r) => r.json()).then(setCategories);
  }, []);

  async function saveCategory() {
    const url = editingId ? `/api/categories/${editingId}` : '/api/categories';
    const method = editingId ? 'PUT' : 'POST';
    await fetch(url, { method, headers, body: JSON.stringify(form) });
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', description: '', family: '', active: true });
    const res = await fetch('/api/categories');
    setCategories(await res.json());
  }

  async function deleteCategory(id: string) {
    if (!confirm('Hapus kategori?')) return;
    await fetch(`/api/categories/${id}`, { method: 'DELETE', headers });
    fetch('/api/categories').then((r) => r.json()).then(setCategories);
  }

  function editCategory(cat: Category) {
    setForm({ name: cat.name, description: cat.description || '', family: cat.family._id, active: cat.active });
    setEditingId(cat._id);
    setShowForm(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[24px]">category</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase font-bold tracking-tight">KELOLA KATEGORI</h3>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', description: '', family: families[0]?._id || '', active: true }); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tambah Kategori
        </button>
      </div>

      <div className="bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-highest/50 border-b border-outline-variant">
              <tr>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Nama</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Status</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Family</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Deskripsi</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {categories.map((cat) => (
                <tr key={cat._id} className={`table-row-hover transition-colors ${!cat.active ? 'opacity-50' : ''}`}>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface font-semibold">{cat.name}</td>
                  <td className="p-table_cell_padding">
                    <span className={`status-pill ${cat.active ? 'status-active' : 'status-inactive'}`}>{cat.active ? 'Aktif' : 'Nonaktif'}</span>
                  </td>
                  <td className="p-table_cell_padding">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-container-high text-on-surface-variant">
                      {cat.family?.name || '-'}
                    </span>
                  </td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface-variant">{cat.description || '-'}</td>
                  <td className="p-table_cell_padding">
                    <div className="flex items-center gap-2">
                      <button onClick={() => editCategory(cat)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">edit</span>Edit
                      </button>
                      <button onClick={() => deleteCategory(cat._id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-error bg-error/10 rounded-lg hover:bg-error/20 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">delete</span>Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4 flex items-center gap-3">
              {editingId ? 'Edit Kategori' : 'Tambah Kategori'}
              {editingId && <span className={`status-pill ${form.active ? 'status-active' : 'status-inactive'}`}>{form.active ? 'Aktif' : 'Nonaktif'}</span>}
            </h3>
            <div className="flex flex-col gap-3">
              <input placeholder="Nama Kategori" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              <select value={form.family} onChange={(e) => setForm({ ...form, family: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <option value="">Pilih Family</option>
                {families.map((f) => (
                  <option key={f._id} value={f._id}>{f.name}</option>
                ))}
              </select>
              <input placeholder="Deskripsi" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="rounded border-outline-variant" />
                Kategori Aktif
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-on-surface-variant bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors">Batal</button>
              <button onClick={saveCategory} className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
