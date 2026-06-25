import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface Outlet { _id: string; name: string }
interface Role { _id: string; name: string }

interface User {
  _id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  outlets?: Outlet[] | string[];
  roleRef?: { _id: string; name: string; permissions: string[] } | string;
  defaultStartingCash?: number;
  createdAt: string;
}

export default function Users() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [outletsAll, setOutletsAll] = useState<Outlet[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ userId: '', name: '', email: '', password: '', role: 'cashier', outlets: [] as string[], roleRef: '', defaultStartingCash: '' });

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/users', { headers }).then((r) => r.json()).then(setUsers);
    fetch('/api/outlets').then((r) => r.json()).then(setOutletsAll);
    fetch('/api/roles', { headers }).then((r) => r.json()).then(setRoles);
  }, []);

  function toggleOutlet(outletId: string) {
    setForm((f) => ({
      ...f,
      outlets: f.outlets.includes(outletId)
        ? f.outlets.filter((id) => id !== outletId)
        : [...f.outlets, outletId],
    }));
  }

  async function saveUser() {
    const url = editingId ? `/api/users/${editingId}` : '/api/users';
    const method = editingId ? 'PUT' : 'POST';
    const body: any = { ...form, defaultStartingCash: Number(form.defaultStartingCash) || 0 };
    if (!editingId && !body.password) return;
    if (editingId && !body.password) delete body.password;
    if (!body.roleRef) body.roleRef = null;
    const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
    if (!res.ok) return;
    setShowForm(false);
    setEditingId(null);
    setForm({ userId: '', name: '', email: '', password: '', role: 'cashier', outlets: [], roleRef: '', defaultStartingCash: '' });
    fetch('/api/users', { headers }).then((r) => r.json()).then(setUsers);
  }

  function editUser(u: User) {
    const outletIds = Array.isArray(u.outlets)
      ? u.outlets.map((o) => (typeof o === 'object' ? o._id : o))
      : [];
    setForm({
      userId: u.userId || '',
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      outlets: outletIds,
      roleRef: typeof u.roleRef === 'object' ? u.roleRef?._id || '' : u.roleRef || '',
      defaultStartingCash: String(u.defaultStartingCash ?? ''),
    });
    setEditingId(u._id);
    setShowForm(true);
  }

  async function deleteUser(id: string) {
    if (!confirm('Hapus user?')) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE', headers });
    fetch('/api/users', { headers }).then((r) => r.json()).then(setUsers);
  }

  function outletNames(u: User) {
    if (!Array.isArray(u.outlets)) return '-';
    return u.outlets.map((o) => (typeof o === 'object' ? o.name : o)).join(', ') || '-';
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[24px]">group</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase font-bold tracking-tight">KELOLA PENGGUNA</h3>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ userId: '', name: '', email: '', password: '', role: 'cashier', outlets: [], roleRef: '', defaultStartingCash: '' }); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tambah User
        </button>
      </div>

      <div className="bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-highest/50 border-b border-outline-variant">
              <tr>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">User ID</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Nama</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Email</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Role</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Hak Akses</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Outlet</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Modal Awal</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {users.map((u) => (
                <tr key={u._id} className="table-row-hover transition-colors">
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface font-semibold font-mono">{u.userId}</td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface font-semibold">{u.name}</td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface-variant">{u.email}</td>
                  <td className="p-table_cell_padding">
                    <span className={`status-pill ${u.role === 'admin' ? 'status-active' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface-variant">
                    {typeof u.roleRef === 'object' ? u.roleRef?.name : u.roleRef || '-'}
                  </td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface-variant">
                    {outletNames(u)}
                  </td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface-variant">
                    Rp {(u.defaultStartingCash ?? 0).toLocaleString()}
                  </td>
                  <td className="p-table_cell_padding">
                    <div className="flex items-center gap-2">
                      <button onClick={() => editUser(u)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        Edit
                      </button>
                      <button onClick={() => deleteUser(u._id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-error bg-error/10 rounded-lg hover:bg-error/20 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        Hapus
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
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">{editingId ? 'Edit User' : 'Tambah User'}</h3>
            <div className="flex flex-col gap-3">
              <input placeholder="User ID (kosongi untuk auto)" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              <input placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              {!editingId && <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />}
              {editingId && <input type="password" placeholder="Password baru (kosongi jika tidak diubah)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />}
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <option value="cashier">Kasir</option>
                <option value="admin">Admin</option>
              </select>
              <select value={form.roleRef} onChange={(e) => setForm({ ...form, roleRef: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <option value="">Tanpa Hak Akses</option>
                {roles.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
              <input type="number" placeholder="Modal Awal (default)" value={form.defaultStartingCash} onChange={(e) => setForm({ ...form, defaultStartingCash: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              <fieldset className="border border-outline-variant rounded-lg p-3">
                <legend className="text-[11px] font-semibold text-outline uppercase tracking-wider px-1">Outlet</legend>
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                  {outletsAll.map((o) => (
                    <label key={o._id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.outlets.includes(o._id)}
                        onChange={() => toggleOutlet(o._id)}
                        className="rounded border-outline-variant text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm text-on-surface">{o.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-on-surface-variant bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors">
                Batal
              </button>
              <button onClick={saveUser} className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
