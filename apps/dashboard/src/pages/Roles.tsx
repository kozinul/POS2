import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';

const PERMISSION_GROUPS: { label: string; icon: string; keys: string[] }[] = [
  { label: 'Penjualan', icon: 'point_of_sale', keys: ['sales.create', 'sales.void', 'sales.view', 'sales.discount'] },
  { label: 'Produk', icon: 'inventory_2', keys: ['products.view', 'products.create', 'products.edit', 'products.delete'] },
  { label: 'Kategori', icon: 'category', keys: ['categories.view', 'categories.edit'] },
  { label: 'Member', icon: 'diversity_3', keys: ['members.view', 'members.edit'] },
  { label: 'Promosi', icon: 'auto_awesome', keys: ['promotions.view', 'promotions.edit'] },
  { label: 'Laporan', icon: 'analytics', keys: ['reports.sales', 'reports.finance'] },
  { label: 'Pengaturan', icon: 'settings', keys: ['settings.edit'] },
  { label: 'Pengguna', icon: 'group', keys: ['users.view', 'users.edit'] },
  { label: 'Outlet', icon: 'storefront', keys: ['outlets.view', 'outlets.edit'] },
  { label: 'Modifier', icon: 'tune', keys: ['modifiers.view', 'modifiers.edit'] },
  { label: 'Pajak', icon: 'receipt', keys: ['taxes.view', 'taxes.edit'] },
  { label: 'Metode Bayar', icon: 'payments', keys: ['payment-methods.view', 'payment-methods.edit'] },
  { label: 'Family', icon: 'account_tree', keys: ['families.view', 'families.edit'] },
];

const PERMISSION_LABELS: Record<string, string> = {
  'sales.create': 'Buat Transaksi',
  'sales.void': 'Void Transaksi',
  'sales.view': 'Lihat Transaksi',
  'sales.discount': 'Beri Diskon',
  'products.view': 'Lihat Produk',
  'products.create': 'Tambah Produk',
  'products.edit': 'Edit Produk',
  'products.delete': 'Hapus Produk',
  'categories.view': 'Lihat Kategori',
  'categories.edit': 'Edit Kategori',
  'members.view': 'Lihat Member',
  'members.edit': 'Edit Member',
  'promotions.view': 'Lihat Promosi',
  'promotions.edit': 'Edit Promosi',
  'reports.sales': 'Laporan Penjualan',
  'reports.finance': 'Laporan Keuangan',
  'settings.edit': 'Edit Pengaturan',
  'users.view': 'Lihat Pengguna',
  'users.edit': 'Edit Pengguna',
  'outlets.view': 'Lihat Outlet',
  'outlets.edit': 'Edit Outlet',
  'modifiers.view': 'Lihat Modifier',
  'modifiers.edit': 'Edit Modifier',
  'taxes.view': 'Lihat Pajak',
  'taxes.edit': 'Edit Pajak',
  'payment-methods.view': 'Lihat Metode Bayar',
  'payment-methods.edit': 'Edit Metode Bayar',
  'families.view': 'Lihat Family',
  'families.edit': 'Edit Family',
};

interface Role {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
}

export default function Roles() {
  const { token } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', permissions: [] as string[] });

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/roles', { headers }).then((r) => r.json()).then(setRoles);
  }, []);

  function togglePermission(key: string) {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((p) => p !== key)
        : [...prev.permissions, key],
    }));
  }

  async function save() {
    if (!form.name) { Swal.fire({ icon: 'error', title: 'Nama role harus diisi' }); return; }
    const url = editingId ? `/api/roles/${editingId}` : '/api/roles';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
    if (!res.ok) { Swal.fire({ icon: 'error', title: 'Gagal', text: (await res.json()).message }); return; }
    Swal.fire({ icon: 'success', title: 'Berhasil', timer: 1500, showConfirmButton: false });
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', description: '', permissions: [] });
    fetch('/api/roles', { headers }).then((r) => r.json()).then(setRoles);
  }

  function editRole(r: Role) {
    setForm({ name: r.name, description: r.description, permissions: [...r.permissions] });
    setEditingId(r._id);
    setShowForm(true);
  }

  async function deleteRole(id: string) {
    const result = await Swal.fire({ icon: 'question', title: 'Hapus role?', showCancelButton: true, confirmButtonText: 'Hapus', cancelButtonText: 'Batal' });
    if (!result.isConfirmed) return;
    const res = await fetch(`/api/roles/${id}`, { method: 'DELETE', headers });
    if (!res.ok) { Swal.fire({ icon: 'error', title: 'Gagal', text: (await res.json()).message }); return; }
    fetch('/api/roles', { headers }).then((r) => r.json()).then(setRoles);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[24px]">manage_accounts</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase font-bold tracking-tight">KELOLA ROLE</h3>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', description: '', permissions: [] }); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tambah Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((r) => (
          <div key={r._id} className="bg-white border border-outline-variant rounded-xl shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
                <h4 className="font-label-md text-label-md text-on-surface font-bold">{r.name}</h4>
              </div>
              {r.isSystem && <span className="text-[10px] font-semibold text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full">SYSTEM</span>}
            </div>
            {r.description && <p className="text-sm text-on-surface-variant">{r.description}</p>}
            <div className="flex flex-wrap gap-1">
              {r.permissions.map((p) => (
                <span key={p} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{PERMISSION_LABELS[p] || p}</span>
              ))}
              {r.permissions.length === 0 && <span className="text-xs text-on-surface-variant italic">Tidak ada izin</span>}
            </div>
            {!r.isSystem && (
              <div className="flex items-center gap-2 mt-auto">
                <button onClick={() => editRole(r)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">edit</span> Edit
                </button>
                <button onClick={() => deleteRole(r._id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-error bg-error/10 rounded-lg hover:bg-error/20 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">delete</span> Hapus
                </button>
              </div>
            )}
          </div>
        ))}
        {roles.length === 0 && (
          <p className="text-on-surface-variant text-sm col-span-full">Belum ada role. Buat role terlebih dahulu.</p>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 border border-outline-variant max-h-[90vh] overflow-y-auto">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">{editingId ? 'Edit Role' : 'Tambah Role'}</h3>
            <div className="flex flex-col gap-3">
              <input placeholder="Nama Role (contoh: Supervisor)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              <input placeholder="Deskripsi (opsional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />

              <div className="border-t border-outline-variant pt-3">
                <p className="text-sm font-semibold text-on-surface-variant mb-3">Hak Akses</p>
                <div className="flex flex-col gap-4">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.label}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-[18px] text-primary">{group.icon}</span>
                        <span className="text-sm font-semibold text-on-surface">{group.label}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 ml-7">
                        {group.keys.map((key) => (
                          <label key={key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${form.permissions.includes(key) ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}>
                            <input type="checkbox" checked={form.permissions.includes(key)} onChange={() => togglePermission(key)} className="hidden" />
                            <span className="material-symbols-outlined text-[14px]">{form.permissions.includes(key) ? 'check_box' : 'check_box_outline_blank'}</span>
                            {PERMISSION_LABELS[key] || key}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
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
