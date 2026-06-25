import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';

interface Modifier {
  _id: string;
  name: string;
  options: { name: string; price: number }[];
  productId?: { _id: string; name: string } | string;
  family?: { _id: string; name: string } | string;
  required: boolean;
}

interface Family { _id: string; name: string }

export default function Modifiers() {
  const { token } = useAuth();
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', options: [{ name: '', price: '' }], productId: '', family: '', required: false });

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/modifiers', { headers }).then((r) => r.json()).then(setModifiers);
    fetch('/api/families').then((r) => r.json()).then(setFamilies);
  }, []);

  async function save() {
    if (!form.name) { Swal.fire({ icon: 'warning', title: 'Nama modifier harus diisi' }); return; }
    const validOptions = form.options.filter((o) => o.name.trim());
    if (validOptions.length === 0) { Swal.fire({ icon: 'warning', title: 'Minimal 1 opsi dengan nama harus diisi' }); return; }
    const body: Record<string, any> = { name: form.name, options: validOptions.map((o) => ({ name: o.name, price: Number(o.price) || 0 })), required: form.required };
    if (form.family) body.family = form.family;
    const url = editingId ? `/api/modifiers/${editingId}` : '/api/modifiers';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const data = await res.json();
      Swal.fire({ icon: 'error', title: 'Gagal', text: data.message || 'Gagal menyimpan modifier' });
      return;
    }
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', options: [{ name: '', price: '' }], productId: '', family: '', required: false });
    fetch('/api/modifiers', { headers }).then((r) => r.json()).then(setModifiers);
  }

  async function remove(id: string) {
    const result = await Swal.fire({ icon: 'question', title: 'Hapus modifier?', showCancelButton: true, confirmButtonText: 'Hapus', cancelButtonText: 'Batal' });
    if (!result.isConfirmed) return;
    const res = await fetch(`/api/modifiers/${id}`, { method: 'DELETE', headers });
    if (!res.ok) return Swal.fire({ icon: 'error', title: 'Gagal menghapus' });
    fetch('/api/modifiers', { headers }).then((r) => r.json()).then(setModifiers);
  }

  function edit(m: Modifier) {
    setForm({
      name: m.name,
      options: m.options.map((o) => ({ name: o.name, price: String(o.price) })),
      productId: typeof m.productId === 'object' ? m.productId?._id || '' : m.productId || '',
      family: typeof m.family === 'object' ? m.family?._id || '' : m.family || '',
      required: m.required,
    });
    setEditingId(m._id);
    setShowForm(true);
  }

  function addOption() {
    setForm({ ...form, options: [...form.options, { name: '', price: '' }] });
  }

  function removeOption(idx: number) {
    setForm({ ...form, options: form.options.filter((_, i) => i !== idx) });
  }

  function updateOption(idx: number, field: 'name' | 'price', value: string) {
    const opts = [...form.options];
    opts[idx] = { ...opts[idx], [field]: value };
    setForm({ ...form, options: opts });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[24px]">tune</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase font-bold tracking-tight">MODIFIER & OPSI</h3>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', options: [{ name: '', price: '' }], productId: '', family: '', required: false }); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tambah Modifier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modifiers.map((m) => (
          <div key={m._id} className="bg-white border border-outline-variant rounded-lg shadow-sm p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-on-surface">{m.name}</h4>
                <p className="text-xs text-on-surface-variant">
                  {m.required ? 'Wajib' : 'Opsional'}
                  {m.family && typeof m.family === 'object' ? ` • ${m.family.name}` : ''}
                  {m.productId && typeof m.productId === 'object' ? ` • ${m.productId.name}` : ''}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => edit(m)} className="p-1 text-primary hover:bg-primary/10 rounded"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                <button onClick={() => remove(m._id)} className="p-1 text-error hover:bg-error/10 rounded"><span className="material-symbols-outlined text-[18px]">delete</span></button>
              </div>
            </div>
            <div className="space-y-1">
              {m.options.map((o, i) => (
                <div key={i} className="flex justify-between text-sm text-on-surface-variant">
                  <span>{o.name}</span>
                  {o.price > 0 && <span>+Rp {o.price.toLocaleString()}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
        {modifiers.length === 0 && (
          <div className="col-span-full text-center text-on-surface-variant py-12">Belum ada modifier</div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 border border-outline-variant max-h-[90vh] overflow-y-auto">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">{editingId ? 'Edit Modifier' : 'Tambah Modifier'}</h3>
            <div className="flex flex-col gap-3">
              <input placeholder="Nama Modifier (contoh: Level Gula)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              <select value={form.family} onChange={(e) => setForm({ ...form, family: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <option value="">Semua Family (global)</option>
                {families.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} className="rounded border-outline-variant" />
                Wajib dipilih
              </label>
              <div className="border-t border-outline-variant pt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-on-surface-variant">Opsi</span>
                  <button onClick={addOption} className="text-xs text-primary font-semibold">+ Tambah Opsi</button>
                </div>
                {form.options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input placeholder="Nama opsi" value={opt.name} onChange={(e) => updateOption(idx, 'name', e.target.value)} className="flex-1 px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    <input type="number" placeholder="Harga" value={opt.price} onChange={(e) => updateOption(idx, 'price', e.target.value)} className="w-24 px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    {form.options.length > 1 && (
                      <button onClick={() => removeOption(idx)} className="text-error"><span className="material-symbols-outlined text-[20px]">remove_circle</span></button>
                    )}
                  </div>
                ))}
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
